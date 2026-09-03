<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class PaymentController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Payments/Index');
    }

    public function hosted(): Response
    {
        return Inertia::render('Payments/HostedCheckout');
    }

    public function easy(): Response
    {
        return Inertia::render('Payments/EasyCheckout');
    }

    public function result(): Response
    {
        return Inertia::render('Payments/Return');
    }
}
