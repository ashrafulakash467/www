<?php

namespace Tests\Feature;

use App\Models\AppointmentSlot;
use App\Models\Doctor;
use App\Models\DoctorSchedule;
use App\Models\Patient;
use App\Models\User;
use Database\Seeders\AccessControlSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class HealthcareArchitectureTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(AccessControlSeeder::class);
    }

    public function test_public_pages_render_through_inertia(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Home/Index'));

        $this->get('/doctors')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Doctors/Index'));
    }

    public function test_login_uses_a_server_side_session_and_redirects_by_role(): void
    {
        $patient = User::factory()->create([
            'email' => 'patient@example.test',
            'password' => 'Password123!',
            'role' => 'patient',
            'status' => 'active',
        ]);
        $patient->assignRole('patient');

        $this->postJson('/login', [
            'identifier' => 'patient@example.test',
            'password' => 'Password123!',
        ])->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('token', 'session');

        $this->assertAuthenticatedAs($patient);
    }

    public function test_role_middleware_isolates_dashboards(): void
    {
        $patient = User::factory()->create(['role' => 'patient', 'status' => 'active']);
        $patient->assignRole('patient');

        $this->actingAs($patient)
            ->get('/patient/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Patient/Dashboard')
                ->where('patient.id', $patient->id)
                ->where('patient.role', 'patient'));

        $this->actingAs($patient)
            ->get('/patient/settings')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Patient/Settings')
                ->where('patient.id', $patient->id)
                ->where('patient.role', 'patient'));

        $this->actingAs($patient)
            ->get('/patient/appointments')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Patient/Dashboard')
                ->where('activeTab', 'appointments')
                ->where('patient.id', $patient->id));

        $this->actingAs($patient)
            ->get('/patient/medical-records')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Patient/Dashboard')
                ->where('activeTab', 'records')
                ->where('patient.id', $patient->id));

        $this->actingAs($patient)
            ->get('/patient/dashboard?tab=appointments')
            ->assertRedirect('/patient/appointments');

        $this->actingAs($patient)
            ->get('/patient/dashboard?tab=records')
            ->assertRedirect('/patient/medical-records');

        $this->actingAs($patient)->get('/admin/dashboard')->assertForbidden();
        $this->actingAs($patient)->get('/doctor/dashboard')->assertForbidden();
    }

    public function test_an_appointment_slot_cannot_be_double_booked(): void
    {
        $doctorUser = User::factory()->create(['role' => 'doctor', 'status' => 'active']);
        $doctorUser->assignRole('doctor');
        $doctor = Doctor::create([
            'user_id' => $doctorUser->id,
            'specialty' => 'Cardiology',
            'verification_status' => 'approved',
            'status' => 'active',
        ]);
        $schedule = DoctorSchedule::create([
            'doctor_id' => $doctor->id,
            'consultation_type' => 'in_person',
            'timezone' => 'Asia/Dhaka',
            'working_days' => ['monday'],
            'start_time' => '09:00:00',
            'end_time' => '10:00:00',
            'slot_duration_minutes' => 30,
            'daily_capacity' => 1,
            'is_active' => true,
            'status' => 'active',
        ]);
        $date = now()->addDay()->toDateString();
        $slot = AppointmentSlot::create([
            'doctor_schedule_id' => $schedule->id,
            'doctor_id' => $doctor->id,
            'slot_date' => $date,
            'start_time' => '09:00:00',
            'end_time' => '09:30:00',
            'capacity' => 1,
            'booked_count' => 0,
            'is_bookable' => true,
            'status' => 'available',
        ]);

        $first = $this->patientUser('first@example.test');
        $second = $this->patientUser('second@example.test');
        $payload = [
            'doctorId' => $doctor->id,
            'appointmentDate' => $date,
            'slotTime' => '09:00 AM',
        ];

        $this->actingAs($first)->postJson('/api/v1/appointments', $payload)->assertCreated();
        $this->actingAs($second)->postJson('/api/v1/appointments', $payload)
            ->assertUnprocessable()
            ->assertJsonPath('success', false);

        $this->assertDatabaseCount('appointments', 1);
        $this->assertSame(1, $slot->fresh()->booked_count);
    }

    private function patientUser(string $email): User
    {
        $user = User::factory()->create([
            'email' => $email,
            'role' => 'patient',
            'status' => 'active',
        ]);
        $user->assignRole('patient');
        Patient::create([
            'user_id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'status' => 'active',
        ]);

        return $user;
    }
}
