<?php

namespace App\Http\Requests\Settings;

use App\Models\Setting;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSettingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'key' => ['required', 'string', 'max:120', 'regex:/^[a-z0-9:_\-]+$/', Rule::unique('settings', 'key')],
            'label' => ['required', 'string', 'max:190'],
            'group' => ['required', 'string', 'max:60'],
            'type' => ['required', Rule::in(Setting::TYPES)],
            'value' => ['nullable', 'string'],
            'hint' => ['nullable', 'string', 'max:500'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
            'is_private' => ['nullable', 'boolean'],
        ];
    }
}