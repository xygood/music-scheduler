import React, { useState, useEffect, useCallback } from 'react';
import { 
  Clock, 
  RefreshCw, 
  ChevronDown, 
  ChevronRight,
  Calendar,
  CheckCircle,
  Filter,
  Search
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { teacherService } from '../services';
import prioritySuggestionService from '../services/prioritySuggestionService';
import { 
  TeacherPrioritySuggestion, 
  ClassSuggestion, 
  PRIORITY_LEVELS,
  DAY_NAMES 
} from '../types/prioritySuggestion';
import { formatTimeSlot } from '../utils/timeAnalysis';

const PrioritySuggestion: React.FC = () => {
  const { user, teacher } = useAuth();
  const isAdmin = user?.faculty_id === 'ADMIN' || user?.is_admin === true || user?.role === 'admin' || user?.teacher_id === '110';
  
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<TeacherPrioritySuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());

  const formatWeekRanges = (weekRanges: Array<{ start: number; end: number }>): string => {
    if (!weekRanges || weekRanges.length === 0) return '';
    return weekRanges.map(r => r.start === r.end ? `${r.start}周` : `${r.start}-${r.end}周`).join('、');
  };

  const formatTimeSlotWithWeeks = (slot: any): string => {
    const dayName = DAY_NAMES[slot.dayOfWeek - 1] || `周${slot.dayOfWeek}`;
    const weekInfo = slot.weekRanges ? `（${formatWeekRanges(slot.weekRanges)}）` : '';
    const periodText = slot.periodStart === slot.periodEnd 
      ? `第${slot.periodStart}节` 
      : `第${slot.periodStart}-${slot.periodEnd}节`;
    return `${dayName}${periodText} ${weekInfo}`;
  };

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const teachersData = await teacherService.getAll();
        setTeachers(teachersData || []);
        
        if (!isAdmin && (teacher?.teacher_id || user?.teacher_id)) {
          const currentTeacherId = teacher?.teacher_id || user?.teacher_id;
          setSelectedTeacherId(currentTeacherId);
        }
      } catch (error) {
        console.error('获取教师列表失败:', error);
      }
    };
    
    fetchTeachers();
  }, [isAdmin, teacher, user]);

  useEffect(() => {
    if (selectedTeacherId) {
      fetchSuggestion(selectedTeacherId);
    }
  }, [selectedTeacherId]);

  const fetchSuggestion = async (teacherId: string, isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const result = await prioritySuggestionService.getTeacherPrioritySuggestion({
        teacherId
      });
      setSuggestion(result);
    } catch (error) {
      console.error('获取排课建议失败:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = useCallback(() => {
    if (selectedTeacherId) {
      fetchSuggestion(selectedTeacherId, true);
    }
  }, [selectedTeacherId]);

  const toggleClassExpansion = (classId: string) => {
    setExpandedClasses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(classId)) {
        newSet.delete(classId);
      } else {
        newSet.add(classId);
      }
      return newSet;
    });
  };

  const filteredTeachers = teachers.filter(t => {
    const name = t.name || t.full_name || '';
    const faculty = t.faculty_name || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           faculty.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getPriorityConfig = (level: string) => {
    return PRIORITY_LEVELS[level as keyof typeof PRIORITY_LEVELS] || PRIORITY_LEVELS.relaxed;
  };

  const getPriorityIcon = (level: string) => {
    switch (level) {
      case 'urgent':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'high':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'normal':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'relaxed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getPriorityBgColor = (level: string) => {
    switch (level) {
      case 'urgent':
        return 'bg-red-50 border-red-200';
      case 'high':
        return 'bg-yellow-50 border-yellow-200';
      case 'normal':
        return 'bg-blue-50 border-blue-200';
      case 'relaxed':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const renderClassCard = (classSuggestion: ClassSuggestion) => {
    const isExpanded = expandedClasses.has(classSuggestion.classId);
    const config = getPriorityConfig(classSuggestion.priorityLevel);
    
    return (
      <div
        key={classSuggestion.classId}
        className={`border rounded-lg overflow-hidden ${getPriorityBgColor(classSuggestion.priorityLevel)}`}
      >
        <div
          className="p-4 cursor-pointer hover:bg-opacity-80 transition-colors"
          onClick={() => toggleClassExpansion(classSuggestion.classId)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getPriorityIcon(classSuggestion.priorityLevel)}
              <div>
                <h3 className="font-semibold text-gray-900">{classSuggestion.className}</h3>
                <p className="text-sm text-gray-600">
                  {classSuggestion.studentCount} 名学生 · {classSuggestion.totalAvailableSlotWeeks} 个可用时段周次
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                classSuggestion.priorityLevel === 'urgent' ? 'bg-red-100 text-red-700' :
                classSuggestion.priorityLevel === 'high' ? 'bg-yellow-100 text-yellow-700' :
                classSuggestion.priorityLevel === 'normal' ? 'bg-blue-100 text-blue-700' :
                'bg-green-100 text-green-700'
              }`}>
                {config.label}
              </span>
              {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
            </div>
          </div>
          
          <div className="mt-3 p-3 bg-white bg-opacity-60 rounded-lg">
            <p className="text-sm text-gray-700">
              <span className="font-medium">建议：</span>
              {classSuggestion.recommendation}
            </p>
          </div>
        </div>
        
        {isExpanded && (
          <div className="border-t border-gray-200 bg-white p-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                可用时段（每节次可用周次）
              </h4>
              {classSuggestion.availableTimeSlots.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* 按天分组 */}
                  {Array.from(new Set(classSuggestion.availableTimeSlots.map(s => s.dayOfWeek))).map(day => {
                    const daySlots = classSuggestion.availableTimeSlots.filter(s => s.dayOfWeek === day);
                    return (
                      <div key={day} className="border rounded-lg p-3 bg-gray-50">
                        <div className="font-medium text-gray-800 text-sm mb-2 border-b pb-1">
                          {DAY_NAMES[day - 1]}
                        </div>
                        <div className="space-y-1">
                          {daySlots.map((slot, idx) => (
                            <div key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                              <span className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${
                                slot.quality === 'best' ? 'bg-green-500' :
                                slot.quality === 'good' ? 'bg-blue-500' : 'bg-gray-400'
                              }`} />
                              <span className="flex-1">
                                第{slot.periodStart}节：{formatWeekRanges(slot.weekRanges)}
                                <span className="text-gray-400 ml-1">({slot.availableWeeksCount}周)</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-red-500">无可用时段</p>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <span className="text-gray-600">
                    稀缺度得分: <span className="font-medium">{(classSuggestion.scarcityScore * 100).toFixed(0)}%</span>
                  </span>
                  <span className="text-gray-600">
                    优先级得分: <span className="font-medium">{(classSuggestion.priorityScore * 100).toFixed(0)}%</span>
                  </span>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  classSuggestion.riskLevel === 'high' ? 'bg-red-100 text-red-700' :
                  classSuggestion.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {classSuggestion.riskLevel === 'high' ? '高风险' :
                   classSuggestion.riskLevel === 'medium' ? '中风险' : '低风险'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">排课建议</h1>
          <p className="text-gray-600 mt-1">
            基于大课和禁排时间，为教师提供优先排课班级建议
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing || !selectedTeacherId}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? '刷新中...' : '刷新数据'}
        </button>
      </div>

      {isAdmin && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">选择教师：</span>
            </div>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索教师姓名或教研室..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <select
              value={selectedTeacherId || ''}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">请选择教师</option>
              {filteredTeachers.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name || t.full_name} - {t.faculty_name || '未知教研室'}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {!isAdmin && !selectedTeacherId && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-700">未找到您的教师信息，请联系管理员。</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-purple-600 animate-spin" />
          <span className="ml-3 text-gray-600">正在计算排课建议...</span>
        </div>
      )}

      {!loading && suggestion && (
        <>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {suggestion.teacherName} 的排课建议
                </h2>
                <p className="text-sm text-gray-500">
                  {suggestion.facultyName} · 计算时间: {new Date(suggestion.calculatedAt).toLocaleString('zh-CN')}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{suggestion.summary.totalClasses}</p>
                <p className="text-sm text-gray-600">待排班级</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{suggestion.summary.urgentCount}</p>
                <p className="text-sm text-red-600">紧急优先</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-yellow-600">{suggestion.summary.highCount}</p>
                <p className="text-sm text-yellow-600">优先</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{suggestion.summary.normalCount}</p>
                <p className="text-sm text-blue-600">正常</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{suggestion.summary.relaxedCount}</p>
                <p className="text-sm text-green-600">宽松</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">班级排课优先级</h3>
              <p className="text-sm text-gray-500">
                按稀缺度排序：可排时段越少，优先级越高
              </p>
            </div>
            
            {suggestion.suggestions.length > 0 ? (
              <div className="space-y-4">
                {suggestion.suggestions.map(renderClassCard)}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>暂无待排课班级</p>
              </div>
            )}
          </div>
        </>
      )}

      {!loading && !suggestion && selectedTeacherId && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">暂无排课建议数据</p>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">排课建议说明</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>· <strong>紧急优先</strong>：可排时段极少，建议立即排课，否则可能无时间可排</li>
          <li>· <strong>优先</strong>：可排时段较少，建议尽快排课，选择有限</li>
          <li>· <strong>正常</strong>：可排时段适中，可按需排课</li>
          <li>· <strong>宽松</strong>：可排时段充裕，可最后排课，选择余地大</li>
        </ul>
      </div>
    </div>
  );
};

export default PrioritySuggestion;
