<?php

namespace Tests\Feature;

use App\Models\ContactMessage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AdminNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_filter_read_and_delete_real_notifications(): void
    {
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

        $response = $this->actingAs($admin)
            ->getJson('/api/v1/admin/notifications?filter=unread&search=Jane')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.type', 'support')
            ->assertJsonPath('data.0.relatedUser', 'Jane Doe');

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

        $this->getJson('/api/v1/admin/notifications')
            ->assertOk()
            ->assertJsonPath('meta.total', 0);
    }
}
