import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Search, 
  Globe, 
  MapPin, 
  ExternalLink, 
  Download, 
  RefreshCw, 
  Plus, 
  Edit3, 
  Trash2, 
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  X,
  FileText,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  Users,
  Sparkles,
  Briefcase,
  Ban,
  Check
} from 'lucide-react';
import { api, CompanyItem, ContactItem, ProfessionalItem } from '../services/api';

const LinkedinIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={`${className} text-[#0A66C2] fill-current`} viewBox="0 0 24 24">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
  </svg>
);

export const CompaniesDatabase: React.FC = () => {
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [industryFilter, setIndustryFilter] = useState('');
  const [sortBy, setSortBy] = useState('updated_at');

  const navigate = useNavigate();

  // Selected company detail modal
  const [selectedCompany, setSelectedCompany] = useState<CompanyItem | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Evidence Drawer modal
  const [selectedEvidenceContact, setSelectedEvidenceContact] = useState<ContactItem | null>(null);

  // Modal subtabs & decision maker states
  const [modalTab, setModalTab] = useState<'decision_makers' | 'contacts' | 'audit'>('decision_makers');
  const [isDiscoveringProfs, setIsDiscoveringProfs] = useState(false);
  const [isAddingProf, setIsAddingProf] = useState(false);
  const [newProf, setNewProf] = useState({
    person_name: '',
    job_title: '',
    department: 'Human Resources',
    seniority_level: 'Manager',
    contact_email: '',
    contact_phone: ''
  });

  // Edit Company modal
  const [editCompanyData, setEditCompanyData] = useState<Partial<CompanyItem> | null>(null);

  // Add Contact modal
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContact, setNewContact] = useState<Partial<ContactItem>>({
    contact_type: 'general_email',
    email: '',
    phone: '',
    contact_person_name: '',
    job_title: ''
  });

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadCompanies();
  }, [page, searchQuery, statusFilter, industryFilter, sortBy]);

  const loadCompanies = async () => {
    try {
      setIsLoading(true);
      const params: Record<string, any> = {
        q: searchQuery,
        industry: industryFilter,
        page,
        limit: 15,
        sort_by: sortBy,
        sort_order: 'desc'
      };
      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      const res = await api.getCompanies(params);
      setCompanies(res.items || []);
      setTotal(res.total || 0);
      setTotalPages(res.total_pages || 1);
    } catch (err) {
      console.error('Failed to load companies:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDetail = async (companyId: number) => {
    try {
      setIsDetailLoading(true);
      const data = await api.getCompany(companyId);
      setSelectedCompany(data);
    } catch (err: any) {
      alert(`Failed to load company details: ${err.message}`);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleReEnrich = async (companyId: number) => {
    try {
      await api.reEnrichCompany(companyId);
      handleOpenDetail(companyId);
      loadCompanies();
    } catch (err: any) {
      alert(`Re-enrich failed: ${err.message}`);
    }
  };

  const handleSaveEditCompany = async () => {
    if (!editCompanyData || !selectedCompany) return;
    try {
      await api.updateCompany(selectedCompany.id, editCompanyData);
      setEditCompanyData(null);
      handleOpenDetail(selectedCompany.id);
      loadCompanies();
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    }
  };

  const handleSaveContact = async () => {
    if (!selectedCompany) return;
    try {
      await api.addContact(selectedCompany.id, newContact);
      setIsAddingContact(false);
      setNewContact({ contact_type: 'general_email', email: '', phone: '' });
      handleOpenDetail(selectedCompany.id);
    } catch (err: any) {
      alert(`Add contact failed: ${err.message}`);
    }
  };

  const handleDeleteContact = async (contactId: number) => {
    if (!confirm('Are you sure you want to remove this contact?')) return;
    try {
      await api.deleteContact(contactId);
      if (selectedCompany) handleOpenDetail(selectedCompany.id);
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleDiscoverProfessionals = async (companyId: number) => {
    try {
      setIsDiscoveringProfs(true);
      await api.discoverCompanyProfessionals(companyId);
      await handleOpenDetail(companyId);
      loadCompanies();
    } catch (err: any) {
      alert(`Decision maker discovery failed: ${err.message}`);
    } finally {
      setIsDiscoveringProfs(false);
    }
  };

  const handleSaveNewProf = async () => {
    if (!selectedCompany || !newProf.person_name || !newProf.job_title) return;
    try {
      await api.addCompanyProfessional(selectedCompany.id, newProf);
      setIsAddingProf(false);
      setNewProf({ person_name: '', job_title: '', department: 'Human Resources', seniority_level: 'Manager', contact_email: '', contact_phone: '' });
      await handleOpenDetail(selectedCompany.id);
      loadCompanies();
    } catch (err: any) {
      alert(`Failed to add professional: ${err.message}`);
    }
  };

  const handleProfStatusChange = async (profId: number, status: string) => {
    try {
      await api.updateProfessional(profId, { outreach_status: status });
      if (selectedCompany) {
        setSelectedCompany({
          ...selectedCompany,
          professionals: selectedCompany.professionals?.map(p => p.id === profId ? { ...p, outreach_status: status } : p)
        });
      }
    } catch (err: any) {
      alert(`Update status failed: ${err.message}`);
    }
  };

  const handleProfDncToggle = async (profId: number, currentDnc: boolean) => {
    try {
      await api.updateProfessional(profId, { is_do_not_contact: !currentDnc });
      if (selectedCompany) {
        setSelectedCompany({
          ...selectedCompany,
          professionals: selectedCompany.professionals?.map(p => p.id === profId ? { ...p, is_do_not_contact: !currentDnc } : p)
        });
      }
    } catch (err: any) {
      alert(`Update DNC failed: ${err.message}`);
    }
  };

  const handleExportAll = async () => {
    try {
      setIsExporting(true);
      const res = await api.createExport({ export_all: true });
      window.open(api.getDownloadUrl(res.export_id || res.id), '_blank');
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const renderStatusBadge = (status?: string | null) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>Verified</span>
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <CheckCircle2 className="w-3 h-3 text-indigo-600" />
            <span>Public Source</span>
          </span>
        );
      case 'NEEDS_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            <span>Needs Review</span>
          </span>
        );
      case 'WEBSITE_UNREACHABLE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            <span>Unreachable</span>
          </span>
        );
      case 'NOT_FOUND':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <Info className="w-3 h-3 text-slate-500" />
            <span>Not Found</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <span>{status || 'Unknown'}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      
      {/* Header Panel */}
      <div className="glass-panel rounded-3xl p-6 border border-white/60 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Enriched Companies Directory</h2>
          <p className="text-xs text-slate-500 mt-1">
            Browse, inspect ground-truth evidence, filter by verification status, and export 3-Sheet Excel.
          </p>
        </div>

        <button
          onClick={handleExportAll}
          disabled={isExporting || total === 0}
          className="px-5 py-2.5 rounded-2xl text-xs font-semibold text-white btn-primary-gradient flex items-center gap-2 shadow-md shadow-fuchsia-500/25 shrink-0 cursor-pointer disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isExporting ? 'Generating...' : `Export 3-Sheet Excel (${total})`}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card rounded-2xl p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search by company name, domain, city..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30 focus:border-fuchsia-500"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
          {[
            { label: 'All', value: 'ALL' },
            { label: 'Verified', value: 'COMPLETED' },
            { label: 'Public Source', value: 'PARTIAL' },
            { label: 'Needs Review', value: 'NEEDS_REVIEW' },
            { label: 'Unreachable', value: 'WEBSITE_UNREACHABLE' },
            { label: 'Not Found', value: 'NOT_FOUND' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatusFilter(tab.value);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === tab.value
                  ? 'bg-white font-bold text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700"
        >
          <option value="updated_at">Recently Updated</option>
          <option value="matching_confidence">Highest Confidence</option>
          <option value="input_name">Company Name (A-Z)</option>
        </select>
      </div>

      {/* Main Companies Table */}
      <div className="glass-panel rounded-3xl border border-white/60 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-800 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-4">Company Name</th>
                <th className="p-4">Official Name</th>
                <th className="p-4">Website</th>
                <th className="p-4">Industry</th>
                <th className="p-4">Quality Status</th>
                <th className="p-4 text-center">HR & Leaders</th>
                <th className="p-4 text-center">Contacts</th>
                <th className="p-4 text-center">Confidence</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white/70">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-fuchsia-600" />
                    <span>Loading companies...</span>
                  </td>
                </tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400">
                    <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">No companies found</p>
                    <p className="text-[11px] text-slate-400 mt-1">Try another filter or search keyword.</p>
                  </td>
                </tr>
              ) : (
                companies.map((comp) => (
                  <tr key={comp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td 
                      onClick={() => navigate(`/companies/${comp.id}`)}
                      className="p-4 font-bold text-slate-900 cursor-pointer hover:text-blue-600 hover:underline"
                      title="Open Company Intelligence Profile"
                    >
                      {comp.input_name}
                    </td>
                    <td className="p-4 text-slate-700">{comp.official_name || '-'}</td>
                    <td className="p-4">
                      {comp.website ? (
                        <a
                          href={comp.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline font-medium inline-flex items-center gap-1"
                        >
                          <span>{comp.domain || comp.website}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      {comp.industry ? (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 font-medium text-slate-700">
                          {comp.industry}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="p-4">
                      {renderStatusBadge(comp.search_status)}
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1">
                        <Users className="w-3 h-3 text-blue-600" />
                        {comp.total_professionals || 0}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {comp.total_contacts}
                      </span>
                    </td>
                    <td className="p-4 text-center font-bold text-slate-700">
                      {Math.round((comp.matching_confidence || 0.5) * 100)}%
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => navigate(`/companies/${comp.id}`)}
                          className="px-2.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-semibold inline-flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                        >
                          <span>Profile</span>
                          <ExternalLink className="w-3 h-3 text-blue-500" />
                        </button>
                        <button
                          onClick={() => handleOpenDetail(comp.id)}
                          className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-white hover:text-slate-900 transition-colors shadow-xs cursor-pointer"
                        >
                          Quick View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 bg-white/40 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {companies.length} of {total} companies</span>
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

      {/* Company Detail Modal */}
      {selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-3xl w-full shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-5">
            
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-slate-900">
                    {selectedCompany.official_name || selectedCompany.input_name}
                  </h3>
                  {renderStatusBadge(selectedCompany.search_status)}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Input: {selectedCompany.input_name} • Domain: {selectedCompany.domain || '-'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditCompanyData({
                    official_name: selectedCompany.official_name || '',
                    website: selectedCompany.website || '',
                    industry: selectedCompany.industry || '',
                    description: selectedCompany.description || '',
                    city: selectedCompany.city || '',
                    address: selectedCompany.address || ''
                  })}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                  title="Edit Company Details"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleReEnrich(selectedCompany.id)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                  title="Re-run Grounded Enrichment"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    const id = selectedCompany.id;
                    setSelectedCompany(null);
                    navigate(`/companies/${id}`);
                  }}
                  className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                  title="Open Dedicated Full Page Profile"
                >
                  <span>Full Profile</span>
                  <ExternalLink className="w-3 h-3 text-blue-500" />
                </button>
                <button
                  onClick={() => setSelectedCompany(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Overview Info */}
            <div className="p-4 bg-slate-50 rounded-2xl text-xs space-y-2 text-slate-600">
              {selectedCompany.description && (
                <p className="leading-relaxed">{selectedCompany.description}</p>
              )}
              <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-200/60">
                {selectedCompany.website && (
                  <div>
                    <span className="font-semibold text-slate-500">Website: </span>
                    <a href={selectedCompany.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                      {selectedCompany.website}
                    </a>
                  </div>
                )}
                {selectedCompany.industry && (
                  <div><span className="font-semibold text-slate-500">Industry: </span>{selectedCompany.industry}</div>
                )}
                {selectedCompany.city && (
                  <div><span className="font-semibold text-slate-500">City: </span>{selectedCompany.city}</div>
                )}
                {selectedCompany.address && (
                  <div><span className="font-semibold text-slate-500">Address: </span>{selectedCompany.address}</div>
                )}
              </div>
            </div>

            {/* Modal Tabs Navigation */}
            <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold">
              <button
                onClick={() => setModalTab('decision_makers')}
                className={`pb-2.5 flex items-center gap-2 cursor-pointer transition-colors border-b-2 ${
                  modalTab === 'decision_makers'
                    ? 'border-fuchsia-600 text-fuchsia-600 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>HR & Decision Makers</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                  modalTab === 'decision_makers' ? 'bg-fuchsia-100 text-fuchsia-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {selectedCompany.professionals?.length || 0}
                </span>
              </button>

              <button
                onClick={() => setModalTab('contacts')}
                className={`pb-2.5 flex items-center gap-2 cursor-pointer transition-colors border-b-2 ${
                  modalTab === 'contacts'
                    ? 'border-fuchsia-600 text-fuchsia-600 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span>General Contacts</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                  modalTab === 'contacts' ? 'bg-fuchsia-100 text-fuchsia-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {selectedCompany.contacts?.length || 0}
                </span>
              </button>

              <button
                onClick={() => setModalTab('audit')}
                className={`pb-2.5 flex items-center gap-2 cursor-pointer transition-colors border-b-2 ${
                  modalTab === 'audit'
                    ? 'border-fuchsia-600 text-fuchsia-600 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Info className="w-4 h-4" />
                <span>Audit & Metadata</span>
              </button>
            </div>

            {/* Tab 1: HR & Decision Makers */}
            {modalTab === 'decision_makers' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Target People & Leadership
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Grounded professionals identified from official governance, team bios, and public business records.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDiscoverProfessionals(selectedCompany.id)}
                      disabled={isDiscoveringProfs}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-700 hover:to-indigo-700 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${isDiscoveringProfs ? 'animate-spin' : ''}`} />
                      <span>{isDiscoveringProfs ? 'Discovering...' : 'Discover HR & Leaders'}</span>
                    </button>
                    <button
                      onClick={() => setIsAddingProf(!isAddingProf)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Person</span>
                    </button>
                  </div>
                </div>

                {/* Add Professional Inline Form */}
                {isAddingProf && (
                  <div className="p-4 bg-fuchsia-50/40 border border-fuchsia-200 rounded-2xl space-y-3 text-xs animate-in fade-in">
                    <h5 className="font-bold text-slate-900">Add Professional Manually</h5>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-medium text-slate-600 block mb-0.5">Full Name *</label>
                        <input
                          type="text"
                          value={newProf.person_name}
                          onChange={(e) => setNewProf({ ...newProf, person_name: e.target.value })}
                          placeholder="e.g. Budi Santoso"
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="font-medium text-slate-600 block mb-0.5">Job Title *</label>
                        <input
                          type="text"
                          value={newProf.job_title}
                          onChange={(e) => setNewProf({ ...newProf, job_title: e.target.value })}
                          placeholder="e.g. HR Manager / Direktur Utama"
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="font-medium text-slate-600 block mb-0.5">Department</label>
                        <select
                          value={newProf.department}
                          onChange={(e) => setNewProf({ ...newProf, department: e.target.value })}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                        >
                          <option value="Human Resources">Human Resources</option>
                          <option value="People & Culture">People & Culture</option>
                          <option value="Talent Acquisition">Talent Acquisition</option>
                          <option value="Leadership / Board">Leadership / Board</option>
                          <option value="General Management">General Management</option>
                        </select>
                      </div>
                      <div>
                        <label className="font-medium text-slate-600 block mb-0.5">Seniority</label>
                        <select
                          value={newProf.seniority_level}
                          onChange={(e) => setNewProf({ ...newProf, seniority_level: e.target.value })}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                        >
                          <option value="C-Level / Board">C-Level / Board</option>
                          <option value="Director">Director</option>
                          <option value="Vice President">Vice President</option>
                          <option value="Head of Department">Head of Department</option>
                          <option value="Manager">Manager</option>
                          <option value="Lead">Lead</option>
                          <option value="Specialist">Specialist</option>
                        </select>
                      </div>
                      <div>
                        <label className="font-medium text-slate-600 block mb-0.5">Work Email</label>
                        <input
                          type="email"
                          value={newProf.contact_email}
                          onChange={(e) => setNewProf({ ...newProf, contact_email: e.target.value })}
                          placeholder="e.g. name@company.co.id"
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="font-medium text-slate-600 block mb-0.5">Phone / Ext</label>
                        <input
                          type="text"
                          value={newProf.contact_phone}
                          onChange={(e) => setNewProf({ ...newProf, contact_phone: e.target.value })}
                          placeholder="e.g. +62 21 555-0199"
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-fuchsia-200/50">
                      <button
                        onClick={() => setIsAddingProf(false)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveNewProf}
                        disabled={!newProf.person_name || !newProf.job_title}
                        className="px-4 py-1.5 rounded-lg text-white btn-primary-gradient font-semibold cursor-pointer disabled:opacity-50"
                      >
                        Save Professional
                      </button>
                    </div>
                  </div>
                )}

                {/* Professionals List */}
                {(!selectedCompany.professionals || selectedCompany.professionals.length === 0) ? (
                  <div className="p-8 text-center bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-500 space-y-2">
                    <Users className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="font-semibold text-slate-700">No HR or decision makers found yet</p>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                      Click "Discover HR & Leaders" to analyze official governance pages, executive teams, and public business profiles.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedCompany.professionals.map((prof) => (
                      <div
                        key={prof.id}
                        className={`p-4 bg-white border rounded-2xl transition-all ${
                          prof.is_do_not_contact
                            ? 'border-rose-200 bg-rose-50/20'
                            : 'border-slate-200 hover:border-fuchsia-200 shadow-sm'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">{prof.person_name}</span>
                              {prof.is_do_not_contact && (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                                  <Ban className="w-3 h-3" />
                                  <span>DNC</span>
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200">
                                {prof.seniority_level || 'Executive'}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">
                                {prof.department || 'HR / Leadership'}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                prof.verification_status === 'VERIFIED'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              }`}>
                                {prof.verification_status}
                              </span>
                            </div>

                            <div className="text-xs font-semibold text-fuchsia-950">
                              {prof.job_title}
                            </div>

                            {prof.relevance_reason && (
                              <div className="text-[11px] text-slate-600 flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-fuchsia-500 shrink-0" />
                                <span>{prof.relevance_reason}</span>
                                {prof.relevance_score && (
                                  <span className="font-bold text-fuchsia-700">
                                    ({Math.round(prof.relevance_score * 100)}% match)
                                  </span>
                                )}
                              </div>
                            )}

                            {prof.evidence_text && (
                              <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100 mt-1 max-w-xl">
                                "{prof.evidence_text}"
                              </p>
                            )}

                            {/* Contact info if available */}
                            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
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
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0A66C2] hover:underline bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200"
                                  title="Open verified LinkedIn profile"
                                >
                                  <LinkedinIcon className="w-3 h-3" />
                                  <span>LinkedIn Profile</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              ) : (
                                <a
                                  href={`https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(prof.person_name + ' ' + (selectedCompany.official_name || selectedCompany.input_name))}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 hover:text-[#0A66C2] hover:bg-sky-50 bg-slate-100 px-2 py-0.5 rounded-md transition-colors"
                                  title={`Find ${prof.person_name} on LinkedIn`}
                                >
                                  <LinkedinIcon className="w-3 h-3" />
                                  <span>Find on LinkedIn</span>
                                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Outreach Status Selector & Actions */}
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <div className="flex items-center gap-1.5">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Outreach:</label>
                              <select
                                value={prof.outreach_status || 'NEW_LEAD'}
                                onChange={(e) => handleProfStatusChange(prof.id, e.target.value)}
                                className="text-xs p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-700 cursor-pointer"
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

                            <button
                              onClick={() => handleProfDncToggle(prof.id, !!prof.is_do_not_contact)}
                              className={`text-[11px] font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                                prof.is_do_not_contact
                                  ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                                  : 'bg-slate-100 text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                              }`}
                            >
                              <Ban className="w-3 h-3" />
                              <span>{prof.is_do_not_contact ? 'Suppressed (DNC)' : 'Mark DNC'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Attribution bar */}
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 mt-2 border-t border-slate-100">
                          <span>Source: {prof.source_type?.replace(/_/g, ' ') || 'Official Governance'} • Verified: {prof.last_verified_at ? new Date(prof.last_verified_at).toLocaleDateString() : 'Recent'}</span>
                          {prof.source_url && (
                            <a
                              href={prof.source_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-500 hover:underline flex items-center gap-0.5 font-semibold"
                            >
                              <span>Open Source URL</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: General Contacts List */}
            {modalTab === 'contacts' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-slate-900">
                    Grounded Company Contacts ({selectedCompany.contacts?.length || 0})
                  </h4>
                  <button
                    onClick={() => setIsAddingContact(true)}
                    className="text-xs font-semibold text-fuchsia-600 hover:text-fuchsia-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Contact</span>
                  </button>
                </div>

                {selectedCompany.contacts?.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 rounded-2xl text-xs text-slate-400">
                    No verified contacts stored for this company.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {selectedCompany.contacts?.map((c) => {
                      const val = c.email || c.phone || c.address || c.url || c.raw_value || '-';
                      return (
                        <div key={c.id} className="p-3.5 bg-white border border-slate-200 rounded-2xl flex flex-col justify-between text-xs space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-700 uppercase text-[10px] bg-slate-100 px-2 py-0.5 rounded">
                                  {c.contact_type.replace(/_/g, ' ')}
                                </span>
                                {c.source_section && (
                                  <span className="font-bold text-fuchsia-700 uppercase text-[10px] bg-fuchsia-50 px-2 py-0.5 rounded">
                                    {c.source_section.replace(/_/g, ' ')}
                                  </span>
                                )}
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {c.verification_status?.replace(/_/g, ' ')}
                                </span>
                              </div>

                              {c.contact_person_name && (
                                <div className="font-semibold text-slate-900 mt-1">
                                  {c.contact_person_name}
                                  {c.job_title && <span className="text-slate-500 font-normal"> ({c.job_title})</span>}
                                </div>
                              )}

                              <div className="font-mono text-slate-900 font-bold text-sm mt-1">
                                {val}
                              </div>

                              {/* Evidence snippet */}
                              {c.evidence_text && (
                                <p className="text-[11px] text-slate-500 italic mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                  "{c.evidence_text}"
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => setSelectedEvidenceContact(c)}
                                className="p-1.5 text-fuchsia-600 hover:bg-fuchsia-50 rounded-lg transition-colors cursor-pointer"
                                title="Inspect Full Evidence"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => c.id && handleDeleteContact(c.id)}
                                className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Delete Contact"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Attribution bar */}
                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                            <span>Method: {(c.extraction_method || 'http_html').replace(/_/g, ' ')}</span>
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
            )}

            {/* Tab 3: Search Audit & Metadata */}
            {modalTab === 'audit' && (
              <div className="p-4 bg-slate-50 rounded-2xl space-y-4 text-xs">
                <h4 className="font-bold text-slate-900">System Audit & Grounding Metadata</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                    <span className="text-slate-400 text-[10px] font-bold uppercase">Search Status</span>
                    <div className="font-semibold text-slate-800">{selectedCompany.search_status}</div>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                    <span className="text-slate-400 text-[10px] font-bold uppercase">Confidence Score</span>
                    <div className="font-semibold text-slate-800">
                      {Math.round((selectedCompany.confidence_score || 0.9) * 100)}%
                    </div>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                    <span className="text-slate-400 text-[10px] font-bold uppercase">Official Domain</span>
                    <div className="font-semibold text-slate-800 font-mono">{selectedCompany.domain || '-'}</div>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                    <span className="text-slate-400 text-[10px] font-bold uppercase">Last Grounded Date</span>
                    <div className="font-semibold text-slate-800">
                      {selectedCompany.updated_at ? new Date(selectedCompany.updated_at).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                </div>

                {selectedCompany.linkedin_url && (
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                    <span className="text-slate-400 text-[10px] font-bold uppercase">LinkedIn Company Identifier</span>
                    <div className="font-mono text-[11px] text-blue-600 break-all">{selectedCompany.linkedin_url}</div>
                  </div>
                )}
              </div>
            )}

            {/* Edit Company Modal overlay if active */}
            {editCompanyData && (
              <div className="p-4 bg-fuchsia-50/50 border border-fuchsia-200 rounded-2xl space-y-3 text-xs">
                <h4 className="font-bold text-slate-900">Edit Company Information</h4>
                <div>
                  <label className="font-medium text-slate-600 block mb-0.5">Official Name</label>
                  <input
                    type="text"
                    value={editCompanyData.official_name || ''}
                    onChange={(e) => setEditCompanyData({ ...editCompanyData, official_name: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-600 block mb-0.5">Website</label>
                  <input
                    type="text"
                    value={editCompanyData.website || ''}
                    onChange={(e) => setEditCompanyData({ ...editCompanyData, website: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-600 block mb-0.5">Industry</label>
                  <input
                    type="text"
                    value={editCompanyData.industry || ''}
                    onChange={(e) => setEditCompanyData({ ...editCompanyData, industry: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setEditCompanyData(null)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEditCompany}
                    className="px-4 py-1.5 rounded-lg text-white btn-primary-gradient font-semibold cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {/* Add Contact inline form if active */}
            {isAddingContact && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-xs">
                <h4 className="font-bold text-slate-900">Add New Contact</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-medium text-slate-600 block mb-0.5">Contact Type</label>
                    <select
                      value={newContact.contact_type}
                      onChange={(e) => setNewContact({ ...newContact, contact_type: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg"
                    >
                      <option value="general_email">General Email</option>
                      <option value="sales_email">Sales Email</option>
                      <option value="procurement_email">Procurement Email</option>
                      <option value="office_phone">Office Phone</option>
                      <option value="whatsapp">WhatsApp</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-medium text-slate-600 block mb-0.5">Value (Email or Phone)</label>
                    <input
                      type="text"
                      value={newContact.email || newContact.phone || ''}
                      onChange={(e) => {
                        if (newContact.contact_type?.includes('phone') || newContact.contact_type === 'whatsapp') {
                          setNewContact({ ...newContact, phone: e.target.value, email: null });
                        } else {
                          setNewContact({ ...newContact, email: e.target.value, phone: null });
                        }
                      }}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => setIsAddingContact(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveContact}
                    className="px-4 py-1.5 rounded-lg text-white btn-primary-gradient font-semibold cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

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
                <div className="p-3 bg-fuchsia-50/50 border border-fuchsia-100 rounded-xl text-slate-800 leading-relaxed italic font-mono text-[11px]">
                  "{selectedEvidenceContact.evidence_text || 'Extracted directly from website structure.'}"
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <div>
                  <span className="font-semibold text-slate-500">Source Section:</span>
                  <div className="font-medium text-slate-800 capitalize">
                    {(selectedEvidenceContact.source_section || 'Official Website').replace(/_/g, ' ')}
                  </div>
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Extraction Method:</span>
                  <div className="font-medium text-slate-800 capitalize">
                    {(selectedEvidenceContact.extraction_method || 'HTTP Parser').replace(/_/g, ' ')}
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

    </div>
  );
};
