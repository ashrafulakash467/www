<?php

namespace App\Http\Controllers\Doctor;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

/** Render the authenticated doctor's dashboard shell. */
/** Frontend mental model: this chooses the React page component for the current Laravel route. */
class DoctorDashboardController extends Controller
{
    /** Render the main doctor Inertia dashboard. */
    public function index(): Response
    {
        // Inertia::render is similar to rendering <DoctorDashboard />, but Laravel controls the route.
        return Inertia::render('Doctor/Dashboard');
    }
}
