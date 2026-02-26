// 分配历史记录组件 - 阶段二：历史记录系统

import React, { useState, useEffect } from 'react';
import {
  Clock,
  User,
  UserPlus,
  UserMinus,
  Edit3,
  Search,
  Filter,
  Download,
  Calendar,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import { AllocationHistory, AllocationStats } from '../services/allocationValidationService';

interface AllocationHistoryProps {
  history: AllocationHistory[];
  stats: AllocationStats;
  onFilterChange?: (filters: HistoryFilters) => void;
  onExportHistory?: () => void;
}

interface HistoryFilters {
  studentId?: string;
  teacherId?: string;
  dateRange?: { start: Date; end: Date };
  action?: 'assign' | 'unassign' | 'modify' | 'bulk_assign' | 'bulk_unassign';
  success?: boolean;
}

const AllocationHistoryComponent: React.FC<AllocationHistoryProps> = ({
  history,
  stats,
  onFilterChange,
  onExportHistory
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<HistoryFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  // 切换展开状态
  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  // 获取操作图标
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'assign': return <UserPlus className="w-4 h-4 text-green-600" />;
      case 'unassign': return <UserMinus className="w-4 h-4 text-red-600" />;
      case 'modify': return <Edit3 className="w-4 h-4 text-blue-600" />;
      case 'bulk_assign': return <UserPlus className="w-4 h-4 text-green-600" />;
      case 'bulk_unassign': return <UserMinus className="w-4 h-4 text-red-600" />;
      default: return <Info className="w-4 h-4 text-gray-600" />;
    }
  };

  // 获取操作文本
  const getActionText = (action: string) => {
    switch (action) {
      case 'assign': return '分配';
      case 'unassign': return '取消分配';
      case 'modify': return '修改分配';
      case 'bulk_assign': return '批量分配';
      case 'bulk_unassign': return '批量取消';
      default: return '未知操作';
    }
  };

  // 获取状态图标
  const getStatusIcon = (success: boolean, errors?: string[]) => {
    if (success && (!errors || errors.length === 0)) {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    } else {
      return <XCircle className="w-4 h-4 text-red-600" />;
    }
  };

  // 格式化时间
  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  // 过滤历史记录
  const filteredHistory = history.filter(item => {
    if (filters.studentId && item.studentId !== filters.studentId) return false;
    if (filters.teacherId && 
        item.fromTeacherId !== filters.teacherId && 
        item.toTeacherId !== filters.teacherId) return false;
    if (filters.action && item.action !== filters.action) return false;
    if (filters.success !== undefined && item.success !== filters.success) return false;
    if (filters.dateRange && 
        (item.timestamp < filters.dateRange.start || item.timestamp > filters.dateRange.end)) return false;
    return true;
  });

  // 处理过滤器变更
  const handleFilterChange = (newFilters: Partial<HistoryFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFilterChange?.(updatedFilters);
  };

  return (
    <div className="space-y-6">
      {/* 统计面板 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">总分配数</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalAssignments}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">成功分配</p>
              <p className="text-2xl font-semibold text-green-600">{stats.successfulAssignments}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">失败分配</p>
              <p className="text-2xl font-semibold text-red-600">{stats.failedAssignments}</p>
            </div>
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">已解决冲突</p>
              <p className="text-2xl font-semibold text-orange-600">{stats.conflictsResolved}</p>
            </div>
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* 控制面板 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-gray-900">分配历史记录</h3>
            <span className="text-sm text-gray-500">
              共 {filteredHistory.length} 条记录
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              <Filter className="w-4 h-4" />
              筛选
              {showFilters ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            <button
              onClick={onExportHistory}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
            >
              <Download className="w-4 h-4" />
              导出
            </button>
          </div>
        </div>

        {/* 过滤器面板 */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">操作类型</label>
                <select
                  value={filters.action || ''}
                  onChange={(e) => handleFilterChange({ action: e.target.value as any || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">全部操作</option>
                  <option value="assign">分配</option>
                  <option value="unassign">取消分配</option>
                  <option value="modify">修改分配</option>
                  <option value="bulk_assign">批量分配</option>
                  <option value="bulk_unassign">批量取消</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">执行结果</label>
                <select
                  value={filters.success === undefined ? '' : filters.success.toString()}
                  onChange={(e) => handleFilterChange({ 
                    success: e.target.value === '' ? undefined : e.target.value === 'true'
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">全部结果</option>
                  <option value="true">成功</option>
                  <option value="false">失败</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">日期范围</label>
                <input
                  type="date"
                  onChange={(e) => {
                    if (e.target.value) {
                      const start = new Date(e.target.value);
                      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
                      handleFilterChange({ dateRange: { start, end } });
                    } else {
                      handleFilterChange({ dateRange: undefined });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  setFilters({});
                  onFilterChange?.({});
                }}
                className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                清除筛选
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 历史记录列表 */}
      <div className="bg-white rounded-lg border border-gray-200">
        {filteredHistory.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>没有找到符合条件的历史记录</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredHistory.map((record) => (
              <div key={record.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {/* 操作图标 */}
                    <div className="mt-1">
                      {getActionIcon(record.action)}
                    </div>

                    {/* 主要信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">
                          {getActionText(record.action)} - {record.studentName}
                        </span>
                        {getStatusIcon(record.success, record.errors)}
                      </div>

                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center gap-4">
                          <span>
                            专业类型：{
                              record.subjectType === 'primary' ? '主项专业' :
                              record.subjectType === 'secondary1' ? '副项1专业' :
                              '副项2专业'
                            }
                          </span>
                          {record.instrument && (
                            <span>乐器：{record.instrument}</span>
                          )}
                        </div>

                        {(record.fromTeacherName || record.toTeacherName) && (
                          <div className="flex items-center gap-4">
                            {record.fromTeacherName && (
                              <span>
                                从：{record.fromTeacherName}
                              </span>
                            )}
                            {record.toTeacherName && (
                              <span>
                                到：{record.toTeacherName}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            操作者：{record.userName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDateTime(record.timestamp)}
                          </span>
                        </div>
                      </div>

                      {/* 展开的详细信息 */}
                      {expandedItems.has(record.id) && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          {record.reason && (
                            <div className="mb-3">
                              <span className="text-sm font-medium text-gray-700">操作原因：</span>
                              <p className="text-sm text-gray-600 mt-1">{record.reason}</p>
                            </div>
                          )}

                          {record.errors && record.errors.length > 0 && (
                            <div className="mb-3">
                              <span className="text-sm font-medium text-red-700">错误信息：</span>
                              <ul className="text-sm text-red-600 mt-1 space-y-1">
                                {record.errors.map((error, index) => (
                                  <li key={index} className="flex items-start gap-1">
                                    <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                    {error}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">学生ID：</span>
                              <span className="text-gray-600 ml-1">{record.studentId}</span>
                            </div>
                            {record.fromTeacherId && (
                              <div>
                                <span className="font-medium text-gray-700">原教师ID：</span>
                                <span className="text-gray-600 ml-1">{record.fromTeacherId}</span>
                              </div>
                            )}
                            {record.toTeacherId && (
                              <div>
                                <span className="font-medium text-gray-700">新教师ID：</span>
                                <span className="text-gray-600 ml-1">{record.toTeacherId}</span>
                              </div>
                            )}
                            <div>
                              <span className="font-medium text-gray-700">用户ID：</span>
                              <span className="text-gray-600 ml-1">{record.userId}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => toggleExpanded(record.id)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      {expandedItems.has(record.id) ? 
                        <ChevronDown className="w-4 h-4" /> : 
                        <ChevronRight className="w-4 h-4" />
                      }
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 热门乐器统计 */}
      {stats.mostRequestedInstruments.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">热门乐器统计</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.mostRequestedInstruments.slice(0, 6).map((item, index) => (
              <div key={item.instrument} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-100 text-blue-600 text-xs font-medium rounded-full flex items-center justify-center">
                    {index + 1}
                  </span>
                  <span className="font-medium text-gray-900">{item.instrument}</span>
                </div>
                <span className="text-sm text-gray-600">{item.count} 次</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 教师工作量统计 */}
      {stats.teacherWorkload.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">教师工作量统计</h3>
          <div className="space-y-3">
            {stats.teacherWorkload.slice(0, 10).map((item) => (
              <div key={item.teacherId} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="font-medium text-gray-900">{item.teacherName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${Math.min(item.workload * 10, 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 w-8">{item.workload}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AllocationHistoryComponent;
