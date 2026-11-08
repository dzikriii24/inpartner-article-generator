import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Search, 
  FileSpreadsheet, 
  Building2, 
  Users,
  History, 
  FileUp, 
  FileDown, 
  Settings as SettingsIcon
} from 'lucide-react';

interface SidebarProps {
  systemStatus?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ systemStatus = 'CONNECTED' }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/search', label: 'Search Company', icon: Search },
    { path: '/import', label: 'Import Excel', icon: FileSpreadsheet },
    { path: '/companies', label: 'Companies Directory', icon: Building2 },
    { path: '/decision-makers', label: 'HR & Decision Makers', icon: Users },
    { path: '/search-history', label: 'Search History', icon: History },
    { path: '/import-history', label: 'Import History', icon: FileUp },
    { path: '/exports', label: 'Export History', icon: FileDown },
    { path: '/settings', label: 'Settings & Health', icon: SettingsIcon },
  ];

  const currentPath = location.pathname === '/' ? '/dashboard' : location.pathname;

  return (
    <aside className="w-64 bg-white border-r border-[#E2E8F0] h-screen sticky top-0 flex flex-col justify-between p-4 z-30 select-none">
      <div>
        {/* Brand Header */}
        <div 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-3 px-3 py-3 mb-6 cursor-pointer hover:opacity-90 transition-opacity border-b border-[#E2E8F0] pb-4"
        >
          <div className="w-8 h-8 rounded-lg bg-[#3B82F6] flex items-center justify-center text-white font-bold text-sm">
            IN
          </div>
          <div>
            <div className="font-semibold text-[#172033] tracking-tight text-base leading-tight">Inpartner</div>
            <div className="text-xs text-[#64748B]">Contact Scraper</div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path || (item.path === '/companies' && currentPath.startsWith('/companies/'));
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                  isActive
                    ? 'bg-[#EFF6FF] text-[#3B82F6] font-semibold border border-[#BFDBFE]'
                    : 'text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFC]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#3B82F6]' : 'text-[#64748B]'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* System Status footer */}
      <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-[#64748B] font-medium">Backend Status</span>
          <span className={`inline-flex items-center gap-1.5 font-semibold ${
            systemStatus === 'CONNECTED' ? 'text-emerald-700' : 'text-amber-700'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              systemStatus === 'CONNECTED' ? 'bg-emerald-500' : 'bg-amber-500'
            }`}></span>
            {systemStatus}
          </span>
        </div>
        <div className="text-[11px] text-[#64748B]">Python 3.11 / LiteSpeed</div>
      </div>
    </aside>
  );
};
