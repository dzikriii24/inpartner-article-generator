<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CartItem;
use App\Models\Product;
use App\Support\Present;
use Illuminate\Http\Request;

class CartController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $items = $user->cartItems()->with('product.category', 'product.author')->latest()->get()
            ->filter(fn ($i) => $i->product);

        $owned = $user->entitlements()->active()->pluck('product_id')->all();

        $rows = $items->map(fn (CartItem $i) => [
            'id' => $i->id,
            'available' => $i->product->status === 'published' && ! in_array($i->product_id, $owned, true),
            'product' => Present::productCard($i->product, $owned),
        ])->values();

        $available = $rows->where('available', true);

        return response()->json([
            'items' => $rows,
            'summary' => [
                'count' => $available->count(),
                'subtotal' => (int) $available->sum('product.price'),
                'discount' => (int) ($available->sum('product.price') - $available->sum('product.final_price')),
                'total' => (int) $available->sum('product.final_price'),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate(['product_id' => ['required', 'integer', 'exists:products,id']]);
        $product = Product::published()->findOrFail($data['product_id']);

        if ($request->user()->owns($product)) {
            return response()->json(['message' => 'Kamu sudah memiliki produk ini.'], 422);
        }

        CartItem::firstOrCreate(['user_id' => $request->user()->id, 'product_id' => $product->id]);

        return response()->json([
            'message' => 'Ditambahkan ke keranjang.',
            'cart_count' => $request->user()->cartItems()->count(),
        ], 201);
    }

    public function destroy(Request $request, int $productId)
    {
        $request->user()->cartItems()->where('product_id', $productId)->delete();

        return response()->json(['cart_count' => $request->user()->cartItems()->count()]);
    }

    public function clear(Request $request)
    {
        $request->user()->cartItems()->delete();

        return response()->json(['cart_count' => 0]);
    }
}
