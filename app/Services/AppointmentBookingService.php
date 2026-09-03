<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\AppointmentSlot;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AppointmentBookingService
{
    /** @param array{doctorId:int|string, appointmentDate:string, slotTime:string} $data */
    public function book(User $user, array $data): Appointment
    {
        return DB::transaction(function () use ($user, $data): Appointment {
            $patient = Patient::query()->where('user_id', $user->id)->first();
            if (! $patient) {
                throw ValidationException::withMessages([
                    'patient' => ['Patient profile not found.'],
                ]);
            }

            $doctor = Doctor::query()->findOrFail($data['doctorId']);
            $startTime = Carbon::parse($data['slotTime'])->format('H:i:s');

            $slot = AppointmentSlot::query()
                ->with('schedule')
                ->where('doctor_id', $doctor->id)
                ->whereDate('slot_date', $data['appointmentDate'])
                ->whereTime('start_time', $startTime)
                ->lockForUpdate()
                ->first();

            if (! $slot || ! $slot->is_bookable || $slot->status !== 'available' || $slot->booked_count >= $slot->capacity) {
                throw ValidationException::withMessages([
                    'slotTime' => ['Selected time slot is already booked or unavailable.'],
                ]);
            }

            $appointment = Appointment::create([
                'appointment_no' => $this->newAppointmentNumber(),
                'patient_id' => $patient->id,
                'doctor_id' => $doctor->id,
                'appointment_slot_id' => $slot->id,
                'consultation_type' => $slot->schedule?->consultation_type ?? 'in_person',
                'appointment_date' => $data['appointmentDate'],
                'start_time' => $slot->start_time,
                'end_time' => $slot->end_time,
                'status' => 'pending',
                'payment_status' => 'unpaid',
                'channel' => 'web',
                'reason' => 'General consultation',
                'meta' => [
                    'source' => 'web',
                    'chamber_address' => $doctor->chamber_address,
                ],
            ]);

            $bookedCount = $slot->booked_count + 1;
            $slot->forceFill([
                'booked_count' => $bookedCount,
                'status' => $bookedCount >= $slot->capacity ? 'booked' : 'available',
            ])->save();

            return $appointment->load(['patient.user', 'doctor.user', 'slot.schedule']);
        }, 3);
    }

    /** @param array<string, mixed> $attributes */
    public function reschedule(
        Appointment $appointment,
        string $appointmentDate,
        string $slotTime,
        array $attributes = [],
    ): Appointment {
        return DB::transaction(function () use ($appointment, $appointmentDate, $slotTime, $attributes): Appointment {
            $lockedAppointment = Appointment::query()->lockForUpdate()->findOrFail($appointment->id);
            $startTime = Carbon::parse($slotTime)->format('H:i:s');
            $newSlot = AppointmentSlot::query()
                ->where('doctor_id', $lockedAppointment->doctor_id)
                ->whereDate('slot_date', $appointmentDate)
                ->whereTime('start_time', $startTime)
                ->lockForUpdate()
                ->first();

            if (! $newSlot || ! $newSlot->is_bookable || $newSlot->status !== 'available' || $newSlot->booked_count >= $newSlot->capacity) {
                throw ValidationException::withMessages([
                    'slotTime' => ['Selected reschedule slot is no longer available.'],
                ]);
            }

            if ($lockedAppointment->appointment_slot_id) {
                $oldSlot = AppointmentSlot::query()->lockForUpdate()->find($lockedAppointment->appointment_slot_id);
                if ($oldSlot) {
                    $oldCount = max(0, $oldSlot->booked_count - 1);
                    $oldSlot->forceFill([
                        'booked_count' => $oldCount,
                        'status' => $oldSlot->is_bookable && $oldCount < $oldSlot->capacity ? 'available' : $oldSlot->status,
                    ])->save();
                }
            }

            $lockedAppointment->forceFill([
                'appointment_slot_id' => $newSlot->id,
                'appointment_date' => $appointmentDate,
                'start_time' => $newSlot->start_time,
                'end_time' => $newSlot->end_time,
                'rescheduled_at' => now(),
                ...$attributes,
            ])->save();

            $bookedCount = $newSlot->booked_count + 1;
            $newSlot->forceFill([
                'booked_count' => $bookedCount,
                'status' => $bookedCount >= $newSlot->capacity ? 'booked' : 'available',
            ])->save();

            return $lockedAppointment->load(['patient.user', 'doctor.user', 'slot']);
        }, 3);
    }

    private function newAppointmentNumber(): string
    {
        do {
            $number = 'APT-'.now()->format('Ymd').'-'.Str::upper(Str::random(8));
        } while (Appointment::query()->where('appointment_no', $number)->exists());

        return $number;
    }
}
