<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DoctorScheduleException extends Model
{
    use HasFactory;

    protected $fillable = [
        'doctor_schedule_id',
        'exception_date',
        'start_time',
        'end_time',
        'exception_type',
        'reason',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'exception_date' => 'date',
        ];
    }

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(DoctorSchedule::class, 'doctor_schedule_id');
    }
}
