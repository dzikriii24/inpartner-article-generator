<?php

namespace Tests\Feature;

use App\Models\CmsSection;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CmsVisualBuilderTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config([
            'database.default' => 'sqlite',
            'database.connections.sqlite.database' => ':memory:',
            'database.connections.sqlite.prefix' => '',
        ]);

        $this->artisan('migrate');
    }

    protected function makeAdmin(): User
    {
        return User::create([
            'name' => 'Admin Tester',
            'email' => 'admin-cms@inpartner.id',
            'password' => 'password123',
            'role' => User::ROLE_ADMIN,
            'status' => 'active',
        ]);
    }

    protected function makeCustomer(): User
    {
        return User::create([
            'name' => 'Customer Tester',
            'email' => 'user-cms@inpartner.id',
            'password' => 'password123',
            'role' => User::ROLE_CUSTOMER,
            'status' => 'active',
        ]);
    }

    public function test_public_homepage_bootstraps_and_isolates_drafts_from_public(): void
    {
        CmsSection::create([
            'key' => 'hero',
            'type' => 'hero',
            'sort_order' => 1,
            'title' => 'Live Hero Heading',
            'subtitle' => 'Live Subtitle',
            'content' => ['cta_primary_label' => 'Explore', 'cta_primary_url' => '/products'],
            'settings' => ['layout' => 'centered'],
            'is_active' => true,
            'is_published' => true,
        ]);

        $publicRes = $this->getJson('/cms/homepage?lang=id');
        $publicRes->assertOk()
            ->assertJsonPath('is_preview', false)
            ->assertJsonPath('sections.0.title', 'Live Hero Heading');

        $unauthPreview = $this->getJson('/cms/homepage?preview=1');
        $unauthPreview->assertOk()
            ->assertJsonPath('is_preview', false)
            ->assertJsonPath('preview_denied', true);

        Sanctum::actingAs($this->makeCustomer());
        $custPreview = $this->getJson('/cms/homepage?preview=1');
        $custPreview->assertOk()
            ->assertJsonPath('is_preview', false)
            ->assertJsonPath('preview_denied', true);

        $admin = $this->makeAdmin();
        Sanctum::actingAs($admin);

        $stateRes = $this->getJson('/admin/cms/builder');
        $stateRes->assertOk()
            ->assertJsonStructure(['page', 'draft', 'published', 'revisions', 'templates', 'allowed_section_types', 'allowed_block_types']);

        $draft = $stateRes->json('draft');
        $draft['sections'][0]['title'] = 'Draft Only Hero Heading';
        $draft['sections'][] = [
            'id' => 'sec_faq_test',
            'key' => 'faq_test',
            'type' => 'faq',
            'label' => 'FAQ Draft',
            'visible' => true,
            'title' => 'FAQ Title',
            'subtitle' => 'FAQ Sub',
            'content' => ['items' => [['id' => 'q1', 'question' => 'Q?', 'answer' => 'A.']]],
            'children' => [],
        ];

        $saveDraftRes = $this->putJson('/admin/cms/builder/draft', [
            'tree' => $draft,
            'create_revision' => true,
            'label' => 'Edited hero in draft',
        ]);
        $saveDraftRes->assertOk()
            ->assertJsonPath('has_unpublished_changes', true)
            ->assertJsonPath('draft.sections.0.title', 'Draft Only Hero Heading');

        // Public STILL sees Live Hero Heading (1 section), NOT draft
        $publicAfterDraft = $this->getJson('/cms/homepage?lang=id');
        $publicAfterDraft->assertOk()
            ->assertJsonCount(1, 'sections')
            ->assertJsonPath('sections.0.title', 'Live Hero Heading');

        // Admin preview sees draft changes
        Sanctum::actingAs($admin);
        $adminPreview = $this->getJson('/cms/homepage?preview=1');
        $adminPreview->assertOk()
            ->assertJsonPath('is_preview', true)
            ->assertJsonCount(2, 'sections')
            ->assertJsonPath('sections.0.title', 'Draft Only Hero Heading');

        // Publish changes -> public now receives updated version
        $pubRes = $this->postJson('/admin/cms/builder/publish', ['label' => 'Launch v2']);
        $pubRes->assertOk()
            ->assertJsonPath('version', 2)
            ->assertJsonPath('has_unpublished_changes', false);

        $publicAfterPublish = $this->getJson('/cms/homepage?lang=id');
        $publicAfterPublish->assertOk()
            ->assertJsonCount(2, 'sections')
            ->assertJsonPath('sections.0.title', 'Draft Only Hero Heading')
            ->assertJsonPath('sections.1.type', 'faq');
    }

    public function test_builder_strips_base64_and_sanitizes_unsafe_html_and_supports_revisions_and_templates(): void
    {
        $admin = $this->makeAdmin();
        Sanctum::actingAs($admin);

        $state = $this->getJson('/admin/cms/builder')->json();
        $draft = $state['draft'];

        $draft['sections'][0]['content']['image_url'] = 'data:image/png;base64,iVBORw0KGgo=';
        $draft['sections'][0]['children'] = [
            [
                'id' => 'blk_unsafe',
                'type' => 'safe_embed',
                'label' => 'Embed',
                'visible' => true,
                'props' => [
                    'html' => '<p onclick="alert(1)">Hello</p><script>evil()</script>',
                ],
            ],
            [
                'id' => 'blk_invalid',
                'type' => 'evil_unknown_component',
                'props' => [],
            ],
        ];

        $save = $this->putJson('/admin/cms/builder/draft', [
            'tree' => $draft,
            'create_revision' => true,
            'label' => 'Sanitize Check',
        ]);
        $save->assertOk();

        $this->assertEquals('', $save->json('draft.sections.0.content.image_url'));
        $this->assertCount(1, $save->json('draft.sections.0.children'));
        $html = $save->json('draft.sections.0.children.0.props.html');
        $this->assertStringNotContainsString('<script>', $html);
        $this->assertStringNotContainsString('onclick', $html);
        $this->assertStringContainsString('Hello', $html);

        $tplRes = $this->postJson('/admin/cms/templates', [
            'name' => 'Custom Hero Blueprint',
            'category' => 'hero',
            'section_data' => $draft['sections'][0],
        ]);
        $tplRes->assertCreated();
        $tplId = $tplRes->json('template.id');
        $this->assertDatabaseHas('cms_templates', ['id' => $tplId, 'is_system' => false]);

        $this->deleteJson("/admin/cms/templates/{$tplId}")->assertOk();

        $revs = $this->getJson('/admin/cms/builder/revisions')->json('data');
        $this->assertNotEmpty($revs);
        $oldest = end($revs);
        $this->postJson("/admin/cms/builder/revisions/{$oldest['id']}/restore")->assertOk();
    }

    public function test_media_library_upload_update_in_use_guard_and_delete(): void
    {
        Storage::fake('public');
        $admin = $this->makeAdmin();
        Sanctum::actingAs($admin);

        $file = UploadedFile::fake()->image('hero-banner.png', 1200, 600);
        $upload = $this->post('/admin/cms/media', [
            'file' => $file,
            'alt_text' => 'Hero Showcase',
            'folder' => 'hero',
        ]);

        $upload->assertCreated()
            ->assertJsonPath('media.alt_text', 'Hero Showcase')
            ->assertJsonPath('media.folder', 'hero');

        $mediaId = $upload->json('media.id');
        $mediaUrl = $upload->json('media.url');

        $draft = $this->getJson('/admin/cms/builder')->json('draft');
        $draft['sections'][0]['content']['image_url'] = $mediaUrl;
        $this->putJson('/admin/cms/builder/draft', ['tree' => $draft])->assertOk();

        $this->deleteJson("/admin/cms/media/{$mediaId}")
            ->assertStatus(409)
            ->assertJsonPath('in_use', true);

        $this->patchJson("/admin/cms/media/{$mediaId}", ['alt_text' => 'Updated Hero Alt'])
            ->assertOk()
            ->assertJsonPath('media.alt_text', 'Updated Hero Alt');

        $draft['sections'][0]['content']['image_url'] = '';
        $this->putJson('/admin/cms/builder/draft', ['tree' => $draft])->assertOk();
        $this->deleteJson("/admin/cms/media/{$mediaId}")->assertOk();
        $this->assertDatabaseMissing('cms_media', ['id' => $mediaId]);
    }

    public function test_newsletter_subscription_and_settings_endpoint(): void
    {
        $this->postJson('/cms/newsletter', ['email' => 'Exec@Company.co.id', 'locale' => 'id'])
            ->assertCreated()
            ->assertJsonPath('email', 'exec@company.co.id');

        $this->getJson('/cms/settings')
            ->assertOk()
            ->assertJsonStructure(['data', 'header', 'footer', 'theme', 'seo']);
    }

    public function test_multilingual_publish_header_footer_theme_validation_and_reset(): void
    {
        $admin = $this->makeAdmin();
        Sanctum::actingAs($admin);

        $state = $this->getJson('/admin/cms/builder')->json();
        $draft = $state['draft'];

        // Customize header, footer, theme, and EN/KO translations on Hero
        $draft['header']['brand_name'] = 'INPARTNER LABS';
        $draft['footer']['copyright'] = '© 2027 Custom Copyright';
        $draft['theme']['colors']['primary'] = '#0C3B69';
        $draft['sections'][0]['translations']['en']['title'] = 'English Hero Title';
        $draft['sections'][0]['translations']['ko']['title'] = '한국어 히어로 제목';

        $this->putJson('/admin/cms/builder/draft', ['tree' => $draft])->assertOk();

        // Validation catches unsafe javascript: URL and missing required title
        $badDraft = $draft;
        $badDraft['sections'][0]['title'] = '';
        $badDraft['sections'][0]['content']['cta_primary_url'] = 'javascript:alert(1)';
        $valRes = $this->postJson('/admin/cms/builder/validate', ['tree' => $badDraft]);
        $valRes->assertOk()->assertJsonPath('valid', false);

        // Publish valid draft
        $this->postJson('/admin/cms/builder/publish', ['tree' => $draft, 'label' => 'Multi-lang Launch'])
            ->assertOk()
            ->assertJsonPath('published.header.brand_name', 'INPARTNER LABS');

        // Verify EN and KO endpoints return localized hero & global header/footer/theme
        $this->getJson('/cms/homepage?lang=en')
            ->assertOk()
            ->assertJsonPath('sections.0.title', 'English Hero Title')
            ->assertJsonPath('header.brand_name', 'INPARTNER LABS')
            ->assertJsonPath('footer.copyright', '© 2027 Custom Copyright')
            ->assertJsonPath('theme.colors.primary', '#0C3B69');

        $this->getJson('/cms/homepage?lang=ko')
            ->assertOk()
            ->assertJsonPath('sections.0.title', '한국어 히어로 제목');

        // Modify draft then reset back to published
        $draft['sections'][0]['title'] = 'Temporary Draft Title';
        $this->putJson('/admin/cms/builder/draft', ['tree' => $draft])->assertOk();

        $this->postJson('/admin/cms/builder/reset', ['mode' => 'published'])
            ->assertOk()
            ->assertJsonPath('has_unpublished_changes', false);

        // Reset to factory defaults keeps restore point and restores 8 standard sections
        $resetFactory = $this->postJson('/admin/cms/builder/reset', ['mode' => 'factory']);
        $resetFactory->assertOk();
        $this->assertCount(8, $resetFactory->json('draft.sections'));
    }
}
