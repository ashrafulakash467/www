<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\StoreSettingRequest;
use App\Http\Requests\Settings\UpdateSettingRequest;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class SettingsController extends Controller
{
    /**
     * GET /settings
     * Public endpoint — active, non-private settings as a flat map.
     */
    public function publicIndex(): JsonResponse
    {
        return response()->json([
            'settings' => Setting::publicMap(),
            'meta' => [
                'lastUpdatedAt' => Setting::query()->latest('updated_at')->value('updated_at')?->toISOString(),
            ],
        ]);
    }

    /**
     * GET /settings/page/{slug}
     * Public endpoint — renders a single policy/static page stored as a setting.
     */
    public function page(string $slug): JsonResponse
    {
        $policy = collect(Setting::publicMap())
            ->filter(fn ($value, string $key) => str_starts_with($key, 'policy:'))
            ->filter(fn ($value, string $key) => $value === $slug)
            ->keys()
            ->first();

        if (! $policy) {
            return response()->json(['message' => 'Page not found.'], 404);
        }

        $name = Str::beforeLast(Str::after($policy, 'policy:'), '_slug');

        $title = Setting::query()
            ->where('key', "policy:{$name}_title")
            ->where('is_active', true)
            ->value('value') ?? Str::headline(str_replace('_', ' ', $name));

        $content = Setting::query()
            ->where('key', "policy:{$name}_content")
            ->where('is_active', true)
            ->value('value') ?? '';

        $enabled = (bool) Setting::query()
            ->where('key', "policy:{$name}_enabled")
            ->where('is_active', true)
            ->value('value');

        return response()->json([
            'page' => [
                'slug' => $name,
                'title' => $title,
                'content' => $content,
                'enabled' => $enabled,
            ],
        ]);
    }
/**
     * GET /admin/settings
     * Admin endpoint — returns every setting with metadata, grouped.
     */
    public function index(): JsonResponse
    {
        $settings = Setting::query()
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn (Setting $setting): array => $this->formatSetting($setting))
            ->values();

        $groups = $settings->groupBy('group')
            ->map(fn ($items) => $items->values())
            ->values();

        return response()->json([
            'settings' => $settings,
            'groups' => $groups,
        ]);
    }

    /**
     * POST /admin/settings
     * Admin endpoint — create a brand-new setting.
     */
    public function store(StoreSettingRequest $request): JsonResponse
    {
        $data = $request->validated();

        $setting = Setting::create([
            'key' => $data['key'],
            'label' => $data['label'],
            'group' => $data['group'],
            'type' => $data['type'],
            'value' => (string) ($data['value'] ?? ''),
            'hint' => $data['hint'] ?? null,
            'sort_order' => (int) ($data['sort_order'] ?? 0),
            'is_active' => (bool) ($data['is_active'] ?? true),
            'is_private' => (bool) ($data['is_private'] ?? false),
        ]);

        Setting::forgetAllCaches();

        return response()->json([
            'message' => 'Setting created successfully.',
            'setting' => $this->formatSetting($setting->fresh()),
        ], 201);
    }

    /**
     * PUT /admin/settings/{settingId}
     * Admin endpoint — update a setting's value / metadata or upload an image.
     */
    public function update(UpdateSettingRequest $request, int $settingId): JsonResponse
    {
        $setting = Setting::query()->findOrFail($settingId);

        $data = $request->validated();

        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $filename = Str::slug($setting->key).'-'.time().'.'.$file->getClientOriginalExtension();
            $file->storeAs('settings', $filename, 'public');
            $data['value'] = $filename;
            $data['type'] = 'image';
        }

        $fillable = collect($data)
            ->only(['key', 'label', 'group', 'type', 'value', 'hint', 'sort_order', 'is_active', 'is_private']);

        if ($fillable->isEmpty() && ! $request->hasFile('image')) {
            throw ValidationException::withMessages([
                'value' => ['Nothing to update. Provide at least one setting field.'],
            ]);
        }

        $setting->forceFill($fillable->all())->save();

        Setting::forgetAllCaches();

        return response()->json([
            'message' => 'Setting updated successfully.',
            'setting' => $this->formatSetting($setting->fresh()),
        ]);
    }

    /**
     * PUT /admin/settings/{settingId}/toggle
     * Admin endpoint — enable / disable a setting.
     */
    public function toggle(int $settingId): JsonResponse
    {
        $setting = Setting::query()->findOrFail($settingId);
        $setting->is_active = ! $setting->is_active;
        $setting->save();

        Setting::forgetAllCaches();

        return response()->json([
            'message' => $setting->is_active ? 'Setting enabled.' : 'Setting disabled.',
            'setting' => $this->formatSetting($setting->fresh()),
        ]);
    }

    /**
     * DELETE /admin/settings/{settingId}
     * Admin endpoint — permanently delete a setting.
     */
    public function destroy(int $settingId): JsonResponse
    {
        $setting = Setting::query()->findOrFail($settingId);
        $setting->delete();

        Setting::forgetAllCaches();

        return response()->json([
            'message' => 'Setting deleted successfully.',
            'id' => $settingId,
        ]);
    }

    /**
     * GET /settings/asset/{filename}
     * Public endpoint — serves an uploaded setting asset (logo, favicon, ...).
     */
    public function asset(string $filename): \Symfony\Component\HttpFoundation\BinaryFileResponse|JsonResponse
    {
        $filename = basename($filename);
        $path = storage_path('app/public/settings/'.$filename);

        if (! is_file($path)) {
            return response()->json(['message' => 'Asset not found.'], 404);
        }

        return response()->file($path);
    }

    private function formatSetting(Setting $setting): array
    {
        return [
            'id' => $setting->id,
            'key' => $setting->key,
            'label' => $setting->label,
            'group' => $setting->group,
            'type' => $setting->type,
            'value' => $setting->value,
            'castValue' => $setting->castValue(),
            'hint' => $setting->hint,
            'sortOrder' => $setting->sort_order,
            'isActive' => $setting->is_active,
            'isPrivate' => $setting->is_private,
            'updatedAt' => $setting->updated_at?->toISOString(),
        ];
    }
}
