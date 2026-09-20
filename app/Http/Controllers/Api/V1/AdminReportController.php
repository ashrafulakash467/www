<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\AuditLog;
use App\Models\Doctor;
use App\Models\EarningTransaction;
use App\Models\MedicalRecord;
use App\Models\Patient;
use App\Models\Payment;
use App\Models\Prescription;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class AdminReportController extends Controller
{
    private const PAID = ['paid', 'completed', 'settled', 'success', 'successful'];
    private const PENDING_PAYMENT = ['pending', 'unpaid', 'initiated', 'processing'];
    private const FAILED_PAYMENT = ['failed', 'cancelled', 'refund_failed'];

    public function show(Request $request, string $report): JsonResponse
    {
        $data = match ($report) {
            'appointments' => $this->appointments($request),
            'doctors' => $this->doctors($request),
            'patients' => $this->patients($request),
            'payments' => $this->payments($request),
            'refunds' => $this->refunds($request),
            'earnings' => $this->earnings($request),
            'medical-records' => $this->medicalRecords($request),
            'audit' => $this->audit($request),
            'date-summary' => $this->dateSummary($request),
            default => abort(404),
        };

        return response()->json(['success' => true] + $data);
    }

    private function appointments(Request $request): array
    {
        $query = Appointment::query()->with(['patient.user', 'doctor.user']);
        $this->range($query, $request, 'appointment_date');
        $this->search($query, $request, fn (Builder $q, string $term) => $q
            ->where('appointment_no', 'like', "%{$term}%")
            ->orWhereHas('patient.user', fn (Builder $u) => $u->where('name', 'like', "%{$term}%"))
            ->orWhereHas('doctor.user', fn (Builder $u) => $u->where('name', 'like', "%{$term}%")));
        $status = $request->string('status')->lower()->toString();
        if ($status !== '') {
            $status === 'rescheduled'
                ? $query->where(fn (Builder $q) => $q->whereIn('status', ['rescheduled', 'reschedule_requested'])->orWhereNotNull('rescheduled_at'))
                : $query->where('status', $status);
        }

        $statsQuery = clone $query;
        $page = $query->latest('appointment_date')->paginate($this->perPage($request));

        return $this->result([
            'Total' => (clone $statsQuery)->count(),
            'Confirmed' => (clone $statsQuery)->whereIn('status', ['confirmed', 'approved'])->count(),
            'Cancelled' => (clone $statsQuery)->where('status', 'cancelled')->count(),
            'Rescheduled' => (clone $statsQuery)->where(fn (Builder $q) => $q->whereIn('status', ['rescheduled', 'reschedule_requested'])->orWhereNotNull('rescheduled_at'))->count(),
            'Completed' => (clone $statsQuery)->where('status', 'completed')->count(),
        ], $page, fn (Appointment $item) => [
            'id' => $item->id,
            'date' => $item->appointment_date?->toDateString(),
            'appointment' => $item->appointment_no,
            'patient' => $item->patient?->user?->name ?? $item->patient?->name ?? '—',
            'doctor' => $item->doctor?->user?->name ?? '—',
            'status' => $this->label($item->status),
        ]);
    }

    private function doctors(Request $request): array
    {
        $query = Doctor::query()->with('user')->withCount('appointments');
        $this->range($query, $request, 'created_at');
        $this->search($query, $request, fn (Builder $q, string $term) => $q
            ->where('specialty', 'like', "%{$term}%")
            ->orWhereHas('user', fn (Builder $u) => $u->where('name', 'like', "%{$term}%")->orWhere('email', 'like', "%{$term}%")));
        $status = $request->string('status')->lower()->toString();
        if ($status !== '') $query->where('verification_status', $status === 'verified' ? 'approved' : $status);

        $statsQuery = clone $query;
        $page = $query->latest()->paginate($this->perPage($request));
        return $this->result([
            'Total Doctors' => (clone $statsQuery)->count(),
            'Verified' => (clone $statsQuery)->where('verification_status', 'approved')->count(),
            'Pending' => (clone $statsQuery)->where('verification_status', 'pending')->count(),
            'Active' => (clone $statsQuery)->where('status', 'active')->count(),
        ], $page, fn (Doctor $item) => [
            'id' => $item->id, 'doctor' => $item->user?->name ?? '—', 'specialty' => $item->specialty,
            'status' => $this->label($item->verification_status), 'activity' => $item->appointments_count.' appointments',
            'date' => $item->created_at?->toDateString(),
        ]);
    }

    private function patients(Request $request): array
    {
        $query = Patient::query()->with('user')->withCount('appointments');
        $this->range($query, $request, 'created_at');
        $this->search($query, $request, fn (Builder $q, string $term) => $q
            ->where('mrn', 'like', "%{$term}%")
            ->orWhereHas('user', fn (Builder $u) => $u->where('name', 'like', "%{$term}%")->orWhere('email', 'like', "%{$term}%")));
        $status = $request->string('status')->lower()->toString();
        if ($status !== '') $query->where('status', $status);
        $statsQuery = clone $query;
        $page = $query->latest()->paginate($this->perPage($request));
        return $this->result([
            'Total Patients' => (clone $statsQuery)->count(),
            'New Registrations' => (clone $statsQuery)->where('created_at', '>=', now()->subDays(30))->count(),
            'Active Users' => (clone $statsQuery)->where('status', 'active')->count(),
        ], $page, fn (Patient $item) => [
            'id' => $item->id, 'patient' => $item->user?->name ?? $item->name ?? '—',
            'date' => $item->created_at?->toDateString(), 'appointments' => $item->appointments_count,
            'status' => $this->label($item->status),
        ]);
    }

    private function payments(Request $request): array
    {
        $query = Payment::query()->with(['patient.user']);
        $this->range($query, $request, 'created_at');
        $this->search($query, $request, fn (Builder $q, string $term) => $q
            ->where('transaction_no', 'like', "%{$term}%")
            ->orWhereHas('patient.user', fn (Builder $u) => $u->where('name', 'like', "%{$term}%")));
        $status = $request->string('status')->lower()->toString();
        if ($status !== '') $query->whereIn('status', match ($status) {
            'paid' => self::PAID, 'pending' => self::PENDING_PAYMENT, 'failed' => self::FAILED_PAYMENT, default => [$status],
        });
        $statsQuery = clone $query;
        $page = $query->latest()->paginate($this->perPage($request));
        return $this->result([
            'Paid' => (clone $statsQuery)->whereIn('status', self::PAID)->count(),
            'Pending' => (clone $statsQuery)->whereIn('status', self::PENDING_PAYMENT)->count(),
            'Failed' => (clone $statsQuery)->whereIn('status', self::FAILED_PAYMENT)->count(),
            'Total Revenue' => $this->money((clone $statsQuery)->whereIn('status', self::PAID)->sum('paid_amount')),
        ], $page, fn (Payment $item) => [
            'id' => $item->id, 'date' => ($item->paid_at ?? $item->created_at)?->toDateString(),
            'transaction' => $item->transaction_no, 'patient' => $item->patient?->user?->name ?? '—',
            'amount' => $this->money($item->paid_amount), 'status' => $this->label($item->status),
        ]);
    }

    private function refunds(Request $request): array
    {
        $query = Payment::query()->with('patient.user')->where('refund_status', '!=', 'not_requested');
        $this->range($query, $request, 'refund_requested_at');
        $this->search($query, $request, fn (Builder $q, string $term) => $q
            ->where('transaction_no', 'like', "%{$term}%")->orWhere('refund_ref_id', 'like', "%{$term}%")
            ->orWhereHas('patient.user', fn (Builder $u) => $u->where('name', 'like', "%{$term}%")));
        $status = $request->string('status')->lower()->toString();
        if ($status !== '') $query->whereIn('refund_status', $status === 'processed' ? ['refunded', 'processed', 'completed'] : [$status]);
        $statsQuery = clone $query;
        $page = $query->latest('refund_requested_at')->paginate($this->perPage($request));
        return $this->result([
            'Requested' => (clone $statsQuery)->where('refund_status', 'requested')->count(),
            'Approved' => (clone $statsQuery)->where('refund_status', 'approved')->count(),
            'Rejected' => (clone $statsQuery)->where('refund_status', 'rejected')->count(),
            'Processed' => (clone $statsQuery)->whereIn('refund_status', ['refunded', 'processed', 'completed'])->count(),
            'Refunded Amount' => $this->money((clone $statsQuery)->whereIn('refund_status', ['refunded', 'processed', 'completed'])->sum('refund_amount')),
        ], $page, fn (Payment $item) => [
            'id' => $item->id, 'date' => $item->refund_requested_at?->toDateString(),
            'reference' => $item->refund_ref_id ?? $item->transaction_no, 'amount' => $this->money($item->refund_amount),
            'reason' => $item->refund_reason ?? '—', 'status' => $this->label($item->refund_status),
        ]);
    }

    private function earnings(Request $request): array
    {
        $query = EarningTransaction::query()->with('doctor.user');
        $this->range($query, $request, 'earned_at');
        $this->search($query, $request, fn (Builder $q, string $term) => $q
            ->whereHas('doctor.user', fn (Builder $u) => $u->where('name', 'like', "%{$term}%")));
        $status = $request->string('status')->lower()->toString();
        if ($status !== '') $query->where('status', $status);
        $statsQuery = clone $query;
        $gross = (float) (clone $statsQuery)->sum('gross_amount');
        $doctor = (float) (clone $statsQuery)->sum('doctor_amount') - (float) (clone $statsQuery)->sum('reversal_amount');
        $admin = (float) (clone $statsQuery)->sum('admin_amount');
        $page = $query->latest('earned_at')->paginate($this->perPage($request));
        return $this->result([
            'Gross Revenue' => $this->money($gross), 'Doctor Earnings' => $this->money($doctor),
            'Admin Commission' => $this->money($admin), 'Revenue Split' => $gross > 0 ? round($doctor / $gross * 100, 1).'% / '.round($admin / $gross * 100, 1).'%' : '0% / 0%',
        ], $page, fn (EarningTransaction $item) => [
            'id' => $item->id, 'date' => $item->earned_at?->toDateString(), 'doctor' => $item->doctor?->user?->name ?? '—',
            'gross' => $this->money($item->gross_amount), 'doctorEarning' => $this->money((float) $item->doctor_amount - (float) $item->reversal_amount),
            'commission' => $this->money($item->admin_amount), 'status' => $this->label($item->status),
        ]);
    }

    private function medicalRecords(Request $request): array
    {
        $records = MedicalRecord::query()->with(['patient.user', 'doctor.user']);
        $prescriptions = Prescription::query()->with(['patient.user', 'doctor.user']);
        $this->range($records, $request, 'recorded_at');
        $this->range($prescriptions, $request, 'issued_at');
        $term = trim($request->string('search')->toString());
        if ($term !== '') {
            $relationSearch = fn (Builder $q) => $q->where('name', 'like', "%{$term}%");
            $records->where(fn (Builder $q) => $q->where('diagnosis', 'like', "%{$term}%")->orWhereHas('patient.user', $relationSearch)->orWhereHas('doctor.user', $relationSearch));
            $prescriptions->where(fn (Builder $q) => $q->where('prescription_no', 'like', "%{$term}%")->orWhereHas('patient.user', $relationSearch)->orWhereHas('doctor.user', $relationSearch));
        }
        $type = $request->string('type')->lower()->toString();
        if ($type !== '' && $type !== 'prescription') $records->where('record_type', str_replace(' ', '_', $type));
        if ($type !== '' && $type !== 'prescription') $prescriptions->whereRaw('1 = 0');
        if ($type === 'prescription') $records->whereRaw('1 = 0');

        $recordCount = (clone $records)->count();
        $prescriptionCount = (clone $prescriptions)->count();
        $consultations = (clone $records)->where('record_type', 'consultation')->count();
        $items = (clone $records)->get()->map(fn (MedicalRecord $item) => [
            'id' => 'record-'.$item->id, 'date' => ($item->recorded_at ?? $item->created_at)?->toDateString(),
            'patient' => $item->patient?->user?->name ?? '—', 'doctor' => $item->doctor?->user?->name ?? '—',
            'type' => $this->label($item->record_type), 'reference' => 'MR-'.$item->id,
        ])->concat((clone $prescriptions)->get()->map(fn (Prescription $item) => [
            'id' => 'prescription-'.$item->id, 'date' => ($item->issued_at ?? $item->created_at)?->toDateString(),
            'patient' => $item->patient?->user?->name ?? '—', 'doctor' => $item->doctor?->user?->name ?? '—',
            'type' => 'Prescription', 'reference' => $item->prescription_no,
        ]))->sortByDesc('date')->values();

        return $this->collectionResult(['Consultations' => $consultations, 'Prescriptions' => $prescriptionCount, 'Medical Records' => $recordCount], $items, $request);
    }

    private function audit(Request $request): array
    {
        $query = AuditLog::query()->with('user.roles');
        $this->range($query, $request, 'created_at');
        $this->search($query, $request, fn (Builder $q, string $term) => $q->where('action', 'like', "%{$term}%")->orWhere('description', 'like', "%{$term}%")->orWhereHas('user', fn (Builder $u) => $u->where('name', 'like', "%{$term}%")));
        $type = $request->string('type')->lower()->toString();
        if ($type === 'system') $query->whereNull('user_id');
        if ($type === 'admin') $query->whereHas('user', fn (Builder $u) => $u->whereIn('role', ['admin', 'super-admin', 'super_admin']));
        if ($type === 'user') $query->whereHas('user', fn (Builder $u) => $u->whereNotIn('role', ['admin', 'super-admin', 'super_admin']));
        $statsQuery = clone $query;
        $page = $query->latest()->paginate($this->perPage($request));
        return $this->result([
            'Admin Activities' => (clone $statsQuery)->whereHas('user', fn (Builder $u) => $u->whereIn('role', ['admin', 'super-admin', 'super_admin']))->count(),
            'User Activities' => (clone $statsQuery)->whereHas('user', fn (Builder $u) => $u->whereNotIn('role', ['admin', 'super-admin', 'super_admin']))->count(),
            'System Events' => (clone $statsQuery)->whereNull('user_id')->count(), 'Total Logs' => (clone $statsQuery)->count(),
        ], $page, fn (AuditLog $item) => [
            'id' => $item->id, 'date' => $item->created_at?->toDateTimeString(), 'actor' => $item->user?->name ?? 'System',
            'type' => $this->auditType($item), 'action' => $this->label($item->action), 'ip' => $item->ip_address ?? '—',
        ]);
    }

    private function dateSummary(Request $request): array
    {
        [$from, $to] = $this->dates($request);
        $appointments = Appointment::whereBetween('appointment_date', [$from->toDateString(), $to->toDateString()])->get();
        $patients = Patient::whereBetween('created_at', [$from, $to])->get();
        $payments = Payment::whereBetween('created_at', [$from, $to])->get();
        $period = $request->string('period', 'monthly')->lower()->toString();
        $key = function ($date) use ($period) {
            $value = Carbon::parse($date);
            return match ($period) { 'weekly' => $value->startOfWeek()->toDateString(), 'monthly' => $value->format('Y-m'), default => $value->toDateString() };
        };
        $keys = $appointments->map(fn ($item) => $key($item->appointment_date))->merge($patients->map(fn ($item) => $key($item->created_at)))->merge($payments->map(fn ($item) => $key($item->created_at)))->unique()->sortDesc()->values();
        $rows = $keys->map(function ($date) use ($appointments, $patients, $payments, $key, $period) {
            $periodPayments = $payments->filter(fn ($item) => $key($item->created_at) === $date);
            return ['id' => $date, 'date' => $date, 'period' => $this->label($period),
                'appointments' => $appointments->filter(fn ($item) => $key($item->appointment_date) === $date)->count(),
                'patients' => $patients->filter(fn ($item) => $key($item->created_at) === $date)->count(),
                'payments' => $periodPayments->count(),
                'revenue' => $this->money($periodPayments->whereIn('status', self::PAID)->sum('paid_amount'))];
        });
        return $this->collectionResult([
            'Appointments' => $appointments->count(), 'Patients' => $patients->count(),
            'Payments' => $payments->count(), 'Revenue' => $this->money($payments->whereIn('status', self::PAID)->sum('paid_amount')),
        ], $rows, $request);
    }

    private function range(Builder $query, Request $request, string $column): void
    {
        [$from, $to] = $this->dates($request);
        $query->whereBetween($column, [$from, $to]);
    }

    private function dates(Request $request): array
    {
        $period = $request->string('period', 'monthly')->lower()->toString();
        $to = filled($request->input('to')) ? Carbon::parse($request->input('to'))->endOfDay() : now()->endOfDay();
        $from = match ($period) {
            'daily' => $to->copy()->startOfDay(),
            'weekly' => $to->copy()->startOfWeek(),
            'custom' => filled($request->input('from')) ? Carbon::parse($request->input('from'))->startOfDay() : $to->copy()->subDays(30)->startOfDay(),
            default => $to->copy()->startOfMonth(),
        };
        return [$from, $to];
    }

    private function search(Builder $query, Request $request, callable $callback): void
    {
        $term = trim($request->string('search')->toString());
        if ($term !== '') $query->where(fn (Builder $nested) => $callback($nested, $term));
    }

    private function result(array $stats, LengthAwarePaginator $page, callable $formatter): array
    {
        return ['stats' => $this->stats($stats), 'rows' => $page->getCollection()->map($formatter)->values(), 'meta' => $this->meta($page)];
    }

    private function collectionResult(array $stats, Collection $items, Request $request): array
    {
        $perPage = $this->perPage($request); $pageNumber = max(1, $request->integer('page', 1));
        $page = new LengthAwarePaginator($items->forPage($pageNumber, $perPage)->values(), $items->count(), $perPage, $pageNumber);
        return ['stats' => $this->stats($stats), 'rows' => $page->items(), 'meta' => $this->meta($page)];
    }

    private function stats(array $stats): array { return collect($stats)->map(fn ($value, $label) => ['label' => $label, 'value' => $value])->values()->all(); }
    private function meta(LengthAwarePaginator $page): array { return ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'per_page' => $page->perPage(), 'total' => $page->total()]; }
    private function perPage(Request $request): int { return min(max($request->integer('per_page', 20), 1), 1000); }
    private function money($amount): string { return 'BDT '.number_format((float) $amount, 2); }
    private function label(?string $value): string { return ucwords(str_replace(['_', '-'], ' ', (string) $value)); }
    private function auditType(AuditLog $log): string { if (!$log->user_id) return 'System'; return in_array($log->user?->role, ['admin', 'super-admin', 'super_admin'], true) ? 'Admin' : 'User'; }
}
