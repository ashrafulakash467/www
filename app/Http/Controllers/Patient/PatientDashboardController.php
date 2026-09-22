<?php

namespace App\Http\Controllers\Patient;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** Render patient dashboard views while keeping their shared profile payload consistent. */
/** Frontend mental model: methods choose a React page and pass its initial server-side props. */
class PatientDashboardController extends Controller
{
    /** Render the dashboard or redirect legacy tab parameters to canonical URLs. */
    public function index(Request $request): Response|RedirectResponse
    {
        // Read the ?tab= query parameter and convert old URLs to dedicated canonical routes.
        return match ($request->query('tab')) {
            'appointments' => redirect()->route('patient.appointments'),
            'records' => redirect()->route('patient.medical-records'),
            // activeTab behaves like an initial prop controlling which dashboard panel is visible.
            default => $this->dashboard($request, 'dashboard'),
        };
    }

    /** Render the dashboard with the appointments section selected. */
    public function appointments(Request $request): Response
    {
        return $this->dashboard($request, 'appointments');
    }

    /** Render the dashboard with the medical-records section selected. */
    public function medicalRecords(Request $request): Response
    {
        return $this->dashboard($request, 'records');
    }

    /** Render patient settings with the normalized authenticated profile. */
    public function settings(Request $request): Response
    {
        // Inertia renders the React page and serializes this array as component props.
        return Inertia::render('Patient/Settings', [
            'patient' => $this->patient($request),
        ]);
    }

    /** Build the shared patient identity payload for Inertia pages. */
    private function patient(Request $request): array
    {
        // Authentication middleware guarantees user(); loadMissing avoids duplicate relationship queries.
        $user = $request->user()->loadMissing([
            'roles',
            'permissions',
            'patient',
        ]);

        // resolve() turns the resource into the plain array sent to the React application.
        return (new UserResource($user))->resolve($request);
    }

    /** Render the common dashboard component with a requested active section. */
    private function dashboard(Request $request, string $activeTab): Response
    {
        // Several URLs reuse one React component and select its section through activeTab.
        return Inertia::render('Patient/Dashboard', [
            'patient' => $this->patient($request),
            'activeTab' => $activeTab,
        ]);
    }
}
