<?php

namespace App\Http\Requests\Appointments;

use Illuminate\Foundation\Http\FormRequest;

/** Authorize and validate an appointment cancellation request. */
class CancelAppointmentRequest extends FormRequest
{
    /** Allow cancellation only for authenticated patient or administrative roles. */
    public function authorize(): bool
    {
        return $this->user()?->hasAnyRole(['patient', 'admin', 'super-admin']) ?? false;
    }

    /** Require an appointment identifier and a meaningful cancellation reason. */
    public function rules(): array
    {
        return [
            'appointmentId' => ['required', 'string', 'max:100'],
            'reason' => ['required', 'string', 'min:3', 'max:1000'],
        ];
    }
}
