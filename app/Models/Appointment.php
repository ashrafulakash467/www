<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Appointment extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'appointment_no',
        'patient_id',
        'doctor_id',
        'appointment_slot_id',
        'consultation_type',
        'appointment_date',
        'start_time',
        'end_time',
        'status',
        'payment_status',
        'channel',
        'reason',
        'symptoms',
        'doctor_notes',
        'cancel_reason',
        'accepted_at',
        'rejected_at',
        'rescheduled_at',
        'started_at',
        'completed_at',
        'follow_up_date',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'appointment_date' => 'date',
            'follow_up_date' => 'date',
            'accepted_at' => 'datetime',
            'rejected_at' => 'datetime',
            'rescheduled_at' => 'datetime',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'meta' => 'array',
        ];
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }

    public function slot(): BelongsTo
    {
        return $this->belongsTo(AppointmentSlot::class, 'appointment_slot_id');
    }

    public function payment(): HasOne
    {
        return $this->hasOne(Payment::class);
    }
}
