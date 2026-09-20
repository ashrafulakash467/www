<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\AuditLog;
use App\Models\ContactMessage;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class AdminNotificationService
{
    public function sync(User $admin): void
    {
        Appointment::query()->with(['patient.user', 'doctor.user'])->eachById(function (Appointment $appointment) use ($admin): void {
            $status = (string) $appointment->status;
            $patient = $appointment->patient?->user?->name ?? $appointment->patient?->name ?? 'Patient';
            $doctor = $appointment->doctor?->user?->name ?? 'Doctor';
            $type = match ($status) {
                'reschedule_requested' => 'reschedule_request',
                'cancellation_requested', 'cancelled' => 'cancellation',
                default => 'appointment',
            };
            $title = match ($status) {
                'reschedule_requested' => 'Reschedule request received',
                'cancellation_requested' => 'Cancellation request received',
                'cancelled' => 'Appointment cancelled',
                'confirmed' => 'Appointment confirmed',
                'completed' => 'Appointment completed',
                default => 'Appointment '.str_replace('_', ' ', $status ?: 'created'),
            };

            $this->store($admin, "appointment:{$appointment->id}:{$status}", [
                'title' => $title,
                'message' => "{$patient}'s appointment {$appointment->appointment_no} with {$doctor} is ".str_replace('_', ' ', $status).'.',
                'type' => $type,
                'related_user' => $patient,
                'related_type' => Appointment::class,
                'related_id' => $appointment->id,
                'related_tab' => $status === 'cancelled' ? 'appointments-history' : 'appointments',
            ], $appointment->updated_at ?? $appointment->created_at);
        });

        Payment::query()->with('patient.user')->eachById(function (Payment $payment) use ($admin): void {
            $patient = $payment->patient?->user?->name ?? 'Patient';
            $reference = $payment->transaction_no ?? "Payment #{$payment->id}";
            $status = (string) $payment->status;

            $this->store($admin, "payment:{$payment->id}:{$status}", [
                'title' => 'Payment '.str_replace('_', ' ', $status ?: 'updated'),
                'message' => "{$reference} for {$patient} is ".str_replace('_', ' ', $status).'.',
                'type' => 'payment',
                'related_user' => $patient,
                'related_type' => Payment::class,
                'related_id' => $payment->id,
                'related_tab' => 'payments-all',
            ], $payment->updated_at ?? $payment->created_at);

            if ($payment->refund_status && $payment->refund_status !== 'not_requested') {
                $refundStatus = (string) $payment->refund_status;
                $this->store($admin, "refund:{$payment->id}:{$refundStatus}", [
                    'title' => 'Refund '.str_replace('_', ' ', $refundStatus),
                    'message' => "Refund for {$reference} ({$patient}) is ".str_replace('_', ' ', $refundStatus).'.',
                    'type' => 'refund',
                    'related_user' => $patient,
                    'related_type' => Payment::class,
                    'related_id' => $payment->id,
                    'related_tab' => $refundStatus === 'requested' ? 'refunds-pending' : 'refunds-all',
                ], $payment->refund_processed_at ?? $payment->refund_requested_at ?? $payment->updated_at);
            }
        });

        Doctor::query()->with('user')->eachById(function (Doctor $doctor) use ($admin): void {
            $name = $doctor->user?->name ?? "Doctor #{$doctor->id}";
            $status = (string) ($doctor->verification_status ?: 'pending');
            $this->store($admin, "doctor:{$doctor->id}:{$status}", [
                'title' => 'Doctor verification '.str_replace('_', ' ', $status),
                'message' => "{$name}'s verification status is ".str_replace('_', ' ', $status).'.',
                'type' => 'doctor_verification',
                'related_user' => $name,
                'related_type' => Doctor::class,
                'related_id' => $doctor->id,
                'related_tab' => 'doctors',
            ], $doctor->verified_at ?? $doctor->updated_at ?? $doctor->created_at);
        });

        Patient::query()->with('user')->eachById(function (Patient $patient) use ($admin): void {
            $name = $patient->user?->name ?? $patient->name ?? "Patient #{$patient->id}";
            $this->store($admin, "patient:{$patient->id}:registered", [
                'title' => 'Patient registered',
                'message' => "{$name} joined as a patient.",
                'type' => 'patient',
                'related_user' => $name,
                'related_type' => Patient::class,
                'related_id' => $patient->id,
                'related_tab' => 'users',
            ], $patient->created_at);
        });

        ContactMessage::query()->eachById(function (ContactMessage $contact) use ($admin): void {
            $name = trim("{$contact->first_name} {$contact->last_name}");
            $this->store($admin, "contact:{$contact->id}", [
                'title' => $contact->subject,
                'message' => "New Contact page message from {$name}.",
                'type' => 'support',
                'related_user' => $name,
                'related_type' => ContactMessage::class,
                'related_id' => $contact->id,
                'related_tab' => 'support',
            ], $contact->created_at);
        });

        AuditLog::query()->with('user')->eachById(function (AuditLog $log) use ($admin): void {
            $actor = $log->user?->name ?? 'System';
            $this->store($admin, "audit:{$log->id}", [
                'title' => $log->action,
                'message' => $log->description ?: "{$log->action} by {$actor}.",
                'type' => 'system',
                'related_user' => $actor,
                'related_type' => $log->auditable_type,
                'related_id' => $log->auditable_id,
                'related_tab' => 'audit',
            ], $log->created_at);
        });
    }

    private function store(User $admin, string $eventKey, array $data, mixed $occurredAt): void
    {
        $timestamp = $occurredAt ?: now();

        DB::table('notifications')->insertOrIgnore([
            'id' => $this->notificationId($admin->getKey(), $eventKey),
            'type' => 'App\\Notifications\\AdminSystemNotification',
            'notifiable_type' => User::class,
            'notifiable_id' => $admin->getKey(),
            'data' => json_encode(['event_key' => $eventKey, ...$data], JSON_THROW_ON_ERROR),
            'read_at' => null,
            'created_at' => $timestamp,
            'updated_at' => $timestamp,
        ]);
    }

    private function notificationId(int|string $adminId, string $eventKey): string
    {
        $hash = hash('sha256', "{$adminId}|{$eventKey}");

        return sprintf('%s-%s-5%s-a%s-%s',
            substr($hash, 0, 8),
            substr($hash, 8, 4),
            substr($hash, 13, 3),
            substr($hash, 17, 3),
            substr($hash, 20, 12),
        );
    }
}
