// @ts-ignore
import pdfMake from 'pdfmake/build/pdfmake';
// @ts-ignore
import pdfFonts from 'pdfmake/build/vfs_fonts';
import htmlToPdfmake from 'html-to-pdfmake';

// Initialize pdfmake VFS
try {
  const vfs =
    (pdfFonts as any)?.pdfMake?.vfs ||
    (pdfFonts as any)?.default?.pdfMake?.vfs ||
    (pdfFonts as any)?.vfs ||
    pdfFonts;
  if (pdfMake && vfs) {
    pdfMake.vfs = vfs;
  }
} catch (e) {
  console.warn('pdfMake VFS init note:', e);
}

/**
 * Safely highlights text occurrences in an HTML string without corrupting
 * HTML tags, attributes (such as img src, a href, class), or scripts.
 */
export function applyHighlightsSafely(
  html: string,
  highlights: Array<{ text: string; color?: string; page?: number }>,
  preserveColors: boolean = true
): string {
  if (!html || !highlights || highlights.length === 0) return html || '';

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    highlights.forEach((h) => {
      if (!h.text || h.text.trim().length < 2) return;
      const searchText = h.text.trim();

      const colorBg =
        preserveColors && h.color === 'blue'
          ? '#BAE6FD'
          : preserveColors && h.color === 'green'
          ? '#BBF7D0'
          : preserveColors && h.color === 'red'
          ? '#FECDD3'
          : preserveColors && h.color === 'purple'
          ? '#E9D5FF'
          : '#FEF08A'; // Yellow default

      // Walk text nodes only
      const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
      const textNodes: Text[] = [];
      let node: Node | null;
      while ((node = walker.nextNode())) {
        if (node.nodeValue && node.nodeValue.includes(searchText)) {
          const parentTag = node.parentElement?.tagName?.toLowerCase();
          if (parentTag !== 'script' && parentTag !== 'style' && parentTag !== 'mark') {
            textNodes.push(node as Text);
          }
        }
      }

      // Replace occurrence in text nodes only
      textNodes.forEach((textNode) => {
        const fullText = textNode.nodeValue || '';
        let currentIndex = 0;
        let matchIndex = fullText.indexOf(searchText, currentIndex);

        if (matchIndex === -1 || !textNode.parentNode) return;

        const fragment = doc.createDocumentFragment();

        while (matchIndex !== -1) {
          if (matchIndex > currentIndex) {
            fragment.appendChild(doc.createTextNode(fullText.substring(currentIndex, matchIndex)));
          }

          const mark = doc.createElement('mark');
          mark.style.backgroundColor = colorBg;
          mark.style.color = '#1E293B';
          mark.style.padding = '1px 3px';
          mark.style.borderRadius = '3px';
          mark.style.borderBottom = '1.5px solid #d97706';
          mark.style.fontWeight = '500';
          mark.textContent = searchText;
          fragment.appendChild(mark);

          currentIndex = matchIndex + searchText.length;
          matchIndex = fullText.indexOf(searchText, currentIndex);
        }

        if (currentIndex < fullText.length) {
          fragment.appendChild(doc.createTextNode(fullText.substring(currentIndex)));
        }

        textNode.parentNode.replaceChild(fragment, textNode);
      });
    });

    return doc.body.innerHTML;
  } catch (err) {
    console.error('Safe highlight failed, fallback to raw html', err);
    return html;
  }
}

export interface ExportConfig {
  product: any;
  contentHtml: string;
  highlights: any[];
  notes: any[];
  aiPairs: any[];
  includeCover: boolean;
  includeMainDoc: boolean;
  includeHighlights: boolean;
  highlightPlacement: 'inline' | 'collection' | 'both';
  includeNotes: boolean;
  includeNoteDates: boolean;
  includeNotePages: boolean;
  includeNoteQuotes: boolean;
  includeAiInsights: boolean;
  selectedAiMessageIds: string[];
  includeMetadata: boolean;
  paperSize: 'A4' | 'Letter';
  paperOrientation: 'portrait' | 'landscape';
  exportFilename: string;
}

