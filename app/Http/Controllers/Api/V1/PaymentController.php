<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
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

    public function show(Request $request, Payment $payment): JsonResponse
    {
        $visible = $this->visibleQuery($request)->whereKey($payment->id)->exists();
        abort_unless($visible, 403);

        return response()->json([
            'success' => true,
            'message' => 'Payment retrieved successfully.',
            'data' => $payment->load(['appointment', 'patient.user', 'doctor.user']),
        ]);
    }

    private function visibleQuery(Request $request): Builder
    {
        $user = $request->user();
        $query = Payment::query()->with(['appointment', 'patient.user', 'doctor.user']);

        if ($user->hasAnyRole(['admin', 'super-admin'])) {
            return $query;
        }

        if ($user->hasRole('doctor')) {
            return $query->where('doctor_id', $user->doctor?->id ?? 0);
        }

        return $query->where('patient_id', $user->patient?->id ?? 0);
    }
}
