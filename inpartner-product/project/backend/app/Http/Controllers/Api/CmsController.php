<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Author;
use App\Models\Category;
use App\Models\CmsMedia;
use App\Models\CmsRevision;
use App\Models\CmsSection;
use App\Models\CmsSectionTranslation;
use App\Models\CmsTemplate;
use App\Models\Product;
use App\Models\SiteSetting;
use App\Services\Cms\CmsBuilderService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CmsController extends Controller
{
    public function __construct(protected CmsBuilderService $builder)
    {
    }

    /** Public: Homepage CMS sections, global header/footer/theme, and public settings. */
    public function homepage(Request $request)
    {
        $lang = in_array($request->input('lang', 'id'), ['id', 'en', 'ko'], true) ? $request->input('lang', 'id') : 'id';
        $wantsPreview = $request->boolean('preview');
        $user = auth('sanctum')->user();
        $isPreview = $wantsPreview && $user && $user->isAdmin();

        $page = $this->builder->getOrBootstrapHomepage();
        $sourceTree = $isPreview
            ? ($page->draft_tree ?: $page->published_tree ?: $this->builder->defaultTree())
            : ($page->published_tree ?: $this->builder->defaultTree());

        $localized = $this->builder->localizeTree($sourceTree, $lang, true);

        $publicSettings = SiteSetting::where('is_public', true)->get()->mapWithKeys(function ($item) {
            $decoded = json_decode($item->value, true);
            $val = json_last_error() === JSON_ERROR_NONE ? $decoded : $item->value;
            return [$item->key => $val];
        });

        return response()->json([
            'page' => [
                'slug' => $page->slug,
                'version' => (int) $page->version,
                'published_at' => $page->published_at?->toIso8601String(),
            ],
            'sections' => $localized['sections'],
            'header' => $localized['header'],
            'footer' => $localized['footer'],
            'theme' => $localized['theme'],
            'seo' => $localized['seo'],
            'site_settings' => $publicSettings,
            'locale' => $lang,
            'is_preview' => $isPreview,
            'preview_denied' => $wantsPreview && !$isPreview,
        ]);
    }

    /** Public: Global published site settings including header, footer, and theme. */
    public function settings()
    {
        $page = $this->builder->getOrBootstrapHomepage();
        $published = $page->published_tree ?: $this->builder->defaultTree();

        $settings = SiteSetting::where('is_public', true)->get()->mapWithKeys(function ($item) {
            $decoded = json_decode($item->value, true);
            $val = json_last_error() === JSON_ERROR_NONE ? $decoded : $item->value;
            return [$item->key => $val];
        });

        return response()->json([
            'data' => $settings,
            'header' => $published['header'] ?? $this->builder->defaultHeader(),
            'footer' => $published['footer'] ?? $this->builder->defaultFooter(),
            'theme' => $published['theme'] ?? $this->builder->defaultTheme(),
            'seo' => $published['seo'] ?? [],
        ]);
    }

    /** Public: Subscribe email to strategic briefing newsletter. */
    public function subscribeNewsletter(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email:rfc', 'max:190'],
            'locale' => ['nullable', 'in:id,en,ko'],
            'source' => ['nullable', 'string', 'max:60'],
        ]);

        $email = Str::lower(trim($data['email']));

        DB::table('cms_newsletter_subscribers')->updateOrInsert(
            ['email' => $email],
            [
                'locale' => $data['locale'] ?? 'id',
                'source' => $data['source'] ?? 'homepage',
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );

        return response()->json([
            'message' => 'Email berhasil terdaftar untuk briefing mingguan.',
            'email' => $email,
        ], 201);
    }

    /** Public: Search suggestions for Navbar Autocomplete. */
    public function suggestions(Request $request)
    {
        $term = trim((string) $request->input('q', ''));
        if (mb_strlen($term) < 2) {
            return response()->json([
                'products' => [],
                'categories' => [],
                'authors' => [],
            ]);
        }

        $products = Product::published()
            ->where(function ($w) use ($term) {
                $w->where('title', 'like', "%{$term}%")
                    ->orWhere('subtitle', 'like', "%{$term}%")
                    ->orWhere('excerpt', 'like', "%{$term}%");
            })
            ->with(['category', 'author'])
            ->latest('published_at')
            ->take(6)
            ->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'slug' => $p->slug,
                'title' => $p->title,
                'type' => $p->type,
                'type_label' => $p->typeLabel(),
                'cover_url' => $p->coverPublicUrl(),
                'category' => $p->category?->name,
                'author' => $p->author?->name,
                'reading_time' => $p->reading_time,
            ]);

        $categories = Category::where('name', 'like', "%{$term}%")
            ->orWhere('description', 'like', "%{$term}%")
            ->take(4)
            ->get()
            ->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'slug' => $c->slug,
            ]);

        $authors = Author::where('name', 'like', "%{$term}%")
            ->take(3)
            ->get()
            ->map(fn ($a) => [
                'id' => $a->id,
                'name' => $a->name,
                'slug' => $a->slug,
                'photo_url' => $a->photo_url,
            ]);

        return response()->json([
            'products' => $products,
            'categories' => $categories,
            'authors' => $authors,
        ]);
    }

    // =========================================================================
    // ADMIN VISUAL BUILDER ENDPOINTS
    // =========================================================================

    /** Admin: Fetch full visual builder workspace state (draft, published, templates, revisions). */
    public function adminBuilderState()
    {
        $page = $this->builder->getOrBootstrapHomepage();
        $this->builder->ensureSystemTemplates();

        $draft = $page->draft_tree ?: $page->published_tree ?: $this->builder->defaultTree();
        $published = $page->published_tree ?: $this->builder->defaultTree();
        $hasUnpublished = json_encode($draft) !== json_encode($published);

        $revisions = CmsRevision::where('page_slug', 'homepage')
            ->orderByDesc('id')
            ->take(30)
            ->get()
            ->map(fn (CmsRevision $r) => [
                'id' => $r->id,
                'version' => $r->version,
                'status' => $r->status,
                'label' => $r->label,
                'created_by_name' => $r->created_by_name,
                'sections_count' => count($r->snapshot['sections'] ?? []),
                'created_at' => $r->created_at?->toIso8601String(),
            ]);

        $templates = CmsTemplate::orderByDesc('is_system')->orderBy('name')->get();

        return response()->json([
            'page' => [
                'slug' => $page->slug,
                'title' => $page->title,
                'version' => (int) $page->version,
                'has_unpublished_changes' => $hasUnpublished,
                'draft_updated_at' => $page->draft_updated_at?->toIso8601String(),
                'published_at' => $page->published_at?->toIso8601String(),
            ],
            'draft' => $draft,
            'published' => $published,
            'revisions' => $revisions,
            'templates' => $templates,
            'media_count' => CmsMedia::count(),
            'allowed_section_types' => CmsBuilderService::SECTION_TYPES,
            'allowed_block_types' => CmsBuilderService::BLOCK_TYPES,
        ]);
    }

    /** Admin: Save visual builder draft (manual save or debounced autosave). */
    public function adminSaveDraft(Request $request)
    {
        $data = $request->validate([
            'tree' => ['required', 'array'],
            'tree.sections' => ['required', 'array'],
            'create_revision' => ['nullable', 'boolean'],
            'label' => ['nullable', 'string', 'max:180'],
        ]);

        $page = $this->builder->getOrBootstrapHomepage();
        $saved = $this->builder->saveDraft(
            $page,
            $data['tree'],
            $request->user(),
            $request->boolean('create_revision', false),
            $data['label'] ?? null
        );

        $hasUnpublished = json_encode($saved) !== json_encode($page->published_tree);

        return response()->json([
            'message' => $request->boolean('create_revision') ? 'Draf & snapshot revisi berhasil disimpan.' : 'Draf tersimpan otomatis.',
            'draft' => $saved,
            'draft_updated_at' => $page->draft_updated_at?->toIso8601String(),
            'has_unpublished_changes' => $hasUnpublished,
        ]);
    }

    /** Admin: Validate draft configuration before publish. */
    public function adminValidateBuilder(Request $request)
    {
        $page = $this->builder->getOrBootstrapHomepage();
        $tree = $request->has('tree') ? $this->builder->sanitizeTree((array) $request->input('tree')) : ($page->draft_tree ?: $this->builder->defaultTree());

        return response()->json($this->builder->validateForPublish($tree));
    }

    /** Admin: Publish draft to live storefront. */
    public function adminPublishBuilder(Request $request)
    {
        $page = $this->builder->getOrBootstrapHomepage();

        if ($request->has('tree') && is_array($request->input('tree'))) {
            $this->builder->saveDraft($page, $request->input('tree'), $request->user(), false);
        }

        $result = $this->builder->publishDraft(
            $page,
            $request->user(),
            $request->input('label')
        );

        return response()->json([
            'message' => "Homepage versi v{$result['version']} berhasil dipublikasikan ke storefront!",
            'version' => $result['version'],
            'published_at' => $result['published_at'],
            'validation' => $result['validation'],
            'published' => $result['published'],
            'has_unpublished_changes' => false,
        ]);
    }

    /** Admin: Reset draft either to published state or factory defaults. */
    public function adminResetBuilder(Request $request)
    {
        $data = $request->validate([
            'mode' => ['required', 'in:published,factory'],
        ]);

        $page = $this->builder->getOrBootstrapHomepage();

        if (!empty($page->draft_tree)) {
            CmsRevision::create([
                'page_slug' => $page->slug,
                'version' => $page->version,
                'status' => 'restore_point',
                'label' => 'Backup Sebelum Reset (' . $data['mode'] . ')',
                'snapshot' => $page->draft_tree,
                'created_by' => $request->user()?->id,
                'created_by_name' => $request->user()?->name ?: 'Administrator',
            ]);
        }

        $targetTree = $data['mode'] === 'published'
            ? ($page->published_tree ?: $this->builder->defaultTree())
            : $this->builder->defaultTree();

        $saved = $this->builder->saveDraft($page, $targetTree, $request->user(), true, $data['mode'] === 'factory' ? 'Reset ke Konfigurasi Default' : 'Pulihkan ke Versi Live');

        return response()->json([
            'message' => $data['mode'] === 'factory' ? 'Draf dikembalikan ke konfigurasi default Inpartner.' : 'Draf dikembalikan ke versi yang sedang live.',
            'draft' => $saved,
            'has_unpublished_changes' => json_encode($saved) !== json_encode($page->published_tree),
        ]);
    }

    /** Admin: List revision history for homepage. */
    public function adminRevisions()
    {
        $revisions = CmsRevision::where('page_slug', 'homepage')
            ->orderByDesc('id')
            ->take(50)
            ->get()
            ->map(fn (CmsRevision $r) => [
                'id' => $r->id,
                'version' => $r->version,
                'status' => $r->status,
                'label' => $r->label,
                'created_by_name' => $r->created_by_name,
                'sections_count' => count($r->snapshot['sections'] ?? []),
                'created_at' => $r->created_at?->toIso8601String(),
            ]);

        return response()->json(['data' => $revisions]);
    }

    /** Admin: Restore a revision into draft_tree. */
    public function adminRestoreRevision(Request $request, int $id)
    {
        $revision = CmsRevision::where('page_slug', 'homepage')->findOrFail($id);
        $page = $this->builder->getOrBootstrapHomepage();

        if (!empty($page->draft_tree)) {
            CmsRevision::create([
                'page_slug' => $page->slug,
                'version' => $page->version,
                'status' => 'restore_point',
                'label' => 'Backup Sebelum Restore Revisi #' . $revision->id,
                'snapshot' => $page->draft_tree,
                'created_by' => $request->user()?->id,
                'created_by_name' => $request->user()?->name ?: 'Administrator',
            ]);
        }

        $restored = $this->builder->saveDraft(
            $page,
            $revision->snapshot,
            $request->user(),
            true,
            'Dipulihkan dari: ' . ($revision->label ?: "Revisi #{$revision->id}")
        );

        return response()->json([
            'message' => 'Revisi berhasil dipulihkan ke draf aktif.',
            'draft' => $restored,
            'has_unpublished_changes' => json_encode($restored) !== json_encode($page->published_tree),
        ]);
    }

    // =========================================================================
    // REUSABLE SECTION TEMPLATES
    // =========================================================================

    public function adminTemplates()
    {
        $this->builder->ensureSystemTemplates();
        $templates = CmsTemplate::orderByDesc('is_system')->orderByDesc('id')->get();
        return response()->json(['data' => $templates]);
    }

    public function adminSaveTemplate(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'category' => ['nullable', 'string', 'max:60'],
            'description' => ['nullable', 'string', 'max:500'],
            'section_data' => ['required', 'array'],
        ]);

        $sectionData = $data['section_data'];
        $type = (string) ($sectionData['type'] ?? 'custom_layout');
        if (!in_array($type, CmsBuilderService::SECTION_TYPES, true)) {
            return response()->json(['message' => 'Tipe section template tidak valid.'], 422);
        }

        $tpl = CmsTemplate::create([
            'uid' => 'tpl_' . Str::slug($data['name']) . '_' . Str::lower(Str::random(5)),
            'name' => $data['name'],
            'category' => $data['category'] ?: 'custom',
            'description' => $data['description'] ?? null,
            'thumbnail_type' => $type,
            'section_data' => $sectionData,
            'is_system' => false,
            'created_by' => $request->user()?->id,
        ]);

        return response()->json([
            'message' => 'Template section berhasil disimpan ke Library!',
            'template' => $tpl,
        ], 201);
    }

    public function adminDeleteTemplate(int $id)
    {
        $tpl = CmsTemplate::findOrFail($id);
        if ($tpl->is_system) {
            return response()->json(['message' => 'Template bawaan sistem tidak dapat dihapus.'], 403);
        }
        $tpl->delete();

        return response()->json(['message' => 'Template berhasil dihapus.']);
    }

    // =========================================================================
    // MEDIA LIBRARY ENDPOINTS
    // =========================================================================

    public function adminMediaIndex(Request $request)
    {
        $q = CmsMedia::query()->orderByDesc('id');
        if ($search = trim((string) $request->input('q', ''))) {
            $q->where(function ($w) use ($search) {
                $w->where('original_name', 'like', "%{$search}%")
                    ->orWhere('alt_text', 'like', "%{$search}%")
                    ->orWhere('caption', 'like', "%{$search}%");
            });
        }
        if ($folder = $request->input('folder')) {
            if ($folder !== 'all') {
                $q->where('folder', $folder);
            }
        }

        $items = $q->take(100)->get();

        return response()->json(['data' => $items]);
    }

    public function adminMediaUpload(Request $request)
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,gif,svg', 'max:5120'],
            'alt_text' => ['nullable', 'string', 'max:255'],
            'caption' => ['nullable', 'string', 'max:500'],
            'folder' => ['nullable', 'string', 'max:60'],
        ]);

        $file = $request->file('file');
        $folder = preg_replace('/[^a-zA-Z0-9_-]/', '', (string) $request->input('folder', 'general')) ?: 'general';
        $path = $file->store("cms-media/{$folder}", 'public');

        $width = null;
        $height = null;
        if (str_starts_with((string) $file->getMimeType(), 'image/') && !str_contains((string) $file->getMimeType(), 'svg')) {
            $dims = @getimagesize($file->getRealPath());
            if (is_array($dims)) {
                $width = $dims[0] ?? null;
                $height = $dims[1] ?? null;
            }
        }

        $media = CmsMedia::create([
            'uid' => 'med_' . Str::lower(Str::random(10)),
            'file_name' => basename($path),
            'original_name' => Str::limit($file->getClientOriginalName(), 240, ''),
            'disk' => 'public',
            'path' => $path,
            'url' => '/storage/' . ltrim($path, '/'),
            'mime_type' => $file->getMimeType() ?: 'image/jpeg',
            'size' => $file->getSize(),
            'width' => $width,
            'height' => $height,
            'alt_text' => $request->input('alt_text') ?: pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME),
            'caption' => $request->input('caption'),
            'folder' => $folder,
            'uploaded_by' => $request->user()?->id,
        ]);

        return response()->json([
            'message' => 'Gambar berhasil diunggah ke Media Library.',
            'media' => $media,
        ], 201);
    }

    public function adminMediaUpdate(Request $request, int $id)
    {
        $media = CmsMedia::findOrFail($id);
        $data = $request->validate([
            'alt_text' => ['nullable', 'string', 'max:255'],
            'caption' => ['nullable', 'string', 'max:500'],
            'folder' => ['nullable', 'string', 'max:60'],
        ]);

        $media->update($data);

        return response()->json([
            'message' => 'Metadata media diperbarui.',
            'media' => $media,
        ]);
    }

    public function adminMediaDelete(Request $request, int $id)
    {
        $media = CmsMedia::findOrFail($id);
        $page = $this->builder->getOrBootstrapHomepage();

        $draftJson = json_encode($page->draft_tree ?: [], JSON_UNESCAPED_SLASHES) ?: '';
        $pubJson = json_encode($page->published_tree ?: [], JSON_UNESCAPED_SLASHES) ?: '';
        $inUse = str_contains($draftJson, $media->url) || str_contains($pubJson, $media->url);

        if ($inUse && !$request->boolean('force')) {
            return response()->json([
                'message' => 'Gambar ini masih digunakan pada konfigurasi homepage (draf atau live). Lepaskan penggunaannya terlebih dahulu sebelum menghapus.',
                'in_use' => true,
            ], 409);
        }

        if ($media->path && Storage::disk($media->disk ?: 'public')->exists($media->path)) {
            Storage::disk($media->disk ?: 'public')->delete($media->path);
        }
        $media->delete();

        return response()->json(['message' => 'Media berhasil dihapus.']);
    }

    // =========================================================================
    // LEGACY ADMIN CMS ENDPOINTS (MAINTAINED FOR COMPATIBILITY)
    // =========================================================================

    public function adminSections()
    {
        $sections = CmsSection::with('translations')->orderBy('sort_order')->get()->map(function (CmsSection $s) {
            $en = $s->translations->firstWhere('locale', 'en');
            $ko = $s->translations->firstWhere('locale', 'ko');

            return [
                'id' => $s->id,
                'key' => $s->key,
                'type' => $s->type,
                'title' => $s->title,
                'subtitle' => $s->subtitle,
                'content' => $s->content ?? [],
                'settings' => $s->settings ?? [],
                'draft_content' => $s->draft_content,
                'has_draft' => !empty($s->draft_content),
                'sort_order' => (int) $s->sort_order,
                'is_active' => (bool) $s->is_active,
                'is_published' => (bool) $s->is_published,
                'updated_at' => $s->updated_at?->toIso8601String(),
                'translations' => [
                    'en' => $en ? [
                        'title' => $en->title,
                        'subtitle' => $en->subtitle,
                        'content' => $en->content ?? [],
                    ] : null,
                    'ko' => $ko ? [
                        'title' => $ko->title,
                        'subtitle' => $ko->subtitle,
                        'content' => $ko->content ?? [],
                    ] : null,
                ],
            ];
        });

        return response()->json(['data' => $sections]);
    }

    public function adminSaveSection(Request $request, ?int $id = null)
    {
        $data = $request->validate([
            'key' => ['nullable', 'string', 'max:80'],
            'type' => ['required', 'string', 'max:50'],
            'title' => ['required', 'string', 'max:255'],
            'subtitle' => ['nullable', 'string'],
            'content' => ['nullable', 'array'],
            'settings' => ['nullable', 'array'],
            'is_active' => ['nullable', 'boolean'],
            'save_as_draft' => ['nullable', 'boolean'],
            'translations' => ['nullable', 'array'],
        ]);

        $section = $id ? CmsSection::findOrFail($id) : new CmsSection();

        if (!$id) {
            $baseKey = $data['key'] ? Str::slug($data['key']) : Str::slug($data['title']);
            $key = $baseKey;
            $i = 1;
            while (CmsSection::where('key', $key)->exists()) {
                $key = $baseKey . '-' . (++$i);
            }
            $section->key = $key;
            $section->type = $data['type'];
            $section->sort_order = CmsSection::max('sort_order') + 1;
        }

        $saveAsDraft = $request->boolean('save_as_draft', false);
        if ($saveAsDraft) {
            $section->draft_content = array_merge($section->content ?? [], $data['content'] ?? []);
            $section->draft_payload = [
                'title' => $data['title'],
                'subtitle' => $data['subtitle'] ?? null,
                'content' => $section->draft_content,
                'settings' => $data['settings'] ?? ($section->settings ?? []),
                'is_active' => isset($data['is_active']) ? (bool) $data['is_active'] : $section->is_active,
            ];
            if (!$id) {
                $section->title = $data['title'];
                $section->subtitle = $data['subtitle'] ?? null;
                $section->is_published = false;
            }
        } else {
            $section->title = $data['title'];
            $section->subtitle = $data['subtitle'] ?? null;
            if (isset($data['settings'])) {
                $section->settings = $data['settings'];
            }
            if (isset($data['is_active'])) {
                $section->is_active = (bool) $data['is_active'];
            }
            $section->content = array_merge($section->content ?? [], $data['content'] ?? []);
            $section->draft_content = null;
            $section->draft_payload = null;
            $section->is_published = true;
        }

        $section->save();

        foreach (['en', 'ko'] as $loc) {
            if (isset($data['translations'][$loc])) {
                $tr = $data['translations'][$loc];
                CmsSectionTranslation::updateOrCreate(
                    ['cms_section_id' => $section->id, 'locale' => $loc],
                    [
                        'title' => $tr['title'] ?? null,
                        'subtitle' => $tr['subtitle'] ?? null,
                        'content' => $tr['content'] ?? null,
                    ]
                );
            }
        }

        return response()->json([
            'message' => 'Section berhasil disimpan.',
            'section' => $section->fresh('translations'),
        ]);
    }

    public function adminReorder(Request $request)
    {
        $items = $request->validate([
            'items' => ['required', 'array'],
            'items.*.id' => ['required', 'integer', 'exists:cms_sections,id'],
            'items.*.sort_order' => ['required', 'integer'],
        ]);

        foreach ($items['items'] as $item) {
            CmsSection::where('id', $item['id'])->update(['sort_order' => $item['sort_order']]);
        }

        return response()->json(['message' => 'Urutan section berhasil diperbarui.']);
    }

    public function adminToggle(Request $request, int $id)
    {
        $section = CmsSection::findOrFail($id);
        $section->is_active = !$section->is_active;
        $section->save();

        return response()->json([
            'message' => $section->is_active ? 'Section diaktifkan.' : 'Section disembunyikan.',
            'is_active' => $section->is_active,
        ]);
    }

    public function adminPublish()
    {
        $page = $this->builder->getOrBootstrapHomepage();
        $result = $this->builder->publishDraft($page);

        return response()->json([
            'message' => 'Seluruh perubahan CMS berhasil dipublikasikan ke storefront!',
            'version' => $result['version'],
        ]);
    }

    public function adminDeleteSection(int $id)
    {
        $section = CmsSection::findOrFail($id);
        $section->delete();

        return response()->json(['message' => 'Section berhasil dihapus.']);
    }

    public function adminGetSettings()
    {
        $settings = SiteSetting::all()->mapWithKeys(function ($item) {
            $decoded = json_decode($item->value, true);
            $val = json_last_error() === JSON_ERROR_NONE ? $decoded : $item->value;
            return [$item->key => [
                'key' => $item->key,
                'value' => $val,
                'group' => $item->group,
                'is_public' => (bool) $item->is_public,
            ]];
        });

        return response()->json(['data' => $settings]);
    }

    public function adminUpdateSettings(Request $request)
    {
        $data = $request->validate([
            'settings' => ['required', 'array'],
        ]);

        foreach ($data['settings'] as $key => $val) {
            $group = 'general';
            if (str_starts_with($key, 'site_')) $group = 'brand';
            elseif (str_starts_with($key, 'navbar_')) $group = 'navbar';
            elseif (str_starts_with($key, 'footer_')) $group = 'footer';
            elseif (str_starts_with($key, 'seo_')) $group = 'seo';

            SiteSetting::set($key, $val, $group, true);
        }

        $page = $this->builder->getOrBootstrapHomepage();
        $s = $data['settings'];
        foreach (['draft_tree', 'published_tree'] as $col) {
            $tree = $page->{$col};
            if (is_array($tree)) {
                if (isset($s['site_name'])) {
                    $tree['header']['brand_name'] = $s['site_name'];
                    $tree['footer']['brand_name'] = $s['site_name'];
                }
                if (isset($s['site_tagline'])) $tree['header']['tagline'] = $s['site_tagline'];
                if (isset($s['site_description'])) $tree['footer']['description'] = $s['site_description'];
                if (isset($s['contact_email'])) $tree['footer']['contact_email'] = $s['contact_email'];
                if (isset($s['contact_phone'])) $tree['footer']['contact_phone'] = $s['contact_phone'];
                if (isset($s['social_linkedin'])) $tree['footer']['social_linkedin'] = $s['social_linkedin'];
                if (isset($s['social_twitter'])) $tree['footer']['social_twitter'] = $s['social_twitter'];
                if (isset($s['social_instagram'])) $tree['footer']['social_instagram'] = $s['social_instagram'];
                if (isset($s['footer_copyright'])) $tree['footer']['copyright'] = $s['footer_copyright'];
                if (isset($s['seo_meta_title'])) $tree['seo']['meta_title'] = $s['seo_meta_title'];
                if (isset($s['seo_meta_description'])) $tree['seo']['meta_description'] = $s['seo_meta_description'];
                $page->{$col} = $tree;
            }
        }
        $page->save();
        $this->builder->clearPublicCaches();

        return response()->json(['message' => 'Pengaturan website berhasil disimpan.']);
    }
}
