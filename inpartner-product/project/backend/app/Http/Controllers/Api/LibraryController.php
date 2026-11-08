<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Entitlement;
use App\Models\Product;
use App\Models\ReadingActivity;
use App\Services\GeminiService;
use App\Support\Present;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

/**
 * "My Library": everything the user is entitled to.
 * Every content access goes through an ownership check:
 *   authenticated? -> owns product? -> entitlement active? -> allow read / temporary download link
 */
class LibraryController extends Controller
{
    public function index(Request $request)
    {
        $items = $request->user()->entitlements()->active()
            ->with(['product.category', 'product.author', 'order'])
            ->when($request->input('type'), fn ($q, $t) => $q->whereHas('product', fn ($p) => $p->where('type', $t)))
            ->orderByDesc('last_accessed_at')->orderByDesc('granted_at')
            ->get()
            ->filter(fn ($e) => $e->product);

        return response()->json(['data' => $items->map(fn ($e) => Present::libraryItem($e))->values()]);
    }

    protected function entitlementFor(Request $request, string $slug): Entitlement
    {
        $user = $request->user('sanctum');

        if (! $user && $token = $request->query('token')) {
            $accessToken = \Laravel\Sanctum\PersonalAccessToken::findToken($token);
            if ($accessToken && (! $accessToken->expires_at || $accessToken->expires_at->isFuture())) {
                $user = $accessToken->tokenable;
            }
        }

        abort_unless($user, 401, 'Unauthenticated.');

        $product = Product::where('slug', $slug)->firstOrFail();
        $entitlement = $user->entitlements()->active()->where('product_id', $product->id)->first();
        abort_unless($entitlement, 403, 'Kamu belum memiliki akses ke produk ini.');
        $entitlement->setRelation('product', $product);

        return $entitlement;
    }

    /** Full protected content (online reader). */
    public function read(Request $request, string $slug)
    {
        $e = $this->entitlementFor($request, $slug);
        $p = $e->product->load('category', 'author');
        abort_unless($p->canRead(), 422, 'Produk ini tidak tersedia untuk dibaca online.');

        // If the user has never read this product (progress is 0), mark initial progress as 5% (page 1)
        // so that the status immediately changes to "Sedang Dibaca" and appears in Continue Reading
        if ((int) $e->progress === 0) {
            $e->forceFill([
                'progress' => 5,
                'last_read_page' => 1,
                'last_accessed_at' => now(),
            ])->save();
        } else {
            $e->forceFill(['last_accessed_at' => now()])->save();
        }

        // Automatically record/update reading activity for calendar detection
        $this->recordReadingActivity($request->user(), $p, (int) ($e->last_read_page ?: 1), (int) $e->progress);

        return response()->json([
            'product' => Present::productDetail($p, true),
            'content_html' => $p->content_html,
            'sources' => $p->sources ?? [],
            'progress' => (int) $e->progress,
            'last_read_page' => (int) ($e->last_read_page ?: 1),
            'is_starred' => (bool) $e->is_starred,
            'bookmarks' => $e->bookmarks ?? [],
            'notes' => $e->notes ?? [],
            'highlights' => $e->highlights ?? [],
            'ai_chats' => $e->ai_chats ?? [],
            'page_summaries' => $e->page_summaries ?? new \stdClass(),
            'has_pdf' => (bool) $p->hasValidPdf(),
            'ai_configured' => ! empty(env('GEMINI_API_KEY')),
        ]);
    }

    public function progress(Request $request, string $slug)
    {
        $data = $request->validate([
            'progress' => ['nullable', 'integer', 'min:0', 'max:100'],
            'last_read_page' => ['nullable', 'integer', 'min:1'],
            'bookmarks' => ['nullable', 'array'],
            'notes' => ['nullable', 'array'],
            'force' => ['nullable', 'boolean'],
        ]);
        $e = $this->entitlementFor($request, $slug);

        $fill = ['last_accessed_at' => now()];
        if (isset($data['progress'])) {
            $fill['progress'] = (! empty($data['force']))
                ? (int) $data['progress']
                : max((int) $e->progress, (int) $data['progress']);
        }
        if (isset($data['last_read_page'])) {
            $fill['last_read_page'] = max(1, (int) $data['last_read_page']);
        }
        if (isset($data['bookmarks'])) {
            $fill['bookmarks'] = $data['bookmarks'];
        }
        if (isset($data['notes'])) {
            $fill['notes'] = $data['notes'];
        }

        $e->forceFill($fill)->save();

        // Automatically update reading activity for calendar detection
        $this->recordReadingActivity($request->user(), $e->product, (int) ($e->last_read_page ?: 1), (int) $e->progress);

        return response()->json([
            'progress' => (int) $e->progress,
            'last_read_page' => (int) ($e->last_read_page ?: 1),
            'bookmarks' => $e->bookmarks ?? [],
        ]);
    }

