<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Return only the payments that are visible to the authenticated user's role. */
/** Frontend mental model: this is a role-filtered read API for payment lists and detail views. */
class PaymentController extends Controller
{
    /** Paginate payments visible to the authenticated role profile. */
    public function index(Request $request): JsonResponse
    {
        // Start from a role-scoped query so pagination can never leak another user's payments.
        $payments = $this->visibleQuery($request)
            ->latest()
            ->paginate(min(max($request->integer('per_page', 15), 1), 50));

        return response()->json([
            'success' => true,
            'message' => 'Payments retrieved successfully.',
            'data' => $payments->items(),
            'meta' => [
                'current_page' => $payments->currentPage(),
                'last_page' => $payments->lastPage(),
                'per_page' => $payments->perPage(),
                'total' => $payments->total(),
            ],
        ]);
    }

    /** Return one payment after verifying it is visible to the requester. */
    public function show(Request $request, Payment $payment): JsonResponse
    {
        // Laravel route-model binding converts the URL payment ID into a Payment model.
        $visible = $this->visibleQuery($request)->whereKey($payment->id)->exists();
        // Even when the payment exists, return 403 if it is outside the user's scoped query.
        abort_unless($visible, 403);

        return response()->json([
            'success' => true,
            'message' => 'Payment retrieved successfully.',
            'data' => $payment->load(['appointment', 'patient.user', 'doctor.user']),
        ]);
    }

    /** Scope payments to an administrator, doctor, or patient relationship. */
    private function visibleQuery(Request $request): Builder
    {
        $user = $request->user();
        $query = Payment::query()->with(['appointment', 'patient.user', 'doctor.user']);

        // Admin sees the base query; other roles receive an additional ownership WHERE clause.
        if ($user->hasAnyRole(['admin', 'super-admin'])) {
            return $query;
        }

        if ($user->hasRole('doctor')) {
            return $query->where('doctor_id', $user->doctor?->id ?? 0);
        }

        return $query->where('patient_id', $user->patient?->id ?? 0);
    }
}
