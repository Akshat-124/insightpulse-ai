import React, { useRef, useState } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, FileText, Database } from 'lucide-react';
import { apiClient } from '../api/client';
import { TableInfo } from '../types';

interface FileUploadProps {
  onUploadSuccess: (tables: TableInfo[]) => void;
  tables: TableInfo[];
}

export const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess, tables }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setErrorMsg(null);
    setIsUploading(true);

    const files = Array.from(fileList);
    try {
      const registeredTables = await apiClient.uploadFiles(files);
      onUploadSuccess(registeredTables);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error uploading files');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
      {/* Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: isDragging ? '2px dashed #6366f1' : '1px dashed rgba(255, 255, 255, 0.15)',
          background: isDragging ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.02)',
          borderRadius: '10px',
          padding: '1.2rem',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.tsv,.txt"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <UploadCloud size={22} color="#818cf8" />
          </div>
          <div>
            <p style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.2rem' }}>
              {isUploading ? 'Validating & Ingesting...' : 'Drag & drop CSV files'}
            </p>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Supports .csv, .tsv (multi-file joins supported)
            </p>
          </div>
          <button
            type="button"
            className="btn-primary"
            style={{ fontSize: '0.75rem', padding: '0.4rem 0.9rem', marginTop: '0.3rem' }}
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            <UploadCloud size={14} />
            Browse Files
          </button>
        </div>
      </div>

      {/* Error message if any */}
      {errorMsg && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.6rem 0.8rem',
          borderRadius: '6px',
          background: 'rgba(244, 63, 94, 0.1)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          color: '#fda4af',
          fontSize: '0.75rem'
        }}>
          <AlertCircle size={15} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Uploaded Tables List */}
      {tables.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Active Tables in Memory ({tables.length})
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {tables.map((t) => (
              <div
                key={t.table_name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.3rem 0.65rem',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  color: '#cbd5e1'
                }}
              >
                <Database size={13} color="#10b981" />
                <strong style={{ color: '#f8fafc' }}>{t.table_name}</strong>
                <span style={{ color: 'var(--text-muted)' }}>({t.row_count.toLocaleString()} rows)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
