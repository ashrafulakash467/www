<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/** Manage roles, permissions, user assignments, and their related audit records. */
/** Frontend mental model: it powers access-control forms and persists their submitted selections. */
class RolePermissionController extends Controller
{
    /** Return all roles and permissions for the access-control interface. */
    public function index(): JsonResponse
    {
        // Spatie Role and Permission are package models backed by database tables.
        return response()->json([
            'success' => true,
            'roles' => Role::query()->with('permissions')->orderBy('name')->get()->map(fn (Role $role) => $this->formatRole($role))->values(),
            'permissions' => Permission::query()->orderBy('name')->get()->map(fn (Permission $permission) => $this->formatPermission($permission))->values(),
        ]);
    }

    /** Search users and include their current role assignments. */
    public function users(Request $request): JsonResponse
    {
        $search = trim($request->string('search')->toString());
        $roleId = $request->integer('role_id');
        $query = User::query()->with('roles')->where(fn (Builder $builder) => $builder->whereNull('status')->orWhere('status', '!=', 'deleted'));

        if ($search !== '') {
            $query->where(fn (Builder $builder) => $builder
                ->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")
                ->orWhere('username', 'like', "%{$search}%"));
        }
        if ($roleId > 0) $query->whereHas('roles', fn (Builder $builder) => $builder->where('roles.id', $roleId));

        $users = $query->latest()->paginate(min(max($request->integer('per_page', 20), 1), 100));

        return response()->json([
            'success' => true,
            'data' => $users->getCollection()->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'status' => $user->status,
                'roles' => $user->roles->map(fn (Role $role) => ['id' => $role->id, 'name' => $role->name, 'isActive' => (bool) $role->is_active])->values(),
            ])->values(),
            'meta' => ['current_page' => $users->currentPage(), 'last_page' => $users->lastPage(), 'total' => $users->total()],
        ]);
    }

    /** Create an active web role with a unique normalized name. */
    public function storeRole(Request $request): JsonResponse
    {
        // Rule::unique prevents two web roles from using the same internal name.
        $data = $request->validate(['name' => ['required', 'string', 'max:100', 'regex:/^[a-z0-9][a-z0-9_-]*$/', Rule::unique('roles', 'name')->where('guard_name', 'web')]]);
        $role = Role::query()->create(['name' => strtolower($data['name']), 'guard_name' => 'web', 'is_active' => true]);
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $this->audit($request, 'Role created', $role, "Role {$role->name} was created.");

        return response()->json(['success' => true, 'message' => 'Role created successfully.', 'data' => $this->formatRole($role->load('permissions'))], 201);
    }

    /** Rename or activate a role while protecting critical system roles. */
    public function updateRole(Request $request, Role $role): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100', 'regex:/^[a-z0-9][a-z0-9_-]*$/', Rule::unique('roles', 'name')->where('guard_name', $role->guard_name)->ignore($role->id)],
            'is_active' => ['required', 'boolean'],
        ]);
        if ($role->name === 'super-admin' && ($data['name'] !== 'super-admin' || ! $data['is_active'])) {
            throw ValidationException::withMessages(['role' => ['The Super Admin role cannot be renamed or deactivated.']]);
        }
        if ($request->user()->hasRole($role->name) && $role->name === 'admin' && ($data['name'] !== 'admin' || ! $data['is_active'])) {
            $hasActiveSuperAdmin = $request->user()->roles()->where('name', 'super-admin')->where('is_active', true)->exists();
            if (! $hasActiveSuperAdmin) throw ValidationException::withMessages(['role' => ['You cannot rename or deactivate your own only critical Admin role.']]);
        }

        $oldName = $role->name;
        DB::transaction(function () use ($role, $data, $oldName): void {
            $role->forceFill(['name' => strtolower($data['name']), 'is_active' => $data['is_active']])->save();
            if ($oldName !== $role->name) User::query()->where('role', $oldName)->update(['role' => $role->name]);
        });
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $this->audit($request, 'Role updated', $role, "Role {$role->name} was updated.");

        return response()->json(['success' => true, 'message' => 'Role updated successfully.', 'data' => $this->formatRole($role->fresh('permissions'))]);
    }

    /** Delete an unused non-system role and clear permission caches. */
    public function destroyRole(Request $request, Role $role): JsonResponse
    {
        // Protected-role rules preserve a recovery path and prevent admin lockout.
        if ($role->name === 'super-admin') abort(422, 'The Super Admin role cannot be deleted.');
        if ($this->roleUsersCount($role) > 0) throw ValidationException::withMessages(['role' => ['Reassign users before deleting this role.']]);
        $name = $role->name;
        $role->delete();
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $this->audit($request, 'Role deleted', null, "Role {$name} was deleted.");

        return response()->json(['success' => true, 'message' => 'Role deleted successfully.']);
    }

    /** Replace a role's permission set with safeguards against admin lockout. */
    public function syncRolePermissions(Request $request, Role $role): JsonResponse
    {
        $data = $request->validate(['permission_ids' => ['present', 'array'], 'permission_ids.*' => ['integer', 'exists:permissions,id']]);
        // Convert submitted checkbox IDs into trusted Permission models.
        $permissions = Permission::query()->whereIn('id', $data['permission_ids'])->where('guard_name', $role->guard_name)->get();
        if ($role->name === 'super-admin' && $permissions->count() !== Permission::query()->where('guard_name', $role->guard_name)->count()) {
            throw ValidationException::withMessages(['permissions' => ['Permissions cannot be removed from the Super Admin role.']]);
        }
        if ($request->user()->hasRole($role->name) && ! $permissions->contains('name', 'manage-roles')) {
            $hasAlternativeAccess = $request->user()->roles()
                ->where('roles.id', '!=', $role->id)
                ->where('is_active', true)
                ->whereHas('permissions', fn (Builder $builder) => $builder->where('name', 'manage-roles'))
                ->exists();
            if (! $hasAlternativeAccess) throw ValidationException::withMessages(['permissions' => ['You cannot remove your own only Roles Management permission.']]);
        }
        // Spatie replaces the complete permission set and clears cached lookups.
        $role->syncPermissions($permissions);
        $this->audit($request, 'Role permissions updated', $role, "Permissions were updated for {$role->name}.");

        return response()->json(['success' => true, 'message' => 'Role permissions updated.', 'data' => $this->formatRole($role->fresh('permissions'))]);
    }

    /** Replace a user's roles while preventing critical self-lockout. */
    public function syncUserRoles(Request $request, User $user): JsonResponse
    {
        $data = $request->validate(['role_ids' => ['required', 'array', 'min:1'], 'role_ids.*' => ['integer', 'exists:roles,id']]);
        $roles = Role::query()->whereIn('id', $data['role_ids'])->where('guard_name', 'web')->get();
        if ($roles->count() !== count(array_unique($data['role_ids']))) throw ValidationException::withMessages(['roles' => ['One or more roles are invalid.']]);
        if ($roles->contains(fn (Role $role) => ! $role->is_active)) throw ValidationException::withMessages(['roles' => ['Inactive roles cannot be assigned.']]);

        $criticalRoles = ['admin', 'super-admin'];
        if ($request->user()->is($user) && ! $roles->contains(fn (Role $role) => in_array($role->name, $criticalRoles, true))) {
            throw ValidationException::withMessages(['roles' => ['You cannot remove your own critical Admin access.']]);
        }
        if ($user->hasRole('super-admin') && ! $request->user()->hasRole('super-admin')) abort(403, 'Only a Super Admin can change another Super Admin account.');

        // Keep package roles and the legacy users.role column in agreement.
        // Update package relationships and the legacy role column atomically.
        DB::transaction(function () use ($user, $roles): void {
            $user->syncRoles($roles);
            $primary = $roles->firstWhere('name', 'super-admin') ?? $roles->firstWhere('name', 'admin') ?? $roles->first();
            $user->forceFill(['role' => $primary?->name])->save();
        });
        $this->audit($request, 'User roles updated', $user, "Roles were updated for {$user->name}.");

        return response()->json(['success' => true, 'message' => 'User roles updated successfully.']);
    }

    /** Normalize a role and its permissions for the admin UI. */
    private function formatRole(Role $role): array
    {
        return [
            'id' => $role->id,
            'name' => $role->name,
            'label' => str($role->name)->replace(['-', '_'], ' ')->title()->toString(),
            'guardName' => $role->guard_name,
            'isActive' => (bool) $role->is_active,
            'isProtected' => $role->name === 'super-admin',
            'usersCount' => $this->roleUsersCount($role),
            'permissionIds' => $role->permissions->pluck('id')->values(),
            'permissions' => $role->permissions->pluck('name')->sort()->values(),
        ];
    }

    /** Convert a permission model into its display representation. */
    private function formatPermission(Permission $permission): array
    {
        $parts = preg_split('/[.\-]/', $permission->name, 2) ?: [$permission->name];
        return ['id' => $permission->id, 'name' => $permission->name, 'module' => $parts[0], 'action' => $parts[1] ?? 'manage'];
    }

    private function roleUsersCount(Role $role): int
    {
        $rolePivotKey = config('permission.column_names.role_pivot_key') ?: 'role_id';

        return DB::table(config('permission.table_names.model_has_roles', 'model_has_roles'))
            ->where($rolePivotKey, $role->id)
            ->where('model_type', User::class)
            ->count();
    }

    /** Record sensitive access-control changes in the audit log. */
    private function audit(Request $request, string $action, ?Model $subject, string $description): void
    {
        AuditLog::query()->create([
            'user_id' => $request->user()?->id,
            'action' => $action,
            'auditable_type' => $subject ? $subject::class : null,
            'auditable_id' => $subject?->getKey(),
            'description' => $description,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'url' => $request->fullUrl(),
        ]);
    }
}
