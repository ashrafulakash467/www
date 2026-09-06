<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Payment;
use App\Models\Setting;
use App\Services\RefundService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AdminPaymentController extends Controller
{
    public function overview(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request, 'payments.view');
        $query = $this->filteredQuery($request);
        $paid = ['paid', 'completed', 'settled', 'success', 'successful'];
        $today = now()->toDateString();

        return response()->json([
            'success' => true,
            'data' => [
                'totalRevenue' => (float) (clone $query)->whereIn('status', $paid)->sum('paid_amount'),
                'todayRevenue' => (float) (clone $query)->whereIn('status', $paid)->whereDate('paid_at', $today)->sum('paid_amount'),
                'successfulPayments' => (clone $query)->whereIn('status', $paid)->count(),
                'pendingPayments' => (clone $query)->whereIn('status', ['pending', 'processing', 'reviewing'])->count(),
                'failedPayments' => (clone $query)->whereIn('status', ['failed', 'cancelled', 'refund_failed'])->count(),
                'refundedAmount' => (float) (clone $query)->sum('refund_amount'),
                'netRevenue' => (float) (clone $query)->whereIn('status', $paid)->sum(DB::raw('paid_amount - refund_amount')),
                'dueAmount' => (float) (clone $query)->sum('due_amount'),
                'statusDistribution' => $this->distribution(clone $query, 'status'),
                'methodDistribution' => $this->distribution(clone $query, 'method'),
                'trend' => $this->trend(clone $query),
                'recentTransactions' => (clone $query)->latest()->limit(8)->get()->map(fn (Payment $payment) => $this->formatPayment($payment))->values(),
                'recentRefunds' => (clone $query)->where('refund_status', '!=', 'not_requested')->latest('refund_requested_at')->limit(8)->get()->map(fn (Payment $payment) => $this->formatPayment($payment))->values(),
            ],
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request, 'payments.view');
        $payments = $this->filteredQuery($request)
            ->orderBy($this->sortColumn($request->string('sort')->toString()), $request->string('direction')->toString() === 'asc' ? 'asc' : 'desc')
            ->paginate(min(max($request->integer('per_page', 20), 1), 100))
            ->withQueryString();

        return response()->json([
            'success' => true,
            'data' => $payments->getCollection()->map(fn (Payment $payment) => $this->formatPayment($payment))->values(),
            'meta' => [
                'current_page' => $payments->currentPage(),
                'last_page' => $payments->lastPage(),
                'per_page' => $payments->perPage(),
                'total' => $payments->total(),
            ],
        ]);
    }

    public function show(Request $request, Payment $payment): JsonResponse
    {
        $this->authorizeAdmin($request, 'payments.view_details');
        $payment->load(['appointment', 'patient.user', 'doctor.user']);
        $this->audit($request, 'Payment viewed', $payment);

        return response()->json(['success' => true, 'data' => $this->formatPayment($payment, true)]);
    }

    public function refunds(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request, 'refunds.view');
        $query = $this->filteredQuery($request);
        $status = $request->string('refund_status')->toString();
        if ($status !== '') $query->where('refund_status', $status);
        else $query->where('refund_status', '!=', 'not_requested');

        $payments = $query->latest('refund_requested_at')->paginate(min(max($request->integer('per_page', 20), 1), 100))->withQueryString();
        return response()->json([
            'success' => true,
            'data' => $payments->getCollection()->map(fn (Payment $payment) => $this->formatPayment($payment, true))->values(),
            'meta' => ['current_page' => $payments->currentPage(), 'last_page' => $payments->lastPage(), 'per_page' => $payments->perPage(), 'total' => $payments->total()],
        ]);
    }

    public function revenue(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request, 'payments.revenue');
        $query = $this->filteredQuery($request)->whereIn('status', ['paid', 'completed', 'settled', 'success', 'successful']);
        $payments = $query->get(['paid_at', 'paid_amount', 'discount_amount', 'tax_amount', 'refund_amount', 'due_amount', 'doctor_id', 'method', 'gateway']);
        $daily = $payments->groupBy(fn (Payment $payment) => $payment->paid_at?->toDateString() ?? 'unpaid')->map(fn ($items) => (float) $items->sum('paid_amount'))->all();

        return response()->json(['success' => true, 'data' => [
            'grossRevenue' => (float) $payments->sum('paid_amount'),
            'discount' => (float) $payments->sum('discount_amount'),
            'tax' => (float) $payments->sum('tax_amount'),
            'refund' => (float) $payments->sum('refund_amount'),
            'paidAmount' => (float) $payments->sum('paid_amount'),
            'dueAmount' => (float) $payments->sum('due_amount'),
            'daily' => $daily,
            'byMethod' => $payments->groupBy('method')->map->sum('paid_amount'),
            'byGateway' => $payments->groupBy('gateway')->map->sum('paid_amount'),
        ]]);
    }

    public function approveRefund(Request $request, Payment $payment): JsonResponse
    {
        $this->authorizeAdmin($request, 'refunds.approve');
        return $this->changeRefundStatus($request, $payment, 'approved', 'Refund approved');
    }

    public function rejectRefund(Request $request, Payment $payment): JsonResponse
    {
        $this->authorizeAdmin($request, 'refunds.reject');
        return $this->changeRefundStatus($request, $payment, 'rejected', 'Refund rejected');
    }

    public function processRefund(Request $request, Payment $payment, RefundService $refunds): JsonResponse
    {
        $this->authorizeAdmin($request, 'refunds.process');
        $payment = DB::transaction(function () use ($payment, $request, $refunds): Payment {
            $locked = Payment::query()->lockForUpdate()->findOrFail($payment->id);
            if (! in_array($locked->refund_status, ['approved', 'requested'], true)) {
                throw ValidationException::withMessages(['refund' => ['This refund is not approved or is already processed.']]);
            }
            $processed = $refunds->processAdminRefund($locked, $request->string('reason')->toString() ?: $locked->refund_reason ?: 'Approved by admin');
            $this->audit($request, 'Refund processed', $processed);
            return $processed;
        });
        return response()->json(['success' => true, 'message' => 'Refund submitted to the payment gateway.', 'data' => $this->formatPayment($payment->fresh(), true)]);
    }

    public function settings(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request, 'payments.edit');
        $keys = ['payment:gateway', 'payment:mode', 'payment:currency', 'payment:methods', 'payment:tax', 'payment:refund_enabled', 'payment:required'];
        return response()->json(['success' => true, 'data' => Setting::query()->whereIn('key', $keys)->get()->mapWithKeys(fn (Setting $setting) => [$setting->key => $setting->castValue()])]);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request, 'payments.edit');
        $data = $request->validate([
            'gateway' => ['nullable', 'string', 'max:80'],
            'mode' => ['nullable', 'in:test,production'],
            'currency' => ['nullable', 'string', 'max:10'],
            'methods' => ['nullable', 'array'],
            'methods.*' => ['string', 'max:40'],
            'tax' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'refund_enabled' => ['nullable', 'boolean'],
            'required' => ['nullable', 'boolean'],
        ]);

        DB::transaction(function () use ($data): void {
            foreach ($data as $key => $value) {
                $settingKey = 'payment:'.$key;
                $setting = Setting::query()->firstOrNew(['key' => $settingKey]);
                $setting->forceFill([
                    'key' => $settingKey,
                    'group' => 'payments',
                    'label' => str($key)->replace('_', ' ')->title(),
                    'type' => is_bool($value) ? 'boolean' : (is_array($value) ? 'textarea' : 'text'),
                    'value' => is_array($value) ? json_encode($value) : (string) $value,
                    'is_active' => true,
                    'is_private' => false,
                ])->save();
            }
        });

        Setting::forgetAllCaches();
        $this->audit($request, 'Payment settings changed', null);
        return response()->json(['success' => true, 'message' => 'Payment settings updated.']);
    }

    private function changeRefundStatus(Request $request, Payment $payment, string $status, string $message): JsonResponse
    {
        $updated = DB::transaction(function () use ($request, $payment, $status, $message): Payment {
            $locked = Payment::query()->lockForUpdate()->findOrFail($payment->id);
            if ($locked->refund_status !== 'requested') throw ValidationException::withMessages(['refund' => ['Only pending refunds can be changed.']]);
            $locked->forceFill(['refund_status' => $status, 'refund_reason' => $request->string('reason')->toString() ?: $locked->refund_reason])->save();
            $this->audit($request, $message, $locked);
            return $locked->fresh();
        });
        return response()->json(['success' => true, 'message' => $message.'.', 'data' => $this->formatPayment($updated, true)]);
    }

    private function filteredQuery(Request $request): Builder
    {
        $query = Payment::query()->with(['appointment', 'patient.user', 'doctor.user']);
        $search = trim($request->string('search')->toString());
        if ($search !== '') $query->where(fn (Builder $builder) => $builder->where('transaction_no', 'like', "%{$search}%")->orWhere('gateway_transaction_id', 'like', "%{$search}%")->orWhereHas('patient', fn (Builder $patient) => $patient->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%")));
        foreach (['status', 'method', 'provider', 'doctor_id'] as $field) if ($request->filled($field)) $query->where($field, $request->input($field));
        if ($request->filled('date_from')) $query->whereDate('created_at', '>=', $request->input('date_from'));
        if ($request->filled('date_to')) $query->whereDate('created_at', '<=', $request->input('date_to'));
        return $query;
    }

    private function distribution(Builder $query, string $column): array
    {
        return $query->select($column, DB::raw('COUNT(*) as total'))->groupBy($column)->pluck('total', $column)->all();
    }

    private function trend(Builder $query): array
    {
        return $query->whereIn('status', ['paid', 'completed', 'settled', 'success', 'successful'])->where('paid_at', '>=', now()->subDays(30))->get(['paid_at', 'paid_amount'])->groupBy(fn (Payment $payment) => $payment->paid_at?->toDateString())->map(fn ($items) => (float) $items->sum('paid_amount'))->all();
    }

    private function sortColumn(string $sort): string
    {
        return in_array($sort, ['created_at', 'paid_at', 'amount', 'paid_amount', 'status'], true) ? $sort : 'created_at';
    }

    private function formatPayment(Payment $payment, bool $details = false): array
    {
        $patient = $payment->patient;
        $doctor = $payment->doctor;
        $appointment = $payment->appointment;
        $data = [
            'id' => $payment->id,
            'transactionNumber' => $payment->transaction_no,
            'gatewayTransactionId' => $payment->gateway_transaction_id,
            'provider' => $payment->provider,
            'gateway' => $payment->gateway,
            'method' => $payment->method,
            'currency' => $payment->currency,
            'status' => $payment->status,
            'amount' => (float) $payment->amount,
            'totalAmount' => (float) $payment->total_amount,
            'paidAmount' => (float) $payment->paid_amount,
            'dueAmount' => (float) $payment->due_amount,
            'refundAmount' => (float) $payment->refund_amount,
            'refundStatus' => $payment->refund_status,
            'refundReason' => $payment->refund_reason,
            'paidAt' => $payment->paid_at?->toISOString(),
            'createdAt' => $payment->created_at?->toISOString(),
            'patient' => ['name' => $patient?->name ?? $patient?->user?->name, 'email' => $patient?->email ?? $patient?->user?->email, 'phone' => $patient?->phone ?? $patient?->user?->phone],
            'doctor' => ['name' => $doctor?->user?->name ?? $doctor?->name, 'email' => $doctor?->user?->email, 'phone' => $doctor?->user?->phone, 'specialty' => $doctor?->specialty],
            'appointment' => ['id' => $appointment?->appointment_no ?? $appointment?->id, 'date' => $appointment?->appointment_date?->toDateString(), 'time' => $appointment?->start_time, 'status' => $appointment?->status],
        ];
        if ($details) $data += ['discount' => (float) $payment->discount_amount, 'tax' => (float) $payment->tax_amount, 'meta' => ['failure_reason' => data_get($payment->meta, 'failure_reason')]];
        return $data;
    }

    private function authorizeAdmin(Request $request, string $permission): void
    {
        $user = $request->user();

        abort_unless($user?->hasAnyRole(['admin', 'super-admin']), 403);
        abort_unless($user->can($permission) || $user->can('manage-payments'), 403);
    }

    private function audit(Request $request, string $action, ?Payment $payment): void
    {
        AuditLog::create(['user_id' => $request->user()?->id, 'action' => $action, 'auditable_type' => $payment ? Payment::class : null, 'auditable_id' => $payment?->id, 'description' => $payment ? $action.' for payment '.$payment->transaction_no : $action, 'ip_address' => $request->ip(), 'user_agent' => $request->userAgent(), 'url' => $request->fullUrl()]);
    }
}
