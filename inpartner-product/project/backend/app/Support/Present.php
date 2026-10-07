<?php

namespace App\Support;

use App\Models\Banner;
use App\Models\Entitlement;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;

/**
 * Shapes models into API payloads for the Vue SPA.
 */
class Present
{
    public static function productCard(Product $p, array $ownedIds = []): array
    {
        return [
            'id' => $p->id,
            'slug' => $p->slug,
            'type' => $p->type,
            'type_label' => $p->typeLabel(),
            'title' => $p->title,
            'subtitle' => $p->subtitle,
            'excerpt' => $p->excerpt,
            'cover_url' => $p->coverPublicUrl(),
            'category' => $p->relationLoaded('category') && $p->category ? ['name' => $p->category->name, 'slug' => $p->category->slug] : null,
            'author' => $p->relationLoaded('author') && $p->author ? ['name' => $p->author->name, 'slug' => $p->author->slug] : null,
            'price' => (int) $p->price,
            'final_price' => $p->finalPrice(),
            'discount_percent' => $p->discountPercent(),
            'is_free' => $p->isFree(),
            'reading_time' => $p->reading_time,
            'is_featured' => (bool) $p->is_featured,
            'sales_count' => (int) $p->sales_count,
            'published_at' => $p->published_at?->toIso8601String(),
            'is_owned' => in_array($p->id, $ownedIds, true),
        ];
    }

    public static function productDetail(Product $p, bool $owned = false): array
    {
        return array_merge(self::productCard($p, $owned ? [$p->id] : []), [
            'description' => $p->description,
            'cover_caption' => $p->cover_caption,
            'preview_html' => $p->preview_html,
            'access_type' => $p->access_type,
            'can_read' => $p->canRead(),
            'can_download' => $p->canDownload(),
            'word_count' => $p->word_count,
            'pages' => $p->pages,
            'language' => $p->language,
            'tags' => $p->tags ?? [],
            'seo' => $p->seo,
            'sources_count' => is_array($p->sources) ? count($p->sources) : 0,
            'source' => $p->source,
            'author' => $p->author ? [
                'name' => $p->author->name, 'slug' => $p->author->slug, 'bio' => $p->author->bio, 'photo_url' => $p->author->photo_url,
            ] : null,
        ]);
    }

    public static function productAdmin(Product $p): array
    {
        return array_merge(self::productCard($p), [
            'status' => $p->status,
            'access_type' => $p->access_type,
            'sale_price' => $p->sale_price,
            'category_id' => $p->category_id,
            'author_id' => $p->author_id,
            'description' => $p->description,
            'cover_raw' => $p->cover_url,
            'cover_caption' => $p->cover_caption,
            'word_count' => $p->word_count,
            'pages' => $p->pages,
            'language' => $p->language,
            'tags' => $p->tags ?? [],
            'view_count' => (int) $p->view_count,
            'has_file' => ! empty($p->file_path),
            'file_name' => $p->file_name,
            'file_size' => $p->file_size,
            'source' => $p->source,
            'external_id' => $p->external_id,
            'external_status' => $p->external_status,
            'external_pdf_url' => $p->external_pdf_url,
            'synced_at' => $p->synced_at?->toIso8601String(),
            'sync_status' => $p->sync_status,
            'sync_error' => $p->sync_error,
            'editor_url' => $p->source === Product::SOURCE_GENERATOR && $p->external_id
                ? rtrim((string) config('services.article_generator.url'), '/').'/article/'.$p->external_id
                : null,
            'created_at' => $p->created_at?->toIso8601String(),
            'updated_at' => $p->updated_at?->toIso8601String(),
        ]);
    }

    public static function order(Order $o, bool $withItems = true): array
    {
        $data = [
            'id' => $o->id,
            'order_number' => $o->order_number,
            'customer_name' => $o->customer_name,
            'customer_email' => $o->customer_email,
            'subtotal' => $o->subtotal,
            'discount' => $o->discount,
            'total' => $o->total,
            'payment_status' => $o->payment_status,
            'payment_provider' => $o->payment_provider,
            'payment_method' => $o->payment_method,
            'payment_url' => $o->isPending() ? $o->payment_url : null,
            'paid_at' => $o->paid_at?->toIso8601String(),
            'expires_at' => $o->expires_at?->toIso8601String(),
            'created_at' => $o->created_at?->toIso8601String(),
            'items_count' => $o->relationLoaded('items') ? $o->items->count() : null,
        ];

        if ($withItems && $o->relationLoaded('items')) {
            $data['items'] = $o->items->map(fn ($i) => [
                'id' => $i->id,
                'product_id' => $i->product_id,
                'product_title' => $i->product_title,
                'product_type' => $i->product_type,
                'price' => $i->price,
                'final_price' => $i->final_price,
                'product' => $i->relationLoaded('product') && $i->product ? [
                    'slug' => $i->product->slug,
                    'cover_url' => $i->product->coverPublicUrl(),
                ] : null,
            ])->values();
        }

        return $data;
    }

    public static function libraryItem(Entitlement $e): array
    {
        $p = $e->product;

        return [
            'id' => $e->id,
            'granted_at' => $e->granted_at?->toIso8601String(),
            'last_accessed_at' => $e->last_accessed_at?->toIso8601String(),
            'progress' => (int) $e->progress,
            'order_number' => $e->order?->order_number,
            'product' => $p ? array_merge(self::productCard($p, [$p->id]), [
                'can_read' => $p->canRead(),
                'can_download' => $p->canDownload(),
                'access_type' => $p->access_type,
            ]) : null,
        ];
    }

    public static function user(User $u): array
    {
        return [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'phone' => $u->phone,
            'role' => $u->role,
            'status' => $u->status,
            'is_admin' => $u->isAdmin(),
            'created_at' => $u->created_at?->toIso8601String(),
            'last_login_at' => $u->last_login_at?->toIso8601String(),
        ];
    }

    public static function banner(Banner $b): array
    {
        return $b->only(['id', 'eyebrow', 'title', 'subtitle', 'image_url', 'cta_label', 'cta_url', 'theme', 'sort_order', 'is_active']);
    }
}
