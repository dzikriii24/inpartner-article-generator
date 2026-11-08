<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Entitlement;
use App\Models\Product;
use App\Models\ReadingActivity;
use App\Models\ReadingSchedule;
use App\Models\ResearchCollection;
use App\Models\User;
use App\Support\Present;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProfileDashboardController extends Controller
{
    /**
     * Overview & Key Metrics for the Personal Research Dashboard.
     */
    public function dashboard(Request $request): JsonResponse
    {
        $user = $request->user();
        $entitlements = $user->entitlements()->active()->with('product.category')->get();

        // 1. Calculate aggregated counts
        $totalDocs = $entitlements->count();
        $totalHighlights = 0;
        $totalNotes = 0;
        $totalBookmarks = 0;
        $completedDocs = 0;
        $inProgressDocs = 0;
        $toReadDocs = 0;

        foreach ($entitlements as $e) {
            $totalHighlights += count($e->highlights ?? []);
            $totalNotes += count($e->notes ?? []);
            $totalBookmarks += count($e->bookmarks ?? []);

            $status = $e->pipeline_status ?: ($e->progress >= 100 ? 'completed' : ($e->progress > 0 ? 'reading' : 'to_read'));
            if ($status === 'completed' || $e->progress >= 100) {
                $completedDocs++;
            } elseif ($status === 'reading' || ($e->progress > 0 && $e->progress < 100)) {
                $inProgressDocs++;
            } else {
                $toReadDocs++;
            }
        }

        // 2. Reading time & activities
        $totalReadingMinutes = (int) ReadingActivity::where('user_id', $user->id)->sum('duration_minutes');
        if ($totalReadingMinutes === 0 && $totalDocs > 0) {
            // Authentic fallback estimate based on recorded pages and reading progress
            foreach ($entitlements as $e) {
                $p = $e->product;
                if ($p && $e->progress > 0) {
                    $est = round(($p->reading_time ?: 25) * ($e->progress / 100));
                    $totalReadingMinutes += (int) $est;
                }
            }
        }

        // 3. Reading Streak
        $streak = $this->calculateReadingStreak($user);

        // 4. Schedules summary
        $upcomingSchedules = ReadingSchedule::where('user_id', $user->id)
            ->where('scheduled_date', '>=', now()->toDateString())
            ->whereIn('status', ['scheduled', 'in_progress'])
            ->with('product:id,title,slug,cover_url')
            ->orderBy('scheduled_date', 'asc')
            ->orderBy('start_time', 'asc')
            ->take(4)
            ->get();

        $scheduledSessionsCount = ReadingSchedule::where('user_id', $user->id)
            ->where('scheduled_date', '>=', now()->toDateString())
            ->where('status', 'scheduled')
            ->count();

        // 5. Last read document (Continue Reading)
        $lastAccessedEntitlement = $entitlements
            ->filter(fn ($e) => $e->last_accessed_at !== null)
            ->sortByDesc('last_accessed_at')
            ->first();

        $lastReadDoc = null;
        if ($lastAccessedEntitlement && $lastAccessedEntitlement->product) {
            $lp = $lastAccessedEntitlement->product;
            $lastReadDoc = [
                'entitlement_id' => $lastAccessedEntitlement->id,
                'slug' => $lp->slug,
                'title' => $lp->title,
                'cover_url' => $lp->coverPublicUrl(),
                'category_name' => $lp->category?->name,
                'progress' => (int) $lastAccessedEntitlement->progress,
                'last_read_page' => (int) ($lastAccessedEntitlement->last_read_page ?: 1),
                'total_pages' => (int) ($lp->pages ?: 4),
                'last_accessed_at' => $lastAccessedEntitlement->last_accessed_at?->toIso8601String(),
            ];
        }

        // 6. Today's Activity
        $todayDate = now()->toDateString();
        $todayActivities = ReadingActivity::where('user_id', $user->id)
            ->whereDate('occurred_at', $todayDate)
            ->get();

        $todayMinutes = (int) $todayActivities->sum('duration_minutes');
        $todayHighlightsCount = $todayActivities->where('activity_type', 'highlight_created')->count();
        $todayNotesCount = $todayActivities->where('activity_type', 'note_created')->count();
        $todaySchedules = ReadingSchedule::where('user_id', $user->id)
            ->whereDate('scheduled_date', $todayDate)
            ->with('product:id,title,slug')
            ->get();

        // 7. Goals vs Actual
        $goals = $user->reading_goals ?? [
            'daily_minutes' => 30,
            'weekly_hours' => 5,
            'monthly_docs' => 3,
        ];

        // This week actual
        $startOfWeek = now()->startOfWeek();
        $weeklyMinutes = (int) ReadingActivity::where('user_id', $user->id)
            ->where('occurred_at', '>=', $startOfWeek)
            ->sum('duration_minutes');
        $weeklyHoursActual = round($weeklyMinutes / 60, 1);

        return response()->json([
            'user' => Present::user($user),
            'metrics' => [
                'total_documents' => $totalDocs,
                'total_reading_minutes' => $totalReadingMinutes,
                'total_reading_hours' => round($totalReadingMinutes / 60, 1),
                'total_highlights' => $totalHighlights,
                'total_notes' => $totalNotes,
                'total_bookmarks' => $totalBookmarks,
                'reading_streak_days' => $streak,
                'completed_documents' => $completedDocs,
                'in_progress_documents' => $inProgressDocs,
                'to_read_documents' => $toReadDocs,
                'scheduled_sessions' => $scheduledSessionsCount,
            ],
            'today' => [
                'duration_minutes' => $todayMinutes,
                'highlights_count' => $todayHighlightsCount,
                'notes_count' => $todayNotesCount,
                'schedules' => $todaySchedules,
            ],
            'continue_reading' => $lastReadDoc,
            'upcoming_schedules' => $upcomingSchedules,
            'goals' => [
                'targets' => $goals,
                'progress' => [
                    'daily_percent' => min(100, round(($todayMinutes / max(1, $goals['daily_minutes'] ?? 30)) * 100)),
                    'weekly_percent' => min(100, round(($weeklyHoursActual / max(0.5, $goals['weekly_hours'] ?? 5)) * 100)),
                    'weekly_hours_actual' => $weeklyHoursActual,
                ],
            ],
        ]);
    }

    /**
     * Research Kanban Board Pipeline.
     */
    public function pipeline(Request $request): JsonResponse
    {
        $user = $request->user();
        $entitlements = $user->entitlements()->active()->with('product.category')->get();

        $columns = [
            'to_read' => [],
            'reading' => [],
            'under_review' => [],
            'completed' => [],
            'archived' => [],
        ];

        foreach ($entitlements as $e) {
            $p = $e->product;
            if (!$p) continue;

            $status = $e->pipeline_status;
            if (!$status) {
                if ($e->progress >= 100) {
                    $status = 'completed';
                } elseif ($e->progress > 0) {
                    $status = 'reading';
                } else {
                    $status = 'to_read';
                }
            }

            if (!isset($columns[$status])) {
                $status = 'to_read';
            }

            $card = [
                'id' => $e->id,
                'product_id' => $p->id,
                'slug' => $p->slug,
                'title' => $p->title,
                'cover_url' => $p->coverPublicUrl(),
                'category_name' => $p->category?->name ?? 'Riset Sektoral',
                'progress' => (int) $e->progress,
                'last_read_page' => (int) ($e->last_read_page ?: 1),
                'total_pages' => (int) ($p->pages ?: 4),
                'highlights_count' => count($e->highlights ?? []),
                'notes_count' => count($e->notes ?? []),
                'priority' => $e->pipeline_priority ?: 'medium',
                'deadline' => $e->pipeline_deadline?->toDateString(),
                'pipeline_notes' => $e->pipeline_notes,
                'order' => (int) ($e->pipeline_order ?: 0),
                'last_accessed_at' => $e->last_accessed_at?->toIso8601String(),
                'pipeline_status' => $status,
            ];

            $columns[$status][] = $card;
        }

        // Sort items in each column by order then last accessed
        foreach ($columns as $k => $items) {
            usort($columns[$k], function ($a, $b) {
                if ($a['order'] !== $b['order']) return $a['order'] <=> $b['order'];
                return strcmp($b['last_accessed_at'] ?? '', $a['last_accessed_at'] ?? '');
            });
        }

        return response()->json([
            'columns' => $columns,
            'counts' => [
                'to_read' => count($columns['to_read']),
                'reading' => count($columns['reading']),
                'under_review' => count($columns['under_review']),
                'completed' => count($columns['completed']),
                'archived' => count($columns['archived']),
            ],
        ]);
    }

    /**
     * Move or update a Kanban card.
     */
    public function movePipelineItem(Request $request, int $entitlementId): JsonResponse
    {
        $user = $request->user();
        $e = $user->entitlements()->findOrFail($entitlementId);

        $data = $request->validate([
            'pipeline_status' => ['required', 'string', 'in:to_read,reading,under_review,completed,archived'],
            'pipeline_priority' => ['nullable', 'string', 'in:low,medium,high,urgent'],
            'pipeline_deadline' => ['nullable', 'date'],
            'pipeline_notes' => ['nullable', 'string', 'max:1000'],
            'pipeline_order' => ['nullable', 'integer'],
        ]);

        $oldStatus = $e->pipeline_status;
        $e->update(array_filter($data, fn ($val) => $val !== null));

        // Log reading activity if moved to completed or under review
        if ($data['pipeline_status'] === 'completed' && $oldStatus !== 'completed') {
            ReadingActivity::create([
                'user_id' => $user->id,
                'product_id' => $e->product_id,
                'activity_type' => 'document_completed',
                'description' => "Menyelesaikan telaah riset: {$e->product->title}",
                'metadata' => ['pipeline_status' => 'completed'],
                'occurred_at' => now(),
            ]);
        }

        return response()->json([
            'message' => 'Status pipeline berhasil diperbarui.',
            'item' => [
                'id' => $e->id,
                'pipeline_status' => $e->pipeline_status,
                'pipeline_priority' => $e->pipeline_priority,
                'pipeline_deadline' => $e->pipeline_deadline?->toDateString(),
                'pipeline_notes' => $e->pipeline_notes,
            ],
        ]);
    }

    /**
     * Research Notebook: Aggregates Highlights, Notes, Bookmarks, and Collections.
     */
    public function notebook(Request $request): JsonResponse
    {
        $user = $request->user();
        $entitlements = $user->entitlements()->active()->with('product.category')->get();

        $highlights = [];
        $notes = [];
        $bookmarks = [];

        foreach ($entitlements as $e) {
            $p = $e->product;
            if (!$p) continue;

            // Highlights
            if (!empty($e->highlights) && is_array($e->highlights)) {
                foreach ($e->highlights as $h) {
                    $highlights[] = [
                        'id' => $h['id'] ?? Str::uuid()->toString(),
                        'entitlement_id' => $e->id,
                        'product_id' => $p->id,
                        'product_title' => $p->title,
                        'product_slug' => $p->slug,
                        'category_name' => $p->category?->name ?? 'Riset Sektoral',
                        'cover_url' => $p->coverPublicUrl(),
                        'text' => $h['text'] ?? '',
                        'page' => (int) ($h['page'] ?? 1),
                        'color' => $h['color'] ?? 'yellow',
                        'created_at' => $h['created_at'] ?? $e->created_at?->toIso8601String(),
                    ];
                }
            }

            // Notes
            if (!empty($e->notes) && is_array($e->notes)) {
                foreach ($e->notes as $n) {
                    $notes[] = [
                        'id' => $n['id'] ?? Str::uuid()->toString(),
                        'entitlement_id' => $e->id,
                        'product_id' => $p->id,
                        'product_title' => $p->title,
                        'product_slug' => $p->slug,
                        'category_name' => $p->category?->name ?? 'Riset Sektoral',
                        'cover_url' => $p->coverPublicUrl(),
                        'title' => $n['title'] ?? 'Catatan Riset',
                        'content' => $n['content'] ?? '',
                        'page' => (int) ($n['page'] ?? 1),
                        'highlight_ref' => $n['highlight_ref'] ?? null,
                        'created_at' => $n['created_at'] ?? $e->created_at?->toIso8601String(),
                    ];
                }
            }

            // Bookmarks
            if (!empty($e->bookmarks) && is_array($e->bookmarks)) {
                foreach ($e->bookmarks as $b) {
                    $page = is_numeric($b) ? (int) $b : (int) ($b['page'] ?? 1);
                    $bookmarks[] = [
                        'id' => "bm-{$e->id}-{$page}",
                        'entitlement_id' => $e->id,
                        'product_id' => $p->id,
                        'product_title' => $p->title,
                        'product_slug' => $p->slug,
                        'category_name' => $p->category?->name ?? 'Riset Sektoral',
                        'cover_url' => $p->coverPublicUrl(),
                        'page' => $page,
                        'title' => is_array($b) ? ($b['title'] ?? "Halaman {$page}") : "Halaman {$page}",
                        'created_at' => is_array($b) ? ($b['created_at'] ?? $e->created_at?->toIso8601String()) : $e->created_at?->toIso8601String(),
                    ];
                }
            }
        }

        // Sort descending by created_at
        usort($highlights, fn ($a, $b) => strcmp($b['created_at'] ?? '', $a['created_at'] ?? ''));
        usort($notes, fn ($a, $b) => strcmp($b['created_at'] ?? '', $a['created_at'] ?? ''));
        usort($bookmarks, fn ($a, $b) => strcmp($b['created_at'] ?? '', $a['created_at'] ?? ''));

        // Collections
        $collections = ResearchCollection::where('user_id', $user->id)->get();

        return response()->json([
            'highlights' => $highlights,
            'notes' => $notes,
            'bookmarks' => $bookmarks,
            'collections' => $collections,
            'summary' => [
                'highlights_count' => count($highlights),
                'notes_count' => count($notes),
                'bookmarks_count' => count($bookmarks),
                'collections_count' => $collections->count(),
            ],
        ]);
    }

    /**
     * Create or edit a research note from the Notebook.
     */
    public function saveNotebookNote(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validate([
            'id' => ['nullable', 'string'],
            'entitlement_id' => ['required', 'integer'],
            'title' => ['required', 'string', 'max:255'],
            'content' => ['required', 'string'],
            'page' => ['nullable', 'integer'],
        ]);

        $e = $user->entitlements()->findOrFail($data['entitlement_id']);
        $notes = $e->notes ?? [];

        $noteId = $data['id'] ?: ('note-' . Str::uuid()->toString());
        $isEdit = false;

        foreach ($notes as $idx => $n) {
            if (($n['id'] ?? '') === $noteId) {
                $notes[$idx]['title'] = $data['title'];
                $notes[$idx]['content'] = $data['content'];
                $notes[$idx]['page'] = $data['page'] ?? $n['page'] ?? 1;
                $notes[$idx]['updated_at'] = now()->toIso8601String();
                $isEdit = true;
                break;
            }
        }

        if (!$isEdit) {
            $notes[] = [
                'id' => $noteId,
                'title' => $data['title'],
                'content' => $data['content'],
                'page' => $data['page'] ?? 1,
                'created_at' => now()->toIso8601String(),
            ];

            // Log activity
            ReadingActivity::create([
                'user_id' => $user->id,
                'product_id' => $e->product_id,
                'activity_type' => 'note_created',
                'description' => "Menambahkan catatan pada riset: {$e->product->title}",
                'metadata' => ['title' => $data['title'], 'page' => $data['page'] ?? 1],
                'occurred_at' => now(),
            ]);
        }

        $e->update(['notes' => array_values($notes)]);

        return response()->json([
            'message' => $isEdit ? 'Catatan berhasil diperbarui.' : 'Catatan berhasil disimpan.',
            'note' => [
                'id' => $noteId,
                'title' => $data['title'],
                'content' => $data['content'],
                'page' => $data['page'] ?? 1,
                'entitlement_id' => $e->id,
            ],
        ]);
    }

    /**
     * Delete a note from an entitlement.
     */
    public function deleteNotebookNote(Request $request, string $noteId): JsonResponse
    {
        $user = $request->user();
        $entitlements = $user->entitlements()->get();

        $deleted = false;
        foreach ($entitlements as $e) {
            $notes = $e->notes ?? [];
            $filtered = array_filter($notes, fn ($n) => ($n['id'] ?? '') !== $noteId);
            if (count($filtered) !== count($notes)) {
                $e->update(['notes' => array_values($filtered)]);
                $deleted = true;
                break;
            }
        }

        return response()->json([
            'success' => $deleted,
            'message' => $deleted ? 'Catatan berhasil dihapus.' : 'Catatan tidak ditemukan.',
        ]);
    }

    /**
     * Reading Planner & Schedules.
     */
    public function schedules(Request $request): JsonResponse
    {
        $user = $request->user();
        $month = $request->input('month'); // YYYY-MM
        $query = ReadingSchedule::where('user_id', $user->id)->with('product:id,title,slug,cover_url');

        $startOfMonth = $month && preg_match('/^\d{4}-\d{2}$/', $month)
            ? Carbon::parse("{$month}-01")->startOfMonth()
            : now()->startOfMonth();
        $endOfMonth = $month && preg_match('/^\d{4}-\d{2}$/', $month)
            ? Carbon::parse("{$month}-01")->endOfMonth()
            : now()->endOfMonth();

        $query->whereBetween('scheduled_date', [$startOfMonth->toDateString(), $endOfMonth->toDateString()]);
        $schedules = $query->orderBy('scheduled_date', 'asc')->orderBy('start_time', 'asc')->get();

        // 1. Auto-sync entitlements accessed in this month into ReadingActivity table
        $entitlements = $user->entitlements()->with('product.category')->get();
        foreach ($entitlements as $e) {
            $p = $e->product;
            if (!$p || !$e->last_accessed_at) continue;

            $accessDate = $e->last_accessed_at->toDateString();
            if ($e->last_accessed_at->between($startOfMonth, $endOfMonth)) {
                $exists = ReadingActivity::where('user_id', $user->id)
                    ->where('product_id', $p->id)
                    ->where('activity_type', 'document_read')
                    ->whereDate('occurred_at', $accessDate)
                    ->exists();

                if (!$exists) {
                    $estMinutes = max(10, min(120, (int) round(($p->reading_time ?: 30) * max(0.2, ($e->progress ?: 10) / 100))));
                    ReadingActivity::create([
                        'user_id' => $user->id,
                        'product_id' => $p->id,
                        'activity_type' => 'document_read',
                        'description' => "Membaca publikasi: {$p->title}",
                        'pages_read' => (int) ($e->last_read_page ?: 1),
                        'duration_minutes' => $estMinutes,
                        'metadata' => [
                            'progress' => (int) $e->progress,
                            'title' => $p->title,
                            'slug' => $p->slug,
                            'last_read_page' => (int) ($e->last_read_page ?: 1),
                        ],
                        'occurred_at' => $e->last_accessed_at,
                    ]);
                }
            }
        }

        // 2. Fetch all actual reading activities for this month
        $actualActivities = ReadingActivity::where('user_id', $user->id)
            ->whereBetween('occurred_at', [$startOfMonth, $endOfMonth])
            ->with('product:id,title,slug,cover_url,pages')
            ->orderBy('occurred_at', 'asc')
            ->get();

        // 3. Build Daily Details Map (Aggregated Books, Pages, Highlights, Notes, Duration)
        $dailyDetails = [];

        // Seed with actual activities
        foreach ($actualActivities as $act) {
            $dateStr = $act->occurred_at->toDateString();
            if (!isset($dailyDetails[$dateStr])) {
                $dailyDetails[$dateStr] = [
                    'date' => $dateStr,
                    'total_duration_minutes' => 0,
                    'books' => [],
                    'schedules' => [],
                    'highlights' => [],
                    'notes' => [],
                ];
            }

            $dailyDetails[$dateStr]['total_duration_minutes'] += (int) $act->duration_minutes;

            if ($act->product) {
                $pid = $act->product->id;
                if (!isset($dailyDetails[$dateStr]['books'][$pid])) {
                    $dailyDetails[$dateStr]['books'][$pid] = [
                        'id' => $pid,
                        'title' => $act->product->title,
                        'slug' => $act->product->slug,
                        'cover_url' => $act->product->coverPublicUrl(),
                        'pages_read' => (int) ($act->pages_read ?: 1),
                        'total_pages' => (int) ($act->product->pages ?: 1),
                        'progress' => (int) ($act->metadata['progress'] ?? 10),
                        'last_read_time' => $act->occurred_at->format('H:i'),
                        'duration_minutes' => (int) $act->duration_minutes,
                    ];
                } else {
                    $dailyDetails[$dateStr]['books'][$pid]['pages_read'] = max(
                        $dailyDetails[$dateStr]['books'][$pid]['pages_read'],
                        (int) ($act->pages_read ?: 1)
                    );
                    $dailyDetails[$dateStr]['books'][$pid]['duration_minutes'] += (int) $act->duration_minutes;
                }
            }
        }

        // Add entitlements and highlights/notes to the daily details
        foreach ($entitlements as $e) {
            $p = $e->product;
            if (!$p) continue;

            // Check if last_accessed_at falls in this month
            if ($e->last_accessed_at && $e->last_accessed_at->between($startOfMonth, $endOfMonth)) {
                $dateStr = $e->last_accessed_at->toDateString();
                if (!isset($dailyDetails[$dateStr])) {
                    $dailyDetails[$dateStr] = [
                        'date' => $dateStr,
                        'total_duration_minutes' => 0,
                        'books' => [],
                        'schedules' => [],
                        'highlights' => [],
                        'notes' => [],
                    ];
                }

                $pid = $p->id;
                if (!isset($dailyDetails[$dateStr]['books'][$pid])) {
                    $estMinutes = max(10, min(120, (int) round(($p->reading_time ?: 30) * max(0.2, ($e->progress ?: 10) / 100))));
                    $dailyDetails[$dateStr]['books'][$pid] = [
                        'id' => $pid,
                        'title' => $p->title,
                        'slug' => $p->slug,
                        'cover_url' => $p->coverPublicUrl(),
                        'category_name' => $p->category?->name,
                        'pages_read' => (int) ($e->last_read_page ?: 1),
                        'total_pages' => (int) ($p->pages ?: 1),
                        'progress' => (int) $e->progress,
                        'last_read_time' => $e->last_accessed_at->format('H:i'),
                        'duration_minutes' => $estMinutes,
                    ];
                    $dailyDetails[$dateStr]['total_duration_minutes'] += $estMinutes;
                }
            }

            // Check highlights created in this month
            if (!empty($e->highlights) && is_array($e->highlights)) {
                foreach ($e->highlights as $h) {
                    $createdAt = $h['created_at'] ?? null;
                    if ($createdAt) {
                        $hDate = substr($createdAt, 0, 10);
                        if (Carbon::hasFormat($hDate, 'Y-m-d')) {
                            $cDate = Carbon::parse($hDate);
                            if ($cDate->between($startOfMonth, $endOfMonth)) {
                                if (!isset($dailyDetails[$hDate])) {
                                    $dailyDetails[$hDate] = [
                                        'date' => $hDate,
                                        'total_duration_minutes' => 0,
                                        'books' => [],
                                        'schedules' => [],
                                        'highlights' => [],
                                        'notes' => [],
                                    ];
                                }
                                $dailyDetails[$hDate]['highlights'][] = [
                                    'id' => $h['id'] ?? Str::uuid()->toString(),
                                    'book_title' => $p->title,
                                    'book_slug' => $p->slug,
                                    'text' => $h['text'] ?? '',
                                    'page' => $h['page'] ?? 1,
                                    'color' => $h['color'] ?? 'yellow',
                                    'created_at' => $createdAt,
                                ];
                            }
                        }
                    }
                }
            }

            // Check notes created in this month
            if (!empty($e->notes) && is_array($e->notes)) {
                foreach ($e->notes as $n) {
                    $createdAt = $n['created_at'] ?? null;
                    if ($createdAt) {
                        $nDate = substr($createdAt, 0, 10);
                        if (Carbon::hasFormat($nDate, 'Y-m-d')) {
                            $cDate = Carbon::parse($nDate);
                            if ($cDate->between($startOfMonth, $endOfMonth)) {
                                if (!isset($dailyDetails[$nDate])) {
                                    $dailyDetails[$nDate] = [
                                        'date' => $nDate,
                                        'total_duration_minutes' => 0,
                                        'books' => [],
                                        'schedules' => [],
                                        'highlights' => [],
                                        'notes' => [],
                                    ];
                                }
                                $dailyDetails[$nDate]['notes'][] = [
                                    'id' => $n['id'] ?? Str::uuid()->toString(),
                                    'book_title' => $p->title,
                                    'book_slug' => $p->slug,
                                    'title' => $n['title'] ?? 'Catatan Riset',
                                    'content' => $n['content'] ?? '',
                                    'page' => $n['page'] ?? 1,
                                    'created_at' => $createdAt,
                                ];
                            }
                        }
                    }
                }
            }
        }

        // Add schedules to daily details
        foreach ($schedules as $sch) {
            $dateStr = $sch->scheduled_date ? Carbon::parse($sch->scheduled_date)->toDateString() : null;
            if ($dateStr) {
                if (!isset($dailyDetails[$dateStr])) {
                    $dailyDetails[$dateStr] = [
                        'date' => $dateStr,
                        'total_duration_minutes' => 0,
                        'books' => [],
                        'schedules' => [],
                        'highlights' => [],
                        'notes' => [],
                    ];
                }
                $dailyDetails[$dateStr]['schedules'][] = $sch;
            }
        }

        // Format books from associative array to indexed list
        foreach ($dailyDetails as $d => $val) {
            $dailyDetails[$d]['books'] = array_values($val['books']);
            $dailyDetails[$d]['total_books'] = count($dailyDetails[$d]['books']);
            $dailyDetails[$d]['total_highlights'] = count($dailyDetails[$d]['highlights']);
            $dailyDetails[$d]['total_notes'] = count($dailyDetails[$d]['notes']);
        }

        return response()->json([
            'schedules' => $schedules,
            'actual_activities' => $actualActivities,
            'daily_details' => $dailyDetails,
        ]);
    }

    /**
     * Create a reading schedule.
     */
    public function storeSchedule(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validate([
            'product_id' => ['nullable', 'exists:products,id'],
            'title' => ['required', 'string', 'max:255'],
            'scheduled_date' => ['required', 'date'],
            'start_time' => ['nullable', 'string', 'max:10'],
            'end_time' => ['nullable', 'string', 'max:10'],
            'target_duration_minutes' => ['nullable', 'integer', 'min:5', 'max:720'],
            'target_pages' => ['nullable', 'string', 'max:50'],
            'priority' => ['nullable', 'string', 'in:low,medium,high,urgent'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $schedule = ReadingSchedule::create([
            'user_id' => $user->id,
            'product_id' => $data['product_id'] ?? null,
            'title' => $data['title'],
            'scheduled_date' => $data['scheduled_date'],
            'start_time' => $data['start_time'] ?? null,
            'end_time' => $data['end_time'] ?? null,
            'target_duration_minutes' => $data['target_duration_minutes'] ?? 60,
            'target_pages' => $data['target_pages'] ?? null,
            'priority' => $data['priority'] ?? 'medium',
            'status' => 'scheduled',
            'notes' => $data['notes'] ?? null,
        ]);

        // Log schedule created
        ReadingActivity::create([
            'user_id' => $user->id,
            'product_id' => $data['product_id'] ?? null,
            'activity_type' => 'schedule_created',
            'description' => "Menjadwalkan agenda riset: {$data['title']}",
            'metadata' => ['scheduled_date' => $data['scheduled_date']],
            'occurred_at' => now(),
        ]);

        return response()->json([
            'message' => 'Jadwal membaca berhasil dibuat.',
            'schedule' => $schedule->load('product:id,title,slug'),
        ], 201);
    }

    /**
     * Update a reading schedule.
     */
    public function updateSchedule(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $schedule = ReadingSchedule::where('user_id', $user->id)->findOrFail($id);

        $data = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'scheduled_date' => ['sometimes', 'required', 'date'],
            'start_time' => ['nullable', 'string', 'max:10'],
            'end_time' => ['nullable', 'string', 'max:10'],
            'target_duration_minutes' => ['nullable', 'integer'],
            'target_pages' => ['nullable', 'string', 'max:50'],
            'priority' => ['nullable', 'string', 'in:low,medium,high,urgent'],
            'status' => ['sometimes', 'required', 'string', 'in:scheduled,in_progress,completed,missed,cancelled'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        if (isset($data['status']) && $data['status'] === 'completed' && $schedule->status !== 'completed') {
            $data['completed_at'] = now();
        }

        $schedule->update($data);

        return response()->json([
            'message' => 'Jadwal berhasil diperbarui.',
            'schedule' => $schedule->load('product:id,title,slug'),
        ]);
    }

    /**
     * Delete a reading schedule.
     */
    public function deleteSchedule(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $schedule = ReadingSchedule::where('user_id', $user->id)->findOrFail($id);
        $schedule->delete();

        return response()->json(['message' => 'Jadwal membaca berhasil dihapus.']);
    }

    /**
     * Reading Activity Log Timeline.
     */
    public function activities(Request $request): JsonResponse
    {
        $user = $request->user();
        $type = $request->input('type');
        $productId = $request->input('product_id');

        $query = ReadingActivity::where('user_id', $user->id)->with('product:id,title,slug,cover_url');

        if ($type && $type !== 'all') {
            $query->where('activity_type', $type);
        }
        if ($productId) {
            $query->where('product_id', $productId);
        }

        $activities = $query->orderBy('occurred_at', 'desc')->paginate(20);

        return response()->json($activities);
    }

    /**
     * Reading Analytics & Heatmap.
     */
    public function analytics(Request $request): JsonResponse
    {
        $user = $request->user();
        $entitlements = $user->entitlements()->active()->with('product')->get();

        // 1. Heatmap for the past 365 days
        $startDate = now()->subDays(364)->startOfDay();
        $activities = ReadingActivity::where('user_id', $user->id)
            ->where('occurred_at', '>=', $startDate)
            ->get();

        $heatmap = [];
        for ($i = 0; $i < 365; $i++) {
            $date = Carbon::parse($startDate)->addDays($i)->toDateString();
            $heatmap[$date] = [
                'count' => 0,
                'minutes' => 0,
                'level' => 0,
            ];
        }

        foreach ($activities as $act) {
            $d = Carbon::parse($act->occurred_at)->toDateString();
            if (isset($heatmap[$d])) {
                $heatmap[$d]['count']++;
                $heatmap[$d]['minutes'] += (int) $act->duration_minutes;
            }
        }

        // If activity table is sparse, augment heatmap with entitlements last_accessed_at
        foreach ($entitlements as $e) {
            if ($e->last_accessed_at) {
                $ad = $e->last_accessed_at->toDateString();
                if (isset($heatmap[$ad])) {
                    $heatmap[$ad]['count'] = max(1, $heatmap[$ad]['count']);
                    $heatmap[$ad]['minutes'] = max(15, $heatmap[$ad]['minutes']);
                }
            }
        }

        // Assign levels (0..4)
        foreach ($heatmap as $date => $data) {
            $m = $data['minutes'];
            $c = $data['count'];
            if ($m >= 60 || $c >= 5) {
                $level = 4;
            } elseif ($m >= 35 || $c >= 3) {
                $level = 3;
            } elseif ($m >= 15 || $c >= 2) {
                $level = 2;
            } elseif ($m > 0 || $c > 0) {
                $level = 1;
            } else {
                $level = 0;
            }
            $heatmap[$date]['level'] = $level;
        }

        // 2. Weekly distribution (Monday - Sunday)
        $dayDistribution = [
            'Senin' => 0, 'Selasa' => 0, 'Rabu' => 0, 'Kamis' => 0,
            'Jumat' => 0, 'Sabtu' => 0, 'Minggu' => 0,
        ];
        $dayNames = [
            1 => 'Senin', 2 => 'Selasa', 3 => 'Rabu', 4 => 'Kamis',
            5 => 'Jumat', 6 => 'Sabtu', 0 => 'Minggu',
        ];

        foreach ($activities as $act) {
            $dayOfWeek = Carbon::parse($act->occurred_at)->dayOfWeek;
            $name = $dayNames[$dayOfWeek] ?? 'Senin';
            $dayDistribution[$name] += max(5, (int) $act->duration_minutes);
        }

        // 3. Reading Streak
        $streak = $this->calculateReadingStreak($user);

        // 4. Most active reading document
        $mostActive = $entitlements->sortByDesc('progress')->first();
        $mostActiveDoc = $mostActive && $mostActive->product ? [
            'title' => $mostActive->product->title,
            'slug' => $mostActive->product->slug,
            'progress' => (int) $mostActive->progress,
        ] : null;

        return response()->json([
            'heatmap' => $heatmap,
            'weekly_distribution' => $dayDistribution,
            'streak' => $streak,
            'total_minutes' => (int) $activities->sum('duration_minutes'),
            'total_sessions' => $activities->count(),
            'most_active_document' => $mostActiveDoc,
            'goals' => $user->reading_goals ?? [
                'daily_minutes' => 30,
                'weekly_hours' => 5,
                'monthly_docs' => 3,
            ],
        ]);
    }

    /**
     * Upload and crop avatar photo.
     */
    public function uploadAvatar(Request $request): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'avatar' => ['required', 'image', 'mimes:jpeg,png,jpg,webp', 'max:4096'],
        ]);

        $file = $request->file('avatar');
        $filename = 'avatar_' . $user->id . '_' . time() . '.' . $file->getClientOriginalExtension();

        // Store into public storage disk
        $path = $file->storeAs('avatars', $filename, 'public');
        $publicUrl = '/storage/' . $path;

        // Delete old avatar if custom
        if ($user->avatar_url && Str::contains($user->avatar_url, '/storage/avatars/')) {
            $oldPath = str_replace('/storage/', '', $user->avatar_url);
            Storage::disk('public')->delete($oldPath);
        }

        $user->forceFill(['avatar_url' => $publicUrl])->save();

        return response()->json([
            'message' => 'Foto profil berhasil diperbarui.',
            'avatar_url' => $publicUrl,
            'user' => Present::user($user),
        ]);
    }

    /**
     * Delete user avatar photo.
     */
    public function deleteAvatar(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->avatar_url && Str::contains($user->avatar_url, '/storage/avatars/')) {
            $oldPath = str_replace('/storage/', '', $user->avatar_url);
            Storage::disk('public')->delete($oldPath);
        }

        $user->forceFill(['avatar_url' => null])->save();

        return response()->json([
            'message' => 'Foto profil berhasil dihapus.',
            'user' => Present::user($user),
        ]);
    }

    /**
     * Update full profile details & preferences.
     */
    public function updateDetails(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'phone' => ['nullable', 'string', 'max:30'],
            'bio' => ['nullable', 'string', 'max:1000'],
            'job_title' => ['nullable', 'string', 'max:150'],
            'organization' => ['nullable', 'string', 'max:150'],
            'department' => ['nullable', 'string', 'max:150'],
            'country' => ['nullable', 'string', 'max:100'],
            'timezone' => ['nullable', 'string', 'max:50'],
            'preferred_language' => ['nullable', 'string', 'in:id,en'],
        ]);

        $user->update($data);

        return response()->json([
            'message' => 'Profil dan preferensi berhasil disimpan.',
            'user' => Present::user($user),
        ]);
    }

    /**
     * Update reading goals.
     */
    public function updateGoals(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'daily_minutes' => ['required', 'integer', 'min:5', 'max:720'],
            'weekly_hours' => ['required', 'numeric', 'min:1', 'max:100'],
            'monthly_docs' => ['required', 'integer', 'min:1', 'max:50'],
        ]);

        $user->update(['reading_goals' => $data]);

        return response()->json([
            'message' => 'Target membaca berhasil diperbarui.',
            'goals' => $data,
        ]);
    }

    /**
     * Helper to calculate active reading streak in days.
     */
    private function calculateReadingStreak(User $user): int
    {
        $activeDates = ReadingActivity::where('user_id', $user->id)
            ->selectRaw('DATE(occurred_at) as act_date')
            ->groupBy('act_date')
            ->orderBy('act_date', 'desc')
            ->pluck('act_date')
            ->toArray();

        // Also merge entitlements last_accessed_at dates
        $entitlementDates = $user->entitlements()
            ->whereNotNull('last_accessed_at')
            ->selectRaw('DATE(last_accessed_at) as acc_date')
            ->groupBy('acc_date')
            ->pluck('acc_date')
            ->toArray();

        $allDates = array_unique(array_merge($activeDates, $entitlementDates));
        rsort($allDates);

        if (empty($allDates)) {
            return 0;
        }

        $streak = 0;
        $checkDate = Carbon::now()->startOfDay();

        // If user read today or yesterday, streak continues
        $todayStr = $checkDate->toDateString();
        $yesterdayStr = $checkDate->copy()->subDay()->toDateString();

        if (!in_array($todayStr, $allDates) && !in_array($yesterdayStr, $allDates)) {
            return 0;
        }

        $current = in_array($todayStr, $allDates) ? $checkDate : $checkDate->copy()->subDay();

        while (in_array($current->toDateString(), $allDates)) {
            $streak++;
            $current->subDay();
        }

        return $streak;
    }
}

