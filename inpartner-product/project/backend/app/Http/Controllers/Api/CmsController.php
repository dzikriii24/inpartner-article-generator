<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Author;
use App\Models\Category;
use App\Models\CmsSection;
use App\Models\CmsSectionTranslation;
use App\Models\Product;
use App\Models\SiteSetting;
use App\Support\Present;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CmsController extends Controller
{
    /** Public: Homepage CMS sections with locale & public settings. */
    public function homepage(Request $request)
    {
        $lang = $request->input('lang', 'id');
        $isPreview = $request->boolean('preview');

        $query = CmsSection::with('translations')->orderBy('sort_order');

        if (!$isPreview) {
            $query->active()->published();
        }

        $sections = $query->get()->map(function (CmsSection $s) use ($lang, $isPreview) {
            return $s->localized($lang, $isPreview);
        });

        $publicSettings = SiteSetting::where('is_public', true)->get()->mapWithKeys(function ($item) {
            $decoded = json_decode($item->value, true);
            $val = json_last_error() === JSON_ERROR_NONE ? $decoded : $item->value;
            return [$item->key => $val];
        });

        return response()->json([
            'sections' => $sections,
            'site_settings' => $publicSettings,
            'locale' => $lang,
            'is_preview' => $isPreview,
        ]);
    }

    /** Public: Site settings (brand, navbar, footer, SEO). */
    public function settings()
    {
        $settings = SiteSetting::where('is_public', true)->get()->mapWithKeys(function ($item) {
            $decoded = json_decode($item->value, true);
            $val = json_last_error() === JSON_ERROR_NONE ? $decoded : $item->value;
            return [$item->key => $val];
        });

        return response()->json(['data' => $settings]);
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
    // ADMIN CMS ENDPOINTS
    // =========================================================================

    /** Admin: List all sections with translations and draft states. */
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

    /** Admin: Create or update section content & translations. */
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

        $section->title = $data['title'];
        $section->subtitle = $data['subtitle'] ?? null;
        if (isset($data['settings'])) {
            $section->settings = $data['settings'];
        }
        if (isset($data['is_active'])) {
            $section->is_active = (bool) $data['is_active'];
        }

        $saveAsDraft = $request->boolean('save_as_draft', false);
        if ($saveAsDraft) {
            $section->draft_content = array_merge($section->content ?? [], $data['content'] ?? []);
            $section->is_published = false;
        } else {
            $section->content = array_merge($section->content ?? [], $data['content'] ?? []);
            $section->draft_content = null;
            $section->is_published = true;
        }

        $section->save();

        // Update English & Korean translations if provided
        if (isset($data['translations']['en'])) {
            $en = $data['translations']['en'];
            CmsSectionTranslation::updateOrCreate(
                ['cms_section_id' => $section->id, 'locale' => 'en'],
                [
                    'title' => $en['title'] ?? null,
                    'subtitle' => $en['subtitle'] ?? null,
                    'content' => $en['content'] ?? null,
                ]
            );
        }

        if (isset($data['translations']['ko'])) {
            $ko = $data['translations']['ko'];
            CmsSectionTranslation::updateOrCreate(
                ['cms_section_id' => $section->id, 'locale' => 'ko'],
                [
                    'title' => $ko['title'] ?? null,
                    'subtitle' => $ko['subtitle'] ?? null,
                    'content' => $ko['content'] ?? null,
                ]
            );
        }

        return response()->json([
            'message' => 'Section berhasil disimpan.',
            'section' => $section->fresh('translations'),
        ]);
    }

    /** Admin: Reorder sections. */
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

    /** Admin: Toggle section visibility. */
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

    /** Admin: Publish all drafts. */
    public function adminPublish()
    {
        $sections = CmsSection::whereNotNull('draft_content')->get();
        foreach ($sections as $s) {
            $s->content = array_merge($s->content ?? [], $s->draft_content ?? []);
            $s->draft_content = null;
            $s->is_published = true;
            $s->save();
        }

        CmsSection::query()->update(['is_published' => true]);

        return response()->json(['message' => 'Seluruh perubahan CMS berhasil dipublikasikan ke storefront!']);
    }

    /** Admin: Delete section (only custom or if permitted). */
    public function adminDeleteSection(int $id)
    {
        $section = CmsSection::findOrFail($id);
        $section->delete();

        return response()->json(['message' => 'Section berhasil dihapus.']);
    }

    /** Admin: Get all site settings grouped. */
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

    /** Admin: Save site settings. */
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

        return response()->json(['message' => 'Pengaturan website berhasil disimpan.']);
    }
}

