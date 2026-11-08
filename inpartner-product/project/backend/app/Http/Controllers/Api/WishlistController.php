<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Wishlist;
use App\Support\Present;
use Illuminate\Http\Request;

class WishlistController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $wishlists = Wishlist::with(['product.category', 'product.author'])
            ->where('user_id', $user->id)
            ->latest()
            ->paginate((int) $request->input('per_page', 12));

        $ownedIds = $user->entitlements()->active()->pluck('product_id')->all();

        return response()->json([
            'data' => collect($wishlists->items())->map(function ($w) use ($ownedIds) {
                if (!$w->product) {
                    return null;
                }
                $card = Present::productCard($w->product, $ownedIds);
                $card['wishlisted_at'] = $w->created_at?->toIso8601String();
                $card['is_wishlisted'] = true;
                return $card;
            })->filter()->values(),
            'meta' => [
                'current_page' => $wishlists->currentPage(),
                'last_page' => $wishlists->lastPage(),
                'total' => $wishlists->total(),
            ],
            'wishlist_ids' => Wishlist::where('user_id', $user->id)->pluck('product_id')->all(),
        ]);
    }

    public function toggle(Request $request, int $productId)
    {
        $user = $request->user();
        $product = Product::findOrFail($productId);

        $existing = Wishlist::where('user_id', $user->id)->where('product_id', $product->id)->first();

        if ($existing) {
            $existing->delete();
            $isWishlisted = false;
            $message = 'Produk dihapus dari wishlist Anda.';
        } else {
            Wishlist::create([
                'user_id' => $user->id,
                'product_id' => $product->id,
            ]);
            $isWishlisted = true;
            $message = 'Produk berhasil ditambahkan ke wishlist.';
        }

        return response()->json([
            'success' => true,
            'is_wishlisted' => $isWishlisted,
            'message' => $message,
            'wishlist_ids' => Wishlist::where('user_id', $user->id)->pluck('product_id')->all(),
        ]);
    }

    public function ids(Request $request)
    {
        $user = $request->user();
        $ids = Wishlist::where('user_id', $user->id)->pluck('product_id')->all();

        return response()->json([
            'wishlist_ids' => $ids,
        ]);
    }
}

