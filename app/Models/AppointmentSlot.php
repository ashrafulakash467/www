<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AppointmentSlot extends Model
{
    use HasFactory;

    protected $fillable = [
        'doctor_schedule_id',
        'doctor_id',
        'slot_date',
        'start_time',
        'end_time',
        'capacity',
        'booked_count',
        'is_bookable',
        'status',
        'generated_at',
    ];

    protected function casts(): array
    {
        return [
            'slot_date' => 'date',
            'generated_at' => 'datetime',
            'is_bookable' => 'boolean',
        ];
    }

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(DoctorSchedule::class, 'doctor_schedule_id');
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }
}
