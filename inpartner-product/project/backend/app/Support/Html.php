<?php

namespace App\Support;

use DOMDocument;
use DOMNode;

/**
 * Small HTML helpers: build the public teaser of a premium article and strip
 * dangerous markup before content is rendered with v-html in the SPA.
 */
class Html
{
    /** Remove scripts, inline event handlers and javascript: URLs. */
    public static function sanitize(?string $html): string
    {
        $html = (string) $html;
        $html = preg_replace('#<\s*(script|style|iframe|object|embed)[^>]*>.*?<\s*/\s*\1\s*>#is', '', $html);
        $html = preg_replace('#<\s*(script|iframe|object|embed)[^>]*/?>#is', '', $html);
        $html = preg_replace('#\son[a-z]+\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)#i', '', $html);
        $html = preg_replace('#(href|src)\s*=\s*(["\'])\s*javascript:[^"\']*\2#i', '$1="#"', $html);

        return trim($html);
    }

    public static function wordCount(?string $html): int
    {
        $text = trim(preg_replace('/\s+/u', ' ', strip_tags((string) $html)));

        return $text === '' ? 0 : count(explode(' ', $text));
    }

    /**
     * Take the first top-level blocks of the article until ~$maxWords words
     * (and never more than ~30% of the article) are included.
     */
    public static function preview(?string $html, int $maxWords = 150): string
    {
        $html = trim((string) $html);
        if ($html === '') {
            return '';
        }

        $total = self::wordCount($html);
        $limit = max(40, min($maxWords, (int) ceil($total * 0.3)));

        $doc = new DOMDocument();
        libxml_use_internal_errors(true);
        $doc->loadHTML('<?xml encoding="UTF-8"><div id="__root">'.$html.'</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
        libxml_clear_errors();

        $root = $doc->getElementById('__root');
        if (! $root) {
            return '<p>'.e(mb_substr(strip_tags($html), 0, 600)).'…</p>';
        }

        $out = '';
        $words = 0;
        /** @var DOMNode $node */
        foreach (iterator_to_array($root->childNodes) as $node) {
            if ($node->nodeType === XML_TEXT_NODE && trim($node->textContent) === '') {
                continue;
            }
            $nodeHtml = $doc->saveHTML($node);
            $nodeWords = self::wordCount($nodeHtml);
            if ($words > 0 && $words + $nodeWords > $limit) {
                break;
            }
            // skip images in the teaser
            if ($node->nodeName === 'img' || $node->nodeName === 'figure') {
                continue;
            }
            $out .= $nodeHtml;
            $words += $nodeWords;
            if ($words >= $limit) {
                break;
            }
        }

        return self::sanitize($out);
    }
}
