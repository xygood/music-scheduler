import React, { useState, useMemo, useCallback } from 'react';
import { 
  ChevronUp, 
  ChevronDown, 
  Settings, 
  Eye, 
  EyeOff, 
  CheckSquare, 
  Square,
  MoreVertical,
  Edit2,
  Trash2,
  Download,
  Upload,
  Filter,
  Search
} from 'lucide-react';
import type { Student } from '../types';

// 排序类型
export type SortDirection = 'asc' | 'desc' | null;

// 排序配置
export interface SortConfig {
  key: keyof Student | string;
  direction: SortDirection;
}

// 列配置
export interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  sortable: boolean;
  width?: string;
  render?: (value: any, record: Student) => React.ReactNode;
}

// 批量操作类型
export interface BatchAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  type: 'edit' | 'delete' | 'export' | 'custom';
  onClick: (selectedRecords: Student[]) => void;
  disabled?: (selectedRecords: Student[]) => boolean;
}

// 表格组件Props
interface EnhancedTableProps {
  data: Student[];
  columns: ColumnConfig[];
  sortConfig: SortConfig;
  onSort: (key: string) => void;
  selectedRecords: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  batchActions?: BatchAction[];
  loading?: boolean;
  emptyMessage?: string;
  onRecordEdit?: (record: Student) => void;
  onRecordDelete?: (record: Student) => void;
  className?: string;
}

// 表格头部组件
const TableHeader: React.FC<{
  column: ColumnConfig;
  sortConfig: SortConfig;
  onSort: (key: string) => void;
  isSelected: boolean;
  onSelectAll: () => void;
}> = ({ column, sortConfig, onSort, isSelected, onSelectAll }) => {
  const handleSort = () => {
    if (column.sortable) {
      onSort(column.key);
    }
  };

  const getSortIcon = () => {
    if (!column.sortable || sortConfig.key !== column.key || !sortConfig.direction) {
      return null;
    }
    return sortConfig.direction === 'asc' ? 
      <ChevronUp className="w-4 h-4" /> : 
      <ChevronDown className="w-4 h-4" />;
  };

  return (
    <th 
      className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
        column.sortable ? 'cursor-pointer hover:bg-gray-100 select-none' : ''
      }`}
      style={{ width: column.width }}
      onClick={handleSort}
    >
      <div className="flex items-center gap-2">
        {column.key === 'select' ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectAll();
            }}
            className="flex items-center justify-center w-4 h-4 rounded border border-gray-300 hover:border-gray-400"
          >
            {isSelected && <CheckSquare className="w-3 h-3 text-blue-600" />}
          </button>
        ) : (
          <>
            <span>{column.label}</span>
            {getSortIcon()}
          </>
        )}
      </div>
    </th>
  );
};

// 表格行组件
const TableRow: React.FC<{
  record: Student;
  columns: ColumnConfig[];
  isSelected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onEdit?: (record: Student) => void;
  onDelete?: (record: Student) => void;
  index: number;
}> = ({ record, columns, isSelected, onSelect, onEdit, onDelete, index }) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <tr 
      className={`transition-colors duration-150 ${
        isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
      } ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {columns.map((column) => (
        <td key={column.key} className="px-4 py-3 text-sm text-gray-900">
          {column.key === 'select' ? (
            <button
              onClick={() => onSelect(record.id, !isSelected)}
              className="flex items-center justify-center w-4 h-4 rounded border border-gray-300 hover:border-gray-400"
            >
              {isSelected && <CheckSquare className="w-3 h-3 text-blue-600" />}
            </button>
          ) : column.key === 'actions' ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onEdit?.(record)}
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                title="编辑"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete?.(record)}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                title="删除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            column.render ? column.render((record as any)[column.key], record) : (record as any)[column.key] || '-'
          )}
        </td>
      ))}
    </tr>
  );
};

