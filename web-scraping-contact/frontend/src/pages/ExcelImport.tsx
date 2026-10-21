import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Play, 
  Square, 
  RotateCcw, 
  Download, 
  Table, 
  ArrowRight,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { api } from '../services/api';
import { UploadModal } from '../components/UploadModal';

interface ExcelImportProps {
  initialBatchId?: number;
  onOpenUploadModal?: boolean;
}

export const ExcelImport: React.FC<ExcelImportProps> = ({ initialBatchId }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Uploaded file info & inspection
  const [uploadedInspection, setUploadedInspection] = useState<any>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('Sheet1');
  const [selectedColumn, setSelectedColumn] = useState<string>('Nama Perusahaan');
  
  // Sheet Preview
  const [previewData, setPreviewData] = useState<any>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Active Batch Monitoring
  const [activeBatch, setActiveBatch] = useState<any>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [itemPage, setItemPage] = useState(1);

  useEffect(() => {
    if (initialBatchId) {
      loadBatch(initialBatchId);
    }
  }, [initialBatchId]);

  // Polling active batch
  useEffect(() => {
    let interval: any;
    if (activeBatch && (activeBatch.status === 'PROCESSING' || isPolling)) {
      interval = setInterval(() => {
        loadBatch(activeBatch.id);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [activeBatch?.id, activeBatch?.status, isPolling]);

  const loadBatch = async (batchId: number) => {
    try {
      const data = await api.getBatchDetail(batchId, { item_page: itemPage, item_limit: 30 });
      setActiveBatch(data);
      if (data.status !== 'PROCESSING') {
        setIsPolling(false);
      }
    } catch (err) {
      console.error('Failed to load batch:', err);
    }
  };

  const handleFileUploaded = async (file: File) => {
    try {
      setIsUploading(true);
      const inspection = await api.uploadExcel(file);
      setUploadedInspection(inspection);
      setIsModalOpen(false);

      // Default sheet and column
      if (inspection.sheets?.length > 0) {
        const firstSheet = inspection.sheets[0];
        setSelectedSheet(firstSheet.sheet_name);
        setSelectedColumn(firstSheet.detected_company_column || firstSheet.headers[0] || 'Nama Perusahaan');
        loadSheetPreview(inspection.file_path, firstSheet.sheet_name, firstSheet.detected_company_column || firstSheet.headers[0]);
      }
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const loadSheetPreview = async (filePath: string, sheet: string, column: string) => {
    try {
      setIsPreviewLoading(true);
      const prev = await api.previewSheet(filePath, sheet, column);
      setPreviewData(prev);
    } catch (err: any) {
      console.error('Failed to load sheet preview:', err);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleConfirmAndStartBatch = async () => {
    if (!uploadedInspection) return;
    try {
      const created = await api.createBatch({
        file_path: uploadedInspection.file_path,
        original_filename: uploadedInspection.file_name,
        sheet_name: selectedSheet,
        company_column: selectedColumn
      });

      // Start processing
      await api.startBatch(created.batch_id);
      setIsPolling(true);
      loadBatch(created.batch_id);
      setUploadedInspection(null);
      setPreviewData(null);
    } catch (err: any) {
      alert(`Failed to start batch: ${err.message}`);
    }
  };

  const handleCancelBatch = async () => {
    if (!activeBatch) return;
    try {
      await api.cancelBatch(activeBatch.id);
      loadBatch(activeBatch.id);
    } catch (err: any) {
      alert(`Failed to cancel: ${err.message}`);
    }
  };

  const handleRetryFailed = async () => {
    if (!activeBatch) return;
    try {
      await api.retryFailedBatch(activeBatch.id);
      setIsPolling(true);
      loadBatch(activeBatch.id);
    } catch (err: any) {
      alert(`Failed to retry: ${err.message}`);
    }
  };

  const handleResumeBatch = async () => {
    if (!activeBatch) return;
    try {
      await api.startBatch(activeBatch.id);
      setIsPolling(true);
      loadBatch(activeBatch.id);
    } catch (err: any) {
      alert(`Failed to resume: ${err.message}`);
    }
  };

  const handleDownloadExport = async () => {
    if (!activeBatch) return;
    try {
      const res = await api.createExport({ batch_id: activeBatch.id });
      window.open(api.getDownloadUrl(res.export_id), '_blank');
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      
      {/* Upload Trigger / Header Banner */}
      <div className="glass-panel rounded-3xl p-6 border border-white/60 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Excel Pipeline Import & Batch Enrichment</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Upload any pipeline spreadsheet (e.g. Pipeline AR-SR.xlsx) containing company names. Map your columns, review the sample rows, and let the scraper enrich contacts in background.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3 rounded-2xl text-sm font-semibold text-white btn-primary-gradient flex items-center gap-2 shadow-md shadow-fuchsia-500/25 shrink-0 cursor-pointer"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Excel File</span>
        </button>
      </div>

      {/* STEP 2: Sheet & Column Mapping + Preview */}
      {uploadedInspection && previewData && (
        <div className="glass-panel rounded-3xl p-6 border border-fuchsia-200/50 space-y-6 animate-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <div className="text-xs font-bold text-fuchsia-600 uppercase tracking-wider">Step 2 of 2</div>
              <h3 className="text-lg font-bold text-slate-900 mt-0.5">Map Columns & Verify Preview</h3>
              <p className="text-xs text-slate-400">File: {uploadedInspection.file_name} ({(uploadedInspection.file_size / 1024).toFixed(1)} KB)</p>
            </div>

            <button
              onClick={handleConfirmAndStartBatch}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white btn-primary-gradient flex items-center gap-2 shadow-md shadow-fuchsia-500/25 cursor-pointer"
            >
              <span>Start Batch Enrichment</span>
              <Play className="w-4 h-4 fill-white" />
            </button>
          </div>

          {/* Selectors and Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Sheet Selector */}
            <div className="p-4 bg-white/80 border border-slate-200 rounded-2xl">
              <label className="text-xs font-semibold text-slate-500 block mb-1">Select Sheet</label>
              <select
                value={selectedSheet}
                onChange={(e) => {
                  setSelectedSheet(e.target.value);
                  loadSheetPreview(uploadedInspection.file_path, e.target.value, selectedColumn);
                }}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none"
              >
                {uploadedInspection.sheets.map((s: any) => (
                  <option key={s.sheet_name} value={s.sheet_name}>{s.sheet_name}</option>
                ))}
              </select>
            </div>

            {/* Column Selector */}
            <div className="p-4 bg-white/80 border border-slate-200 rounded-2xl">
              <label className="text-xs font-semibold text-slate-500 block mb-1">Company Name Column (Required)</label>
              <select
                value={selectedColumn}
                onChange={(e) => {
                  setSelectedColumn(e.target.value);
                  loadSheetPreview(uploadedInspection.file_path, selectedSheet, e.target.value);
                }}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none"
              >
                {uploadedInspection.sheets
                  .find((s: any) => s.sheet_name === selectedSheet)?.headers.map((h: string, idx: number) => (
                    <option key={idx} value={h}>{h}</option>
                  ))
                }
              </select>
            </div>

            {/* Stats Breakdown */}
            <div className="p-4 bg-white/80 border border-slate-200 rounded-2xl flex items-center justify-around text-center">
              <div>
                <div className="text-xs text-slate-400 font-medium">Valid Companies</div>
                <div className="text-xl font-extrabold text-emerald-600 mt-0.5">{previewData.valid_rows}</div>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div>
                <div className="text-xs text-slate-400 font-medium">Empty Rows</div>
                <div className="text-xl font-extrabold text-slate-400 mt-0.5">{previewData.empty_rows}</div>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div>
                <div className="text-xs text-slate-400 font-medium">Duplicates</div>
                <div className="text-xl font-extrabold text-amber-500 mt-0.5">{previewData.duplicate_rows}</div>
              </div>
            </div>

          </div>

          {/* Data Preview Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Sample Rows (First 10)</span>
              <span className="text-xs text-slate-400">Total in file: {previewData.total_rows} rows</span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-800 font-semibold">
                  <tr>
                    <th className="p-3 w-12 text-center">#</th>
                    {previewData.preview_rows.length > 0 && 
                      Object.keys(previewData.preview_rows[0]).map((h, i) => (
                        <th key={i} className={`p-3 ${h === selectedColumn ? 'text-fuchsia-600 font-bold bg-fuchsia-50/50' : ''}`}>
                          {h}
                          {h === selectedColumn && <span className="ml-1 text-[10px] text-fuchsia-500">(Target)</span>}
                        </th>
                      ))
                    }
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewData.preview_rows.map((row: any, rIdx: number) => (
                    <tr key={rIdx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3 text-center text-slate-400 font-mono">{rIdx + 1}</td>
                      {Object.keys(row).map((k, cIdx) => (
                        <td key={cIdx} className={`p-3 ${k === selectedColumn ? 'font-semibold text-slate-900 bg-fuchsia-50/20' : ''}`}>
                          {row[k]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* STEP 3: Live Batch Progress Monitor */}
      {activeBatch && (
        <div className="glass-panel rounded-3xl p-6 border border-white/60 space-y-6 animate-in slide-in-from-bottom-2 duration-300">
          
          {/* Header & Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">
                  Batch #{activeBatch.id}: {activeBatch.original_filename}
                </h3>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  activeBatch.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                  activeBatch.status === 'PROCESSING' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 animate-pulse' :
                  activeBatch.status === 'PARTIAL' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                  activeBatch.status === 'CANCELLED' ? 'bg-slate-100 text-slate-600' :
                  'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {activeBatch.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Started: {activeBatch.created_at ? new Date(activeBatch.created_at).toLocaleTimeString() : '-'} • 
                Sheet: {activeBatch.selected_sheet} • Column: {activeBatch.selected_company_column}
              </p>
            </div>

            {/* Batch Action Buttons */}
            <div className="flex items-center gap-2">
              {activeBatch.status === 'PROCESSING' && (
                <button
                  onClick={handleCancelBatch}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-1.5 transition-colors"
                >
                  <Square className="w-3.5 h-3.5 fill-rose-600" />
                  <span>Pause / Cancel</span>
                </button>
              )}

              {activeBatch.status !== 'PROCESSING' && (activeBatch.processed_rows < activeBatch.valid_rows || activeBatch.status === 'CANCELLED' || activeBatch.status === 'PENDING') && (
                <button
                  onClick={handleResumeBatch}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Resume / Start</span>
                </button>
              )}

              {activeBatch.failed_rows > 0 && activeBatch.status !== 'PROCESSING' && (
                <button
                  onClick={handleRetryFailed}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry ({activeBatch.failed_rows}) Failed</span>
                </button>
              )}

              <button
                onClick={handleDownloadExport}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white btn-primary-gradient flex items-center gap-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Results (.xlsx)</span>
              </button>
            </div>
          </div>

          {/* Progress Bar & Counters */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-600">
                Progress: {activeBatch.processed_rows} / {activeBatch.valid_rows} companies
              </span>
              <span className="text-fuchsia-600 font-bold">{activeBatch.progress_percent}%</span>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5">
              <div 
                className="bg-gradient-to-r from-fuchsia-500 via-indigo-600 to-orange-400 h-2 rounded-full transition-all duration-300"
                style={{ width: `${activeBatch.progress_percent}%` }}
              />
            </div>

            {/* Mini KPIs */}
            <div className="grid grid-cols-4 gap-2 pt-2">
              <div className="p-3 bg-white/70 rounded-xl border border-slate-200 text-center">
                <div className="text-[11px] text-slate-400 font-medium">Processed</div>
                <div className="text-base font-bold text-slate-800">{activeBatch.processed_rows}</div>
              </div>
              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 text-center">
                <div className="text-[11px] text-emerald-600 font-medium">Completed</div>
                <div className="text-base font-bold text-emerald-700">{activeBatch.success_rows}</div>
              </div>
              <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 text-center">
                <div className="text-[11px] text-amber-600 font-medium">Partial</div>
                <div className="text-base font-bold text-amber-700">{activeBatch.partial_rows}</div>
              </div>
              <div className="p-3 bg-rose-50/70 rounded-xl border border-rose-200 text-center">
                <div className="text-[11px] text-rose-600 font-medium">Failed</div>
                <div className="text-base font-bold text-rose-700">{activeBatch.failed_rows}</div>
              </div>
            </div>
          </div>

          {/* Batch Items List Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Company Items in Batch</h4>
              <span className="text-xs text-slate-400">Showing {activeBatch.items?.length || 0} items</span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-800 font-semibold">
                  <tr>
                    <th className="p-3 w-12 text-center">Row</th>
                    <th className="p-3">Input Company Name</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Enriched Official Name</th>
                    <th className="p-3">Website</th>
                    <th className="p-3 text-center">Contacts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeBatch.items?.map((it: any) => (
                    <tr key={it.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3 text-center text-slate-400 font-mono">{it.row_number}</td>
                      <td className="p-3 font-semibold text-slate-800">{it.input_company_name}</td>
                      <td className="p-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          it.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          it.status === 'PROCESSING' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 animate-pulse' :
                          it.status === 'PARTIAL' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          it.status === 'FAILED' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {it.status}
                        </span>
                      </td>
                      <td className="p-3 font-medium text-slate-700">
                        {it.company?.official_name || '-'}
                      </td>
                      <td className="p-3 text-slate-500">
                        {it.company?.website ? (
                          <a href={it.company.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                            <span>{it.company.website}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ) : '-'}
                      </td>
                      <td className="p-3 text-center font-bold text-slate-700">
                        {it.company?.total_contacts ?? '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* Upload Modal component */}
      <UploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onFileSelected={handleFileUploaded}
        isUploading={isUploading}
      />

    </div>
  );
};
