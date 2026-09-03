<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class AppointmentController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('Appointments/Book');
    }

    public function edit(): Response
    {
        return Inertia::render('Appointments/Reschedule');
    }
}
