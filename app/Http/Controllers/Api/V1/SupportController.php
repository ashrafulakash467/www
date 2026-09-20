<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\ContactMessage;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupportController extends Controller
{
    public function storeContactMessage(Request $request): JsonResponse
    {
        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:255'],
            'subject' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string', 'max:5000'],
        ]);

        ContactMessage::query()->create($data);

        return response()->json([
            'success' => true,
            'message' => 'Your message has been sent successfully.',
        ], 201);
    }

    public function contactMessages(Request $request): JsonResponse
    {
        $query = ContactMessage::query();
        $search = trim($request->string('search')->toString());

        if ($search !== '') {
            $query->where(fn (Builder $builder) => $builder
                ->where('first_name', 'like', "%{$search}%")
                ->orWhere('last_name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")
                ->orWhere('subject', 'like', "%{$search}%")
                ->orWhere('message', 'like', "%{$search}%"));
        }

        if ($request->filled('from')) $query->whereDate('created_at', '>=', $request->input('from'));
        if ($request->filled('to')) $query->whereDate('created_at', '<=', $request->input('to'));

        $messages = $query->latest()->paginate(min(max($request->integer('per_page', 20), 1), 100));

        return response()->json([
            'success' => true,
            'data' => $messages->getCollection()->map(fn (ContactMessage $message) => [
                'id' => $message->id,
                'firstName' => $message->first_name,
                'lastName' => $message->last_name,
                'name' => trim("{$message->first_name} {$message->last_name}"),
                'email' => $message->email,
                'subject' => $message->subject,
                'message' => $message->message,
                'createdAt' => $message->created_at?->toISOString(),
                'updatedAt' => $message->updated_at?->toISOString(),
            ])->values(),
            'meta' => [
                'current_page' => $messages->currentPage(),
                'last_page' => $messages->lastPage(),
                'per_page' => $messages->perPage(),
                'total' => $messages->total(),
            ],
        ]);
    }

    public function appointmentRequests(Request $request): JsonResponse
    {
        $type = $request->string('type')->lower()->toString();
        $status = $type === 'reschedule' ? 'reschedule_requested' : 'cancellation_requested';
        $query = Appointment::query()->with(['patient.user', 'doctor.user', 'payment'])->where('status', $status);
        $search = trim($request->string('search')->toString());

        if ($search !== '') {
            $query->where(fn (Builder $builder) => $builder
                ->where('appointment_no', 'like', "%{$search}%")
                ->orWhereHas('patient.user', fn (Builder $user) => $user->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%"))
                ->orWhereHas('doctor.user', fn (Builder $user) => $user->where('name', 'like', "%{$search}%")));
        }

        if ($request->filled('from')) $query->whereDate('appointment_date', '>=', $request->input('from'));
        if ($request->filled('to')) $query->whereDate('appointment_date', '<=', $request->input('to'));

        $appointments = $query->latest()->paginate(min(max($request->integer('per_page', 20), 1), 100));

        return response()->json([
            'success' => true,
            'data' => $appointments->getCollection()->map(fn (Appointment $appointment) => $this->formatRequest($appointment))->values(),
            'meta' => [
                'current_page' => $appointments->currentPage(),
                'last_page' => $appointments->lastPage(),
                'per_page' => $appointments->perPage(),
                'total' => $appointments->total(),
            ],
        ]);
    }

    private function formatRequest(Appointment $appointment): array
    {
        $change = $appointment->meta['patient_change_request'] ?? [];
        $payment = $appointment->payment;

        return [
            'id' => $appointment->id,
            'appointmentNumber' => $appointment->appointment_no,
            'type' => $change['type'] ?? ($appointment->status === 'reschedule_requested' ? 'reschedule' : 'cancellation'),
            'status' => $appointment->status,
            'patient' => [
                'name' => $appointment->patient?->user?->name,
                'email' => $appointment->patient?->user?->email,
                'phone' => $appointment->patient?->user?->phone,
            ],
            'doctor' => [
                'name' => $appointment->doctor?->user?->name,
                'specialty' => $appointment->doctor?->specialty,
            ],
            'appointmentDate' => $appointment->appointment_date?->toDateString(),
            'slotTime' => $appointment->start_time,
            'requestedDate' => $change['appointment_date'] ?? null,
            'requestedTime' => $change['slot_time'] ?? null,
            'reason' => $change['reason'] ?? $appointment->cancel_reason,
            'requestedAt' => $change['requested_at'] ?? $appointment->updated_at?->toISOString(),
            'payment' => $payment ? [
                'transactionNumber' => $payment->transaction_no,
                'status' => $payment->status,
                'currency' => $payment->currency,
                'paidAmount' => (float) $payment->paid_amount,
                'refundAmount' => (float) $payment->refund_amount,
                'refundStatus' => $payment->refund_status,
                'refundReference' => $payment->refund_ref_id,
                'refundReason' => $payment->refund_reason,
                'refundRequestedAt' => $payment->refund_requested_at?->toISOString(),
                'refundProcessedAt' => $payment->refund_processed_at?->toISOString(),
            ] : null,
            'createdAt' => $appointment->created_at?->toISOString(),
            'updatedAt' => $appointment->updated_at?->toISOString(),
        ];
    }
}
