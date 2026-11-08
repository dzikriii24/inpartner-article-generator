import React from 'react';
import { Search, Database, RefreshCw } from 'lucide-react';

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
    <header className="h-16 border-b border-[#E2E8F0] bg-white px-6 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h1 className="text-base font-semibold text-[#172033] tracking-tight leading-none">{title}</h1>
        {subtitle && <p className="text-xs text-[#64748B] mt-1">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {onQuickSearchClick && (
          <button
            onClick={onQuickSearchClick}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-[#64748B] bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] hover:text-[#172033] transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-[#64748B]" />
            <span>Search company...</span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-medium bg-[#F1F5F9] rounded text-[#64748B]">⌘K</kbd>
          </button>
        )}

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#172033] bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#3B82F6]' : ''}`} />
          </button>
        )}

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#172033]">
          <Database className="w-3.5 h-3.5 text-[#3B82F6]" />
          <span className="font-medium text-[#172033]">MySQL 8.0</span>
          <span className="text-[#CBD5E1]">|</span>
          <span className="font-medium text-[#64748B]">Gemini AI</span>
        </div>
      </div>
    </header>
  );
};
