<?php

namespace App\Http\Requests\Appointments;

use Illuminate\Foundation\Http\FormRequest;

class StoreAppointmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasAnyRole(['patient', 'admin', 'super-admin']) ?? false;
    }

    public function rules(): array
    {
        return [
            'doctorId' => ['required', 'integer', 'exists:doctors,id'],
            'appointmentDate' => ['required', 'date', 'after_or_equal:today'],
            'slotTime' => ['required', 'string', 'max:30'],
        ];
    }
}
