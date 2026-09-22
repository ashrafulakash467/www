<?php

namespace App\Http\Requests\Appointments;

use Illuminate\Foundation\Http\FormRequest;

/** Authorize and validate a requested replacement date and time slot. */
class RescheduleAppointmentRequest extends FormRequest
{
    /** Allow rescheduling only for authenticated patient or administrative roles. */
    public function authorize(): bool
    {
        return $this->user()?->hasAnyRole(['patient', 'admin', 'super-admin']) ?? false;
    }

    /** Validate the appointment reference and requested future slot. */
    public function rules(): array
    {
        return [
            'appointmentId' => ['required', 'string', 'max:100'],
            'appointmentDate' => ['required', 'date', 'after_or_equal:today'],
            'slotTime' => ['required', 'string', 'max:30'],
        ];
    }
}
