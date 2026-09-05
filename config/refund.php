<?php

return [
    'patient_cancellation' => [
        'more_than_24_hours' => 100,
        'between_12_and_24_hours' => 80,
        'less_than_12_hours' => 50,
        'after_appointment' => 0,
    ],
    'doctor_cancellation' => 100,
    'admin_cancellation' => 100,
    'statuses' => ['not_requested', 'requested', 'processing', 'refunded', 'failed', 'cancelled'],
];
