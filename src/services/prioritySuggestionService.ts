/**
 * 教师优先排课建议服务
 * 实时计算教师的排课优先级建议
 * 
 * 核心逻辑：
 * 1. 获取教师的大课禁排时间
 * 2. 获取班级的大课禁排时间
 * 3. 获取已排课数据（小课排课结果）
 * 4. 可用时段 = 全周时间 - 禁排时间 - 已排课时间
 */

import { 
  TeacherPrioritySuggestion, 
  ClassSuggestion, 
  PrioritySuggestionParams,
  ConflictDetail,
  LargeClassInfo,
  TimeSlot
} from '../types/prioritySuggestion';
import { 
  buildClassSuggestion, 
  sortSuggestionsByPriority, 
  generateSummary 
} from '../utils/priorityScoring';
import { teacherService, courseService, scheduleService, largeClassScheduleService, blockedSlotService, studentService, weekConfigService } from './index';
import { DAY_NAMES } from '../types/prioritySuggestion';

interface Teacher {
  id: string;
  teacher_id?: string;
  name?: string;
  full_name?: string;
  faculty_name?: string;
  faculty_code?: string;
}

interface Course {
  id: string;
  teacher_id: string;
  teacher_name?: string;
  course_name: string;
  major_class?: string;
  teaching_type?: string;
  student_count?: number;
}

interface BlockedTimeSlot {
  class_name?: string;
  weeks: number[];
  day: number;
  periods: number[];
  reason: string;
}

function generateHash(data: any): string {
  return JSON.stringify(data).length.toString(36) + '_' + Date.now().toString(36);
}

