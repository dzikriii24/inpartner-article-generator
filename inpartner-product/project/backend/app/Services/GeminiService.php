<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeminiService
{
    protected ?string $apiKey;
    protected string $primaryModel;
    protected string $fallbackModel;

    public function __construct()
    {
        $this->apiKey = env('GEMINI_API_KEY');
        $this->primaryModel = env('GEMINI_MODEL', 'gemini-3.5-flash');
        $this->fallbackModel = env('GEMINI_FALLBACK_MODEL', 'gemini-3.5-flash-lite');
    }

    public function isConfigured(): bool
    {
        return ! empty($this->apiKey);
    }

    public function getModel(): string
    {
        return $this->primaryModel;
    }

    /**
     * Generate content with automatic model fallback for maximum uptime
     */
    public function generate(string $prompt, ?string $systemInstruction = null): ?string
    {
        if (! $this->isConfigured()) {
            return null;
        }

        $models = array_unique([$this->primaryModel, $this->fallbackModel, 'gemini-3.5-flash']);

        foreach ($models as $model) {
            try {
                $payload = [
                    'contents' => [
                        ['parts' => [['text' => $prompt]]]
                    ],
                    'generationConfig' => [
                        'temperature' => 0.25,
                        'maxOutputTokens' => 2048,
                    ]
                ];

                if ($systemInstruction) {
                    $payload['systemInstruction'] = [
                        'parts' => [['text' => $systemInstruction]]
                    ];
                }

                $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$this->apiKey}";
                $response = Http::timeout(30)->post($url, $payload);

                if ($response->successful()) {
                    $reply = $response->json('candidates.0.content.parts.0.text');
                    if (! empty($reply)) {
                        return trim($reply);
                    }
                }

                Log::warning("Gemini model {$model} returned {$response->status()}: " . substr($response->body(), 0, 300));
            } catch (\Throwable $e) {
                Log::error("Gemini model {$model} exception: " . $e->getMessage());
            }
        }

        return null;
    }
}

