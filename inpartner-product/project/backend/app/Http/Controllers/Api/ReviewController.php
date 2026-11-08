<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Review;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    /** Public: list approved reviews for a product */
    public function productReviews(string $slug)
    {
        $product = Product::where('slug', $slug)->firstOrFail();

        $reviews = Review::with('user:id,name')
            ->where('product_id', $product->id)
            ->where('status', 'approved')
            ->latest()
            ->take(20)
            ->get()
            ->map(fn ($r) => [
                'id' => $r->id,
                'user_name' => $r->user?->name ?: 'Pelanggan Terverifikasi',
                'rating' => $r->rating,
                'title' => $r->title,
                'comment' => $r->comment,
                'is_verified_buyer' => (bool) $r->is_verified_buyer,
                'created_at' => $r->created_at?->toIso8601String(),
            ]);

        $approvedCount = Review::where('product_id', $product->id)->where('status', 'approved')->count();
        $avgRating = $approvedCount > 0
            ? round((float) Review::where('product_id', $product->id)->where('status', 'approved')->avg('rating'), 1)
            : 5.0;

        // Rating breakdown distribution
        $distribution = [
            5 => Review::where('product_id', $product->id)->where('status', 'approved')->where('rating', 5)->count(),
            4 => Review::where('product_id', $product->id)->where('status', 'approved')->where('rating', 4)->count(),
            3 => Review::where('product_id', $product->id)->where('status', 'approved')->where('rating', 3)->count(),
            2 => Review::where('product_id', $product->id)->where('status', 'approved')->where('rating', 2)->count(),
            1 => Review::where('product_id', $product->id)->where('status', 'approved')->where('rating', 1)->count(),
        ];

        return response()->json([
            'average_rating' => $avgRating,
            'total_reviews' => $approvedCount,
            'distribution' => $distribution,
            'reviews' => $reviews,
        ]);
    }

    /** Customer: submit review for a product */
    public function store(Request $request, string $slug)
    {
        $data = $request->validate([
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'title' => ['nullable', 'string', 'max:180'],
            'comment' => ['required', 'string', 'min:5', 'max:2000'],
        ]);

        $user = $request->user();
        $product = Product::where('slug', $slug)->firstOrFail();

        // Check if verified buyer (has entitlement)
        $isVerified = $user->owns($product);

        $review = Review::updateOrCreate(
            ['user_id' => $user->id, 'product_id' => $product->id],
            [
                'rating' => $data['rating'],
                'title' => $data['title'] ?? null,
                'comment' => $data['comment'],
                'status' => 'approved', // Auto-approved for verified purchasers
                'is_verified_buyer' => $isVerified,
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Ulasan Anda berhasil dikirimkan.',
            'review' => $review,
        ]);
    }

    /** Admin: list all reviews with filter & search */
    public function adminIndex(Request $request)
    {
        $q = Review::with(['user:id,name,email', 'product:id,title,slug']);

        if ($status = $request->input('status')) {
            if ($status !== 'all') {
                $q->where('status', $status);
            }
        }

        if ($term = trim((string) $request->input('q'))) {
            $q->where(function ($w) use ($term) {
                $w->where('comment', 'like', "%{$term}%")
                    ->orWhere('title', 'like', "%{$term}%")
                    ->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%{$term}%")->orWhere('email', 'like', "%{$term}%"))
                    ->orWhereHas('product', fn ($p) => $p->where('title', 'like', "%{$term}%"));
            });
        }

        $reviews = $q->latest()->paginate((int) $request->input('per_page', 15));

        return response()->json($reviews);
    }

    /** Admin: update review status (approve / reject) */
    public function adminUpdateStatus(Request $request, int $id)
    {
        $data = $request->validate([
            'status' => ['required', 'in:approved,pending,rejected'],
        ]);

        $review = Review::findOrFail($id);
        $review->update(['status' => $data['status']]);

        return response()->json([
            'success' => true,
            'message' => "Status ulasan berhasil diubah menjadi {$data['status']}.",
            'review' => $review,
        ]);
    }

    /** Admin: delete review */
    public function adminDestroy(int $id)
    {
        $review = Review::findOrFail($id);
        $review->delete();

        return response()->json([
            'success' => true,
            'message' => 'Ulasan berhasil dihapus.',
        ]);
    }
}

