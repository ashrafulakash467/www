<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class Setting extends Model
{
    use HasFactory;

    /**
     * Allowed value types for a setting.
     */
    public const TYPES = [
        'text',
        'textarea',
        'url',
        'number',
        'boolean',
        'image',
    ];

    protected $fillable = [
        'group',
        'key',
        'label',
        'type',
        'value',
        'hint',
        'sort_order',
        'is_active',
        'is_private',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'is_private' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    /**
     * Cast a stored value to the native type for the setting.
     */
    public function castValue(mixed $value = null): mixed
    {
        $value ??= $this->value;

        return match ($this->type) {
            'boolean' => (bool) $value,
            'number' => str_contains((string) $value, '.') ? (float) $value : (int) $value,
            'image' => $this->assetUrl($value),
            default => (string) ($value ?? ''),
        };
    }

    /**
     * Turn a stored image value in to a browser-accessible URL.
     */
    public function assetUrl(?string $value = null): ?string
    {
        $value ??= $this->value;

        if (blank($value)) {
            return null;
        }

        if (Str::startsWith($value, ['http://', 'https://', '/'])) {
            return $value;
        }

        return url('/settings/asset/'.$value);
    }

    /**
     * Merge the active, public settings into a flat key => value map.
     *
     * @return array<string, mixed>
     */
    public static function publicMap(): array
    {
        return Cache::remember('settings.public', now()->addMinutes(5), function (): array {
            $map = [];

            Setting::query()
                ->where('is_active', true)
                ->where('is_private', false)
                ->orderBy('sort_order')
                ->get()
                ->each(function (Setting $setting) use (&$map): void {
                    $map[$setting->key] = $setting->castValue();
                });

            return $map;
        });
    }

    /**
     * Merge all active settings (including private ones) into a flat map.
     * Used internally by the API.
     *
     * @return array<string, mixed>
     */
    public static function fullMap(): array
    {
        $map = [];

        Setting::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get()
            ->each(function (Setting $setting) use (&$map): void {
                $map[$setting->key] = $setting->castValue();
            });

        return $map;
    }

    public static function forgetAllCaches(): void
    {
        Cache::forget('settings.public');
    }

    public static function castKey(mixed $value): string
    {
        return Str::lower((string) $value);
    }
}