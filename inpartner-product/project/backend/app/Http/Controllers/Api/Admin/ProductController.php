<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Services\ArticleGenerator\ArticleSyncService;
use App\Support\Html;
use App\Support\Present;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Throwable;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $q = Product::with('category', 'author')
            ->when($request->input('q'), fn ($w, $t) => $w->where(fn ($s) => $s->where('title', 'like', "%{$t}%")->orWhere('external_id', $t)))
            ->when($request->input('status'), fn ($w, $s) => $w->where('status', $s))
            ->when($request->input('type'), fn ($w, $t) => $w->where('type', $t))
            ->when($request->input('source'), fn ($w, $s) => $w->where('source', $s))
            ->when($request->input('category_id'), fn ($w, $c) => $w->where('category_id', $c))
            ->when($request->input('sync_status'), fn ($w, $s) => $w->where('sync_status', $s));

        match ($request->input('sort', 'newest')) {
            'sales' => $q->orderByDesc('sales_count'),
            'title' => $q->orderBy('title'),
            'price' => $q->orderBy('price'),
            default => $q->latest('id'),
        };

        $page = $q->paginate((int) $request->input('per_page', 15));

        return response()->json([
            'data' => collect($page->items())->map(fn ($p) => Present::productAdmin($p)),
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'total' => $page->total()],
            'counts' => Product::selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status'),
        ]);
    }

    public function show(Product $product)
    {
        $product->load('category', 'author');

        return response()->json([
            'product' => Present::productAdmin($product),
            'content_html' => $product->content_html,
            'preview_html' => $product->preview_html,
        ]);
    }

    protected function rules(?Product $product = null): array
    {
        $fromGenerator = $product?->source === Product::SOURCE_GENERATOR;

        return [
            'title' => [$fromGenerator ? 'sometimes' : 'required', 'string', 'max:495'],
            'subtitle' => ['nullable', 'string'],
            'type' => ['sometimes', Rule::in(array_keys(Product::TYPES))],
            'description' => ['nullable', 'string'],
            'excerpt' => ['nullable', 'string', 'max:1000'],
            'content_html' => ['nullable', 'string'],
            'preview_html' => ['nullable', 'string'],
            'cover_url' => ['nullable', 'string', 'max:2000'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'author_id' => ['nullable', 'integer', 'exists:authors,id'],
            'price' => ['sometimes', 'integer', 'min:0', 'max:100000000'],
            'sale_price' => ['nullable', 'integer', 'min:0', 'max:100000000'],
            'status' => ['sometimes', Rule::in(Product::STATUSES)],
            'access_type' => ['sometimes', Rule::in(Product::ACCESS_TYPES)],
            'reading_time' => ['nullable', 'integer', 'min:0', 'max:2000'],
            'pages' => ['nullable', 'integer', 'min:0'],
            'language' => ['nullable', 'string', 'max:10'],
            'is_featured' => ['sometimes', 'boolean'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['string', 'max:50'],
            'published_at' => ['nullable', 'date'],
        ];
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->rules());
        $data['source'] = Product::SOURCE_MANUAL;
        $data = $this->prepare($data);

        $product = Product::create($data);

        return response()->json(['product' => Present::productAdmin($product->load('category', 'author'))], 201);
    }

    public function update(Request $request, Product $product)
    {
        $data = $request->validate($this->rules($product));

        // Content of generator articles is owned by the generator (edit it there).
        if ($product->source === Product::SOURCE_GENERATOR) {
            unset($data['title'], $data['subtitle'], $data['content_html']);
        }

        $data = $this->prepare($data, $product);
        $product->update($data);

        return response()->json(['product' => Present::productAdmin($product->fresh(['category', 'author']))]);
    }

    protected function prepare(array $data, ?Product $product = null): array
    {
        if (array_key_exists('content_html', $data)) {
            $data['content_html'] = Html::sanitize($data['content_html']);
            $data['word_count'] = Html::wordCount($data['content_html']);
            if (empty($data['preview_html'])) {
                $data['preview_html'] = Html::preview($data['content_html']);
            }
            if (empty($data['reading_time'])) {
                $data['reading_time'] = max(1, (int) ceil($data['word_count'] / 220));
            }
        }
        if (array_key_exists('preview_html', $data) && $data['preview_html']) {
            $data['preview_html'] = Html::sanitize($data['preview_html']);
        }
        if (isset($data['status']) && $data['status'] === 'published' && ! ($product?->published_at) && empty($data['published_at'])) {
            $data['published_at'] = now();
        }
        if (isset($data['title']) && $product && $product->title !== $data['title'] && $product->status !== 'published') {
            $data['slug'] = Product::uniqueSlug($data['title'], $product->id);
        }

        return $data;
    }

    public function destroy(Product $product)
    {
        if ($product->entitlements()->exists()) {
            $product->update(['status' => 'archived']);

            return response()->json(['message' => 'Produk sudah dibeli customer, jadi di-archive (bukan dihapus).', 'archived' => true]);
        }
        if ($product->file_path) {
            Storage::disk('local')->delete($product->file_path);
        }
        $product->delete();

        return response()->json(['message' => 'Produk dihapus.']);
    }

    public function bulk(Request $request)
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer'],
            'action' => ['required', 'in:publish,unpublish,archive,draft,feature,unfeature,set_price'],
            'price' => ['required_if:action,set_price', 'nullable', 'integer', 'min:0'],
        ]);

        $q = Product::whereIn('id', $data['ids']);
        $count = match ($data['action']) {
            'publish' => $q->get()->each(fn ($p) => $p->update(['status' => 'published', 'published_at' => $p->published_at ?? now()]))->count(),
            'unpublish' => $q->update(['status' => 'unpublished']),
            'archive' => $q->update(['status' => 'archived']),
            'draft' => $q->update(['status' => 'draft']),
            'feature' => $q->update(['is_featured' => true]),
            'unfeature' => $q->update(['is_featured' => false]),
            'set_price' => $q->update(['price' => (int) $data['price']]),
        };

        return response()->json(['message' => "{$count} produk diperbarui."]);
    }

    public function uploadCover(Request $request, Product $product)
    {
        $request->validate(['cover' => ['required', 'image', 'max:4096']]);
        $path = $request->file('cover')->store('covers', 'public');
        if ($product->cover_url && str_starts_with($product->cover_url, 'covers/')) {
            Storage::disk('public')->delete($product->cover_url);
        }
        $product->update(['cover_url' => $path]);

        return response()->json(['product' => Present::productAdmin($product->fresh(['category', 'author']))]);
    }

    /** Digital file goes to the PRIVATE disk (storage/app/private), never public. */
    public function uploadFile(Request $request, Product $product)
    {
        $request->validate(['file' => ['required', 'file', 'max:51200', 'mimes:pdf,epub,zip,docx,xlsx,pptx,mp3,mp4']]);
        $file = $request->file('file');
        if ($product->file_path) {
            Storage::disk('local')->delete($product->file_path);
        }
        $path = $file->store('products', 'local');
        $product->update([
            'file_path' => $path,
            'file_name' => $file->getClientOriginalName(),
            'file_size' => $file->getSize(),
            'access_type' => $product->access_type === 'read' ? 'read_download' : $product->access_type,
        ]);

        return response()->json(['product' => Present::productAdmin($product->fresh(['category', 'author']))]);
    }

    public function resync(Product $product, ArticleSyncService $sync)
    {
        abort_unless($product->source === Product::SOURCE_GENERATOR, 422, 'Produk ini bukan dari Article Generator.');
        try {
            $res = $sync->resync($product);
        } catch (Throwable $e) {
            $product->update(['sync_status' => 'error', 'sync_error' => $e->getMessage()]);

            return response()->json(['message' => 'Sync gagal: '.$e->getMessage()], 502);
        }

        return response()->json([
            'message' => $res['action'] === 'missing' ? 'Artikel tidak ditemukan di generator.' : 'Produk tersinkron dengan generator.',
            'product' => Present::productAdmin($product->fresh(['category', 'author'])),
        ]);
    }

    public function meta()
    {
        return response()->json([
            'types' => collect(Product::TYPES)->map(fn ($l, $k) => ['key' => $k, 'label' => $l])->values(),
            'statuses' => Product::STATUSES,
            'access_types' => Product::ACCESS_TYPES,
            'categories' => \App\Models\Category::orderBy('name')->get(['id', 'name', 'slug']),
            'authors' => \App\Models\Author::orderBy('name')->get(['id', 'name', 'slug']),
        ]);
    }
}
