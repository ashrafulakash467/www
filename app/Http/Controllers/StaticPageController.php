<?php

namespace App\Http\Controllers;

use App\Models\Doctor;
use Inertia\Inertia;
use Inertia\Response;

class StaticPageController extends Controller
{
    public function about(): Response
    {
        return Inertia::render('About/Index');
    }

    public function contact(): Response
    {
        return Inertia::render('Contact/Index');
    }

    public function departments(): Response
    {
        $departments = Doctor::query()
            ->selectRaw('specialty as name, COUNT(*) as doctors_count')
            ->where('status', 'active')
            ->where('verification_status', 'approved')
            ->whereNotNull('specialty')
            ->groupBy('specialty')
            ->orderBy('specialty')
            ->get();

        return Inertia::render('Departments/Index', [
            'departments' => $departments,
        ]);
    }

    public function services(): Response
    {
        return Inertia::render('Services/Index');
    }
}
