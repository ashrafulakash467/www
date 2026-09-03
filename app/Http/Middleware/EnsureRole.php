<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

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

        $allowedRoles = collect($roles)
            ->flatMap(fn (string $roleList) => preg_split('/[|,]/', $roleList) ?: [])
            ->map(fn (string $role) => trim($role))
            ->filter()
            ->values()
            ->all();

        if (! $user->hasAnyRole($allowedRoles)) {
            abort(response()->json([
                'message' => 'You do not have permission to access this resource.',
            ], 403));
        }

        return $next($request);
    }
}
