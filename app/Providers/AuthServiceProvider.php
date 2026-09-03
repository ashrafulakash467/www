<?php

namespace App\Providers;

use App\Models\User;
use App\Policies\UserPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The model to policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        User::class => UserPolicy::class,
    ];

    /**
     * Register services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        $this->registerPolicies();

        Gate::define('access-admin-panel', fn (User $user) => $user->hasAnyRole(['admin', 'super-admin']));
        Gate::define('access-doctor-panel', fn (User $user) => $user->hasAnyRole(['doctor', 'admin', 'super-admin']));
        Gate::define('access-patient-panel', fn (User $user) => $user->hasAnyRole(['patient', 'admin', 'super-admin']));
    }
}
