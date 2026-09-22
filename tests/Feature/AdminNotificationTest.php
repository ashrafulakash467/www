<?php

namespace Tests\Feature;

use App\Models\ContactMessage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/** Verify the complete administrator notification flow through real HTTP endpoints. */
class AdminNotificationTest extends TestCase
{
    // Reset the test database before each test, similar to resetting mocked state beforeEach().
    use RefreshDatabase;

    /** Ensure notification filtering, reading, and soft deletion work together. */
    public function test_admin_can_filter_read_and_delete_real_notifications(): void
    {
        // Arrange: factories quickly create valid database records for the scenario.
        $admin = User::factory()->create(['role' => 'admin']);
        Role::findOrCreate('admin', 'web');
        $admin->assignRole('admin');

        ContactMessage::query()->create([
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'email' => 'jane@example.com',
            'subject' => 'Need assistance',
            'message' => 'Please help with my appointment.',
        ]);

        // Act: actingAs provides an authenticated session for the following API request.
        $response = $this->actingAs($admin)
            ->getJson('/api/v1/admin/notifications?filter=unread&search=Jane')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.type', 'support')
            ->assertJsonPath('data.0.relatedUser', 'Jane Doe');

        // Read a nested value from the JSON response for use in later requests.
        $notificationId = $response->json('data.0.id');

        $this->patchJson("/api/v1/admin/notifications/{$notificationId}/read")
            ->assertOk()
            ->assertJsonPath('data.isRead', true);

        $this->getJson('/api/v1/admin/notifications?filter=read')
            ->assertOk()
            ->assertJsonPath('meta.total', 1);

        $this->deleteJson("/api/v1/admin/notifications/{$notificationId}")
            ->assertOk()
            ->assertJsonPath('success', true);

        // Assert the soft-deleted notification no longer appears in the visible collection.
        $this->getJson('/api/v1/admin/notifications')
            ->assertOk()
            ->assertJsonPath('meta.total', 0);
    }
}
