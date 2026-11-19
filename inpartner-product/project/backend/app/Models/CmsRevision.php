<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CmsRevision extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'version' => 'integer',
            'snapshot' => 'array',
        ];
    }
}

