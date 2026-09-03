<?php

use App\Models\Doctor;
use App\Services\DoctorSlotSyncService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('doctor:sync-slots {doctorId?}', function (?string $doctorId = null) {
    $query = Doctor::query()->with('schedules');

    if ($doctorId) {
        $doctors = $query->whereKey($doctorId)->get();
    } else {
        $doctors = $query->get();
    }

    $service = app(DoctorSlotSyncService::class);

    foreach ($doctors as $doctor) {
        $service->sync($doctor);
        $this->info("Synced slots for doctor #{$doctor->id}");
    }

    $this->info('Doctor slot sync completed.');
})->purpose('Generate and sync appointment slots for doctors');
