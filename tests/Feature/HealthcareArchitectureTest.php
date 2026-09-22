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

/**
 * Exercise the main application boundaries: Inertia pages, sessions, role middleware,
 * public booking discovery, authenticated booking, and slot-capacity protection.
 */
class HealthcareArchitectureTest extends TestCase
{
    // RefreshDatabase gives every test an isolated schema and clean records.
    use RefreshDatabase;

    /** Prepare the roles and permissions required by all tests in this class. */
    protected function setUp(): void
    {
        // Always boot Laravel's normal test setup before adding class-specific fixtures.
        parent::setUp();
        // A seeder is comparable to a reusable frontend test fixture with default data.
        $this->seed(AccessControlSeeder::class);
    }

    /** Verify public routes select the expected React/Inertia page components. */
    public function test_public_pages_render_through_inertia(): void
    {
        // assertInertia inspects the component name and props, not rendered browser HTML.
        $this->get('/')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Home/Index'));

        $this->get('/doctors')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Doctors/Index'));
    }

    public function test_guests_can_review_booking_details_but_cannot_book(): void
    {
        // Arrange a complete doctor -> schedule -> slot graph required by booking endpoints.
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
        // A future date keeps the generated slot valid regardless of when the test runs.
        $date = now()->addDay()->toDateString();
        AppointmentSlot::create([
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

        // Guests may render the page and access read-only availability endpoints.
        $this->get("/appointment/book?doctorId={$doctor->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Appointments/Book'));

        $this->getJson("/api/v1/appointment/booking-options?doctorId={$doctor->id}")
            ->assertOk()
            ->assertJsonPath('doctor.id', (string) $doctor->id);

        $this->getJson("/api/v1/appointment/available-dates?doctorId={$doctor->id}")
            ->assertOk()
            ->assertJsonPath('dates.0', $date);

        $this->getJson("/api/v1/appointment/available-slots?doctorId={$doctor->id}&date={$date}")
            ->assertOk()
            ->assertJsonPath('slots.0.time', '09:00 AM');

        // The mutation endpoint remains protected and must reject an unauthenticated guest.
        $this->postJson('/api/v1/appointment/book', [
            'doctorId' => $doctor->id,
            'appointmentDate' => $date,
            'slotTime' => '09:00 AM',
        ])->assertUnauthorized();
    }

    public function test_login_uses_a_server_side_session_and_redirects_by_role(): void
    {
        // Arrange an active patient whose password can be submitted through the login endpoint.
        $patient = User::factory()->create([
            'email' => 'patient@example.test',
            'password' => 'Password123!',
            'role' => 'patient',
            'status' => 'active',
        ]);
        $patient->assignRole('patient');

        // postJson simulates the fetch request made by the React login form.
        $this->postJson('/login', [
            'identifier' => 'patient@example.test',
            'password' => 'Password123!',
        ])->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('token', 'session');

        // This proves Laravel stored the user in the session, beyond returning success JSON.
        $this->assertAuthenticatedAs($patient);
    }

    public function test_role_middleware_isolates_dashboards(): void
    {
        // actingAs keeps this patient authenticated for the chained route checks below.
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

        // Hidden frontend links are not security; middleware must return HTTP 403 server-side.
        $this->actingAs($patient)->get('/admin/dashboard')->assertForbidden();
        $this->actingAs($patient)->get('/doctor/dashboard')->assertForbidden();
    }

    public function test_an_appointment_slot_cannot_be_double_booked(): void
    {
        // Arrange one slot with capacity one and two different authenticated patients.
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

        // First booking succeeds; the identical second request must fail with HTTP 422.
        $this->actingAs($first)->postJson('/api/v1/appointments', $payload)->assertCreated();
        $this->actingAs($second)->postJson('/api/v1/appointments', $payload)
            ->assertUnprocessable()
            ->assertJsonPath('success', false);

        // Verify the database invariant, not only the two API responses.
        $this->assertDatabaseCount('appointments', 1);
        $this->assertSame(1, $slot->fresh()->booked_count);
    }

    /** Build a reusable patient account/profile fixture for booking tests. */
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
