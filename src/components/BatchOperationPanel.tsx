import React, { useState, useCallback, useRef } from 'react';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2,
  Eye,
  Edit3,
  Trash2,
  Save,
  X,
  RefreshCw,
  Settings,
  Filter,
  Search
} from 'lucide-react';
import { useNotification } from '../contexts/NotificationContext';
import { ConfirmationDialog } from './NotificationComponents';

// 批量操作类型
export type BatchOperation = 'edit' | 'delete' | 'import' | 'export';

// 操作配置接口
export interface BatchOperationConfig {
  type: BatchOperation;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  confirmRequired: boolean;
  fields?: BatchField[];
  validation?: (data: any[]) => Promise<{ valid: boolean; errors: string[] }>;
}

// 批量字段配置
export interface BatchField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'number' | 'checkbox' | 'date';
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  description?: string;
}

// 批量操作结果
export interface BatchOperationResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: string[];
  warnings: string[];
}

// 通用批量操作组件
interface BatchOperationProps {
  operation: BatchOperationConfig;
  data: any[];
  selectedRecords: string[];
  onExecute: (records: any[], options?: any) => Promise<BatchOperationResult>;
  onCancel: () => void;
  className?: string;
}

export const BatchOperationPanel: React.FC<BatchOperationProps> = ({
  operation,
  data,
  selectedRecords,
  onExecute,
  onCancel,
  className = ''
}) => {
  const { showSuccess, showError, showWarning } = useNotification();
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<BatchOperationResult | null>(null);
  const [selectedRecordsData, setSelectedRecordsData] = useState<any[]>([]);
  const [editedRecords, setEditedRecords] = useState<Record<string, any>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredData, setFilteredData] = useState<any[]>([]);

  // 初始化选中的数据
  React.useEffect(() => {
    const selectedData = data.filter(item => selectedRecords.includes(item.id));
    setSelectedRecordsData(selectedData);
    setFilteredData(selectedData);
  }, [data, selectedRecords]);

  // 搜索过滤
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    if (!term) {
      setFilteredData(selectedRecordsData);
    } else {
      const filtered = selectedRecordsData.filter(item => 
        Object.values(item).some(value => 
          String(value).toLowerCase().includes(term.toLowerCase())
        )
      );
      setFilteredData(filtered);
    }
  }, [selectedRecordsData]);

  // 执行批量操作
  const handleExecute = async () => {
    if (operation.confirmRequired && !showConfirm) {
      setShowConfirm(true);
      return;
    }

    setIsExecuting(true);
    setResult(null);

    try {
      const executeData = operation.type === 'edit' ? editedRecords : data.filter(item => selectedRecords.includes(item.id));
      const operationResult = await onExecute(executeData);
      
      setResult(operationResult);
      
      if (operationResult.success) {
        showSuccess(
          '批量操作完成',
          `成功处理 ${operationResult.processed} 条记录${operationResult.failed > 0 ? `，${operationResult.failed} 条失败` : ''}`
        );
      } else {
        showError('批量操作失败', operationResult.errors.join('; ') || '未知错误');
      }
    } catch (error) {
      console.error('批量操作执行失败:', error);
      showError('操作失败', '执行批量操作时发生错误');
    } finally {
      setIsExecuting(false);
    }
  };

  // 字段编辑组件
  const renderFieldEditor = (field: BatchField, record: any, recordId: string) => {
    const value = editedRecords[recordId]?.[field.key] ?? record[field.key];
    
    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => {
              const updated = { ...editedRecords };
              if (!updated[recordId]) updated[recordId] = {};
              updated[recordId][field.key] = e.target.value;
              setEditedRecords(updated);
            }}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        );
      
      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => {
              const updated = { ...editedRecords };
              if (!updated[recordId]) updated[recordId] = {};
              updated[recordId][field.key] = e.target.value;
              setEditedRecords(updated);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">请选择</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      
      case 'checkbox':
        return (
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => {
              const updated = { ...editedRecords };
              if (!updated[recordId]) updated[recordId] = {};
              updated[recordId][field.key] = e.target.checked;
              setEditedRecords(updated);
            }}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
        );
      
      default:
        return null;
    }
  };

  // 获取操作按钮文本
  const getExecuteButtonText = () => {
    if (isExecuting) return '处理中...';
    if (operation.confirmRequired && !showConfirm) return `确认${operation.title}`;
    return operation.title;
  };

  // 获取操作按钮样式
  const getExecuteButtonClass = () => {
    const baseClass = 'px-4 py-2 rounded-lg font-medium transition-all duration-200';
    
    if (isExecuting) {
      return `${baseClass} bg-gray-400 text-white cursor-not-allowed`;
    }
    
    switch (operation.type) {
      case 'edit':
        return `${baseClass} bg-blue-600 hover:bg-blue-700 text-white`;
      case 'delete':
        return `${baseClass} bg-red-600 hover:bg-red-700 text-white`;
      case 'import':
        return `${baseClass} bg-green-600 hover:bg-green-700 text-white`;
      case 'export':
        return `${baseClass} bg-purple-600 hover:bg-purple-700 text-white`;
      default:
        return `${baseClass} bg-gray-600 hover:bg-gray-700 text-white`;
    }
  };

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto ${className}`}>
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onCancel}></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
          {/* 头部 */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <operation.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{operation.title}</h3>
                  <p className="text-purple-100 text-sm">{operation.description}</p>
                </div>
              </div>
              <button
                onClick={onCancel}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  已选择 <strong className="text-purple-600">{selectedRecords.length}</strong> 条记录
                </span>
                {result && (
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                    result.success 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {result.success ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    {result.success 
                      ? `成功: ${result.processed}` 
                      : `失败: ${result.failed}`
                    }
                  </div>
                )}
              </div>

              {/* 搜索框 */}
              {operation.type === 'edit' && (
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="搜索记录..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 内容区域 */}
          <div className="bg-white px-6 py-4 max-h-96 overflow-y-auto">
            {operation.type === 'edit' && operation.fields ? (
              // 批量编辑模式
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {operation.fields.map((field) => (
                    <div key={field.key} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <label className="text-sm font-medium text-gray-900">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          {field.description && (
                            <p className="text-xs text-gray-500 mt-1">{field.description}</p>
                          )}
                        </div>
                      </div>
                      
                      {/* 批量应用按钮 */}
                      <div className="flex gap-2 mb-3">
                        <button
                          onClick={() => {
                            const updated = { ...editedRecords };
                            filteredData.forEach(record => {
                              if (!updated[record.id]) updated[record.id] = {};
                              // 这里可以设置默认值
                            });
                            setEditedRecords(updated);
                          }}
                          className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                        >
                          批量应用到当前筛选结果
                        </button>
                      </div>

                      {/* 数据表格 */}
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                学号/姓名
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {field.label}
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                原始值
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredData.map((record) => (
                              <tr key={record.id} className="hover:bg-gray-50">
                                <td className="px-3 py-2 whitespace-nowrap">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {record.student_id || record.name}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {record.name}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap">
                                  {renderFieldEditor(field, record, record.id)}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                  {String(record[field.key] || '-')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // 其他操作模式
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <operation.icon className="w-8 h-8 text-gray-400" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">{operation.title}</h4>
                <p className="text-gray-500 mb-4">{operation.description}</p>
                
                {result && (
                  <div className="space-y-2">
                    {result.errors.map((error, index) => (
                      <div key={index} className="flex items-center gap-2 text-red-600 text-sm">
                        <XCircle className="w-4 h-4" />
                        {error}
                      </div>
                    ))}
                    {result.warnings.map((warning, index) => (
                      <div key={index} className="flex items-center gap-2 text-yellow-600 text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        {warning}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 底部操作栏 */}
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              {filteredData.length !== selectedRecords.length && (
                <span>
                  显示 {filteredData.length} / {selectedRecords.length} 条记录
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={onCancel}
                disabled={isExecuting}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleExecute}
                disabled={isExecuting || filteredData.length === 0}
                className={getExecuteButtonClass()}
              >
                {isExecuting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {getExecuteButtonText()}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <operation.icon className="w-4 h-4" />
                    {getExecuteButtonText()}
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 确认对话框 */}
      <ConfirmationDialog
        isOpen={showConfirm}
        title="确认操作"
        message={`确定要执行批量${operation.title}操作吗？这将影响 ${filteredData.length} 条记录。`}
        confirmLabel={`确认${operation.title}`}
        cancelLabel="取消"
        onConfirm={() => {
          setShowConfirm(false);
          handleExecute();
        }}
        onCancel={() => setShowConfirm(false)}
        type="warning"
      />
    </div>
  );
};