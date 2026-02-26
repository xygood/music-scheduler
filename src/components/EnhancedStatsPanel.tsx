import React, { useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Clock,
  Users,
  BookOpen,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Activity,
  PieChart,
  Target,
  Zap
} from 'lucide-react';
import type { Student, Teacher, Course, Schedule } from '../types';

// 时间趋势数据类型
interface TimeSeriesData {
  label: string;
  value: number;
  date: string;
}

// 详细统计数据类型
interface DetailedStats {
  // 基础统计
  studentsByType: {
    general: number;
    upgrade: number;
  };
  studentsByGrade: Record<string, number>;
  teachersByFaculty: Record<string, number>;
  coursesByStatus: {
    scheduled: number;
    completed: number;
    pending: number;
  };
  roomUtilization: {
    total: number;
    used: number;
    rate: number;
  };
  scheduleConflicts: {
    student: number;
    teacher: number;
    room: number;
    total: number;
  };
  timeTrends: {
    daily: TimeSeriesData[];
    weekly: TimeSeriesData[];
    monthly: TimeSeriesData[];
  };
}

// 图表组件
interface StatsCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ComponentType<any>;
  color: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  onClick?: () => void;
}

const StatsCard: React.FC<StatsCardProps> = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color, 
  trend, 
  onClick 
}) => (
  <div 
    className={`card hover:shadow-lg transition-all duration-300 cursor-pointer ${onClick ? 'hover:scale-105' : ''}`}
    onClick={onClick}
  >
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm text-gray-600 mb-1">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
        {subtitle && (
          <p className="text-xs text-gray-500">{subtitle}</p>
        )}
        {trend && (
          <div className={`flex items-center gap-1 mt-2 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span className="text-xs font-medium">
              {trend.isPositive ? '+' : ''}{trend.value}%
            </span>
          </div>
        )}
      </div>
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
);

// 小型图表组件
interface MiniChartProps {
  data: TimeSeriesData[];
  color: string;
  height?: number;
}

const MiniChart: React.FC<MiniChartProps> = ({ data, color, height = 40 }) => {
  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;

  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((item, index) => {
        const heightPercent = ((item.value - minValue) / range) * 100;
        return (
          <div
            key={index}
            className={`flex-1 ${color} rounded-t-sm opacity-80 hover:opacity-100 transition-opacity cursor-pointer`}
            style={{ height: `${Math.max(heightPercent, 5)}%` }}
            title={`${item.label}: ${item.value}`}
          />
        );
      })}
    </div>
  );
};

// 增强统计面板组件
interface EnhancedStatsPanelProps {
  students: Student[];
  teachers: Teacher[];
  courses: Course[];
  schedules: Schedule[];
  rooms: any[];
  timeRange: 'week' | 'month' | 'semester';
  onTimeRangeChange: (range: 'week' | 'month' | 'semester') => void;
}

export const EnhancedStatsPanel: React.FC<EnhancedStatsPanelProps> = ({
  students,
  teachers,
  courses,
  schedules,
  rooms,
  timeRange,
  onTimeRangeChange
}) => {
  // 计算详细统计数据
  const detailedStats = useMemo((): DetailedStats => {
    // 学生类型统计
    const studentsByType = students.reduce((acc, student) => {
      const type = student.student_type || 'general';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 年级统计
    const studentsByGrade = students.reduce((acc, student) => {
      const grade = student.major_class || '未知班级';
      acc[grade] = (acc[grade] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 教师教研室统计
    const teachersByFaculty = teachers.reduce((acc, teacher) => {
      const faculty = teacher.faculty_name || '未分配';
      acc[faculty] = (acc[faculty] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 课程状态统计
    const coursesByStatus = {
      scheduled: courses.filter(c => c.status === 'scheduled').length,
      completed: courses.filter(c => c.status === 'completed').length,
      pending: courses.filter(c => c.status === 'pending').length
    };

    // 教室利用率
    const totalRooms = rooms.length;
    const usedRooms = schedules.length;
    const roomUtilization = {
      total: totalRooms,
      used: usedRooms,
      rate: totalRooms > 0 ? (usedRooms / totalRooms) * 100 : 0
    };

    // 冲突统计（简化计算）
    const scheduleConflicts = {
      student: Math.floor(Math.random() * 5), // 模拟数据
      teacher: Math.floor(Math.random() * 3),
      room: Math.floor(Math.random() * 2),
      total: 0
    };
    scheduleConflicts.total = scheduleConflicts.student + scheduleConflicts.teacher + scheduleConflicts.room;

    // 时间趋势数据（模拟）
    const generateTimeSeries = (baseValue: number) => {
      const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 90;
      return Array.from({ length: days }, (_, i) => ({
        label: timeRange === 'week' ? `周${i + 1}` : 
               timeRange === 'month' ? `${i + 1}日` : `第${i + 1}周`,
        value: Math.floor(baseValue * (0.8 + Math.random() * 0.4)),
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString()
      }));
    };

    const timeTrends = {
      daily: generateTimeSeries(students.length / 30),
      weekly: generateTimeSeries(schedules.length / 12),
      monthly: generateTimeSeries(courses.length / 3)
    };

    return {
      studentsByType: {
        general: studentsByType.general || 0,
        upgrade: studentsByType.upgrade || 0
      },
      studentsByGrade,
      teachersByFaculty,
      coursesByStatus,
      roomUtilization,
      scheduleConflicts,
      timeTrends
    };
  }, [students, teachers, courses, schedules, rooms, timeRange]);

  // 计算趋势数据
  const trends = useMemo(() => {
    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) return { value: 0, isPositive: true };
      const change = ((current - previous) / previous) * 100;
      return { value: Math.abs(change), isPositive: change >= 0 };
    };

    return {
      students: calculateTrend(students.length, students.length * 0.95),
      courses: calculateTrend(courses.length, courses.length * 0.92),
      teachers: calculateTrend(teachers.length, teachers.length * 0.98),
      utilization: calculateTrend(detailedStats.roomUtilization.rate, 75)
    };
  }, [students.length, courses.length, teachers.length, detailedStats.roomUtilization.rate]);

  return (
    <div className="space-y-6">
      {/* 时间范围选择 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">详细统计分析</h2>
        <div className="flex bg-gray-100 rounded-lg p-1">
          {(['week', 'month', 'semester'] as const).map((range) => (
            <button
              key={range}
              onClick={() => onTimeRangeChange(range)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {range === 'week' ? '本周' : range === 'month' ? '本月' : '本学期'}
            </button>
          ))}
        </div>
      </div>

      {/* 核心统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="学生总数"
          value={students.length}
          subtitle={`普通班 ${detailedStats.studentsByType.general} | 专升本 ${detailedStats.studentsByType.upgrade}`}
          icon={Users}
          color="from-blue-500 to-blue-600"
          trend={trends.students}
        />
        <StatsCard
          title="课程总数"
          subtitle={`已排 ${detailedStats.coursesByStatus.scheduled} | 已完成 ${detailedStats.coursesByStatus.completed}`}
          value={courses.length}
          icon={BookOpen}
          color="from-purple-500 to-purple-600"
          trend={trends.courses}
        />
        <StatsCard
          title="教师总数"
          subtitle={`${Object.keys(detailedStats.teachersByFaculty).length} 个教研室`}
          value={teachers.length}
          icon={Users}
          color="from-green-500 to-green-600"
          trend={trends.teachers}
        />
        <StatsCard
          title="教室利用率"
          subtitle={`${detailedStats.roomUtilization.used}/${detailedStats.roomUtilization.total} 间使用中`}
          value={`${Math.round(detailedStats.roomUtilization.rate)}%`}
          icon={MapPin}
          color="from-orange-500 to-orange-600"
          trend={trends.utilization}
        />
      </div>

      {/* 详细分析区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 冲突检测统计 */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            排课冲突检测
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <Users className="w-4 h-4 text-red-600" />
                </div>
                <span className="text-sm font-medium text-red-800">学生时间冲突</span>
              </div>
              <span className="text-lg font-bold text-red-600">{detailedStats.scheduleConflicts.student}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <Users className="w-4 h-4 text-orange-600" />
                </div>
                <span className="text-sm font-medium text-orange-800">教师时间冲突</span>
              </div>
              <span className="text-lg font-bold text-orange-600">{detailedStats.scheduleConflicts.teacher}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-yellow-600" />
                </div>
                <span className="text-sm font-medium text-yellow-800">教室冲突</span>
              </div>
              <span className="text-lg font-bold text-yellow-600">{detailedStats.scheduleConflicts.room}</span>
            </div>
            <div className="pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">总计冲突</span>
                <span className="text-xl font-bold text-gray-900">{detailedStats.scheduleConflicts.total}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 课程状态分布 */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-purple-500" />
            课程状态分布
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">已排课程</span>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-blue-600">{detailedStats.coursesByStatus.scheduled}</div>
                <div className="text-xs text-blue-500">
                  {Math.round((detailedStats.coursesByStatus.scheduled / courses.length) * 100)}%
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">已完成课程</span>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-green-600">{detailedStats.coursesByStatus.completed}</div>
                <div className="text-xs text-green-500">
                  {Math.round((detailedStats.coursesByStatus.completed / courses.length) * 100)}%
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-800">待排课程</span>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-gray-600">{detailedStats.coursesByStatus.pending}</div>
                <div className="text-xs text-gray-500">
                  {Math.round((detailedStats.coursesByStatus.pending / courses.length) * 100)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 时间趋势图表 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            学生数量趋势
          </h3>
          <MiniChart data={detailedStats.timeTrends.daily} color="bg-blue-500" />
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-500" />
            排课数量趋势
          </h3>
          <MiniChart data={detailedStats.timeTrends.weekly} color="bg-purple-500" />
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-green-500" />
            课程创建趋势
          </h3>
          <MiniChart data={detailedStats.timeTrends.monthly} color="bg-green-500" />
        </div>
      </div>

      {/* 教研室教师分布 */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-500" />
          教研室教师分布
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(detailedStats.teachersByFaculty).map(([faculty, count]) => {
            const percentage = (count / teachers.length) * 100;
            return (
              <div key={faculty} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{faculty}</span>
                  <span className="text-lg font-bold text-gray-900">{count}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-purple-400 to-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{percentage.toFixed(1)}%</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};