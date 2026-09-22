<?php

namespace App\Http\Requests\Appointments;

use Illuminate\Foundation\Http\FormRequest;

/** Authorize and validate the fields required to create an appointment. */
class StoreAppointmentRequest extends FormRequest
{
    /** Allow booking only for authenticated patient or administrative roles. */
    public function authorize(): bool
    {
        return $this->user()?->hasAnyRole(['patient', 'admin', 'super-admin']) ?? false;
    }

    /** Validate the selected doctor, future date, and time slot. */
    public function rules(): array
    {
        return [
            'doctorId' => ['required', 'integer', 'exists:doctors,id'],
            'appointmentDate' => ['required', 'date', 'after_or_equal:today'],
            'slotTime' => ['required', 'string', 'max:30'],
        ];
    }
}
