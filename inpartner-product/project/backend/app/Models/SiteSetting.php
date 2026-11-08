<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SiteSetting extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'is_public' => 'boolean',
        ];
    }

    public static function get(string $key, $default = null)
    {
        $setting = static::where('key', $key)->first();
        if (!$setting) return $default;

        $decoded = json_decode($setting->value, true);
        return json_last_error() === JSON_ERROR_NONE ? $decoded : $setting->value;
    }

    public static function set(string $key, $value, string $group = 'general', bool $isPublic = true): self
    {
        $valStr = is_array($value) || is_object($value) ? json_encode($value) : (string)$value;
        return static::updateOrCreate(
            ['key' => $key],
            ['value' => $valStr, 'group' => $group, 'is_public' => $isPublic]
        );
    }

    public static function getGroup(string $group): array
    {
        return static::where('group', $group)->get()->mapWithKeys(function ($item) {
            $decoded = json_decode($item->value, true);
            $val = json_last_error() === JSON_ERROR_NONE ? $decoded : $item->value;
            return [$item->key => $val];
        })->all();
    }
}

