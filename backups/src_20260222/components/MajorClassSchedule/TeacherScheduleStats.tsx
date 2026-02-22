import React, { useState, useMemo, useEffect } from 'react';
import { Users, BookOpen, Calendar, CheckCircle, Clock, TrendingUp, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';

interface TeacherScheduleStatsProps {
  courses: any[];
  scheduledClasses: any[];
  classes: any[];
  teachers: any[];
  isAdmin?: boolean;
}

interface TeacherStats {
  teacherId: string;
  teacherName: string;
  totalCourses: number;
  totalHours: number;
  scheduledHours: number;
  remainingHours: number;
  completionRate: number;
  courses: any[];
}

const TeacherScheduleStats: React.FC<TeacherScheduleStatsProps> = ({ courses, scheduledClasses, classes, teachers, isAdmin = false }) => {
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'completion' | 'hours' | 'name'>('completion');

  // 计算每位教师的排课统计
  const teacherStats = useMemo(() => {
    const stats: TeacherStats[] = [];

    // 筛选出专业大课
    const majorCourses = courses.filter(course => (course as any).teaching_type === '专业大课');

    teachers.forEach(teacher => {
      // 查找该教师负责的专业大课
      const teacherCourses = majorCourses.filter(course => 
        (course as any).teacher_id === teacher.teacher_id || 
        (course as any).teacher_name === teacher.name
      );

      // 计算总课时
      const totalHours = teacherCourses.reduce((sum, course) => {
        return sum + ((course as any).credit_hours || (course as any).total_hours || 32);
      }, 0);

      // 计算已排课时
      let scheduledHours = 0;
      const scheduledCourseIds = new Set<string>();

      teacherCourses.forEach(course => {
        // 查找该课程的所有排课记录
        const courseSchedules = scheduledClasses.filter(schedule => 
          schedule.course_id === course.id
        );

        courseSchedules.forEach(schedule => {
          // 计算每个排课记录的课时（偶数节次不重复计算）
          if (schedule.period % 2 === 1) {
            scheduledHours += 2;
          }
          scheduledCourseIds.add(course.id);
        });
      });

      const remainingHours = Math.max(0, totalHours - scheduledHours);
      const completionRate = totalHours > 0 ? (scheduledHours / totalHours) * 100 : 0;

      stats.push({
        teacherId: teacher.teacher_id || teacher.id,
        teacherName: teacher.name || teacher.full_name,
        totalCourses: teacherCourses.length,
        totalHours,
        scheduledHours,
        remainingHours,
        completionRate,
        courses: teacherCourses
      });
    });

    // 根据排序方式排序
    return stats.sort((a, b) => {
      switch (sortBy) {
        case 'completion':
          return b.completionRate - a.completionRate;
        case 'hours':
          return b.totalHours - a.totalHours;
        case 'name':
          return a.teacherName.localeCompare(b.teacherName);
        default:
          return 0;
      }
    });
  }, [courses, scheduledClasses, classes, teachers]);

  // 计算总计
  const totalStats = useMemo(() => {
    return teacherStats.reduce((acc, stat) => ({
      totalCourses: acc.totalCourses + stat.totalCourses,
      totalHours: acc.totalHours + stat.totalHours,
      scheduledHours: acc.scheduledHours + stat.scheduledHours,
      remainingHours: acc.remainingHours + stat.remainingHours
    }), { totalCourses: 0, totalHours: 0, scheduledHours: 0, remainingHours: 0 });
  }, [teacherStats]);

  // 格式化百分比
  const formatRate = (rate: number) => {
    return `${rate.toFixed(1)}%`;
  };

  // 获取进度条颜色
  const getProgressColor = (rate: number) => {
    if (rate >= 100) return 'bg-green-500';
    if (rate >= 75) return 'bg-blue-500';
    if (rate >= 50) return 'bg-yellow-500';
    if (rate >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  // 展开/收起详情
  const toggleExpand = (teacherId: string) => {
    setExpandedTeacher(expandedTeacher === teacherId ? null : teacherId);
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      {/* 标题和统计概览 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">专业大课排课统计</h2>
            <p className="text-sm text-gray-500">各教师排课进度详情</p>
          </div>
        </div>

        {/* 排序选项 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">排序：</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="completion">完成率</option>
            <option value="hours">课时数</option>
            <option value="name">教师姓名</option>
          </select>
        </div>
      </div>

      {/* 总体统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">课程总数</p>
              <p className="text-2xl font-bold">{totalStats.totalCourses}</p>
            </div>
            <BookOpen className="w-8 h-8 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">总课时</p>
              <p className="text-2xl font-bold">{totalStats.totalHours}</p>
            </div>
            <Clock className="w-8 h-8 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">已排课时</p>
              <p className="text-2xl font-bold">{totalStats.scheduledHours}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-purple-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">剩余课时</p>
              <p className="text-2xl font-bold">{totalStats.remainingHours}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-200" />
          </div>
        </div>
      </div>

      {/* 教师列表 */}
      <div className="space-y-4">
        {teacherStats.map((stat) => (
          <div key={stat.teacherId} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* 教师统计摘要 */}
            <div 
              className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleExpand(stat.teacherId)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{stat.teacherName}</h3>
                    <p className="text-sm text-gray-500">{stat.totalCourses}门课程，共{stat.totalHours}课时</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* 进度条 */}
                  <div className="w-32">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-500">完成率</span>
                      <span className="font-medium text-gray-700">{formatRate(stat.completionRate)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${getProgressColor(stat.completionRate)}`}
                        style={{ width: `${Math.min(100, stat.completionRate)}%` }}
                      />
                    </div>
                  </div>

                  {/* 课时统计 */}
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-green-600">已排 {stat.scheduledHours}课时</span>
                    <span className="text-orange-600">剩余 {stat.remainingHours}课时</span>
                  </div>

                  {/* 展开/收起图标 */}
                  {expandedTeacher === stat.teacherId ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>
            </div>

            {/* 展开的课程详情 */}
            {expandedTeacher === stat.teacherId && (
              <div className="border-t border-gray-200 bg-gray-50 p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">课程详情</h4>
                <div className="space-y-2">
                  {stat.courses.map((course) => {
                    // 计算该课程的已排课时
                    const courseSchedules = scheduledClasses.filter(s => s.course_id === course.id);
                    let courseScheduledHours = 0;
                    courseSchedules.forEach(s => {
                      if (s.period % 2 === 1) courseScheduledHours += 2;
                    });
                    const courseTotalHours = (course as any).credit_hours || (course as any).total_hours || 32;
                    const courseRemaining = Math.max(0, courseTotalHours - courseScheduledHours);
                    const courseRate = courseTotalHours > 0 ? (courseScheduledHours / courseTotalHours) * 100 : 0;

                    // 查找排课的班级
                    const scheduleClasses = courseSchedules.map(s => {
                      const cls = classes.find(c => c.class_id === s.class_id);
                      return cls?.class_name || s.class_id;
                    }).filter(Boolean);

                    return (
                      <div key={course.id} className="bg-white p-3 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-medium text-gray-900">{course.course_name}</p>
                            <p className="text-xs text-gray-500">
                              {scheduleClasses.length > 0 ? scheduleClasses.join('、') : '未分配班级'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-700">
                              {courseScheduledHours} / {courseTotalHours} 课时
                            </p>
                            <p className="text-xs text-gray-500">
                              剩余 {courseRemaining} 课时
                            </p>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full ${getProgressColor(courseRate)}`}
                            style={{ width: `${Math.min(100, courseRate)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}

        {teacherStats.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>暂无专业大课数据</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherScheduleStats;
