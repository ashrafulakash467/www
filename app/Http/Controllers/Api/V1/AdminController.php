<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\AuditLog;
use App\Models\CmsPage;
use App\Models\Doctor;
use App\Models\Payment;
use App\Models\Report;
use App\Models\SupportTicket;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Role;

class AdminController extends Controller
{
    public function index(): JsonResponse
    {
        $pendingDoctors = Doctor::query()
            ->with('user')
            ->where('verification_status', 'pending')
            ->latest()
            ->get()
            ->map(fn (Doctor $doctor) => $this->formatDoctorVerification($doctor))
            ->values();

        $approved = Doctor::query()->where('verification_status', 'approved')->count();
        $rejected = Doctor::query()->where('verification_status', 'rejected')->count();

        return response()->json([
            'pendingDoctors' => $pendingDoctors,
            'summary' => [
                'pending' => $pendingDoctors->count(),
                'approved' => $approved,
                'rejected' => $rejected,
            ],
        ]);
    }

    public function users(Request $request): JsonResponse
    {
        $users = User::query()
            ->with([
                'roles',
                'doctor',
                'patient',
            ])
            ->where(function ($query): void {
                $query->whereNull('status')
                    ->orWhere('status', '!=', 'deleted');
            })
            ->latest()
            ->paginate(min(max($request->integer('per_page', 50), 1), 100));

        return response()->json([
            'success' => true,
            'message' => 'Users retrieved successfully.',
            'users' => $users->getCollection()->map(fn (User $user) => $this->formatUserCard($user))->values(),
            'total' => $users->total(),
            'pagination' => [
                'page' => $users->currentPage(),
                'perPage' => $users->perPage(),
                'totalPages' => $users->lastPage(),
            ],
        ]);
    }

