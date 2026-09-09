<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Doctor;
use App\Models\EarningTransaction;
use App\Models\Payment;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class EarningService
{
    public const DEFAULT_DOCTOR_PERCENTAGE = 80.00;

    public const DEFAULT_ADMIN_PERCENTAGE = 20.00;

    public const STATUS_PENDING = 'pending';

    public const STATUS_RELEASED = 'released';

    public const STATUS_REFUNDED = 'refunded';

    public const STATUS_REVERSED = 'reversed';

    public function getDefaultDoctorPercentage(): float
    {
        $setting = \App\Models\Setting::query()
            ->where('key', 'commission.default_doctor_percentage')
            ->where('is_active', true)
            ->first();

        if ($setting) {
            $value = $setting->castValue();
            if (is_numeric($value) && $value >= 0 && $value <= 100) {
                return (float) $value;
            }
        }

        return self::DEFAULT_DOCTOR_PERCENTAGE;
    }

    public function getDefaultAdminPercentage(): float
    {
        $setting = \App\Models\Setting::query()
            ->where('key', 'commission.default_admin_percentage')
            ->where('is_active', true)
            ->first();

        if ($setting) {
            $value = $setting->castValue();
            if (is_numeric($value) && $value >= 0 && $value <= 100) {
                return (float) $value;
            }
        }

        return self::DEFAULT_ADMIN_PERCENTAGE;
    }

    public function getDoctorPercentage(Doctor $doctor, ?string $asOf = null): float
    {
        $individualPercentage = $doctor->getEffectivePercentage($asOf);

        if ($individualPercentage !== null) {
            return $individualPercentage;
        }

        return $this->getDefaultDoctorPercentage();
    }

    public function getAdminPercentage(float $doctorPercentage): float
    {
        return round(100 - $doctorPercentage, 2);
    }

    public function createEarningFromPayment(Payment $payment): ?EarningTransaction
    {
        return DB::transaction(function () use ($payment): ?EarningTransaction {
            $lockedPayment = Payment::with(['appointment', 'doctor'])
                ->lockForUpdate()
                ->findOrFail($payment->id);

            if (strtolower((string) $lockedPayment->status) !== 'paid') {
                return null;
            }

            $existing = EarningTransaction::where('payment_id', $lockedPayment->id)->first();
            if ($existing) {
                return $existing;
            }

            $appointment = $lockedPayment->appointment;
            $doctor = $lockedPayment->doctor;

            if (!$appointment || !$doctor) {
                Log::warning('Cannot create earning: missing appointment or doctor', [
                    'payment_id' => $lockedPayment->id,
                ]);
                return null;
            }

            $grossAmount = (float) $lockedPayment->paid_amount;
            $paidAt = $lockedPayment->paid_at ?? now();
            $doctorPercentage = $this->getDoctorPercentage($doctor, $paidAt->toDateTimeString());
            $adminPercentage = $this->getAdminPercentage($doctorPercentage);

            $doctorAmount = round($grossAmount * $doctorPercentage / 100, 2);
            $adminAmount = round($grossAmount - $doctorAmount, 2);

            $earning = EarningTransaction::create([
                'payment_id' => $lockedPayment->id,
                'appointment_id' => $appointment->id,
                'doctor_id' => $doctor->id,
                'gross_amount' => $grossAmount,
                'doctor_percentage' => $doctorPercentage,
                'doctor_amount' => $doctorAmount,
                'admin_percentage' => $adminPercentage,
                'admin_amount' => $adminAmount,
                'status' => self::STATUS_RELEASED,
                'earned_at' => $paidAt,
                'released_at' => now(),
            ]);

            Log::info('Earning transaction created', [
                'earning_id' => $earning->id,
                'payment_id' => $lockedPayment->id,
                'doctor_id' => $doctor->id,
                'doctor_amount' => $doctorAmount,
                'admin_amount' => $adminAmount,
            ]);

            return $earning;
        });
    }

    public function processRefundReversal(Payment $payment, float $refundAmount): ?EarningTransaction
    {
        return DB::transaction(function () use ($payment, $refundAmount): ?EarningTransaction {
            $earning = EarningTransaction::where('payment_id', $payment->id)->first();

            if (!$earning) {
                Log::warning('No earning transaction found for refund reversal', [
                    'payment_id' => $payment->id,
                ]);
                return null;
            }

            $lockedEarning = EarningTransaction::lockForUpdate()->findOrFail($earning->id);

            if ($lockedEarning->isRefunded()) {
                return $lockedEarning;
            }

            $grossAmount = (float) $lockedEarning->gross_amount;
            $refundRatio = $grossAmount > 0 ? round($refundAmount / $grossAmount, 4) : 0;

            $doctorReversal = round((float) $lockedEarning->doctor_amount * $refundRatio, 2);
            $adminReversal = round((float) $lockedEarning->admin_amount * $refundRatio, 2);

            $lockedEarning->update([
                'refund_amount' => $refundAmount,
                'reversal_amount' => $doctorReversal,
                'status' => $refundAmount >= $grossAmount ? self::STATUS_REFUNDED : self::STATUS_REVERSED,
            ]);

            Log::info('Earning refund reversal processed', [
                'earning_id' => $lockedEarning->id,
                'refund_amount' => $refundAmount,
                'doctor_reversal' => $doctorReversal,
                'admin_reversal' => $adminReversal,
            ]);

            return $lockedEarning->fresh();
        });
    }

    public function getAvailableBalance(int $doctorId): float
    {
        $result = EarningTransaction::query()
            ->where('doctor_id', $doctorId)
            ->selectRaw('
                COALESCE(SUM(CASE WHEN status = ? THEN doctor_amount ELSE 0 END), 0) as total_released,
                COALESCE(SUM(CASE WHEN status IN (?, ?) THEN reversal_amount ELSE 0 END), 0) as total_reversed
            ', [self::STATUS_RELEASED, self::STATUS_REFUNDED, self::STATUS_REVERSED])
            ->first();

        return (float) ($result->total_released - $result->total_reversed);
    }

    public function getDoctorSummary(int $doctorId): array
    {
        $today = now()->toDateString();
        $monthStart = now()->startOfMonth()->toDateString();

        $totalEarnings = (float) EarningTransaction::where('doctor_id', $doctorId)
            ->where('status', self::STATUS_RELEASED)
            ->sum('doctor_amount');

        $totalReversed = (float) EarningTransaction::where('doctor_id', $doctorId)
            ->whereIn('status', [self::STATUS_REFUNDED, self::STATUS_REVERSED])
            ->sum('reversal_amount');

        $availableBalance = $totalEarnings - $totalReversed;

        $pendingEarnings = (float) EarningTransaction::where('doctor_id', $doctorId)
            ->where('status', self::STATUS_PENDING)
            ->sum('doctor_amount');

        $todayEarnings = (float) EarningTransaction::where('doctor_id', $doctorId)
            ->where('status', self::STATUS_RELEASED)
            ->whereDate('earned_at', $today)
            ->sum('doctor_amount');

        $monthEarnings = (float) EarningTransaction::where('doctor_id', $doctorId)
            ->where('status', self::STATUS_RELEASED)
            ->whereDate('earned_at', '>=', $monthStart)
            ->sum('doctor_amount');

        return [
            'total_earnings' => $totalEarnings,
            'available_balance' => $availableBalance,
            'pending_earnings' => $pendingEarnings,
            'total_withdrawn' => 0,
            'today_earnings' => $todayEarnings,
            'month_earnings' => $monthEarnings,
        ];
    }
}


