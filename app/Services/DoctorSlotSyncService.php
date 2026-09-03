<?php

namespace App\Services;

use App\Models\AppointmentSlot;
use App\Models\Doctor;
use App\Models\DoctorSchedule;
use Carbon\Carbon;

class DoctorSlotSyncService
{
    public function sync(Doctor $doctor): void
    {
        $doctor->loadMissing('schedules');

        $availableDates = $this->normalizeList($doctor->available_dates);
        $availableTimeSlots = $this->normalizeList($doctor->available_time_slots);

        $schedule = $this->resolveSchedule($doctor, $availableDates, $availableTimeSlots);

        if (! $schedule || empty($availableDates) || empty($availableTimeSlots)) {
            return;
        }

        $desiredKeys = [];
        $slotDurationMinutes = max((int) ($schedule->slot_duration_minutes ?? 15), 1);
        $capacity = 1;

        foreach ($availableDates as $slotDate) {
            foreach ($availableTimeSlots as $slotLabel) {
                [$startTime, $endTime] = $this->normalizeSlotRange($slotLabel, $slotDurationMinutes);
                $desiredKeys[] = $this->slotKey($slotDate, $startTime);

                $slot = AppointmentSlot::firstOrNew(
                    [
                        'doctor_schedule_id' => $schedule->id,
                        'slot_date' => $slotDate,
                        'start_time' => $startTime,
                    ]
                );

                $isBooked = $slot->exists && ((int) $slot->booked_count > 0 || $slot->appointments()->exists());

                $slot->fill([
                    'doctor_id' => $doctor->id,
                    'end_time' => $endTime,
                    'capacity' => $slot->exists ? $slot->capacity : $capacity,
                    'generated_at' => now(),
                ]);

                if ($isBooked) {
                    $slot->forceFill([
                        'is_bookable' => false,
                        'status' => 'booked',
                    ]);
                } else {
                    $slot->forceFill([
                        'booked_count' => $slot->exists ? $slot->booked_count : 0,
                        'is_bookable' => true,
                        'status' => 'available',
                    ]);
                }

                $slot->save();
            }
        }

        $existingSlots = AppointmentSlot::query()
            ->where('doctor_schedule_id', $schedule->id)
            ->get();

        foreach ($existingSlots as $slot) {
            if (in_array($this->slotKey($slot->slot_date?->toDateString() ?? (string) $slot->slot_date, $slot->start_time), $desiredKeys, true)) {
                continue;
            }

            if ((int) $slot->booked_count > 0 || $slot->appointments()->exists()) {
                $slot->forceFill([
                    'is_bookable' => false,
                    'status' => 'booked',
                ])->save();

                continue;
            }

            $slot->delete();
        }
    }

    private function resolveSchedule(Doctor $doctor, array $availableDates, array $availableTimeSlots): ?DoctorSchedule
    {
        $schedule = $doctor->schedules()
            ->orderByDesc('is_active')
            ->orderBy('id')
            ->first();

        if ($schedule) {
            return $schedule;
        }

        $startTime = null;
        $endTime = null;

        if (! empty($availableTimeSlots)) {
            [$startTime, $endTime] = $this->normalizeSlotRange((string) $availableTimeSlots[0], 15);
        }

        $workingDays = collect($availableDates)
            ->map(fn (string $date): string => strtolower(Carbon::parse($date)->format('l')))
            ->unique()
            ->values()
            ->all();

        if (empty($workingDays)) {
            $workingDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        }

        return DoctorSchedule::create([
            'doctor_id' => $doctor->id,
            'consultation_type' => 'in_person',
            'timezone' => 'Asia/Dhaka',
            'working_days' => $workingDays,
            'start_time' => $startTime ?? '09:00:00',
            'end_time' => $endTime ?? '17:00:00',
            'slot_duration_minutes' => 15,
            'break_start_time' => null,
            'break_end_time' => null,
            'daily_capacity' => 1,
            'is_active' => true,
            'status' => 'active',
            'notes' => 'Auto-generated schedule',
        ]);
    }

    private function normalizeList(mixed $value): array
    {
        if (blank($value)) {
            return [];
        }

        if (is_string($value)) {
            $decoded = json_decode($value, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $value = $decoded;
            } else {
                $value = array_filter(array_map('trim', preg_split('/[\n,]+/', $value) ?: []));
            }
        }

        if (! is_array($value)) {
            return [];
        }

        return collect($value)
            ->filter(fn ($item) => is_scalar($item) || $item === null)
            ->map(fn ($item) => trim((string) $item))
            ->filter()
            ->values()
            ->all();
    }

    private function normalizeSlotRange(string $slotLabel, int $defaultDurationMinutes): array
    {
        $slotLabel = trim($slotLabel);

        if (str_contains($slotLabel, '-')) {
            [$start, $end] = array_map('trim', explode('-', $slotLabel, 2));

            return [
                $this->normalizeTime($start),
                $this->normalizeTime($end),
            ];
        }

        $startTime = $this->normalizeTime($slotLabel);
        $endTime = Carbon::createFromFormat('H:i:s', $startTime)
            ->addMinutes($defaultDurationMinutes)
            ->format('H:i:s');

        return [$startTime, $endTime];
    }

    private function normalizeTime(string $value): string
    {
        $value = trim($value);
        $formats = ['g:ia', 'g:i a', 'g:iA', 'g:i A', 'h:ia', 'h:i a', 'h:iA', 'h:i A', 'H:i', 'H:i:s'];

        foreach ($formats as $format) {
            try {
                return Carbon::createFromFormat($format, $value)->format('H:i:s');
            } catch (\Throwable) {
                continue;
            }
        }

        return Carbon::parse($value)->format('H:i:s');
    }

    private function slotKey(string $date, string $startTime): string
    {
        return $date.'|'.$startTime;
    }
}
