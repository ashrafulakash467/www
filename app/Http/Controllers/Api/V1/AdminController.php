<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\AuditLog;
use App\Models\CmsPage;
use App\Models\Doctor;
use App\Models\Payment;
use App\Models\Report;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

/**
 * Provide administration data, user management, and doctor-verification actions.
 *
 * From a frontend perspective, each public method is an API handler: it reads the
 * request, queries models, converts database records into UI-friendly arrays, and
 * returns JSON. Private methods are reusable serializers and formatting helpers.
 */
class AdminController extends Controller
{
    /** Return the doctor-verification overview used by the admin dashboard. */
    public function index(): JsonResponse
    {
        // Doctor::query() starts an Eloquent database query, similar to calling a data service.
        $pendingDoctors = Doctor::query()
            // Eager-load the related user once so name/email access does not run extra queries per doctor.
            ->with('user')
            ->where('verification_status', 'pending')
            ->latest()
            ->get()
            // map() plays a role similar to Array.map() in JavaScript: model in, UI object out.
            ->map(fn (Doctor $doctor) => $this->formatDoctorVerification($doctor))
            ->values();

        // These count queries provide the small summary cards without loading full records.
        $approved = Doctor::query()->where('verification_status', 'approved')->count();
        $rejected = Doctor::query()->where('verification_status', 'rejected')->count();

        // response()->json() serializes PHP arrays/collections into the HTTP JSON response.
        return response()->json([
            'pendingDoctors' => $pendingDoctors,
            'summary' => [
                'pending' => $pendingDoctors->count(),
                'approved' => $approved,
                'rejected' => $rejected,
            ],
        ]);
    }

    /** Search and paginate user cards for administrative user management. */
    public function users(Request $request): JsonResponse
    {
        // Request contains query parameters, submitted data, headers, and the authenticated user.
        $users = User::query()
            // Load role-specific relationships now because the formatter needs them later.
            ->with([
                'roles',
                'doctor',
                'patient',
            ])
            // Deleted accounts stay out of the active admin list.
            ->where(function ($query): void {
                $query->whereNull('status')
                    ->orWhere('status', '!=', 'deleted');
            })
            ->latest()
            // Clamp per_page to 1–100 so a client cannot request an unbounded response.
            ->paginate(min(max($request->integer('per_page', 50), 1), 100));

        return response()->json([
            'success' => true,
            'message' => 'Users retrieved successfully.',
            // Transform only the current page while keeping Laravel's pagination metadata.
            'users' => $users->getCollection()->map(fn (User $user) => $this->formatUserCard($user))->values(),
            'total' => $users->total(),
            'pagination' => [
                'page' => $users->currentPage(),
                'perPage' => $users->perPage(),
                'totalPages' => $users->lastPage(),
            ],
        ]);
    }

