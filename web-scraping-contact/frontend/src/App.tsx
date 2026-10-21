import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { UploadModal } from './components/UploadModal';
import { Dashboard } from './pages/Dashboard';
import { CompanySearch } from './pages/CompanySearch';
import { ExcelImport } from './pages/ExcelImport';
import { CompaniesDatabase } from './pages/CompaniesDatabase';
import { SearchHistory } from './pages/SearchHistory';
import { ImportHistory } from './pages/ImportHistory';
import { ExportHistory } from './pages/ExportHistory';
import { Settings } from './pages/Settings';
import { api } from './services/api';

export function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [systemStatus, setSystemStatus] = useState('CHECKING');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Navigation contextual states
  const [searchInitialQuery, setSearchInitialQuery] = useState('');
  const [activeBatchId, setActiveBatchId] = useState<number | undefined>(undefined);

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

  const handleNavigate = (tab: string, state?: any) => {
    if (tab === 'search' && state?.query) {
      setSearchInitialQuery(state.query);
    }
    if (tab === 'import' && state?.batchId) {
      setActiveBatchId(state.batchId);
    }
    setActiveTab(tab);
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return { title: 'Dashboard Overview', subtitle: 'Real-time metrics, recent company searches, and batch progress' };
      case 'search':
        return { title: 'Manual Company Search', subtitle: 'Targeted web scraping and AI contact discovery for individual enterprises' };
      case 'import':
        return { title: 'Excel Import Pipeline', subtitle: 'Batch upload, column mapping, background enrichment, and multi-sheet export' };
      case 'companies':
        return { title: 'Companies Directory', subtitle: 'Explore verified companies, search records, and edit discovered contacts' };
      case 'search-history':
        return { title: 'Search History', subtitle: 'Log of all previously run company queries and contact yields' };
      case 'import-history':
        return { title: 'Import History', subtitle: 'Uploaded spreadsheets, processing statuses, and downloadable exports' };
      case 'exports':
        return { title: 'Export History', subtitle: 'Direct download archive for generated Excel contact workbooks' };
      case 'settings':
        return { title: 'System Settings & Status', subtitle: 'Backend API connection, database latency, and AI synthesis health' };
      default:
        return { title: 'Inpartner Intelligence', subtitle: 'Company Contact Enrichment Platform' };
    }
  };

  const { title, subtitle } = getPageTitle();

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      {/* Left Navigation Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          if (tab !== 'search') setSearchInitialQuery('');
          setActiveTab(tab);
        }}
        systemStatus={systemStatus} 
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar 
          title={title} 
          subtitle={subtitle}
          onQuickSearchClick={() => setActiveTab('search')}
          onRefresh={checkHealth}
          isRefreshing={isRefreshing}
        />

        <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <Dashboard 
              onNavigate={handleNavigate}
              onOpenUpload={() => setIsUploadModalOpen(true)}
            />
          )}

          {activeTab === 'search' && (
            <CompanySearch initialQuery={searchInitialQuery} />
          )}

          {activeTab === 'import' && (
            <ExcelImport initialBatchId={activeBatchId} />
          )}

          {activeTab === 'companies' && (
            <CompaniesDatabase />
          )}

          {activeTab === 'search-history' && (
            <SearchHistory 
              onRerunSearch={(q) => handleNavigate('search', { query: q })} 
            />
          )}

          {activeTab === 'import-history' && (
            <ImportHistory 
              onOpenBatch={(id) => handleNavigate('import', { batchId: id })} 
            />
          )}

          {activeTab === 'exports' && (
            <ExportHistory />
          )}

          {activeTab === 'settings' && (
            <Settings />
          )}
        </main>
      </div>

      {/* Global Upload Modal triggered from dashboard or shortcuts */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onFileSelected={async (file) => {
          setIsUploadModalOpen(false);
          setActiveTab('import');
          // upload will be triggered inside ExcelImport or handled smoothly
        }}
      />
    </div>
  );
}

export default App;
