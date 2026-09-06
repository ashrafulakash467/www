<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Payment;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class RefundService
{
    public function __construct(private readonly SSLCommerzService $gateway) {}

    public function percentage(Appointment $appointment, string $cancelledBy = 'patient'): int
    {
        if ($cancelledBy !== 'patient') return (int) config('refund.'.($cancelledBy === 'doctor' ? 'doctor_cancellation' : 'admin_cancellation'), 100);
        $when = Carbon::parse($appointment->appointment_date->toDateString().' '.($appointment->start_time ?: '00:00:00'));
        $hours = now()->diffInMinutes($when, false) / 60;
        if ($hours <= 0) return (int) config('refund.patient_cancellation.after_appointment', 0);
        if ($hours > 24) return (int) config('refund.patient_cancellation.more_than_24_hours', 100);
        if ($hours >= 12) return (int) config('refund.patient_cancellation.between_12_and_24_hours', 80);
        return (int) config('refund.patient_cancellation.less_than_12_hours', 50);
    }

    public function cancelAndRefund(Appointment $appointment, string $reason, string $cancelledBy = 'patient'): ?Payment
    {
        $payment = $appointment->payment()->lockForUpdate()->first();
        if (!$payment || !$this->isPaid($payment)) return null;
        if (in_array($payment->refund_status, ['requested', 'processing', 'refunded'], true)) return $payment;
        $amount = round((float) $payment->paid_amount * $this->percentage($appointment, $cancelledBy) / 100, 2);
        if ($amount <= 0) return $payment->forceFill(['refund_amount' => 0, 'refund_status' => 'cancelled', 'refund_reason' => $reason])->save() ? $payment : $payment;
        $ref = 'RFN-'.$appointment->appointment_no.'-'.Str::upper(Str::random(8));
        $payment->forceFill(['refund_amount' => $amount, 'refund_status' => 'processing', 'status' => 'refund_processing', 'refund_ref_id' => $ref, 'refund_transaction_id' => $ref, 'refund_reason' => $reason, 'refund_requested_at' => now()])->save();
        $result = $this->gateway->refund($payment, $ref, $amount, $reason);
        $payment->forceFill(['refund_status' => $result['success'] ? 'processing' : 'failed', 'refund_response' => $result['data'] ?? null])->save();
        Log::info($result['success'] ? 'Refund processing' : 'Refund failed', ['appointment_id' => $appointment->id, 'payment_id' => $payment->id, 'refund_ref_id' => $ref]);
        return $payment->fresh();
    }

    public function check(Payment $payment): Payment
    {
        if (!$payment->refund_ref_id || !in_array($payment->refund_status, ['processing', 'requested'], true)) return $payment;
        $result = $this->gateway->refundStatus($payment->refund_ref_id);
        $status = $result['status'] ?? 'processing';
        if (in_array($status, ['refunded', 'failed', 'cancelled'], true)) $payment->forceFill(['refund_status' => $status, 'status' => $status === 'refunded' ? 'refunded' : 'refund_failed', 'refund_processed_at' => now(), 'refund_response' => $result['data'] ?? null])->save();
        return $payment->fresh();
    }

    public function processAdminRefund(Payment $payment, string $reason): Payment
    {
        if (! $payment->refund_ref_id) {
            $reference = 'RFN-'.$payment->transaction_no.'-'.Str::upper(Str::random(8));
            $payment->forceFill([
                'refund_ref_id' => $reference,
                'refund_transaction_id' => $reference,
            ])->save();
        }

        $reference = $payment->refund_ref_id;
        $payment->forceFill([
            'refund_amount' => $payment->refund_amount ?: $payment->paid_amount,
            'refund_status' => 'processing',
            'status' => 'refund_processing',
            'refund_reason' => $reason,
            'refund_requested_at' => $payment->refund_requested_at ?: now(),
        ])->save();

        $result = $this->gateway->refund($payment, $reference, (float) $payment->refund_amount, $reason);
        $payment->forceFill([
            'refund_status' => $result['success'] ? 'processing' : 'failed',
            'refund_response' => $result['data'] ?? null,
        ])->save();

        return $payment->fresh();
    }

    private function isPaid(Payment $payment): bool { return in_array(strtolower((string) $payment->status), ['paid', 'completed', 'settled', 'success', 'successful'], true); }
}
