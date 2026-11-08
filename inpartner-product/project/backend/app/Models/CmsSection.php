<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CmsSection extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'content' => 'array',
            'settings' => 'array',
            'draft_content' => 'array',
            'sort_order' => 'integer',
            'is_active' => 'boolean',
            'is_published' => 'boolean',
        ];
    }

    public function translations(): HasMany
    {
        return $this->hasMany(CmsSectionTranslation::class);
    }

    public function scopeActive(Builder $q): Builder
    {
        return $q->where('is_active', true);
    }

    public function scopePublished(Builder $q): Builder
    {
        return $q->where('is_published', true);
    }

    public function localized(?string $locale = null, bool $useDraft = false): array
    {
        $loc = in_array($locale, ['id', 'en', 'ko'], true) ? $locale : 'id';
        $activeContent = ($useDraft && !empty($this->draft_content)) ? $this->draft_content : ($this->content ?? []);

        $translation = $loc !== 'id' ? $this->translations->firstWhere('locale', $loc) : null;

        $title = $translation?->title ?: ($activeContent['title'] ?? $this->title);
        $subtitle = $translation?->subtitle ?: ($activeContent['subtitle'] ?? $this->subtitle);
        $content = array_merge($activeContent, $translation?->content ?? []);

        return [
            'id' => $this->id,
            'key' => $this->key,
            'type' => $this->type,
            'title' => $title,
            'subtitle' => $subtitle,
            'content' => $content,
            'settings' => $this->settings ?? [],
            'sort_order' => (int) $this->sort_order,
            'is_active' => (bool) $this->is_active,
            'is_published' => (bool) $this->is_published,
            'has_draft' => !empty($this->draft_content),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}

