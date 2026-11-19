<?php

namespace App\Services\Cms;

use App\Models\Banner;
use App\Models\CmsPage;
use App\Models\CmsRevision;
use App\Models\CmsSection;
use App\Models\CmsSectionTranslation;
use App\Models\CmsTemplate;
use App\Models\SiteSetting;
use App\Models\User;
use App\Support\Html;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CmsBuilderService
{
    public const SECTION_TYPES = [
        'hero',
        'featured_products',
        'categories',
        'why_us',
        'latest_products',
        'about',
        'cta',
        'newsletter',
        'promo_banner',
        'product_carousel',
        'testimonials',
        'faq',
        'statistics',
        'image_gallery',
        'split_content',
        'custom_layout',
    ];

    public const BLOCK_TYPES = [
        'heading',
        'text_block',
        'button',
        'image',
        'image_gallery',
        'badge',
        'spacer',
        'divider',
        'stats_row',
        'feature_list',
        'faq_list',
        'testimonial_list',
        'product_grid',
        'safe_embed',
    ];

    /**
     * Get or initialize the homepage CmsPage record safely from existing CMS data.
     */
    public function getOrBootstrapHomepage(): CmsPage
    {
        $page = CmsPage::where('slug', 'homepage')->first();
        if ($page) {
            return $page;
        }

        $initial = $this->buildInitialTreeFromExistingData();
        $draftTree = $initial['draft'];
        $publishedTree = $initial['published'];

        $page = CmsPage::create([
            'slug' => 'homepage',
            'title' => 'Homepage',
            'version' => 1,
            'draft_tree' => $draftTree,
            'published_tree' => $publishedTree,
            'draft_updated_at' => now(),
            'published_at' => now(),
        ]);

        CmsRevision::create([
            'page_slug' => 'homepage',
            'version' => 1,
            'status' => 'published',
            'label' => 'Initial Migration Snapshot',
            'snapshot' => $publishedTree,
            'created_by_name' => 'System Bootstrap',
        ]);

        return $page;
    }

    /**
     * Ensure built-in reusable section templates are available.
     */
    public function ensureSystemTemplates(): void
    {
        if (CmsTemplate::where('is_system', true)->exists()) {
            return;
        }

        $defaults = $this->defaultSystemTemplates();
        foreach ($defaults as $tpl) {
            CmsTemplate::updateOrCreate(
                ['uid' => $tpl['uid']],
                [
                    'name' => $tpl['name'],
                    'category' => $tpl['category'],
                    'description' => $tpl['description'],
                    'thumbnail_type' => $tpl['thumbnail_type'],
                    'section_data' => $tpl['section_data'],
                    'is_system' => true,
                ]
            );
        }
    }

    /**
     * Build factory default page configuration matching Inpartner's actual homepage, navbar, and footer.
     */
    public function defaultTree(): array
    {
        return [
            'page' => 'homepage',
            'schema_version' => 2,
            'sections' => $this->defaultSections(),
            'header' => $this->defaultHeader(),
            'footer' => $this->defaultFooter(),
            'theme' => $this->defaultTheme(),
            'seo' => [
                'meta_title' => 'INPARTNER — Digital Knowledge & Strategic Intelligence Platform',
                'meta_description' => 'Akses ribuan paper penelitian, jurnal akademik, analisis pasar, dan ebook eksekutif untuk mempercepat pemahaman dan pengambilan keputusan strategis Anda.',
            ],
        ];
    }

    /**
     * Bootstrap seamlessly from existing store_cms_sections & store_site_settings without losing any existing content.
     */
    protected function buildInitialTreeFromExistingData(): array
    {
        $defaults = $this->defaultTree();
        $existingSections = CmsSection::with('translations')->orderBy('sort_order')->get();
        $settingsMap = SiteSetting::all()->mapWithKeys(function ($item) {
            $decoded = json_decode($item->value, true);
            $val = json_last_error() === JSON_ERROR_NONE ? $decoded : $item->value;
            return [$item->key => $val];
        })->all();

        $publishedSections = [];
        $draftSections = [];

        if ($existingSections->isNotEmpty()) {
            $defaultByKey = collect($defaults['sections'])->keyBy('key');

            foreach ($existingSections as $index => $sec) {
                $base = $defaultByKey->get($sec->key) ?? [];
                $en = $sec->translations->firstWhere('locale', 'en');
                $ko = $sec->translations->firstWhere('locale', 'ko');

                $mergedContent = array_merge($base['content'] ?? [], $sec->content ?? []);
                $mergedSettings = array_merge($base['settings'] ?? [], $sec->settings ?? []);
                $uid = $sec->uid ?: ('sec_' . Str::slug($sec->key ?: ('section_' . $sec->id), '_'));

                $pubItem = [
                    'id' => $uid,
                    'key' => $sec->key,
                    'type' => in_array($sec->type, self::SECTION_TYPES, true) ? $sec->type : 'custom_layout',
                    'label' => $base['label'] ?? Str::headline($sec->key ?: $sec->type),
                    'visible' => (bool) $sec->is_active,
                    'locked' => false,
                    'order' => (int) ($sec->sort_order ?: ($index + 1)),
                    'title' => $sec->title,
                    'subtitle' => $sec->subtitle ?? '',
                    'content' => $mergedContent,
                    'settings' => $mergedSettings,
                    'styles' => $base['styles'] ?? $this->defaultSectionStyles($sec->type),
                    'responsive' => $base['responsive'] ?? $this->defaultSectionResponsive($sec->type),
                    'advanced' => ['element_id' => $sec->key, 'css_class' => ''],
                    'translations' => [
                        'en' => [
                            'title' => $en?->title ?? ($base['translations']['en']['title'] ?? ''),
                            'subtitle' => $en?->subtitle ?? ($base['translations']['en']['subtitle'] ?? ''),
                            'content' => array_merge($base['translations']['en']['content'] ?? [], $en?->content ?? []),
                        ],
                        'ko' => [
                            'title' => $ko?->title ?? ($base['translations']['ko']['title'] ?? ''),
                            'subtitle' => $ko?->subtitle ?? ($base['translations']['ko']['subtitle'] ?? ''),
                            'content' => array_merge($base['translations']['ko']['content'] ?? [], $ko?->content ?? []),
                        ],
                    ],
                    'children' => is_array($sec->children) ? $sec->children : [],
                ];

                $draftItem = $pubItem;
                if (!empty($sec->draft_payload) && is_array($sec->draft_payload)) {
                    $draftItem = array_replace_recursive($draftItem, $sec->draft_payload);
                } elseif (!empty($sec->draft_content) && is_array($sec->draft_content)) {
                    $draftItem['content'] = array_merge($draftItem['content'], $sec->draft_content);
                }

                $publishedSections[] = $pubItem;
                $draftSections[] = $draftItem;
            }
        } else {
            $publishedSections = $defaults['sections'];
            $draftSections = $defaults['sections'];
        }

        // Merge existing SiteSettings into header/footer/theme/seo
        $header = $defaults['header'];
        if (!empty($settingsMap['site_name'])) $header['brand_name'] = $settingsMap['site_name'];
        if (!empty($settingsMap['site_logo'])) $header['logo_url'] = $settingsMap['site_logo'];
        if (!empty($settingsMap['cms_header_config']) && is_array($settingsMap['cms_header_config'])) {
            $header = array_replace_recursive($header, $settingsMap['cms_header_config']);
        }

        $footer = $defaults['footer'];
        if (!empty($settingsMap['site_name'])) $footer['brand_name'] = $settingsMap['site_name'];
        if (!empty($settingsMap['site_description'])) $footer['description'] = $settingsMap['site_description'];
        if (!empty($settingsMap['contact_email'])) $footer['contact_email'] = $settingsMap['contact_email'];
        if (!empty($settingsMap['contact_phone'])) $footer['contact_phone'] = $settingsMap['contact_phone'];
        if (!empty($settingsMap['social_linkedin'])) $footer['social_linkedin'] = $settingsMap['social_linkedin'];
        if (!empty($settingsMap['social_twitter'])) $footer['social_twitter'] = $settingsMap['social_twitter'];
        if (!empty($settingsMap['social_instagram'])) $footer['social_instagram'] = $settingsMap['social_instagram'];
        if (!empty($settingsMap['footer_copyright'])) $footer['copyright'] = $settingsMap['footer_copyright'];
        if (!empty($settingsMap['cms_footer_config']) && is_array($settingsMap['cms_footer_config'])) {
            $footer = array_replace_recursive($footer, $settingsMap['cms_footer_config']);
        }

        $theme = $defaults['theme'];
        if (!empty($settingsMap['cms_theme_config']) && is_array($settingsMap['cms_theme_config'])) {
            $theme = array_replace_recursive($theme, $settingsMap['cms_theme_config']);
        }

        $seo = [
            'meta_title' => $settingsMap['seo_meta_title'] ?? $defaults['seo']['meta_title'],
            'meta_description' => $settingsMap['seo_meta_description'] ?? $defaults['seo']['meta_description'],
        ];

        return [
            'published' => [
                'page' => 'homepage',
                'schema_version' => 2,
                'sections' => $publishedSections,
                'header' => $header,
                'footer' => $footer,
                'theme' => $theme,
                'seo' => $seo,
            ],
            'draft' => [
                'page' => 'homepage',
                'schema_version' => 2,
                'sections' => $draftSections,
                'header' => $header,
                'footer' => $footer,
                'theme' => $theme,
                'seo' => $seo,
            ],
        ];
    }

    /**
     * Sanitize and normalize incoming tree from visual builder before saving to draft.
     */
    public function sanitizeTree(array $raw): array
    {
        $defaults = $this->defaultTree();

        $sectionsInput = is_array($raw['sections'] ?? null) ? $raw['sections'] : $defaults['sections'];
        $sanitizedSections = [];
        $orderCounter = 1;

        foreach ($sectionsInput as $sec) {
            if (!is_array($sec)) {
                continue;
            }

            $type = (string) ($sec['type'] ?? 'custom_layout');
            if (!in_array($type, self::SECTION_TYPES, true)) {
                continue;
            }

            $id = $this->sanitizeId((string) ($sec['id'] ?? ''), 'sec_' . Str::random(8));
            $key = $this->sanitizeId((string) ($sec['key'] ?? $id), $id);

            $children = $this->sanitizeBlocks(is_array($sec['children'] ?? null) ? $sec['children'] : []);

            $content = $this->stripBase64Images(is_array($sec['content'] ?? null) ? $sec['content'] : []);
            $translations = [];
            foreach (['en', 'ko'] as $loc) {
                $tr = $sec['translations'][$loc] ?? null;
                if (is_array($tr)) {
                    $translations[$loc] = [
                        'title' => isset($tr['title']) ? (string) $tr['title'] : '',
                        'subtitle' => isset($tr['subtitle']) ? (string) $tr['subtitle'] : '',
                        'content' => $this->stripBase64Images(is_array($tr['content'] ?? null) ? $tr['content'] : []),
                    ];
                }
            }

            $sanitizedSections[] = [
                'id' => $id,
                'key' => $key,
                'type' => $type,
                'label' => (string) ($sec['label'] ?? Str::headline($type)),
                'visible' => array_key_exists('visible', $sec) ? (bool) $sec['visible'] : true,
                'locked' => (bool) ($sec['locked'] ?? false),
                'order' => $orderCounter++,
                'title' => (string) ($sec['title'] ?? ''),
                'subtitle' => (string) ($sec['subtitle'] ?? ''),
                'content' => $content,
                'settings' => is_array($sec['settings'] ?? null) ? $sec['settings'] : [],
                'styles' => is_array($sec['styles'] ?? null) ? $sec['styles'] : $this->defaultSectionStyles($type),
                'responsive' => is_array($sec['responsive'] ?? null) ? $sec['responsive'] : $this->defaultSectionResponsive($type),
                'advanced' => is_array($sec['advanced'] ?? null) ? [
                    'element_id' => preg_replace('/[^a-zA-Z0-9_-]/', '', (string) ($sec['advanced']['element_id'] ?? '')),
                    'css_class' => preg_replace('/[^a-zA-Z0-9_\-\s]/', '', (string) ($sec['advanced']['css_class'] ?? '')),
                ] : ['element_id' => '', 'css_class' => ''],
                'translations' => $translations,
                'children' => $children,
            ];
        }

        $header = array_replace_recursive($defaults['header'], $this->stripBase64Images(is_array($raw['header'] ?? null) ? $raw['header'] : []));
        $footer = array_replace_recursive($defaults['footer'], $this->stripBase64Images(is_array($raw['footer'] ?? null) ? $raw['footer'] : []));
        $theme = array_replace_recursive($defaults['theme'], is_array($raw['theme'] ?? null) ? $raw['theme'] : []);
        $seo = array_replace_recursive($defaults['seo'], is_array($raw['seo'] ?? null) ? $raw['seo'] : []);

        // Ensure arrays like nav_items and footer link_groups replace cleanly instead of deep-merging extra deleted items
        if (isset($raw['header']['nav_items']) && is_array($raw['header']['nav_items'])) {
            $header['nav_items'] = array_values($raw['header']['nav_items']);
        }
        if (isset($raw['footer']['link_groups']) && is_array($raw['footer']['link_groups'])) {
            $footer['link_groups'] = array_values($raw['footer']['link_groups']);
        }
        if (isset($raw['footer']['payment_badges']) && is_array($raw['footer']['payment_badges'])) {
            $footer['payment_badges'] = array_values($raw['footer']['payment_badges']);
        }
        if (isset($raw['footer']['legal_links']) && is_array($raw['footer']['legal_links'])) {
            $footer['legal_links'] = array_values($raw['footer']['legal_links']);
        }

        return [
            'page' => 'homepage',
            'schema_version' => 2,
            'sections' => $sanitizedSections,
            'header' => $header,
            'footer' => $footer,
            'theme' => $theme,
            'seo' => $seo,
        ];
    }

    protected function sanitizeBlocks(array $blocks): array
    {
        $out = [];
        foreach ($blocks as $block) {
            if (!is_array($block)) {
                continue;
            }
            $type = (string) ($block['type'] ?? '');
            if (!in_array($type, self::BLOCK_TYPES, true)) {
                continue;
            }
            $props = $this->stripBase64Images(is_array($block['props'] ?? null) ? $block['props'] : []);
            if ($type === 'safe_embed' && isset($props['html'])) {
                $props['html'] = Html::sanitize((string) $props['html']);
            }
            $translations = [];
            foreach (['en', 'ko'] as $loc) {
                if (isset($block['translations'][$loc]) && is_array($block['translations'][$loc])) {
                    $translations[$loc] = $this->stripBase64Images($block['translations'][$loc]);
                }
            }

            $out[] = [
                'id' => $this->sanitizeId((string) ($block['id'] ?? ''), 'blk_' . Str::random(8)),
                'type' => $type,
                'label' => (string) ($block['label'] ?? Str::headline($type)),
                'visible' => array_key_exists('visible', $block) ? (bool) $block['visible'] : true,
                'locked' => (bool) ($block['locked'] ?? false),
                'props' => $props,
                'styles' => is_array($block['styles'] ?? null) ? $block['styles'] : [],
                'responsive' => is_array($block['responsive'] ?? null) ? $block['responsive'] : [],
                'advanced' => is_array($block['advanced'] ?? null) ? $block['advanced'] : [],
                'translations' => $translations,
            ];
        }

        return $out;
    }

    /**
     * Strip base64 inline data:image strings from CMS JSON to enforce Media Library references.
     */
    protected function stripBase64Images(array $data): array
    {
        array_walk_recursive($data, function (&$value) {
            if (is_string($value) && preg_match('/^data:image\/[a-zA-Z0-9+.-]+;base64,/i', $value)) {
                $value = '';
            }
        });
        return $data;
    }

    protected function sanitizeId(string $value, string $fallback): string
    {
        $clean = preg_replace('/[^a-zA-Z0-9_-]/', '', $value);
        return $clean !== '' ? Str::limit($clean, 80, '') : $fallback;
    }

    /**
     * Validate tree prior to publish. Returns ['errors' => [...], 'warnings' => [...]].
     */
    public function validateForPublish(array $tree): array
    {
        $errors = [];
        $warnings = [];

        $sections = $tree['sections'] ?? [];
        if (!is_array($sections) || count($sections) === 0) {
            $errors[] = 'Homepage harus memiliki minimal 1 section sebelum dipublikasikan.';
        }

        $activeCount = 0;
        foreach ($sections as $idx => $sec) {
            $pos = $idx + 1;
            $label = $sec['label'] ?? $sec['type'] ?? "Section #{$pos}";
            $type = $sec['type'] ?? '';

            if (!in_array($type, self::SECTION_TYPES, true)) {
                $errors[] = "Section '{$label}' memiliki tipe komponen yang tidak valid ({$type}).";
                continue;
            }

            if (!empty($sec['visible'])) {
                $activeCount++;
            }

            if (in_array($type, ['hero', 'cta', 'newsletter', 'why_us', 'about'], true) && !empty($sec['visible'])) {
                if (trim((string) ($sec['title'] ?? '')) === '') {
                    $errors[] = "Section '{$label}' wajib memiliki judul utama.";
                }
            }

            $content = $sec['content'] ?? [];
            foreach (['cta_primary_url', 'cta_secondary_url', 'cta_url', 'image_url', 'background_image'] as $urlField) {
                $val = trim((string) ($content[$urlField] ?? ''));
                if ($val !== '' && preg_match('/^\s*(javascript|vbscript|data:text\/html):/i', $val)) {
                    $errors[] = "URL tidak aman terdeteksi pada '{$label}' ({$urlField}).";
                }
            }

            if ($type === 'split_content' && !empty($sec['visible']) && empty($content['image_url'])) {
                $warnings[] = "Section '{$label}' belum memiliki gambar (akan menampilkan placeholder elegan).";
            }

            foreach ($sec['children'] ?? [] as $child) {
                $cType = $child['type'] ?? '';
                if (!in_array($cType, self::BLOCK_TYPES, true)) {
                    $errors[] = "Komponen anak pada '{$label}' bertipe tidak valid ({$cType}).";
                }
                if ($cType === 'image' && !empty($child['visible']) && empty($child['props']['url'])) {
                    $warnings[] = "Blok gambar '{$child['label']}' pada '{$label}' belum memilih media.";
                }
                if ($cType === 'button' && !empty($child['visible']) && trim((string) ($child['props']['url'] ?? '')) === '') {
                    $warnings[] = "Tombol '{$child['label']}' pada '{$label}' belum memiliki URL tujuan.";
                }
            }
        }

        if ($activeCount === 0 && count($sections) > 0) {
            $warnings[] = 'Seluruh section berstatus tersembunyi (hidden). Pengunjung publik akan melihat halaman kosong.';
        }

        // Validate header links
        foreach ($tree['header']['nav_items'] ?? [] as $nav) {
            $url = trim((string) ($nav['url'] ?? ''));
            if ($url !== '' && preg_match('/^\s*(javascript|vbscript):/i', $url)) {
                $errors[] = "URL navigasi header tidak valid: {$url}";
            }
        }

        return [
            'valid' => count($errors) === 0,
            'errors' => $errors,
            'warnings' => $warnings,
            'active_sections' => $activeCount,
            'total_sections' => count($sections),
        ];
    }

    /**
     * Save draft state into cms_pages without touching published_tree.
     */
    public function saveDraft(CmsPage $page, array $tree, ?User $user = null, bool $createRevision = false, ?string $label = null): array
    {
        $sanitized = $this->sanitizeTree($tree);
        $page->draft_tree = $sanitized;
        $page->draft_updated_at = now();
        $page->updated_by = $user?->id;
        $page->save();

        if ($createRevision) {
            CmsRevision::create([
                'page_slug' => $page->slug,
                'version' => $page->version,
                'status' => 'draft',
                'label' => $label ?: 'Manual Draft Save',
                'snapshot' => $sanitized,
                'created_by' => $user?->id,
                'created_by_name' => $user?->name ?: 'Administrator',
            ]);
            $this->pruneOldAutosaveRevisions($page->slug);
        }

        return $sanitized;
    }

    /**
     * Publish draft to live homepage, sync legacy tables, record revision, clear cache.
     */
    public function publishDraft(CmsPage $page, ?User $user = null, ?string $label = null): array
    {
        $draft = is_array($page->draft_tree) ? $page->draft_tree : $this->defaultTree();
        $sanitized = $this->sanitizeTree($draft);

        $validation = $this->validateForPublish($sanitized);
        if (!$validation['valid']) {
            throw ValidationException::withMessages([
                'publish' => $validation['errors'],
            ]);
        }

        DB::transaction(function () use ($page, $sanitized, $user, $label) {
            $newVersion = ($page->version ?: 0) + 1;
            $page->draft_tree = $sanitized;
            $page->published_tree = $sanitized;
            $page->version = $newVersion;
            $page->published_at = now();
            $page->published_by = $user?->id;
            $page->updated_by = $user?->id;
            $page->save();

            // Sync published sections into legacy cms_sections & cms_section_translations for backward compatibility
            $this->syncLegacySections($sanitized['sections'] ?? []);

            // Sync global settings into site_settings
            $this->syncLegacySiteSettings($sanitized);

            CmsRevision::create([
                'page_slug' => $page->slug,
                'version' => $newVersion,
                'status' => 'published',
                'label' => $label ?: "Published v{$newVersion}",
                'snapshot' => $sanitized,
                'created_by' => $user?->id,
                'created_by_name' => $user?->name ?: 'Administrator',
            ]);
        });

        $this->clearPublicCaches();

        return [
            'version' => $page->version,
            'published_at' => $page->published_at?->toIso8601String(),
            'validation' => $validation,
            'published' => $page->published_tree,
        ];
    }

    /**
     * Localize a full page tree for 'id' | 'en' | 'ko'.
     */
    public function localizeTree(array $tree, string $locale = 'id', bool $onlyVisible = true): array
    {
        $loc = in_array($locale, ['id', 'en', 'ko'], true) ? $locale : 'id';
        $sections = is_array($tree['sections'] ?? null) ? $tree['sections'] : [];

        $outSections = [];
        foreach ($sections as $idx => $sec) {
            $visible = array_key_exists('visible', $sec) ? (bool) $sec['visible'] : true;
            if ($onlyVisible && !$visible) {
                continue;
            }

            $tr = $loc !== 'id' ? ($sec['translations'][$loc] ?? null) : null;
            $title = !empty($tr['title']) ? $tr['title'] : ($sec['title'] ?? '');
            $subtitle = !empty($tr['subtitle']) ? $tr['subtitle'] : ($sec['subtitle'] ?? '');
            $baseContent = is_array($sec['content'] ?? null) ? $sec['content'] : [];
            $trContent = is_array($tr['content'] ?? null) ? array_filter($tr['content'], fn ($v) => $v !== null && $v !== '') : [];
            $content = array_merge($baseContent, $trContent);

            $children = [];
            foreach ($sec['children'] ?? [] as $child) {
                $childVisible = array_key_exists('visible', $child) ? (bool) $child['visible'] : true;
                if ($onlyVisible && !$childVisible) {
                    continue;
                }
                $cTr = $loc !== 'id' ? ($child['translations'][$loc] ?? null) : null;
                $cProps = is_array($child['props'] ?? null) ? $child['props'] : [];
                if (is_array($cTr)) {
                    $cProps = array_merge($cProps, array_filter($cTr, fn ($v) => $v !== null && $v !== ''));
                }
                $children[] = array_merge($child, ['props' => $cProps]);
            }

            $outSections[] = [
                'id' => $sec['id'],
                'key' => $sec['key'],
                'type' => $sec['type'],
                'label' => $sec['label'] ?? Str::headline($sec['type']),
                'title' => $title,
                'subtitle' => $subtitle,
                'content' => $content,
                'settings' => $sec['settings'] ?? [],
                'styles' => $sec['styles'] ?? [],
                'responsive' => $sec['responsive'] ?? [],
                'advanced' => $sec['advanced'] ?? [],
                'children' => $children,
                'sort_order' => (int) ($sec['order'] ?? ($idx + 1)),
                'order' => (int) ($sec['order'] ?? ($idx + 1)),
                'is_active' => $visible,
                'visible' => $visible,
                'locked' => (bool) ($sec['locked'] ?? false),
            ];
        }

        return [
            'sections' => $outSections,
            'header' => $tree['header'] ?? $this->defaultHeader(),
            'footer' => $tree['footer'] ?? $this->defaultFooter(),
            'theme' => $tree['theme'] ?? $this->defaultTheme(),
            'seo' => $tree['seo'] ?? [],
        ];
    }

    public function clearPublicCaches(): void
    {
        foreach (['id', 'en', 'ko'] as $loc) {
            Cache::forget("cms_homepage_pub_{$loc}");
        }
        Cache::forget('cms_public_settings');
    }

    protected function syncLegacySections(array $sections): void
    {
        $keptKeys = [];

        foreach ($sections as $idx => $sec) {
            $baseKey = Str::slug((string) ($sec['key'] ?? $sec['id'] ?? "section-{$idx}"), '_');
            if ($baseKey === '') {
                $baseKey = 'section_' . ($idx + 1);
            }
            $key = $baseKey;
            $suffix = 2;
            while (in_array($key, $keptKeys, true)) {
                $key = $baseKey . '_' . $suffix++;
            }
            $keptKeys[] = $key;

            $model = CmsSection::updateOrCreate(
                ['key' => $key],
                [
                    'uid' => $sec['id'] ?? $key,
                    'type' => $sec['type'],
                    'title' => Str::limit((string) ($sec['title'] ?: $sec['label'] ?: $sec['type']), 250, ''),
                    'subtitle' => $sec['subtitle'] ?? null,
                    'content' => $sec['content'] ?? [],
                    'settings' => array_merge($sec['settings'] ?? [], [
                        'styles' => $sec['styles'] ?? [],
                        'responsive' => $sec['responsive'] ?? [],
                        'advanced' => $sec['advanced'] ?? [],
                    ]),
                    'children' => $sec['children'] ?? [],
                    'sort_order' => $idx + 1,
                    'is_active' => (bool) ($sec['visible'] ?? true),
                    'is_published' => true,
                    'draft_content' => null,
                    'draft_payload' => null,
                ]
            );

            foreach (['en', 'ko'] as $loc) {
                if (isset($sec['translations'][$loc])) {
                    $tr = $sec['translations'][$loc];
                    CmsSectionTranslation::updateOrCreate(
                        ['cms_section_id' => $model->id, 'locale' => $loc],
                        [
                            'title' => $tr['title'] ?? null,
                            'subtitle' => $tr['subtitle'] ?? null,
                            'content' => $tr['content'] ?? null,
                        ]
                    );
                }
            }
        }

        if (!empty($keptKeys)) {
            CmsSection::whereNotIn('key', $keptKeys)->delete();
        }
    }

    protected function syncLegacySiteSettings(array $tree): void
    {
        $header = $tree['header'] ?? [];
        $footer = $tree['footer'] ?? [];
        $theme = $tree['theme'] ?? [];
        $seo = $tree['seo'] ?? [];

        SiteSetting::set('site_name', $header['brand_name'] ?? 'INPARTNER', 'brand', true);
        SiteSetting::set('site_tagline', $header['tagline'] ?? 'Research', 'brand', true);
        SiteSetting::set('site_logo', $header['logo_url'] ?? '/inpartner_logo.jpeg', 'brand', true);
        SiteSetting::set('site_description', $footer['description'] ?? '', 'brand', true);

        SiteSetting::set('contact_email', $footer['contact_email'] ?? '', 'footer', true);
        SiteSetting::set('contact_phone', $footer['contact_phone'] ?? '', 'footer', true);
        SiteSetting::set('social_linkedin', $footer['social_linkedin'] ?? '', 'footer', true);
        SiteSetting::set('social_twitter', $footer['social_twitter'] ?? '', 'footer', true);
        SiteSetting::set('social_instagram', $footer['social_instagram'] ?? '', 'footer', true);
        SiteSetting::set('footer_copyright', $footer['copyright'] ?? '', 'footer', true);

        SiteSetting::set('seo_meta_title', $seo['meta_title'] ?? '', 'seo', true);
        SiteSetting::set('seo_meta_description', $seo['meta_description'] ?? '', 'seo', true);

        SiteSetting::set('cms_header_config', $header, 'navbar', true);
        SiteSetting::set('cms_footer_config', $footer, 'footer', true);
        SiteSetting::set('cms_theme_config', $theme, 'theme', true);
    }

    protected function pruneOldAutosaveRevisions(string $slug): void
    {
        $excessIds = CmsRevision::where('page_slug', $slug)
            ->where('status', 'draft')
            ->orderByDesc('id')
            ->skip(25)
            ->take(100)
            ->pluck('id');

        if ($excessIds->isNotEmpty()) {
            CmsRevision::whereIn('id', $excessIds)->delete();
        }
    }

    public function defaultHeader(): array
    {
        return [
            'brand_name' => 'INPARTNER',
            'tagline' => 'Research',
            'logo_url' => '/inpartner_logo.jpeg',
            'sticky' => true,
            'background_color' => '#FFFFFF',
            'blur' => true,
            'show_search' => true,
            'search_placeholder' => 'Search Reports',
            'show_language_switcher' => true,
            'show_wishlist' => true,
            'show_cart' => true,
            'login_label' => 'Masuk',
            'register_label' => 'Daftar',
            'nav_items' => [
                [
                    'id' => 'nav_reports',
                    'label' => 'Reports & Insights',
                    'url' => '/thematic-research',
                    'type' => 'dropdown',
                    'children' => [
                        [
                            'id' => 'nav_thematic',
                            'label' => 'Riset Tematik',
                            'description' => 'Tren industri & isu makro masa depan',
                            'url' => '/thematic-research',
                            'icon' => 'BookOpen',
                        ],
                        [
                            'id' => 'nav_sector',
                            'label' => 'Kajian Sektor',
                            'description' => 'Analisis mendalam performa sektor riil',
                            'url' => '/sector-insights',
                            'icon' => 'BarChart3',
                        ],
                    ],
                ],
                [
                    'id' => 'nav_custom',
                    'label' => 'Research With Us',
                    'url' => '/custom-analysis',
                    'type' => 'link',
                    'icon' => 'Sparkles',
                    'children' => [],
                ],
            ],
        ];
    }

    public function defaultFooter(): array
    {
        return [
            'brand_name' => 'INPARTNER',
            'logo_url' => '/inpartner_logo.jpeg',
            'description' => 'Platform publikasi artikel riset, analisis industri, dan jurnal digital profesional terkurasi untuk keputusan bisnis strategis.',
            'background_color' => '#FFFFFF',
            'text_color' => '#64748B',
            'heading_color' => '#0F172A',
            'contact_email' => 'editorial@inpartner.id',
            'contact_phone' => '+62 21 5088 0123',
            'office_address' => 'Jakarta, Indonesia',
            'social_linkedin' => 'https://linkedin.com/company/inpartner',
            'social_twitter' => 'https://x.com/inpartner_id',
            'social_instagram' => 'https://instagram.com/inpartner.id',
            'show_contact' => false,
            'show_socials' => false,
            'show_newsletter' => false,
            'newsletter_title' => 'Briefing Mingguan',
            'newsletter_placeholder' => 'Email korporasi...',
            'newsletter_button' => 'Daftar',
            'link_groups' => [
                [
                    'id' => 'fg_categories',
                    'title' => 'Kategori Utama',
                    'links' => [
                        ['id' => 'fl_1', 'label' => 'Artikel Riset', 'url' => '/products?type=article'],
                        ['id' => 'fl_2', 'label' => 'Ebook & Playbook', 'url' => '/products?type=ebook'],
                        ['id' => 'fl_3', 'label' => 'Jurnal Ilmiah', 'url' => '/products?type=journal'],
                        ['id' => 'fl_4', 'label' => 'Paper Analisis', 'url' => '/products?type=research_paper'],
                    ],
                ],
                [
                    'id' => 'fg_quick',
                    'title' => 'Akses Cepat',
                    'links' => [
                        ['id' => 'fl_5', 'label' => 'Semua Artikel', 'url' => '/products'],
                        ['id' => 'fl_6', 'label' => 'Artikel Terpopuler', 'url' => '/products?sort=popular'],
                        ['id' => 'fl_7', 'label' => 'Riset Gratis', 'url' => '/products?price=free'],
                        ['id' => 'fl_8', 'label' => 'Library Pembaca', 'url' => '/library'],
                    ],
                ],
            ],
            'show_payment_block' => true,
            'payment_title' => 'Pembayaran & Keamanan',
            'payment_desc' => 'Transaksi diproses secara instan dan terenkripsi aman via Midtrans Payment Gateway.',
            'payment_badges' => ['Midtrans Verified', 'QRIS / Bank Transfer'],
            'copyright' => '© 2026 Inpartner Editorial Group. All rights reserved.',
            'standard_text' => 'Standar Desain & Analisis Profesional',
            'legal_links' => [],
        ];
    }

    public function defaultTheme(): array
    {
        return [
            'colors' => [
                'primary' => '#1976D2',
                'primary_hover' => '#1562AF',
                'primary_pressed' => '#0C3B69',
                'primary_surface' => '#D1E4F6',
                'primary_border' => '#B2D1F0',
                'secondary' => '#0F172A',
                'accent' => '#1976D2',
                'canvas' => '#F8FAFC',
                'surface' => '#FFFFFF',
                'text_heading' => '#0F172A',
                'text_body' => '#334155',
                'text_muted' => '#64748B',
                'border' => '#E2E8F0',
            ],
            'typography' => [
                'font_primary' => 'Inter',
                'font_supporting' => 'PT Sans',
                'heading_scale' => 'balanced', // compact | balanced | editorial
                'body_size' => 16,
                'line_height' => 1.6,
                'heading_weight' => '800',
                'letter_spacing' => '-0.02em',
            ],
            'layout' => [
                'container_width' => 'max-w-7xl', // max-w-6xl | max-w-7xl | max-w-[1400px]
                'section_spacing' => 'normal', // compact | normal | spacious
                'grid_gap' => '24px',
                'border_radius' => 'rounded', // sharp | rounded | pill
                'button_style' => 'solid', // solid | soft | outline
            ],
        ];
    }

    public function defaultSectionStyles(string $type): array
    {
        return [
            'background_color' => $type === 'cta' ? '#0F172A' : ($type === 'why_us' || $type === 'about' || $type === 'newsletter' ? '#FFFFFF' : 'transparent'),
            'text_color' => $type === 'cta' ? '#FFFFFF' : '#0F172A',
            'padding_y' => 'normal',
            'border_radius' => in_array($type, ['why_us', 'about', 'cta', 'newsletter'], true) ? '24px' : '0px',
            'shadow' => in_array($type, ['cta'], true) ? 'md' : 'none',
            'text_align' => in_array($type, ['hero', 'categories', 'newsletter'], true) ? 'center' : 'left',
        ];
    }

    public function defaultSectionResponsive(string $type): array
    {
        $cols = match ($type) {
            'featured_products', 'why_us' => 4,
            'latest_products', 'testimonials', 'image_gallery' => 3,
            'statistics' => 4,
            default => 1,
        };

        return [
            'desktop' => ['visible' => true, 'columns' => $cols],
            'tablet' => ['visible' => true, 'columns' => min($cols, 2)],
            'mobile' => ['visible' => true, 'columns' => 1],
        ];
    }

    public function defaultSections(): array
    {
        return [
            [
                'id' => 'sec_hero',
                'key' => 'hero',
                'type' => 'hero',
                'label' => 'Hero Utama',
                'visible' => true,
                'locked' => false,
                'order' => 1,
                'title' => 'Brilliant Decisions Start with Strategic Insight.',
                'subtitle' => 'Access the reports, research, and articles you need to lead with confidence.',
                'content' => [
                    'eyebrow' => 'Evidence-Based Intelligence Platform',
                    'show_badge' => false,
                    'badge_text' => 'Edisi Terverifikasi 2026',
                    'cta_primary_label' => 'Jelajahi Katalog Riset',
                    'cta_primary_url' => '/products',
                    'cta_secondary_label' => 'Layanan Analisis Kustom',
                    'cta_secondary_url' => '/products?custom=true',
                    'image_url' => '',
                    'image_alt' => 'Inpartner Strategic Intelligence',
                ],
                'settings' => ['layout' => 'centered'],
                'styles' => $this->defaultSectionStyles('hero'),
                'responsive' => $this->defaultSectionResponsive('hero'),
                'advanced' => ['element_id' => 'hero', 'css_class' => ''],
                'translations' => [
                    'en' => [
                        'title' => 'Brilliant Decisions Start with Strategic Insight.',
                        'subtitle' => 'Access the reports, research, and articles you need to lead with confidence.',
                        'content' => [
                            'eyebrow' => 'Evidence-Based Intelligence Platform',
                            'cta_primary_label' => 'Explore Research Catalog',
                            'cta_secondary_label' => 'Custom Analysis Services',
                            'badge_text' => '2026 Verified Editions',
                        ],
                    ],
                    'ko' => [
                        'title' => '비즈니스 리더를 위한 전략적 인텔리전스 및 검증된 연구 보고서',
                        'subtitle' => '업계 전문가와 수석 분석가가 큐레이션한 심층 경제 분석 및 산업 연구 문서를 확인하세요.',
                        'content' => [
                            'eyebrow' => '데이터 기반 인텔리전스 플랫폼',
                            'cta_primary_label' => '연구 카탈로그 둘러보기',
                            'cta_secondary_label' => '맞춤형 분석 서비스',
                            'badge_text' => '2026 검증 리포트',
                        ],
                    ],
                ],
                'children' => [],
            ],
            [
                'id' => 'sec_featured_products',
                'key' => 'featured_products',
                'type' => 'featured_products',
                'label' => 'Publikasi Pilihan (Featured)',
                'visible' => true,
                'locked' => false,
                'order' => 2,
                'title' => 'Latest Reports',
                'subtitle' => '',
                'content' => [
                    'view_all_label' => 'Semua Publikasi',
                    'view_all_url' => '/products',
                ],
                'settings' => [
                    'source' => 'featured',
                    'category_slug' => '',
                    'max_items' => 4,
                    'sort' => 'newest',
                    'show_price' => false,
                    'card_layout' => 'editorial',
                ],
                'styles' => $this->defaultSectionStyles('featured_products'),
                'responsive' => $this->defaultSectionResponsive('featured_products'),
                'advanced' => ['element_id' => 'featured-reports', 'css_class' => ''],
                'translations' => [
                    'en' => ['title' => 'Latest Reports', 'subtitle' => '', 'content' => ['view_all_label' => 'All Publications']],
                    'ko' => ['title' => '최신 주요 보고서', 'subtitle' => '', 'content' => ['view_all_label' => '전체 보고서']],
                ],
                'children' => [],
            ],
            [
                'id' => 'sec_categories',
                'key' => 'categories',
                'type' => 'categories',
                'label' => 'Eksplorasi Sektor & Kategori',
                'visible' => true,
                'locked' => false,
                'order' => 3,
                'title' => 'Eksplorasi Bidang & Industri',
                'subtitle' => 'Jelajahi analisis mendalam menurut fokus sektor dan spesialisasi kajian ekonomi.',
                'content' => [],
                'settings' => [
                    'source' => 'catalog',
                    'display_style' => 'pills',
                    'max_items' => 10,
                    'show_counts' => true,
                ],
                'styles' => $this->defaultSectionStyles('categories'),
                'responsive' => $this->defaultSectionResponsive('categories'),
                'advanced' => ['element_id' => 'categories', 'css_class' => ''],
                'translations' => [
                    'en' => [
                        'title' => 'Explore by Sector & Discipline',
                        'subtitle' => 'Explore rigorous deep-dives tailored to industry sectors and economic specializations.',
                    ],
                    'ko' => [
                        'title' => '산업 및 분야별 탐색',
                        'subtitle' => '산업 부문 및 경제 전문 연구 주제별로 심층 분석을 탐색하세요.',
                    ],
                ],
                'children' => [],
            ],
            [
                'id' => 'sec_why_us',
                'key' => 'why_us',
                'type' => 'why_us',
                'label' => 'Keunggulan & Metodologi (Why Us)',
                'visible' => true,
                'locked' => false,
                'order' => 4,
                'title' => 'Mengapa Para Pengambil Keputusan Mengandalkan Inpartner',
                'subtitle' => 'Kualitas analisis yang didasarkan pada data primer dan metodologi empiris yang teruji.',
                'content' => [
                    'items' => [
                        [
                            'id' => 'why_1',
                            'icon' => 'ShieldCheck',
                            'title' => 'Data Primer Terverifikasi',
                            'description' => 'Setiap publikasi melalui validasi sumber primer, triangulasi data resmi BPS, BI, dan regulator terkait.',
                        ],
                        [
                            'id' => 'why_2',
                            'icon' => 'Briefcase',
                            'title' => 'Senior Partner Review',
                            'description' => 'Ditelaah langsung oleh praktisi industri dengan pengalaman lebih dari 15 tahun di sektornya.',
                        ],
                        [
                            'id' => 'why_3',
                            'icon' => 'FileSpreadsheet',
                            'title' => 'Termasuk Model Data Excel',
                            'description' => 'Unduh spreadsheet siap pakai untuk analisis mandiri dan pemodelan finansial instan.',
                        ],
                        [
                            'id' => 'why_4',
                            'icon' => 'BookOpen',
                            'title' => 'Reader Digital Multidevice',
                            'description' => 'Baca langsung di desktop, tablet, maupun mobile dengan fitur bookmark dan resume posisi otomatis.',
                        ],
                    ],
                ],
                'settings' => ['card_style' => 'surface'],
                'styles' => $this->defaultSectionStyles('why_us'),
                'responsive' => $this->defaultSectionResponsive('why_us'),
                'advanced' => ['element_id' => 'why-us', 'css_class' => ''],
                'translations' => [
                    'en' => [
                        'title' => 'Why Decision Makers Rely on Inpartner',
                        'subtitle' => 'Analytical precision grounded in empirical methodology and verified primary datasets.',
                        'content' => [
                            'items' => [
                                ['id' => 'why_1', 'icon' => 'ShieldCheck', 'title' => 'Verified Primary Data', 'description' => 'Each publication undergoes rigorous source triangulation with official central bank and statistical agencies.'],
                                ['id' => 'why_2', 'icon' => 'Briefcase', 'title' => 'Senior Partner Review', 'description' => 'Reviewed by seasoned industry practitioners with over 15 years of on-the-ground experience.'],
                                ['id' => 'why_3', 'icon' => 'FileSpreadsheet', 'title' => 'Includes Excel Datasets', 'description' => 'Download accompanying structured spreadsheets for your own proprietary modeling.'],
                                ['id' => 'why_4', 'icon' => 'BookOpen', 'title' => 'Cross-Platform Digital Reader', 'description' => 'Read seamlessly across desktop, tablet, and mobile with auto-saved reading progress.'],
                            ],
                        ],
                    ],
                    'ko' => [
                        'title' => '의사결정권자들이 Inpartner를 신뢰하는 이유',
                        'subtitle' => '실증적 연구 방법론과 신뢰할 수 있는 1차 데이터에 기반한 고품질 분석.',
                        'content' => [
                            'items' => [
                                ['id' => 'why_1', 'icon' => 'ShieldCheck', 'title' => '검증된 1차 데이터', 'description' => '모든 보고서는 중앙은행 및 공공 통계 기관 데이터와의 교차 검증을 거칩니다.'],
                                ['id' => 'why_2', 'icon' => 'Briefcase', 'title' => '수석 파트너 감수', 'description' => '업계 15년 이상의 경력을 가진 전문가들이 엄격하게 감수합니다.'],
                                ['id' => 'why_3', 'icon' => 'FileSpreadsheet', 'title' => 'Excel 데이터셋 포함', 'description' => '독립적인 재무 모델링을 위해 즉시 사용 가능한 스프레드시트를 제공합니다.'],
                                ['id' => 'why_4', 'icon' => 'BookOpen', 'title' => '멀티 디바이스 디지털 리더', 'description' => '북마크 및 진도 저장 기능으로 모든 기기에서 편안하게 읽을 수 있습니다.'],
                            ],
                        ],
                    ],
                ],
                'children' => [],
            ],
            [
                'id' => 'sec_latest_products',
                'key' => 'latest_products',
                'type' => 'latest_products',
                'label' => 'Riset & Dokumen Terbaru',
                'visible' => true,
                'locked' => false,
                'order' => 5,
                'title' => 'Riset & Dokumen Terbaru',
                'subtitle' => 'Publikasi terkini yang baru saja diterbitkan oleh tim editorial dan analis Inpartner.',
                'content' => [
                    'view_all_label' => 'Lihat Semua Dokumen',
                    'view_all_url' => '/products?sort=newest',
                ],
                'settings' => [
                    'source' => 'latest',
                    'category_slug' => '',
                    'max_items' => 6,
                    'sort' => 'newest',
                    'show_price' => false,
                    'card_layout' => 'editorial',
                ],
                'styles' => $this->defaultSectionStyles('latest_products'),
                'responsive' => $this->defaultSectionResponsive('latest_products'),
                'advanced' => ['element_id' => 'latest-products', 'css_class' => ''],
                'translations' => [
                    'en' => [
                        'title' => 'Latest Publications & Research',
                        'subtitle' => 'Freshly published intelligence papers by the Inpartner editorial and research lab.',
                        'content' => ['view_all_label' => 'View All Documents'],
                    ],
                    'ko' => [
                        'title' => '최신 연구 및 출판물',
                        'subtitle' => 'Inpartner 연구팀이 최근 발표한 최신 분석 보고서입니다.',
                        'content' => ['view_all_label' => '모든 문서 보기'],
                    ],
                ],
                'children' => [],
            ],
            [
                'id' => 'sec_about',
                'key' => 'about',
                'type' => 'about',
                'label' => 'Tentang Platform (About)',
                'visible' => true,
                'locked' => false,
                'order' => 6,
                'title' => 'Membuka Akses Intelligence Bisnis Kelas Satu',
                'subtitle' => '',
                'content' => [
                    'description' => 'Kami percaya keputusan strategis terbaik lahir dari data yang akurat dan sintesis analitis yang tajam. Platform kami dirancang untuk eksekutif, konsultan, analis investasi, dan praktisi bisnis yang membutuhkan wawasan berkualitas tanpa bias.',
                    'stats' => [
                        ['id' => 'st_1', 'label' => 'Publikasi Terverifikasi', 'value' => '150+'],
                        ['id' => 'st_2', 'label' => 'Pembaca Eksekutif', 'value' => '12.000+'],
                        ['id' => 'st_3', 'label' => 'Kepuasan Riset', 'value' => '98.4%'],
                    ],
                    'cta_label' => 'Jelajahi Metodologi & Riset',
                    'cta_url' => '/products',
                    'card_title' => 'Komitmen Independensi Editorial',
                    'card_desc' => 'Semua analisis dan ringkasan riset di Inpartner diterbitkan tanpa sponsor terselubung. Kepercayaan pembaca profesional adalah aset utama kami.',
                    'card_location' => 'Jakarta, Indonesia',
                    'card_lab_name' => 'Inpartner Research Lab',
                    'image_url' => '',
                ],
                'settings' => ['layout' => 'split-card'],
                'styles' => $this->defaultSectionStyles('about'),
                'responsive' => $this->defaultSectionResponsive('about'),
                'advanced' => ['element_id' => 'about-platform', 'css_class' => ''],
                'translations' => [
                    'en' => [
                        'title' => 'Unlocking First-Class Business Intelligence',
                        'subtitle' => '',
                        'content' => [
                            'description' => 'We believe the strongest business decisions stem from empirical clarity and rigorous analytical synthesis. Our platform empowers executives, investment managers, and analysts with unbiased actionable intelligence.',
                            'stats' => [
                                ['id' => 'st_1', 'label' => 'Verified Publications', 'value' => '150+'],
                                ['id' => 'st_2', 'label' => 'Executive Readers', 'value' => '12,000+'],
                                ['id' => 'st_3', 'label' => 'Satisfaction Rate', 'value' => '98.4%'],
                            ],
                            'cta_label' => 'Explore Our Research',
                            'card_title' => 'Editorial Independence Commitment',
                            'card_desc' => 'All analyses and research briefs at Inpartner are published free from undisclosed sponsorships.',
                        ],
                    ],
                    'ko' => [
                        'title' => '최고 수준의 비즈니스 인텔리전스 제공',
                        'subtitle' => '',
                        'content' => [
                            'description' => '최고의 의사결정은 정확한 데이터와 명확한 분석에서 출발합니다. 편향 없는 신뢰할 수 있는 인사이트를 제공합니다.',
                            'stats' => [
                                ['id' => 'st_1', 'label' => '검증된 보고서', 'value' => '150+'],
                                ['id' => 'st_2', 'label' => '기업 리더 독자', 'value' => '12,000+'],
                                ['id' => 'st_3', 'label' => '고객 만족도', 'value' => '98.4%'],
                            ],
                            'cta_label' => '연구 보고서 둘러보기',
                        ],
                    ],
                ],
                'children' => [],
            ],
            [
                'id' => 'sec_cta',
                'key' => 'cta',
                'type' => 'cta',
                'label' => 'CTA Analisis Kustom',
                'visible' => true,
                'locked' => false,
                'order' => 7,
                'title' => 'Butuh Riset Khusus untuk Kebutuhan Korporasi Anda?',
                'subtitle' => 'Tim analis senior Inpartner siap menyusun studi kelayakan pasar, due diligence ekonomi, dan kajian regulasi eksklusif.',
                'content' => [
                    'cta_primary_label' => 'Ajukan Custom Analysis',
                    'cta_primary_url' => '/products?custom=true',
                    'cta_secondary_label' => 'Lihat Katalog Lengkap',
                    'cta_secondary_url' => '/products',
                ],
                'settings' => ['theme' => 'dark', 'alignment' => 'left'],
                'styles' => $this->defaultSectionStyles('cta'),
                'responsive' => $this->defaultSectionResponsive('cta'),
                'advanced' => ['element_id' => 'cta-custom', 'css_class' => ''],
                'translations' => [
                    'en' => [
                        'title' => 'Need Tailored Research for Your Organization?',
                        'subtitle' => 'Our senior partners provide bespoke market feasibility studies, policy assessments, and proprietary sector modeling.',
                        'content' => [
                            'cta_primary_label' => 'Request Custom Analysis',
                            'cta_secondary_label' => 'View Full Catalog',
                        ],
                    ],
                    'ko' => [
                        'title' => '기업 맞춤형 전문 연구가 필요하신가요?',
                        'subtitle' => 'Inpartner 수석 분석팀이 시장 타당성 조사 및 규제 정책 맞춤 연구를 수행합니다.',
                        'content' => [
                            'cta_primary_label' => '맞춤 분석 의뢰하기',
                            'cta_secondary_label' => '전체 카탈로그 보기',
                        ],
                    ],
                ],
                'children' => [],
            ],
            [
                'id' => 'sec_newsletter',
                'key' => 'newsletter',
                'type' => 'newsletter',
                'label' => 'Newsletter Briefing',
                'visible' => true,
                'locked' => false,
                'order' => 8,
                'title' => 'Dapatkan Briefing Intelijen Mingguan',
                'subtitle' => 'Bergabung bersama 10.000+ analis dan pimpinan korporasi yang menerima rangkuman strategis setiap Senin pagi.',
                'content' => [
                    'placeholder' => 'Masukkan alamat email korporasi Anda...',
                    'button_label' => 'Berlangganan Gratis',
                    'disclaimer' => 'Bebas spam. Anda dapat membatalkan langganan kapan saja.',
                    'success_message' => 'Terima kasih! Email Anda telah terdaftar untuk executive brief kami.',
                ],
                'settings' => ['layout' => 'card'],
                'styles' => $this->defaultSectionStyles('newsletter'),
                'responsive' => $this->defaultSectionResponsive('newsletter'),
                'advanced' => ['element_id' => 'newsletter', 'css_class' => ''],
                'translations' => [
                    'en' => [
                        'title' => 'Receive Our Weekly Strategic Briefing',
                        'subtitle' => 'Join 10,000+ corporate leaders and analysts who start their Monday with our curated executive brief.',
                        'content' => [
                            'button_label' => 'Subscribe for Free',
                            'placeholder' => 'Enter your corporate email address...',
                            'disclaimer' => 'Zero spam. You can unsubscribe at any time.',
                        ],
                    ],
                    'ko' => [
                        'title' => '주간 전략 브리핑을 받아보세요',
                        'subtitle' => '매주 월요일 아침, 10,000명 이상의 비즈니스 리더들이 받아보는 핵심 요약 보고서입니다.',
                        'content' => [
                            'button_label' => '무료 구독하기',
                            'placeholder' => '회사 이메일 주소를 입력하세요...',
                            'disclaimer' => '스팸 없음. 언제든지 구독을 취소할 수 있습니다.',
                        ],
                    ],
                ],
                'children' => [],
            ],
        ];
    }

    protected function defaultSystemTemplates(): array
    {
        return [
            [
                'uid' => 'tpl_hero_split',
                'name' => 'Hero dengan Visual & Badge',
                'category' => 'hero',
                'description' => 'Layout split 2 kolom dengan badge, headline tegas, dual CTA, dan gambar editorial.',
                'thumbnail_type' => 'hero',
                'section_data' => [
                    'type' => 'hero',
                    'label' => 'Hero Split Layout',
                    'title' => 'Riset Strategis & Data Primer untuk Eksekutif',
                    'subtitle' => 'Sintesis ekonomi mendalam, kajian regulasi, dan model data industri yang dirancang untuk pengambilan keputusan berisiko tinggi.',
                    'settings' => ['layout' => 'split'],
                    'content' => [
                        'eyebrow' => 'Inpartner Intelligence',
                        'show_badge' => true,
                        'badge_text' => 'Edisi Riset Q4 2026',
                        'cta_primary_label' => 'Jelajahi Katalog',
                        'cta_primary_url' => '/products',
                        'cta_secondary_label' => 'Ajukan Studi Khusus',
                        'cta_secondary_url' => '/custom-analysis',
                        'image_url' => '',
                    ],
                ],
            ],
            [
                'uid' => 'tpl_features_3col',
                'name' => 'Keunggulan 3 Kolom (Three-Column Features)',
                'category' => 'features',
                'description' => 'Grid 3 kolom untuk memaparkan pilar metodologi atau layanan utama.',
                'thumbnail_type' => 'why_us',
                'section_data' => [
                    'type' => 'why_us',
                    'label' => 'Pilar Keunggulan 3 Kolom',
                    'title' => 'Metodologi Berstandar Institusional',
                    'subtitle' => 'Tiga fondasi riset yang menjaga akurasi setiap laporan Inpartner.',
                    'responsive' => [
                        'desktop' => ['visible' => true, 'columns' => 3],
                        'tablet' => ['visible' => true, 'columns' => 2],
                        'mobile' => ['visible' => true, 'columns' => 1],
                    ],
                    'content' => [
                        'items' => [
                            ['id' => 'f1', 'icon' => 'ShieldCheck', 'title' => 'Validasi Multi-Sumber', 'description' => 'Triangulasi data resmi regulator, survei lapangan, dan laporan keuangan emiten.'],
                            ['id' => 'f2', 'icon' => 'LineChart', 'title' => 'Pemodelan Kuantitatif', 'description' => 'Dilengkapi asumsi sensitivitas dan proyeksi skenario yang transparan.'],
                            ['id' => 'f3', 'icon' => 'Briefcase', 'title' => 'Relevansi Eksekusi', 'description' => 'Disusun oleh analis berpengalaman untuk langsung diterapkan pada strategi korporasi.'],
                        ],
                    ],
                ],
            ],
            [
                'uid' => 'tpl_product_carousel',
                'name' => 'Showcase Carousel Publikasi',
                'category' => 'products',
                'description' => 'Carousel horizontal interaktif untuk menonjolkan publikasi pilihan atau tematik.',
                'thumbnail_type' => 'product_carousel',
                'section_data' => [
                    'type' => 'product_carousel',
                    'label' => 'Showcase Carousel Publikasi',
                    'title' => 'Publikasi Riset Terkurasi',
                    'subtitle' => 'Geser untuk menelusuri laporan strategis terpopuler bulan ini.',
                    'settings' => ['source' => 'popular', 'max_items' => 8, 'show_price' => false],
                    'content' => ['view_all_label' => 'Lihat Semua', 'view_all_url' => '/products?sort=popular'],
                ],
            ],
            [
                'uid' => 'tpl_promo_banner',
                'name' => 'Banner Promosi / Pengumuman',
                'category' => 'conversion',
                'description' => 'Banner promosi terintegrasi dengan aset promo dan CTA langsung.',
                'thumbnail_type' => 'promo_banner',
                'section_data' => [
                    'type' => 'promo_banner',
                    'label' => 'Promotional Banner',
                    'title' => 'Akses Seri Laporan Prospek Ekonomi 2026',
                    'subtitle' => 'Dapatkan paket bundel analisis makroekonomi, perbankan, dan transisi energi untuk tim strategi Anda.',
                    'settings' => ['source' => 'custom', 'theme' => 'primary'],
                    'content' => [
                        'eyebrow' => 'Rilis Eksklusif',
                        'cta_primary_label' => 'Pelajari Selengkapnya',
                        'cta_primary_url' => '/thematic-research',
                    ],
                ],
            ],
            [
                'uid' => 'tpl_testimonials',
                'name' => 'Testimoni Pimpinan & Analis',
                'category' => 'social_proof',
                'description' => 'Kartu kutipan terpercaya dari eksekutif, analis investasi, dan mitra korporasi.',
                'thumbnail_type' => 'testimonials',
                'section_data' => [
                    'type' => 'testimonials',
                    'label' => 'Testimoni Pembaca Eksekutif',
                    'title' => 'Dipercaya oleh Para Pengambil Keputusan',
                    'subtitle' => 'Bagaimana laporan Inpartner membantu tim strategi dan investasi di berbagai sektor.',
                    'content' => [
                        'items' => [
                            ['id' => 't1', 'quote' => 'Sintesis kebijakan moneter dan pemetaan likuiditas perbankan dari Inpartner menjadi rujukan utama rapat komite investasi kami.', 'name' => 'Hendra Wijaya', 'role' => 'Chief Investment Officer', 'organization' => 'Mandala Asset Management'],
                            ['id' => 't2', 'quote' => 'Model Excel pendampingnya menghemat waktu analisis tim kami hingga puluhan jam kerja setiap kuartal.', 'name' => 'Siti Nurhaliza', 'role' => 'VP Corporate Strategy', 'organization' => 'Nusantara Energy Tbk'],
                            ['id' => 't3', 'quote' => 'Kedalaman data primer Indonesia yang sulit ditemukan di laporan riset global generik.', 'name' => 'Daniel Park', 'role' => 'Director of Research', 'organization' => 'Seoul-ASEAN Capital'],
                        ],
                    ],
                ],
            ],
            [
                'uid' => 'tpl_faq_accordion',
                'name' => 'FAQ Accordion Interaktif',
                'category' => 'content',
                'description' => 'Daftar pertanyaan yang sering diajukan dengan efek buka-tutup yang bersih.',
                'thumbnail_type' => 'faq',
                'section_data' => [
                    'type' => 'faq',
                    'label' => 'Pertanyaan Umum (FAQ)',
                    'title' => 'Pertanyaan yang Sering Diajukan',
                    'subtitle' => 'Informasi seputar lisensi pembaca, format file, dan pemesanan riset kustom.',
                    'content' => [
                        'items' => [
                            ['id' => 'q1', 'question' => 'Format apa saja yang didapatkan setelah pembelian?', 'answer' => 'Setiap dokumen dapat dibaca langsung melalui Digital Reader interaktif kami, serta tersedia unduhan PDF dan model Excel pada publikasi bertanda XLS.'],
                            ['id' => 'q2', 'question' => 'Apakah akses dokumen berlaku selamanya?', 'answer' => 'Ya. Setiap publikasi yang Anda beli atau klaim gratis tersimpan permanen di Library pribadi Anda.'],
                            ['id' => 'q3', 'question' => 'Bagaimana cara mengajukan riset khusus perusahaan?', 'answer' => 'Klik menu Research With Us atau ajukan permintaan melalui formulir Custom Analysis untuk dijadwalkan bersama Senior Partner kami.'],
                        ],
                    ],
                ],
            ],
            [
                'uid' => 'tpl_statistics_bar',
                'name' => 'Bar Statistik & KPI Riset',
                'category' => 'social_proof',
                'description' => 'Baris angka kredibilitas 4 kolom dengan penekanan visual warna brand.',
                'thumbnail_type' => 'statistics',
                'section_data' => [
                    'type' => 'statistics',
                    'label' => 'Statistik Platform',
                    'title' => 'Dampak & Skala Intelligence Inpartner',
                    'subtitle' => 'Metrik terukur dari ekosistem publikasi dan pembaca profesional kami.',
                    'content' => [
                        'items' => [
                            ['id' => 'k1', 'value' => '150+', 'label' => 'Publikasi Terverifikasi', 'note' => 'Diperbarui berkala'],
                            ['id' => 'k2', 'value' => '12.000+', 'label' => 'Pembaca Eksekutif', 'note' => 'Dari 300+ korporasi'],
                            ['id' => 'k3', 'value' => '24', 'label' => 'Sektor Industri', 'note' => 'Cakupan ASEAN & Domestik'],
                            ['id' => 'k4', 'value' => '98.4%', 'label' => 'Tingkat Kepuasan', 'note' => 'Berdasarkan survei pembaca'],
                        ],
                    ],
                ],
            ],
            [
                'uid' => 'tpl_split_image_text',
                'name' => 'Split Konten Gambar & Teks',
                'category' => 'content',
                'description' => 'Section editorial dua kolom dengan gambar di satu sisi dan narasi terstruktur di sisi lain.',
                'thumbnail_type' => 'split_content',
                'section_data' => [
                    'type' => 'split_content',
                    'label' => 'Editorial Split Section',
                    'title' => 'Standar Kurasi & Verifikasi Empiris',
                    'subtitle' => 'Setiap artikel dan whitepaper melewati proses peer-review internal sebelum terbit.',
                    'settings' => ['image_position' => 'right'],
                    'content' => [
                        'eyebrow' => 'Editorial Standard',
                        'body' => 'Kami memadukan data makroekonomi, wawancara pelaku industri, serta pemodelan kuantitatif untuk menghasilkan kesimpulan yang ringkas dan dapat dipertanggungjawabkan.',
                        'highlights' => ['Audit data resmi BPS, BI, dan OJK', 'Ringkasan eksekutif terstruktur', 'Sitasi sumber terbuka'],
                        'cta_label' => 'Pelajari Metodologi',
                        'cta_url' => '/thematic-research',
                        'image_url' => '',
                    ],
                ],
            ],
        ];
    }
}

