<?php

namespace App\Services;

class PaymentService
{
    public function __construct(private readonly SSLCommerzService $sslCommerz) {}

    public function gatewayIsConfigured(): bool
    {
        return $this->sslCommerz->isConfigured();
    }

    /** @param array<string, mixed> $payload */
    public function initializeGateway(array $payload): array
    {
        return $this->sslCommerz->initialize($payload);
    }

    public function validateGatewayTransaction(
        string $validationId,
        ?string $transactionId = null,
        ?float $amount = null,
        ?string $currency = null,
    ): array {
        return $this->sslCommerz->validateTransaction(
            $validationId,
            $transactionId,
            $amount,
            $currency,
        );
    }
}
