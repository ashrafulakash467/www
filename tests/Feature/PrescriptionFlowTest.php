<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PrescriptionFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_doctor_can_save_update_and_patient_can_read_prescription(): void
    {
        Role::findOrCreate('doctor');
        Role::findOrCreate('patient');
        $doctorUser = User::factory()->create(['role' => 'doctor']);
        $doctorUser->assignRole('doctor');
        $doctor = Doctor::create([
            'user_id' => $doctorUser->id,
            'specialty' => 'General Medicine',
            'status' => 'active',
        ]);

        $patientUser = User::factory()->create(['role' => 'patient']);
        $patientUser->assignRole('patient');
        $patient = Patient::create([
            'user_id' => $patientUser->id,
            'mrn' => 'MRN-TEST-001',
            'status' => 'active',
        ]);

        $appointment = Appointment::create([
            'appointment_no' => 'APT-TEST-001',
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'appointment_date' => now()->toDateString(),
            'status' => 'accepted',
            'payment_status' => 'paid',
        ]);

        $createResponse = $this->actingAs($doctorUser)->postJson(
            "/api/v1/consultations/{$appointment->appointment_no}/prescriptions",
            [
                'notes' => 'Take after food.',
                'followUpInDays' => 7,
                'items' => [
                    [
                        'medicine_name' => 'Medicine A',
                        'strength' => '500 mg',
                        'dosage' => '1 tablet',
                        'frequency' => 'Twice daily',
                        'route' => 'Oral',
                        'duration' => '5 days',
                        'quantity' => 10,
                        'instructions' => 'After meals',
                    ],
                    [
                        'medicine_name' => 'Medicine B',
                        'strength' => '10 mg',
                        'dosage' => '1 tablet',
                        'frequency' => 'At night',
                        'route' => 'Oral',
                        'duration' => '7 days',
                        'quantity' => 7,
                        'instructions' => 'Before sleep',
                    ],
                ],
            ],
        );

        $createResponse
            ->assertCreated()
            ->assertJsonPath('record.appointmentNo', $appointment->appointment_no)
            ->assertJsonCount(2, 'record.items');

        $prescription = Prescription::where('appointment_id', $appointment->id)->firstOrFail();
        $firstItemId = $prescription->items()->where('medicine_name', 'Medicine A')->value('id');
        $this->assertDatabaseHas('prescriptions', [
            'id' => $prescription->id,
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'status' => 'issued',
        ]);
        $this->assertDatabaseCount('prescription_items', 2);

        $updateResponse = $this->actingAs($doctorUser)->putJson(
            "/api/v1/consultations/{$appointment->appointment_no}/prescriptions",
            [
                'notes' => 'Updated instructions.',
                'followUpInDays' => 14,
                'items' => [
                    [
                        'id' => $firstItemId,
                        'medicine_name' => 'Medicine C',
                        'strength' => '20 mg',
                        'dosage' => '1 capsule',
                        'frequency' => 'Once daily',
                        'route' => 'Oral',
                        'duration' => '14 days',
                        'quantity' => 14,
                        'instructions' => 'After breakfast',
                    ],
                ],
            ],
        );

        $updateResponse
            ->assertOk()
            ->assertJsonPath('record.id', (string) $prescription->id)
            ->assertJsonPath('record.items.0.medicineName', 'Medicine C')
            ->assertJsonCount(1, 'record.items');

        $this->assertDatabaseCount('prescriptions', 1);
        $this->assertDatabaseCount('prescription_items', 1);
        $this->assertDatabaseMissing('prescription_items', ['medicine_name' => 'Medicine A']);
        $this->assertDatabaseHas('prescription_items', [
            'id' => $firstItemId,
            'prescription_id' => $prescription->id,
            'medicine_name' => 'Medicine C',
        ]);

        $this->actingAs($patientUser)
            ->getJson('/api/v1/medical-records')
            ->assertOk()
            ->assertJsonPath('records.prescriptions.0.id', (string) $prescription->id)
            ->assertJsonPath('records.prescriptions.0.doctorName', $doctorUser->name)
            ->assertJsonPath('records.prescriptions.0.doctor.specialty', 'General Medicine')
            ->assertJsonPath('records.prescriptions.0.patient.mrn', 'MRN-TEST-001')
            ->assertJsonPath('records.prescriptions.0.appointment.paymentStatus', 'paid')
            ->assertJsonPath('records.prescriptions.0.items.0.medicineName', 'Medicine C');
    }
}
