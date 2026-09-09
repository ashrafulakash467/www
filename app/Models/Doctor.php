<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\EarningTransaction;

class Doctor extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'license_no',
        'specialty',
        'sub_specialty',
        'bio',
        'qualification',
        'gender',
        'consultation_fee',
        'follow_up_fee',
        'doctor_percentage',
        'percentage_effective_from',
        'image_path',
        'chamber_address',
        'available_dates',
        'available_time_slots',
        'city',
        'state',
        'country',
        'verification_status',
        'verified_at',
        'status',
    ];

    protected $casts = [
        'consultation_fee' => 'decimal:2',
        'follow_up_fee' => 'decimal:2',
        'doctor_percentage' => 'decimal:2',
        'available_dates' => 'array',
        'available_time_slots' => 'array',
        'verified_at' => 'datetime',
        'percentage_effective_from' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function schedules(): HasMany
    {
        return $this->hasMany(DoctorSchedule::class);
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    public function medicalRecords(): HasMany
    {
        return $this->hasMany(MedicalRecord::class);
    }

    public function prescriptions(): HasMany
    {
        return $this->hasMany(Prescription::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function earningTransactions(): HasMany
    {
        return $this->hasMany(EarningTransaction::class);
    }

    public function getEffectivePercentage(?string $asOf = null): ?float
    {
        if ($this->doctor_percentage === null) {
            return null;
        }

        $effectiveFrom = $this->percentage_effective_from;

        if ($effectiveFrom === null) {
            return (float) $this->doctor_percentage;
        }

        $checkDate = $asOf ? \Illuminate\Support\Carbon::parse($asOf) : now();

        return $checkDate->greaterThanOrEqualTo($effectiveFrom)
            ? (float) $this->doctor_percentage
            : null;
    }
}
