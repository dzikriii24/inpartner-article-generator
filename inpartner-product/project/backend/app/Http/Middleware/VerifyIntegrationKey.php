<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Server-to-server auth for calls coming from the Article Generator.
 * Header `X-Integration-Key` must equal ARTICLE_GENERATOR_KEY.
 */
class VerifyIntegrationKey
{
    public function handle(Request $request, Closure $next): Response
    {
        $expected = (string) config('services.article_generator.key');
        $given = (string) $request->header('X-Integration-Key');

        if ($expected === '' || $given === '' || ! hash_equals($expected, $given)) {
            return response()->json(['message' => 'Invalid integration key.'], 401);
        }

        return $next($request);
    }
}
