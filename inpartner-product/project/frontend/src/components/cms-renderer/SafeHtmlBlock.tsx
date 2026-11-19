import React, { useMemo } from 'react';

const ALLOWED_TAGS = new Set([
  'P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'S',
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'UL', 'OL', 'LI', 'BLOCKQUOTE', 'CODE', 'PRE',
  'A', 'SPAN', 'DIV', 'HR', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD',
]);

const ALLOWED_ATTRS = new Set(['href', 'target', 'rel', 'class', 'title']);

/**
 * Strict DOM-based HTML allowlist sanitizer (no scripts, no eval, no inline event handlers).
 */
export function sanitizeSafeHtml(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') return '';
  if (typeof DOMParser === 'undefined') {
    return dirty.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${dirty}</div>`, 'text/html');
  const root = doc.body.firstElementChild;
  if (!root) return '';

  const walk = (node: Element) => {
    const children = Array.from(node.children);
    for (const el of children) {
      if (!ALLOWED_TAGS.has(el.tagName)) {
        el.remove();
        continue;
      }

      for (const attr of Array.from(el.attributes)) {
        const name = attr.name.toLowerCase();
        if (!ALLOWED_ATTRS.has(name) || name.startsWith('on')) {
          el.removeAttribute(attr.name);
          continue;
        }
        if (name === 'href') {
          const val = attr.value.trim().toLowerCase();
          if (val.startsWith('javascript:') || val.startsWith('vbscript:') || val.startsWith('data:')) {
            el.setAttribute('href', '#');
          }
        }
      }

      if (el.tagName === 'A' && el.getAttribute('target') === '_blank') {
        el.setAttribute('rel', 'noopener noreferrer');
      }

      walk(el);
    }
  };

  walk(root);
  return root.innerHTML;
}

export const SafeHtmlBlock: React.FC<{ html: string; className?: string }> = ({ html, className }) => {
  const clean = useMemo(() => sanitizeSafeHtml(html), [html]);
  return <div className={className || 'article-prose text-sm'} dangerouslySetInnerHTML={{ __html: clean }} />;
};