    /** Build the combined datasets and totals displayed across admin modules. */
    public function data(): JsonResponse
    {
        // Build the recent-appointments dataset consumed by the appointments widget.
        $appointments = Appointment::query()
            // Dot notation loads nested relationships: appointment -> patient/doctor -> user.
            ->with(['patient.user', 'doctor.user'])
            ->latest('appointment_date')
            ->limit(100)
            ->get()
            ->map(fn (Appointment $appointment): array => [
                'id' => (string) $appointment->id,
                // The ?-> operator is PHP optional chaining; each ?? provides a fallback value.
                'patient' => $appointment->patient?->name
                    ?? $appointment->patient?->user?->name
                    ?? ('Patient #'.$appointment->patient_id),
                'doctor' => $appointment->doctor?->user?->name
                    ?? $appointment->doctor?->name
                    ?? ('Doctor #'.$appointment->doctor_id),
                'time' => $this->formatAppointmentTime($appointment),
                'type' => $this->adminDisplayLabel($appointment->consultation_type, 'Consultation'),
                'status' => $this->adminDisplayLabel($appointment->status, 'Pending'),
                'payment' => $this->adminDisplayLabel($appointment->payment_status, 'Pending'),
            ])
            ->values();

        // Build the recent-payments dataset independently from the appointment query.
        $payments = Payment::query()
            ->latest()
            ->limit(100)
            ->get()
            ->map(fn (Payment $payment): array => [
                'id' => (string) $payment->id,
                'reference' => $payment->transaction_no ?? ('PAY-'.$payment->id),
                // Integer cents avoid floating-point surprises in frontend calculations.
                'amountCents' => (int) round(((float) ($payment->paid_amount ?? $payment->amount ?? 0)) * 100),
                'status' => $this->adminDisplayLabel($payment->status, 'Pending'),
                'note' => $payment->method
                    ? ('Payment via '.$this->adminDisplayLabel($payment->method))
                    : 'Payment record',
            ])
            ->values();

        // CMS pages are converted to the lightweight shape required by the content module.
        $content = CmsPage::query()
            ->latest()
            ->get()
            ->map(fn (CmsPage $page): array => [
                'id' => (string) $page->id,
                'title' => $page->title,
                'owner' => $page->createdBy?->name ?? 'CMS',
                'status' => $this->adminDisplayLabel($page->status, 'Draft'),
            ])
            ->values();

        // Reports follow the same query -> map -> values pattern used above.
        $reports = Report::query()
            ->latest()
            ->get()
            ->map(fn (Report $report): array => [
                'id' => (string) $report->id,
                'title' => $report->title,
                'owner' => $report->generatedBy?->name ?? 'Analytics',
                'status' => $this->adminDisplayLabel($report->status, 'Ready'),
            ])
            ->values();

        // Only appointments awaiting a patient-request decision belong in this queue.
        $appointmentRequests = Appointment::query()
            ->with(['patient.user', 'doctor.user', 'payment'])
            ->whereIn('status', ['cancellation_requested', 'reschedule_requested'])
            ->latest()
            ->get()
            ->map(function (Appointment $appointment): array {
                // meta is a JSON database column; patient_change_request holds the requested change.
                $changeRequest = $appointment->meta['patient_change_request'] ?? [];

                return [
                    'id' => (string) $appointment->appointment_no,
                    'type' => $changeRequest['type'] ?? 'change',
                    'patient' => $appointment->patient?->user?->name
                        ?? $appointment->patient?->name
                        ?? ('Patient #'.$appointment->patient_id),
                    'doctor' => $appointment->doctor?->user?->name
                        ?? $appointment->doctor?->name
                        ?? ('Doctor #'.$appointment->doctor_id),
                    'appointmentDate' => $appointment->appointment_date?->toDateString(),
                    'slotTime' => $this->formatAppointmentTime($appointment),
                    'requestedAppointmentDate' => $changeRequest['appointment_date'] ?? null,
                    'requestedSlotTime' => $changeRequest['slot_time'] ?? null,
                    'reason' => $changeRequest['reason'] ?? $appointment->cancel_reason,
                    'paymentStatus' => $this->adminDisplayLabel(
                        $appointment->payment?->status ?? $appointment->payment_status,
                        'Pending',
                    ),
                ];
            })
            ->values();

        // Audit logs tell the frontend who performed recent administrative actions.
        $logs = AuditLog::query()
            ->with('user')
            ->latest()
            ->limit(100)
            ->get()
            ->map(fn (AuditLog $log): array => [
                'id' => (string) $log->id,
                'action' => $log->action,
                'actor' => $log->user?->name ?? 'System',
                'time' => $log->created_at?->diffForHumans() ?? '—',
            ])
            ->values();

        // Keys here become top-level properties in the frontend's parsed response object.
        return response()->json([
            'appointments' => $appointments,
            'payments' => $payments,
            'content' => $content,
            'reports' => $reports,
            'appointmentRequests' => $appointmentRequests,
            'logs' => $logs,
        ]);
    }

    /** Convert database-friendly status keys into readable frontend labels. */
    private function adminDisplayLabel(?string $value, string $default = ''): string
    {
        // Casting also handles null safely; trim removes accidental surrounding spaces.
        $raw = trim((string) $value);

        if ($raw === '') {
            return $default;
        }

        // Known values get intentional wording instead of relying on automatic capitalization.
        $lookup = [
            'active' => 'Active',
            'inactive' => 'Inactive',
            'pending' => 'Pending',
            'pending_verification' => 'Pending Review',
            'under_review' => 'Under Review',
            'onboarded' => 'Onboarded',
            'paid' => 'Paid',
            'settled' => 'Settled',
            'refund_requested' => 'Refund Requested',
            'published' => 'Published',
            'draft' => 'Draft',
            'open' => 'Open',
            'in_progress' => 'In Progress',
            'waiting_on_user' => 'Waiting on User',
            'confirmed' => 'Confirmed',
            'completed' => 'Completed',
            'cancelled' => 'Cancelled',
            'super_admin' => 'Super Admin',
        ];

        // Normalize "pending-review" and "PENDING_REVIEW" to the same lookup key.
        $key = strtolower(str_replace('-', '_', $raw));

        // Unknown values still receive a reasonable human-readable fallback.
        return $lookup[$key] ?? ucwords(str_replace(['-', '_'], ' ', $key));
    }

