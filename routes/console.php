<?php

use App\Models\Doctor;
use App\Services\DoctorSlotSyncService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

// Console routes define custom `php artisan ...` terminal commands rather than web URLs.

// Laravel's example command prints a random framework quote in the terminal.
Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// The optional {doctorId?} argument syncs one doctor when provided, or everyone when omitted.
Artisan::command('doctor:sync-slots {doctorId?}', function (?string $doctorId = null) {
    // Eager-loading schedules avoids fetching them separately for every doctor in the loop.
    $query = Doctor::query()->with('schedules');

    // Build the collection based on whether the command received a specific doctor ID.
    if ($doctorId) {
        $doctors = $query->whereKey($doctorId)->get();
    } else {
        $doctors = $query->get();
    }

    // Resolve the slot synchronization service through Laravel's dependency container.
    $service = app(DoctorSlotSyncService::class);

    // Generate/update appointment slots for each selected doctor and show terminal progress.
    foreach ($doctors as $doctor) {
        $service->sync($doctor);
        $this->info("Synced slots for doctor #{$doctor->id}");
    }

    $this->info('Doctor slot sync completed.');
})->purpose('Generate and sync appointment slots for doctors');