export const prioritySuggestionService = {
  async getTotalWeeks(): Promise<number> {
    try {
      const configs = await weekConfigService.getAll();
      if (configs && configs.length > 0) {
        // 获取最新的配置
        const latestConfig = configs.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
        return latestConfig.total_weeks || 16;
      }
    } catch (error) {
      console.log('[排课建议] 获取周次配置失败，使用默认16周');
    }
    return 16;
  },

  async getTeacherPrioritySuggestion(
    params: PrioritySuggestionParams
  ): Promise<TeacherPrioritySuggestion | null> {
    const { teacherId } = params;
    
    const teacher = await this.getTeacherById(teacherId);
    if (!teacher) {
      console.log('[排课建议] 未找到教师:', teacherId);
      return null;
    }
    
    const teacherName = teacher.name || teacher.full_name || '';
    console.log('[排课建议] 教师信息:', { teacherId, teacherName });
    
    const teacherCourses = await this.getTeacherCourses(teacherId, teacherName);
    const individualCourses = teacherCourses.filter(c => 
      c.teaching_type === '专业小课' || !c.teaching_type
    );
    console.log('[排课建议] 专业小课数量:', individualCourses.length);
    
    if (individualCourses.length === 0) {
      return this.buildEmptySuggestion(teacher, teacherId);
    }
    
    // 获取学期总周数
    const totalWeeks = await this.getTotalWeeks();
    console.log('[排课建议] 学期总周数:', totalWeeks);
    
    // 获取教师的大课禁排时间
    const teacherBlockedTimes = await this.getTeacherBlockedTimes(teacherName, totalWeeks);
    console.log('[排课建议] 教师禁排时段数量:', teacherBlockedTimes.length);
    
    // 获取教师的已排课数据
    const teacherScheduledClasses = await this.getScheduledClassesByTeacher(teacherId, teacherName);
    console.log('[排课建议] 教师已排课数量:', teacherScheduledClasses.length);
    
    // 将已排课数据转换为禁排时段
    const teacherScheduledBlocked = this.convertScheduledToBlocked(teacherScheduledClasses, 'teacher');
    
    // 合并教师的所有限制时间
    const allTeacherBlocked = [...teacherBlockedTimes, ...teacherScheduledBlocked];
    
    const classSuggestions: ClassSuggestion[] = [];
    
    for (const course of individualCourses) {
      const className = course.major_class;
      if (!className) continue;
      
      // 获取班级的大课禁排时间
      const classBlockedTimes = await this.getClassBlockedTimes(className, totalWeeks);
      console.log('[排课建议] 班级', className, '禁排时段数量:', classBlockedTimes.length);
      
      // 获取班级的已排课数据
      const classScheduledClasses = await this.getScheduledClassesByClass(className);
      const classScheduledBlocked = this.convertScheduledToBlocked(classScheduledClasses, 'class');
      
      // 合并班级的所有限制时间
      const allClassBlocked = [...classBlockedTimes, ...classScheduledBlocked];
      
      // 计算可用时段
      const { slots: availableSlots, totalAvailableSlotWeeks } = this.calculateAvailableSlots(allTeacherBlocked, allClassBlocked, className, totalWeeks);
      console.log('[排课建议] 班级', className, '可用时段数量:', availableSlots.length, '总可用时段周次:', totalAvailableSlotWeeks);
      
      const { primary: primaryStudents, secondary: secondaryStudents } = await this.getStudentsByTeacherAndClass(teacherId, teacherName, className);
      const studentCount = primaryStudents.length + secondaryStudents.length;
      const competingTeachers = await this.getCompetingTeachers(className, teacherId);
      
      // 构建建议
      const suggestion = this.buildClassSuggestionFromSlots(
        className,
        studentCount,
        primaryStudents,
        secondaryStudents,
        availableSlots,
        totalAvailableSlotWeeks,
        totalWeeks,
        allTeacherBlocked,
        allClassBlocked,
        competingTeachers
      );
      
      classSuggestions.push(suggestion);
    }
    
    const sortedSuggestions = sortSuggestionsByPriority(classSuggestions);
    const summary = generateSummary(sortedSuggestions);
    
    return {
      teacherId,
      teacherName,
      facultyName: teacher.faculty_name || '',
      calculatedAt: new Date().toISOString(),
      dataFreshness: 'realtime',
      dataVersion: {
        largeClassesHash: generateHash(teacherBlockedTimes),
        blockedTimesHash: generateHash([]),
        scheduledClassesHash: generateHash(teacherScheduledClasses)
      },
      suggestions: sortedSuggestions,
      summary
    };
  },

  async getAllTeachers(): Promise<Teacher[]> {
    return await teacherService.getAll();
  },

  async getTeacherById(teacherId: string): Promise<Teacher | null> {
    const teachers = await teacherService.getAll();
    return teachers.find((t: Teacher) => t.id === teacherId || t.teacher_id === teacherId) || null;
  },

  async getTeacherCourses(teacherId: string, teacherName: string): Promise<Course[]> {
    const courses = await courseService.getAll();
    return courses.filter((c: Course) => 
      c.teacher_id === teacherId || c.teacher_name === teacherName
    );
  },

  async getTeacherBlockedTimes(teacherName: string, totalWeeks: number): Promise<BlockedTimeSlot[]> {
    const blockedTimes: BlockedTimeSlot[] = [];
    
    // 1. 从 localStorage 读取导入的禁排时间（包含专业大课排课结果）
    const importedBlockedTimes = JSON.parse(localStorage.getItem('music_scheduler_imported_blocked_times') || '[]');
    console.log('[排课建议] 导入的禁排时间数量:', importedBlockedTimes.length);
    
    // 2. 从大课表中获取教师的大课时间
    const schedules = await largeClassScheduleService.getAll();
    for (const schedule of schedules) {
      if (schedule.entries) {
        for (const entry of schedule.entries) {
          if (entry.teacher_name && entry.teacher_name.includes(teacherName)) {
            const weeks = this.parseWeekRange(entry.week_range);
            const periods = this.parsePeriodRange(entry.period_start, entry.period_end);
            
            if (weeks.length > 0 && periods.length > 0 && entry.day_of_week) {
              blockedTimes.push({
                class_name: entry.class_name,
                weeks,
                day: entry.day_of_week,
                periods,
                reason: `${entry.course_name || '大课'}（教师大课）`
              });
            }
          }
        }
      }
    }
    
    // 3. 添加行政例会禁排时间（周一5-8节，所有周）
    blockedTimes.push({
      weeks: Array.from({ length: totalWeeks }, (_, i) => i + 1),
      day: 1, // 周一
      periods: [5, 6, 7, 8],
      reason: '行政例会（周一5-8节）'
    });
    
    return blockedTimes;
  },

  async getClassBlockedTimes(className: string, totalWeeks: number): Promise<BlockedTimeSlot[]> {
    const blockedTimes: BlockedTimeSlot[] = [];
    
    // 规范化班级名称
    const normalizedClassName = className.replace(/[级班\s]/g, '').trim();
    
    // 1. 从 localStorage 读取导入的禁排时间（包含专业大课排课结果）
    const importedBlockedTimes = JSON.parse(localStorage.getItem('music_scheduler_imported_blocked_times') || '[]');
    console.log('[排课建议] 班级', className, '导入的禁排时间:', importedBlockedTimes.length);
    
    // 筛选该班级的禁排时间
    for (const bt of importedBlockedTimes) {
      if (!bt.class_name) continue;
      
      const normalizedBlockedName = bt.class_name.replace(/[级班\s]/g, '').trim();
      const isMatch = normalizedClassName === normalizedBlockedName || 
                      normalizedClassName.includes(normalizedBlockedName) ||
                      normalizedBlockedName.includes(normalizedClassName);
      
      if (isMatch && bt.day && bt.periods && bt.weeks) {
        blockedTimes.push({
          class_name: bt.class_name,
          weeks: bt.weeks,
          day: bt.day,
          periods: bt.periods,
          reason: bt.reason || '禁排时间'
        });
      }
    }
    
    // 2. 从大课表中获取班级的大课时间
    const schedules = await largeClassScheduleService.getAll();
    for (const schedule of schedules) {
      if (schedule.entries) {
        for (const entry of schedule.entries) {
          if (!entry.class_name) continue;
          
          const normalizedEntryName = entry.class_name.replace(/[级班\s]/g, '').trim();
          const isMatch = normalizedClassName === normalizedEntryName;
          
          if (isMatch) {
            const weeks = this.parseWeekRange(entry.week_range);
            const periods = this.parsePeriodRange(entry.period_start, entry.period_end);
            
            if (weeks.length > 0 && periods.length > 0 && entry.day_of_week) {
              blockedTimes.push({
                class_name: entry.class_name,
                weeks,
                day: entry.day_of_week,
                periods,
                reason: `${entry.course_name || '大课'}（班级大课）`
              });
            }
          }
        }
      }
    }
    
    // 3. 添加行政例会禁排时间（周一5-8节，所有周）
    blockedTimes.push({
      weeks: Array.from({ length: totalWeeks }, (_, i) => i + 1),
      day: 1, // 周一
      periods: [5, 6, 7, 8],
      reason: '行政例会（周一5-8节）'
    });
    
    console.log('[排课建议] 班级', className, '总禁排时段数量:', blockedTimes.length);
    return blockedTimes;
  },

  async getScheduledClassesByTeacher(teacherId: string, teacherName: string): Promise<any[]> {
    const scheduled = await scheduleService.getAll();
    return scheduled.filter((s: any) => 
      s.teacher_id === teacherId || s.teacher_name === teacherName
    );
  },

  async getScheduledClassesByClass(className: string): Promise<any[]> {
    const scheduled = await scheduleService.getAll();
    return scheduled.filter((s: any) => 
      s.major_class === className || s.class_name === className
    );
  },

  convertScheduledToBlocked(scheduledClasses: any[], source: 'teacher' | 'class'): BlockedTimeSlot[] {
    const blockedTimes: BlockedTimeSlot[] = [];
    
    for (const sc of scheduledClasses) {
      const dayOfWeek = sc.day_of_week;
      const periodStart = sc.period_start || sc.period;
      const periodEnd = sc.period_end || sc.period;
      
      if (dayOfWeek && periodStart) {
        const weeks = this.parseWeekRange(sc.week_range || sc.weeks);
        const periods: number[] = [];
        for (let p = periodStart; p <= (periodEnd || periodStart); p++) {
          periods.push(p);
        }
        
        if (weeks.length > 0 && periods.length > 0) {
          blockedTimes.push({
            class_name: sc.major_class || sc.class_name,
            weeks,
            day: dayOfWeek,
            periods,
            reason: source === 'teacher' ? '教师已排课' : '班级已排课'
          });
        }
      }
    }
    
    return blockedTimes;
  },

  parseWeekRange(weekRange: string | undefined): number[] {
    if (!weekRange) {
      // 默认1-16周
      return Array.from({ length: 16 }, (_, i) => i + 1);
    }
    
    const weeks: number[] = [];
    const parts = weekRange.split(',');
    
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.includes('-')) {
        const [start, end] = trimmed.split('-').map(s => parseInt(s.trim()));
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = start; i <= end; i++) {
            weeks.push(i);
          }
        }
      } else {
        const weekNum = parseInt(trimmed);
        if (!isNaN(weekNum)) {
          weeks.push(weekNum);
        }
      }
    }
    
    return [...new Set(weeks)].sort((a, b) => a - b);
  },

  parsePeriodRange(start: number | undefined, end: number | undefined): number[] {
    const periods: number[] = [];
    if (start && end) {
      for (let i = start; i <= end; i++) {
        periods.push(i);
      }
    } else if (start) {
      periods.push(start);
    }
    return periods;
  },

  calculateAvailableSlots(
    teacherBlocked: BlockedTimeSlot[],
    classBlocked: BlockedTimeSlot[],
    className: string,
    totalWeeks: number
  ): { slots: TimeSlot[]; totalAvailableSlotWeeks: number } {
    // 初始化时间网格：7天 x 10节 x totalWeeks周
    // grid[day][period] = Set of available weeks
    const grid: Set<number>[][] = [];
    for (let day = 0; day < 7; day++) {
      grid[day] = [];
      for (let period = 0; period < 10; period++) {
        // 默认所有周次都可用
        grid[day][period] = new Set(Array.from({ length: totalWeeks }, (_, i) => i + 1));
      }
    }
    
    // 从可用周次中移除教师的禁排时段
    for (const blocked of teacherBlocked) {
      for (const period of blocked.periods) {
        if (period >= 1 && period <= 10 && blocked.day >= 1 && blocked.day <= 7) {
          for (const week of blocked.weeks) {
            grid[blocked.day - 1][period - 1].delete(week);
          }
        }
      }
    }
    
    // 从可用周次中移除班级的禁排时段
    for (const blocked of classBlocked) {
      for (const period of blocked.periods) {
        if (period >= 1 && period <= 10 && blocked.day >= 1 && blocked.day <= 7) {
          for (const week of blocked.weeks) {
            grid[blocked.day - 1][period - 1].delete(week);
          }
        }
      }
    }
    
    // 计算总可用时段数（考虑周次）
    let totalAvailableSlotWeeks = 0;
    for (let day = 0; day < 7; day++) {
      for (let period = 0; period < 10; period++) {
        totalAvailableSlotWeeks += grid[day][period].size;
      }
    }
    
    // 提取可用时段（每个节次单独显示，不合并）
    const slots: TimeSlot[] = [];
    for (let day = 0; day < 7; day++) {
      for (let period = 0; period < 10; period++) {
        const availableWeeks = grid[day][period];
        if (availableWeeks.size > 0) {
          const weekArray = Array.from(availableWeeks).sort((a, b) => a - b);
          const weekRanges = this.mergeWeeksToRanges(weekArray);
          
          slots.push({
            dayOfWeek: day + 1,
            periodStart: period + 1,
            periodEnd: period + 1, // 每个节次单独显示
            weekRange: weekRanges[0] || { start: 1, end: totalWeeks },
            weekRanges: weekRanges,
            availableWeeksCount: weekArray.length,
            quality: period < 4 ? 'best' : period < 8 ? 'good' : 'acceptable'
          });
        }
      }
    }
    
    return { slots, totalAvailableSlotWeeks };
  },

  mergeWeeksToRanges(weeks: number[]): Array<{ start: number; end: number }> {
    if (weeks.length === 0) return [];
    
    const ranges: Array<{ start: number; end: number }> = [];
    let start = weeks[0];
    let end = weeks[0];
    
    for (let i = 1; i < weeks.length; i++) {
      if (weeks[i] === end + 1) {
        end = weeks[i];
      } else {
        ranges.push({ start, end });
        start = weeks[i];
        end = weeks[i];
      }
    }
    ranges.push({ start, end });
    
    return ranges;
  },

  buildClassSuggestionFromSlots(
    className: string,
    studentCount: number,
    primaryStudents: string[],
    secondaryStudents: string[],
    availableSlots: TimeSlot[],
    totalAvailableSlotWeeks: number,
    totalWeeks: number,
    teacherBlocked: BlockedTimeSlot[],
    classBlocked: BlockedTimeSlot[],
    competingTeachers: string[]
  ): ClassSuggestion {
    const availableSlotCount = availableSlots.length;
    const maxSlotWeeks = 7 * 10 * totalWeeks;
    
    const scarcityScore = Math.max(0, Math.min(1, 1 - totalAvailableSlotWeeks / maxSlotWeeks));
    const priorityScore = scarcityScore;
    
    let priorityLevel: 'urgent' | 'high' | 'normal' | 'relaxed';
    if (priorityScore >= 0.7) priorityLevel = 'urgent';
    else if (priorityScore >= 0.4) priorityLevel = 'high';
    else if (priorityScore >= 0.2) priorityLevel = 'normal';
    else priorityLevel = 'relaxed';
    
    let recommendation: string;
    switch (priorityLevel) {
      case 'urgent':
        recommendation = `仅剩 ${totalAvailableSlotWeeks} 个时段周次可用，建议立即排课`;
        break;
      case 'high':
        recommendation = `剩余 ${totalAvailableSlotWeeks} 个时段周次可用，建议尽快排课`;
        break;
      case 'normal':
        recommendation = `有 ${totalAvailableSlotWeeks} 个时段周次可用，可按需排课`;
        break;
      case 'relaxed':
        recommendation = `有 ${totalAvailableSlotWeeks} 个时段周次可用，选择余地大`;
        break;
    }
    
    const conflictDetails: ConflictDetail[] = [];
    for (const b of [...teacherBlocked, ...classBlocked]) {
      for (const p of b.periods) {
        conflictDetails.push({
          type: 'large_class',
          description: b.reason,
          dayOfWeek: b.day,
          periodStart: p,
          periodEnd: p,
          source: b.class_name || ''
        });
      }
    }
    
    const lowThreshold = totalWeeks * 3;
    const mediumThreshold = totalWeeks * 6;
    
    let riskLevel: 'high' | 'medium' | 'low';
    if (totalAvailableSlotWeeks <= lowThreshold || competingTeachers.length >= 3) riskLevel = 'high';
    else if (totalAvailableSlotWeeks <= mediumThreshold || competingTeachers.length >= 1) riskLevel = 'medium';
    else riskLevel = 'low';
    
    return {
      classId: className,
      className,
      studentCount,
      primaryStudents,
      secondaryStudents,
      priorityScore,
      scarcityScore,
      priorityLevel,
      availableTimeSlots: availableSlots,
      availableSlotCount,
      totalAvailableSlotWeeks,
      blockedReasons: [...new Set([...teacherBlocked, ...classBlocked].map(b => b.reason))],
      conflictDetails,
      sharedLargeClasses: [],
      competingTeachers,
      riskLevel,
      recommendation
    };
  },

  async getStudentCountByTeacherAndClass(
    teacherId: string, 
    teacherName: string, 
    className: string
  ): Promise<number> {
    const students = await studentService.getAll();
    
    return students.filter((s: any) => {
      const inClass = s.major_class === className || s.class_name === className;
      if (!inClass) return false;
      
      const isPrimaryTeacher = (
        s.teacher_id === teacherId ||
        s.teacher_name === teacherName ||
        (s.assigned_teachers && s.assigned_teachers.primary_teacher_id === teacherId)
      );
      
      const isSecondaryTeacher = s.assigned_teachers && (
        s.assigned_teachers.secondary1_teacher_id === teacherId ||
        s.assigned_teachers.secondary2_teacher_id === teacherId ||
        s.assigned_teachers.secondary3_teacher_id === teacherId
      );
      
      return isPrimaryTeacher || isSecondaryTeacher;
    }).length;
  },

  async getStudentsByTeacherAndClass(
    teacherId: string, 
    teacherName: string, 
    className: string
  ): Promise<{ primary: string[]; secondary: string[] }> {
    const students = await studentService.getAll();
    const primary: string[] = [];
    const secondary: string[] = [];
    
    for (const s of students) {
      const inClass = s.major_class === className || s.class_name === className;
      if (!inClass) continue;
      
      const studentName = s.name || s.student_name || '';
      
      const isPrimaryTeacher = (
        s.teacher_id === teacherId ||
        s.teacher_name === teacherName ||
        (s.assigned_teachers && s.assigned_teachers.primary_teacher_id === teacherId)
      );
      
      const isSecondaryTeacher = s.assigned_teachers && (
        s.assigned_teachers.secondary1_teacher_id === teacherId ||
        s.assigned_teachers.secondary2_teacher_id === teacherId ||
        s.assigned_teachers.secondary3_teacher_id === teacherId
      );
      
      if (isPrimaryTeacher) {
        primary.push(studentName);
      }
      if (isSecondaryTeacher) {
        secondary.push(studentName);
      }
    }
    
    return { primary, secondary };
  },

  async getCompetingTeachers(className: string, excludeTeacherId: string): Promise<string[]> {
    const courses = await courseService.getAll();
    
    return [...new Set(
      courses
        .filter((c: Course) => 
          c.major_class === className && 
          c.teacher_id !== excludeTeacherId &&
          (c.teaching_type === '专业小课' || !c.teaching_type)
        )
        .map((c: Course) => c.teacher_name || '')
        .filter(Boolean)
    )];
  },

  buildEmptySuggestion(teacher: Teacher, teacherId: string): TeacherPrioritySuggestion {
    return {
      teacherId,
      teacherName: teacher.name || teacher.full_name || '',
      facultyName: teacher.faculty_name || '',
      calculatedAt: new Date().toISOString(),
      dataFreshness: 'realtime',
      dataVersion: {
        largeClassesHash: '0',
        blockedTimesHash: '0',
        scheduledClassesHash: '0'
      },
      suggestions: [],
      summary: {
        totalClasses: 0,
        urgentCount: 0,
        highCount: 0,
        normalCount: 0,
        relaxedCount: 0
      }
    };
  }
};

export default prioritySuggestionService;
