<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EarningTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'payment_id',
        'appointment_id',
        'doctor_id',
        'gross_amount',
        'doctor_percentage',
        'doctor_amount',
        'admin_percentage',
        'admin_amount',
        'refund_amount',
        'reversal_amount',
        'status',
        'earned_at',
        'released_at',
    ];

    protected function casts(): array
    {
        return [
            'gross_amount' => 'decimal:2',
            'doctor_percentage' => 'decimal:2',
            'doctor_amount' => 'decimal:2',
            'admin_percentage' => 'decimal:2',
            'admin_amount' => 'decimal:2',
            'refund_amount' => 'decimal:2',
            'reversal_amount' => 'decimal:2',
            'earned_at' => 'datetime',
            'released_at' => 'datetime',
        ];
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }

    public function getNetDoctorAmountAttribute(): float
    {
        return (float) ($this->doctor_amount - $this->reversal_amount);
    }

    public function isReleased(): bool
    {
        return $this->status === 'released';
    }

    public function isRefunded(): bool
    {
        return in_array($this->status, ['refunded', 'reversed'], true);
    }
}
