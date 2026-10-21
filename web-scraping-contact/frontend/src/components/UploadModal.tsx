import React, { useState, useRef } from 'react';
import { X, HelpCircle, FileSpreadsheet, Plus, CheckCircle2 } from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileSelected: (file: File) => void;
  isUploading?: boolean;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onFileSelected,
  isUploading = false
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setSelectedFile(file);
      } else {
        alert('Please upload an Excel file (.xlsx or .xls)');
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = () => {
    if (selectedFile) {
      onFileSelected(selectedFile);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden p-7 transition-all scale-100">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Upload Files</h2>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl py-10 px-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
            isDragging 
              ? 'border-fuchsia-500 bg-fuchsia-50/50 scale-[0.99]' 
              : 'border-slate-200 hover:border-fuchsia-300 hover:bg-slate-50/50'
          }`}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileInputChange} 
            accept=".xlsx,.xls" 
            className="hidden" 
          />

          {/* Overlapping Colorful Document Icons from reference image */}
          <div className="relative w-32 h-24 mb-4 flex items-center justify-center">
            {/* Left Pink Doc */}
            <div className="absolute left-3 w-14 h-18 bg-gradient-to-tr from-fuchsia-500 to-pink-500 rounded-xl shadow-md transform -rotate-12 flex flex-col p-2 justify-between">
              <div className="w-6 h-1 bg-white/70 rounded-full" />
              <div className="space-y-1">
                <div className="w-8 h-1 bg-white/50 rounded-full" />
                <div className="w-6 h-1 bg-white/50 rounded-full" />
              </div>
            </div>

            {/* Right Orange Doc */}
            <div className="absolute right-3 w-14 h-18 bg-gradient-to-tr from-orange-500 to-amber-400 rounded-xl shadow-md transform rotate-12 flex flex-col p-2 justify-between">
              <div className="w-6 h-1 bg-white/70 rounded-full" />
              <div className="space-y-1">
                <div className="w-8 h-1 bg-white/50 rounded-full" />
                <div className="w-6 h-1 bg-white/50 rounded-full" />
              </div>
            </div>

            {/* Center Cyan Doc (in front) */}
            <div className="absolute z-10 w-16 h-20 bg-gradient-to-tr from-cyan-400 to-blue-500 rounded-xl shadow-xl flex flex-col items-center justify-center p-2 text-white">
              <div className="w-8 h-8 rounded-full border-2 border-white/80 flex items-center justify-center">
                <Plus className="w-4 h-4 stroke-[3]" />
              </div>
            </div>
          </div>

          <p className="text-base font-semibold text-slate-800">
            Drag and drop files here
          </p>
          <p className="text-sm font-medium text-pink-500 mt-0.5 hover:underline">
            or choose file
          </p>
        </div>

        {/* Accepted formats note */}
        <div className="flex items-center justify-between text-xs text-slate-400 mt-3 px-1">
          <span>Accepted formats: .xlsx, .xls</span>
          <span>Maximum file size: 50MB</span>
        </div>

        {/* Uploaded Files List */}
        {selectedFile && (
          <div className="mt-5 space-y-2.5">
            <div className="flex items-center justify-between p-3.5 bg-slate-50/90 border border-slate-200/80 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-sm">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-800 line-clamp-1 max-w-xs">
                    {selectedFile.name}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                    <span>{formatFileSize(selectedFile.size)}</span>
                    <span>•</span>
                    <span className="text-pink-500 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      Ready to upload
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-slate-100">
          <button 
            type="button"
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 font-medium"
            onClick={() => alert("Make sure the Excel file has a column for company names (e.g. 'Nama Perusahaan'). You'll be able to preview and map the column next.")}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Help</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedFile || isUploading}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white btn-primary-gradient transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>Save & Preview</span>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
