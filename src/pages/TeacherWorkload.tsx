/**
 * 教师工作量统计页面
 * 统计教师的课时量、教学学生数等数据
 *
 * 课时计算规则（根据工作量统计Excel）：
 * - 1课时 = 1节次
 * - 单节课时量 = 课时系数 × 实际排课周数
 * - 普通班：主项1人=0.35, 副项1人=0.175, 主项2人=0.8, 副项2人=0.4/0.8(8周)
 * - 专升本：副项1人=0.7
 * - 第6学期：主项1人=0.7, 副项1人=0.35/0.7(8周), 副项2人=0.8
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { scheduleService, courseService, teacherService, studentTeacherAssignmentService } from '../services';
import { BarChart3, Users, Clock, BookOpen, TrendingUp, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { exportUtils } from '../utils/excel';
import { getHourCoefficient, StudentType, GroupType } from '../types';

// 格式化排课时间（与ArrangeClass.tsx中的formatScheduleTime函数一致）
const formatScheduleTime = (schedules: any[]) => {
  // 星期几映射
  const weekDayMap: {[key: number]: string} = {
    1: '周一',
    2: '周二',
    3: '周三',
    4: '周四',
    5: '周五',
    6: '周六',
    7: '周日'
  };

  // 按星期和节次分组，收集所有周次
  const timeGroupMap = new Map<string, number[]>();

  schedules.forEach(schedule => {
    const week = schedule.start_week || schedule.week;
    const day = schedule.day_of_week || schedule.day;
    const period = schedule.period;

    if (week && day && period) {
      const timeKey = `${day}_${period}`;
      if (!timeGroupMap.has(timeKey)) {
        timeGroupMap.set(timeKey, []);
      }
      timeGroupMap.get(timeKey)!.push(week);
    }
  });

  // 生成合并后的时间字符串
  const timeElements: string[] = [];

  // 按星期几和节次排序
  const sortedTimeKeys = Array.from(timeGroupMap.keys()).sort((a, b) => {
    const [dayA, periodA] = a.split('_').map(Number);
    const [dayB, periodB] = b.split('_').map(Number);
    if (dayA !== dayB) return dayA - dayB;
    return periodA - periodB;
  });

  sortedTimeKeys.forEach(timeKey => {
    const [day, period] = timeKey.split('_').map(Number);
    const weeks = timeGroupMap.get(timeKey)!;

    // 去重并排序周次
    const uniqueWeeks = Array.from(new Set(weeks)).sort((a, b) => a - b);

    if (uniqueWeeks.length > 0) {
      // 合并连续周次
      const mergedRanges: { start: number; end: number }[] = [];
      let start = uniqueWeeks[0];
      let end = uniqueWeeks[0];

      for (let j = 1; j < uniqueWeeks.length; j++) {
        if (uniqueWeeks[j] === end + 1) {
          end = uniqueWeeks[j];
        } else {
          mergedRanges.push({ start, end });
          start = uniqueWeeks[j];
          end = uniqueWeeks[j];
        }
      }
      mergedRanges.push({ start, end });

      // 生成时间字符串（格式：第1-2周、5-9周、11-17周周二第3节）
      const dayName = weekDayMap[day] || `周${day}`;
      const rangeStrings = mergedRanges.map(range => {
        if (range.start === range.end) {
          return `${range.start}`;
        } else {
          return `${range.start}-${range.end}`;
        }
      });

      timeElements.push(`第${rangeStrings.join('、')}周${dayName}第${period}节`);
    }
  });

  return timeElements.join('；');
};

// 从排课数据中识别专业小课类型
interface ScheduleWithCourseInfo {
  id: string;
  teacher_id: string;
  teacher_name?: string;
  course_id: string;
  student_id: string;
  student_name?: string;
  day_of_week: number;
  period: number;
  start_week: number;
  end_week: number;
  semester_label?: string;
  group_id?: string;  // 小组ID
  courses?: {
    course_name: string;
    course_type: string;
    course_category?: string;
    group_size?: number;
    total_hours?: number;  // 总课时
    credit_hours?: number; // 学分课时
  };
  students?: {
    name: string;
    student_type?: 'general' | 'upgrade';
    primary_instrument?: string;
    secondary_instruments?: string[]; // 副项列表（2-3个）
    assigned_teachers?: {
      primary_teacher_id?: string;
      secondary1_teacher_id?: string;
      secondary2_teacher_id?: string;
      secondary3_teacher_id?: string;
    };
  };
}

// 小组中的学生信息
interface GroupStudentInfo {
  student_id: string;
  student_name: string;
  student_type: 'general' | 'upgrade';
  course_category: 'primary' | 'secondary';
}

// 课程小组详情
interface CourseGroupDetail {
  group_id: string;                    // 小组ID
  course_id: string;                   // 课程编号
  course_name: string;                 // 课程名称
  course_type: string;                 // 课程类型（钢琴/声乐/器乐）
  students: GroupStudentInfo[];        // 小组学生列表
  primary_students: string;            // 主项学生姓名列表
  secondary_students: string;          // 副项学生姓名列表
  primary_count: number;               // 主项学生数
  secondary_count: number;             // 副项学生数
  total_students: number;              // 总人数
  schedule_time: string;               // 排课时间（从排课结果提取）
  total_hours: number;                 // 总课时（从排课结果提取）
  coefficient: number;                 // 课时系数
  workload: number;                    // 工作量
}

// 统计结果类型
interface TeacherWorkload {
  teacher_id: string;
  teacher_name: string;
  faculty_name: string;
  total_classes: number;        // 总课程数
  total_students: number;       // 总学生数
  total_hours: number;          // 总课时数（根据新系数计算）
  raw_hours: number;            // 原始课时数（按节次计算）
  piano_hours: number;          // 钢琴课时
  vocal_hours: number;          // 声乐课时
  instrument_hours: number;     // 器乐课时
  major_course_hours: number;   // 专业小课课时（来自排课结果）
  major_course_students: number;// 专业小课学生数
  major_course_classes: number; // 专业小课课程数
  course_details: CourseGroupDetail[]; // 课程小组详情
}

/**
 * 根据小组类型和人数计算课时工作量
 * 公式：单节课时量 = 课时系数 × 实际排课周数
 * @param groupType 小组类型（primary主项/secondary副项/mixed混合）
 * @param persons 小组人数
 * @param scheduledWeeks 实际排课周数
 * @param totalWeeks 总周数（用于查找对应系数）
 * @param studentType 学生类型（普通班/专升本/第6学期）
 * @returns 课时工作量
 */
