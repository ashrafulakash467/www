<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SSLCommerzService
{
    private string $storeId;

    private string $storePassword;

    private bool $sandbox;

    private string $baseUrl;

    public function __construct()
    {
        $this->storeId = (string) config('sslcommerz.store_id', '');
        $this->storePassword = (string) config('sslcommerz.store_password', '');
        $this->sandbox = (bool) config('sslcommerz.sandbox', true);
        $this->baseUrl = $this->sandbox
            ? 'https://sandbox.sslcommerz.com'
            : 'https://securepay.sslcommerz.com';
    }

    /**
     * Resolve the CA bundle used to verify the SSLCOMMERZ TLS certificate.
     *
     * PHP's cURL on Windows often ships without a usable CA bundle, which
     * causes "cURL error 60: unable to get local issuer certificate". We point
     * the HTTP client at a bundled cacert.pem so TLS verification stays on.
     */
    private function caBundle(): bool|string
    {
        $paths = [
            base_path('storage/certs/cacert.pem'),
            storage_path('certs/cacert.pem'),
        ];

        foreach ($paths as $path) {
            if (is_file($path)) {
                return $path;
            }
        }

        return true;
    }

    /**
     * Initialize an SSLCOMMERZ payment session.
     *
     * @param  array<string, mixed>  $data
     * @return array{success: bool, gateway_url?: string, message?: string, data?: array<string, mixed>}
     */
    public function initialize(array $data): array
    {
        if (! $this->isConfigured()) {
            return [
                'success' => false,
                'message' => 'SSLCOMMERZ credentials are not configured.',
            ];
        }

        $payload = array_merge([
            'store_id' => $this->storeId,
            'store_passwd' => $this->storePassword,
            'total_amount' => $data['total_amount'] ?? 0,
            'currency' => $data['currency'] ?? 'BDT',
            'tran_id' => $data['tran_id'] ?? '',
            'success_url' => $data['success_url'] ?? '',
            'fail_url' => $data['fail_url'] ?? '',
            'cancel_url' => $data['cancel_url'] ?? '',
            'ipn_url' => $data['ipn_url'] ?? '',
            'cus_name' => $data['cus_name'] ?? '',
            'cus_email' => $data['cus_email'] ?? '',
            'cus_add1' => $data['cus_add1'] ?? '',
            'cus_city' => $data['cus_city'] ?? '',
            'cus_state' => $data['cus_state'] ?? '',
            'cus_postcode' => $data['cus_postcode'] ?? '',
            'cus_country' => $data['cus_country'] ?? 'Bangladesh',
            'cus_phone' => $data['cus_phone'] ?? '',
            'shipping_method' => $data['shipping_method'] ?? 'NO',
            'num_of_item' => $data['num_of_item'] ?? 1,
            'product_name' => $data['product_name'] ?? 'Appointment',
            'product_category' => $data['product_category'] ?? 'Healthcare',
            'product_profile' => $data['product_profile'] ?? 'general',
        ], $data);

        try {
            $response = Http::asForm()
                ->timeout(30)
                ->withOptions(['verify' => $this->caBundle()])
                ->post($this->baseUrl.config('sslcommerz.session_path'), $payload);

            if (! $response->successful()) {
                Log::error('SSLCOMMERZ init failed', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                return [
                    'success' => false,
                    'message' => 'SSLCOMMERZ gateway could not be reached.',
                ];
            }

            $result = $response->json();

            if (($result['status'] ?? '') !== 'SUCCESS' || empty($result['GatewayPageURL'])) {
                Log::warning('SSLCOMMERZ init returned failure', $result);

                return [
                    'success' => false,
                    'message' => $result['failedreason'] ?? 'SSLCOMMERZ could not create a payment session.',
                    'data' => $result,
                ];
            }

            return [
                'success' => true,
                'gateway_url' => (string) $result['GatewayPageURL'],
                'data' => $result,
            ];
        } catch (ConnectionException $exception) {
            Log::error('SSLCOMMERZ connection error', [
                'message' => $exception->getMessage(),
            ]);

            return [
                'success' => false,
                'message' => 'Could not connect to the payment gateway. Please try again.',
            ];
        }
    }

    /**
     * Validate a transaction with SSLCOMMERZ.
     *
     * @param  string  $validationId  Validation ID supplied by SSLCOMMERZ.
     * @param  string  $expectedTransactionId  Merchant transaction ID created during initiation.
     * @param  float  $amount  Expected amount in BDT (decimal, e.g. 1000.00).
     * @return array{valid: bool, risky?: bool, message?: string, data?: array<string, mixed>}
     */
    public function validateTransaction(
        string $validationId,
        string $expectedTransactionId,
        float $amount,
        string $currency = 'BDT'
    ): array {
        if (! $this->isConfigured()) {
            return [
                'valid' => false,
                'message' => 'SSLCOMMERZ credentials are not configured.',
            ];
        }

        try {
            $response = Http::acceptJson()
                ->timeout(30)
                ->withOptions(['verify' => $this->caBundle()])
                ->get($this->baseUrl.config('sslcommerz.validation_path'), [
                    'val_id' => $validationId,
                    'store_id' => $this->storeId,
                    'store_passwd' => $this->storePassword,
                    'format' => 'json',
                ]);

            if (! $response->successful()) {
                Log::error('SSLCOMMERZ validation failed', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                return [
                    'valid' => false,
                    'message' => 'Could not validate the transaction with the gateway.',
                ];
            }

            $result = $response->json();

            if (! is_array($result) || ! in_array($result['status'] ?? '', ['VALID', 'VALIDATED'], true)) {
                Log::warning('SSLCOMMERZ validation returned invalid', [
                    'response' => $result,
                ]);

                return [
                    'valid' => false,
                    'message' => $result['error'] ?? 'Transaction could not be validated.',
                    'data' => $result,
                ];
            }

            if (! hash_equals($expectedTransactionId, (string) ($result['tran_id'] ?? ''))) {
                Log::warning('SSLCOMMERZ transaction ID mismatch', [
                    'expected' => $expectedTransactionId,
                    'received' => $result['tran_id'] ?? null,
                ]);

                return [
                    'valid' => false,
                    'message' => 'Transaction ID does not match the initiated payment.',
                    'data' => $result,
                ];
            }

            // Verify the amount matches what we expect (never trust the callback alone).
            $validatedAmount = (float) ($result['amount'] ?? 0);
            $validatedCurrency = (string) ($result['currency'] ?? 'BDT');

            if (abs($validatedAmount - $amount) > 0.01) {
                Log::warning('SSLCOMMERZ amount mismatch', [
                    'expected' => $amount,
                    'received' => $validatedAmount,
                ]);

                return [
                    'valid' => false,
                    'message' => 'Transaction amount does not match the expected amount.',
                    'data' => $result,
                ];
            }

            if (strtoupper($validatedCurrency) !== strtoupper($currency)) {
                Log::warning('SSLCOMMERZ currency mismatch', [
                    'expected' => $currency,
                    'received' => $validatedCurrency,
                ]);

                return [
                    'valid' => false,
                    'message' => 'Transaction currency does not match the expected currency.',
                    'data' => $result,
                ];
            }

            return [
                'valid' => true,
                'risky' => (int) ($result['risk_level'] ?? 0) === 1,
                'data' => $result,
            ];
        } catch (ConnectionException $exception) {
            Log::error('SSLCOMMERZ validation connection error', [
                'message' => $exception->getMessage(),
            ]);

            return [
                'valid' => false,
                'message' => 'Could not connect to the payment gateway for validation.',
            ];
        }
    }

    public function isConfigured(): bool
    {
        return $this->storeId !== '' && $this->storePassword !== '';
    }
}
