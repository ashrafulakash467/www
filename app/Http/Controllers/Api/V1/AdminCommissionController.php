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

class AdminCommissionController extends Controller
{
    public function __construct(private readonly EarningService $earnings) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $defaultDoctorPercentage = $this->earnings->getDefaultDoctorPercentage();
        $defaultAdminPercentage = $this->earnings->getDefaultAdminPercentage();

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

    public function updateDefaults(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'doctor_percentage' => ['required', 'numeric', 'min:0', 'max:100'],
            'admin_percentage' => ['required', 'numeric', 'min:0', 'max:100'],
        ]);

        $doctorPercentage = (float) $validated['doctor_percentage'];
        $adminPercentage = (float) $validated['admin_percentage'];

        if (abs(($doctorPercentage + $adminPercentage) - 100) > 0.01) {
            throw ValidationException::withMessages([
                'admin_percentage' => ['Doctor percentage + Admin percentage must equal 100%.'],
            ]);
        }

        DB::transaction(function () use ($doctorPercentage, $adminPercentage): void {
            $this->upsertSetting('commission.default_doctor_percentage', $doctorPercentage);
            $this->upsertSetting('commission.default_admin_percentage', $adminPercentage);
        });

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

    public function removeDoctorPercentage(Request $request, int $doctorId): JsonResponse
    {
        $this->authorizeAdmin($request);

        $doctor = Doctor::findOrFail($doctorId);

        $doctor->update([
            'doctor_percentage' => null,
            'percentage_effective_from' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Doctor custom percentage removed. Default will be used.',
        ]);
    }

    private function upsertSetting(string $key, float $value): void
    {
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

    private function authorizeAdmin(Request $request): void
    {
        $user = $request->user();
        abort_unless($user?->hasAnyRole(['admin', 'super-admin']), 403);
    }
}
