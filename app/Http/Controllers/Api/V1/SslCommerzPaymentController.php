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

/** Manage SSLCommerz checkout creation, callbacks, status updates, and return redirects. */
/** Frontend mental model: this bridges local payment state with an external checkout provider. */
class SslCommerzPaymentController extends Controller
{
    // Dependency injection supplies focused services instead of putting every concern here.
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
        // Validate ownership before preparing a gateway transaction.
        // The frontend submits an appointment number; the server revalidates ownership and state.
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
        $returnBaseUrl = $this->returnBaseUrlForRequest($request);
        // PaymentService performs the outbound HTTP request to SSLCommerz.
        $result = $this->payments->initializeGateway($this->gatewayPayload($appointment, $payment));

        if (! $result['success']) {
            $payment->update([
                'status' => 'failed',
                'gateway_response' => array_merge(
                    $result['data'] ?? ['message' => $result['message']],
                    ['_return_base_url' => $returnBaseUrl],
                ),
            ]);

            return response()->json([
                'success' => false,
                'message' => $result['message'] ?? 'Could not initialize SSLCommerz.',
            ], 502);
        }

        $payment->update([
            'status' => 'pending',
            'gateway_response' => array_merge(
                $result['data'] ?? [],
                ['_return_base_url' => $returnBaseUrl],
            ),
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

    /** Process a successful browser callback and return to the frontend. */
    public function success(Request $request): RedirectResponse
    {
        // Browser callbacks and server IPNs share one validation path.
        $result = $this->processSuccessfulNotification($request);

        return $this->redirectToFrontend(
            $result['status'],
            $result['payment'] ?? null,
            $request->string('tran_id')->toString()
        );
    }

    /** Record a failed browser callback before redirecting to the result page. */
    public function fail(Request $request): RedirectResponse
    {
        $payment = $this->recordUnsuccessfulPayment($request, 'failed');

        return $this->redirectToFrontend('fail', $payment, $request->string('tran_id')->toString());
    }

    /** Record a cancelled checkout before redirecting to the result page. */
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
        // IPN is server-to-server; validation occurs before payment state changes.
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

    /** Return checkout details for an appointment owned by the requester. */
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

    /** Refresh and return the current refund status for an owned appointment. */
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

    /** Provide a compatibility response for the example hosted-checkout client. */
    public function exampleHostedCheckout(Request $request, string $appointmentId): JsonResponse
    {
        return $this->paymentDetails($request, $appointmentId);
    }

    /** Resolve an appointment and enforce role-based ownership. */
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

    /** Create or update the pending local payment before contacting the gateway. */
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

        // Gateway callbacks may retry, so an already-paid record is a successful no-op.
        if (strtolower($payment->status) === 'paid') {
            return [
                'status' => 'success',
                'message' => 'Payment was already completed.',
                'payment' => $payment,
            ];
        }

        // Never trust callback fields alone; validate the transaction with the gateway server.
        $validation = $this->payments->validateGatewayTransaction(
            $validationId,
            $payment->transaction_no,
            (float) $payment->total_amount,
            $payment->currency
        );
        $returnBaseUrl = $this->returnBaseUrlForPayment($payment);
        $gatewayData = array_merge(
            $request->all(),
            [
                'validation' => $validation['data'] ?? [],
                '_return_base_url' => $returnBaseUrl,
            ]
        );

        if (! $validation['valid']) {
            $payment->update(['gateway_response' => $gatewayData]);

            return [
                'status' => 'fail',
                'message' => $validation['message'] ?? 'Payment validation failed.',
                'payment' => $payment,
            ];
        }

        // Risky transactions remain pending for review instead of being marked paid.
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

    /** Persist failure or cancellation details unless payment already completed. */
    private function recordUnsuccessfulPayment(Request $request, string $status): ?Payment
    {
        $payment = Payment::where('transaction_no', $request->string('tran_id')->toString())->first();

        if ($payment && strtolower($payment->status) !== 'paid') {
            $payment->update([
                'status' => $status,
                'gateway_response' => array_merge(
                    $request->all(),
                    ['_return_base_url' => $this->returnBaseUrlForPayment($payment)],
                ),
            ]);
        }

        return $payment;
    }

    /** Build a trusted frontend return URL containing payment result parameters. */
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

        $url = $this->returnBaseUrlForPayment($payment)
            .'/payment/return?'.$query;

        return redirect()->away($url);
    }

    private function returnBaseUrlForRequest(Request $request): string
    {
        $url = rtrim($request->root(), '/');

        return $this->sanitizeReturnBaseUrl($url)
            ?? rtrim((string) config('app.frontend_url'), '/');
    }

    private function returnBaseUrlForPayment(?Payment $payment): string
    {
        $storedUrl = data_get($payment?->gateway_response, '_return_base_url');

        return $this->sanitizeReturnBaseUrl(is_string($storedUrl) ? $storedUrl : null)
            ?? rtrim((string) config('app.frontend_url'), '/');
    }

    /** Accept redirect origins only when their host is configured as trusted. */
    private function sanitizeReturnBaseUrl(?string $url): ?string
    {
        if (! $url || ! filter_var($url, FILTER_VALIDATE_URL)) {
            return null;
        }

        $parts = parse_url($url);
        // Only browser-safe HTTP(S) origins can receive post-payment redirects.
        if (! in_array($parts['scheme'] ?? null, ['http', 'https'], true) || empty($parts['host'])) {
            return null;
        }

        $host = strtolower($parts['host']);
        $hostWithPort = $host.(isset($parts['port']) ? ':'.$parts['port'] : '');
        $allowedHosts = collect([
            config('app.url'),
            config('app.frontend_url'),
            ...config('sanctum.stateful', []),
        ])->filter()->map(function (string $candidate): string {
            $candidate = strtolower(trim($candidate));

            if (str_contains($candidate, '://')) {
                $candidateParts = parse_url($candidate);

                return strtolower(($candidateParts['host'] ?? '')
                    .(isset($candidateParts['port']) ? ':'.$candidateParts['port'] : ''));
            }

            return trim($candidate, '/');
        });

        // The allow-list prevents the return flow from becoming an open-redirect vulnerability.
        if (! $allowedHosts->contains($hostWithPort) && ! $allowedHosts->contains($host)) {
            return null;
        }

        $authority = $parts['scheme'].'://'.$host;
        if (isset($parts['port'])) {
            $authority .= ':'.$parts['port'];
        }

        $path = isset($parts['path']) ? '/'.trim($parts['path'], '/') : '';

        return rtrim($authority.$path, '/');
    }

    /** Atomically finalize payment state and create the matching earning entry. */
    private function markPaymentAsPaid(Payment $payment, array $gatewayResponse): void
    {
        // Locking prevents duplicate callbacks from crediting one payment twice.
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
