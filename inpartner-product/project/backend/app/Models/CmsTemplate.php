<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CmsTemplate extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'section_data' => 'array',
            'is_system' => 'boolean',
        ];
    }
}

