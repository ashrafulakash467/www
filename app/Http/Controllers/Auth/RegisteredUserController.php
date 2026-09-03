<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RegisteredUserController extends Controller
{
    public function store(RegisterRequest $request): JsonResponse
    {
        $data = $request->validated();
        $role = $request->routeIs('doctor.register.store') ? 'doctor' : 'patient';

        if (! in_array($role, ['doctor', 'patient'], true)) {
            throw ValidationException::withMessages(['role' => ['Invalid account role.']]);
        }

        $user = DB::transaction(function () use ($data, $role): User {
            $user = User::create([
                'name' => $data['name'],
                'username' => $data['username'] ?? null,
                'role' => $role,
                'email' => $data['email'],
                'phone' => $data['phone'] ?? null,
                'password' => $data['password'],
                'status' => $role === 'doctor' ? 'pending_verification' : 'active',
            ]);

            $user->assignRole($role);

            if ($role === 'doctor') {
                Doctor::create([
                    'user_id' => $user->id,
                    'specialty' => 'General Medicine',
                    'verification_status' => 'pending',
                    'status' => 'active',
                ]);
            } else {
                Patient::create([
                    'user_id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'country' => 'Bangladesh',
                    'status' => 'active',
                ]);
            }

            return $user;
        });

        if ($role === 'patient') {
            Auth::login($user);
            $request->session()->regenerate();
        }

        return response()->json([
            'success' => true,
            'message' => $role === 'doctor'
                ? 'Doctor account created and submitted for verification.'
                : 'Account created successfully.',
            'token' => $role === 'patient' ? 'session' : null,
            'user' => new UserResource($user->load(['roles', 'permissions', 'patient', 'doctor'])),
        ], 201);
    }
}
