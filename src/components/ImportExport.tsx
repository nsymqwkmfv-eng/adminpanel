import React, { useRef } from 'react';
import Papa from 'papaparse';
import '../styles/ImportExport.css';

interface CSVData {
  headers: string[];
  rows: Record<string, string>[];
}

interface ImportExportProps {
  csvData: CSVData;
  onImport: (data: CSVData) => void;
}

const ImportExport: React.FC<ImportExportProps> = ({ csvData, onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    if (csvData.rows.length === 0) {
      alert('No data to export');
      return;
    }

    const csv = Papa.unparse({
      fields: csvData.headers,
      data: csvData.rows.map(row => csvData.headers.map(h => row[h] || ''))
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => {
        if (results.data && results.data.length > 0) {
          const headers = Object.keys(results.data[0]);
          onImport({
            headers,
            rows: results.data
          });
          alert('CSV imported successfully');
        }
      },
      error: (error: any) => {
        alert(`Error importing CSV: ${error.message}`);
      }
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="import-export">
      <button className="btn btn-success" onClick={handleExport}>
        📥 Export CSV
      </button>
      <button
        className="btn btn-info"
        onClick={() => fileInputRef.current?.click()}
      >
        📤 Import CSV
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleImport}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default ImportExport;
