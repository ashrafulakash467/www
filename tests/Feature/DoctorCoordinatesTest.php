<?php

namespace Tests\Feature;

use App\Models\Doctor;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Verify public doctor search exposes real chamber coordinates and location matching. */
class DoctorCoordinatesTest extends TestCase
{
    // Each run starts from an empty migrated database.
    use RefreshDatabase;

    /** Ensure location search finds the database doctor and preserves decimal GPS precision. */
    public function test_public_doctor_search_returns_chamber_coordinates_and_searches_location(): void
    {
        // Arrange: create the account first because Doctor belongs to User.
        $user = User::factory()->create([
            'name' => 'Dr GPS Test',
            'role' => 'doctor',
            'status' => 'active',
        ]);

        // These are chamber coordinates, not a doctor's private home coordinates.
        Doctor::create([
            'user_id' => $user->id,
            'specialty' => 'Cardiology',
            'chamber_address' => 'Central Medical Center',
            'city' => 'Dhaka',
            'state' => 'Dhaka Division',
            'country' => 'Bangladesh',
            'latitude' => 23.8103310,
            'longitude' => 90.4125210,
            'verification_status' => 'approved',
            'status' => 'active',
        ]);

        // Act + assert: exercise the real route and inspect its serialized JSON payload.
        $this->getJson('/api/v1/doctor/search?search=Dhaka%20Division')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Dr GPS Test')
            ->assertJsonPath('data.0.specialty', 'Cardiology')
            ->assertJsonPath('data.0.city', 'Dhaka')
            ->assertJsonPath('data.0.latitude', '23.8103310')
            ->assertJsonPath('data.0.longitude', '90.4125210');
    }
}
