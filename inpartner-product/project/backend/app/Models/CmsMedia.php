<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CmsMedia extends Model
{
    protected $table = 'cms_media';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'size' => 'integer',
            'width' => 'integer',
            'height' => 'integer',
        ];
    }
}

