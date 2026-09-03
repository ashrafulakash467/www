<?php

namespace Tests\Feature;

use App\Services\SSLCommerzService;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SSLCommerzServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config()->set([
            'sslcommerz.store_id' => 'sandbox-store',
            'sslcommerz.store_password' => 'sandbox-password',
            'sslcommerz.sandbox' => true,
            'sslcommerz.session_path' => '/gwprocess/v4/api.php',
            'sslcommerz.validation_path' => '/validator/api/validationserverAPI.php',
        ]);
    }

    public function test_it_initializes_a_hosted_checkout_session(): void
    {
        Http::fake([
            'sandbox.sslcommerz.com/gwprocess/v4/api.php' => Http::response([
                'status' => 'SUCCESS',
                'GatewayPageURL' => 'https://sandbox.sslcommerz.com/checkout/session-id',
                'sessionkey' => 'session-id',
            ]),
        ]);

        $result = (new SSLCommerzService)->initialize([
            'total_amount' => 500,
            'currency' => 'BDT',
            'tran_id' => 'TXN-123',
            'success_url' => 'https://api.example.com/payments/sslcommerz/success',
            'fail_url' => 'https://api.example.com/payments/sslcommerz/fail',
            'cancel_url' => 'https://api.example.com/payments/sslcommerz/cancel',
            'ipn_url' => 'https://api.example.com/payments/sslcommerz/ipn',
            'cus_name' => 'Test Patient',
            'cus_email' => 'patient@example.com',
            'cus_add1' => 'Dhaka',
            'cus_city' => 'Dhaka',
            'cus_postcode' => '1000',
            'cus_country' => 'Bangladesh',
            'cus_phone' => '01700000000',
        ]);

        $this->assertTrue($result['success']);
        $this->assertSame(
            'https://sandbox.sslcommerz.com/checkout/session-id',
            $result['gateway_url']
        );

        Http::assertSent(fn (Request $request) => $request->method() === 'POST'
            && $request['store_id'] === 'sandbox-store'
            && $request['tran_id'] === 'TXN-123'
            && $request['total_amount'] === 500
        );
    }

    public function test_it_validates_transaction_identity_amount_currency_and_risk(): void
    {
        Http::fake([
            'sandbox.sslcommerz.com/validator/api/validationserverAPI.php*' => Http::response([
                'status' => 'VALID',
                'tran_id' => 'TXN-123',
                'amount' => '500.00',
                'currency' => 'BDT',
                'risk_level' => '0',
                'bank_tran_id' => 'BANK-123',
            ]),
        ]);

        $result = (new SSLCommerzService)->validateTransaction(
            'VALIDATION-123',
            'TXN-123',
            500,
            'BDT'
        );

        $this->assertTrue($result['valid']);
        $this->assertFalse($result['risky']);

        Http::assertSent(fn (Request $request) => $request->method() === 'GET'
            && str_contains($request->url(), 'val_id=VALIDATION-123')
            && str_contains($request->url(), 'store_id=sandbox-store')
        );
    }

    public function test_it_rejects_a_mismatched_merchant_transaction_id(): void
    {
        Http::fake([
            'sandbox.sslcommerz.com/validator/api/validationserverAPI.php*' => Http::response([
                'status' => 'VALID',
                'tran_id' => 'TXN-TAMPERED',
                'amount' => '500.00',
                'currency' => 'BDT',
            ]),
        ]);

        $result = (new SSLCommerzService)->validateTransaction(
            'VALIDATION-123',
            'TXN-123',
            500,
            'BDT'
        );

        $this->assertFalse($result['valid']);
        $this->assertSame(
            'Transaction ID does not match the initiated payment.',
            $result['message']
        );
    }
}
