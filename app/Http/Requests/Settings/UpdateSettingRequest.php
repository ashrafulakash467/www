<?php

namespace App\Http\Requests\Settings;

use App\Models\Setting;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSettingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

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