// 主表格组件
export const EnhancedTable: React.FC<EnhancedTableProps> = ({
  data,
  columns,
  sortConfig,
  onSort,
  selectedRecords,
  onSelectionChange,
  batchActions = [],
  loading = false,
  emptyMessage = '暂无数据',
  onRecordEdit,
  onRecordDelete,
  className = ''
}) => {
  // 处理排序
  const handleSort = useCallback((key: string) => {
    const currentDirection = sortConfig.key === key ? sortConfig.direction : null;
    const newDirection: SortDirection = 
      currentDirection === 'asc' ? 'desc' : 
      currentDirection === 'desc' ? null : 'asc';
    
    onSort(newDirection === null ? key : key);
    
    // 如果设置为null，需要重置为默认排序
    if (newDirection === null) {
      onSort(''); // 触发重置排序
    }
  }, [sortConfig, onSort]);

  // 处理全选/取消全选
  const handleSelectAll = useCallback(() => {
    if (!data || !Array.isArray(data)) return;
    const allSelected = data.every(record => selectedRecords.includes(record.id));
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(data.map(record => record.id));
    }
  }, [data, selectedRecords, onSelectionChange]);

  // 处理单行选择
  const handleSelect = useCallback((id: string, selected: boolean) => {
    if (selected) {
      onSelectionChange([...selectedRecords, id]);
    } else {
      onSelectionChange(selectedRecords.filter(recordId => recordId !== id));
    }
  }, [selectedRecords, onSelectionChange]);

  // 检查是否全选
  const isAllSelected = data && data.length > 0 && data.every(record => selectedRecords.includes(record.id));
  const isPartiallySelected = data && data.some(record => selectedRecords.includes(record.id)) && !isAllSelected;

  // 过滤可见列
  const visibleColumns = useMemo(() => {
    return columns.filter(col => col.visible);
  }, [columns]);

  // 排序后的数据
  const sortedData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    if (!sortConfig.key || !sortConfig.direction) {
      return data;
    }

    return [...data].sort((a, b) => {
      let aValue = (a as any)[sortConfig.key];
      let bValue = (b as any)[sortConfig.key];

      // 处理空值
      if (aValue == null) aValue = '';
      if (bValue == null) bValue = '';

      // 数字排序
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // 字符串排序
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      
      if (sortConfig.direction === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });
  }, [data, sortConfig]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* 批量操作栏 */}
      {selectedRecords.length > 0 && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">
              已选择 {selectedRecords.length} 项
            </span>
            <div className="flex items-center gap-2">
              {batchActions && Array.isArray(batchActions) && batchActions.map((action) => (
                <button
                  key={action.key}
                  onClick={() => {
                    const selectedRecordsData = data && Array.isArray(data) ? data.filter(record => selectedRecords.includes(record.id)) : [];
                    action.onClick(selectedRecordsData);
                  }}
                  disabled={action.disabled?.(data && Array.isArray(data) ? data.filter(record => selectedRecords.includes(record.id)) : [])}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-md border transition-colors ${
                    action.disabled?.(data && Array.isArray(data) ? data.filter(record => selectedRecords.includes(record.id)) : [])
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {action.icon}
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 表格 */}
      <div className="overflow-x-auto p-2.5">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-white">
            <tr>
              {visibleColumns && visibleColumns.map((column) => (
                <TableHeader
                  key={column.key}
                  column={column}
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  isSelected={column.key === 'select' ? isAllSelected || isPartiallySelected : false}
                  onSelectAll={column.key === 'select' ? handleSelectAll : () => {}}
                />
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 group">
            {!sortedData || sortedData.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns ? visibleColumns.length : 0} className="px-4 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <Search className="w-12 h-12 text-gray-300" />
                    <p>{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              sortedData.map((record, index) => (
                <TableRow
                  key={record.id}
                  record={record}
                  columns={visibleColumns || []}
                  isSelected={selectedRecords.includes(record.id)}
                  onSelect={handleSelect}
                  onEdit={onRecordEdit}
                  onDelete={onRecordDelete}
                  index={index}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 表格底部信息 */}
      {sortedData && sortedData.length > 0 && (
        <div className="bg-white px-4 py-3 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>共 {sortedData.length} 条记录</span>
            {selectedRecords && selectedRecords.length > 0 && (
              <span>已选择 {selectedRecords.length} 项</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// 列设置组件
interface ColumnSettingsProps {
  columns: ColumnConfig[];
  onColumnsChange: (columns: ColumnConfig[]) => void;
}

export const ColumnSettings: React.FC<ColumnSettingsProps> = ({ columns, onColumnsChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggleColumn = (key: string) => {
    if (!columns || !Array.isArray(columns)) return;
    const updatedColumns = columns.map(col =>
      col.key === key ? { ...col, visible: !col.visible } : col
    );
    onColumnsChange(updatedColumns);
  };

  const visibleCount = columns && Array.isArray(columns) ? columns.filter(col => col.visible).length : 0;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50"
      >
        <Settings className="w-3 h-3" />
        列设置 ({visibleCount}/{columns.length})
      </button>

      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* 设置面板 */}
          <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-md shadow-lg border border-gray-200 z-20">
            <div className="p-3">
              <h4 className="text-sm font-medium text-gray-900 mb-2">显示/隐藏列</h4>
              <div className="space-y-2">
                {columns && Array.isArray(columns) && columns.map((column) => (
                  <label key={column.key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={column.visible}
                      onChange={() => handleToggleColumn(column.key)}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="flex-1">{column.label}</span>
                    {column.visible ? (
                      <Eye className="w-3 h-3 text-gray-400" />
                    ) : (
                      <EyeOff className="w-3 h-3 text-gray-400" />
                    )}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};