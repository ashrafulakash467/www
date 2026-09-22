<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Allow a request to continue only when the user has an active permitted role. */
class EnsureRole
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            abort(response()->json([
                'message' => 'Unauthenticated.',
            ], 401));
        }

        // Middleware arguments may use either pipes or commas; normalize both forms.
        $allowedRoles = collect($roles)
            ->flatMap(fn (string $roleList) => preg_split('/[|,]/', $roleList) ?: [])
            ->map(fn (string $role) => trim($role))
            ->filter()
            ->values()
            ->all();

        // A matching role must also be active in the access-control tables.
        $hasActiveRole = $user->roles()
            ->whereIn('name', $allowedRoles)
            ->where('is_active', true)
            ->exists();

        if (! $hasActiveRole) {
            abort(response()->json([
                'message' => 'You do not have permission to access this resource.',
            ], 403));
        }

        return $next($request);
    }
}
