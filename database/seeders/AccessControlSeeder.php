<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class AccessControlSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $guardName = config('auth.defaults.guard', 'web');
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permissions = [
            'access-admin-panel',
            'access-doctor-panel',
            'access-patient-panel',
            'manage-users',
            'manage-doctors',
            'manage-appointments',
            'manage-payments',
            'manage-content',
            'manage-reports',
            'manage-notifications',
            'manage-support',
            'manage-roles',
            'manage-settings',
            'view-audit-logs',
            'view-earnings',
            'manage-schedule',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate([
                'name' => $permission,
                'guard_name' => $guardName,
            ]);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $roles = [
            'super-admin' => $permissions,
            'admin' => $permissions,
            'doctor' => [
                'access-doctor-panel',
                'manage-appointments',
                'manage-schedule',
                'view-earnings',
            ],
            'patient' => [
                'access-patient-panel',
                'manage-appointments',
            ],
        ];

        Role::query()->where('name', 'hospital')->delete();
        Permission::query()
            ->whereIn('name', ['access-hospital-panel', 'manage-hospitals'])
            ->delete();

        foreach ($roles as $roleName => $rolePermissions) {
            $role = Role::firstOrCreate([
                'name' => $roleName,
                'guard_name' => $guardName,
            ]);
            $role->syncPermissions($rolePermissions);
        }
    }
}
