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

/** Register patient or doctor accounts and create their matching profile records. */
/** Frontend mental model: this receives the registration form and returns the new session/user state. */
class RegisteredUserController extends Controller
{
    /** Register a web account and its patient or doctor profile atomically. */
    public function store(RegisterRequest $request): JsonResponse
    {
        // RegisterRequest is like a form schema: this method receives only fields that passed it.
        $data = $request->validated();
        // The matched Laravel route decides whether this submission creates a doctor or patient.
        $role = $request->routeIs('doctor.register.store') ? 'doctor' : 'patient';

        // ValidationException becomes an HTTP 422 response with an errors object for the frontend.
        if (! in_array($role, ['doctor', 'patient'], true)) {
            throw ValidationException::withMessages(['role' => ['Invalid account role.']]);
        }

        // A transaction is all-or-nothing: any failure rolls back the account and profile inserts.
        $user = DB::transaction(function () use ($data, $role): User {
            // Model::create() is the backend equivalent of inserting a new persisted record.
            $user = User::create([
                'name' => $data['name'],
                'username' => $data['username'] ?? null,
                'role' => $role,
                'email' => $data['email'],
                'phone' => $data['phone'] ?? null,
                'password' => $data['password'],
                'status' => $role === 'doctor' ? 'pending_verification' : 'active',
            ]);

            // assignRole writes the access-control relationship used by route middleware.
            $user->assignRole($role);

            // User holds shared login fields; Doctor/Patient stores role-specific profile fields.
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

            // Returning from the callback exposes the created model after the transaction commits.
            return $user;
        });

        // Patients may use the site immediately; doctors must first pass verification.
        if ($role === 'patient') {
            Auth::login($user);
            // Rotating the session ID prevents session-fixation attacks after login.
            $request->session()->regenerate();
        }

        // HTTP 201 means a new resource was created successfully.
        return response()->json([
            'success' => true,
            'message' => $role === 'doctor'
                ? 'Doctor account created and submitted for verification.'
                : 'Account created successfully.',
            'token' => $role === 'patient' ? 'session' : null,
            // UserResource is a serializer, similar to mapping raw API data into a frontend model.
            'user' => new UserResource($user->load(['roles', 'permissions', 'patient', 'doctor'])),
        ], 201);
    }
}
