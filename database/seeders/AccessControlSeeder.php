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
            'payments.view',
            'payments.view_details',
            'payments.create',
            'payments.edit',
            'payments.delete',
            'payments.transactions',
            'payments.revenue',
            'payments.export',
            'refunds.view',
            'refunds.approve',
            'refunds.reject',
            'refunds.process',
            'manage-content',
            'manage-reports',
            'manage-notifications',
            'manage-support',
            'manage-roles',
            'manage-settings',
            'view-audit-logs',
            'view-earnings',
            'manage-schedule',
            'dashboard.view',
            'doctors.view', 'doctors.create', 'doctors.edit', 'doctors.delete', 'doctors.verify', 'doctors.approve', 'doctors.reject', 'doctors.manage',
            'patients.view', 'patients.create', 'patients.edit', 'patients.delete', 'patients.manage',
            'appointments.view', 'appointments.create', 'appointments.edit', 'appointments.delete', 'appointments.approve', 'appointments.reject', 'appointments.manage', 'appointments.print', 'appointments.export',
            'payments.manage', 'payments.print',
            'refunds.manage', 'refunds.export',
            'earnings.view', 'earnings.manage', 'earnings.export',
            'medical-records.view', 'medical-records.create', 'medical-records.edit', 'medical-records.delete', 'medical-records.manage', 'medical-records.print', 'medical-records.export',
            'prescriptions.view', 'prescriptions.create', 'prescriptions.edit', 'prescriptions.delete', 'prescriptions.manage', 'prescriptions.print',
            'support.view', 'support.assign', 'support.manage',
            'reports.view', 'reports.create', 'reports.manage', 'reports.print', 'reports.export',
            'notifications.view', 'notifications.manage', 'notifications.delete',
            'users.view', 'users.create', 'users.edit', 'users.delete', 'users.assign', 'users.manage',
            'roles.view', 'roles.create', 'roles.edit', 'roles.delete', 'roles.assign', 'roles.manage',
            'audit.view', 'audit.export',
            'settings.view', 'settings.edit', 'settings.manage',
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
