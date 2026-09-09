<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class CommissionSettingsSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            [
                'group' => 'commission',
                'key' => 'commission.default_doctor_percentage',
                'label' => 'Default Doctor Percentage',
                'type' => 'number',
                'value' => '80',
                'hint' => 'Default percentage of payment that goes to the doctor',
                'is_active' => true,
                'is_private' => true,
            ],
            [
                'group' => 'commission',
                'key' => 'commission.default_admin_percentage',
                'label' => 'Default Admin Commission',
                'type' => 'number',
                'value' => '20',
                'hint' => 'Default percentage of payment that goes to the platform/admin',
                'is_active' => true,
                'is_private' => true,
            ],
        ];

        foreach ($settings as $setting) {
            Setting::query()->updateOrCreate(
                ['key' => $setting['key']],
                $setting,
            );
        }

        Setting::forgetAllCaches();
    }
}
