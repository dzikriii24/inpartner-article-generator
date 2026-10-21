import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Database, 
  Sparkles, 
  Search, 
  Layers, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Server
} from 'lucide-react';
import { api } from '../services/api';

export const Settings: React.FC = () => {
  const [config, setConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const data = await api.getSettings();
      setConfig(data);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="glass-panel rounded-3xl p-6 border border-white/60 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">System Configuration & Health</h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time status of backend services, database connections, AI synthesis models, and enrichment pipelines.
          </p>
        </div>

        <button
          onClick={loadSettings}
          disabled={isLoading}
          className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 shadow-xs"
          title="Refresh Status"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-fuchsia-600' : ''}`} />
        </button>
      </div>

      {isLoading && !config ? (
        <div className="p-12 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-fuchsia-600" />
          <span>Verifying infrastructure connections...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Database Health Card */}
          <div className="glass-panel rounded-3xl p-6 border border-white/60 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">MySQL Database</h3>
                  <div className="text-[11px] text-slate-400">{config?.database?.engine || 'PyMySQL / SQLAlchemy'}</div>
                </div>
              </div>

              <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                config?.database?.status === 'CONNECTED'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                <span className={`w-2 h-2 rounded-full ${config?.database?.status === 'CONNECTED' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                {config?.database?.status}
              </span>
            </div>

            <div className="p-4 bg-white/70 rounded-2xl border border-slate-100 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Connection Latency:</span>
                <span className="font-semibold text-slate-800">{config?.database?.latency_ms ?? '-'} ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Pool Pre-Ping:</span>
                <span className="font-semibold text-slate-800">{config?.database?.pool_pre_ping ? 'Enabled' : 'Disabled'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Pool Recycle:</span>
                <span className="font-semibold text-slate-800">{config?.database?.pool_recycle_sec ?? 3600} seconds</span>
              </div>
            </div>
          </div>

          {/* AI Provider Status Card */}
          <div className="glass-panel rounded-3xl p-6 border border-white/60 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-fuchsia-50 border border-fuchsia-100 flex items-center justify-center text-fuchsia-600">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{config?.ai_provider?.provider || 'Google Gemini AI'}</h3>
                  <div className="text-[11px] text-slate-400">Grounded Entity Synthesis</div>
                </div>
              </div>

              <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                config?.ai_provider?.status === 'ACTIVE'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                <span className={`w-2 h-2 rounded-full ${config?.ai_provider?.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                {config?.ai_provider?.status}
              </span>
            </div>

            <div className="p-4 bg-white/70 rounded-2xl border border-slate-100 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Default Model:</span>
                <span className="font-mono font-bold text-slate-800">{config?.ai_provider?.default_model}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Fallback Model:</span>
                <span className="font-mono text-slate-700">{config?.ai_provider?.fallback_model}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">API Key Configured:</span>
                <span className="font-semibold text-emerald-600">{config?.ai_provider?.api_key_configured ? 'Yes (Securely Injected)' : 'No'}</span>
              </div>
            </div>
          </div>

          {/* Search Providers Multi-Tier */}
          <div className="glass-panel rounded-3xl p-6 border border-white/60 space-y-4 md:col-span-2">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-700" />
              <h3 className="font-bold text-slate-900 text-sm">Enrichment Multi-Tier Search Providers</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {config?.search_providers?.map((sp: any, i: number) => (
                <div key={i} className="p-3.5 bg-white/80 rounded-2xl border border-slate-200/80">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {sp.tier}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {sp.status}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-800">{sp.name}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Batch & Processing Settings */}
          <div className="glass-panel rounded-3xl p-6 border border-white/60 space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-700" />
              <h3 className="font-bold text-slate-900 text-sm">Batch Processing Limits</h3>
            </div>

            <div className="p-4 bg-white/70 rounded-2xl border border-slate-100 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Concurrency Limit:</span>
                <span className="font-semibold text-slate-800">{config?.batch_processing?.default_concurrency} threads</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Max Retries per Item:</span>
                <span className="font-semibold text-slate-800">{config?.batch_processing?.max_retries} attempts</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Politeness Delay:</span>
                <span className="font-semibold text-slate-800">{config?.batch_processing?.politeness_delay_seconds} seconds</span>
              </div>
            </div>
          </div>

          {/* Export Settings */}
          <div className="glass-panel rounded-3xl p-6 border border-white/60 space-y-4">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-sm">Export Settings</h3>
            </div>

            <div className="p-4 bg-white/70 rounded-2xl border border-slate-100 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Default Format:</span>
                <span className="font-semibold text-slate-800 uppercase font-mono">{config?.export_settings?.default_format}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Sheets Generated:</span>
                <span className="font-semibold text-slate-800">{config?.export_settings?.sheets_generated?.join(', ')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Formatting:</span>
                <span className="font-semibold text-slate-800">Auto-filter, Freeze Panes, Phone as Text</span>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
