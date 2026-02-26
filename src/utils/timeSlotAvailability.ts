/**
 * 时间槽可用性检查工具
 * 用于检查排课时段的可用性，确保排课建议页面和时间网格页面使用相同的逻辑
 */

import type { ScheduledClass } from '../types';

/**
 * 检查周次禁排状态
 */
export const checkWeekBlockedStatus = (week: number, classNames: string): { fullyBlocked: boolean; reason: string } => {
  // 这里可以添加周次禁排状态检查逻辑
  // 暂时返回默认值
  return { fullyBlocked: false, reason: '' };
};

/**
 * 检查周次是否被禁排（全周禁排）
 */
export const isWeekBlocked = (week: number, blockedSlots: any[], currentClass: string): boolean => {
  // 这里可以添加周次禁排检查逻辑
  // 暂时返回默认值
  return false;
};

/**
 * 同步检查时段是否可用
 * @param day 星期几（1-7）
 * @param period 节次（1-10）
 * @param week 周次
 * @param groupStudents 学生列表
 * @param scheduledClasses 已排课程列表
 * @param targetTeacher 目标教师
 * @param teacher 当前教师
 * @returns 是否可用
 */
export const isSlotAvailableSync = (
  day: number,
  period: number,
  week: number,
  groupStudents: any[] = [],
  scheduledClasses: ScheduledClass[] = [],
  targetTeacher: any = null,
  teacher: any = null
): boolean => {
  // 获取当前选中的班级信息（支持混合小组，获取所有班级）
  const allClasses = groupStudents.length > 0 
    ? Array.from(new Set(groupStudents.map(s => s.major_class || s.class_name || '').filter(c => c)))
    : [];

  // 检查全周禁排周次
  const weekBlockedStatus = checkWeekBlockedStatus(week, allClasses.join(','));
  if (weekBlockedStatus.fullyBlocked) {
    return false;
  }

  // 检查班级的专业大课禁排时间数据（支持混合小组，检查所有班级）
  const importedBlockedTimes = JSON.parse(localStorage.getItem('music_scheduler_imported_blocked_times') || '[]');
  if (allClasses.length > 0 && importedBlockedTimes.length > 0) {
    const allClassesBlockedTimes = importedBlockedTimes.filter((b: any) => {
      const blockedClassName = b.class_name;
      return blockedClassName && allClasses.some((className: string) =>
        blockedClassName.includes(className)
      );
    });

    const isBlockedByImported = allClassesBlockedTimes.some((blockedTime: any) => {
      if (!blockedTime.weeks || !blockedTime.weeks.includes(week)) return false;
      if (blockedTime.day !== day) return false;
      if (!blockedTime.periods || !blockedTime.periods.includes(period)) return false;
      return true;
    });

    if (isBlockedByImported) {
      return false;
    }
  }

  // 检查教师已经排定的时间
  const effectiveTeacherId = targetTeacher?.id || teacher?.id;
  if (effectiveTeacherId) {
    const teacherSchedule = scheduledClasses.find(sc => {
      // 检查教师匹配（现在教师的id字段就是工号）
      const isTeacherMatch = sc.teacher_id === effectiveTeacherId;
      
      if (!isTeacherMatch) return false;
      if (sc.day_of_week !== day || sc.period !== period) return false;
      if (sc.start_week !== undefined && sc.end_week !== undefined) {
        return week >= sc.start_week && week <= sc.end_week;
      }
      if (sc.week !== undefined) return sc.week === week;
      return week <= 16;
    });
    if (teacherSchedule) {
      return false;
    }

    // 检查教师是否有专业大课或理论课
    const teacherName = targetTeacher?.name || teacher?.name;
    const teacherMajorClass = scheduledClasses.find(sc => {
      const isMajorClass = (sc as any).teaching_type === '专业大课' || 
                          (sc as any).course_type === '专业大课' ||
                          (sc as any).teaching_type === '理论课' ||
                          (sc as any).course_type === '理论课' ||
                          sc.course_name?.includes('专业大课');
      if (!isMajorClass) return false;

      let teacherMatches = false;
      if (sc.teacher_id === effectiveTeacherId) {
        teacherMatches = true;
      } else if (sc.teacher_name) {
        if (sc.teacher_name === teacherName) {
          teacherMatches = true;
        } else {
          const scheduleTeachers = sc.teacher_name.split(/[,，、]/).map((t: string) => t.trim());
          teacherMatches = scheduleTeachers.includes(teacherName || '');
        }
      }
      if (!teacherMatches) return false;
      if (sc.day_of_week !== day || sc.period !== period) return false;
      if (sc.start_week !== undefined && sc.end_week !== undefined) {
        return week >= sc.start_week && week <= sc.end_week;
      }
      if (sc.week !== undefined) return sc.week === week;
      return week <= 16;
    });
    if (teacherMajorClass) {
      return false;
    }
  }

  // 检查学生是否已经被其他老师排课
  if (groupStudents.length > 0) {
    const studentIds = groupStudents.map((s: any) => s.id);
    const studentConflict = scheduledClasses.find(sc => {
      if (!studentIds.includes(sc.student_id)) return false;
      if (sc.day_of_week !== day || sc.period !== period) return false;
      if (sc.start_week !== undefined && sc.end_week !== undefined) {
        return week >= sc.start_week && week <= sc.end_week;
      }
      if (sc.week !== undefined) return sc.week === week;
      return week <= 16;
    });
    if (studentConflict) {
      return false;
    }
  }

  return true;
};

