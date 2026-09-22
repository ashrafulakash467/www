<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/** Exercise role/permission CRUD and the safeguards that prevent administrator lockout. */
class RolePermissionManagementTest extends TestCase
{
    // Rebuild the database for a fully isolated access-control scenario.
    use RefreshDatabase;

    /** Ensure admins can manage access while protected roles and self-access remain safe. */
    public function test_admin_can_manage_roles_permissions_and_user_assignments_safely(): void
    {
        // Arrange the minimum permission and admin role needed to access these endpoints.
        $manageRoles = Permission::findOrCreate('manage-roles', 'web');
        $viewAppointments = Permission::findOrCreate('appointments.view', 'web');
        $adminRole = Role::query()->create(['name' => 'admin', 'guard_name' => 'web', 'is_active' => true]);
        $adminRole->givePermissionTo($manageRoles);
        $admin = User::factory()->create(['role' => 'admin']);
        $admin->assignRole($adminRole);

        // Confirm the initial access-control response is available to the authenticated admin.
        $this->actingAs($admin)
            ->getJson('/api/v1/admin/access-control')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('roles.0.usersCount', 1);

        // Create a role through HTTP and capture its generated ID from the JSON response.
        $response = $this->postJson('/api/v1/admin/access-control/roles', ['name' => 'support-admin'])
            ->assertCreated()
            ->assertJsonPath('data.name', 'support-admin');
        $roleId = $response->json('data.id');

        // Submitted permission IDs mirror selected checkboxes in an access-control form.
        $this->putJson("/api/v1/admin/access-control/roles/{$roleId}/permissions", ['permission_ids' => [$viewAppointments->id]])
            ->assertOk()
            ->assertJsonPath('data.permissions.0', 'appointments.view');

        $user = User::factory()->create(['role' => 'patient']);
        $this->putJson("/api/v1/admin/access-control/users/{$user->id}/roles", ['role_ids' => [$roleId]])
            ->assertOk();
        // fresh() reloads the model so assertions observe the database state after the API call.
        $this->assertTrue($user->fresh()->hasRole('support-admin'));
        $this->assertSame('support-admin', $user->fresh()->role);

        // The remaining requests verify safety rules return validation errors instead of locking admins out.
        $this->putJson("/api/v1/admin/access-control/users/{$admin->id}/roles", ['role_ids' => [$roleId]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('roles');

        $this->putJson("/api/v1/admin/access-control/roles/{$adminRole->id}", ['name' => 'admin', 'is_active' => false])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('role');

        $superAdmin = Role::query()->create(['name' => 'super-admin', 'guard_name' => 'web', 'is_active' => true]);
        $this->putJson("/api/v1/admin/access-control/roles/{$superAdmin->id}", ['name' => 'super-admin', 'is_active' => false])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('role');
    }
}
