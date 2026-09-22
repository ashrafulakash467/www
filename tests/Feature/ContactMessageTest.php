<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/** Cover the public contact form and the protected administrator inbox as one user journey. */
class ContactMessageTest extends TestCase
{
    // Recreate the database schema so this test cannot depend on existing local data.
    use RefreshDatabase;

    /** Ensure a public submission is stored and visible only through the admin endpoint. */
    public function test_contact_message_can_be_submitted_and_viewed_by_an_admin(): void
    {
        // Arrange: this array mirrors the JSON body a React contact form submits.
        $payload = [
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'email' => 'jane@example.com',
            'subject' => 'Appointment question',
            'message' => 'Please contact me about my appointment.',
        ];

        // Act and assert the public API creates the message successfully.
        $this->postJson('/api/v1/contact/messages', $payload)
            ->assertCreated()
            ->assertJsonPath('success', true);

        // Database assertions verify persistence, not merely the HTTP response.
        $this->assertDatabaseHas('contact_messages', $payload);

        $admin = User::factory()->create(['role' => 'admin']);
        Role::findOrCreate('admin', 'web');
        $admin->assignRole('admin');

        // Authenticate as an admin before testing the protected inbox endpoint.
        $this->actingAs($admin)
            ->getJson('/api/v1/admin/support/contact-messages?search=Jane')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.subject', 'Appointment question');
    }
}
