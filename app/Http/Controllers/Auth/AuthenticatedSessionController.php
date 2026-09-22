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

/** Create and destroy browser sessions for the unified login flow. */
/** Frontend mental model: this is the server-side equivalent of login/logout auth-store actions. */
class AuthenticatedSessionController extends Controller
{
    /** Validate credentials and establish the server-side web session. */
    public function store(LoginRequest $request): JsonResponse|RedirectResponse
    {
        // LoginRequest validates the submitted form before controller logic runs.
        $data = $request->validated();
        // One identifier input supports email, phone, or username login.
        $identifier = trim((string) ($data['identifier'] ?? $data['email'] ?? $data['phone'] ?? ''));

        // Eloquent builds the SQL query; with() eagerly loads data needed in the response.
        $user = User::query()
            ->with(['roles', 'permissions', 'patient', 'doctor'])
            // The nested callback groups these OR conditions together in generated SQL.
            ->where(function ($query) use ($identifier): void {
                $query->where('email', $identifier)
                    ->orWhere('phone', $identifier)
                    ->orWhere('username', $identifier);
            })
            // first() returns one User model or null instead of throwing a 404.
            ->first();

        // Hash::check compares the plain form password with the stored one-way hash.
        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'identifier' => ['Invalid login credentials.'],
            ]);
        }

        // Prefer the permission package role, with the legacy users.role column as fallback.
        $role = $user->getRoleNames()->first() ?? $user->role;
        // Inactive patient/doctor accounts cannot create a session; admins follow separate rules.
        if (! in_array($role, ['admin', 'super-admin'], true) && $user->status !== 'active') {
            throw ValidationException::withMessages([
                'identifier' => ['Your account is not active yet.'],
            ]);
        }

        // Auth::login stores the authenticated user ID in Laravel's server-side session.
        Auth::login($user, $request->boolean('remember'));
        // Generate a fresh session ID after authentication to prevent session fixation.
        $request->session()->regenerate();

        // forceFill sets this trusted server value; save() runs the database UPDATE.
        $user->forceFill(['last_login_at' => now()])->save();

        // The same endpoint supports fetch/AJAX clients and traditional form navigation.
        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Login successful.',
                'token' => 'session',
                'user' => new UserResource($user->fresh(['roles', 'permissions', 'patient', 'doctor'])),
            ]);
        }

        // intended() returns to the originally requested protected page when one was stored.
        return redirect()->intended($this->dashboardFor($role));
    }

    /** Log out safely by invalidating the session and rotating its CSRF token. */
    public function destroy(Request $request): JsonResponse|RedirectResponse
    {
        // Remove the authenticated identity from Laravel's web guard.
        Auth::guard('web')->logout();
        // Invalidate all old session data, then rotate the CSRF token used by forms/fetch calls.
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

    /** Select the default post-login dashboard for the account role. */
    private function dashboardFor(?string $role): string
    {
        // match is PHP's expression-style switch and returns the correct route URL.
        return match ($role) {
            'admin', 'super-admin' => route('admin.dashboard'),
            'doctor' => route('doctor.dashboard'),
            default => route('patient.dashboard'),
        };
    }
}
