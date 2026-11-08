import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Globe, 
  MapPin, 
  Mail, 
  Phone, 
  ExternalLink, 
  Download, 
  Users, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ArrowLeft, 
  Plus, 
  RefreshCw, 
  ShieldCheck, 
  ChevronRight, 
  Copy, 
  Check, 
  Ban, 
  FileText,
  Briefcase,
  Share2
} from 'lucide-react';
import { api, type CompanyItem, type ContactItem, type ProfessionalItem } from '../services/api';

const LinkedinIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={`${className} text-[#0A66C2] fill-current`} viewBox="0 0 24 24">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
  </svg>
);

interface StageItem {
  stage: string;
  status: string;
  duration_ms: number;
  message: string;
}

interface CompanyDetailProps {
  companyId: number;
  onBack?: () => void;
  onNavigateToProfessionals?: () => void;
}

export const CompanyDetail: React.FC<CompanyDetailProps> = ({ 
  companyId, 
  onBack,
  onNavigateToProfessionals
}) => {
  const [company, setCompany] = useState<CompanyItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'leadership' | 'contacts'>('leadership');

  // Discovery Job state
  const [activeJob, setActiveJob] = useState<any>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const pollTimerRef = useRef<any>(null);

  // Filters for professionals
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Manual Add Professional modal
  const [isAddProfModalOpen, setIsAddProfModalOpen] = useState(false);
  const [newProf, setNewProf] = useState({
    person_name: '',
    job_title: '',
    department: 'Human Resources',
    seniority_level: 'Manager',
    profile_url: '',  
    contact_email: '',
    contact_phone: ''
  });
  const [isSubmittingProf, setIsSubmittingProf] = useState(false);

  useEffect(() => {
    loadCompanyData();
    checkExistingJob();

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [companyId]);

  const loadCompanyData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getCompany(companyId);
      setCompany(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load company details');
    } finally {
      setIsLoading(false);
    }
  };

  const checkExistingJob = async () => {
    try {
      const res = await api.getLatestDiscoveryJob(companyId);
      if (res.job) {
        setActiveJob(res.job);
        if (res.job.status === 'RUNNING' || res.job.status === 'QUEUED') {
          startPolling(res.job.id);
        }
      }
    } catch (err) {
      console.error('Failed to check latest discovery job:', err);
    }
  };

  const startPolling = (jobId: number) => {
    setIsDiscovering(true);
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    pollTimerRef.current = setInterval(async () => {
      try {
        const jobStatus = await api.getDiscoveryJobStatus(jobId);
        setActiveJob(jobStatus);

        if (jobStatus.status === 'COMPLETED' || jobStatus.status === 'FAILED') {
          clearInterval(pollTimerRef.current);
          setIsDiscovering(false);
          // Refresh company data to fetch newly discovered professionals
          const updated = await api.getCompany(companyId);
          setCompany(updated);
        }
      } catch (err) {
        console.error('Error polling job status:', err);
        clearInterval(pollTimerRef.current);
        setIsDiscovering(false);
      }
    }, 1500);
  };

  const handleStartDiscovery = async () => {
    try {
      setIsDiscovering(true);
      const res = await api.discoverCompanyProfessionals(companyId);
      if (res.job_id) {
        startPolling(res.job_id);
      }
    } catch (err: any) {
      alert(`Discovery failed: ${err.message}`);
      setIsDiscovering(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleExportSingle = async () => {
    try {
      const exp = await api.createExport({ company_ids: [companyId] });
      window.open(api.getDownloadUrl(exp.export_id || exp.id), '_blank');
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    }
  };

  const handleUpdateProfStatus = async (profId: number, status: string) => {
    try {
      await api.updateProfessional(profId, { outreach_status: status });
      setCompany(prev => {
        if (!prev) return null;
        return {
          ...prev,
          professionals: prev.professionals?.map(p => p.id === profId ? { ...p, outreach_status: status } : p)
        };
      });
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleToggleDnc = async (profId: number, currentDnc: boolean) => {
    try {
      await api.updateProfessional(profId, { is_do_not_contact: !currentDnc });
      setCompany(prev => {
        if (!prev) return null;
        return {
          ...prev,
          professionals: prev.professionals?.map(p => p.id === profId ? { ...p, is_do_not_contact: !currentDnc } : p)
        };
      });
    } catch (err: any) {
      alert(`Failed to update DNC: ${err.message}`);
    }
  };

  const handleAddManualProf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProf.person_name || !newProf.job_title) return;

    try {
      setIsSubmittingProf(true);
      await api.addCompanyProfessional(companyId, newProf);
      setIsAddProfModalOpen(false);
      setNewProf({
        person_name: '',
        job_title: '',
        department: 'Human Resources',
        seniority_level: 'Manager',
        profile_url: '',
        contact_email: '',
        contact_phone: ''
      });
      // Refresh
      const updated = await api.getCompany(companyId);
      setCompany(updated);
    } catch (err: any) {
      alert(`Failed to add professional: ${err.message}`);
    } finally {
      setIsSubmittingProf(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading company intelligence records...</p>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="max-w-2xl mx-auto p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-rose-900">Failed to load company details</h3>
        <p className="text-sm text-rose-700">{error || 'Company not found'}</p>
        {onBack && (
          <button 
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-rose-300 rounded-xl text-sm font-semibold text-rose-700 hover:bg-rose-100"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Directory
          </button>
        )}
      </div>
    );
  }

  const professionals = company.professionals || [];
  const contacts = company.contacts || [];

  const filteredProfessionals = professionals.filter(p => {
    if (deptFilter === 'ALL') return true;
    return p.department === deptFilter;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      
      {/* Top Navigation & Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-xs"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Company #{company.id}
              </span>
              <span className="text-xs text-slate-400">|</span>
              <span className="text-xs text-slate-500">
                Added {new Date(company.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportSingle}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs transition-all"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={handleStartDiscovery}
            disabled={isDiscovering}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold btn-primary-gradient shadow-sm disabled:opacity-60 transition-all"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isDiscovering ? 'animate-spin' : ''}`} />
            <span>{isDiscovering ? 'Discovery in Progress...' : 'Run HR & Leadership Discovery'}</span>
          </button>
        </div>
      </div>

      {/* Hero Header Card */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-700 to-sky-500 text-white flex items-center justify-center font-bold text-2xl shadow-md shadow-blue-500/20">
                {(company.official_name || company.input_name).charAt(0)}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {company.official_name || company.input_name}
                </h1>
                {company.official_name && company.official_name !== company.input_name && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Original Query: <span className="font-medium text-slate-700">{company.input_name}</span>
                  </p>
                )}
              </div>
            </div>

            {company.description && (
              <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
                {company.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
              {company.website && (
                <a 
                  href={company.website} 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>{company.domain || company.website}</span>
                  <ExternalLink className="w-3 h-3 text-blue-400" />
                </a>
              )}
              {company.industry && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium">
                  <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                  <span>{company.industry}</span>
                </span>
              )}
              {(company.city || company.province) && (
                <span className="inline-flex items-center gap-1.5 text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{[company.city, company.province].filter(Boolean).join(', ')}</span>
                </span>
              )}
            </div>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex md:flex-col gap-3 min-w-[200px]">
            <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex-1">
              <div className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">Leadership & HR</div>
              <div className="text-2xl font-black text-blue-950 mt-1">{professionals.length}</div>
              <div className="text-[11px] text-blue-600/90 mt-0.5">Decision makers discovered</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex-1">
              <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Company Contacts</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{contacts.length}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Verified public channels</div>
            </div>
          </div>
        </div>
      </div>

      {/* Discovery Pipeline Stage Tracker Banner (Active / Completed) */}
      {activeJob && (
        <div className={`p-5 rounded-2xl border transition-all ${
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

      {/* Navigation Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('leadership')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'leadership'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Target People & Leadership</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            activeTab === 'leadership' ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {professionals.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('contacts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'contacts'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>General Contacts</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            activeTab === 'contacts' ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {contacts.length}
          </span>
        </button>
      </div>

      {/* TAB CONTENT: LEADERSHIP & HR */}
      {activeTab === 'leadership' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-700">Filter Department:</span>
              {['ALL', 'Leadership', 'Human Resources', 'People & Culture', 'Talent Acquisition'].map(dept => (
                <button
                  key={dept}
                  onClick={() => setDeptFilter(dept)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    deptFilter === dept
                      ? 'bg-blue-50 text-blue-700 border border-blue-300 font-semibold'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsAddProfModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>Add Person Manually</span>
            </button>
          </div>

          {filteredProfessionals.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900">No HR or decision makers found for this filter</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Click "Run HR & Leadership Discovery" to trigger automatic multi-source web scraping for this company.
              </p>
              <button
                onClick={handleStartDiscovery}
                disabled={isDiscovering}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold btn-primary-gradient shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Run Discovery Now</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProfessionals.map((prof: ProfessionalItem) => (
                <div 
                  key={prof.id} 
                  className={`p-5 rounded-2xl border transition-all ${
                    prof.is_do_not_contact 
                      ? 'bg-slate-50/70 border-slate-200 opacity-60' 
                      : 'glass-card border-slate-200/80 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-base">{prof.person_name}</span>
                        {prof.is_do_not_contact && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                            DO NOT CONTACT
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-blue-700">{prof.job_title}</div>
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                          {prof.department || 'Leadership'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-medium">
                          {prof.seniority_level || 'Director'}
                        </span>
                        {prof.verification_status === 'VERIFIED' && (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>Verified</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {prof.profile_url && (
                        <a 
                          href={prof.profile_url}
                          target="_blank" 
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 transition-all"
                          title="View Profile / Search LinkedIn"
                        >
                          <LinkedinIcon className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>

                  {prof.evidence_text && (
                    <div className="mt-3 p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/70 text-xs text-slate-600 italic">
                      "{prof.evidence_text}"
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Outreach:</span>
                      <select
                        value={prof.outreach_status || 'NEW_LEAD'}
                        onChange={(e) => handleUpdateProfStatus(prof.id, e.target.value)}
                        className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-medium focus:outline-blue-500"
                      >
                        <option value="NEW_LEAD">New Lead</option>
                        <option value="TO_REVIEW">To Review</option>
                        <option value="READY_TO_CONTACT">Ready to Contact</option>
                        <option value="CONTACTED">Contacted</option>
                        <option value="REPLIED">Replied</option>
                        <option value="NOT_RELEVANT">Not Relevant</option>
                      </select>
                    </div>

                    <button
                      onClick={() => handleToggleDnc(prof.id, Boolean(prof.is_do_not_contact))}
                      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md transition-all ${
                        prof.is_do_not_contact
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                      title={prof.is_do_not_contact ? 'Remove DNC suppression' : 'Mark as Do Not Contact'}
                    >
                      <Ban className="w-3 h-3" />
                      <span>{prof.is_do_not_contact ? 'Suppressed' : 'DNC'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: GENERAL CONTACTS */}
      {activeTab === 'contacts' && (
        <div className="space-y-4">
          {contacts.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 text-sm">
              No general contacts recorded yet.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Contact Type</th>
                    <th className="py-3 px-4">Value / Channel</th>
                    <th className="py-3 px-4">Verification</th>
                    <th className="py-3 px-4">Source URL</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {contacts.map((c: ContactItem) => {
                    const val = c.email || c.phone || c.url || c.address || c.raw_value || '';
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {c.contact_type.replace('_', ' ').toUpperCase()}
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-900">
                          {val}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {c.verification_status || 'VERIFIED'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 truncate max-w-[200px]">
                          {c.source_url ? (
                            <a href={c.source_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                              {c.source_url}
                            </a>
                          ) : '-'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => copyToClipboard(val)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                            title="Copy value"
                          >
                            {copiedText === val ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: Add Professional Manually */}
      {isAddProfModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Add Professional to Company</h3>
              <button 
                onClick={() => setIsAddProfModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddManualProf} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Full Person Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Budi Santoso"
                  value={newProf.person_name}
                  onChange={e => setNewProf(p => ({ ...p, person_name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-blue-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Job Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Human Resources Manager"
                  value={newProf.job_title}
                  onChange={e => setNewProf(p => ({ ...p, job_title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Department</label>
                  <select
                    value={newProf.department}
                    onChange={e => setNewProf(p => ({ ...p, department: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-blue-500"
                  >
                    <option value="Human Resources">Human Resources</option>
                    <option value="People & Culture">People & Culture</option>
                    <option value="Talent Acquisition">Talent Acquisition</option>
                    <option value="Leadership">Leadership</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Seniority</label>
                  <select
                    value={newProf.seniority_level}
                    onChange={e => setNewProf(p => ({ ...p, seniority_level: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-blue-500"
                  >
                    <option value="C-Level">C-Level</option>
                    <option value="Director">Director</option>
                    <option value="VP">VP</option>
                    <option value="Head">Head</option>
                    <option value="Manager">Manager</option>
                    <option value="Lead">Lead</option>
                    <option value="Specialist">Specialist</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">LinkedIn Profile URL</label>
                <input
                  type="url"
                  placeholder="https://www.linkedin.com/in/..."
                  value={newProf.profile_url}
                  onChange={e => setNewProf(p => ({ ...p, profile_url: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddProfModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProf}
                  className="px-4 py-2 rounded-xl btn-primary-gradient font-semibold shadow-xs disabled:opacity-50"
                >
                  {isSubmittingProf ? 'Saving...' : 'Add Professional'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export const CompanyDetailRoute: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  return (
    <CompanyDetail 
      companyId={Number(id)} 
      onBack={() => navigate('/companies')} 
      onNavigateToProfessionals={() => navigate('/decision-makers')}
    />
  );
};
