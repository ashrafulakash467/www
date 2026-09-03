<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'role' => $this->role,
            'email' => $this->email,
            'phone' => $this->phone,
            'status' => $this->status,
            'last_login_at' => $this->last_login_at?->toISOString(),
            'two_factor_enabled' => (bool) $this->two_factor_enabled,
            'patient' => $this->whenLoaded('patient', function (): array {
                return [
                    'id' => (string) $this->patient->id,
                    'name' => $this->patient->name,
                    'email' => $this->patient->email,
                    'phone' => $this->patient->phone,
                    'mrn' => $this->patient->mrn,
                    'gender' => $this->patient->gender,
                    'bloodGroup' => $this->patient->blood_group,
                    'dateOfBirth' => $this->patient->date_of_birth?->toDateString(),
                    'city' => $this->patient->city,
                    'state' => $this->patient->state,
                    'country' => $this->patient->country,
                    'status' => $this->patient->status,
                ];
            }),
            'doctor' => $this->whenLoaded('doctor', function (): array {
                $doctor = $this->doctor;

                return [
                    'id' => (string) $doctor->id,
                    'userId' => (string) $doctor->user_id,
                    'specialty' => $doctor->specialty,
                    'subSpecialty' => $doctor->sub_specialty,
                    'qualification' => $doctor->qualification,
                    'bio' => $doctor->bio,
                    'gender' => $doctor->gender,
                    'consultationFee' => $doctor->consultation_fee,
                    'followUpFee' => $doctor->follow_up_fee,
                    'licenseNo' => $doctor->license_no,
                    'chamberAddress' => $doctor->chamber_address,
                    'availableDates' => collect($doctor->available_dates ?? [])->filter()->values()->all(),
                    'availableTimeSlots' => collect($doctor->available_time_slots ?? [])->filter()->values()->all(),
                    'city' => $doctor->city,
                    'state' => $doctor->state,
                    'country' => $doctor->country,
                    'verificationStatus' => $doctor->verification_status,
                    'verifiedAt' => $doctor->verified_at?->toISOString(),
                    'status' => $doctor->status,
                    'imagePath' => $doctor->image_path,
                ];
            }),
            'roles' => $this->getRoleNames()->values(),
            'permissions' => $this->getAllPermissions()->pluck('name')->values(),
            'token_abilities' => $request->user()?->currentAccessToken()?->abilities ?? [],
        ];
    }
}
