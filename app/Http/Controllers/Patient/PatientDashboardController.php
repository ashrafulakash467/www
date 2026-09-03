<?php

namespace App\Http\Controllers\Patient;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PatientDashboardController extends Controller
{
    public function index(Request $request): Response|RedirectResponse
    {
        return match ($request->query('tab')) {
            'appointments' => redirect()->route('patient.appointments'),
            'records' => redirect()->route('patient.medical-records'),
            default => $this->dashboard($request, 'dashboard'),
        };
    }

    public function appointments(Request $request): Response
    {
        return $this->dashboard($request, 'appointments');
    }

    public function medicalRecords(Request $request): Response
    {
        return $this->dashboard($request, 'records');
    }

    public function settings(Request $request): Response
    {
        return Inertia::render('Patient/Settings', [
            'patient' => $this->patient($request),
        ]);
    }

    private function patient(Request $request): array
    {
        $user = $request->user()->loadMissing([
            'roles',
            'permissions',
            'patient',
        ]);

        return (new UserResource($user))->resolve($request);
    }

    private function dashboard(Request $request, string $activeTab): Response
    {
        return Inertia::render('Patient/Dashboard', [
            'patient' => $this->patient($request),
            'activeTab' => $activeTab,
        ]);
    }
}
