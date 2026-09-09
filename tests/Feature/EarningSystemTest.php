<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Doctor;
use App\Models\EarningTransaction;
use App\Models\Patient;
use App\Models\Payment;
use App\Models\Setting;
use App\Models\User;
use App\Services\EarningService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EarningSystemTest extends TestCase
{
    use RefreshDatabase;

    private EarningService $earnings;

    protected function setUp(): void
    {
        parent::setUp();
        $this->earnings = app(EarningService::class);
        $this->seedCommissionSettings();
    }

    public function test_default_percentages_are_80_20()
    {
        $this->assertEquals(80.0, $this->earnings->getDefaultDoctorPercentage());
        $this->assertEquals(20.0, $this->earnings->getDefaultAdminPercentage());
    }

    public function test_1000_payment_splits_800_200()
    {
        $payment = $this->createPaidPayment(1000);
        $earning = $this->earnings->createEarningFromPayment($payment);
        $this->assertNotNull($earning);
        $this->assertEquals(1000.0, $earning->gross_amount);
        $this->assertEquals(80.0, $earning->doctor_percentage);
        $this->assertEquals(800.0, $earning->doctor_amount);
        $this->assertEquals(20.0, $earning->admin_percentage);
        $this->assertEquals(200.0, $earning->admin_amount);
    }

    public function test_custom_doctor_percentage_is_used()
    {
        $doctor = $this->createDoctorWithPercentage(75);
        $payment = $this->createPaidPayment(1000, $doctor);
        $earning = $this->earnings->createEarningFromPayment($payment);
        $this->assertEquals(75.0, $earning->doctor_percentage);
        $this->assertEquals(750.0, $earning->doctor_amount);
        $this->assertEquals(25.0, $earning->admin_percentage);
        $this->assertEquals(250.0, $earning->admin_amount);
    }

    public function test_changing_default_does_not_affect_old_earnings()
    {
        $payment1 = $this->createPaidPayment(1000);
        $earning1 = $this->earnings->createEarningFromPayment($payment1);
        Setting::query()->where('key', 'commission.default_doctor_percentage')->update(['value' => '70']);
        Setting::query()->where('key', 'commission.default_admin_percentage')->update(['value' => '30']);
        Setting::forgetAllCaches();
        $payment2 = $this->createPaidPayment(1000);
        $earning2 = $this->earnings->createEarningFromPayment($payment2);
        $this->assertEquals(80.0, $earning1->fresh()->doctor_percentage);
        $this->assertEquals(70.0, $earning2->doctor_percentage);
    }

    public function test_duplicate_payment_creates_only_one_earning()
    {
        $payment = $this->createPaidPayment(1000);
        $earning1 = $this->earnings->createEarningFromPayment($payment);
        $earning2 = $this->earnings->createEarningFromPayment($payment->fresh());
        $this->assertEquals($earning1->id, $earning2->id);
        $this->assertEquals(1, EarningTransaction::where('payment_id', $payment->id)->count());
    }

    public function test_full_refund_reverses_earning_correctly()
    {
        $payment = $this->createPaidPayment(1000);
        $this->earnings->createEarningFromPayment($payment);
        $reversed = $this->earnings->processRefundReversal($payment, 1000);
        $this->assertEquals(EarningService::STATUS_REFUNDED, $reversed->status);
        $this->assertEquals(800.0, $reversed->reversal_amount);
    }

    public function test_partial_refund_reverses_proportionally()
    {
        $payment = $this->createPaidPayment(1000);
        $this->earnings->createEarningFromPayment($payment);
        $reversed = $this->earnings->processRefundReversal($payment, 500);
        $this->assertEquals(EarningService::STATUS_REVERSED, $reversed->status);
        $this->assertEquals(400.0, $reversed->reversal_amount);
    }

    public function test_available_balance_calculation()
    {
        $this->createPaidPayment(1000);
        $payment2 = $this->createPaidPayment(2000);
        $this->earnings->processRefundReversal($payment2, 2000);
        $doctorId = Payment::first()->doctor_id;
        $balance = $this->earnings->getAvailableBalance($doctorId);
        $this->assertEquals(800.0, $balance);
    }

    public function test_admin_api_rejects_invalid_percentage()
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $response = $this->actingAs($admin)->putJson('/api/v1/admin/commission/defaults', [
            'doctor_percentage' => 80,
            'admin_percentage' => 30,
        ]);
        $response->assertStatus(422);
    }

    public function test_non_admin_cannot_access_commission_api()
    {
        $user = User::factory()->create();
        $user->assignRole('doctor');
        $response = $this->actingAs($user)->getJson('/api/v1/admin/commission');
        $response->assertStatus(403);
    }

    public function test_doctor_can_only_see_own_earnings()
    {
        $doctor1 = $this->createDoctorWithUser();
        $doctor2 = $this->createDoctorWithUser();
        $this->createPaidPayment(1000, $doctor1);
        $this->createPaidPayment(2000, $doctor2);
        $user1 = $doctor1->user;
        $user1->assignRole('doctor');
        $response = $this->actingAs($user1)->getJson('/api/v1/doctor/earnings/summary');
        $response->assertStatus(200);
        $this->assertEquals(800.0, $response->json('data.total_earnings'));
    }

    private function seedCommissionSettings(): void
    {
        Setting::create([
            'group' => 'commission',
            'key' => 'commission.default_doctor_percentage',
            'label' => 'Default Doctor Percentage',
            'type' => 'number',
            'value' => '80',
            'is_active' => true,
            'is_private' => true,
        ]);
        Setting::create([
            'group' => 'commission',
            'key' => 'commission.default_admin_percentage',
            'label' => 'Default Admin Commission',
            'type' => 'number',
            'value' => '20',
            'is_active' => true,
            'is_private' => true,
        ]);
        Setting::forgetAllCaches();
    }

    private function createPaidPayment(float $amount, ?Doctor $doctor = null): Payment
    {
        $doctor = $doctor ?? $this->createDoctorWithUser();
        $patient = $this->createPatient();

        $appointment = Appointment::create([
            'appointment_no' => 'APT-' . uniqid(),
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'appointment_slot_id' => null,
            'consultation_type' => 'in_person',
            'appointment_date' => now()->toDateString(),
            'start_time' => '09:00:00',
            'end_time' => '09:30:00',
            'status' => 'confirmed',
            'payment_status' => 'paid',
        ]);

        return Payment::create([
            'transaction_no' => 'TXN-' . uniqid(),
            'appointment_id' => $appointment->id,
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'payer_user_id' => $patient->user_id,
            'provider' => 'sslcommerz',
            'method' => 'card',
            'currency' => 'BDT',
            'amount' => $amount,
            'total_amount' => $amount,
            'paid_amount' => $amount,
            'status' => 'paid',
            'paid_at' => now(),
        ]);
    }

    private function createDoctorWithUser(): Doctor
    {
        $user = User::factory()->create();
        return Doctor::create([
            'user_id' => $user->id,
            'specialty' => 'General',
            'consultation_fee' => 500,
            'status' => 'active',
            'verification_status' => 'approved',
        ]);
    }

    private function createDoctorWithPercentage(float $percentage): Doctor
    {
        $doctor = $this->createDoctorWithUser();
        $doctor->update([
            'doctor_percentage' => $percentage,
            'percentage_effective_from' => now()->subDay(),
        ]);
        return $doctor;
    }

    private function createPatient(): Patient
    {
        $user = User::factory()->create();
        return Patient::create([
            'user_id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'status' => 'active',
        ]);
    }
}