    public function bookmark(Request $request, string $slug)
    {
        $data = $request->validate([
            'page' => ['required', 'integer', 'min:1'],
            'title' => ['nullable', 'string', 'max:200'],
        ]);
        $e = $this->entitlementFor($request, $slug);
        $bookmarks = $e->bookmarks ?? [];

        $existingIdx = null;
        foreach ($bookmarks as $idx => $b) {
            if (($b['page'] ?? null) == $data['page']) {
                $existingIdx = $idx;
                break;
            }
        }

        if ($existingIdx !== null) {
            array_splice($bookmarks, $existingIdx, 1);
            $action = 'removed';
        } else {
            $bookmarks[] = [
                'page' => $data['page'],
                'title' => $data['title'] ?: 'Halaman ' . $data['page'],
                'created_at' => now()->toIso8601String(),
            ];
            $action = 'added';
        }

        $e->forceFill(['bookmarks' => array_values($bookmarks)])->save();

        return response()->json([
            'action' => $action,
            'bookmarks' => $e->bookmarks,
        ]);
    }

    public function toggleStar(Request $request, string $slug)
    {
        $e = $this->entitlementFor($request, $slug);
        $newStarred = ! (bool) $e->is_starred;
        $e->forceFill([
            'is_starred' => $newStarred,
            'starred_at' => $newStarred ? now() : null,
        ])->save();

        return response()->json([
            'is_starred' => (bool) $e->is_starred,
            'starred_at' => $e->starred_at?->toIso8601String(),
        ]);
    }

    public function removeHistory(Request $request, string $slug)
    {
        $e = $this->entitlementFor($request, $slug);
        $e->forceFill(['hidden_from_history' => true])->save();

        return response()->json(['success' => true]);
    }

    public function saveHighlight(Request $request, string $slug)
    {
        $data = $request->validate([
            'id' => ['required', 'string'],
            'text' => ['required', 'string'],
            'page' => ['required', 'integer', 'min:1'],
            'color' => ['required', 'string'],
            'note' => ['nullable', 'string', 'max:1000'],
            'position' => ['nullable', 'array'],
            'rects' => ['nullable', 'array'],
            'text_prefix' => ['nullable', 'string'],
            'text_suffix' => ['nullable', 'string'],
        ]);

        $e = $this->entitlementFor($request, $slug);
        $highlights = $e->highlights ?? [];

        $existingIdx = null;
        foreach ($highlights as $idx => $h) {
            if (($h['id'] ?? null) === $data['id']) {
                $existingIdx = $idx;
                break;
            }
        }

        $highlightData = [
            'id' => $data['id'],
            'text' => $data['text'],
            'page' => $data['page'],
            'color' => $data['color'],
            'note' => $data['note'] ?? null,
            'position' => $data['position'] ?? null,
            'rects' => $data['rects'] ?? null,
            'text_prefix' => $data['text_prefix'] ?? null,
            'text_suffix' => $data['text_suffix'] ?? null,
            'created_at' => now()->toIso8601String(),
        ];

        if ($existingIdx !== null) {
            $highlights[$existingIdx] = array_merge($highlights[$existingIdx], $highlightData);
        } else {
            $highlights[] = $highlightData;
        }

        $e->forceFill(['highlights' => array_values($highlights)])->save();

        return response()->json([
            'success' => true,
            'highlights' => $e->highlights,
        ]);
    }

