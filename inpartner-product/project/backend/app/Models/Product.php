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
        'thematic_research' => 'Thematic Research',
        'insight' => 'Sector Insight',
        'sector_insight' => 'Sector Insight',
        'data' => 'Data Series & Stats',
        'data_series' => 'Data Series & Stats',
        'custom_analysis' => 'Custom Analysis',
        'article' => 'Article',
        'ebook' => 'Ebook',
        'journal' => 'Journal',
        'research_paper' => 'Research Paper',
        'magazine' => 'Magazine',
        'digital_file' => 'Digital File',
    ];

    public const ACCESS_LEVELS = [
        'free', 'entry', 'professional', 'enterprise',
        // Admin aliases
        'public_free', 'registered', 'individual_analyst', 'corporate_pro', 'enterprise_bespoke'
    ];

    public const STATUSES = ['draft', 'published', 'unpublished', 'archived'];
    public const ACCESS_TYPES = [
        'read', 'download', 'read_download',
        // Admin aliases
        'read_and_download', 'both'
    ];

    public const SOURCE_MANUAL = 'manual';
    public const SOURCE_GENERATOR = 'article_generator';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'tags' => 'array',
            'seo' => 'array',
            'sources' => 'array',
            'chapters' => 'array',
            'translations' => 'array',
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

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function wishlists(): HasMany
    {
        return $this->hasMany(Wishlist::class);
    }

    public function averageRating(): ?float
    {
        $avg = $this->reviews()->where('status', 'approved')->avg('rating');
        return $avg !== null ? (float) round($avg, 1) : null;
    }

    public function reviewsCount(): int
    {
        return (int) $this->reviews()->where('status', 'approved')->count();
    }

    public function hasExcelFile(): bool
    {
        return !empty($this->excel_file_path);
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

    public function hasValidPdf(): bool
    {
        if (! empty($this->file_path) && Storage::disk('local')->exists($this->file_path)) {
            return true;
        }

        if (! empty($this->external_pdf_url) && ! Str::contains($this->external_pdf_url, ['127.0.0.1', 'localhost'])) {
            return true;
        }

        return false;
    }

    public function canRead(): bool
    {
        if (! in_array($this->access_type, ['read', 'read_download'], true)) {
            return false;
        }

        return ! empty($this->content_html) || $this->hasValidPdf();
    }

    public function canDownload(): bool
    {
        if (! in_array($this->access_type, ['download', 'read_download'], true)) {
            return false;
        }

        return $this->hasValidPdf();
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
