import React from 'react';
import '../styles/TableView.css';

interface TableViewProps {
  headers: string[];
  rows: Record<string, string>[];
  editingCell: { row: number; col: string } | null;
  selectedRows: Set<number>;
  onCellChange: (rowIndex: number, column: string, value: string) => void;
  onEditingCellChange: (cell: { row: number; col: string } | null) => void;
  onDeleteRow: (rowIndex: number) => void;
  onDeleteColumn: (columnName: string) => void;
  onSelectRow: (rowIndex: number) => void;
  onSelectAll: () => void;
}

const TableView: React.FC<TableViewProps> = ({
  headers,
  rows,
  editingCell,
  selectedRows,
  onCellChange,
  onEditingCellChange,
  onDeleteRow,
  onDeleteColumn,
  onSelectRow,
  onSelectAll
}) => {
  return (
    <div className="table-container">
      <table className="csv-table">
        <thead>
          <tr>
            <th className="checkbox-col">
              <input
                type="checkbox"
                checked={selectedRows.size > 0 && selectedRows.size === rows.length}
                onChange={onSelectAll}
                title="Select all"
              />
            </th>
            {headers.map(header => (
              <th key={header} className="header-cell">
                <div className="header-content">
                  <span>{header}</span>
                  <button
                    className="btn-delete-col"
                    onClick={() => {
                      if (window.confirm(`Delete column "${header}"?`)) {
                        onDeleteColumn(header);
                      }
                    }}
                    title="Delete column"
                  >
                    ×
                  </button>
                </div>
              </th>
            ))}
            <th className="action-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length + 2} className="empty-message">
                No data available. Click "Add Row" to start editing.
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={selectedRows.has(rowIndex) ? 'selected' : ''}
              >
                <td className="checkbox-col">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(rowIndex)}
                    onChange={() => onSelectRow(rowIndex)}
                  />
                </td>
                {headers.map(header => (
                  <td
                    key={`${rowIndex}-${header}`}
                    className="data-cell"
                    onDoubleClick={() => onEditingCellChange({ row: rowIndex, col: header })}
                  >
                    {editingCell?.row === rowIndex && editingCell?.col === header ? (
                      <input
                        autoFocus
                        type="text"
                        value={row[header] || ''}
                        onChange={(e) => onCellChange(rowIndex, header, e.target.value)}
                        onBlur={() => onEditingCellChange(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') onEditingCellChange(null);
                          if (e.key === 'Escape') onEditingCellChange(null);
                        }}
                      />
                    ) : (
                      <span className="cell-content" title={row[header]}>
                        {row[header] || '-'}
                      </span>
                    )}
                  </td>
                ))}
                <td className="action-col">
                  <button
                    className="btn-delete-row"
                    onClick={() => {
                      if (window.confirm('Delete this row?')) {
                        onDeleteRow(rowIndex);
                      }
                    }}
                    title="Delete row"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TableView;
