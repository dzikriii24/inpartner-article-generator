<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Entitlement;
use App\Models\Product;
use App\Models\User;
use App\Support\Present;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $page = User::withCount(['orders', 'entitlements'])
            ->withSum(['orders as total_spent' => fn ($q) => $q->where('payment_status', 'paid')], 'total')
            ->when($request->input('q'), fn ($w, $t) => $w->where(fn ($s) => $s->where('name', 'like', "%{$t}%")->orWhere('email', 'like', "%{$t}%")))
            ->when($request->input('role'), fn ($w, $r) => $w->where('role', $r))
            ->when($request->input('status'), fn ($w, $s) => $w->where('status', $s))
            ->latest()
            ->paginate((int) $request->input('per_page', 15));

        return response()->json([
            'data' => collect($page->items())->map(fn ($u) => array_merge(Present::user($u), [
                'orders_count' => $u->orders_count,
                'library_count' => $u->entitlements_count,
                'total_spent' => (int) $u->total_spent,
            ])),
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'total' => $page->total()],
        ]);
    }

    public function show(User $user)
    {
        return response()->json([
            'user' => Present::user($user),
            'orders' => $user->orders()->with('items')->latest()->take(20)->get()->map(fn ($o) => Present::order($o, false)),
            'library' => $user->entitlements()->with('product.category', 'product.author', 'order')->latest('granted_at')->get()
                ->filter(fn ($e) => $e->product)->map(fn ($e) => array_merge(Present::libraryItem($e), ['revoked_at' => $e->revoked_at]))->values(),
        ]);
    }

    public function update(Request $request, User $user)
    {
        $data = $request->validate([
            'status' => ['sometimes', 'in:active,suspended'],
            'role' => ['sometimes', 'in:customer,admin'],
        ]);

        if ($user->id === $request->user()->id && (($data['status'] ?? 'active') !== 'active' || ($data['role'] ?? 'admin') !== 'admin')) {
            return response()->json(['message' => 'Kamu tidak bisa menonaktifkan / menurunkan role akunmu sendiri.'], 422);
        }

        $user->update($data);
        if (($data['status'] ?? null) === 'suspended') {
            $user->tokens()->delete();
        }

        return response()->json(['user' => Present::user($user)]);
    }

    /** Give a user free access to a product (complimentary / support case). */
    public function grant(Request $request, User $user)
    {
        $data = $request->validate(['product_id' => ['required', 'integer', 'exists:products,id']]);
        $product = Product::findOrFail($data['product_id']);

        Entitlement::updateOrCreate(
            ['user_id' => $user->id, 'product_id' => $product->id],
            ['source' => 'grant', 'granted_at' => now(), 'revoked_at' => null]
        );

        return $this->show($user);
    }

    public function revoke(User $user, Entitlement $entitlement)
    {
        abort_unless($entitlement->user_id === $user->id, 404);
        $entitlement->update(['revoked_at' => now()]);

        return $this->show($user);
    }
}
