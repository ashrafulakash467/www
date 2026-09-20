<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ContactMessageTest extends TestCase
{
    use RefreshDatabase;

    public function test_contact_message_can_be_submitted_and_viewed_by_an_admin(): void
    {
        $payload = [
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'email' => 'jane@example.com',
            'subject' => 'Appointment question',
            'message' => 'Please contact me about my appointment.',
        ];

        $this->postJson('/api/v1/contact/messages', $payload)
            ->assertCreated()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('contact_messages', $payload);

        $admin = User::factory()->create(['role' => 'admin']);
        Role::findOrCreate('admin', 'web');
        $admin->assignRole('admin');

        $this->actingAs($admin)
            ->getJson('/api/v1/admin/support/contact-messages?search=Jane')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.subject', 'Appointment question');
    }
}