    public function deleteHighlight(Request $request, string $slug, string $highlightId)
    {
        $e = $this->entitlementFor($request, $slug);
        $highlights = $e->highlights ?? [];

        $filtered = array_values(array_filter($highlights, fn ($h) => ($h['id'] ?? null) !== $highlightId));
        $e->forceFill(['highlights' => $filtered])->save();

        return response()->json([
            'success' => true,
            'highlights' => $e->highlights,
        ]);
    }

    public function saveNote(Request $request, string $slug)
    {
        $data = $request->validate([
            'id' => ['required', 'string'],
            'title' => ['nullable', 'string', 'max:200'],
            'content' => ['required', 'string'],
            'page' => ['nullable', 'integer', 'min:1'],
            'highlight_id' => ['nullable', 'string'],
        ]);

        $e = $this->entitlementFor($request, $slug);
        $notes = $e->notes ?? [];

        $existingIdx = null;
        foreach ($notes as $idx => $n) {
            if (($n['id'] ?? null) === $data['id']) {
                $existingIdx = $idx;
                break;
            }
        }

        $noteData = [
            'id' => $data['id'],
            'title' => $data['title'] ?? null,
            'content' => $data['content'],
            'page' => $data['page'] ?? null,
            'highlight_id' => $data['highlight_id'] ?? null,
            'updated_at' => now()->toIso8601String(),
        ];

        if ($existingIdx !== null) {
            $notes[$existingIdx] = array_merge($notes[$existingIdx], $noteData);
        } else {
            $noteData['created_at'] = now()->toIso8601String();
            $notes[] = $noteData;
        }

        $e->forceFill(['notes' => array_values($notes)])->save();

        return response()->json([
            'success' => true,
            'notes' => $e->notes,
        ]);
    }

    public function deleteNote(Request $request, string $slug, string $noteId)
    {
        $e = $this->entitlementFor($request, $slug);
        $notes = $e->notes ?? [];

        $filtered = array_values(array_filter($notes, fn ($n) => ($n['id'] ?? null) !== $noteId));
        $e->forceFill(['notes' => $filtered])->save();

        return response()->json([
            'success' => true,
            'notes' => $e->notes,
        ]);
    }

    public function getAiChats(Request $request, string $slug)
    {
        $e = $this->entitlementFor($request, $slug);
        return response()->json([
            'chats' => $e->ai_chats ?? [],
        ]);
    }

    public function clearAiChat(Request $request, string $slug)
    {
        $e = $this->entitlementFor($request, $slug);
        $e->forceFill(['ai_chats' => []])->save();

        return response()->json([
            'success' => true,
            'chats' => [],
        ]);
    }

    public function deleteAiMessage(Request $request, string $slug, string $messageId)
    {
        $e = $this->entitlementFor($request, $slug);
        $chats = $e->ai_chats ?? [];
        $filtered = array_values(array_filter($chats, fn ($m) => ($m['id'] ?? null) !== $messageId));
        $e->forceFill(['ai_chats' => $filtered])->save();

        return response()->json([
            'success' => true,
            'chats' => $e->ai_chats ?? [],
        ]);
    }

