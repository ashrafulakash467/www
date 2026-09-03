<?php

namespace App\Http\Controllers;

use App\Models\Doctor;
use Inertia\Inertia;
use Inertia\Response;

class DoctorController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Doctors/Index');
    }

    public function show(Doctor $doctor): Response
    {
        $doctor->loadMissing('user');

        return Inertia::render('Doctors/Show', [
            'doctor' => [
                'id' => (string) $doctor->id,
                'name' => $doctor->user?->name ?? 'Unknown Doctor',
                'specialty' => $doctor->specialty ?? 'General Medicine',
                'bio' => $doctor->bio,
                'gender' => $doctor->gender,
                'consultationFee' => $doctor->consultation_fee,
                'chamberAddress' => $doctor->chamber_address,
                'location' => $doctor->city ?: $doctor->state ?: $doctor->country ?: 'Unavailable',
                'imagePath' => $doctor->image_path,
                'verificationStatus' => $doctor->verification_status,
                'isAvailable' => $doctor->status === 'active' && $doctor->verification_status === 'approved',
            ],
        ]);
    }
}
