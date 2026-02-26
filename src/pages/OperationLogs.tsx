/**
 * 操作日志页面
 * 查看教师的操作记录
 */

import React, { useState, useEffect } from 'react';
import { operationLogService } from '../services';
import { ClipboardList, Search, Download, Trash2, RefreshCw, User, Calendar, Filter, CheckCircle, XCircle, Info } from 'lucide-react';

interface OperationLog {
  id: string;
  teacher_id: string;
  teacher_name: string;
  operation: string;
  target_type: string;
  target_id?: string;
  target_name?: string;
  details: string;
  user_agent?: string;
  timestamp: string;
}

export default function OperationLogs() {
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<OperationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterTeacher, setFilterTeacher] = useState('');
  const [filterOperation, setFilterOperation] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // 显示提示
  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // 加载日志数据
  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await operationLogService.getAll();
      setLogs(data);
      setFilteredLogs(data);
    } catch (error) {
      console.error('加载日志失败:', error);
      showToast('error', '加载日志失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  // 筛选日志
  useEffect(() => {
    let result = [...logs];

    // 按关键词搜索
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      result = result.filter(log =>
        log.teacher_name.toLowerCase().includes(keyword) ||
        log.operation.toLowerCase().includes(keyword) ||
        log.details.toLowerCase().includes(keyword) ||
        log.target_name?.toLowerCase().includes(keyword)
      );
    }

    // 按教师筛选
    if (filterTeacher) {
      result = result.filter(log => log.teacher_id === filterTeacher);
    }

    // 按操作类型筛选
    if (filterOperation) {
      result = result.filter(log => log.operation === filterOperation);
    }

    // 按日期范围筛选
    if (dateRange.start) {
      result = result.filter(log => log.timestamp >= dateRange.start);
    }
    if (dateRange.end) {
      result = result.filter(log => log.timestamp <= dateRange.end + 'T23:59:59');
    }

    setFilteredLogs(result);
  }, [logs, searchKeyword, filterTeacher, filterOperation, dateRange]);

  // 导出CSV
  const handleExport = () => {
    const csv = operationLogService.exportToCSV(filteredLogs);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `操作日志_${new Date().toLocaleDateString('zh-CN')}.csv`;
    link.click();
    showToast('success', '日志已导出');
  };

  // 清空日志
  const handleClear = async () => {
    if (!confirm('确定要清空所有操作日志吗？此操作不可恢复。')) {
      return;
    }
    try {
      await operationLogService.clearAll();
      setLogs([]);
      setFilteredLogs([]);
      showToast('success', '日志已清空');
    } catch (error) {
      console.error('清空日志失败:', error);
      showToast('error', '清空日志失败');
    }
  };

  // 获取唯一的教师列表
  const uniqueTeachers = Array.from(new Map(logs.map(log => [log.teacher_id, log.teacher_name])).entries());

  // 获取唯一的操作类型列表
  const uniqueOperations = Array.from(new Set(logs.map(log => log.operation)));

  // 格式化时间
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 页面标题 */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <ClipboardList className="w-8 h-8 text-purple-600" />
          <h1 className="text-2xl font-bold text-gray-900">操作日志</h1>
        </div>
        <p className="text-gray-600">查看教师的操作记录，包括排课、修改、删除等操作</p>
      </div>

      {/* 筛选和工具栏 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          {/* 搜索框 */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">搜索</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="搜索教师、操作、详情..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* 教师筛选 */}
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <User className="inline w-4 h-4 mr-1" />
              教师
            </label>
            <select
              value={filterTeacher}
              onChange={(e) => setFilterTeacher(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">全部教师</option>
              {uniqueTeachers.map(([id, name]) => (
                <option key={id} value={id}>{name} ({id})</option>
              ))}
            </select>
          </div>

          {/* 操作类型筛选 */}
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Filter className="inline w-4 h-4 mr-1" />
              操作类型
            </label>
            <select
              value={filterOperation}
              onChange={(e) => setFilterOperation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">全部操作</option>
              {uniqueOperations.map((op) => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
          </div>

          {/* 日期范围 */}
          <div className="min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="inline w-4 h-4 mr-1" />
              开始日期
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div className="min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* 工具按钮 */}
          <div className="flex gap-2">
            <button
              onClick={loadLogs}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              刷新
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              导出
            </button>
            <button
              onClick={handleClear}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              清空
            </button>
          </div>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600">总记录数</div>
          <div className="text-2xl font-bold text-purple-600">{logs.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600">筛选后</div>
          <div className="text-2xl font-bold text-blue-600">{filteredLogs.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600">操作教师数</div>
          <div className="text-2xl font-bold text-green-600">{uniqueTeachers.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600">操作类型数</div>
          <div className="text-2xl font-bold text-orange-600">{uniqueOperations.length}</div>
        </div>
      </div>

      {/* 日志列表 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
            加载中...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <ClipboardList className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            暂无操作日志
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">时间</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">教师</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">对象</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">详情</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {formatTime(log.timestamp)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{log.teacher_name}</div>
                      <div className="text-xs text-gray-500">{log.teacher_id}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {log.operation}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {log.target_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 max-w-md truncate" title={log.details}>
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 分页提示 */}
      {!loading && filteredLogs.length > 0 && (
        <div className="mt-4 text-center text-sm text-gray-500">
          显示 {filteredLogs.length} 条记录
          {filteredLogs.length !== logs.length && ` (共 ${logs.length} 条)`}
        </div>
      )}

      {/* Toast 提示 */}
      {toast && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 ${
          toast.type === 'success' ? 'bg-green-500 text-white' :
          toast.type === 'error' ? 'bg-red-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> :
           toast.type === 'error' ? <XCircle className="w-5 h-5" /> :
           <Info className="w-5 h-5" />}
          {toast.message}
        </div>
      )}
    </div>
  );
}
