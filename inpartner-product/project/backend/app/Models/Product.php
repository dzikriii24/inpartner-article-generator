<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class Product extends Model
{
    public const TYPES = [
        'article' => 'Article',
        'ebook' => 'Ebook',
        'journal' => 'Journal',
        'research_paper' => 'Research Paper',
        'magazine' => 'Magazine',
        'digital_file' => 'Digital File',
    ];

    public const STATUSES = ['draft', 'published', 'unpublished', 'archived'];
    public const ACCESS_TYPES = ['read', 'download', 'read_download'];

    public const SOURCE_MANUAL = 'manual';
    public const SOURCE_GENERATOR = 'article_generator';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'tags' => 'array',
            'seo' => 'array',
            'sources' => 'array',
            'is_featured' => 'boolean',
            'price' => 'integer',
            'sale_price' => 'integer',
            'published_at' => 'datetime',
            'synced_at' => 'datetime',
            'external_generated_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Product $product) {
            if (empty($product->slug)) {
                $product->slug = static::uniqueSlug($product->title);
            }
        });
    }

    public static function uniqueSlug(string $title, ?int $ignoreId = null): string
    {
        $base = Str::limit(Str::slug($title), 180, '') ?: 'product';
        $slug = $base;
        $i = 2;
        while (static::where('slug', $slug)->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))->exists()) {
            $slug = $base.'-'.$i++;
        }

        return $slug;
    }

    // ---------------------------------------------------------------- relations

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(Author::class);
    }

    public function entitlements(): HasMany
    {
        return $this->hasMany(Entitlement::class);
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    // ---------------------------------------------------------------- scopes

    public function scopePublished(Builder $q): Builder
    {
        return $q->where('status', 'published')
            ->where(fn ($w) => $w->whereNull('published_at')->orWhere('published_at', '<=', now()));
    }

    public function scopeFromGenerator(Builder $q): Builder
    {
        return $q->where('source', self::SOURCE_GENERATOR);
    }

    // ---------------------------------------------------------------- helpers

    public function finalPrice(): int
    {
        if ($this->sale_price !== null && $this->sale_price < $this->price) {
            return (int) $this->sale_price;
        }

        return (int) $this->price;
    }

    public function discountPercent(): int
    {
        if (! $this->price || $this->finalPrice() >= $this->price) {
            return 0;
        }

        return (int) round((1 - $this->finalPrice() / $this->price) * 100);
    }

    public function isFree(): bool
    {
        return $this->finalPrice() === 0;
    }

    public function canRead(): bool
    {
        return in_array($this->access_type, ['read', 'read_download'], true) && ! empty($this->content_html);
    }

    public function canDownload(): bool
    {
        if (! in_array($this->access_type, ['download', 'read_download'], true)) {
            return false;
        }

        return ! empty($this->file_path) || ! empty($this->external_pdf_url);
    }

    public function typeLabel(): string
    {
        return self::TYPES[$this->type] ?? Str::headline($this->type);
    }

    public function coverPublicUrl(): ?string
    {
        if (! $this->cover_url) {
            return null;
        }
        if (Str::startsWith($this->cover_url, ['http://', 'https://', 'data:'])) {
            return $this->cover_url;
        }

        return Storage::disk('public')->url($this->cover_url);
    }
}
