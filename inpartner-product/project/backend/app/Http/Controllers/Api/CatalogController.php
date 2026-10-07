<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Author;
use App\Models\Banner;
use App\Models\Category;
use App\Models\Product;
use App\Support\Present;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class CatalogController extends Controller
{
    /** IDs of products owned by the (optionally) authenticated user. */
    protected function ownedIds(): array
    {
        $user = auth('sanctum')->user();

        return $user ? $user->entitlements()->active()->pluck('product_id')->all() : [];
    }

    protected function base(): Builder
    {
        return Product::published()->with(['category', 'author']);
    }

    public function home()
    {
        $owned = $this->ownedIds();
        $card = fn ($p) => Present::productCard($p, $owned);

        $featured = $this->base()->where('is_featured', true)->latest('published_at')->take(8)->get();
        if ($featured->isEmpty()) {
            $featured = $this->base()->latest('published_at')->take(4)->get();
        }

        return response()->json([
            'banners' => Banner::where('is_active', true)->orderBy('sort_order')->get()->map(fn ($b) => Present::banner($b)),
            'featured' => $featured->map($card),
            'latest' => $this->base()->latest('published_at')->take(8)->get()->map($card),
            'popular' => $this->base()->orderByDesc('sales_count')->orderByDesc('view_count')->take(8)->get()->map($card),
            'categories' => $this->categoriesWithCounts(),
            'authors' => Author::withCount(['products' => fn ($q) => $q->published()])
                ->orderByDesc('products_count')->orderBy('name')->get()
                ->filter(fn ($a) => $a->products_count > 0)->take(8)->values()
                ->map(fn ($a) => [
                    'id' => $a->id, 'name' => $a->name, 'slug' => $a->slug,
                    'photo_url' => $a->photo_url, 'products_count' => $a->products_count,
                ]),
            'stats' => [
                'products' => Product::published()->count(),
                'articles' => Product::published()->where('type', 'article')->count(),
                'categories' => Category::count(),
                'authors' => Author::count(),
            ],
        ]);
    }

    public function products(Request $request)
    {
        $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string'],
            'type' => ['nullable', 'string'],
            'author' => ['nullable', 'string'],
            'sort' => ['nullable', 'in:newest,popular,price_asc,price_desc,title'],
            'price' => ['nullable', 'in:free,paid'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:48'],
        ]);

        $q = $this->base();

        if ($term = trim((string) $request->input('q'))) {
            $q->where(function ($w) use ($term) {
                $w->where('title', 'like', "%{$term}%")
                    ->orWhere('subtitle', 'like', "%{$term}%")
                    ->orWhere('excerpt', 'like', "%{$term}%")
                    ->orWhereHas('author', fn ($a) => $a->where('name', 'like', "%{$term}%"))
                    ->orWhereHas('category', fn ($c) => $c->where('name', 'like', "%{$term}%"));
            });
        }
        if ($cat = $request->input('category')) {
            $q->whereHas('category', fn ($c) => $c->where('slug', $cat));
        }
        if ($type = $request->input('type')) {
            $q->whereIn('type', explode(',', $type));
        }
        if ($author = $request->input('author')) {
            $q->whereHas('author', fn ($a) => $a->where('slug', $author));
        }
        if ($request->input('price') === 'free') {
            $q->where(fn ($w) => $w->where('price', 0)->orWhere('sale_price', 0));
        } elseif ($request->input('price') === 'paid') {
            $q->where('price', '>', 0)->where(fn ($w) => $w->whereNull('sale_price')->orWhere('sale_price', '>', 0));
        }

        match ($request->input('sort', 'newest')) {
            'popular' => $q->orderByDesc('sales_count')->orderByDesc('view_count'),
            'price_asc' => $q->orderByRaw('COALESCE(sale_price, price) asc'),
            'price_desc' => $q->orderByRaw('COALESCE(sale_price, price) desc'),
            'title' => $q->orderBy('title'),
            default => $q->latest('published_at')->latest('id'),
        };

        $page = $q->paginate((int) $request->input('per_page', 12));
        $owned = $this->ownedIds();

        return response()->json([
            'data' => collect($page->items())->map(fn ($p) => Present::productCard($p, $owned)),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
            ],
        ]);
    }

    public function product(string $slug)
    {
        $product = $this->base()->where('slug', $slug)->firstOrFail();
        $product->increment('view_count');

        $owned = in_array($product->id, $this->ownedIds(), true);

        $related = $this->base()
            ->where('id', '!=', $product->id)
            ->where(fn ($w) => $w->where('category_id', $product->category_id)->orWhere('author_id', $product->author_id))
            ->latest('published_at')->take(4)->get();
        if ($related->count() < 4) {
            $related = $related->merge(
                $this->base()->where('id', '!=', $product->id)->whereNotIn('id', $related->pluck('id'))
                    ->orderByDesc('sales_count')->take(4 - $related->count())->get()
            );
        }

        $ownedIds = $this->ownedIds();

        return response()->json([
            'product' => Present::productDetail($product, $owned),
            'related' => $related->map(fn ($p) => Present::productCard($p, $ownedIds))->values(),
        ]);
    }

    public function categories()
    {
        return response()->json(['data' => $this->categoriesWithCounts()]);
    }

    public function author(string $slug)
    {
        $author = Author::where('slug', $slug)->firstOrFail();
        $owned = $this->ownedIds();

        return response()->json([
            'author' => $author->only(['id', 'name', 'slug', 'bio', 'photo_url']),
            'products' => $this->base()->where('author_id', $author->id)->latest('published_at')->get()
                ->map(fn ($p) => Present::productCard($p, $owned)),
        ]);
    }

    public function types()
    {
        $counts = Product::published()->selectRaw('type, count(*) as total')->groupBy('type')->pluck('total', 'type');

        return response()->json([
            'data' => collect(Product::TYPES)->map(fn ($label, $key) => [
                'key' => $key, 'label' => $label, 'count' => (int) ($counts[$key] ?? 0),
            ])->values(),
        ]);
    }

    protected function categoriesWithCounts()
    {
        return Category::withCount(['products' => fn ($q) => $q->published()])
            ->orderBy('sort_order')->orderBy('name')->get()
            ->map(fn ($c) => [
                'id' => $c->id, 'name' => $c->name, 'slug' => $c->slug, 'description' => $c->description,
                'icon' => $c->icon, 'color' => $c->color, 'products_count' => $c->products_count,
            ]);
    }
}
