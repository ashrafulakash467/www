<?php

namespace App\Http\Controllers;

use App\Models\Doctor;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    public function index(): Response
    {
        $doctors = Doctor::query()
            ->with('user')
            ->whereHas('user', fn ($query) => $query->where('status', '!=', 'deleted'))
            ->orderBy(User::select('name')->whereColumn('users.id', 'doctors.user_id'))
            ->limit(8)
            ->get()
            ->map(fn (Doctor $doctor): array => [
                'id' => (string) $doctor->id,
                'name' => $doctor->user?->name ?? 'Unknown Doctor',
                'specialty' => $doctor->specialty ?? 'General Medicine',
                'consultationFee' => $doctor->consultation_fee,
                'location' => $doctor->city ?: $doctor->state ?: $doctor->country ?: 'Unavailable',
                'gender' => $doctor->gender ?? 'Unspecified',
                'isAvailable' => $doctor->status === 'active' && $doctor->verification_status === 'approved',
                'imagePath' => $doctor->image_path,
                'chamberAddress' => $doctor->chamber_address,
            ])
            ->values();

        return Inertia::render('Home/Index', [
            'doctors' => $doctors,
        ]);
    }
}
