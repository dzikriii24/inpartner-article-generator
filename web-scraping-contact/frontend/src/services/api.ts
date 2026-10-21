const API_BASE = import.meta.env.VITE_API_URL || '';

export interface ContactItem {
  id?: number;
  contact_type: string;
  contact_person_name?: string | null;
  job_title?: string | null;
  department?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  url?: string | null;
  source_url?: string | null;
  source_domain?: string | null;
  source_page_title?: string | null;
  source_section?: string | null;
  evidence_text?: string | null;
  extraction_method?: string | null;
  source_type?: string;
  verification_status?: string;
  confidence_score?: number;
  raw_value?: string | null;
  notes?: string | null;
  created_at?: string;
}

export interface CompanyItem {
  id: number;
  input_name: string;
  official_name?: string | null;
  website?: string | null;
  domain?: string | null;
  industry?: string | null;
  description?: string | null;
  city?: string | null;
  province?: string | null;
  address?: string | null;
  search_status?: string | null;
  audit_metadata?: string | null;
  matching_confidence?: number;
  total_contacts: number;
  created_at: string;
  updated_at: string;
  contacts?: ContactItem[];
}

export interface SearchHistoryItem {
  id: number;
  query: string;
  search_type: string;
  company_id?: number | null;
  status: string;
  contacts_found_count: number;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
}

export interface BatchItem {
  id: number;
  original_filename: string;
  selected_sheet: string;
  selected_company_column: string;
  total_rows: number;
  valid_rows: number;
  processed_rows: number;
  success_rows: number;
  partial_rows: number;
  failed_rows: number;
  status: string;
  progress_percent: number;
  created_at: string;
  completed_at?: string | null;
}

export interface ExportItem {
  id: number;
  filename: string;
  batch_id?: number | null;
  export_format: string;
  total_companies: number;
  total_contacts: number;
  file_size: number;
  is_available: boolean;
  download_url: string;
  created_at: string;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    let errorMsg = `Error ${response.status}: ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson.detail) errorMsg = errJson.detail;
    } catch {}
    throw new Error(errorMsg);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Stats
  getDashboardStats: () => request<any>('/api/stats/dashboard'),

  // Companies
  getCompanies: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request<any>(`/api/companies?${qs}`);
  },
  getCompany: (id: number) => request<any>(`/api/companies/${id}`),
  updateCompany: (id: number, data: any) => request<any>(`/api/companies/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  reEnrichCompany: (id: number) => request<any>(`/api/companies/${id}/enrich`, {
    method: 'POST'
  }),
  addContact: (companyId: number, data: any) => request<any>(`/api/companies/${companyId}/contacts`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateContact: (contactId: number, data: any) => request<any>(`/api/companies/contacts/${contactId}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  deleteContact: (contactId: number) => request<any>(`/api/companies/contacts/${contactId}`, {
    method: 'DELETE'
  }),

  // Search
  searchCompany: (company_name: string) => request<any>('/api/companies/search', {
    method: 'POST',
    body: JSON.stringify({ company_name })
  }),
  batchSearch: (companies: string[]) => request<any>('/api/companies/batch-search', {
    method: 'POST',
    body: JSON.stringify({ companies })
  }),
  getAutocomplete: (q: string) => request<any>(`/api/companies/autocomplete?q=${encodeURIComponent(q)}`),
  getSearchHistory: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request<any>(`/api/search-history?${qs}`);
  },
  getSearchHistoryDetail: (id: number) => request<any>(`/api/search-history/${id}`),

  // Imports
  uploadExcel: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<any>('/api/imports/upload', {
      method: 'POST',
      body: formData
    });
  },
  previewSheet: (filePath: string, sheetName: string, companyColumn: string) => request<any>('/api/imports/preview', {
    method: 'POST',
    body: JSON.stringify({ file_path: filePath, sheet_name: sheetName, company_column: companyColumn })
  }),
  createBatch: (data: { file_path: string; original_filename: string; sheet_name: string; company_column: string }) => request<any>('/api/imports', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getImportBatches: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request<any>(`/api/imports?${qs}`);
  },
  getBatchDetail: (id: number, params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request<any>(`/api/imports/${id}?${qs}`);
  },
  startBatch: (id: number) => request<any>(`/api/imports/${id}/process`, { method: 'POST' }),
  cancelBatch: (id: number) => request<any>(`/api/imports/${id}/cancel`, { method: 'POST' }),
  retryFailedBatch: (id: number) => request<any>(`/api/imports/${id}/retry-failed`, { method: 'POST' }),

  // Exports
  createExport: (data: { batch_id?: number; company_ids?: number[]; export_all?: boolean }) => request<any>('/api/exports', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getExports: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request<any>(`/api/exports?${qs}`);
  },
  getDownloadUrl: (id: number) => `${API_BASE}/api/exports/${id}/download`,

  // Settings
  getSettings: () => request<any>('/api/settings'),
};
