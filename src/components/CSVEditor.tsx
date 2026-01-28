import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import '../styles/CSVEditor.css';
import TableView from './TableView';
import ImportExport from './ImportExport';
import SearchFilter from './SearchFilter';

interface CSVData {
  headers: string[];
  rows: Record<string, string>[];
}

const CSVEditor: React.FC = () => {
  const [csvData, setCsvData] = useState<CSVData>({ headers: [], rows: [] });
  const [filteredRows, setFilteredRows] = useState<Record<string, string>[]>([]);
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // Load initial CSV
  useEffect(() => {
    loadCSVFromPublic();
  }, []);

  // Update filtered rows when search term changes
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredRows(csvData.rows);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredRows(
        csvData.rows.filter(row =>
          Object.values(row).some(value =>
            String(value).toLowerCase().includes(term)
          )
        )
      );
    }
  }, [searchTerm, csvData]);

  const loadCSVFromPublic = async () => {
    try {
      const response = await fetch('/main.csv');
      const csvText = await response.text();
      
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results: any) => {
          if (results.data && results.data.length > 0) {
            const headers = Object.keys(results.data[0]);
            setCsvData({
              headers,
              rows: results.data
            });
          }
        },
        error: (error: any) => {
          console.error('Error parsing CSV:', error);
        }
      });
    } catch (error) {
      console.error('Error loading CSV:', error);
    }
  };

  const handleCellChange = (rowIndex: number, column: string, value: string) => {
    const newRows = [...csvData.rows];
    newRows[rowIndex] = {
      ...newRows[rowIndex],
      [column]: value
    };
    setCsvData({ ...csvData, rows: newRows });
  };

  const handleAddRow = () => {
    const newRow: Record<string, string> = {};
    csvData.headers.forEach(header => {
      newRow[header] = '';
    });
    setCsvData({
      ...csvData,
      rows: [...csvData.rows, newRow]
    });
  };

  const handleDeleteRow = (rowIndex: number) => {
    const newRows = csvData.rows.filter((_, i) => i !== rowIndex);
    setCsvData({ ...csvData, rows: newRows });
  };

  const handleAddColumn = (columnName: string) => {
    if (columnName.trim() && !csvData.headers.includes(columnName)) {
      const newHeaders = [...csvData.headers, columnName];
      const newRows = csvData.rows.map(row => ({
        ...row,
        [columnName]: ''
      }));
      setCsvData({
        headers: newHeaders,
        rows: newRows
      });
    }
  };

  const handleDeleteColumn = (columnName: string) => {
    const newHeaders = csvData.headers.filter(h => h !== columnName);
    const newRows = csvData.rows.map(row => {
      const newRow = { ...row };
      delete newRow[columnName];
      return newRow;
    });
    setCsvData({
      headers: newHeaders,
      rows: newRows
    });
  };

  const handleSelectRow = (rowIndex: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(rowIndex)) {
      newSelected.delete(rowIndex);
    } else {
      newSelected.add(rowIndex);
    }
    setSelectedRows(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === filteredRows.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredRows.map((_, i) => i)));
    }
  };

  const handleDeleteSelected = () => {
    if (window.confirm(`Delete ${selectedRows.size} row(s)?`)) {
      const newRows = csvData.rows.filter((_, i) => !selectedRows.has(i));
      setCsvData({ ...csvData, rows: newRows });
      setSelectedRows(new Set());
    }
  };

  return (
    <div className="csv-editor">
      <div className="editor-header">
        <h1>CSV Editor</h1>
        <div className="header-actions">
          <SearchFilter value={searchTerm} onChange={setSearchTerm} />
          <ImportExport csvData={csvData} onImport={(data) => setCsvData(data)} />
        </div>
      </div>

      <div className="toolbar">
        <button className="btn btn-primary" onClick={handleAddRow}>
          + Add Row
        </button>
        {selectedRows.size > 0 && (
          <button className="btn btn-danger" onClick={handleDeleteSelected}>
            Delete Selected ({selectedRows.size})
          </button>
        )}
        <button 
          className="btn btn-secondary" 
          onClick={() => {
            const colName = prompt('Enter column name:');
            if (colName) handleAddColumn(colName);
          }}
        >
          + Add Column
        </button>
      </div>

      <TableView
        headers={csvData.headers}
        rows={filteredRows}
        editingCell={editingCell}
        selectedRows={selectedRows}
        onCellChange={handleCellChange}
        onEditingCellChange={setEditingCell}
        onDeleteRow={handleDeleteRow}
        onDeleteColumn={handleDeleteColumn}
        onSelectRow={handleSelectRow}
        onSelectAll={handleSelectAll}
      />
    </div>
  );
};

export default CSVEditor;
