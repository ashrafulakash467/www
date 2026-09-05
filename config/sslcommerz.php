<?php

return [
    'store_id' => env('SSLCZ_STORE_ID'),
    'store_password' => env('SSLCZ_STORE_PASSWORD'),
    'sandbox' => filter_var(env('SSLCZ_TESTMODE', true), FILTER_VALIDATE_BOOL),

    'session_path' => '/gwprocess/v4/api.php',
    'validation_path' => '/validator/api/validationserverAPI.php',
    'refund_path' => '/validator/api/merchantTransIDvalidationAPI.php',

    'callback_paths' => [
        'success' => '/api/v1/payments/sslcommerz/success',
        'fail' => '/api/v1/payments/sslcommerz/fail',
        'cancel' => '/api/v1/payments/sslcommerz/cancel',
        'ipn' => '/api/v1/payments/sslcommerz/ipn',
    ],
];