    /** Format an appointment time for display, with a safe date fallback. */
    private function formatAppointmentTime(Appointment $appointment): string
    {
        if ($appointment->start_time) {
            try {
                // Carbon is Laravel's date/time helper, similar to using a date library in JavaScript.
                return Carbon::parse($appointment->start_time)->format('g:i A');
            } catch (\Throwable) {
                // Invalid legacy time values are returned unchanged instead of breaking the API.
            }

            return $appointment->start_time;
        }

        return $appointment->appointment_date?->format('M d') ?? '';
    }

    /** Soft-delete a user account after applying administrative safety checks. */
    public function destroy(string $userId): JsonResponse
    {
        // findOrFail returns the model or automatically produces a 404 response.
        $user = User::query()
            ->with(['doctor', 'patient'])
            ->findOrFail($userId);

        // The User policy decides whether the current administrator may delete this account.
        Gate::authorize('delete', $user);

        // A transaction is all-or-nothing: any failure rolls every database change back.
        DB::transaction(function () use ($user): void {
            // Remove access-control assignments before deleting the account.
            $user->syncRoles([]);
            $user->syncPermissions([]);

            // Revoke API tokens and browser sessions so the deleted user is logged out everywhere.
            DB::table('personal_access_tokens')
                ->where('tokenable_type', User::class)
                ->where('tokenable_id', $user->id)
                ->delete();

            DB::table('sessions')
                ->where('user_id', $user->id)
                ->delete();

            // User uses the model's configured delete behavior after related access is removed.
            $user->delete();
        });

        return response()->json([
            'message' => 'User deleted successfully.',
        ]);
    }

    /** Approve or reject a pending doctor-verification request. */
    public function decision(Request $request, string $doctorId): JsonResponse
    {
        // validate() returns clean data or stops with a 422 JSON validation response.
        $data = $request->validate([
            'decision' => ['required', 'string', 'in:approve,reject'],
            'rejectionReason' => ['nullable', 'string', 'max:1000'],
        ]);

        // Load the linked account because its status must change with the doctor profile.
        $doctor = Doctor::query()->with('user')->findOrFail($doctorId);

        // This is a business rule beyond basic field validation.
        if ($data['decision'] === 'reject' && blank($data['rejectionReason'] ?? null)) {
            throw ValidationException::withMessages([
                'rejectionReason' => ['A rejection reason is required when rejecting a doctor.'],
            ]);
        }

        // forceFill assigns these trusted server-calculated values before save() writes them.
        $doctor->forceFill([
            'verification_status' => $data['decision'] === 'approve' ? 'approved' : 'rejected',
            'status' => $data['decision'] === 'approve' ? 'active' : 'inactive',
            'verified_at' => $data['decision'] === 'approve' ? now() : null,
        ])->save();

        // Keep login eligibility synchronized with the professional verification result.
        $doctor->user?->forceFill([
            'status' => $data['decision'] === 'approve' ? 'active' : 'rejected',
        ])->save();

        return response()->json([
            'message' => $data['decision'] === 'approve'
                ? 'Doctor approved successfully.'
                : 'Doctor rejected successfully.',
            'doctor' => $this->formatDoctorVerification($doctor->fresh('user')),
        ]);
    }

    /** Convert a doctor record into the admin verification-card shape. */
    private function formatDoctorVerification(Doctor $doctor): array
    {
        // A formatter acts like a frontend adapter: database naming in, stable API naming out.
        $user = $doctor->user;
        $isActive = $doctor->verification_status === 'approved' && $doctor->status === 'active';

        return [
            'id' => (string) $doctor->id,
            'name' => $user?->name ?? 'Unknown Doctor',
            'email' => $user?->email ?? '',
            'phone' => $user?->phone ?? '',
            'specialty' => $doctor->specialty ?? 'General Medicine',
            // Convert a comma-separated database value into a clean JavaScript-style array.
            'qualifications' => array_values(array_filter(array_map('trim', explode(',', (string) $doctor->qualification)))),
            'experienceYears' => max(0, $doctor->created_at ? now()->diffInYears($doctor->created_at) : 0),
            'licenseNumber' => $doctor->license_no,
            'licenseIssuedBy' => $doctor->license_no ? 'Bangladesh Medical and Dental Council' : null,
            'profileSummary' => $doctor->bio ?: 'Verification profile available in the database.',
            'location' => $doctor->city ?: 'Unavailable',
            'gender' => $doctor->gender ?? 'Unspecified',
            'verificationStatus' => $doctor->verification_status,
            'rejectionReason' => $doctor->verification_status === 'rejected'
                ? 'Rejected by admin.'
                : null,
            // ISO timestamps are predictable for JavaScript Date parsing.
            'reviewedAt' => $doctor->updated_at?->toISOString(),
            'verifiedAt' => $doctor->verification_status === 'approved' ? $doctor->verified_at?->toISOString() : null,
            'isAvailable' => $isActive,
            'isVerified' => $doctor->verification_status === 'approved',
            'isActive' => $isActive,
            'imageUrl' => $this->doctorImageUrl($doctor->image_path),
            'createdAt' => $doctor->created_at?->toISOString(),
        ];
    }

