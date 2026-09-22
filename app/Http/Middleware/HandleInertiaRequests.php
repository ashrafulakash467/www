<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

/** Share authentication and flash-message data with every Inertia response. */
class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    /** Merge global authentication and flash data into every Inertia response. */
    public function share(Request $request): array
    {
        $user = $request->user();
        $role = $user?->getRoleNames()->first() ?? $user?->role;

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user?->only(['id', 'name', 'email', 'phone', 'status']),
                'role' => $role === 'super-admin' ? 'admin' : $role,
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
        ];
    }
}
