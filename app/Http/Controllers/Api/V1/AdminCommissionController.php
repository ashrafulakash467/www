<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Doctor;
use App\Models\Setting;
use App\Services\EarningService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Manage global and doctor-specific commission percentages for administrators. */
/** Frontend mental model: this is the API layer behind commission settings forms and tables. */
class AdminCommissionController extends Controller
{
    // Laravel injects the service here, like receiving a configured API client through props/context.
    public function __construct(private readonly EarningService $earnings) {}

    /** Return default commission values and effective percentages for active doctors. */
    public function index(Request $request): JsonResponse
    {
        // Backend authorization runs before any protected data is read or changed.
        $this->authorizeAdmin($request);

        // Business calculations live in a service so controllers stay focused on HTTP input/output.
        $defaultDoctorPercentage = $this->earnings->getDefaultDoctorPercentage();
        $defaultAdminPercentage = $this->earnings->getDefaultAdminPercentage();

        // Eloquent builds the SQL query; with('user') preloads names used by the response mapper.
        $doctors = Doctor::query()
            ->with('user')
            ->where('status', 'active')
            ->orderBy('id')
            ->get()
            ->map(fn (Doctor $doctor): array => [
                'id' => $doctor->id,
                'name' => $doctor->user?->name ?? 'Doctor #' . $doctor->id,
                'specialty' => $doctor->specialty,
                'custom_percentage' => $doctor->doctor_percentage !== null ? (float) $doctor->doctor_percentage : null,
                'effective_percentage' => $this->earnings->getDoctorPercentage($doctor),
                'effective_from' => $doctor->percentage_effective_from?->toDateString(),
            ])
            ->values();

        return response()->json([
            'success' => true,
            'data' => [
                'default_doctor_percentage' => $defaultDoctorPercentage,
                'default_admin_percentage' => $defaultAdminPercentage,
                'doctors' => $doctors,
            ],
        ]);
    }

    /** Replace the platform-wide doctor and administrator commission split. */
    public function updateDefaults(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        // validate() is the backend equivalent of form-schema validation; failures return HTTP 422.
        $validated = $request->validate([
            'doctor_percentage' => ['required', 'numeric', 'min:0', 'max:100'],
            'admin_percentage' => ['required', 'numeric', 'min:0', 'max:100'],
        ]);

        $doctorPercentage = (float) $validated['doctor_percentage'];
        $adminPercentage = (float) $validated['admin_percentage'];

        // Both shares must describe the complete consultation-fee distribution.
        if (abs(($doctorPercentage + $adminPercentage) - 100) > 0.01) {
            throw ValidationException::withMessages([
                'admin_percentage' => ['Doctor percentage + Admin percentage must equal 100%.'],
            ]);
        }

        // Store both defaults atomically so readers never see a mismatched pair.
        DB::transaction(function () use ($doctorPercentage, $adminPercentage): void {
            $this->upsertSetting('commission.default_doctor_percentage', $doctorPercentage);
            $this->upsertSetting('commission.default_admin_percentage', $adminPercentage);
        });

        // Clear cached settings so the next request immediately sees the new percentages.
        Setting::forgetAllCaches();

        return response()->json([
            'success' => true,
            'message' => 'Default commission percentages updated.',
            'data' => [
                'default_doctor_percentage' => $doctorPercentage,
                'default_admin_percentage' => $adminPercentage,
            ],
        ]);
    }

    /** Assign a custom commission percentage to one doctor. */
    public function updateDoctor(Request $request, int $doctorId): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'doctor_percentage' => ['required', 'numeric', 'min:0', 'max:100'],
            'admin_percentage' => ['required', 'numeric', 'min:0', 'max:100'],
            'effective_from' => ['nullable', 'date'],
        ]);

        $doctorPercentage = (float) $validated['doctor_percentage'];
        $adminPercentage = (float) $validated['admin_percentage'];

        if (abs(($doctorPercentage + $adminPercentage) - 100) > 0.01) {
            throw ValidationException::withMessages([
                'admin_percentage' => ['Doctor percentage + Admin percentage must equal 100%.'],
            ]);
        }

        // findOrFail behaves like a fetch that automatically returns HTTP 404 when missing.
        $doctor = Doctor::with('user')->findOrFail($doctorId);

        $doctor->update([
            'doctor_percentage' => $doctorPercentage,
            'percentage_effective_from' => $validated['effective_from'] ?? now()->startOfDay(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Doctor commission percentage updated.',
            'data' => [
                'id' => $doctor->id,
                'name' => $doctor->user?->name ?? 'Doctor #' . $doctor->id,
                'custom_percentage' => (float) $doctor->doctor_percentage,
                'effective_percentage' => $this->earnings->getDoctorPercentage($doctor),
                'effective_from' => $doctor->percentage_effective_from?->toDateString(),
            ],
        ]);
    }

    /** Remove a custom split so the doctor inherits the platform defaults. */
    public function removeDoctorPercentage(Request $request, int $doctorId): JsonResponse
    {
        $this->authorizeAdmin($request);

        $doctor = Doctor::findOrFail($doctorId);

        // Null values intentionally restore the current global commission defaults.
        $doctor->update([
            'doctor_percentage' => null,
            'percentage_effective_from' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Doctor custom percentage removed. Default will be used.',
        ]);
    }

    /** Create or update one private commission setting. */
    private function upsertSetting(string $key, float $value): void
    {
        // first() returns a model or null, allowing this helper to implement update-or-create behavior.
        $setting = Setting::query()->where('key', $key)->first();

        if ($setting) {
            $setting->update(['value' => (string) $value]);
        } else {
            Setting::create([
                'group' => 'commission',
                'key' => $key,
                'label' => str_replace(['commission.', '_'], ['', ' '], $key),
                'type' => 'number',
                'value' => (string) $value,
                'hint' => 'Commission percentage',
                'is_active' => true,
                'is_private' => true,
            ]);
        }
    }

    /** Guard commission operations against non-administrator accounts. */
    private function authorizeAdmin(Request $request): void
    {
        $user = $request->user();
        // abort_unless stops the request with HTTP 403, similar to a protected frontend route guard.
        abort_unless($user?->hasAnyRole(['admin', 'super-admin']), 403);
    }
}
