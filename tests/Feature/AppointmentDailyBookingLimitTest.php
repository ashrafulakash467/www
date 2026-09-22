<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\AppointmentSlot;
use App\Models\Doctor;
use App\Models\DoctorSchedule;
use App\Models\Patient;
use App\Models\User;
use Database\Seeders\AccessControlSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/** Verify that one patient cannot hold multiple active appointments on one date. */
class AppointmentDailyBookingLimitTest extends TestCase
{
    use RefreshDatabase;

    private User $patientUser;

    private Doctor $doctor;

    private AppointmentSlot $firstSlot;

    private AppointmentSlot $secondSlot;

    private AppointmentSlot $otherDateSlot;

    private string $firstDate;

    private string $otherDate;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(AccessControlSeeder::class);
        $this->patientUser = $this->createPatientUser();

        $doctorUser = User::factory()->create([
            'role' => 'doctor',
            'status' => 'active',
        ]);
        $doctorUser->assignRole('doctor');

        $this->doctor = Doctor::create([
            'user_id' => $doctorUser->id,
            'specialty' => 'Cardiology',
            'verification_status' => 'approved',
            'status' => 'active',
        ]);

        $schedule = DoctorSchedule::create([
            'doctor_id' => $this->doctor->id,
            'consultation_type' => 'in_person',
            'timezone' => 'Asia/Dhaka',
            'working_days' => ['monday'],
            'start_time' => '09:00:00',
            'end_time' => '11:00:00',
            'slot_duration_minutes' => 30,
            'daily_capacity' => 2,
            'is_active' => true,
            'status' => 'active',
        ]);

        $this->firstDate = now()->addDays(7)->toDateString();
        $this->otherDate = now()->addDays(8)->toDateString();
        $this->firstSlot = $this->createSlot($schedule, $this->firstDate, '09:00:00', '09:30:00');
        $this->secondSlot = $this->createSlot($schedule, $this->firstDate, '10:00:00', '10:30:00');
        $this->otherDateSlot = $this->createSlot($schedule, $this->otherDate, '09:00:00', '09:30:00');
    }

    /** The first active appointment on a calendar date is allowed. */
    public function test_first_appointment_on_a_date_succeeds(): void
    {
        $this->book($this->firstDate, '09:00 AM')
            ->assertCreated()
            ->assertJsonPath('success', true);

        $appointment = Appointment::query()->firstOrFail();
        $this->assertSame($this->patientUser->patient->id, $appointment->patient_id);
        $this->assertSame($this->firstDate, $appointment->appointment_date->toDateString());
        $this->assertSame('pending', $appointment->status);
        $this->assertSame(1, $this->firstSlot->fresh()->booked_count);
    }

    /** Every active workflow status blocks a second appointment on that same date. */
    #[DataProvider('activeStatusProvider')]
    public function test_second_active_appointment_on_the_same_date_is_rejected(string $activeStatus): void
    {
        $this->book($this->firstDate, '09:00 AM')->assertCreated();
        Appointment::query()->firstOrFail()->update(['status' => $activeStatus]);

        $this->book($this->firstDate, '10:00 AM')
            ->assertUnprocessable()
            ->assertJsonPath(
                'message',
                'You already booked an appointment for this date.',
            )
            ->assertJsonPath(
                'errors.appointmentDate.0',
                'You already booked an appointment for this date.',
            );

        $this->assertDatabaseCount('appointments', 1);
    }

    /** An active appointment does not prevent booking on a different calendar date. */
    public function test_appointment_on_another_date_succeeds(): void
    {
        $this->book($this->firstDate, '09:00 AM')->assertCreated();
        $this->book($this->otherDate, '09:00 AM')->assertCreated();

        $this->assertDatabaseCount('appointments', 2);
        $this->assertSame(1, $this->firstSlot->fresh()->booked_count);
        $this->assertSame(1, $this->otherDateSlot->fresh()->booked_count);
    }

    /** Once cancelled, the old appointment no longer blocks another booking on its date. */
    public function test_cancelled_appointment_no_longer_blocks_a_new_booking(): void
    {
        $this->book($this->firstDate, '09:00 AM')->assertCreated();
        $appointment = Appointment::query()->firstOrFail();

        $this->actingAs($this->patientUser)
            ->postJson('/api/v1/appointment/cancel', [
                'appointmentId' => $appointment->appointment_no,
                'reason' => 'Need a different appointment time.',
            ])
            ->assertOk();

        $this->book($this->firstDate, '10:00 AM')->assertCreated();

        $this->assertSame('cancelled', $appointment->fresh()->status);
        $this->assertDatabaseCount('appointments', 2);
        $this->assertSame(0, $this->firstSlot->fresh()->booked_count);
        $this->assertSame(1, $this->secondSlot->fresh()->booked_count);
    }

    /** Rejecting a duplicate must happen before the newly selected slot is reserved. */
    public function test_failed_duplicate_booking_does_not_change_booked_count(): void
    {
        $this->book($this->firstDate, '09:00 AM')->assertCreated();

        $this->book($this->firstDate, '10:00 AM')
            ->assertUnprocessable();

        $this->assertSame(1, $this->firstSlot->fresh()->booked_count);
        $this->assertSame(0, $this->secondSlot->fresh()->booked_count);
    }

    /** @return array<string, array{string}> */
    public static function activeStatusProvider(): array
    {
        return [
            'pending' => ['pending'],
            'confirmed' => ['confirmed'],
            'reschedule requested' => ['reschedule_requested'],
            'cancellation requested' => ['cancellation_requested'],
        ];
    }

    private function createPatientUser(): User
    {
        $user = User::factory()->create([
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

    private function createSlot(
        DoctorSchedule $schedule,
        string $date,
        string $startTime,
        string $endTime,
    ): AppointmentSlot {
        return AppointmentSlot::create([
            'doctor_schedule_id' => $schedule->id,
            'doctor_id' => $this->doctor->id,
            'slot_date' => $date,
            'start_time' => $startTime,
            'end_time' => $endTime,
            'capacity' => 1,
            'booked_count' => 0,
            'is_bookable' => true,
            'status' => 'available',
        ]);
    }

    private function book(string $date, string $slotTime)
    {
        return $this->actingAs($this->patientUser)
            ->postJson('/api/v1/appointment/book', [
                'doctorId' => $this->doctor->id,
                'appointmentDate' => $date,
                'slotTime' => $slotTime,
            ]);
    }
}
