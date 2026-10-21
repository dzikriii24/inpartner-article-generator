import React from 'react';
import { Search, Database, Sparkles, RefreshCw } from 'lucide-react';

interface TopbarProps {
  title: string;
  subtitle?: string;
  onQuickSearchClick?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({ 
  title, 
  subtitle, 
  onQuickSearchClick,
  onRefresh,
  isRefreshing = false
}) => {
  return (
    <header className="h-16 border-b border-slate-200/60 glass-panel px-6 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {onQuickSearchClick && (
          <button
            onClick={onQuickSearchClick}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-500 bg-white/70 border border-slate-200 hover:border-fuchsia-300 hover:text-slate-900 transition-all shadow-xs"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span>Quick search...</span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 rounded-md text-slate-500">⌘K</kbd>
          </button>
        )}

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 bg-white/70 border border-slate-200 hover:bg-white transition-all shadow-xs disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-fuchsia-600' : ''}`} />
          </button>
        )}

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/80 border border-slate-200 text-xs text-slate-700 shadow-xs">
          <Database className="w-3.5 h-3.5 text-indigo-500" />
          <span className="font-semibold text-slate-800">MySQL 8.0</span>
          <span className="text-slate-300">|</span>
          <Sparkles className="w-3.5 h-3.5 text-fuchsia-500" />
          <span className="font-medium text-slate-600">Gemini 3.5</span>
        </div>
      </div>
    </header>
  );
};
