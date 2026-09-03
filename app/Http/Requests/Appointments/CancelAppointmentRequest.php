<?php

namespace App\Http\Requests\Appointments;

use Illuminate\Foundation\Http\FormRequest;

class CancelAppointmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasAnyRole(['patient', 'admin', 'super-admin']) ?? false;
    }

    public function rules(): array
    {
        return [
            'appointmentId' => ['required', 'string', 'max:100'],
            'reason' => ['required', 'string', 'min:3', 'max:1000'],
        ];
    }
}
