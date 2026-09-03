<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\User;
use App\Notifications\PasswordResetLinkNotification;
use App\Services\DoctorSlotSyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        $data = $request->validated();
        $identifier = trim((string) ($data['identifier'] ?? $data['email'] ?? $data['phone'] ?? ''));
        $role = $request->route('role') ?? ($data['role'] ?? null);

        $user = User::query()
            ->with(['roles', 'permissions'])
            ->where(function ($query) use ($identifier): void {
                $query->where('email', $identifier)
                    ->orWhere('phone', $identifier);

            })
            ->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'identifier' => ['Invalid login credentials.'],
            ]);
        }

        if ($role && ! $user->hasRole($role)) {
            throw ValidationException::withMessages([
                'role' => ["This account is not assigned to the {$role} portal."],
            ]);
        }

        if (! $user->hasAnyRole(['admin', 'super-admin']) && $user->status !== 'active') {
            throw ValidationException::withMessages([
                'identifier' => ['Your account is not active yet.'],
            ]);
        }

        $user->forceFill([
            'last_login_at' => now(),
        ])->save();

        $abilities = $user->getRoleNames()->isNotEmpty()
            ? $user->getRoleNames()->values()->all()
            : ['user'];

        $token = $user->createToken('healthcare-api', $abilities)->plainTextToken;

        return response()->json([
            'message' => 'Login successful.',
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => new UserResource($user->fresh([
                'roles',
                'permissions',
                'patient',
                'doctor',
            ])),
        ]);
    }

    public function register(RegisterRequest $request): JsonResponse
    {
        $data = $request->validated();
        $role = $request->route('role') ?? ($data['role'] ?? 'patient');

        if ($role === 'admin') {
            throw ValidationException::withMessages([
                'role' => ['Admin accounts are provisioned manually.'],
            ]);
        }

        $user = User::create([
            'name' => $data['name'],
            'role' => $role,
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'password' => $data['password'],
            'status' => $role === 'doctor' ? 'pending_verification' : 'active',
        ]);

        $user->assignRole($role);

        if ($role === 'doctor') {
            $doctor = Doctor::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'specialty' => 'General Medicine',
                    'sub_specialty' => null,
                    'bio' => null,
                    'qualification' => null,
                    'gender' => null,
                    'consultation_fee' => 0,
                    'follow_up_fee' => null,
                    'image_path' => null,
                    'chamber_address' => null,
                    'city' => null,
                    'state' => null,
                    'country' => null,
                    'verification_status' => 'pending',
                    'status' => 'active',
                ],
            );

            app(DoctorSlotSyncService::class)->sync($doctor->fresh('schedules'));
        } elseif ($role === 'patient') {
            Patient::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'country' => 'Bangladesh',
                    'status' => 'active',
                ],
            );
        }

        $user->refresh()->load([
            'roles',
            'permissions',
            'patient',
            'doctor',
        ]);

        $token = $user->createToken('healthcare-api', [$role])->plainTextToken;

        return response()->json([
            'message' => 'Account created successfully.',
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => new UserResource($user->loadMissing([
                'roles',
                'permissions',
                'patient',
                'doctor',
            ])),
        ], 201);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'user' => new UserResource($user->loadMissing([
                'roles',
                'permissions',
                'patient',
                'doctor',
            ])),
        ]);
    }

    public function updateDoctorMe(Request $request): JsonResponse
    {
        $user = $request->user();
        $doctor = $user->doctor;

        if (! $doctor) {
            return response()->json([
                'message' => 'Doctor profile not found.',
            ], 404);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:191',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
            'phone' => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('users', 'phone')->ignore($user->id),
            ],
            'specialty' => ['nullable', 'string', 'max:255'],
            'subSpecialty' => ['nullable', 'string', 'max:255'],
            'qualification' => ['nullable', 'string', 'max:255'],
            'bio' => ['nullable', 'string'],
            'gender' => ['nullable', 'string', 'max:20'],
            'consultationFee' => ['nullable', 'numeric', 'min:0'],
            'followUpFee' => ['nullable', 'numeric', 'min:0'],
            'licenseNo' => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('doctors', 'license_no')->ignore($doctor->id),
            ],
            'chamberAddress' => ['nullable', 'string', 'max:500'],
            'availableDates' => ['nullable'],
            'availableTimeSlots' => ['nullable'],
            'city' => ['nullable', 'string', 'max:255'],
            'state' => ['nullable', 'string', 'max:255'],
            'country' => ['nullable', 'string', 'max:255'],
            'currentPassword' => ['nullable', 'string', 'required_with:newPassword,confirmPassword', 'max:255'],
            'newPassword' => ['nullable', 'string', 'required_with:currentPassword,confirmPassword', 'min:8', 'max:255'],
            'confirmPassword' => ['nullable', 'string', 'required_with:newPassword', 'same:newPassword', 'max:255'],
        ]);

        if (filled($validated['newPassword'] ?? null) && ! Hash::check((string) ($validated['currentPassword'] ?? ''), $user->password)) {
            throw ValidationException::withMessages([
                'currentPassword' => ['Current password is incorrect.'],
            ]);
        }

        $availableDates = $this->normalizeListField($validated['availableDates'] ?? null);
        $availableTimeSlots = $this->normalizeListField($validated['availableTimeSlots'] ?? null);

        DB::transaction(function () use ($user, $doctor, $validated, $availableDates, $availableTimeSlots): void {
            $user->forceFill([
                'name' => trim((string) $validated['name']),
                'email' => trim((string) $validated['email']),
                'phone' => filled($validated['phone'] ?? null) ? trim((string) $validated['phone']) : null,
            ])->save();

            if (filled($validated['newPassword'] ?? null)) {
                $user->forceFill([
                    'password' => $validated['newPassword'],
                ])->save();
            }

            $doctor->forceFill([
                'specialty' => filled($validated['specialty'] ?? null) ? trim((string) $validated['specialty']) : null,
                'sub_specialty' => filled($validated['subSpecialty'] ?? null) ? trim((string) $validated['subSpecialty']) : null,
                'qualification' => filled($validated['qualification'] ?? null) ? trim((string) $validated['qualification']) : null,
                'bio' => filled($validated['bio'] ?? null) ? trim((string) $validated['bio']) : null,
                'gender' => filled($validated['gender'] ?? null) ? trim((string) $validated['gender']) : null,
                'consultation_fee' => $validated['consultationFee'] ?? null,
                'follow_up_fee' => $validated['followUpFee'] ?? null,
                'license_no' => filled($validated['licenseNo'] ?? null) ? trim((string) $validated['licenseNo']) : null,
                'chamber_address' => filled($validated['chamberAddress'] ?? null) ? trim((string) $validated['chamberAddress']) : null,
                'available_dates' => $availableDates,
                'available_time_slots' => $availableTimeSlots,
                'city' => filled($validated['city'] ?? null) ? trim((string) $validated['city']) : null,
                'state' => filled($validated['state'] ?? null) ? trim((string) $validated['state']) : null,
                'country' => filled($validated['country'] ?? null) ? trim((string) $validated['country']) : null,
            ])->save();
        });

        app(DoctorSlotSyncService::class)->sync($doctor->fresh('schedules'));

        $freshUser = $user->fresh([
            'roles',
            'permissions',
            'patient',
            'doctor',
        ]);

        return response()->json([
            'message' => 'Doctor profile updated successfully.',
            'user' => new UserResource($freshUser),
        ]);
    }

    public function updateMe(Request $request): JsonResponse
    {
        $user = $request->user();
        $patient = $user->patient;

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:191',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
            'phone' => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('users', 'phone')->ignore($user->id),
            ],
            'mrn' => [
                'nullable',
                'string',
                'max:100',
                Rule::unique('patients', 'mrn')->ignore($patient?->id),
            ],
            'gender' => ['nullable', 'string', 'max:20'],
            'bloodGroup' => ['nullable', 'string', 'max:20'],
            'dateOfBirth' => ['nullable', 'date'],
            'city' => ['nullable', 'string', 'max:255'],
            'state' => ['nullable', 'string', 'max:255'],
            'currentPassword' => ['nullable', 'string', 'required_with:newPassword,confirmPassword', 'max:255'],
            'newPassword' => ['nullable', 'string', 'required_with:currentPassword,confirmPassword', 'min:8', 'max:255'],
            'confirmPassword' => ['nullable', 'string', 'required_with:newPassword', 'same:newPassword', 'max:255'],
        ]);

        if (filled($validated['newPassword'] ?? null) && ! Hash::check((string) ($validated['currentPassword'] ?? ''), $user->password)) {
            throw ValidationException::withMessages([
                'currentPassword' => ['Current password is incorrect.'],
            ]);
        }

        DB::transaction(function () use ($user, $patient, $validated): void {
            $user->forceFill([
                'name' => trim((string) $validated['name']),
                'email' => trim((string) $validated['email']),
                'phone' => filled($validated['phone'] ?? null) ? trim((string) $validated['phone']) : null,
            ])->save();

            if (filled($validated['newPassword'] ?? null)) {
                $user->forceFill([
                    'password' => $validated['newPassword'],
                ])->save();
            }

            $patientRecord = $patient ?? new Patient([
                'user_id' => $user->id,
                'status' => 'active',
            ]);

            $patientRecord->fill([
                'name' => trim((string) $validated['name']),
                'email' => trim((string) $validated['email']),
                'phone' => filled($validated['phone'] ?? null) ? trim((string) $validated['phone']) : null,
                'mrn' => filled($validated['mrn'] ?? null) ? trim((string) $validated['mrn']) : null,
                'gender' => filled($validated['gender'] ?? null) ? trim((string) $validated['gender']) : null,
                'blood_group' => filled($validated['bloodGroup'] ?? null) ? trim((string) $validated['bloodGroup']) : null,
                'date_of_birth' => filled($validated['dateOfBirth'] ?? null) ? $validated['dateOfBirth'] : null,
                'city' => filled($validated['city'] ?? null) ? trim((string) $validated['city']) : null,
                'state' => filled($validated['state'] ?? null) ? trim((string) $validated['state']) : null,
                'country' => 'Bangladesh',
            ]);

            $patientRecord->save();
        });

        $freshUser = $user->fresh(['roles', 'permissions', 'patient']);

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user' => new UserResource($freshUser),
        ]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $user = User::query()->where('email', $data['email'])->first();

        if (! $user) {
            return response()->json([
                'message' => 'Email not matched with any user.',
            ], 404);
        }

        $token = Str::random(64);

        try {
            DB::table('password_reset_tokens')->updateOrInsert(
                ['email' => $data['email']],
                [
                    'token' => Hash::make($token),
                    'created_at' => now(),
                ],
            );

            $user->notify(new PasswordResetLinkNotification($token));
        } catch (\Throwable $throwable) {
            report($throwable);

            return response()->json([
                'message' => 'Could not send the reset email right now. Please try again later.',
            ], 500);
        }

        return response()->json([
            'message' => 'We sent a password reset link to your email address.',
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['nullable', 'email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        if (blank($data['email'])) {
            throw ValidationException::withMessages([
                'email' => ['Email is required to reset the password.'],
            ]);
        }

        $tokenRecord = DB::table('password_reset_tokens')
            ->where('email', $data['email'])
            ->first();

        if (! $tokenRecord) {
            throw ValidationException::withMessages([
                'token' => ['Invalid or expired reset token.'],
            ]);
        }

        if ($tokenRecord->created_at && now()->diffInMinutes($tokenRecord->created_at) > 15) {
            throw ValidationException::withMessages([
                'token' => ['Invalid or expired reset token.'],
            ]);
        }

        if (! Hash::check($data['token'], $tokenRecord->token)) {
            throw ValidationException::withMessages([
                'token' => ['Invalid or expired reset token.'],
            ]);
        }

        $user = User::query()->where('email', $data['email'])->firstOrFail();
        $user->forceFill([
            'password' => $data['password'],
        ])->save();

        DB::table('password_reset_tokens')->where('email', $data['email'])->delete();

        return response()->json([
            'message' => 'Password has been reset successfully.',
        ]);
    }

    private function normalizeListField(mixed $value): array
    {
        if (is_array($value)) {
            return array_values(array_filter(array_map(
                static fn ($item) => trim((string) $item),
                $value,
            )));
        }

        if (! is_string($value)) {
            return [];
        }

        $trimmed = trim($value);
        if ($trimmed === '') {
            return [];
        }

        $decoded = json_decode($trimmed, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            return array_values(array_filter(array_map(
                static fn ($item) => trim((string) $item),
                $decoded,
            )));
        }

        $parts = preg_split('/[\r\n,]+/', $trimmed) ?: [];

        return array_values(array_filter(array_map(
            static fn ($item) => trim((string) $item),
            $parts,
        )));
    }
}
