<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RolePermissionManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_manage_roles_permissions_and_user_assignments_safely(): void
    {
        $manageRoles = Permission::findOrCreate('manage-roles', 'web');
        $viewAppointments = Permission::findOrCreate('appointments.view', 'web');
        $adminRole = Role::query()->create(['name' => 'admin', 'guard_name' => 'web', 'is_active' => true]);
        $adminRole->givePermissionTo($manageRoles);
        $admin = User::factory()->create(['role' => 'admin']);
        $admin->assignRole($adminRole);

        $this->actingAs($admin)
            ->getJson('/api/v1/admin/access-control')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('roles.0.usersCount', 1);

        $response = $this->postJson('/api/v1/admin/access-control/roles', ['name' => 'support-admin'])
            ->assertCreated()
            ->assertJsonPath('data.name', 'support-admin');
        $roleId = $response->json('data.id');

        $this->putJson("/api/v1/admin/access-control/roles/{$roleId}/permissions", ['permission_ids' => [$viewAppointments->id]])
            ->assertOk()
            ->assertJsonPath('data.permissions.0', 'appointments.view');

        $user = User::factory()->create(['role' => 'patient']);
        $this->putJson("/api/v1/admin/access-control/users/{$user->id}/roles", ['role_ids' => [$roleId]])
            ->assertOk();
        $this->assertTrue($user->fresh()->hasRole('support-admin'));
        $this->assertSame('support-admin', $user->fresh()->role);

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