    public function aiChat(Request $request, string $slug, GeminiService $gemini)
    {
        $data = $request->validate([
            'message' => ['required', 'string', 'max:1000'],
            'selected_text' => ['nullable', 'string', 'max:2500'],
            'page' => ['nullable', 'integer'],
            'context_type' => ['nullable', 'string'],
        ]);

        $e = $this->entitlementFor($request, $slug);
        $product = $e->product;

        if (! $gemini->isConfigured()) {
            return response()->json([
                'error' => 'Fitur AI Reading Assistant belum dikonfigurasi di server backend.',
                'configured' => false,
            ], 503);
        }

        // Clean document content for grounding context
        $cleanContent = strip_tags($product->content_html ?? $product->description ?? '');
        $contentExcerpt = Str::limit($cleanContent, 6000, '...');

        $systemInstruction = "Anda adalah AI Research Assistant resmi pada platform riset makroekonomi dan intelijen bisnis Inpartner.
Tugas Anda adalah mendampingi pembaca (eksekutif, analis keuangan, perencana strategis) memahami laporan riset: \"{$product->title}\" ({$product->type_label}).

PEDOMAN UTAMA:
1. SUMBER UTAMA ADALAH DOKUMEN: Gunakan isi laporan riset ini sebagai landasan jawaban. Bedakan secara eksplisit antara fakta yang tertulis dalam dokumen dengan elaborasi/konteks teoretis umum.
2. ZERO DATA FABRICATION: Jangan pernah mengarang angka, rasio persentase, proyeksi ekonomi, atau kutipan yang tidak tercantum dalam laporan. Jika suatu data tidak ditemukan, katakan secara transparan: \"Informasi ini tidak tercantum secara spesifik dalam laporan ini.\"
3. STRUKTUR JAWABAN:
   - **Ringkasan Inti**: Jawaban langsung yang lugas (1-2 kalimat).
   - **Konteks Dokumen**: Penjelasan bagaimana konsep/isu ini dibahas dalam laporan.
   - **Mengapa Ini Penting**: Signifikansi strategis atau ekonomi.
   - **Implikasi Kunci**: Dampak bagi industri, kebijakan, atau keputusan bisnis.
4. Gaya bahasa: Profesional, objektif, analitis, dan mudah dipahami dalam Bahasa Indonesia formal.";

        $prompt = "DOKUMEN RISET:
Judul: {$product->title}
Kategori: " . ($product->category?->name ?? 'Riset Strategis') . "
Ringkasan Laporan: " . ($product->excerpt ?? $product->subtitle ?? '') . "
Kutipan Isi Dokumen:
\"\"\"
{$contentExcerpt}
\"\"\"";

        if (! empty($data['selected_text'])) {
            $prompt .= "\n\nTEKS SPESIFIK YANG DITANDAI OLEH PEMBACA (Halaman " . ($data['page'] ?? 'Aktif') . "):
\"\"\"
{$data['selected_text']}
\"\"\"";
        }

        if (! empty($data['page'])) {
            $prompt .= "\nHalaman yang Sedang Dibaca: " . $data['page'];
        }

        $prompt .= "\n\nPERTANYAAN / PERMINTAAN PEMBACA:
" . $data['message'];

        $reply = $gemini->generate($prompt, $systemInstruction);

        if (! $reply) {
            return response()->json([
                'error' => 'Asisten AI saat ini sedang mengalami lonjakan permintaan. Silakan coba beberapa saat lagi.',
                'configured' => true,
            ], 500);
        }

        // Persist conversation to database
        $userMsgId = 'msg-' . Str::uuid()->toString();
        $assistantMsgId = 'msg-' . Str::uuid()->toString();
        $now = now()->toIso8601String();

        $chats = $e->ai_chats ?? [];
        $chats[] = [
            'id' => $userMsgId,
            'role' => 'user',
            'text' => $data['message'],
            'selected_snippet' => $data['selected_text'] ?? null,
            'page' => $data['page'] ?? null,
            'created_at' => $now,
        ];
        $chats[] = [
            'id' => $assistantMsgId,
            'role' => 'assistant',
            'text' => $reply,
            'reference_page' => $data['page'] ?? null,
            'model' => $gemini->getModel(),
            'created_at' => $now,
        ];

        $e->forceFill(['ai_chats' => array_values($chats)])->save();

        return response()->json([
            'reply' => $reply,
            'model' => $gemini->getModel(),
            'chats' => $e->ai_chats,
            'configured' => true,
        ]);
    }

