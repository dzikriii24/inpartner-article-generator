<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CmsPage extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'version' => 'integer',
            'draft_tree' => 'array',
            'published_tree' => 'array',
            'draft_updated_at' => 'datetime',
            'published_at' => 'datetime',
        ];
    }
}

