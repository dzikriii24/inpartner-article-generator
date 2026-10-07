<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Author;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AuthorController extends Controller
{
    public function index()
    {
        return response()->json(['data' => Author::withCount('products')->orderBy('name')->get()]);
    }

    public function store(Request $request)
    {
        return response()->json(['author' => Author::create($this->validated($request))], 201);
    }

    public function update(Request $request, Author $author)
    {
        $author->update($this->validated($request, $author));

        return response()->json(['author' => $author]);
    }

    public function destroy(Author $author)
    {
        $author->delete();

        return response()->json(['message' => 'Author dihapus.']);
    }

    protected function validated(Request $request, ?Author $author = null): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'slug' => ['nullable', 'string', 'max:170', Rule::unique('authors', 'slug')->ignore($author?->id)],
            'bio' => ['nullable', 'string'],
            'photo_url' => ['nullable', 'string', 'max:2000'],
        ]);
        $data['slug'] = Str::slug($data['slug'] ?? '') ?: Str::slug($data['name']);

        return $data;
    }
}