    /** Normalize a user and role profile for the admin user list. */
    private function formatUserCard(User $user): array
    {
        // The project supports both Spatie roles and an older users.role string.
        $legacyRole = strtolower(trim((string) $user->role));
        $roles = $user->getRoleNames()
            ->push($legacyRole)
            ->filter()
            ->unique()
            ->values()
            ->all();
        $doctor = $user->doctor;
        $patient = $user->patient;
        // Relationship-based inference is the final fallback for legacy accounts.
        $primaryRole = $roles[0] ?? $this->inferUserRole($user);

        return [
            'id' => (string) $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'status' => $user->status ?? 'active',
            'roles' => $roles,
            'role' => $primaryRole,
            'roleLabel' => $this->userRoleLabel($primaryRole),
            'lastLoginAt' => $user->last_login_at?->toISOString(),
            'createdAt' => $user->created_at?->toISOString(),
            'twoFactorEnabled' => (bool) $user->two_factor_enabled,
            // These nested objects become either an object or null in JSON.
            'doctor' => $doctor ? [
                'id' => (string) $doctor->id,
                'specialty' => $doctor->specialty,
                'licenseNo' => $doctor->license_no,
                'imagePath' => $doctor->image_path,
                'imageUrl' => filled($doctor->image_path)
                    ? $this->doctorImageUrl($doctor->image_path)
                    : null,
                'gender' => $doctor->gender,
                'verificationStatus' => $doctor->verification_status,
                'status' => $doctor->status,
            ] : null,
            'patient' => $patient ? [
                'id' => (string) $patient->id,
                'mrn' => $patient->mrn,
                'gender' => $patient->gender,
                'bloodGroup' => $patient->blood_group,
                'dateOfBirth' => $patient->date_of_birth?->toDateString(),
                'city' => $patient->city,
                'status' => $patient->status,
            ] : null,
        ];
    }

    /** Infer a legacy user's role from whichever profile relationship exists. */
    private function inferUserRole(User $user): string
    {
        if ($user->doctor) {
            return 'doctor';
        }

        if ($user->patient) {
            return 'patient';
        }

        return 'user';
    }

    /** Map internal role names to labels displayed by the frontend. */
    private function userRoleLabel(string $role): string
    {
        return match ($role) {
            'super-admin' => 'Super Admin',
            'admin' => 'Admin',
            'doctor' => 'Doctor',
            'patient' => 'Patient',
            default => 'User',
        };
    }

    /** Resolve remote, public, and storage-backed doctor image paths to a usable URL. */
    private function doctorImageUrl(?string $imagePath): string
    {
        // Always return a fallback so image components receive a valid source string.
        if (blank($imagePath)) {
            return '/globe.svg';
        }

        // Already-absolute URLs do not need Laravel path conversion.
        if (str_starts_with($imagePath, 'http://') || str_starts_with($imagePath, 'https://')) {
            return $imagePath;
        }

        $normalizedPath = ltrim($imagePath, '/');

        if (str_starts_with($normalizedPath, 'images/doctors/')) {
            return url($normalizedPath);
        }

        // basename strips directory segments and protects the following filesystem checks.
        $filename = basename($normalizedPath);
        $publicPath = public_path('images/doctors/'.$filename);

        if (is_file($publicPath)) {
            return url('/images/doctors/'.$filename);
        }

        // Storage::disk('public') checks Laravel's storage/app/public disk.
        if (Storage::disk('public')->exists('doctors/'.$filename)) {
            return url('/doctor-images/'.$filename);
        }

        return url('/images/doctors/'.$filename);
    }
}