function calculateWorkload(
  groupType: GroupType,
  persons: number,
  scheduledWeeks: number,
  totalWeeks: number = 16,
  studentType: StudentType = 'general'
): number {
  const coefficient = getHourCoefficient(groupType, persons, totalWeeks, studentType);
  return coefficient * scheduledWeeks;
}

export default function TeacherWorkload() {
  const { teacher: currentTeacher, user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [workloads, setWorkloads] = useState<TeacherWorkload[]>([]);
  const [myWorkload, setMyWorkload] = useState<TeacherWorkload | null>(null);
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null);

  // 根据课程名称判断专业类型
  const getFacultyByCourseName = (courseName: string): string => {
    const pianoInstruments = ['钢琴', '钢琴伴奏'];
    const vocalInstruments = ['声乐', '合唱'];
    
    if (pianoInstruments.some(i => courseName.includes(i))) {
      return '钢琴教研室';
    } else if (vocalInstruments.some(i => courseName.includes(i))) {
      return '声乐教研室';
    } else {
      return '器乐教研室';
    }
  };

  // 判断是否为专业小课（小组课）
  const isMajorCourse = (courseName: string): boolean => {
    const majorCourseTypes = ['钢琴', '声乐', '器乐', '古筝', '笛子', '古琴', '葫芦丝', '双排键', '小提琴', '萨克斯', '二胡', '琵琶', '扬琴'];
    return majorCourseTypes.some(type => courseName.includes(type));
  };

  // 判断是否为专业大课（课程名称包含"大课"）
  const isLargeClass = (courseName: string): boolean => {
    return courseName.includes('大课');
  };

  // 计算专业小课课时工作量
  const calculateMajorCourseWorkload = (
    courseCategory: string | undefined,
    studentType: 'general' | 'upgrade',
    scheduledWeeks: number,
    totalWeeks: number = 16
  ): number => {
    const groupType: GroupType = courseCategory === 'primary' ? 'primary' : 'secondary';
    const stuType: StudentType = studentType === 'upgrade' ? 'upgrade' : 'general';
    const coefficient = getHourCoefficient(groupType, 1, totalWeeks, stuType);
    return coefficient * scheduledWeeks;
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 获取所有课程数据（用于查找课程编号）
        const allCourses = await courseService.getAll();
        // 获取所有教师分配数据（用于判断主项/副项）
        const allAssignments = await studentTeacherAssignmentService.getAll();

        if (isAdmin) {
          // 管理员：获取所有教师的工作量（所有学期数据）
          const allSchedules = await scheduleService.getAll();
          const allTeachers = await teacherService.getAll();

          // 按教师分组统计
          const scheduleByTeacher = new Map<string, ScheduleWithCourseInfo[]>();
          for (const sc of allSchedules) {
            const list = scheduleByTeacher.get(sc.teacher_id) || [];
            list.push(sc);
            scheduleByTeacher.set(sc.teacher_id, list);
          }

          // 计算每位教师的工作量
          const workloadsList: TeacherWorkload[] = [];
          for (const [teacherId, schedules] of scheduleByTeacher) {
            const teacherSchedules = schedules;
            
            // 获取教师信息
            const teacherInfo = allTeachers.find(t => t.id === teacherId);
            const teacherName = teacherInfo?.name || teacherSchedules[0]?.teacher_name || '未知教师';
            const facultyName = teacherInfo?.faculty_name || '未知教研室';
            
            // 过滤掉未知教研室和未知教师的数据
            if (facultyName === '未知教研室' || teacherName === '未知教师') {
              continue;
            }
            
            // 按小组ID分组（同一个小组的排课记录有相同的group_id或按时间+课程分组）
            const groupMap = new Map<string, ScheduleWithCourseInfo[]>();
            for (const sc of teacherSchedules) {
              // 使用 group_id 或按课程+时间分组
              const groupKey = sc.group_id || `${sc.course_id}-${sc.day_of_week}-${sc.period}-${sc.start_week}-${sc.end_week}`;
              const list = groupMap.get(groupKey) || [];
              list.push(sc);
              groupMap.set(groupKey, list);
            }

            let pianoHours = 0, vocalHours = 0, instrumentHours = 0;
            let rawHours = 0;
            let majorCourseHours = 0;
            let majorCourseClasses = 0;
            const uniqueMajorStudents = new Set<string>();
            const courseDetails: CourseGroupDetail[] = [];
            
            // 遍历每个小组
            for (const [groupId, groupSchedules] of groupMap) {
              const firstSchedule = groupSchedules[0];
              const courseName = firstSchedule.courses?.course_name || '';
              const courseType = firstSchedule.courses?.course_type || '';
              
              // 过滤掉专业大课，只统计小组课
              if (isLargeClass(courseName)) {
                continue;
              }
              
              // 课程编号：通过课程名称查找课程，然后获取 course_id
              const courseInfo = allCourses.find(c => c.course_name === courseName);
              const courseId = (courseInfo as any)?.course_id || courseInfo?.id || firstSchedule.course_id || '';
              
              // 从排课结果中提取总课时
              const courseTotalHours = firstSchedule.courses?.total_hours || firstSchedule.courses?.credit_hours || 16;
              
              // 格式化排课时间（与ArrangeClass.tsx中的formatScheduleTime函数一致）
              const scheduleTime = formatScheduleTime(groupSchedules);

              // 统计小组学生构成（使用Map去重，防止学生重复）
              const studentMap = new Map<string, GroupStudentInfo>();
              
              for (const sc of groupSchedules) {
                const studentId = sc.student_id;
                if (!studentId || studentMap.has(studentId)) continue;
                
                const studentType = sc.students?.student_type === 'upgrade' ? 'upgrade' : 'general';
                
                // 判断主项/副项
                const studentName = sc.students?.name || sc.student_name || '未知学生';
                
                let courseCategory: 'primary' | 'secondary';
                
                // 优先从教师分配数据中查找
                const assignment = allAssignments.find(a =>
                  a.student_id === studentId &&
                  a.teacher_id === teacherId &&
                  a.is_active &&
                  a.assignment_status === 'active'
                );
                
                if (assignment) {
                  // 使用教师分配数据
                  courseCategory = assignment.assignment_type === 'primary' ? 'primary' : 'secondary';
                } else if (sc.students?.assigned_teachers) {
                  // 备用方案1：使用学生的 assigned_teachers 判断
                  const assignedTeachers = sc.students.assigned_teachers;
                  if (assignedTeachers.primary_teacher_id === teacherId) {
                    courseCategory = 'primary';
                  } else {
                    courseCategory = 'secondary';
                  }
                } else {
                  // 备用方案2：使用学生的主项乐器和课程名称判断
                  const studentPrimaryInstrument = sc.students?.primary_instrument || '';
                  // 如果课程名称包含学生的主项乐器，则是主项；否则是副项
                  const isPrimary = studentPrimaryInstrument && courseName.includes(studentPrimaryInstrument);
                  courseCategory = isPrimary ? 'primary' : 'secondary';
                }
                
                studentMap.set(studentId, {
                  student_id: studentId,
                  student_name: studentName,
                  student_type: studentType,
                  course_category: courseCategory,
                });
                
                if (sc.student_id) uniqueMajorStudents.add(sc.student_id);
              }
              
              const students = Array.from(studentMap.values());
              const primaryStudentsList = students.filter(s => s.course_category === 'primary').map(s => s.student_name);
              const secondaryStudentsList = students.filter(s => s.course_category === 'secondary').map(s => s.student_name);
              const primaryCount = primaryStudentsList.length;
              const secondaryCount = secondaryStudentsList.length;
              const totalStudents = students.length;
              
              // 计算排课周数
              const startWeek = firstSchedule.start_week || 1;
              const endWeek = firstSchedule.end_week || 16;
              const scheduledWeeks = endWeek - startWeek + 1;
              const totalWeeks = 16;

              // 判断是否为专业小课
              const isMajor = isMajorCourse(courseName);
              
              // 计算课时系数和工作量
              let coefficient = 0;
              let hours = 0;
              
              if (isMajor) {
                // 专业小课：根据主项/副项人数确定系数
                if (primaryCount > 0 && secondaryCount === 0) {
                  // 纯主项小组
                  const groupType: GroupType = 'primary';
                  coefficient = getHourCoefficient(groupType, primaryCount, totalWeeks, 'general');
                } else if (secondaryCount > 0 && primaryCount === 0) {
                  // 纯副项小组
                  const groupType: GroupType = 'secondary';
                  const hasUpgrade = students.some(s => s.student_type === 'upgrade');
                  coefficient = getHourCoefficient(groupType, secondaryCount, totalWeeks, hasUpgrade ? 'upgrade' : 'general');
                } else {
                  // 混合小组（既有主项又有副项）
                  // 根据规则：1主1副或1主2副为混合组，其他按副项处理
                  let groupType: GroupType;
                  if (primaryCount === 1 && (secondaryCount === 1 || secondaryCount === 2)) {
                    groupType = 'mixed';
                  } else {
                    groupType = 'secondary';
                  }
                  const hasUpgrade = students.some(s => s.student_type === 'upgrade');
                  coefficient = getHourCoefficient(groupType, totalStudents, totalWeeks, hasUpgrade ? 'upgrade' : 'general');
                }
                hours = coefficient * scheduledWeeks;
                majorCourseHours += hours;
                majorCourseClasses += 1;

                const faculty = getFacultyByCourseName(courseName);
                if (faculty === '钢琴教研室') {
                  pianoHours += hours;
                } else if (faculty === '声乐教研室') {
                  vocalHours += hours;
                } else {
                  instrumentHours += hours;
                }
              } else {
                const groupType: GroupType = firstSchedule.courses?.course_category === 'primary' ? 'primary' : 'secondary';
                coefficient = getHourCoefficient(groupType, totalStudents, totalWeeks, 'general');
                hours = coefficient * scheduledWeeks;
                rawHours += 1;

                switch (courseType) {
                  case '钢琴': pianoHours += hours; break;
                  case '声乐': vocalHours += hours; break;
                  default: instrumentHours += hours;
                }
              }

              // 记录小组详情
              courseDetails.push({
                group_id: groupId,
                course_id: courseId,
                course_name: courseName,
                course_type: courseType,
                students,
                primary_students: primaryStudentsList.join('、'),
                secondary_students: secondaryStudentsList.join('、'),
                primary_count: primaryCount,
                secondary_count: secondaryCount,
                total_students: totalStudents,
                schedule_time: scheduleTime,
                total_hours: courseTotalHours,
                coefficient: Math.round(coefficient * 1000) / 1000,
                workload: Math.round(hours * 100) / 100,
              });
            }

            const totalHours = pianoHours + vocalHours + instrumentHours;

            workloadsList.push({
              teacher_id: teacherId,
              teacher_name: teacherName,
              faculty_name: facultyName,
              total_classes: courseDetails.length,
              total_students: uniqueMajorStudents.size,
              total_hours: Math.round(totalHours * 100) / 100,
              raw_hours: rawHours + majorCourseClasses,
              piano_hours: Math.round(pianoHours * 100) / 100,
              vocal_hours: Math.round(vocalHours * 100) / 100,
              instrument_hours: Math.round(instrumentHours * 100) / 100,
              major_course_hours: Math.round(majorCourseHours * 100) / 100,
              major_course_students: uniqueMajorStudents.size,
              major_course_classes: majorCourseClasses,
              course_details: courseDetails,
            });
          }

          setWorkloads(workloadsList.sort((a, b) => b.total_hours - a.total_hours));
        } else {
          // 普通教师：只获取自己的工作量
          const mySchedules = await scheduleService.getByTeacher(currentTeacher?.id || '');
          const myCourses = await courseService.getByTeacher(currentTeacher?.id || '');

          // 按小组ID分组
          const groupMap = new Map<string, ScheduleWithCourseInfo[]>();
          for (const sc of mySchedules) {
            const groupKey = sc.group_id || `${sc.course_id}-${sc.day_of_week}-${sc.period}-${sc.start_week}-${sc.end_week}`;
            const list = groupMap.get(groupKey) || [];
            list.push(sc);
            groupMap.set(groupKey, list);
          }

          let pianoHours = 0, vocalHours = 0, instrumentHours = 0;
          let rawTotalHours = 0;
          let majorCourseHours = 0;
          let majorCourseClasses = 0;
          const uniqueMajorStudents = new Set<string>();
          const courseDetails: CourseGroupDetail[] = [];

          // 遍历每个小组
          for (const [groupId, groupSchedules] of groupMap) {
            const firstSchedule = groupSchedules[0];
            const course = myCourses.find(c => c.id === firstSchedule.course_id);
            if (!course) continue;

            const courseName = course.course_name || '';
            const courseType = course.course_type || '';
            
            // 过滤掉专业大课，只统计小组课
            if (isLargeClass(courseName)) {
              continue;
            }
            
            // 课程编号：通过课程名称查找所有课程，然后获取 course_id
            const courseInfo = allCourses.find(c => c.course_name === courseName);
            const courseId = (courseInfo as any)?.course_id || courseInfo?.id || firstSchedule.course_id || '';
            
            // 从排课结果中提取总课时
            const courseTotalHours = firstSchedule.courses?.total_hours || firstSchedule.courses?.credit_hours || (course as any).total_hours || (course as any).credit_hours || 16;
            
            // 格式化排课时间（与ArrangeClass.tsx中的formatScheduleTime函数一致）
            const scheduleTime = formatScheduleTime(groupSchedules);

            // 统计小组学生构成（使用Map去重，防止学生重复）
            const studentMap = new Map<string, GroupStudentInfo>();
            
            for (const sc of groupSchedules) {
              const studentId = sc.student_id;
              if (!studentId || studentMap.has(studentId)) continue;
              
              const studentType = sc.students?.student_type === 'upgrade' ? 'upgrade' : 'general';
              
              // 判断主项/副项
              let courseCategory: 'primary' | 'secondary';

              // 优先从教师分配数据中查找
              const assignment = allAssignments.find(a =>
                a.student_id === studentId &&
                a.teacher_id === currentTeacher?.id &&
                a.is_active &&
                a.assignment_status === 'active'
              );

              if (assignment) {
                // 使用教师分配数据
                courseCategory = assignment.assignment_type === 'primary' ? 'primary' : 'secondary';
              } else if (sc.students?.assigned_teachers) {
                // 备用方案1：使用学生的 assigned_teachers 判断
                const assignedTeachers = sc.students.assigned_teachers;
                if (assignedTeachers.primary_teacher_id === currentTeacher?.id) {
                  courseCategory = 'primary';
                } else {
                  courseCategory = 'secondary';
                }
              } else {
                // 备用方案2：使用学生的主项乐器和课程名称判断
                const studentPrimaryInstrument = sc.students?.primary_instrument || '';
                // 如果课程名称包含学生的主项乐器，则是主项；否则是副项
                const isPrimary = studentPrimaryInstrument && courseName.includes(studentPrimaryInstrument);
                courseCategory = isPrimary ? 'primary' : 'secondary';
              }
              
              const studentName = sc.students?.name || sc.student_name || '未知学生';
              
              studentMap.set(studentId, {
                student_id: studentId,
                student_name: studentName,
                student_type: studentType,
                course_category: courseCategory,
              });
              
              if (sc.student_id) uniqueMajorStudents.add(sc.student_id);
            }
            
            const students = Array.from(studentMap.values());
            const primaryStudentsList = students.filter(s => s.course_category === 'primary').map(s => s.student_name);
            const secondaryStudentsList = students.filter(s => s.course_category === 'secondary').map(s => s.student_name);
            const primaryCount = primaryStudentsList.length;
            const secondaryCount = secondaryStudentsList.length;
            const totalStudents = students.length;
            
            // 计算排课周数
            const startWeek = firstSchedule.start_week || 1;
            const endWeek = firstSchedule.end_week || 16;
            const scheduledWeeks = endWeek - startWeek + 1;
            const totalWeeks = 16;

            // 判断是否为专业小课
            const isMajor = isMajorCourse(courseName);
            
            // 计算课时系数和工作量
            let coefficient = 0;
            let hours = 0;
            
            if (isMajor) {
              if (primaryCount > 0 && secondaryCount === 0) {
                // 纯主项小组
                const groupType: GroupType = 'primary';
                coefficient = getHourCoefficient(groupType, primaryCount, totalWeeks, 'general');
              } else if (secondaryCount > 0 && primaryCount === 0) {
                // 纯副项小组
                const groupType: GroupType = 'secondary';
                const hasUpgrade = students.some(s => s.student_type === 'upgrade');
                coefficient = getHourCoefficient(groupType, secondaryCount, totalWeeks, hasUpgrade ? 'upgrade' : 'general');
              } else {
                // 混合小组（既有主项又有副项）
                // 根据规则：1主1副或1主2副为混合组，其他按副项处理
                let groupType: GroupType;
                if (primaryCount === 1 && (secondaryCount === 1 || secondaryCount === 2)) {
                  groupType = 'mixed';
                } else {
                  groupType = 'secondary';
                }
                const hasUpgrade = students.some(s => s.student_type === 'upgrade');
                coefficient = getHourCoefficient(groupType, totalStudents, totalWeeks, hasUpgrade ? 'upgrade' : 'general');
              }
              hours = coefficient * scheduledWeeks;
              majorCourseHours += hours;
              majorCourseClasses += 1;

              const faculty = getFacultyByCourseName(courseName);
              if (faculty === '钢琴教研室') {
                pianoHours += hours;
              } else if (faculty === '声乐教研室') {
                vocalHours += hours;
              } else {
                instrumentHours += hours;
              }
            } else {
              const groupType: GroupType = course.course_category === 'primary' ? 'primary' : 'secondary';
              coefficient = getHourCoefficient(groupType, totalStudents, totalWeeks, 'general');
              hours = coefficient * scheduledWeeks;
              rawTotalHours += 1;

              switch (courseType) {
                case '钢琴': pianoHours += hours; break;
                case '声乐': vocalHours += hours; break;
                default: instrumentHours += hours;
              }
            }

            // 记录小组详情
            courseDetails.push({
              group_id: groupId,
              course_id: courseId,
              course_name: courseName,
              course_type: courseType,
              students,
              primary_students: primaryStudentsList.join('、'),
              secondary_students: secondaryStudentsList.join('、'),
              primary_count: primaryCount,
              secondary_count: secondaryCount,
              total_students: totalStudents,
              schedule_time: scheduleTime,
              total_hours: courseTotalHours,
              coefficient: Math.round(coefficient * 1000) / 1000,
              workload: Math.round(hours * 100) / 100,
            });
          }

          const totalHours = pianoHours + vocalHours + instrumentHours;

          setMyWorkload({
            teacher_id: currentTeacher?.id || '',
            teacher_name: currentTeacher?.name || '我',
            faculty_name: currentTeacher?.faculty_name || '',
            total_classes: courseDetails.length,
            total_students: uniqueMajorStudents.size,
            total_hours: Math.round(totalHours * 100) / 100,
            raw_hours: rawTotalHours + majorCourseClasses,
            piano_hours: Math.round(pianoHours * 100) / 100,
            vocal_hours: Math.round(vocalHours * 100) / 100,
            instrument_hours: Math.round(instrumentHours * 100) / 100,
            major_course_hours: Math.round(majorCourseHours * 100) / 100,
            major_course_students: uniqueMajorStudents.size,
            major_course_classes: majorCourseClasses,
            course_details: courseDetails,
          });
        }
      } catch (error) {
        console.error('获取统计数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentTeacher, isAdmin]);

  // 导出统计报表
  const handleExport = () => {
    if (isAdmin) {
      const exportData = workloads.map(w => ({
        '教研室': w.faculty_name,
        '教师姓名': w.teacher_name,
        '加权总课时': w.total_hours,
        '原始总课时': w.raw_hours,
        '钢琴课时': w.piano_hours,
        '声乐课时': w.vocal_hours,
        '器乐课时': w.instrument_hours,
        '专业小课课时': w.major_course_hours,
        '专业小课学生数': w.major_course_students,
        '专业小课课程数': w.major_course_classes,
        '课程数': w.total_classes,
        '学生数': w.total_students,
      }));
      exportUtils.exportToExcel(exportData, '教师工作量统计', '工作量统计');
    } else if (myWorkload) {
      const exportData = [{
        '教师姓名': myWorkload.teacher_name,
        '教研室': myWorkload.faculty_name,
        '加权总课时': myWorkload.total_hours,
        '原始总课时': myWorkload.raw_hours,
        '钢琴课时': myWorkload.piano_hours,
        '声乐课时': myWorkload.vocal_hours,
        '器乐课时': myWorkload.instrument_hours,
        '专业小课课时': myWorkload.major_course_hours,
        '专业小课学生数': myWorkload.major_course_students,
        '专业小课课程数': myWorkload.major_course_classes,
        '课程数': myWorkload.total_classes,
        '学生数': myWorkload.total_students,
      }];
      exportUtils.exportToExcel(exportData, '我的工作量统计', '工作量统计');
    }
  };

  // 获取教研统计
  const getFacultyStats = () => {
    const stats = new Map<string, { hours: number; teachers: number }>();
    for (const w of workloads) {
      const current = stats.get(w.faculty_name) || { hours: 0, teachers: 0 };
      stats.set(w.faculty_name, {
        hours: current.hours + w.total_hours,
        teachers: current.teachers + 1
      });
    }
    return Array.from(stats.entries()).map(([name, data]) => ({
      name,
      hours: Math.round(data.hours * 10) / 10,
      teachers: data.teachers
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-purple-600" />
          工作量统计
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            导出报表
          </button>
        </div>
      </div>

      {/* 个人统计（普通教师） */}
      {!isAdmin && myWorkload && (
        <div className="card mb-6">
          <div className="p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              我的工作量统计
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">教授学生数</p>
                <p className="text-3xl font-bold text-purple-600">{myWorkload.total_students}</p>
                <p className="text-xs text-gray-400">人</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">课程总数</p>
                <p className="text-3xl font-bold text-blue-600">{myWorkload.total_classes}</p>
                <p className="text-xs text-gray-400">节</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">加权总课时</p>
                <p className="text-3xl font-bold text-green-600">{myWorkload.total_hours}</p>
                <p className="text-xs text-gray-400">课时</p>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm text-amber-600">原始总课时</p>
                <p className="text-3xl font-bold text-amber-600">{myWorkload.raw_hours}</p>
                <p className="text-xs text-amber-400">课时</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">教研室</p>
                <p className="text-lg font-bold text-gray-700 mt-2">{myWorkload.faculty_name}</p>
              </div>
            </div>
            
            {/* 专业小课统计 */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                专业小课统计
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-indigo-50 rounded-lg">
                  <p className="text-sm text-indigo-600">专业小课课时</p>
                  <p className="text-2xl font-bold text-indigo-700">{myWorkload.major_course_hours}</p>
                  <p className="text-xs text-indigo-400">课时</p>
                </div>
                <div className="text-center p-4 bg-indigo-50 rounded-lg">
                  <p className="text-sm text-indigo-600">专业小课学生</p>
                  <p className="text-2xl font-bold text-indigo-700">{myWorkload.major_course_students}</p>
                  <p className="text-xs text-indigo-400">人</p>
                </div>
                <div className="text-center p-4 bg-indigo-50 rounded-lg">
                  <p className="text-sm text-indigo-600">专业小课课程</p>
                  <p className="text-2xl font-bold text-indigo-700">{myWorkload.major_course_classes}</p>
                  <p className="text-xs text-indigo-400">节</p>
                </div>
                <div className="text-center p-4 bg-indigo-50 rounded-lg">
                  <p className="text-sm text-indigo-600">占比</p>
                  <p className="text-2xl font-bold text-indigo-700">
                    {myWorkload.total_hours > 0 
                      ? Math.round((myWorkload.major_course_hours / myWorkload.total_hours) * 100) 
                      : 0}%
                  </p>
                  <p className="text-xs text-indigo-400">总课时</p>
                </div>
              </div>
            </div>

            {/* 我的课程小组详情 */}
            {myWorkload.course_details.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-purple-600" />
                  我的课程小组详情 ({myWorkload.course_details.length}个小组)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-center">序号</th>
                        <th className="px-3 py-2 text-left">课程编号</th>
                        <th className="px-3 py-2 text-left">课程名称</th>
                        <th className="px-3 py-2 text-left">主项</th>
                        <th className="px-3 py-2 text-left">副项</th>
                        <th className="px-3 py-2 text-center">人数</th>
                        <th className="px-3 py-2 text-left">排课时间</th>
                        <th className="px-3 py-2 text-center">总课时</th>
                        <th className="px-3 py-2 text-center">课时系数</th>
                        <th className="px-3 py-2 text-right">工作量</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {myWorkload.course_details.map((detail, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-center text-gray-500">{idx + 1}</td>
                          <td className="px-3 py-2 font-mono text-xs">{detail.course_id}</td>
                          <td className="px-3 py-2 font-medium">{detail.course_name}</td>
                          <td className="px-3 py-2 text-xs text-purple-600">{detail.primary_students || '-'}</td>
                          <td className="px-3 py-2 text-xs text-blue-600">{detail.secondary_students || '-'}</td>
                          <td className="px-3 py-2 text-center">{detail.total_students}</td>
                          <td className="px-3 py-2 text-xs">{detail.schedule_time}</td>
                          <td className="px-3 py-2 text-center">{detail.total_hours}</td>
                          <td className="px-3 py-2 text-center font-mono">{detail.coefficient}</td>
                          <td className="px-3 py-2 text-right font-bold text-purple-600">{detail.workload}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-100 font-semibold">
                      <tr>
                        <td colSpan={9} className="px-3 py-2 text-right">合计工作量：</td>
                        <td className="px-3 py-2 text-right text-purple-600">
                          {Math.round(myWorkload.course_details.reduce((sum, d) => sum + d.workload, 0) * 100) / 100}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 教研室统计（管理员） */}
      {isAdmin && (
        <div className="card mb-6">
          <div className="p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              教研室统计
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {getFacultyStats().map(stat => (
                <div key={stat.name} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{stat.name}</span>
                    <span className="text-sm text-gray-500">{stat.teachers}位教师</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-600">{stat.hours} 课时</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: `${Math.min(100, (stat.hours / Math.max(...getFacultyStats().map(s => s.hours))) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 教师工作量列表（管理员） */}
      {isAdmin && (
        <div className="card">
          <div className="p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-600" />
              教师工作量排名
            </h2>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>排名</th>
                    <th>教研室</th>
                    <th>教师姓名</th>
                    <th>加权课时</th>
                    <th>原始课时</th>
                    <th>专业小课课时</th>
                    <th>钢琴</th>
                    <th>声乐</th>
                    <th>器乐</th>
                    <th>课程数</th>
                    <th>学生数</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {workloads.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="text-center py-8 text-gray-500">
                        暂无排课数据
                      </td>
                    </tr>
                  ) : (
                    workloads.map((w, index) => (
                      <React.Fragment key={w.teacher_id}>
                        <tr className="hover:bg-gray-50">
                          <td>
                            <span className={`font-mono font-bold ${
                              index === 0 ? 'text-yellow-600' :
                              index === 1 ? 'text-gray-500' :
                              index === 2 ? 'text-orange-600' :
                              'text-gray-400'
                            }`}>
                              #{index + 1}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${
                              w.faculty_name?.includes('钢琴') ? 'badge-info' :
                              w.faculty_name?.includes('声乐') ? 'badge-success' :
                              'badge-warning'
                            }`}>
                              {w.faculty_name}
                            </span>
                          </td>
                          <td className="font-medium">{w.teacher_name}</td>
                          <td className="font-bold text-purple-600">{w.total_hours}</td>
                          <td className="text-amber-600">{w.raw_hours}</td>
                          <td className="text-indigo-600">{w.major_course_hours}</td>
                          <td>{w.piano_hours}</td>
                          <td>{w.vocal_hours}</td>
                          <td>{w.instrument_hours}</td>
                          <td>{w.total_classes}</td>
                          <td>{w.total_students}</td>
                          <td>
                            <button
                              onClick={() => setExpandedTeacher(expandedTeacher === w.teacher_id ? null : w.teacher_id)}
                              className="btn-secondary text-xs py-1 px-2 flex items-center gap-1"
                            >
                              {expandedTeacher === w.teacher_id ? (
                                <><ChevronUp className="w-3 h-3" /> 收起</>
                              ) : (
                                <><ChevronDown className="w-3 h-3" /> 详情</>
                              )}
                            </button>
                          </td>
                        </tr>
                        {/* 展开的详情表格 */}
                        {expandedTeacher === w.teacher_id && w.course_details.length > 0 && (
                          <tr>
                            <td colSpan={12} className="p-0">
                              <div className="bg-gray-50 p-4">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                  {w.teacher_name} - 课程小组详情 ({w.course_details.length}个小组)
                                </h4>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead className="bg-gray-100">
                                      <tr>
                                        <th className="px-3 py-2 text-center">序号</th>
                                        <th className="px-3 py-2 text-left">课程编号</th>
                                        <th className="px-3 py-2 text-left">课程名称</th>
                                        <th className="px-3 py-2 text-left">主项</th>
                                        <th className="px-3 py-2 text-left">副项</th>
                                        <th className="px-3 py-2 text-center">人数</th>
                                        <th className="px-3 py-2 text-left">排课时间</th>
                                        <th className="px-3 py-2 text-center">总课时</th>
                                        <th className="px-3 py-2 text-center">课时系数</th>
                                        <th className="px-3 py-2 text-right">工作量</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                      {w.course_details.map((detail, idx) => (
                                        <tr key={idx} className="hover:bg-white">
                                          <td className="px-3 py-2 text-center text-gray-500">{idx + 1}</td>
                                          <td className="px-3 py-2 font-mono">{detail.course_id}</td>
                                          <td className="px-3 py-2 font-medium">{detail.course_name}</td>
                                          <td className="px-3 py-2 text-purple-600">{detail.primary_students || '-'}</td>
                                          <td className="px-3 py-2 text-blue-600">{detail.secondary_students || '-'}</td>
                                          <td className="px-3 py-2 text-center">{detail.total_students}</td>
                                          <td className="px-3 py-2">{detail.schedule_time}</td>
                                          <td className="px-3 py-2 text-center">{detail.total_hours}</td>
                                          <td className="px-3 py-2 text-center font-mono">{detail.coefficient}</td>
                                          <td className="px-3 py-2 text-right font-bold text-purple-600">{detail.workload}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot className="bg-gray-100 font-semibold">
                                      <tr>
                                        <td colSpan={9} className="px-3 py-2 text-right">合计工作量：</td>
                                        <td className="px-3 py-2 text-right text-purple-600">
                                          {Math.round(w.course_details.reduce((sum, d) => sum + d.workload, 0) * 100) / 100}
                                        </td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 课时计算说明 */}
      <div className="card mt-6 bg-amber-50 border-amber-200">
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium mb-1">课时计算规则：</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs">
              <div className="flex items-center gap-1">
                <span className="px-2 py-1 bg-amber-100 rounded">主项1人</span>
                <span>0.35</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="px-2 py-1 bg-amber-100 rounded">副项1人</span>
                <span>0.175</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="px-2 py-1 bg-amber-100 rounded">主项2人</span>
                <span>0.8</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="px-2 py-1 bg-amber-100 rounded">副项2人</span>
                <span>0.4</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="px-2 py-1 bg-amber-100 rounded">副项2人(8周)</span>
                <span>0.8</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="px-2 py-1 bg-amber-100 rounded">副项3-4人</span>
                <span>0.9</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="px-2 py-1 bg-amber-100 rounded">副项5-8人</span>
                <span>1.0</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="px-2 py-1 bg-orange-100 rounded">专升本副项1人</span>
                <span>0.35</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="px-2 py-1 bg-orange-100 rounded">专升本副项2人</span>
                <span>0.8</span>
              </div>
            </div>
            <p className="text-xs mt-2 text-amber-600">
              公式：课时工作量 = 课时系数 × 实际排课周数
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