    public function data(): JsonResponse
    {
        $appointments = Appointment::query()
            ->with(['patient.user', 'doctor.user'])
            ->latest('appointment_date')
            ->limit(100)
            ->get()
            ->map(fn (Appointment $appointment): array => [
                'id' => (string) $appointment->id,
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

        $payments = Payment::query()
            ->latest()
            ->limit(100)
            ->get()
            ->map(fn (Payment $payment): array => [
                'id' => (string) $payment->id,
                'reference' => $payment->transaction_no ?? ('PAY-'.$payment->id),
                'amountCents' => (int) round(((float) ($payment->paid_amount ?? $payment->amount ?? 0)) * 100),
                'status' => $this->adminDisplayLabel($payment->status, 'Pending'),
                'note' => $payment->method
                    ? ('Payment via '.$this->adminDisplayLabel($payment->method))
                    : 'Payment record',
            ])
            ->values();

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

        $tickets = SupportTicket::query()
            ->with(['user', 'patient', 'doctor.user'])
            ->latest()
            ->get()
            ->map(fn (SupportTicket $ticket): array => [
                'id' => (string) $ticket->id,
                'subject' => $ticket->subject,
                'requester' => $ticket->user?->name
                    ?? $ticket->patient?->name
                    ?? $ticket->doctor?->user?->name
                    ?? ('User #'.$ticket->user_id),
                'priority' => $this->adminDisplayLabel($ticket->priority, 'Medium'),
                'status' => $this->adminDisplayLabel($ticket->status, 'Open'),
            ])
            ->values();

        $appointmentRequests = Appointment::query()
            ->with(['patient.user', 'doctor.user', 'payment'])
            ->whereIn('status', ['cancellation_requested', 'reschedule_requested'])
            ->latest()
            ->get()
            ->map(function (Appointment $appointment): array {
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

        $roles = Role::query()
            ->with('permissions')
            ->orderBy('name')
            ->get()
            ->map(fn (Role $role): array => [
                'role' => $this->adminDisplayLabel($role->name, $role->name),
                'permissions' => $role->permissions->pluck('name')
                    ->map(fn (string $permission) => $this->adminDisplayLabel($permission, $permission))
                    ->values(),
            ])
            ->values();

        return response()->json([
            'appointments' => $appointments,
            'payments' => $payments,
            'content' => $content,
            'reports' => $reports,
            'tickets' => $tickets,
            'appointmentRequests' => $appointmentRequests,
            'logs' => $logs,
            'roles' => $roles,
            'notifications' => $this->adminNotifications(),
        ]);
    }

    private function adminNotifications(): array
    {
        $pendingDoctors = Doctor::query()->where('verification_status', 'pending')->count();
        $pendingRefunds = Payment::query()->where('status', 'refund_requested')->count();
        $openTickets = SupportTicket::query()->where('status', 'open')->count();
        $systemHealth = max(80, 100 - ($pendingDoctors * 2) - $openTickets);

        $notifications = [];

        if ($pendingDoctors > 0) {
            $notifications[] = [
                'id' => 'notify-pending-doctors',
                'title' => 'Pending doctor verification',
                'message' => "{$pendingDoctors} onboarding application(s) need manual review.",
            ];
        }

        if ($pendingRefunds > 0) {
            $notifications[] = [
                'id' => 'notify-refund-queue',
                'title' => 'Refund queue update',
                'message' => "{$pendingRefunds} refund request(s) are waiting for finance approval.",
            ];
        }

        if ($openTickets > 0) {
            $notifications[] = [
                'id' => 'notify-open-tickets',
                'title' => 'Open support tickets',
                'message' => "{$openTickets} open ticket(s) require attention.",
            ];
        }

        $notifications[] = [
            'id' => 'notify-system-health',
            'title' => 'System health',
            'message' => $systemHealth >= 95
                ? 'All services are green. No incident is currently open.'
                : "System stability score is {$systemHealth}%.",
        ];

        return $notifications;
    }

    private function adminDisplayLabel(?string $value, string $default = ''): string
    {
        $raw = trim((string) $value);

        if ($raw === '') {
            return $default;
        }

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

        $key = strtolower(str_replace('-', '_', $raw));

        return $lookup[$key] ?? ucwords(str_replace(['-', '_'], ' ', $key));
    }

    private function formatAppointmentTime(Appointment $appointment): string
    {
        if ($appointment->start_time) {
            try {
                return Carbon::parse($appointment->start_time)->format('g:i A');
            } catch (\Throwable) {
                // fall through to the raw value
            }

            return $appointment->start_time;
        }

        return $appointment->appointment_date?->format('M d') ?? '';
    }

    public function destroy(string $userId): JsonResponse
    {
        $user = User::query()
            ->with(['doctor', 'patient'])
            ->findOrFail($userId);

        Gate::authorize('delete', $user);

        DB::transaction(function () use ($user): void {
            $user->syncRoles([]);
            $user->syncPermissions([]);

            DB::table('personal_access_tokens')
                ->where('tokenable_type', User::class)
                ->where('tokenable_id', $user->id)
                ->delete();

            DB::table('sessions')
                ->where('user_id', $user->id)
                ->delete();

            $user->delete();
        });

        return response()->json([
            'message' => 'User deleted successfully.',
        ]);
    }

    public function decision(Request $request, string $doctorId): JsonResponse
    {
        $data = $request->validate([
            'decision' => ['required', 'string', 'in:approve,reject'],
            'rejectionReason' => ['nullable', 'string', 'max:1000'],
        ]);

        $doctor = Doctor::query()->with('user')->findOrFail($doctorId);

        if ($data['decision'] === 'reject' && blank($data['rejectionReason'] ?? null)) {
            throw ValidationException::withMessages([
                'rejectionReason' => ['A rejection reason is required when rejecting a doctor.'],
            ]);
        }

        $doctor->forceFill([
            'verification_status' => $data['decision'] === 'approve' ? 'approved' : 'rejected',
            'status' => $data['decision'] === 'approve' ? 'active' : 'inactive',
            'verified_at' => $data['decision'] === 'approve' ? now() : null,
        ])->save();

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

    private function formatDoctorVerification(Doctor $doctor): array
    {
        $user = $doctor->user;
        $isActive = $doctor->verification_status === 'approved' && $doctor->status === 'active';

        return [
            'id' => (string) $doctor->id,
            'name' => $user?->name ?? 'Unknown Doctor',
            'email' => $user?->email ?? '',
            'phone' => $user?->phone ?? '',
            'specialty' => $doctor->specialty ?? 'General Medicine',
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
            'reviewedAt' => $doctor->updated_at?->toISOString(),
            'verifiedAt' => $doctor->verification_status === 'approved' ? $doctor->verified_at?->toISOString() : null,
            'isAvailable' => $isActive,
            'isVerified' => $doctor->verification_status === 'approved',
            'isActive' => $isActive,
            'imageUrl' => $this->doctorImageUrl($doctor->image_path),
            'createdAt' => $doctor->created_at?->toISOString(),
        ];
    }

    private function formatUserCard(User $user): array
    {
        $legacyRole = strtolower(trim((string) $user->role));
        $roles = $user->getRoleNames()
            ->push($legacyRole)
            ->filter()
            ->unique()
            ->values()
            ->all();
        $doctor = $user->doctor;
        $patient = $user->patient;
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

    private function doctorImageUrl(?string $imagePath): string
    {
        if (blank($imagePath)) {
            return '/globe.svg';
        }

        if (str_starts_with($imagePath, 'http://') || str_starts_with($imagePath, 'https://')) {
            return $imagePath;
        }

        $normalizedPath = ltrim($imagePath, '/');

        if (str_starts_with($normalizedPath, 'images/doctors/')) {
            return url($normalizedPath);
        }

        $filename = basename($normalizedPath);
        $publicPath = public_path('images/doctors/'.$filename);

        if (is_file($publicPath)) {
            return url('/images/doctors/'.$filename);
        }

        if (Storage::disk('public')->exists('doctors/'.$filename)) {
            return url('/doctor-images/'.$filename);
        }

        return url('/images/doctors/'.$filename);
    }
}