    public function aiPageSummary(Request $request, string $slug, GeminiService $gemini)
    {
        $data = $request->validate([
            'page' => ['required', 'integer', 'min:1'],
            'section_title' => ['nullable', 'string', 'max:200'],
            'section_text' => ['required', 'string', 'max:5000'],
            'force' => ['nullable', 'boolean'],
        ]);

        $e = $this->entitlementFor($request, $slug);
        $product = $e->product;

        $summaries = $e->page_summaries ?? [];
        if (! is_array($summaries)) {
            $summaries = (array) $summaries;
        }

        // Return cached summary if available and not forced
        if (empty($data['force']) && ! empty($summaries[$data['page']])) {
            return response()->json([
                'page' => $data['page'],
                'summary_data' => $summaries[$data['page']],
                'cached' => true,
            ]);
        }

        if (! $gemini->isConfigured()) {
            return response()->json([
                'error' => 'AI Assistant belum dikonfigurasi.',
                'configured' => false,
            ], 503);
        }

        $systemInstruction = "Anda adalah analis riset Inpartner. Tugas Anda mengekstrak ringkasan struktural dari satu bagian/halaman laporan riset ekonomi secara akurat dan objektif tanpa membuat data palsu. Format jawaban HARUS JSON valid dengan struktur:
{
  \"title\": \"Judul Halaman/Bagian yang Relevan\",
  \"summary\": \"Ringkasan 2-3 kalimat mengenai fokus bahasan bagian ini.\",
  \"key_points\": [\"Poin kunci 1\", \"Poin kunci 2\", \"Poin kunci 3\"],
  \"important_terms\": [\"Istilah/Konsep 1\", \"Istilah/Konsep 2\"]
}";

        $prompt = "DOKUMEN: {$product->title}
HALAMAN / BAGIAN: {$data['page']} - " . ($data['section_title'] ?? '') . "
ISI TEKS BAGIAN INI:
\"\"\"
{$data['section_text']}
\"\"\"

Kembalikan ringkasan dalam format JSON sesuai instruksi.";

        $reply = $gemini->generate($prompt, $systemInstruction);

        if (! $reply) {
            return response()->json(['error' => 'Gagal menghasilkan ringkasan AI.'], 500);
        }

        // Clean json markdown fences if present
        $jsonStr = trim(preg_replace('/^```(?:json)?|```$/m', '', $reply));
        $parsed = json_decode($jsonStr, true);

        if (! is_array($parsed)) {
            $parsed = [
                'title' => $data['section_title'] ?: "Halaman {$data['page']}",
                'summary' => $reply,
                'key_points' => [],
                'important_terms' => [],
            ];
        }

        // Persist page summary in entitlement
        $summaries[$data['page']] = $parsed;
        $e->forceFill(['page_summaries' => $summaries])->save();

        return response()->json([
            'page' => $data['page'],
            'summary_data' => $parsed,
            'cached' => false,
        ]);
    }

    /** Stream PDF inline for embedded reader without downloading. */
    public function streamPdf(Request $request, string $slug)
    {
        $e = $this->entitlementFor($request, $slug);
        $product = $e->product;
        abort_unless($product, 404);

        $e->forceFill(['last_accessed_at' => now()])->save();
        $filename = Str::slug(Str::limit($product->title, 80, '')) ?: 'document';

        if ($product->file_path && Storage::disk('local')->exists($product->file_path)) {
            $file = Storage::disk('local')->get($product->file_path);
            return response($file, 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'inline; filename="'.$filename.'.pdf"',
                'Cache-Control' => 'private, no-store',
            ]);
        }

        if ($product->external_pdf_url && ! Str::contains($product->external_pdf_url, ['127.0.0.1', 'localhost'])) {
            try {
                $res = Http::timeout(15)->get($product->external_pdf_url);
                if ($res->successful()) {
                    return response($res->body(), 200, [
                        'Content-Type' => 'application/pdf',
                        'Content-Disposition' => 'inline; filename="'.$filename.'.pdf"',
                        'Cache-Control' => 'private, no-store',
                    ]);
                }
            } catch (\Throwable $th) {
                // fall through
            }
        }

