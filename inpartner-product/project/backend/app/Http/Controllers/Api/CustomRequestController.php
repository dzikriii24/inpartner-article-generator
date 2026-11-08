<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CustomRequest;
use Illuminate\Http\Request;

class CustomRequestController extends Controller
{
    /** Public/Customer: submit custom research request */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:190'],
            'company' => ['nullable', 'string', 'max:200'],
            'phone' => ['nullable', 'string', 'max:40'],
            'sector' => ['required', 'string', 'max:100'],
            'topic' => ['required', 'string', 'max:255'],
            'scope' => ['required', 'string', 'min:20', 'max:4000'],
            'budget_range' => ['nullable', 'string', 'max:100'],
            'timeline' => ['nullable', 'string', 'max:100'],
        ]);

        $user = $request->user('sanctum');

        $customRequest = CustomRequest::create([
            'user_id' => $user?->id,
            'name' => $data['name'],
            'email' => $data['email'],
            'company' => $data['company'] ?? null,
            'phone' => $data['phone'] ?? null,
            'sector' => $data['sector'],
            'topic' => $data['topic'],
            'scope' => $data['scope'],
            'budget_range' => $data['budget_range'] ?? 'standard',
            'timeline' => $data['timeline'] ?? '2_weeks',
            'status' => 'pending',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Permintaan riset kustom Anda berhasil diajukan. Tim Analis Senior kami akan menghubungi Anda dalam 1x24 jam kerja.',
            'data' => $customRequest,
        ]);
    }

    /** Customer: view own requests */
    public function index(Request $request)
    {
        $user = $request->user();
        $requests = CustomRequest::where('user_id', $user->id)
            ->orWhere('email', $user->email)
            ->latest()
            ->paginate(10);

        return response()->json($requests);
    }

    /** Admin: view all custom data & research requests */
    public function adminIndex(Request $request)
    {
        $q = CustomRequest::query();

        if ($status = $request->input('status')) {
            if ($status !== 'all') {
                $q->where('status', $status);
            }
        }

        if ($sector = $request->input('sector')) {
            if ($sector !== 'all') {
                $q->where('sector', $sector);
            }
        }

        if ($term = trim((string) $request->input('q'))) {
            $q->where(function ($w) use ($term) {
                $w->where('topic', 'like', "%{$term}%")
                    ->orWhere('company', 'like', "%{$term}%")
                    ->orWhere('name', 'like', "%{$term}%")
                    ->orWhere('email', 'like', "%{$term}%");
            });
        }

        $requests = $q->latest()->paginate((int) $request->input('per_page', 15));

        return response()->json($requests);
    }

    /** Admin: update status & notes */
    public function adminUpdate(Request $request, int $id)
    {
        $data = $request->validate([
            'status' => ['required', 'in:pending,in_review,quoted,in_progress,completed,cancelled'],
            'admin_notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $customRequest = CustomRequest::findOrFail($id);
        $customRequest->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Status permintaan berhasil diperbarui.',
            'data' => $customRequest,
        ]);
    }
}

