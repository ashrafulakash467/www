<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\AppointmentSlot;
use App\Models\Doctor;
use App\Models\DoctorSchedule;
use App\Models\Patient;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class DemoUsersSeeder extends Seeder
{
    public function run(): void
    {
        $admin = $this->user('Admin User', 'admin', 'admin@healthcare.com', '01700000001', 'Admin@12345');
        $doctorUser = $this->user('Doctor User', 'doctor', 'doctor@healthcare.com', '01700000002', 'Doctor@12345');
        $patientUser = $this->user('Patient User', 'patient', 'patient@healthcare.com', '01700000003', 'Patient@12345');
        $this->user('Pending Doctor', 'doctor', 'pending.doctor@healthcare.com', '01700000005', 'Doctor@12345', 'pending_verification');

        $doctor = Doctor::updateOrCreate(
            ['user_id' => $doctorUser->id],
            [
                'specialty' => 'Cardiology',
                'sub_specialty' => 'Interventional Cardiology',
                'qualification' => 'MBBS, FCPS (Cardiology)',
                'gender' => 'Male',
                'consultation_fee' => 1500,
                'follow_up_fee' => 800,
                'chamber_address' => 'House 12, Road 5, Dhanmondi, Dhaka',
                'city' => 'Dhaka',
                'country' => 'Bangladesh',
                'license_no' => 'BMDC-112233',
                'verification_status' => 'approved',
                'verified_at' => now()->subDays(2),
                'status' => 'active',
            ],
        );

        $pendingDoctor = User::query()->where('username', 'pending-doctor')->first()?->doctor;
        if ($pendingDoctor) {
            $pendingDoctor->update([
                'specialty' => 'Dermatology',
                'qualification' => 'MBBS, DDV',
                'consultation_fee' => 1200,
                'chamber_address' => 'Suite 4, Level 3, Metro Tower, Gulshan, Dhaka',
                'city' => 'Dhaka',
                'verification_status' => 'pending',
                'status' => 'active',
            ]);
        }

        $patient = Patient::updateOrCreate(
            ['user_id' => $patientUser->id],
            [
                'name' => $patientUser->name,
                'email' => $patientUser->email,
                'phone' => $patientUser->phone,
                'mrn' => 'MRN-100001',
                'gender' => 'Female',
                'blood_group' => 'O+',
                'city' => 'Dhaka',
                'country' => 'Bangladesh',
                'status' => 'active',
            ],
        );

        $schedule = DoctorSchedule::updateOrCreate(
            ['doctor_id' => $doctor->id, 'consultation_type' => 'in_person'],
            [
                'timezone' => 'Asia/Dhaka',
                'working_days' => ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
                'start_time' => '09:00:00',
                'end_time' => '17:00:00',
                'slot_duration_minutes' => 30,
                'daily_capacity' => 1,
                'is_active' => true,
                'status' => 'active',
                'notes' => 'Seeded doctor schedule',
            ],
        );

        foreach (range(1, 7) as $offset) {
            foreach (['09:00:00', '09:30:00', '10:00:00', '11:00:00', '16:00:00'] as $time) {
                AppointmentSlot::updateOrCreate(
                    [
                        'doctor_schedule_id' => $schedule->id,
                        'slot_date' => now()->addDays($offset)->toDateString(),
                        'start_time' => $time,
                    ],
                    [
                        'doctor_id' => $doctor->id,
                        'end_time' => Carbon::createFromFormat('H:i:s', $time)->addMinutes(30)->format('H:i:s'),
                        'capacity' => 1,
                        'booked_count' => 0,
                        'is_bookable' => true,
                        'status' => 'available',
                        'generated_at' => now(),
                    ],
                );
            }
        }

        $appointment = Appointment::updateOrCreate(
            ['appointment_no' => 'APT-1001'],
            [
                'patient_id' => $patient->id,
                'doctor_id' => $doctor->id,
                'consultation_type' => 'in_person',
                'appointment_date' => now()->addDay()->toDateString(),
                'start_time' => '09:30:00',
                'end_time' => '10:00:00',
                'status' => 'pending',
                'payment_status' => 'pending',
                'channel' => 'web',
                'reason' => 'General consultation',
                'meta' => ['seeded' => true],
            ],
        );

        Payment::updateOrCreate(
            ['transaction_no' => 'TRX-APT-1001'],
            [
                'appointment_id' => $appointment->id,
                'patient_id' => $patient->id,
                'doctor_id' => $doctor->id,
                'payer_user_id' => $patientUser->id,
                'provider' => 'manual',
                'method' => 'cash',
                'currency' => 'BDT',
                'amount' => 1500,
                'total_amount' => 1500,
                'paid_amount' => 0,
                'due_amount' => 1500,
                'status' => 'pending',
            ],
        );

        unset($admin);
    }

    private function user(
        string $name,
        string $role,
        string $email,
        string $phone,
        string $password,
        string $status = 'active'
    ): User {
        $user = User::updateOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'username' => str_replace('@healthcare.com', '', $email),
                'role' => $role,
                'phone' => $phone,
                'password' => $password,
                'status' => $status,
                'email_verified_at' => now(),
            ],
        );
        $user->syncRoles([$role]);

        if ($role === 'doctor') {
            Doctor::firstOrCreate(
                ['user_id' => $user->id],
                ['specialty' => 'General Medicine', 'verification_status' => 'pending', 'status' => 'active']
            );
        }

        return $user;
    }
}
