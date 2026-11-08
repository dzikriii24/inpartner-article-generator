import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { UploadModal } from './components/UploadModal';
import { Dashboard } from './pages/Dashboard';
import { CompanySearch } from './pages/CompanySearch';
import { ExcelImport } from './pages/ExcelImport';
import { CompaniesDatabase } from './pages/CompaniesDatabase';
import { CompanyDetailRoute } from './pages/CompanyDetail';
import { HRDecisionMakers } from './pages/HRDecisionMakers';
import { SearchHistory } from './pages/SearchHistory';
import { ImportHistory } from './pages/ImportHistory';
import { ExportHistory } from './pages/ExportHistory';
import { Settings } from './pages/Settings';
import { api } from './services/api';

export function App() {
  const [systemStatus, setSystemStatus] = useState('CHECKING');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      setIsRefreshing(true);
      const res = await api.getSettings();
      if (res.database?.status === 'CONNECTED') {
        setSystemStatus('CONNECTED');
      } else {
        setSystemStatus('DISCONNECTED');
      }
    } catch {
      setSystemStatus('DISCONNECTED');
    } finally {
      setIsRefreshing(false);
    }
  };

  const getPageInfo = () => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') {
      return { title: 'Dashboard Overview', subtitle: 'Real-time metrics, recent company searches, and batch progress' };
    }
    if (path === '/search') {
      return { title: 'Company Contact Search', subtitle: 'Targeted web scraping and AI contact discovery for individual enterprises' };
    }
    if (path === '/import') {
      return { title: 'Excel Import Pipeline', subtitle: 'Batch upload, column mapping, background enrichment, and multi-sheet export' };
    }
    if (path.startsWith('/companies/')) {
      return { title: 'Company Intelligence Profile', subtitle: 'Deep dive into corporate leadership, decision makers, and verified channels' };
    }
    if (path === '/companies') {
      return { title: 'Companies Directory', subtitle: 'Explore verified companies, search records, and edit discovered contacts' };
    }
    if (path === '/decision-makers') {
      return { title: 'HR & Decision Makers', subtitle: 'Explore verified Human Resources leaders and executive decision makers with outreach workflow' };
    }
    if (path === '/search-history') {
      return { title: 'Search History', subtitle: 'Log of all previously run company queries and contact yields' };
    }
    if (path === '/import-history') {
      return { title: 'Import History', subtitle: 'Uploaded spreadsheets, processing statuses, and downloadable exports' };
    }
    if (path === '/exports') {
      return { title: 'Export History', subtitle: 'Direct download archive for generated Excel contact workbooks' };
    }
    if (path === '/settings') {
      return { title: 'System Settings & Status', subtitle: 'Backend API connection, database latency, and AI synthesis health' };
    }
    return { title: 'Inpartner Intelligence', subtitle: 'Company Contact Enrichment Platform' };
  };

  const { title, subtitle } = getPageInfo();

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      {/* Left Navigation Sidebar */}
      <Sidebar systemStatus={systemStatus} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar 
          title={title} 
          subtitle={subtitle}
          onQuickSearchClick={() => navigate('/search')}
          onRefresh={checkHealth}
          isRefreshing={isRefreshing}
        />

        <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route 
              path="/dashboard" 
              element={
                <Dashboard 
                  onNavigate={(tab, state) => {
                    if (tab === 'search') navigate(state?.query ? `/search?q=${encodeURIComponent(state.query)}` : '/search');
                    else if (tab === 'import') navigate('/import');
                    else if (tab === 'companies') navigate('/companies');
                    else if (tab === 'decision-makers') navigate('/decision-makers');
                    else navigate(`/${tab}`);
                  }}
                  onOpenUpload={() => setIsUploadModalOpen(true)}
                />
              } 
            />
            <Route path="/search" element={<CompanySearch />} />
            <Route path="/companies" element={<CompaniesDatabase />} />
            <Route path="/companies/:id" element={<CompanyDetailRoute />} />
            <Route path="/decision-makers" element={<HRDecisionMakers />} />
            <Route path="/import" element={<ExcelImport />} />
            <Route 
              path="/search-history" 
              element={
                <SearchHistory 
                  onRerunSearch={(q) => navigate(`/search?q=${encodeURIComponent(q)}`)} 
                />
              } 
            />
            <Route 
              path="/import-history" 
              element={
                <ImportHistory 
                  onOpenBatch={(id) => navigate('/import')} 
                />
              } 
            />
            <Route path="/exports" element={<ExportHistory />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>

      {/* Global Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onFileSelected={async () => {
          setIsUploadModalOpen(false);
          navigate('/import');
        }}
      />
    </div>
  );
}

export default App;
