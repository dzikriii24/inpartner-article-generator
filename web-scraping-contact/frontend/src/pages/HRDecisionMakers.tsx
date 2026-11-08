import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  ExternalLink, 
  Download, 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  FileText, 
  Settings2, 
  Building2, 
  Briefcase, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  X, 
  Plus, 
  Trash2, 
  Save, 
  Mail, 
  Phone, 
  Calendar, 
  SlidersHorizontal,
  Ban,
  Check
} from 'lucide-react';
import { api, ProfessionalItem } from '../services/api';

const LinkedinIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={`${className} text-[#0A66C2] fill-current`} viewBox="0 0 24 24">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
  </svg>
);

const OUTREACH_STATUSES = [
  { id: 'NEW_LEAD', label: 'New Lead', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { id: 'TO_REVIEW', label: 'To Review', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'READY_TO_CONTACT', label: 'Ready to Contact', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'CONTACTED', label: 'Contacted', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'FOLLOW_UP', label: 'Follow-up', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'REPLIED', label: 'Replied', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'NOT_RELEVANT', label: 'Not Relevant', color: 'bg-rose-50 text-rose-700 border-rose-200' }
];

export const HRDecisionMakers: React.FC = () => {
  const [professionals, setProfessionals] = useState<ProfessionalItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [seniorityFilter, setSeniorityFilter] = useState('ALL');
  const [verificationFilter, setVerificationFilter] = useState('ALL');
  const [outreachFilter, setOutreachFilter] = useState('ALL');
  const [hideDnc, setHideDnc] = useState(false);
  const [sortBy, setSortBy] = useState('relevance_score');

  // Modals
  const [selectedProf, setSelectedProf] = useState<ProfessionalItem | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [configData, setConfigData] = useState<any>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Outreach editing state inside modal
  const [editNotes, setEditNotes] = useState('');
  const [editOutreachStatus, setEditOutreachStatus] = useState('NEW_LEAD');
  const [editProfileUrl, setEditProfileUrl] = useState('');
  const [editDnc, setEditDnc] = useState(false);
  const [editLastContacted, setEditLastContacted] = useState('');
  const [editNextFollowup, setEditNextFollowup] = useState('');
  const [isSavingOutreach, setIsSavingOutreach] = useState(false);

  // Inline feedback
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    loadProfessionals();
  }, [page, searchQuery, deptFilter, seniorityFilter, verificationFilter, outreachFilter, hideDnc, sortBy]);

  const loadProfessionals = async () => {
    try {
      setIsLoading(true);
      const params: Record<string, any> = {
        q: searchQuery,
        department: deptFilter !== 'ALL' ? deptFilter : undefined,
        seniority_level: seniorityFilter !== 'ALL' ? seniorityFilter : undefined,
        verification_status: verificationFilter !== 'ALL' ? verificationFilter : undefined,
        outreach_status: outreachFilter !== 'ALL' ? outreachFilter : undefined,
        is_do_not_contact: hideDnc ? false : undefined,
        sort_by: sortBy,
        sort_order: 'desc',
        page,
        limit: 15
      };

      const res = await api.getProfessionals(params);
      setProfessionals(res.items || []);
      setTotal(res.total || 0);
      setTotalPages(res.total_pages || 1);
      setStats(res.stats || null);
    } catch (err) {
      console.error('Failed to load professionals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDetail = (p: ProfessionalItem) => {
    setSelectedProf(p);
    setEditNotes(p.outreach_notes || '');
    setEditOutreachStatus(p.outreach_status || 'NEW_LEAD');
    setEditProfileUrl(p.profile_url || '');
    setEditDnc(!!p.is_do_not_contact);
    setEditLastContacted(p.last_contacted_at ? p.last_contacted_at.slice(0, 10) : '');
    setEditNextFollowup(p.next_followup_at ? p.next_followup_at.slice(0, 10) : '');
  };

  const handleSaveOutreach = async () => {
    if (!selectedProf) return;
    try {
      setIsSavingOutreach(true);
      await api.updateProfessional(selectedProf.id, {
        outreach_status: editOutreachStatus,
        is_do_not_contact: editDnc,
        outreach_notes: editNotes,
        profile_url: editProfileUrl || null,
        last_contacted_at: editLastContacted ? `${editLastContacted}T00:00:00` : null,
        next_followup_at: editNextFollowup ? `${editNextFollowup}T00:00:00` : null
      });

      // Update local state
      setSelectedProf((prev) => prev ? {
        ...prev,
        outreach_status: editOutreachStatus,
        is_do_not_contact: editDnc,
        outreach_notes: editNotes,
        profile_url: editProfileUrl || null,
        last_contacted_at: editLastContacted || null,
        next_followup_at: editNextFollowup || null
      } : null);

      showNotification('Outreach workflow updated successfully!');
      loadProfessionals();
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setIsSavingOutreach(false);
    }
  };

  const handleInlineStatusChange = async (profId: number, newStatus: string) => {
    try {
      await api.updateProfessional(profId, { outreach_status: newStatus });
      setProfessionals((prev) => prev.map((p) => p.id === profId ? { ...p, outreach_status: newStatus } : p));
      showNotification(`Status updated to ${newStatus.replace('_', ' ')}`);
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleToggleDnc = async (prof: ProfessionalItem) => {
    const nextVal = !prof.is_do_not_contact;
    try {
      await api.updateProfessional(prof.id, { is_do_not_contact: nextVal });
      setProfessionals((prev) => prev.map((p) => p.id === prof.id ? { ...p, is_do_not_contact: nextVal } : p));
      if (selectedProf && selectedProf.id === prof.id) {
        setSelectedProf({ ...selectedProf, is_do_not_contact: nextVal });
        setEditDnc(nextVal);
      }
      showNotification(nextVal ? 'Added to Suppression / Do Not Contact list' : 'Removed from Do Not Contact list');
    } catch (err: any) {
      alert(`Failed to update DNC status: ${err.message}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this professional record?')) return;
    try {
      await api.deleteProfessional(id);
      if (selectedProf?.id === id) setSelectedProf(null);
      loadProfessionals();
      showNotification('Record deleted.');
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleOpenConfig = async () => {
    try {
      setIsConfigModalOpen(true);
      const conf = await api.getTargetRolesConfig();
      setConfigData(conf);
    } catch (err: any) {
      alert(`Failed to load target roles: ${err.message}`);
    }
  };

  const handleSaveConfig = async () => {
    try {
      setIsSavingConfig(true);
      await api.updateTargetRolesConfig(configData);
      setIsConfigModalOpen(false);
      showNotification('Target roles configuration updated!');
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const showNotification = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 3000);
  };

  const renderVerificationBadge = (status?: string) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            Verified
          </span>
        );
      case 'PARTIALLY_VERIFIED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle2 className="w-3 h-3 text-blue-600" />
            Partially Verified
          </span>
        );
      case 'OUTDATED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Outdated
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            Unverified
          </span>
        );
    }
  };

  const renderSeniorityBadge = (level?: string | null) => {
    switch (level) {
      case 'C-Level':
        return <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-purple-100 text-purple-800 border border-purple-200">C-LEVEL</span>;
      case 'Director':
        return <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-indigo-100 text-indigo-800 border border-indigo-200">DIRECTOR</span>;
      case 'VP':
        return <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-blue-100 text-blue-800 border border-blue-200">VP</span>;
      case 'Head':
        return <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-teal-100 text-teal-800 border border-teal-200">HEAD</span>;
      case 'Manager':
        return <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-amber-100 text-amber-800 border border-amber-200">MANAGER</span>;
      case 'Lead':
        return <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-cyan-100 text-cyan-800 border border-cyan-200">LEAD</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-slate-100 text-slate-700 border border-slate-200">{level || 'STAFF'}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {actionMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-fuchsia-600" />
            <span>HR & Strategic Decision Makers</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Database profil profesional terverifikasi di bidang Human Resources, Human Capital, Talent Acquisition, dan Dewan Direksi.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleOpenConfig}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
          >
            <Settings2 className="w-3.5 h-3.5 text-fuchsia-600" />
            <span>Target Roles Config</span>
          </button>

          <a
            href={api.getProfessionalsCsvExportUrl({
              q: searchQuery,
              department: deptFilter !== 'ALL' ? deptFilter : undefined,
              seniority_level: seniorityFilter !== 'ALL' ? seniorityFilter : undefined,
              verification_status: verificationFilter !== 'ALL' ? verificationFilter : undefined,
              outreach_status: outreachFilter !== 'ALL' ? outreachFilter : undefined,
              is_do_not_contact: hideDnc ? false : undefined
            })}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-semibold text-xs hover:opacity-95 transition-opacity shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-200/60 bg-white/70">
          <div className="text-xs text-slate-500 font-medium">Total Professionals</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{total}</div>
          <div className="text-[11px] text-fuchsia-600 mt-0.5">Found across target companies</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200/60 bg-white/70">
          <div className="text-xs text-slate-500 font-medium">Verified Sources</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">
            {professionals.filter(p => p.verification_status === 'VERIFIED').length}
          </div>
          <div className="text-[11px] text-emerald-600 mt-0.5">Grounded in official governance</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200/60 bg-white/70">
          <div className="text-xs text-slate-500 font-medium">Active Leads</div>
          <div className="text-2xl font-bold text-indigo-600 mt-1">
            {professionals.filter(p => ['READY_TO_CONTACT', 'CONTACTED', 'FOLLOW_UP'].includes(p.outreach_status || '')).length}
          </div>
          <div className="text-[11px] text-indigo-600 mt-0.5">Ready or in communication</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200/60 bg-white/70">
          <div className="text-xs text-slate-500 font-medium">Suppression (DNC)</div>
          <div className="text-2xl font-bold text-rose-600 mt-1">
            {stats?.do_not_contact_count || professionals.filter(p => p.is_do_not_contact).length}
          </div>
          <div className="text-[11px] text-rose-500 mt-0.5">Do Not Contact policy active</div>
        </div>
      </div>

      {/* Multi-Filter & Search Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200/70 bg-white/80 space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Cari berdasarkan nama profesional, jabatan (HR, Manager, Direktur), atau perusahaan..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-fuchsia-500 focus:bg-white transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setHideDnc(!hideDnc)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                hideDnc
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Ban className="w-3.5 h-3.5" />
              <span>{hideDnc ? 'Excluding DNC' : 'Include DNC'}</span>
            </button>

            <button
              onClick={() => {
                setSearchQuery('');
                setDeptFilter('ALL');
                setSeniorityFilter('ALL');
                setVerificationFilter('ALL');
                setOutreachFilter('ALL');
                setHideDnc(false);
                setPage(1);
              }}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              title="Reset Filters"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Filter Dropdowns Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Department</label>
            <select
              value={deptFilter}
              onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-fuchsia-500"
            >
              <option value="ALL">All Departments</option>
              <option value="Human Resources">Human Resources</option>
              <option value="Human Capital">Human Capital</option>
              <option value="Talent Acquisition">Talent Acquisition</option>
              <option value="People & Culture">People & Culture</option>
              <option value="Leadership">Leadership & Direksi</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Seniority</label>
            <select
              value={seniorityFilter}
              onChange={(e) => { setSeniorityFilter(e.target.value); setPage(1); }}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-fuchsia-500"
            >
              <option value="ALL">All Seniority Levels</option>
              <option value="C-Level">C-Level (CHRO, CPO, CEO)</option>
              <option value="Director">Director (Direktur)</option>
              <option value="VP">Vice President (VP)</option>
              <option value="Head">Head / Kepala Divisi</option>
              <option value="Manager">Manager</option>
              <option value="Lead">Lead / HRBP</option>
              <option value="Specialist">Specialist / Recruiter</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Verification</label>
            <select
              value={verificationFilter}
              onChange={(e) => { setVerificationFilter(e.target.value); setPage(1); }}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-fuchsia-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="VERIFIED">Verified (Official Source)</option>
              <option value="PARTIALLY_VERIFIED">Partially Verified</option>
              <option value="UNVERIFIED">Unverified</option>
              <option value="OUTDATED">Outdated</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Outreach Status</label>
            <select
              value={outreachFilter}
              onChange={(e) => { setOutreachFilter(e.target.value); setPage(1); }}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-fuchsia-500"
            >
              <option value="ALL">All Leads</option>
              {OUTREACH_STATUSES.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-fuchsia-500"
            >
              <option value="relevance_score">Relevance Score (Highest)</option>
              <option value="confidence_score">Confidence Score</option>
              <option value="created_at">Discovery Date (Newest)</option>
              <option value="person_name">Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Professionals Table */}
      <div className="glass-panel rounded-2xl border border-slate-200/70 overflow-hidden bg-white/70 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold">
                <th className="p-3.5">Professional Name</th>
                <th className="p-3.5">Job Title & Dept</th>
                <th className="p-3.5">Company</th>
                <th className="p-3.5 text-center">Relevance</th>
                <th className="p-3.5">Verification</th>
                <th className="p-3.5">Outreach Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-fuchsia-600" />
                    <span>Loading verified decision makers...</span>
                  </td>
                </tr>
              ) : professionals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">No professionals found</p>
                    <p className="text-[11px] text-slate-400 mt-1">Try relaxing filters or search for another company.</p>
                  </td>
                </tr>
              ) : (
                professionals.map((p) => {
                  const isDnc = p.is_do_not_contact;
                  return (
                    <tr 
                      key={p.id} 
                      className={`hover:bg-slate-50/80 transition-colors ${isDnc ? 'bg-rose-50/30' : ''}`}
                    >
                      {/* Name & Seniority */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenDetail(p)}
                            className="font-bold text-slate-900 hover:text-fuchsia-600 transition-colors text-left cursor-pointer"
                          >
                            {p.person_name}
                          </button>
                          {isDnc && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-0.5">
                              <Ban className="w-2.5 h-2.5" /> DNC
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                          {renderSeniorityBadge(p.seniority_level)}
                          {p.profile_url?.includes('linkedin.com') ? (
                            <a
                              href={p.profile_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0A66C2] hover:underline bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200"
                              title="Open verified LinkedIn profile"
                            >
                              <LinkedinIcon className="w-3 h-3" />
                              <span>LinkedIn</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          ) : (
                            <a
                              href={`https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(p.person_name + ' ' + (p.company_name || ''))}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 hover:text-[#0A66C2] hover:bg-sky-50 bg-slate-100 px-2 py-0.5 rounded-full transition-colors"
                              title={`Find ${p.person_name} on LinkedIn`}
                            >
                              <LinkedinIcon className="w-3 h-3" />
                              <span>Find on LinkedIn</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Job Title & Department */}
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-800">{p.job_title}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500" />
                          <span>{p.department || 'Human Resources'}</span>
                        </div>
                      </td>

                      {/* Target Company */}
                      <td className="p-3.5">
                        <div className="font-medium text-slate-900">{p.company_name}</div>
                        {p.company_website ? (
                          <a
                            href={p.company_website}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5 mt-0.5"
                          >
                            <span>{p.company_domain || 'Website'}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ) : (
                          <span className="text-[11px] text-slate-400">-</span>
                        )}
                      </td>

                      {/* Relevance Score */}
                      <td className="p-3.5 text-center">
                        <div className="inline-block" title={p.relevance_reason || ''}>
                          <span className={`px-2 py-0.5 rounded-full font-bold text-xs ${
                            (p.relevance_score || 0) >= 0.90
                              ? 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200'
                              : (p.relevance_score || 0) >= 0.80
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {Math.round((p.relevance_score || 0.8) * 100)}%
                          </span>
                        </div>
                      </td>

                      {/* Verification Status */}
                      <td className="p-3.5">
                        {renderVerificationBadge(p.verification_status)}
                        {p.source_type && (
                          <div className="text-[10px] text-slate-400 mt-1 capitalize">
                            via {p.source_type.replace(/_/g, ' ')}
                          </div>
                        )}
                      </td>

                      {/* Outreach Status Selector */}
                      <td className="p-3.5">
                        <select
                          value={p.outreach_status || 'NEW_LEAD'}
                          onChange={(e) => handleInlineStatusChange(p.id, e.target.value)}
                          className={`text-xs font-semibold px-2 py-1 rounded-xl border focus:outline-none transition-colors cursor-pointer ${
                            OUTREACH_STATUSES.find(s => s.id === p.outreach_status)?.color || 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {OUTREACH_STATUSES.map(s => (
                            <option key={s.id} value={s.id}>{s.label}</option>
                          ))}
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenDetail(p)}
                            className="p-1.5 text-slate-400 hover:text-fuchsia-600 hover:bg-fuchsia-50 rounded-lg transition-colors cursor-pointer"
                            title="Inspect Evidence & Outreach Details"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleToggleDnc(p)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isDnc 
                                ? 'text-rose-600 bg-rose-50 hover:bg-rose-100' 
                                : 'text-slate-300 hover:text-rose-500 hover:bg-rose-50'
                            }`}
                            title={isDnc ? "Remove from Do Not Contact" : "Mark as Do Not Contact"}
                          >
                            <Ban className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 bg-white/40 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {professionals.length} of {total} professionals</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-700">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Professional Detail / Evidence & Outreach Modal */}
      {selectedProf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl font-bold text-slate-900">{selectedProf.person_name}</h3>
                  {renderSeniorityBadge(selectedProf.seniority_level)}
                  {renderVerificationBadge(selectedProf.verification_status)}
                  {selectedProf.is_do_not_contact && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                      <Ban className="w-3 h-3" /> DO NOT CONTACT
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-700">{selectedProf.job_title}</span>
                  <span>•</span>
                  <span>{selectedProf.department}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedProf(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* DNC Warning banner if suppressed */}
            {selectedProf.is_do_not_contact && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                <div>
                  <div className="font-bold">Suppression List Active</div>
                  <div className="text-[11px] text-rose-700 mt-0.5">
                    Kontak ini ditandai sebagai Do Not Contact. Dilarang melakukan outreach atau pesan komunikasi lebih lanjut.
                  </div>
                </div>
              </div>
            )}

            {/* Company & Relevance Context */}
            <div className="p-4 bg-slate-50 rounded-2xl space-y-2.5 text-xs text-slate-600 border border-slate-100">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-fuchsia-600" />
                  {selectedProf.company_name}
                </span>
                {selectedProf.company_website && (
                  <a
                    href={selectedProf.company_website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>{selectedProf.company_domain || 'Official Website'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {selectedProf.relevance_reason && (
                <div className="pt-2 border-t border-slate-200/60">
                  <span className="font-semibold text-slate-700">Relevance Rationale: </span>
                  <span className="text-slate-600">{selectedProf.relevance_reason}</span>
                </div>
              )}
            </div>

            {/* Discovered Grounded Evidence */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-fuchsia-600" />
                <span>Verified Source Evidence</span>
              </h4>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60 text-xs space-y-2">
                {selectedProf.evidence_text ? (
                  <p className="italic text-slate-700 leading-relaxed font-serif bg-white p-3 rounded-xl border border-slate-100">
                    "{selectedProf.evidence_text}"
                  </p>
                ) : (
                  <p className="text-slate-400 italic">No raw quotation preserved.</p>
                )}

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>Method: {selectedProf.extraction_method?.replace(/_/g, ' ')}</span>
                  {selectedProf.source_url && (
                    <a
                      href={selectedProf.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline font-semibold flex items-center gap-1"
                    >
                      <span>Open Original Source</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Details (if discovered) */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Official Business Email</div>
                <div className="font-mono text-slate-800 font-medium mt-1">
                  {selectedProf.contact_email || 'Not published publicly'}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Business Phone</div>
                <div className="font-mono text-slate-800 font-medium mt-1">
                  {selectedProf.contact_phone || 'Not published publicly'}
                </div>
              </div>
            </div>

            {/* LinkedIn / Professional Profile Link */}
            <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <LinkedinIcon className="w-4 h-4" />
                  <span>LinkedIn / Professional Profile</span>
                </div>
                <a
                  href={editProfileUrl || `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(selectedProf.person_name + ' ' + (selectedProf.company_name || ''))}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#0A66C2] hover:bg-[#004182] flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <LinkedinIcon className="w-3.5 h-3.5 text-white fill-current" />
                  <span>{editProfileUrl ? 'Open LinkedIn Profile' : 'Find on LinkedIn'}</span>
                  <ExternalLink className="w-3 h-3 text-white" />
                </a>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                  Direct Profile URL (editable)
                </label>
                <input
                  type="url"
                  value={editProfileUrl}
                  onChange={(e) => setEditProfileUrl(e.target.value)}
                  placeholder="https://www.linkedin.com/in/username"
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-sky-500 text-slate-800"
                />
              </div>
            </div>

            {/* Outreach Workflow Section */}
            <div className="p-4 bg-fuchsia-50/40 rounded-2xl border border-fuchsia-100 space-y-3">
              <h4 className="text-xs font-bold text-fuchsia-900 uppercase tracking-wider">
                Outreach & Follow-Up Management
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Status</label>
                  <select
                    value={editOutreachStatus}
                    onChange={(e) => setEditOutreachStatus(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-fuchsia-500"
                  >
                    {OUTREACH_STATUSES.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Last Contacted</label>
                  <input
                    type="date"
                    value={editLastContacted}
                    onChange={(e) => setEditLastContacted(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-fuchsia-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Next Follow-Up</label>
                  <input
                    type="date"
                    value={editNextFollowup}
                    onChange={(e) => setEditNextFollowup(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-fuchsia-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Outreach Notes</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Catatan hasil pembicaraan, kebutuhan partnership, atau topik outreach..."
                  rows={3}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-fuchsia-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-rose-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editDnc}
                    onChange={(e) => setEditDnc(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span>Mark as Do Not Contact (Suppression)</span>
                </label>

                <button
                  onClick={handleSaveOutreach}
                  disabled={isSavingOutreach}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-bold text-xs hover:opacity-95 transition-opacity shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingOutreach ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Target Roles Configuration Modal */}
      {isConfigModalOpen && configData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-3xl w-full shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-fuchsia-600" />
                  <span>Target Roles & Job Titles Configuration</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Atur daftar jabatan target, bobot relevansi, dan alias tanpa perlu mengubah kode program.
                </p>
              </div>

              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Categories list */}
            <div className="space-y-4">
              {configData.categories?.map((cat: any, catIdx: number) => (
                <div key={cat.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{cat.name}</div>
                      <div className="text-[11px] text-slate-500">{cat.description}</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700">
                      Dept: {cat.department}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {cat.roles?.map((r: any, rIdx: number) => (
                      <div key={rIdx} className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-800">{r.title}</div>
                          <div className="text-[11px] text-slate-500 truncate">
                            Aliases: {r.aliases?.join(', ') || '-'}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {r.seniority}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200">
                            Weight: {r.weight}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={isSavingConfig}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-bold text-xs hover:opacity-95 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSavingConfig ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