/**
 * Generates and downloads a 100% Vector PDF (real selectable text, copyable, searchable).
 */
export async function exportVectorPdf(config: ExportConfig): Promise<void> {
  const {
    product,
    contentHtml,
    highlights,
    notes,
    aiPairs,
    includeCover,
    includeMainDoc,
    includeHighlights,
    highlightPlacement,
    includeNotes,
    includeNoteDates,
    includeNotePages,
    includeAiInsights,
    selectedAiMessageIds,
    includeMetadata,
    paperSize,
    paperOrientation,
    exportFilename,
  } = config;

  const content: any[] = [];

  // 1. INSTITUTIONAL COVER PAGE
  if (includeCover) {
    content.push(
      {
        columns: [
          {
            text: 'INPARTNER',
            fontSize: 18,
            bold: true,
            color: '#1976D2',
            letterSpacing: 1.5,
          },
          {
            text: 'INSTITUTIONAL RESEARCH PUBLICATION',
            fontSize: 8,
            bold: true,
            color: '#94A3B8',
            alignment: 'right',
            margin: [0, 5, 0, 0],
          },
        ],
        margin: [0, 0, 0, 20],
      },
      {
        canvas: [
          {
            type: 'line',
            x1: 0,
            y1: 0,
            x2: paperOrientation === 'landscape' ? 760 : 515,
            y2: 0,
            lineWidth: 1,
            lineColor: '#E2E8F0',
          },
        ],
        margin: [0, 0, 0, 30],
      },
      {
        text: (product?.category?.name || 'Riset Tematik & Analisis Sektoral').toUpperCase(),
        fontSize: 9,
        bold: true,
        color: '#0C3B69',
        background: '#D1E4F6',
        margin: [0, 0, 0, 10],
      },
      {
        text: product?.title || 'Laporan Riset Institusional',
        fontSize: 22,
        bold: true,
        color: '#0F172A',
        lineHeight: 1.25,
        margin: [0, 0, 0, 10],
      }
    );

    if (product?.subtitle) {
      content.push({
        text: product.subtitle,
        fontSize: 11,
        color: '#475569',
        lineHeight: 1.35,
        margin: [0, 0, 0, 25],
      });
    }

    // Metadata Box
    const exportDateStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    content.push(
      {
        table: {
          widths: ['50%', '50%'],
          body: [
            [
              {
                stack: [
                  { text: 'PENULIS / ANALIS', fontSize: 8, bold: true, color: '#94A3B8', margin: [0, 0, 0, 2] },
                  { text: product?.author?.name || 'Inpartner Research Board', fontSize: 10, bold: true, color: '#1E293B' },
                ],
                fillColor: '#F8FAFC',
                border: [true, true, true, false],
                borderColor: ['#E2E8F0', '#E2E8F0', '#E2E8F0', '#E2E8F0'],
                margin: [5, 5, 5, 5],
              },
              {
                stack: [
                  { text: 'PENERBIT RESMI', fontSize: 8, bold: true, color: '#94A3B8', margin: [0, 0, 0, 2] },
                  { text: product?.publisher || 'Inpartner Intelligence', fontSize: 10, bold: true, color: '#1E293B' },
                ],
                fillColor: '#F8FAFC',
                border: [true, true, true, false],
                borderColor: ['#E2E8F0', '#E2E8F0', '#E2E8F0', '#E2E8F0'],
                margin: [5, 5, 5, 5],
              },
            ],
            [
              {
                stack: [
                  { text: 'TANGGAL EKSPOR', fontSize: 8, bold: true, color: '#94A3B8', margin: [0, 0, 0, 2] },
                  { text: exportDateStr, fontSize: 10, color: '#334155' },
                ],
                fillColor: '#F8FAFC',
                border: [true, false, true, true],
                borderColor: ['#E2E8F0', '#E2E8F0', '#E2E8F0', '#E2E8F0'],
                margin: [5, 5, 5, 5],
              },
              {
                stack: [
                  { text: 'VERIFIKASI PLATFORM', fontSize: 8, bold: true, color: '#94A3B8', margin: [0, 0, 0, 2] },
                  { text: 'Inpartner Reading Workspace (Authentic)', fontSize: 10, bold: true, color: '#1976D2' },
                ],
                fillColor: '#F8FAFC',
                border: [true, false, true, true],
                borderColor: ['#E2E8F0', '#E2E8F0', '#E2E8F0', '#E2E8F0'],
                margin: [5, 5, 5, 5],
              },
            ],
          ],
        },
        margin: [0, 20, 0, 40],
      },
      {
        text: 'Dokumen ini disusun untuk pembaca terverifikasi Inpartner. Seluruh data, sorotan riset, dan analisis bersumber dari data autentik platform.',
        fontSize: 8,
        color: '#94A3B8',
        italics: true,
        margin: [0, 20, 0, 0],
      },
      { text: '', pageBreak: 'after' }
    );
  }

  // 2. MAIN DOCUMENT BODY
  if (includeMainDoc && contentHtml) {
    const processedHtml =
      includeHighlights && highlightPlacement !== 'collection'
        ? applyHighlightsSafely(contentHtml, highlights, true)
        : contentHtml;

    // Clean HTML for pdfmake: replace external images with clean caption text to avoid CORS fail
    const parser = new DOMParser();
    const doc = parser.parseFromString(processedHtml, 'text/html');

    doc.querySelectorAll('img').forEach((img) => {
      const alt = img.getAttribute('alt') || img.getAttribute('title') || 'Ilustrasi / Bagan Riset';
      const p = doc.createElement('p');
      p.style.fontStyle = 'italic';
      p.style.color = '#64748B';
      p.style.fontSize = '9pt';
      p.style.textAlign = 'center';
      p.style.margin = '10px 0';
      p.textContent = `[Gambar: ${alt}]`;
      img.parentNode?.replaceChild(p, img);
    });

    // Remove any leftover script/style/svg elements
    doc.querySelectorAll('script, style, svg').forEach((el) => el.remove());

    try {
      const convertedContent = htmlToPdfmake(doc.body.innerHTML, {
        window,
        defaultStyles: {
          p: { fontSize: 10, lineHeight: 1.4, margin: [0, 0, 0, 8], color: '#1E293B' },
          h1: { fontSize: 16, bold: true, margin: [0, 14, 0, 6], color: '#0F172A' },
          h2: { fontSize: 14, bold: true, margin: [0, 12, 0, 5], color: '#0F172A' },
          h3: { fontSize: 12, bold: true, margin: [0, 10, 0, 4], color: '#1E293B' },
          mark: { background: '#FEF08A', color: '#1E293B' },
          blockquote: { italics: true, color: '#475569', margin: [10, 5, 0, 8] },
          ul: { margin: [0, 0, 0, 8] },
          li: { fontSize: 10, lineHeight: 1.35, color: '#1E293B' },
        },
      });

      content.push(
        {
          columns: [
            { text: product?.title || 'Dokumen Riset', fontSize: 9, bold: true, color: '#94A3B8' },
            { text: 'BAGIAN DOKUMEN UTAMA', fontSize: 8, bold: true, color: '#94A3B8', alignment: 'right' },
          ],
          margin: [0, 0, 0, 10],
        },
        {
          canvas: [
            {
              type: 'line',
              x1: 0,
              y1: 0,
              x2: paperOrientation === 'landscape' ? 760 : 515,
              y2: 0,
              lineWidth: 0.5,
              lineColor: '#CBD5E1',
            },
          ],
          margin: [0, 0, 0, 15],
        },
        convertedContent
      );
    } catch (err) {
      console.warn('htmlToPdfmake parse note:', err);
      content.push({
        text: doc.body.textContent || '',
        fontSize: 10,
        lineHeight: 1.4,
        color: '#1E293B',
      });
    }
  }

  // 3. RESEARCH HIGHLIGHTS COLLECTION
  if (
    includeHighlights &&
    (highlightPlacement === 'collection' || highlightPlacement === 'both') &&
    highlights.length > 0
  ) {
    content.push(
      { text: '', pageBreak: 'before' },
      {
        text: 'KUMPULAN SOROTAN RISET (RESEARCH HIGHLIGHTS)',
        fontSize: 12,
        bold: true,
        color: '#1976D2',
        margin: [0, 0, 0, 10],
      },
      {
        canvas: [
          {
            type: 'line',
            x1: 0,
            y1: 0,
            x2: paperOrientation === 'landscape' ? 760 : 515,
            y2: 0,
            lineWidth: 1,
            lineColor: '#1976D2',
          },
        ],
        margin: [0, 0, 0, 15],
      }
    );

    highlights.forEach((h, idx) => {
      content.push({
        table: {
          widths: ['100%'],
          body: [
            [
              {
                stack: [
                  {
                    columns: [
                      { text: `Sorotan #${idx + 1} — Halaman ${h.page || 1}`, fontSize: 9, bold: true, color: '#0C3B69' },
                      {
                        text: h.created_at ? new Date(h.created_at).toLocaleDateString('id-ID') : '',
                        fontSize: 8,
                        color: '#94A3B8',
                        alignment: 'right',
                      },
                    ],
                    margin: [0, 0, 0, 4],
                  },
                  {
                    text: `"${h.text}"`,
                    fontSize: 9.5,
                    italics: true,
                    color: '#1E293B',
                    lineHeight: 1.35,
                  },
                ],
                fillColor: '#FEF9C3',
                border: [true, true, true, true],
                borderColor: ['#FACC15', '#FACC15', '#FACC15', '#FACC15'],
                margin: [8, 6, 8, 6],
              },
            ],
          ],
        },
        margin: [0, 0, 0, 10],
      });
    });
  }

  // 4. PERSONAL RESEARCH NOTES
  if (includeNotes && notes.length > 0) {
    content.push(
      { text: '', pageBreak: 'before' },
      {
        text: 'CATATAN & ANALISIS PRIBADI (RESEARCH NOTES)',
        fontSize: 12,
        bold: true,
        color: '#1976D2',
        margin: [0, 0, 0, 10],
      },
      {
        canvas: [
          {
            type: 'line',
            x1: 0,
            y1: 0,
            x2: paperOrientation === 'landscape' ? 760 : 515,
            y2: 0,
            lineWidth: 1,
            lineColor: '#1976D2',
          },
        ],
        margin: [0, 0, 0, 15],
      }
    );

    notes.forEach((n) => {
      content.push({
        table: {
          widths: ['100%'],
          body: [
            [
              {
                stack: [
                  {
                    columns: [
                      {
                        text: includeNotePages ? `Halaman ${n.page || 1}` : 'Catatan Analisis',
                        fontSize: 9,
                        bold: true,
                        color: '#1976D2',
                      },
                      {
                        text: includeNoteDates && n.created_at ? new Date(n.created_at).toLocaleDateString('id-ID') : '',
                        fontSize: 8,
                        color: '#94A3B8',
                        alignment: 'right',
                      },
                    ],
                    margin: [0, 0, 0, 4],
                  },
                  { text: n.title || 'Catatan Riset', fontSize: 10, bold: true, color: '#0F172A', margin: [0, 0, 0, 4] },
                  { text: n.content || '', fontSize: 9.5, color: '#334155', lineHeight: 1.35 },
                ],
                fillColor: '#F8FAFC',
                border: [true, true, true, true],
                borderColor: ['#E2E8F0', '#E2E8F0', '#E2E8F0', '#E2E8F0'],
                margin: [8, 6, 8, 6],
              },
            ],
          ],
        },
        margin: [0, 0, 0, 10],
      });
    });
  }

  // 5. AI RESEARCH INSIGHTS
  const selectedPairs = aiPairs.filter((p) => selectedAiMessageIds.includes(p.id));
  if (includeAiInsights && selectedPairs.length > 0) {
    content.push(
      { text: '', pageBreak: 'before' },
      {
        text: 'ANALISIS ASISTEN AI RISET (INPARTNER INTELLIGENCE)',
        fontSize: 12,
        bold: true,
        color: '#1976D2',
        margin: [0, 0, 0, 10],
      },
      {
        canvas: [
          {
            type: 'line',
            x1: 0,
            y1: 0,
            x2: paperOrientation === 'landscape' ? 760 : 515,
            y2: 0,
            lineWidth: 1,
            lineColor: '#1976D2',
          },
        ],
        margin: [0, 0, 0, 15],
      }
    );

    selectedPairs.forEach((pair) => {
      content.push({
        table: {
          widths: ['100%'],
          body: [
            [
              {
                stack: [
                  { text: `Q: ${pair.question}`, fontSize: 10, bold: true, color: '#0C3B69', margin: [0, 0, 0, 6] },
                  { text: pair.answer, fontSize: 9.5, color: '#334155', lineHeight: 1.35 },
                ],
                fillColor: '#F0F9FF',
                border: [true, true, true, true],
                borderColor: ['#BAE6FD', '#BAE6FD', '#BAE6FD', '#BAE6FD'],
                margin: [8, 8, 8, 8],
              },
            ],
          ],
        },
        margin: [0, 0, 0, 12],
      });
    });
  }

  // 6. METADATA & SOURCES
  if (includeMetadata) {
    content.push(
      {
        text: 'INFORMASI BIBLIOGRAFI & SUMBER RISET',
        fontSize: 11,
        bold: true,
        color: '#334155',
        margin: [0, 20, 0, 8],
      },
      {
        table: {
          widths: ['35%', '65%'],
          body: [
            [{ text: 'Judul Publikasi', bold: true, fontSize: 8.5 }, { text: product?.title || '-', fontSize: 8.5 }],
            [{ text: 'Kategori', bold: true, fontSize: 8.5 }, { text: product?.category?.name || '-', fontSize: 8.5 }],
            [{ text: 'Penerbit Resmi', bold: true, fontSize: 8.5 }, { text: product?.publisher || 'Inpartner', fontSize: 8.5 }],
            [{ text: 'Penulis', bold: true, fontSize: 8.5 }, { text: product?.author?.name || 'Inpartner Research Board', fontSize: 8.5 }],
          ],
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 15],
      }
    );
  }

  // PDF Document Definition
  const docDefinition: any = {
    pageSize: paperSize,
    pageOrientation: paperOrientation,
    pageMargins: [40, 45, 40, 45],
    header: (currentPage: number) => {
      if (currentPage === 1 && includeCover) return null;
      return {
        columns: [
          { text: 'INPARTNER RESEARCH', fontSize: 7.5, bold: true, color: '#94A3B8', letterSpacing: 1 },
          { text: 'INSTITUTIONAL INTELLIGENCE', fontSize: 7.5, bold: true, color: '#94A3B8', alignment: 'right' },
        ],
        margin: [40, 20, 40, 0],
      };
    },
    footer: (currentPage: number, pageCount: number) => {
      return {
        columns: [
          { text: 'Inpartner Reading Workspace • Dokumen Riset Terverifikasi', fontSize: 7.5, color: '#94A3B8' },
          { text: `Halaman ${currentPage} dari ${pageCount}`, fontSize: 7.5, bold: true, color: '#64748B', alignment: 'right' },
        ],
        margin: [40, 0, 40, 20],
      };
    },
    content,
    defaultStyle: {
      font: 'Roboto',
    },
  };

  // Trigger pure vector PDF download
  pdfMake.createPdf(docDefinition).download(`${exportFilename}.pdf`);
}
