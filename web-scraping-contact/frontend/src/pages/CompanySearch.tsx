import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Sparkles, 
  Globe, 
  MapPin, 
  Mail, 
  Phone, 
  MessageSquare, 
  ExternalLink, 
  Copy, 
  Check, 
  Plus, 
  RefreshCw, 
  Download, 
  ShieldCheck,
  AlertCircle,
  FileText,
  Info,
  X,
  CheckCircle2,
  AlertTriangle,
  Users,
  Briefcase,
  Ban
} from 'lucide-react';
import { api, type ContactItem, type ProfessionalItem } from '../services/api';

interface StageItem {
  stage: string;
  status: string;
  message?: string;
  duration_ms: number;
}

const LinkedinIcon = () => (
  <svg className="w-4 h-4 text-sky-600 fill-current" viewBox="0 0 24 24">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
  </svg>
);

const InstagramIcon = () => (
  <svg className="w-4 h-4 text-pink-600 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
);

const FacebookIcon = () => (
  <svg className="w-4 h-4 text-blue-600 fill-current" viewBox="0 0 24 24">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);

const YoutubeIcon = () => (
  <svg className="w-4 h-4 text-red-600 fill-current" viewBox="0 0 24 24">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33zM9.75 15.02V8.48l5.75 3.27-5.75 3.27z"/>
  </svg>
);

interface CompanySearchProps {
  initialQuery?: string;
}

