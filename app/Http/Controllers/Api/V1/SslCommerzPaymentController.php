<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Payment;
use App\Services\EarningService;
use App\Services\PaymentService;
use App\Services\RefundService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SslCommerzPaymentController extends Controller
{
    public function __construct(
        private readonly PaymentService $payments,
        private readonly RefundService $refunds,
        private readonly EarningService $earnings,
    ) {}

    /**
     * Create an SSLCommerz session and return its hosted checkout URL.
     */
    public function initiate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'appointment_id' => ['required', 'string', 'max:100'],
        ]);

        $appointment = $this->appointmentForUser($request, $validated['appointment_id']);

        if (
            $appointment->payment_status === 'paid'
            || strtolower((string) $appointment->payment?->status) === 'paid'
        ) {
            return response()->json([
                'success' => false,
                'message' => 'This appointment has already been paid.',
            ], 422);
        }

        $amount = (float) ($appointment->doctor?->consultation_fee ?? 0);

        if ($amount < 10) {
            return response()->json([
                'success' => false,
                'message' => 'The consultation fee must be at least BDT 10.00 for SSLCommerz.',
            ], 422);
        }

        $payment = $this->preparePayment($appointment, $amount);
        $result = $this->payments->initializeGateway($this->gatewayPayload($appointment, $payment));

        if (! $result['success']) {
            $payment->update([
                'status' => 'failed',
                'gateway_response' => $result['data'] ?? ['message' => $result['message']],
            ]);

            return response()->json([
                'success' => false,
                'message' => $result['message'] ?? 'Could not initialize SSLCommerz.',
            ], 502);
        }

        $payment->update([
            'status' => 'pending',
            'gateway_response' => $result['data'] ?? [],
        ]);

        return response()->json([
            'success' => true,
            'gateway_url' => $result['gateway_url'],
            'payment' => $payment->fresh(),
        ]);
    }

    /**
     * Compatibility alias for existing clients using POST /pay.
     */
    public function index(Request $request): JsonResponse
    {
        return $this->initiate($request);
    }

    /**
     * Compatibility alias for existing clients using POST /pay-via-ajax.
     */
    public function payViaAjax(Request $request): JsonResponse
    {
        return $this->initiate($request);
    }

    public function success(Request $request): RedirectResponse
    {
        $result = $this->processSuccessfulNotification($request);

        return $this->redirectToFrontend(
            $result['status'],
            $result['payment'] ?? null,
            $request->string('tran_id')->toString()
        );
    }

    public function fail(Request $request): RedirectResponse
    {
        $payment = $this->recordUnsuccessfulPayment($request, 'failed');

        return $this->redirectToFrontend('fail', $payment, $request->string('tran_id')->toString());
    }

    public function cancel(Request $request): RedirectResponse
    {
        $payment = $this->recordUnsuccessfulPayment($request, 'cancelled');

        return $this->redirectToFrontend('cancel', $payment, $request->string('tran_id')->toString());
    }

    /**
     * Receive server-to-server payment notifications from SSLCommerz.
     */
    public function ipn(Request $request): JsonResponse
    {
        $status = strtoupper($request->string('status')->toString());

        if (in_array($status, ['VALID', 'VALIDATED'], true)) {
            $result = $this->processSuccessfulNotification($request);
            $httpStatus = $result['status'] === 'success' ? 200 : 422;

            if ($result['status'] === 'pending') {
                $httpStatus = 202;
            }

            return response()->json([
                'success' => $result['status'] === 'success',
                'status' => $result['status'],
                'message' => $result['message'],
            ], $httpStatus);
        }

        $mappedStatus = match ($status) {
            'CANCELLED' => 'cancelled',
            'FAILED', 'EXPIRED', 'UNATTEMPTED' => 'failed',
            default => null,
        };

        if (! $mappedStatus) {
            return response()->json([
                'success' => false,
                'message' => 'Unsupported SSLCommerz notification status.',
            ], 422);
        }

        $payment = $this->recordUnsuccessfulPayment($request, $mappedStatus);

        return response()->json([
            'success' => (bool) $payment,
            'status' => $mappedStatus,
            'message' => $payment ? 'Payment status updated.' : 'Payment record not found.',
        ], $payment ? 200 : 404);
    }

    public function paymentDetails(Request $request, string $appointmentId): JsonResponse
    {
        $appointment = $this->appointmentForUser($request, $appointmentId);

        $appointmentPayload = $appointment->toArray();
        $appointmentPayload['doctorName'] = $appointment->doctor?->user?->name ?? $appointment->doctor?->name;
        $appointmentPayload['patientName'] = $appointment->patient?->name ?? $appointment->patient?->user?->name;
        $appointmentPayload['appointmentDate'] = $appointment->appointment_date?->toDateString();
        $appointmentPayload['appointmentTime'] = $appointment->start_time;

        return response()->json([
            'success' => true,
            'appointment' => $appointmentPayload,
            'payment' => $appointment->payment,
        ]);
    }

    public function refundStatus(Request $request, string $appointmentId): JsonResponse
    {
        $appointment = $this->appointmentForUser($request, $appointmentId);
        $payment = $appointment->payment;
        if ($payment) $payment = $this->refunds->check($payment);
        return response()->json(['success' => true, 'refund' => $payment ? [
            'amount' => (float) $payment->refund_amount,
            'status' => $payment->refund_status,
            'reference' => $payment->refund_ref_id,
            'requestedAt' => $payment->refund_requested_at?->toISOString(),
            'processedAt' => $payment->refund_processed_at?->toISOString(),
        ] : null]);
    }

    public function exampleHostedCheckout(Request $request, string $appointmentId): JsonResponse
    {
        return $this->paymentDetails($request, $appointmentId);
    }

    private function appointmentForUser(Request $request, string $appointmentNumber): Appointment
    {
        $query = Appointment::with(['patient', 'patient.user', 'doctor', 'payment'])
            ->where('appointment_no', $appointmentNumber);

        if (! $request->user()->hasAnyRole(['admin', 'super-admin'])) {
            $query->whereHas('patient', fn ($patientQuery) => $patientQuery
                ->where('user_id', $request->user()->id));
        }

        return $query->firstOrFail();
    }

    private function preparePayment(Appointment $appointment, float $amount): Payment
    {
        $attributes = [
            'transaction_no' => $this->generateTransactionNo(),
            'appointment_id' => $appointment->id,
            'patient_id' => $appointment->patient_id,
            'doctor_id' => $appointment->doctor_id,
            'payer_user_id' => $appointment->patient?->user_id,
            'provider' => 'sslcommerz',
            'gateway' => 'sslcommerz',
            'method' => 'hosted',
            'currency' => 'BDT',
            'amount' => $amount,
            'total_amount' => $amount,
            'paid_amount' => 0,
            'due_amount' => $amount,
            'paid_at' => null,
            'gateway_transaction_id' => null,
            'gateway_response' => null,
            'status' => 'pending',
        ];

        if ($appointment->payment) {
            $appointment->payment->update($attributes);

            return $appointment->payment->fresh();
        }

        return Payment::create($attributes);
    }

    /**
     * @return array<string, mixed>
     */
    private function gatewayPayload(Appointment $appointment, Payment $payment): array
    {
        $patient = $appointment->patient;
        $callbackBase = rtrim((string) config('app.url'), '/');
        $callbackPaths = config('sslcommerz.callback_paths');

        return [
            'total_amount' => $payment->total_amount,
            'currency' => $payment->currency,
            'tran_id' => $payment->transaction_no,
            'success_url' => $callbackBase.$callbackPaths['success'],
            'fail_url' => $callbackBase.$callbackPaths['fail'],
            'cancel_url' => $callbackBase.$callbackPaths['cancel'],
            'ipn_url' => $callbackBase.$callbackPaths['ipn'],
            'cus_name' => $patient?->name ?: 'Patient',
            'cus_email' => $patient?->user?->email ?: ($patient?->email ?: 'patient@example.com'),
            'cus_add1' => $patient?->address_line1 ?: 'Dhaka',
            'cus_add2' => $patient?->address_line2 ?: '',
            'cus_city' => $patient?->city ?: 'Dhaka',
            'cus_state' => $patient?->state ?: 'Dhaka',
            'cus_postcode' => $patient?->postal_code ?: '1000',
            'cus_country' => $patient?->country ?: 'Bangladesh',
            'cus_phone' => $patient?->phone ?: '01700000000',
            'shipping_method' => 'NO',
            'num_of_item' => 1,
            'product_name' => 'Doctor consultation',
            'product_category' => 'Healthcare',
            'product_profile' => 'non-physical-goods',
            'value_a' => $appointment->appointment_no,
            'value_b' => (string) $payment->id,
        ];
    }

    /**
     * @return array{status: string, message: string, payment?: Payment}
     */
    private function processSuccessfulNotification(Request $request): array
    {
        $transactionNumber = $request->string('tran_id')->toString();
        $validationId = $request->string('val_id')->toString();
        $payment = Payment::with('appointment')->where('transaction_no', $transactionNumber)->first();

        if (! $payment || ! $validationId) {
            return [
                'status' => 'fail',
                'message' => $payment ? 'Validation ID is missing.' : 'Payment record not found.',
            ];
        }

        if (strtolower($payment->status) === 'paid') {
            return [
                'status' => 'success',
                'message' => 'Payment was already completed.',
                'payment' => $payment,
            ];
        }

        $validation = $this->payments->validateGatewayTransaction(
            $validationId,
            $payment->transaction_no,
            (float) $payment->total_amount,
            $payment->currency
        );
        $gatewayData = array_merge(
            $request->all(),
            ['validation' => $validation['data'] ?? []]
        );

        if (! $validation['valid']) {
            $payment->update(['gateway_response' => $gatewayData]);

            return [
                'status' => 'fail',
                'message' => $validation['message'] ?? 'Payment validation failed.',
                'payment' => $payment,
            ];
        }

        if ($validation['risky'] ?? false) {
            $payment->update([
                'status' => 'reviewing',
                'gateway_response' => $gatewayData,
            ]);

            return [
                'status' => 'pending',
                'message' => 'Payment is awaiting manual risk review.',
                'payment' => $payment,
            ];
        }

        $this->markPaymentAsPaid($payment, $validation['data'] ?? $request->all());

        return [
            'status' => 'success',
            'message' => 'Payment completed successfully.',
            'payment' => $payment->fresh(),
        ];
    }

    private function recordUnsuccessfulPayment(Request $request, string $status): ?Payment
    {
        $payment = Payment::where('transaction_no', $request->string('tran_id')->toString())->first();

        if ($payment && strtolower($payment->status) !== 'paid') {
            $payment->update([
                'status' => $status,
                'gateway_response' => $request->all(),
            ]);
        }

        return $payment;
    }

    private function redirectToFrontend(
        string $status,
        ?Payment $payment,
        string $transactionNumber
    ): RedirectResponse {
        $query = http_build_query(array_filter([
            'status' => $status,
            'tran_id' => $transactionNumber,
            'appointmentId' => $payment?->appointment?->appointment_no,
        ]));

        $url = rtrim((string) config('app.frontend_url'), '/')
            .'/payment/return?'.$query;

        return redirect()->away($url);
    }

    private function markPaymentAsPaid(Payment $payment, array $gatewayResponse): void
    {
        DB::transaction(function () use ($payment, $gatewayResponse): void {
            $lockedPayment = Payment::with('appointment')->lockForUpdate()->findOrFail($payment->id);

            if (strtolower($lockedPayment->status) === 'paid') {
                return;
            }

            $lockedPayment->update([
                'status' => 'paid',
                'paid_amount' => $lockedPayment->total_amount,
                'due_amount' => 0,
                'paid_at' => now(),
                'gateway_transaction_id' => $gatewayResponse['bank_tran_id'] ?? null,
                'gateway_response' => $gatewayResponse,
            ]);

            $lockedPayment->appointment?->update(['payment_status' => 'paid']);
        });

        $this->earnings->createEarningFromPayment($payment->fresh());
    }

    private function generateTransactionNo(): string
    {
        return 'TXN-'.strtoupper(Str::random(20));
    }
}