/**
 * 异步检查时段是否可用
 * @param day 星期几（1-7）
 * @param period 节次（1-10）
 * @param week 周次
 * @param groupStudents 学生列表
 * @param scheduledClasses 已排课程列表
 * @param targetTeacher 目标教师
 * @param teacher 当前教师
 * @param blockedSlotService 禁排时段服务
 * @returns 是否可用
 */
export const isSlotAvailable = async (
  day: number,
  period: number,
  week: number,
  groupStudents: any[] = [],
  scheduledClasses: ScheduledClass[] = [],
  targetTeacher: any = null,
  teacher: any = null,
  blockedSlotService: any = null
): Promise<boolean> => {
  try {
    // 先检查同步的禁排
    if (!isSlotAvailableSync(day, period, week, groupStudents, scheduledClasses, targetTeacher, teacher)) {
      return false;
    }

    const currentClass = groupStudents.length > 0 ? (groupStudents[0].major_class || groupStudents[0].class_name || '') : '';
    
    // 检查特定周次的特定星期禁排
    let blockedSlots = [];
    if (blockedSlotService) {
      blockedSlots = await blockedSlotService.getAll();
    }

    // 检查特定周次的特定星期禁排
    const hasSpecificWeekDayBlock = blockedSlots.some((slot: any) => {
      if (slot.class_associations && slot.class_associations.length > 0 && currentClass) {
        const isClassAssociated = slot.class_associations.some((assoc: any) => assoc.name === currentClass);
        if (!isClassAssociated) {
          return false;
        }
      }

      if (slot.type === 'specific') {
        if (slot.week_number === week && slot.day_of_week === day) {
          if (slot.start_period && slot.end_period) {
            return period >= slot.start_period && period <= slot.end_period;
          }
          return slot.start_period === period || !slot.start_period;
        }

        if (slot.specific_week_days) {
          return slot.specific_week_days.some((wd: any) => wd.week === week && wd.day === day);
        }
      }
      return false;
    });
    if (hasSpecificWeekDayBlock) {
      return false;
    }

    // 检查周次是否被禁排（全周禁排）
    if (isWeekBlocked(week, blockedSlots, currentClass)) {
      return false;
    }

    // 检查每周循环禁排
    const hasRecurringBlock = blockedSlots.some((slot: any) => {
      if (slot.class_associations && slot.class_associations.length > 0 && currentClass) {
        const isClassAssociated = slot.class_associations.some((assoc: any) => assoc.name === currentClass);
        if (!isClassAssociated) {
          return false;
        }
      }

      if (slot.type === 'recurring' && slot.day_of_week === day) {
        if (slot.start_period && slot.end_period) {
          return period >= slot.start_period && period <= slot.end_period;
        }
        return slot.start_period === period;
      }
      return false;
    });
    if (hasRecurringBlock) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('检查时段可用性失败:', error);
    return true;
  }
};

/**
 * 计算可用时段
 * @param totalWeeks 总周数
 * @param groupStudents 学生列表
 * @param scheduledClasses 已排课程列表
 * @param targetTeacher 目标教师
 * @param teacher 当前教师
 * @returns 可用时段列表
 */
export const calculateAvailableSlots = (
  totalWeeks: number,
  groupStudents: any[] = [],
  scheduledClasses: ScheduledClass[] = [],
  targetTeacher: any = null,
  teacher: any = null
): Array<{ day: number; period: number; availableWeeks: number[] }> => {
  const availableSlots: Array<{ day: number; period: number; availableWeeks: number[] }> = [];

  // 遍历所有星期和节次
  for (let day = 1; day <= 7; day++) {
    for (let period = 1; period <= 10; period++) {
      const availableWeeks: number[] = [];
      
      // 遍历所有周次
      for (let week = 1; week <= totalWeeks; week++) {
        if (isSlotAvailableSync(day, period, week, groupStudents, scheduledClasses, targetTeacher, teacher)) {
          availableWeeks.push(week);
        }
      }
      
      if (availableWeeks.length > 0) {
        availableSlots.push({
          day,
          period,
          availableWeeks
        });
      }
    }
  }

  return availableSlots;
};