export const CompanySearch: React.FC<CompanySearchProps> = ({ initialQuery = '' }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState(initialQuery);
  const [isMultiSearch, setIsMultiSearch] = useState(false);
  const [multiQuery, setMultiQuery] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [batchResults, setBatchResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Autocomplete
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Copy feedback
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  // Evidence Drawer state
  const [selectedEvidenceContact, setSelectedEvidenceContact] = useState<ContactItem | null>(null);

  // Add Contact modal
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState<Partial<ContactItem>>({
    contact_type: 'general_email',
    email: '',
    phone: '',
    contact_person_name: '',
    job_title: '',
    notes: ''
  });

  const [isDiscoveringProfs, setIsDiscoveringProfs] = useState(false);
  const [activeJob, setActiveJob] = useState<any>(null);
  const pollTimerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      handleSearch(initialQuery);
    }
  }, [initialQuery]);

  // Handle autocomplete debounce
  useEffect(() => {
    if (!query || query.length < 2 || isMultiSearch) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.getAutocomplete(query);
        setSuggestions(res.suggestions || []);
      } catch {}
    }, 250);
    return () => clearTimeout(timer);
  }, [query, isMultiSearch]);

  const handleSearch = async (targetQuery?: string) => {
    const q = (targetQuery || query).trim();
    if (!q) return;

    setIsLoading(true);
    setError(null);
    setSearchResult(null);
    setBatchResults([]);
    setShowSuggestions(false);

    setLoadingStep('Discovering official domain & crawling homepage...');
    const stepTimer1 = setTimeout(() => setLoadingStep('Analyzing footer, schema.org JSON-LD & contact subpages...'), 1800);
    const stepTimer2 = setTimeout(() => setLoadingStep('Passing Grounded Quality Gate & entity reconciliation...'), 3500);

    try {
      if (isMultiSearch) {
        const list = multiQuery.split('\n').map(x => x.trim()).filter(Boolean);
        if (list.length === 0) throw new Error('Please enter at least one company name');
        const res = await api.batchSearch(list);
        setBatchResults(res.results || []);
        if (res.results && res.results.length === 1) {
          setSearchResult(res.results[0]);
        }
      } else {
        const res = await api.searchCompany(q);
        setSearchResult(res);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to search company contacts');
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedValue(text);
    setTimeout(() => setCopiedValue(null), 2000);
  };

  const handleExportSingle = async () => {
    if (!searchResult?.company_id) return;
    try {
      const exp = await api.createExport({ company_ids: [searchResult.company_id] });
      window.open(api.getDownloadUrl(exp.export_id || exp.id), '_blank');
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    }
  };

  const handleSaveContact = async () => {
    if (!searchResult?.company_id) return;
    try {
      await api.addContact(searchResult.company_id, newContact);
      setShowAddContact(false);
      // Refresh details
      const updated = await api.getCompany(searchResult.company_id);
      setSearchResult((prev: any) => ({ ...prev, contacts: updated.contacts }));
    } catch (err: any) {
      alert(`Failed to add contact: ${err.message}`);
    }
  };

  const startPollingJob = (jobId: number, companyId: number) => {
    setIsDiscoveringProfs(true);
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    pollTimerRef.current = setInterval(async () => {
      try {
        const jobStatus = await api.getDiscoveryJobStatus(jobId);
        setActiveJob(jobStatus);

        if (jobStatus.status === 'COMPLETED' || jobStatus.status === 'FAILED') {
          clearInterval(pollTimerRef.current);
          setIsDiscoveringProfs(false);
          const updated = await api.getCompany(companyId);
          setSearchResult((prev: any) => ({ ...prev, professionals: updated.professionals }));
        }
      } catch (err) {
        console.error('Error polling discovery job:', err);
        clearInterval(pollTimerRef.current);
        setIsDiscoveringProfs(false);
      }
    }, 1500);
  };

  const handleDiscoverProfs = async () => {
    if (!searchResult?.company_id) return;
    try {
      setIsDiscoveringProfs(true);
      const res = await api.discoverCompanyProfessionals(searchResult.company_id);
      if (res.job_id) {
        startPollingJob(res.job_id, searchResult.company_id);
      } else {
        const updated = await api.getCompany(searchResult.company_id);
        setSearchResult((prev: any) => ({ ...prev, professionals: updated.professionals }));
        setIsDiscoveringProfs(false);
      }
    } catch (err: any) {
      alert(`Decision maker discovery failed: ${err.message}`);
      setIsDiscoveringProfs(false);
    }
  };

  const handleUpdateProfStatus = async (profId: number, status: string) => {
    try {
      await api.updateProfessional(profId, { outreach_status: status });
      setSearchResult((prev: any) => ({
        ...prev,
        professionals: prev.professionals?.map((p: any) => p.id === profId ? { ...p, outreach_status: status } : p)
      }));
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const getContactIcon = (type: string) => {
    if (type.includes('email')) return <Mail className="w-4 h-4 text-blue-500" />;
    if (type === 'whatsapp') return <MessageSquare className="w-4 h-4 text-emerald-500" />;
    if (type.includes('phone')) return <Phone className="w-4 h-4 text-amber-500" />;
    if (type === 'linkedin') return <LinkedinIcon />;
    if (type === 'instagram') return <InstagramIcon />;
    if (type === 'facebook') return <FacebookIcon />;
    if (type === 'youtube') return <YoutubeIcon />;
    return <Globe className="w-4 h-4 text-slate-500" />;
  };

  const renderStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
      case 'VERIFIED_OFFICIAL_WEBSITE':
      case 'OFFICIAL_PUBLISHED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Verified on Official Website</span>
          </span>
        );
      case 'FOUND_ON_PUBLIC_SOURCE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Found on Public Source</span>
          </span>
        );
      case 'NEEDS_REVIEW':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Needs Review</span>
          </span>
        );
      case 'WEBSITE_UNREACHABLE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Website Unreachable</span>
          </span>
        );
      case 'NOT_FOUND':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <Info className="w-3.5 h-3.5 text-slate-500" />
            <span>Not Found</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <span>{status || 'Grounded Extraction'}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      
      {/* Search Header Panel */}
      <div className="glass-panel rounded-3xl p-6 border border-white/60">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Company Contact Intelligence & Grounded Extraction</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live crawler directly visits official company website footers, Contact Us pages, and schema.org JSON-LD.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setIsMultiSearch(false)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                !isMultiSearch ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Single Search
            </button>
            <button
              onClick={() => setIsMultiSearch(true)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                isMultiSearch ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Batch (Up to 10)
            </button>
          </div>
        </div>

        {/* Search Input Box */}
        {!isMultiSearch ? (
          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="e.g. PT Gudang Garam Tbk, Bundamedik Tbk, Triniti Dinamik Tbk..."
                  className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 shadow-xs font-medium text-slate-800 placeholder-slate-400"
                />
              </div>

              <button
                onClick={() => handleSearch()}
                disabled={isLoading || !query.trim()}
                className="px-6 py-3.5 rounded-2xl text-sm font-semibold text-white btn-primary-gradient shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Scraping...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Search</span>
                  </>
                )}
              </button>
            </div>

            {/* Autocomplete dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-28 mt-2 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-xl z-30 overflow-hidden divide-y divide-slate-100">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setQuery(s.name || s.input_name);
                      setShowSuggestions(false);
                      handleSearch(s.name || s.input_name);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between text-xs transition-colors"
                  >
                    <span className="font-semibold text-slate-800">{s.name}</span>
                    {s.domain && <span className="text-slate-400 font-mono">{s.domain}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              rows={4}
              value={multiQuery}
              onChange={(e) => setMultiQuery(e.target.value)}
              placeholder="Enter one company name per line (max 10):&#10;PT Gudang Garam Tbk&#10;Bundamedik Tbk&#10;Triniti Dinamik Tbk&#10;PT Telkom Indonesia"
              className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 shadow-xs font-medium text-slate-800 placeholder-slate-400"
            />
            <div className="flex justify-end">
              <button
                onClick={() => handleSearch()}
                disabled={isLoading || !multiQuery.trim()}
                className="px-6 py-3 rounded-2xl text-sm font-semibold text-white btn-primary-gradient shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing Batch...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Enrich Batch</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Suggestions */}
        <div className="flex items-center gap-2 mt-4 text-xs text-slate-500 flex-wrap">
          <span className="font-medium text-slate-400">Quick Test Samples:</span>
          {['PT Gudang Garam Tbk', 'Bundamedik Tbk.', 'Triniti Dinamik Tbk.', 'PT Telkom Indonesia (Persero) Tbk'].map((name, i) => (
            <button
              key={i}
              onClick={() => {
                setQuery(name);
                handleSearch(name);
              }}
              className="px-2.5 py-1 bg-white/70 hover:bg-white border border-slate-200/80 rounded-lg text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-colors cursor-pointer"
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Loading Progress State */}
      {isLoading && (
        <div className="glass-panel rounded-3xl p-8 border border-blue-200/60 text-center animate-in fade-in">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-blue-500/20 animate-bounce">
            <Sparkles className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mt-4">Scraping Official Website & Verifying Contacts...</h3>
          <p className="text-xs text-blue-600 font-medium mt-1 animate-pulse">
            {loadingStep || 'Visiting official website and inspecting footers...'}
          </p>
          <div className="w-64 bg-slate-200 rounded-full h-1.5 mx-auto mt-4 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 h-1.5 rounded-full animate-pulse w-3/4" />
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-sm text-rose-700 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Single Search Result Card */}
      {searchResult && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
          
          {/* Company Identity Header Card */}
          <div className="glass-panel rounded-3xl p-6 border border-white/60 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-extrabold text-slate-900">
                    {searchResult.official_name || searchResult.input_name}
                  </h3>
                  {renderStatusBadge(searchResult.search_status || searchResult.status)}
                </div>

                {searchResult.input_name !== searchResult.official_name && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Searched as: <span className="font-medium text-slate-600">{searchResult.input_name}</span>
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-600">
                  {searchResult.website ? (
                    <a
                      href={searchResult.website}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 font-semibold text-blue-600 hover:underline"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>{searchResult.domain || searchResult.website}</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                  ) : (
                    <span className="text-rose-500 font-semibold inline-flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>No Official Website Verified</span>
                    </span>
                  )}

                  {searchResult.industry && (
                    <span className="px-2.5 py-0.5 rounded-md bg-slate-100 font-medium text-slate-700">
                      {searchResult.industry}
                    </span>
                  )}

                  {searchResult.city && (
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{searchResult.city}{searchResult.province ? `, ${searchResult.province}` : ''}</span>
                    </span>
                  )}
                </div>

                {searchResult.description && (
                  <p className="text-xs text-slate-600 mt-3 max-w-3xl leading-relaxed">
                    {searchResult.description}
                  </p>
                )}

                {searchResult.address && (
                  <p className="text-[11px] text-slate-500 mt-2">
                    <span className="font-semibold text-slate-600">Headquarters:</span> {searchResult.address}
                  </p>
                )}

                {/* Audit Crawl Metrics Summary */}
                {searchResult.audit_metadata && (
                  <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400">
                    <span className="bg-slate-100 px-2 py-0.5 rounded">
                      Crawled: {searchResult.audit_metadata.pages_crawled_count || 1} pages
                    </span>
                    {searchResult.audit_metadata.browser_crawler_used && (
                      <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
                        Browser Headless Chrome
                      </span>
                    )}
                    <span className="text-slate-400">
                      Duration: {searchResult.audit_metadata.duration_seconds || 0}s
                    </span>
                  </div>
                )}
              </div>

              {/* Confidence Gauge & Action Buttons */}
              <div className="flex flex-col items-end gap-3 shrink-0">
                <div className="text-right">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Confidence</div>
                  <div className="text-2xl font-black text-slate-800">
                    {Math.round((searchResult.matching_confidence || 0.8) * 100)}%
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {searchResult.company_id && (
                    <button
                      onClick={() => navigate(`/companies/${searchResult.company_id}`)}
                      className="p-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      title="Open Dedicated Full Profile Page"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Open Full Profile</span>
                    </button>
                  )}

                  <button
                    onClick={() => setShowAddContact(true)}
                    className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    title="Add Contact Manually"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Add Contact</span>
                  </button>

                  <button
                    onClick={handleExportSingle}
                    className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    title="Export 3-Sheet Excel"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Export Excel</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Discovery Pipeline Stage Tracker Banner (Active / Completed) */}
          {activeJob && (
            <div className={`p-4 rounded-2xl border transition-all ${
              activeJob.status === 'RUNNING' || activeJob.status === 'QUEUED'
                ? 'bg-blue-50/90 border-blue-200 text-blue-900 shadow-sm'
                : activeJob.status === 'COMPLETED'
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : 'bg-rose-50/70 border-rose-200 text-rose-900'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className={`w-4 h-4 ${activeJob.status === 'RUNNING' ? 'text-blue-600 animate-spin' : 'text-emerald-600'}`} />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Discovery Engine Progress ({activeJob.status})
                  </span>
                </div>
                {activeJob.duration_seconds && (
                  <span className="text-xs font-medium text-slate-500">
                    Duration: {activeJob.duration_seconds}s
                  </span>
                )}
              </div>

              {/* Stages Visual Progression */}
              {activeJob.stages && activeJob.stages.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
                  {activeJob.stages.map((st: StageItem, idx: number) => {
                    const isRunning = st.status === 'RUNNING';
                    const isCompleted = st.status === 'COMPLETED';
                    return (
                      <div 
                        key={idx}
                        className={`p-2.5 rounded-xl border text-xs transition-all ${
                          isRunning 
                            ? 'bg-blue-100/90 border-blue-300 text-blue-900 font-semibold animate-pulse shadow-xs'
                            : isCompleted
                            ? 'bg-white/90 border-emerald-200 text-slate-800'
                            : 'bg-white/40 border-slate-200 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Step {idx + 1}</span>
                          {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                          {isRunning && <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />}
                        </div>
                        <div className="font-semibold truncate">{st.message || st.stage}</div>
                        {st.duration_ms > 0 && (
                          <div className="text-[10px] text-slate-500 mt-1">{(st.duration_ms / 1000).toFixed(1)}s</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* HR & Key Decision Makers Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span>HR & Key Decision Makers</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                    {searchResult.professionals?.length || 0}
                  </span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Target professionals in Human Resources, Human Capital, Talent Acquisition, and Strategic Leadership.
                </p>
              </div>

              {searchResult.company_id && (
                <button
                  onClick={handleDiscoverProfs}
                  disabled={isDiscoveringProfs}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isDiscoveringProfs ? 'animate-spin' : ''}`} />
                  <span>{isDiscoveringProfs ? 'Discovering...' : 'Discover HR & Leaders'}</span>
                </button>
              )}
            </div>

            {(!searchResult.professionals || searchResult.professionals.length === 0) ? (
              <div className="p-6 text-center bg-white/60 rounded-3xl border border-dashed border-slate-200">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-600 font-semibold">No decision makers loaded yet</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-md mx-auto">
                  Click "Discover HR & Leaders" to analyze official governance subpages, dewan direksi/komisaris, and verified public profiles.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {searchResult.professionals.map((prof: ProfessionalItem) => (
                  <div
                    key={prof.id}
                    className="p-4 bg-white/90 hover:bg-white border border-slate-200 hover:border-blue-200 rounded-2xl shadow-xs transition-all flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm">{prof.person_name}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              {prof.seniority_level || 'Leader'}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                              {prof.department || 'HR / Leadership'}
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-slate-800 mt-0.5">
                            {prof.job_title}
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          prof.verification_status === 'VERIFIED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>
                          {prof.verification_status}
                        </span>
                      </div>

                      {prof.relevance_reason && (
                        <div className="text-[11px] text-slate-600 flex items-center gap-1 mt-1.5">
                          <Sparkles className="w-3 h-3 text-blue-500 shrink-0" />
                          <span>{prof.relevance_reason}</span>
                          {prof.relevance_score && (
                            <span className="font-bold text-blue-700">
                              ({Math.round(prof.relevance_score * 100)}%)
                            </span>
                          )}
                        </div>
                      )}

                      {prof.evidence_text && (
                        <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100 mt-2 line-clamp-2">
                          "{prof.evidence_text}"
                        </p>
                      )}

                      {/* Contact Channels */}
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                        {prof.contact_email && (
                          <a
                            href={`mailto:${prof.contact_email}`}
                            className="text-blue-600 hover:underline font-mono"
                          >
                            ✉ {prof.contact_email}
                          </a>
                        )}
                        {prof.contact_phone && (
                          <a
                            href={`tel:${prof.contact_phone}`}
                            className="text-emerald-700 hover:underline font-mono"
                          >
                            📞 {prof.contact_phone}
                          </a>
                        )}
                        {prof.profile_url?.includes('linkedin.com') ? (
                          <a
                            href={prof.profile_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0A66C2] hover:underline bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200"
                            title="Open verified LinkedIn profile"
                          >
                            <LinkedinIcon />
                            <span>LinkedIn Profile</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ) : (
                          <a
                            href={`https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(prof.person_name + ' ' + (searchResult.official_name || searchResult.input_name))}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-[#0A66C2] hover:bg-sky-50 bg-slate-100 px-2 py-0.5 rounded-md transition-colors"
                            title={`Search ${prof.person_name} on LinkedIn`}
                          >
                            <LinkedinIcon />
                            <span>Find on LinkedIn</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 text-[10px] uppercase font-bold">Outreach:</span>
                        <select
                          value={prof.outreach_status || 'NEW_LEAD'}
                          onChange={(e) => handleUpdateProfStatus(prof.id, e.target.value)}
                          className="text-[11px] p-1 bg-slate-50 border border-slate-200 rounded font-semibold text-slate-700 cursor-pointer"
                        >
                          <option value="NEW_LEAD">New Lead</option>
                          <option value="TO_REVIEW">To Review</option>
                          <option value="READY_TO_CONTACT">Ready to Contact</option>
                          <option value="CONTACTED">Contacted</option>
                          <option value="FOLLOW_UP">Follow Up</option>
                          <option value="REPLIED">Replied</option>
                          <option value="NOT_RELEVANT">Not Relevant</option>
                        </select>
                      </div>

                      {prof.source_url && (
                        <a
                          href={prof.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-500 hover:underline flex items-center gap-0.5 font-semibold text-[10px]"
                        >
                          <span>Open Source</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Contacts Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Grounded Contacts with Verified Source Evidence</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                  {searchResult.contacts?.length || 0}
                </span>
              </h4>
            </div>

            {searchResult.contacts?.length === 0 ? (
              <div className="p-8 text-center bg-white/60 rounded-3xl border border-dashed border-slate-200">
                <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-600 font-semibold">No verifiable contacts found on official website</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  The website was examined, but did not display direct contact information in its footer, contacts, or schema.
                </p>
                <button
                  onClick={() => setShowAddContact(true)}
                  className="mt-3 text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                >
                  + Add contact manually
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {searchResult.contacts.map((c: ContactItem, idx: number) => {
                  const val = c.email || c.phone || c.address || c.url || '-';
                  return (
                    <div
                      key={idx}
                      className="p-4 bg-white/80 hover:bg-white border border-slate-200/80 hover:border-blue-200 rounded-2xl transition-all shadow-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getContactIcon(c.contact_type)}
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                              {c.contact_type.replace('_', ' ')}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {c.source_section && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                                {c.source_section.replace('_', ' ')}
                              </span>
                            )}
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              c.verification_status === 'verified_official_website' || c.verification_status === 'official_published'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            }`}>
                              {c.verification_status?.replace(/_/g, ' ') || 'verified'}
                            </span>
                          </div>
                        </div>

                        {/* Person Name / Title if present */}
                        {c.contact_person_name && (
                          <div className="text-sm font-semibold text-slate-900 mb-0.5">
                            {c.contact_person_name}
                            {c.job_title && <span className="text-xs font-normal text-slate-500"> ({c.job_title})</span>}
                          </div>
                        )}

                        {/* Primary Value */}
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm font-mono font-medium text-slate-800 break-all">
                            {val}
                          </span>

                          <div className="flex items-center gap-1 ml-2">
                            <button
                              onClick={() => copyToClipboard(val)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Copy to clipboard"
                            >
                              {copiedValue === val ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>

                            <button
                              onClick={() => setSelectedEvidenceContact(c)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Inspect Evidence & Source"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Evidence preview snippet */}
                        {c.evidence_text && (
                          <p className="text-[11px] text-slate-500 italic mt-2 line-clamp-2 bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                            "{c.evidence_text}"
                          </p>
                        )}
                      </div>

                      {/* Source attribution footer */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                        <span>
                          Method: <span className="font-semibold text-slate-600">{(c.extraction_method || 'http_html').replace(/_/g, ' ')}</span>
                        </span>
                        {c.source_url && (
                          <a
                            href={c.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-500 hover:underline flex items-center gap-0.5 font-semibold"
                          >
                            <span>Open Source</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Batch Results View */}
      {batchResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900">Batch Search Results ({batchResults.length})</h3>
          <div className="space-y-3">
            {batchResults.map((b, i) => (
              <div key={i} className="p-4 bg-white/80 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{b.official_name || b.input_name}</span>
                    {renderStatusBadge(b.search_status || b.status)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {b.website || 'No website found'} • {b.contacts?.length || 0} contacts found
                  </div>
                </div>
                <button
                  onClick={() => setSearchResult(b)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  View Details
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evidence Drawer / Modal */}
      {selectedEvidenceContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Source Evidence & Audit Log</h3>
              </div>
              <button
                onClick={() => setSelectedEvidenceContact(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 rounded-xl">
                <div className="text-[10px] font-bold uppercase text-slate-400">Contact Value</div>
                <div className="text-sm font-mono font-bold text-slate-900 mt-0.5">
                  {selectedEvidenceContact.email || selectedEvidenceContact.phone || selectedEvidenceContact.address || selectedEvidenceContact.url}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Type: {selectedEvidenceContact.contact_type.replace(/_/g, ' ')}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Verbatim Ground-Truth Evidence</div>
                <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-slate-800 leading-relaxed italic font-mono text-[11px]">
                  "{selectedEvidenceContact.evidence_text || 'Extracted directly from page structure.'}"
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <div>
                  <span className="font-semibold text-slate-500">Source Section:</span>
                  <div className="font-medium text-slate-800 capitalize">
                    {(selectedEvidenceContact.source_section || 'Official Page').replace(/_/g, ' ')}
                  </div>
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Extraction Method:</span>
                  <div className="font-medium text-slate-800 capitalize">
                    {(selectedEvidenceContact.extraction_method || 'HTTP Scraper').replace(/_/g, ' ')}
                  </div>
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Verification Status:</span>
                  <div className="font-medium text-emerald-700 capitalize">
                    {(selectedEvidenceContact.verification_status || 'Verified').replace(/_/g, ' ')}
                  </div>
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Confidence:</span>
                  <div className="font-medium text-slate-800">
                    {Math.round((selectedEvidenceContact.confidence_score || 0.9) * 100)}%
                  </div>
                </div>
              </div>

              {selectedEvidenceContact.source_url && (
                <div className="pt-2">
                  <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Source URL</div>
                  <div className="text-[11px] font-mono text-slate-600 break-all bg-slate-50 p-2 rounded-lg">
                    {selectedEvidenceContact.source_url}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              {selectedEvidenceContact.source_url ? (
                <a
                  href={selectedEvidenceContact.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Source</span>
                </a>
              ) : <div />}

              <button
                onClick={() => setSelectedEvidenceContact(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Add Contact Manually</h3>
            
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Contact Type</label>
                <select
                  value={newContact.contact_type}
                  onChange={(e) => setNewContact({ ...newContact, contact_type: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="general_email">General Email</option>
                  <option value="sales_email">Sales Email</option>
                  <option value="procurement_email">Procurement Email</option>
                  <option value="pr_email">PR / Corsec Email</option>
                  <option value="office_phone">Office Phone</option>
                  <option value="cs_phone">Customer Service Phone</option>
                  <option value="whatsapp">WhatsApp Business</option>
                  <option value="linkedin">LinkedIn Profile</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Email</label>
                <input
                  type="email"
                  value={newContact.email || ''}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  placeholder="contact@company.com"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={newContact.phone || ''}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  placeholder="+62 21 5215109"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Contact Person & Title (Optional)</label>
                <input
                  type="text"
                  value={newContact.contact_person_name || ''}
                  onChange={(e) => setNewContact({ ...newContact, contact_person_name: e.target.value })}
                  placeholder="e.g. Budi Santoso (Corporate Secretary)"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowAddContact(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveContact}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white btn-primary-gradient cursor-pointer"
              >
                Save Contact
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
