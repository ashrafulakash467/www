<?php

namespace App\Http\Controllers;

use App\Models\Doctor;
use App\Models\Setting;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Str;

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

    public function policy(string $slug): Response
    {
        $settings = Setting::publicMap();
        $slugKey = collect($settings)->search(
            fn (mixed $value, string $key): bool => str_starts_with($key, 'policy:')
                && str_ends_with($key, '_slug')
                && $value === $slug,
        );

        abort_if($slugKey === false, 404);

        $name = Str::beforeLast(Str::after($slugKey, 'policy:'), '_slug');
        abort_unless((bool) ($settings["policy:{$name}_enabled"] ?? false), 404);

        return Inertia::render('Policies/Show', [
            'title' => $settings["policy:{$name}_title"] ?? Str::headline($name),
            'content' => $settings["policy:{$name}_content"] ?? '',
        ]);
    }
}
