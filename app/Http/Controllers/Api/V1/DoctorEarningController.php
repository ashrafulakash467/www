<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\EarningTransaction;
use App\Services\EarningService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class DoctorEarningController extends Controller
{
    public function __construct(private readonly EarningService $earnings) {}

    public function summary(Request $request): JsonResponse
    {
        $doctor = $request->user()?->doctor;
        abort_unless($doctor, 403);

        $summary = $this->earnings->getDoctorSummary($doctor->id);

        return response()->json(['success' => true, 'data' => $summary]);
    }

    public function history(Request $request): JsonResponse
    {
        $doctor = $request->user()?->doctor;
        abort_unless($doctor, 403);

        $query = EarningTransaction::query()
            ->where('doctor_id', $doctor->id)
            ->with(['appointment', 'payment']);

        $query = $this->applyFilters($query, $request);

        $perPage = min(max($request->integer('per_page', 15), 1), 50);
        $history = $query->orderByDesc('earned_at')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $history->getCollection()->map(fn (EarningTransaction $earning) => $this->formatEarning($earning))->values(),
            'meta' => [
                'current_page' => $history->currentPage(),
                'last_page' => $history->lastPage(),
                'per_page' => $history->perPage(),
                'total' => $history->total(),
            ],
        ]);
    }

    public function show(Request $request, int $earningId): JsonResponse
    {
        $doctor = $request->user()?->doctor;
        abort_unless($doctor, 403);

        $earning = EarningTransaction::with(['appointment', 'payment'])
            ->where('doctor_id', $doctor->id)
            ->whereKey($earningId)
            ->firstOrFail();

        return response()->json(['success' => true, 'data' => $this->formatEarningDetail($earning)]);
    }

    public function trend(Request $request): JsonResponse
    {
        $doctor = $request->user()?->doctor;
        abort_unless($doctor, 403);

        $period = $request->string('period', 'daily')->toString();
        $allowed = ['daily', 'weekly', 'monthly', 'yearly'];
        if (!in_array($period, $allowed, true)) {
            $period = 'daily';
        }

        $trend = $this->earnings->getEarningsTrend($doctor->id, $period);

        return response()->json(['success' => true, 'data' => $trend, 'period' => $period]);
    }

    public function balance(Request $request): JsonResponse
    {
        $doctor = $request->user()?->doctor;
        abort_unless($doctor, 403);

        $balance = $this->earnings->getAvailableBalance($doctor->id);

        return response()->json(['success' => true, 'data' => ['available_balance' => $balance]]);
    }

    private function applyFilters(Builder $query, Request $request): Builder
    {
        $status = $request->string('status')->toString();
        if (filled($status)) {
            $query->where('status', $status);
        }

        $from = $request->string('from')->toString();
        if (filled($from)) {
            try {
                $query->where('earned_at', '>=', Carbon::parse($from)->startOfDay());
            } catch (\Throwable) {
            }
        }

        $to = $request->string('to')->toString();
        if (filled($to)) {
            try {
                $query->where('earned_at', '<=', Carbon::parse($to)->endOfDay());
            } catch (\Throwable) {
            }
        }

        $search = $request->string('search')->toString();
        if (filled($search)) {
            $query->where(function (Builder $builder) use ($search): void {
                $builder->whereHas('appointment', fn ($q) => $q->where('appointment_no', 'like', '%' . $search . '%'))
                    ->orWhereHas('payment', fn ($q) => $q->where('transaction_no', 'like', '%' . $search . '%'));
            });
        }

        return $query;
    }

    private function formatEarning(EarningTransaction $earning): array
    {
        $appointment = $earning->appointment;
        $payment = $earning->payment;

        return [
            'id' => $earning->id,
            'date' => $earning->earned_at?->toISOString(),
            'appointment' => $appointment ? [
                'id' => $appointment->id,
                'appointment_no' => $appointment->appointment_no,
                'date' => $appointment->appointment_date?->toDateString(),
                'status' => $appointment->status,
            ] : null,
            'patient' => $payment?->patient ? [
                'name' => $payment->patient->name ?? $payment->patient->user?->name,
            ] : null,
            'gross_amount' => (float) $earning->gross_amount,
            'doctor_percentage' => (float) $earning->doctor_percentage,
            'doctor_amount' => (float) $earning->doctor_amount,
            'admin_percentage' => (float) $earning->admin_percentage,
            'admin_amount' => (float) $earning->admin_amount,
            'status' => $earning->status,
            'refund_amount' => (float) $earning->refund_amount,
            'reversal_amount' => (float) $earning->reversal_amount,
        ];
    }

    private function formatEarningDetail(EarningTransaction $earning): array
    {
        $payment = $earning->payment;
        $appointment = $earning->appointment;

        return [
            'id' => $earning->id,
            'gross_amount' => (float) $earning->gross_amount,
            'doctor_percentage' => (float) $earning->doctor_percentage,
            'doctor_amount' => (float) $earning->doctor_amount,
            'admin_percentage' => (float) $earning->admin_percentage,
            'admin_amount' => (float) $earning->admin_amount,
            'refund_amount' => (float) $earning->refund_amount,
            'reversal_amount' => (float) $earning->reversal_amount,
            'net_doctor_amount' => $earning->net_doctor_amount,
            'status' => $earning->status,
            'earned_at' => $earning->earned_at?->toISOString(),
            'released_at' => $earning->released_at?->toISOString(),
            'payment' => $payment ? [
                'transaction_no' => $payment->transaction_no,
                'amount' => (float) $payment->amount,
                'discount_amount' => (float) $payment->discount_amount,
                'tax_amount' => (float) $payment->tax_amount,
                'total_amount' => (float) $payment->total_amount,
                'paid_amount' => (float) $payment->paid_amount,
                'status' => $payment->status,
                'paid_at' => $payment->paid_at?->toISOString(),
            ] : null,
            'appointment' => $appointment ? [
                'id' => $appointment->id,
                'appointment_no' => $appointment->appointment_no,
                'date' => $appointment->appointment_date?->toDateString(),
                'time' => $appointment->start_time,
                'status' => $appointment->status,
            ] : null,
        ];
    }
}

