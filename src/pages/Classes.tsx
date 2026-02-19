/**
 * 班级管理页面
 * 左侧：班级列表 | 右侧：学生名单 / 班级课表
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  Search,
  GraduationCap,
  Calendar,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  MapPin,
  BookOpen,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { classService, studentService, scheduleService, courseService, roomService, largeClassScheduleService } from '../services';

// 班级类型（与 localStorage.ts 保持一致）
interface Class {
  id: string;
  class_id: string;
  class_name: string;
  enrollment_year: number;
  class_number: number;
  student_count: number;
  student_type: 'general' | 'upgrade';
  status: 'active' | 'inactive';
  created_at: string;
}

// 排课显示类型
interface ScheduledClassDisplay {
  id: string;
  day_of_week: number;
  period: number;
  course_name: string;
  course_type: string;
  student_name: string;
}

// 大课表条目类型
interface LargeClassEntry {
  id: string;
  class_name: string;
  course_name: string;
  teacher_name: string;
  location: string;
  day_of_week: number;
  period_start: number;
  period_end: number;
  week_range?: string;
}

const WEEKDAYS = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 7, label: '周日' },
];

const PERIOD_CONFIG = [
  { period: 1, startTime: '08:00', endTime: '08:45' },
  { period: 2, startTime: '08:55', endTime: '09:40' },
  { period: 3, startTime: '10:00', endTime: '10:45' },
  { period: 4, startTime: '10:55', endTime: '11:40' },
  { period: 5, startTime: '14:00', endTime: '14:45' },
  { period: 6, startTime: '14:55', endTime: '15:40' },
  { period: 7, startTime: '16:00', endTime: '16:45' },
  { period: 8, startTime: '16:55', endTime: '17:40' },
];

const Classes: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [scheduledClasses, setScheduledClasses] = useState<ScheduledClassDisplay[]>([]);
  const [largeClassEntries, setLargeClassEntries] = useState<LargeClassEntry[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [activeTab, setActiveTab] = useState<'students' | 'schedule'>('students');
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());
  
  // 统一的筛选器状态（与StudentListFilters组件保持一致）
  const [currentFilters, setCurrentFilters] = useState<{
    year: string;
    classType: string;
    class: string;
    primaryInstrument: string;
    secondaryInstrument: string;
  }>({
    year: '',
    classType: '',
    class: '',
    primaryInstrument: '',
    secondaryInstrument: ''
  });

  // 加载数据后自动展开第一个年份
  useEffect(() => {
    if (classes.length > 0 && expandedYears.size === 0) {
      // 获取所有年份并展开最近的一个
      const years = [...new Set(classes.map(c => c.enrollment_year))].sort((a, b) => b - a);
      if (years.length > 0) {
        setExpandedYears(new Set([years[0]]));
      }
    }
  }, [classes, expandedYears.size]);

  // 加载数据
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [classesData, studentsData, schedulesData, roomsData, coursesData, largeClassData] = await Promise.all([
          classService.getAll(),
          studentService.getAll(),
          scheduleService.getAll(),
          roomService.getAll(),
          courseService.getAll(),
          largeClassScheduleService.getAll()
        ]);

        // 如果班级数据为空，尝试从学生数据中提取班级信息
        let finalClasses = classesData;
        if (classesData.length === 0 && studentsData.length > 0) {
          await classService.syncFromStudents(studentsData);
          finalClasses = await classService.getAll();
        }

        setClasses(finalClasses);
        setStudents(studentsData);

        // 转换为显示格式
        const displaySchedules: ScheduledClassDisplay[] = schedulesData.map(sc => {
          const course = coursesData.find(c => c.id === sc.course_id);
          return {
            id: sc.id,
            day_of_week: sc.day_of_week,
            period: sc.period,
            course_name: course?.course_name || '',
            course_type: course?.course_type || '',
            student_name: studentsData.find(s => s.id === sc.student_id)?.name || ''
          };
        });
        setScheduledClasses(displaySchedules);
        setRooms(roomsData);

        // 处理大课表数据
        const allLargeEntries = largeClassData.flatMap(s => s.entries);
        setLargeClassEntries(allLargeEntries);
      } catch (error) {
        console.error('获取数据失败:', error);
        setError('数据加载失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 重新加载数据
  const reloadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [classesData, studentsData, schedulesData, roomsData, coursesData, largeClassData] = await Promise.all([
        classService.getAll(),
        studentService.getAll(),
        scheduleService.getAll(),
        roomService.getAll(),
        courseService.getAll(),
        largeClassScheduleService.getAll()
      ]);

      // 如果班级数据为空，尝试从学生数据中提取班级信息
      let finalClasses = classesData;
      if (classesData.length === 0 && studentsData.length > 0) {
        await classService.syncFromStudents(studentsData);
        finalClasses = await classService.getAll();
      }

      setClasses(finalClasses);
      setStudents(studentsData);

      const displaySchedules: ScheduledClassDisplay[] = schedulesData.map(sc => {
        const course = coursesData.find(c => c.id === sc.course_id);
        return {
          id: sc.id,
          day_of_week: sc.day_of_week,
          period: sc.period,
          course_name: course?.course_name || '',
          course_type: course?.course_type || '',
          student_name: studentsData.find(s => s.id === sc.student_id)?.name || ''
        };
      });
      setScheduledClasses(displaySchedules);
      setRooms(roomsData);

      // 处理大课表数据
      const allLargeEntries = largeClassData.flatMap(s => s.entries);
      setLargeClassEntries(allLargeEntries);
    } catch (error) {
      console.error('获取数据失败:', error);
      setError('数据加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, []);

  // 处理刷新操作
  const handleRefresh = useCallback(() => {
    reloadData();
  }, [reloadData]);

  // 过滤班级（使用新的统一筛选逻辑）
  const filteredClasses = useMemo(() => {
    return classes.filter(cls => {
      // 基础状态检查
      if (cls.status !== 'active') return false;
      
      // 搜索词匹配
      const matchesSearch = !currentFilters.class || 
                          cls.class_name.toLowerCase().includes(currentFilters.class.toLowerCase()) ||
                          cls.class_id.toLowerCase().includes(currentFilters.class.toLowerCase());
      
      // 年级筛选
      const matchesYear = !currentFilters.year || 
                         cls.enrollment_year.toString() === currentFilters.year;
      
      // 班级类型筛选
      const matchesClassType = !currentFilters.classType || 
                               (currentFilters.classType === 'general' && cls.student_type === 'general') ||
                               (currentFilters.classType === 'upgrade' && cls.student_type === 'upgrade');
      
      return matchesSearch && matchesYear && matchesClassType;
    });
  }, [classes, currentFilters]);

  // 按年份分组
  const classesByYear = useMemo(() => {
    const grouped: Record<number, Class[]> = {};
    filteredClasses.forEach(cls => {
      if (!grouped[cls.enrollment_year]) {
        grouped[cls.enrollment_year] = [];
      }
      grouped[cls.enrollment_year].push(cls);
    });
    return grouped;
  }, [filteredClasses]);

  // 获取选中班级的学生（考虑筛选条件）
  const getClassStudents = useMemo(() => {
    if (!selectedClass) return [];
    
    let filteredStudents = students.filter(s => s.major_class === selectedClass.class_name);
    
    // 应用主项筛选
    if (currentFilters.primaryInstrument) {
      filteredStudents = filteredStudents.filter(s => 
        s.primary_instrument === currentFilters.primaryInstrument
      );
    }
    
    // 应用副项筛选
    if (currentFilters.secondaryInstrument) {
      filteredStudents = filteredStudents.filter(s => 
        s.secondary_instruments && s.secondary_instruments.includes(currentFilters.secondaryInstrument)
      );
    }
    
    return filteredStudents;
  }, [students, selectedClass, currentFilters]);

  // 获取选中班级的已排课程（基于筛选后的学生）
  const getClassSchedules = useMemo(() => {
    if (!selectedClass) return [];
    const studentNames = getClassStudents.map(s => s.name);
    return scheduledClasses.filter(sc => studentNames.includes(sc.student_name));
  }, [scheduledClasses, selectedClass, getClassStudents]);

  // 获取选中班级的大课表
  const getClassLargeClasses = () => {
    if (!selectedClass) return [];
    return largeClassEntries.filter(entry => 
      entry.class_name && entry.class_name.includes(selectedClass.class_name.slice(0, 4))
    );
  };

  // 切换年份展开
  const toggleYear = (year: number) => {
    setExpandedYears(prev => {
      const newSet = new Set(prev);
      if (newSet.has(year)) {
        newSet.delete(year);
      } else {
        newSet.add(year);
      }
      return newSet;
    });
  };

  // 统计信息
  const stats = useMemo(() => ({
    total: classes.filter(c => c.status === 'active').length,
    general: classes.filter(c => c.status === 'active' && c.student_type === 'general').length,
    upgrade: classes.filter(c => c.status === 'active' && c.student_type === 'upgrade').length,
    totalStudents: students.length
  }), [classes, students]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h1 className="page-title flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-blue-600" />
            班级管理
          </h1>
        </div>

        <div className="card p-8">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">数据加载失败</h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <button
              onClick={reloadData}
              className="btn btn-primary flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              重新加载
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 空数据状态
  if (classes.length === 0) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h1 className="page-title flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-blue-600" />
            班级管理
          </h1>
        </div>

        <div className="card p-8">
          <div className="text-center">
            <GraduationCap className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无班级数据</h3>
            <p className="text-gray-500 mb-4">
              {students.length > 0
                ? '正在从学生数据中提取班级信息...'
                : '请先添加学生数据，系统将自动提取班级信息'}
            </p>
            <button
              onClick={reloadData}
              className="btn btn-primary flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              刷新数据
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in p-4 sm:p-6 lg:p-8">
      <div className="max-w-[1400px] mx-auto">
        {/* 顶部操作栏 - 紧凑布局 */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-4 gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-blue-600" />
              班级管理
            </h1>
            {/* 紧凑统计信息 */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-gray-600">
              <span>班级: <strong className="text-blue-600">{stats.total}</strong></span>
              <span>学生: <strong className="text-green-600">{stats.totalStudents}</strong></span>
              <span className="hidden sm:inline">普通班: <strong className="text-purple-600">{stats.general}</strong></span>
              <span className="hidden sm:inline">专升本: <strong className="text-orange-600">{stats.upgrade}</strong></span>
            </div>
          </div>
          <button onClick={handleRefresh} className="btn-secondary flex items-center gap-2 px-3 py-1.5 text-sm">
            <RefreshCw className="w-4 h-4" />
            刷新数据
          </button>
        </div>

        {/* 班级选择筛选器 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              选择班级
            </h2>
            <span className="text-sm text-gray-500">
              共 {filteredClasses.length} 个班级
            </span>
          </div>
          
          {/* 年份和班级类型筛选器 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 年份选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">入学年份</label>
              <select
                value={currentFilters.year}
                onChange={(e) => setCurrentFilters(prev => ({ ...prev, year: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">全部年份</option>
                {[...new Set(classes.map(c => c.enrollment_year))]
                  .sort((a, b) => b - a)
                  .map(year => (
                    <option key={year} value={year.toString()}>
                      {year}年 ({classes.filter(c => c.enrollment_year === year).length} 个班级)
                    </option>
                  ))}
              </select>
            </div>

            {/* 班级类型选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">班级类型</label>
              <select
                value={currentFilters.classType}
                onChange={(e) => setCurrentFilters(prev => ({ ...prev, classType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">全部类型</option>
                <option value="general">普通班 ({classes.filter(c => c.student_type === 'general').length})</option>
                <option value="upgrade">专升本 ({classes.filter(c => c.student_type === 'upgrade').length})</option>
              </select>
            </div>

            {/* 班级选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">具体班级</label>
              <select
                value={selectedClass?.id || ''}
                onChange={(e) => {
                  const classId = e.target.value;
                  if (!classId) {
                    setSelectedClass(null);
                  } else {
                    const classObj = classes.find(c => c.id === classId);
                    setSelectedClass(classObj || null);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={filteredClasses.length === 0}
              >
                <option value="">全部班级</option>
                {filteredClasses.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.class_name} ({cls.student_count} 名学生)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 当前选择状态显示 */}
          <div className="mt-4 flex items-center gap-4 flex-wrap">
            {currentFilters.year && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">入学年份:</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {currentFilters.year}年
                </span>
              </div>
            )}
            
            {currentFilters.classType && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">班级类型:</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  currentFilters.classType === 'upgrade' 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {currentFilters.classType === 'upgrade' ? '专升本' : '普通班'}
                </span>
              </div>
            )}
          </div>
        </div>

      {/* 底部：班级详情 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {selectedClass ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* 班级信息头部 */}
            <div className="px-3 sm:px-4 py-3 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2 flex-wrap">
                    {selectedClass ? (
                      <>
                        {selectedClass.class_name}
                        <span className={`text-sm px-3 py-1 rounded-full ${
                          selectedClass.student_type === 'upgrade'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {selectedClass.student_type === 'upgrade' ? '专升本' : '普通班'}
                        </span>
                      </>
                    ) : (
                      <>
                        班级详情
                        {currentFilters.year && (
                          <span className="text-sm px-3 py-1 rounded-full bg-gray-100 text-gray-700">
                            {currentFilters.year}年
                          </span>
                        )}
                        {currentFilters.classType && (
                          <span className={`text-sm px-3 py-1 rounded-full ${
                            currentFilters.classType === 'upgrade'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {currentFilters.classType === 'upgrade' ? '专升本' : '普通班'}
                          </span>
                        )}
                      </>
                    )}
                  </h2>
                  <p className="text-gray-500 mt-1 text-sm">
                    {selectedClass 
                      ? `入学年份：${selectedClass.enrollment_year}年 · 班号：${selectedClass.class_number}班 · 学生：${selectedClass.student_count}人`
                      : `显示 ${filteredClasses.length} 个班级${currentFilters.year ? `（${currentFilters.year}年）` : ''}${currentFilters.classType ? `（${currentFilters.classType === 'upgrade' ? '专升本' : '普通班'}）` : ''}`
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Tab 切换 */}
            <div className="flex border-b border-gray-100">
              <button
                onClick={() => setActiveTab('students')}
                className={`px-4 sm:px-6 py-3 font-medium transition-colors text-sm sm:text-base ${
                  activeTab === 'students'
                    ? 'text-purple-600 border-b-2 border-purple-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Users className="w-4 h-4 inline mr-2" />
                学生名单
              </button>
              <button
                onClick={() => setActiveTab('schedule')}
                className={`px-4 sm:px-6 py-3 font-medium transition-colors text-sm sm:text-base ${
                  activeTab === 'schedule'
                    ? 'text-purple-600 border-b-2 border-purple-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Calendar className="w-4 h-4 inline mr-2" />
                班级课表
              </button>
            </div>

            {/* Tab 内容 */}
            <div className="p-3 sm:p-4">
              {activeTab === 'students' ? (
                // 学生名单 Tab
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-gray-600 text-sm sm:text-base">
                      共 <span className="font-medium text-purple-600">{getClassStudents.length}</span> 名学生
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px]">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-3 sm:px-4 py-2 text-left text-sm font-medium text-gray-600">学号</th>
                          <th className="px-3 sm:px-4 py-2 text-left text-sm font-medium text-gray-600">姓名</th>
                          <th className="px-3 sm:px-4 py-2 text-left text-sm font-medium text-gray-600 hidden md:table-cell">主项</th>
                          <th className="px-3 sm:px-4 py-2 text-left text-sm font-medium text-gray-600 hidden lg:table-cell">副项</th>
                          <th className="px-3 sm:px-4 py-2 text-left text-sm font-medium text-gray-600 hidden lg:table-cell">备注</th>
                          <th className="px-3 sm:px-4 py-2 text-left text-sm font-medium text-gray-600 hidden sm:table-cell">已排课次</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getClassStudents.map(student => {
                          const studentSchedules = scheduledClasses.filter(
                            sc => sc.student_name === student.name
                          );
                          return (
                            <tr key={student.id} className="border-t border-gray-100">
                              <td className="px-3 sm:px-4 py-2 font-mono text-sm text-gray-600">{student.student_id}</td>
                              <td className="px-3 sm:px-4 py-2 font-medium text-sm text-gray-900">{student.name}</td>
                              <td className="px-3 sm:px-4 py-2 hidden md:table-cell">
                                {student.primary_instrument ? (
                                  <span className={`text-sm ${
                                    student.primary_instrument === '钢琴' ? 'text-pink-700' :
                                    student.primary_instrument === '声乐' ? 'text-blue-700' :
                                    'text-green-700'
                                  }`}>
                                    {student.primary_instrument === '钢琴' ? '🎹' :
                                     student.primary_instrument === '声乐' ? '🎤' : '🎸'}
                                    {student.primary_instrument}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 text-sm">-</span>
                                )}
                              </td>
                              <td className="px-3 sm:px-4 py-2 text-sm text-gray-600 hidden lg:table-cell">
                                {student.secondary_instruments?.join(', ') || '-'}
                              </td>
                              <td className="px-3 sm:px-4 py-2 text-sm text-gray-600 hidden lg:table-cell">
                                {student.remarks || '-'}
                              </td>
                              <td className="px-3 sm:px-4 py-2 hidden sm:table-cell">
                                <span className="text-sm text-gray-600">
                                  {studentSchedules.length} 节
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {getClassStudents.length === 0 && (
                      <div className="text-center py-12 text-gray-500">
                        <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>该班级暂无学生</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // 班级课表 Tab
                <div>
                  <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <p className="text-gray-600 text-sm">
                      一对一课程：<span className="font-medium text-purple-600">{getClassSchedules.length}</span> 节，
                      大课表课程：<span className="font-medium text-blue-600">{getClassLargeClasses().length}</span> 节
                    </p>
                  </div>

                  {/* 课表网格 */}
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px]">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="p-2 sm:p-3 text-left text-sm font-medium text-gray-600 w-16 sm:w-24">节次</th>
                          {WEEKDAYS.map(day => (
                            <th key={day.value} className="p-2 sm:p-3 text-center text-xs sm:text-sm font-medium text-gray-600">
                              {day.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {PERIOD_CONFIG.map(period => (
                          <tr key={period.period} className="border-b border-gray-100">
                            <td className="p-2 sm:p-3">
                              <div className="text-sm text-gray-600">第{period.period}节</div>
                              <div className="text-xs text-gray-400 hidden sm:block">{period.startTime}-{period.endTime}</div>
                            </td>
                            {WEEKDAYS.map(day => {
                              const slotSchedules = getClassSchedules.filter(
                                sc => sc.day_of_week === day.value && sc.period === period.period
                              );
                              const slotLargeClasses = getClassLargeClasses().filter(
                                lc => lc.day_of_week === day.value && 
                                      period.period >= lc.period_start && 
                                      period.period <= lc.period_end
                              );
                              const hasContent = slotSchedules.length > 0 || slotLargeClasses.length > 0;
                              
                              return (
                                <td key={day.value} className="p-1 sm:p-2 align-top min-h-[60px] sm:min-h-[80px]">
                                  {hasContent ? (
                                    <div className="space-y-1 sm:space-y-2">
                                      {/* 大课表课程 - 简化显示 */}
                                      {slotLargeClasses.map(lc => {
                                        const isTheoryTeacher = lc.teacher_name && !lc.teacher_name.includes('系内');
                                        const courseType = isTheoryTeacher ? '通适大课' : '专业大课';
                                        
                                        return (
                                          <div
                                            key={lc.id}
                                            className="p-1 sm:p-2 rounded-lg border bg-purple-100 border-purple-200 cursor-help relative group text-xs sm:text-sm"
                                            title={`${courseType} - ${lc.course_name}\n教师: ${lc.teacher_name}\n地点: ${lc.location || '未指定'}`}
                                          >
                                            <div className="font-medium text-purple-800 truncate">
                                              {courseType}
                                            </div>
                                          </div>
                                        );
                                      })}
                                      {/* 一对一课程 - 简化显示 */}
                                      {slotSchedules.map(sc => (
                                        <div
                                          key={sc.id}
                                          className={`p-1 sm:p-2 rounded-lg border cursor-help relative group text-xs sm:text-sm ${
                                            sc.course_type === '钢琴' ? 'bg-blue-100 border-blue-200' :
                                            sc.course_type === '声乐' ? 'bg-green-100 border-green-200' :
                                            'bg-orange-100 border-orange-200'
                                          }`}
                                          title={`专业小课\n课程: ${sc.course_name || sc.course_type}\n学生: ${sc.student_name}`}
                                        >
                                          <div className="font-medium truncate">
                                            专业小课
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="h-full flex items-center justify-center text-gray-300 text-xs sm:text-sm">
                                      -
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {getClassSchedules.length === 0 && getClassLargeClasses().length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>该班级暂无排课</p>
                    </div>
                  )}

                  {/* 图例 */}
                  <div className="mt-4 flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-purple-100 border border-purple-200 rounded"></span>
                      <span>大课表课程</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></span>
                      <span>钢琴课</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-green-100 border border-green-200 rounded"></span>
                      <span>声乐课</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-orange-100 border border-orange-200 rounded"></span>
                      <span>器乐课</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          // 未选择班级时显示提示
          <div className="text-center py-16">
            <GraduationCap className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">选择一个班级</h3>
            <p className="text-gray-500 text-sm sm:text-base">从上方班级列表选择一个班级，查看学生名单和课表</p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default Classes;