        abort(404, 'Berkas PDF fisik tidak tersedia. Silakan baca menggunakan Editorial Text Reader.');
    }

    /** Returns a short-lived signed URL; the real file location is never exposed. */
    public function downloadLink(Request $request, string $slug)
    {
        $e = $this->entitlementFor($request, $slug);
        abort_unless($e->product->canDownload(), 422, 'Produk ini tidak tersedia untuk diunduh sebagai file PDF.');

        $url = URL::temporarySignedRoute('library.download', now()->addMinutes(5), ['entitlement' => $e->id]);

        return response()->json(['url' => $url, 'expires_in' => 300]);
    }

    /** Signed route target (no bearer token needed, signature + entitlement checked). */
    public function download(Request $request, Entitlement $entitlement)
    {
        abort_unless($request->hasValidSignature(), 403, 'Link download sudah kedaluwarsa.');
        abort_unless(Entitlement::whereKey($entitlement->id)->active()->exists(), 403);

        $product = $entitlement->product;
        abort_unless($product && $product->canDownload(), 404);

        $entitlement->forceFill(['last_accessed_at' => now()])->save();
        $filename = Str::slug(Str::limit($product->title, 80, '')) ?: 'download';

        // 1) Uploaded private file
        if ($product->file_path && Storage::disk('local')->exists($product->file_path)) {
            $ext = pathinfo($product->file_name ?: $product->file_path, PATHINFO_EXTENSION);

            return Storage::disk('local')->download($product->file_path, $filename.($ext ? '.'.$ext : ''));
        }

        // 2) Article generated by the Article Generator: proxy its PDF export
        if ($product->external_pdf_url && ! Str::contains($product->external_pdf_url, ['127.0.0.1', 'localhost'])) {
            try {
                $res = Http::timeout(15)->get($product->external_pdf_url);
                if ($res->successful()) {
                    return response($res->body(), 200, [
                        'Content-Type' => 'application/pdf',
                        'Content-Disposition' => 'attachment; filename="'.$filename.'.pdf"',
                        'Cache-Control' => 'private, no-store',
                    ]);
                }
            } catch (\Throwable $th) {
                // fall through
            }
        }

        abort(404, 'Berkas PDF tidak ditemukan atau belum dapat diunduh.');
    }

    public function downloadExcelLink(Request $request, string $slug)
    {
        $e = $this->entitlementFor($request, $slug);
        abort_unless($e->product->hasExcelFile(), 422, 'Produk ini tidak memiliki lampiran dataset spreadsheet.');

        $url = URL::temporarySignedRoute('library.download_excel', now()->addMinutes(5), ['entitlement' => $e->id]);

        return response()->json(['url' => $url, 'expires_in' => 300]);
    }

    public function downloadExcel(Request $request, Entitlement $entitlement)
    {
        abort_unless($request->hasValidSignature(), 403, 'Link download dataset sudah kedaluwarsa.');
        abort_unless(Entitlement::whereKey($entitlement->id)->active()->exists(), 403);

        $product = $entitlement->product;
        abort_unless($product && $product->hasExcelFile(), 404);

        $entitlement->forceFill(['last_accessed_at' => now()])->save();
        $filename = Str::slug(Str::limit($product->title, 80, '')) ?: 'dataset';
        $ext = pathinfo($product->excel_file_name ?: $product->excel_file_path, PATHINFO_EXTENSION) ?: 'xlsx';

        if (Storage::disk('local')->exists($product->excel_file_path)) {
            return Storage::disk('local')->download($product->excel_file_path, $filename.'.'.$ext);
        }

        abort(404, 'Berkas dataset tidak ditemukan.');
    }

    /**
     * Automatically log or update reading activity for calendar auto-detection.
     */
    protected function recordReadingActivity($user, ?Product $product, int $page = 1, int $progress = 5): void
    {
        if (!$user || !$product) return;

        try {
            $today = now()->toDateString();
            $activity = ReadingActivity::where('user_id', $user->id)
                ->where('product_id', $product->id)
                ->where('activity_type', 'document_read')
                ->whereDate('occurred_at', $today)
                ->first();

            if ($activity) {
                $activity->update([
                    'pages_read' => max((int) $activity->pages_read, $page),
                    'duration_minutes' => (int) $activity->duration_minutes + 5,
                    'metadata' => array_merge($activity->metadata ?? [], [
                        'progress' => $progress,
                        'last_read_page' => $page,
                    ]),
                    'occurred_at' => now(),
                ]);
            } else {
                $estMinutes = max(10, min(60, (int) round(($product->reading_time ?: 30) * max(0.2, $progress / 100))));
                ReadingActivity::create([
                    'user_id' => $user->id,
                    'product_id' => $product->id,
                    'activity_type' => 'document_read',
                    'description' => "Membaca publikasi: {$product->title}",
                    'pages_read' => $page,
                    'duration_minutes' => $estMinutes,
                    'metadata' => [
                        'progress' => $progress,
                        'title' => $product->title,
                        'slug' => $product->slug,
                        'last_read_page' => $page,
                    ],
                    'occurred_at' => now(),
                ]);
            }
        } catch (\Throwable $th) {
            // Safe fallback
        }
    }
}
