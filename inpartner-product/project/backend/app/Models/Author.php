<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Author extends Model
{
    protected $guarded = ['id'];

    protected static function booted(): void
    {
        static::saving(function (Author $a) {
            if (empty($a->slug)) {
                $a->slug = Str::slug($a->name);
            }
        });
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public static function resolveByName(?string $name): ?self
    {
        $name = trim((string) $name);
        if ($name === '') {
            return null;
        }

        return static::firstOrCreate(['slug' => Str::slug($name)], ['name' => $name]);
    }
}
