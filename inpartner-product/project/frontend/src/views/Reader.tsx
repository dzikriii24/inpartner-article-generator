import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, RefreshCw } from 'lucide-react';
import api from '@/services/api';
import { Button } from '@/components/lightswind/button';

export const Reader: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReaderData = async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const res = await api.get(`/library/${slug}/read`);
      setProduct(res.data.product);
    } catch (err) {
      console.error(err);
      navigate('/library');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReaderData();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 text-zinc-300 flex items-center justify-center">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin text-white" />
          <p className="text-xs">Membuka Reader Mode...</p>
        </div>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans">
      {/* Reader Bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-zinc-200 px-4 py-3 flex items-center justify-between">
        <Link to="/library">
          <Button variant="ghost" size="sm" className="text-xs font-semibold gap-1 text-zinc-700">
            <ArrowLeft className="w-4 h-4" /> Kemballi ke Library
          </Button>
        </Link>
        <span className="text-xs font-bold text-zinc-800 truncate max-w-md">{product.title}</span>
        <span className="text-[11px] text-zinc-400 font-mono">READER MODE</span>
      </header>

      {/* Reader Container */}
      <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <div className="border-b border-zinc-200 pb-8 space-y-4 text-center">
          <span className="px-3 py-1 bg-zinc-100 text-zinc-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
            {product.type_label || 'Artikel'}
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight leading-tight">
            {product.title}
          </h1>
          {product.author && (
            <p className="text-xs text-zinc-500">
              Oleh <span className="font-semibold text-zinc-800">{product.author.name}</span>
            </p>
          )}
        </div>

        {/* Content */}
        <article
          className="prose prose-zinc max-w-none text-zinc-800 text-base leading-relaxed font-normal"
          dangerouslySetInnerHTML={{
            __html: product.full_content_html || product.preview_html || product.description || '<p>Tidak ada isi artikel tersedia.</p>'
          }}
        />
      </main>
    </div>
  );
};

export default Reader;
