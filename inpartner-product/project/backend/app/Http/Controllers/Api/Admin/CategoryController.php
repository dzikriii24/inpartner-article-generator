<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
    public function index()
    {
        return response()->json([
            'data' => Category::withCount('products')->with('parent:id,name')->orderBy('sort_order')->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $category = Category::create($data);

        return response()->json(['category' => $category], 201);
    }

    public function update(Request $request, Category $category)
    {
        $category->update($this->validated($request, $category));

        return response()->json(['category' => $category]);
    }

    public function destroy(Category $category)
    {
        $category->delete(); // products.category_id -> null (FK nullOnDelete)

        return response()->json(['message' => 'Kategori dihapus.']);
    }

    protected function validated(Request $request, ?Category $category = null): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'slug' => ['nullable', 'string', 'max:140', Rule::unique('categories', 'slug')->ignore($category?->id)],
            'description' => ['nullable', 'string'],
            'icon' => ['nullable', 'string', 'max:60'],
            'color' => ['nullable', 'string', 'max:20'],
            'parent_id' => ['nullable', 'integer', 'exists:categories,id', Rule::notIn([$category?->id])],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);
        $data['slug'] = Str::slug($data['slug'] ?? '') ?: Str::slug($data['name']);
        $data['sort_order'] = $data['sort_order'] ?? 0;

        return $data;
    }
}
