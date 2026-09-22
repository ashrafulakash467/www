<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

/** Render the payment, checkout, and gateway-return pages. */
class PaymentController extends Controller
{
    /** Render the appointment payment page. */
    public function index(): Response
    {
        return Inertia::render('Payments/Index');
    }

    /** Render the SSLCommerz hosted-checkout handoff page. */
    public function hosted(): Response
    {
        return Inertia::render('Payments/HostedCheckout');
    }

    /** Render the embedded easy-checkout page. */
    public function easy(): Response
    {
        return Inertia::render('Payments/EasyCheckout');
    }

    /** Render the frontend payment result page used by gateway redirects. */
    public function result(): Response
    {
        return Inertia::render('Payments/Return');
    }
}
