<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthenticatedSessionController extends Controller
{
    public function store(LoginRequest $request): JsonResponse|RedirectResponse
    {
        $data = $request->validated();
        $identifier = trim((string) ($data['identifier'] ?? $data['email'] ?? $data['phone'] ?? ''));

        $user = User::query()
            ->with(['roles', 'permissions', 'patient', 'doctor'])
            ->where(function ($query) use ($identifier): void {
                $query->where('email', $identifier)
                    ->orWhere('phone', $identifier)
                    ->orWhere('username', $identifier);
            })
            ->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'identifier' => ['Invalid login credentials.'],
            ]);
        }

        $role = $user->getRoleNames()->first() ?? $user->role;
        if (! in_array($role, ['admin', 'super-admin'], true) && $user->status !== 'active') {
            throw ValidationException::withMessages([
                'identifier' => ['Your account is not active yet.'],
            ]);
        }

        Auth::login($user, $request->boolean('remember'));
        $request->session()->regenerate();

        $user->forceFill(['last_login_at' => now()])->save();

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Login successful.',
                'token' => 'session',
                'user' => new UserResource($user->fresh(['roles', 'permissions', 'patient', 'doctor'])),
            ]);
        }

        return redirect()->intended($this->dashboardFor($role));
    }

    public function destroy(Request $request): JsonResponse|RedirectResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Logged out successfully.',
            ]);
        }

        return redirect()->route('home');
    }

    private function dashboardFor(?string $role): string
    {
        return match ($role) {
            'admin', 'super-admin' => route('admin.dashboard'),
            'doctor' => route('doctor.dashboard'),
            default => route('patient.dashboard'),
        };
    }
}
