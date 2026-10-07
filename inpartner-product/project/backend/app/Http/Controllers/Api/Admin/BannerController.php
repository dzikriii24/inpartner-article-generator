<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Banner;
use App\Support\Present;
use Illuminate\Http\Request;

class BannerController extends Controller
{
    public function index()
    {
        return response()->json(['data' => Banner::orderBy('sort_order')->get()->map(fn ($b) => Present::banner($b))]);
    }

    public function store(Request $request)
    {
        return response()->json(['banner' => Present::banner(Banner::create($this->validated($request)))], 201);
    }

    public function update(Request $request, Banner $banner)
    {
        $banner->update($this->validated($request));

        return response()->json(['banner' => Present::banner($banner)]);
    }

    public function destroy(Banner $banner)
    {
        $banner->delete();

        return response()->json(['message' => 'Banner dihapus.']);
    }

    protected function validated(Request $request): array
    {
        return $request->validate([
            'eyebrow' => ['nullable', 'string', 'max:120'],
            'title' => ['required', 'string', 'max:200'],
            'subtitle' => ['nullable', 'string'],
            'image_url' => ['nullable', 'string', 'max:2000'],
            'cta_label' => ['nullable', 'string', 'max:60'],
            'cta_url' => ['nullable', 'string', 'max:500'],
            'theme' => ['nullable', 'in:indigo,amber,emerald,rose,ink'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['boolean'],
        ]);
    }
}
