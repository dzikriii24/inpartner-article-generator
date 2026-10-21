import React from 'react';
import { 
  LayoutDashboard, 
  Search, 
  FileSpreadsheet, 
  Building2, 
  History, 
  FileUp, 
  FileDown, 
  Settings as SettingsIcon,
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  systemStatus?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, systemStatus = 'CONNECTED' }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'search', label: 'Search Company', icon: Search },
    { id: 'import', label: 'Import Excel', icon: FileSpreadsheet },
    { id: 'companies', label: 'Companies DB', icon: Building2 },
    { id: 'search-history', label: 'Search History', icon: History },
    { id: 'import-history', label: 'Import History', icon: FileUp },
    { id: 'exports', label: 'Export History', icon: FileDown },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <aside className="w-64 glass-panel border-r border-slate-200/70 h-screen sticky top-0 flex flex-col justify-between p-4 z-30 select-none">
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-3 py-4 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-fuchsia-500 via-indigo-600 to-orange-400 flex items-center justify-center text-white shadow-lg shadow-fuchsia-500/25">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="font-bold text-slate-900 tracking-tight text-lg leading-tight">Inpartner</div>
            <div className="text-xs font-medium text-slate-500">Contact Intelligence</div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-fuchsia-500/10 to-indigo-500/10 text-fuchsia-700 font-semibold shadow-sm border border-fuchsia-500/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                }`}
              >
                <Icon className={`w-4 h-4 transition-transform ${isActive ? 'text-fuchsia-600 scale-110' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* System Status footer */}
      <div className="p-3 bg-white/60 border border-slate-200/60 rounded-xl backdrop-blur-sm">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-slate-500 font-medium">Backend Engine</span>
          <span className="flex items-center gap-1.5 font-semibold text-emerald-600">
            <span className={`w-2 h-2 rounded-full ${systemStatus === 'CONNECTED' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            {systemStatus === 'CONNECTED' ? 'Online' : 'Checking'}
          </span>
        </div>
        <div className="text-[11px] text-slate-400">
          Grounded AI & Web Scraper
        </div>
      </div>
    </aside>
  );
};
