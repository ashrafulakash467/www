<?php

namespace App\Http\Requests\Settings;

use App\Models\Setting;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Validate partial setting edits and optional setting-image uploads. */
class UpdateSettingRequest extends FormRequest
{
    /** Defer access control to the protected admin route group. */
    public function authorize(): bool
    {
        return true;
    }

    /** Validate partial setting changes and supported image uploads. */
    public function rules(): array
    {
        $settingId = $this->route('settingId');

        return [
            'key' => ['nullable', 'string', 'max:120', 'regex:/^[a-z0-9:_\-]+$/', Rule::unique('settings', 'key')->ignore($settingId)],
            'label' => ['nullable', 'string', 'max:190'],
            'group' => ['nullable', 'string', 'max:60'],
            'type' => ['nullable', Rule::in(Setting::TYPES)],
            'value' => ['nullable', 'string'],
            'hint' => ['nullable', 'string', 'max:500'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
            'is_private' => ['nullable', 'boolean'],
            'image' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,svg,webp,ico', 'max:4096'],
        ];
    }
}
