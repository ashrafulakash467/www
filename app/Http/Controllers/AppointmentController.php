<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

/** Render the patient-facing appointment booking and rescheduling pages. */
class AppointmentController extends Controller
{
    /** Render the public booking form; submission remains API-protected. */
    public function create(): Response
    {
        return Inertia::render('Appointments/Book');
    }

    /** Render the authenticated appointment-rescheduling form. */
    public function edit(): Response
    {
        return Inertia::render('Appointments/Reschedule');
    }
}
