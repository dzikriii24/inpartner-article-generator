import React, { useState, useEffect } from 'react';
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
  Info
} from 'lucide-react';
import { api, CompanyItem, ContactItem } from '../services/api';

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

  // Selected company detail modal
  const [selectedCompany, setSelectedCompany] = useState<CompanyItem | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Evidence Drawer modal
  const [selectedEvidenceContact, setSelectedEvidenceContact] = useState<ContactItem | null>(null);

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
                <th className="p-4 text-center">Contacts</th>
                <th className="p-4 text-center">Confidence</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white/70">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-fuchsia-600" />
                    <span>Loading companies...</span>
                  </td>
                </tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">No companies found</p>
                    <p className="text-[11px] text-slate-400 mt-1">Try another filter or search keyword.</p>
                  </td>
                </tr>
              ) : (
                companies.map((comp) => (
                  <tr key={comp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-bold text-slate-900">{comp.input_name}</td>
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
                      <span className="px-2.5 py-0.5 rounded-full font-bold bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200">
                        {comp.total_contacts}
                      </span>
                    </td>
                    <td className="p-4 text-center font-bold text-slate-700">
                      {Math.round((comp.matching_confidence || 0.5) * 100)}%
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleOpenDetail(comp.id)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-white hover:border-fuchsia-300 transition-colors shadow-xs cursor-pointer"
                      >
                        Details
                      </button>
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

            {/* Contacts List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-slate-900">
                  Grounded Contacts ({selectedCompany.contacts?.length || 0})
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
