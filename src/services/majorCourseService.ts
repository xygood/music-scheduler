// 专业大课排课管理服务
import type { Teacher } from '../types';
import { supabase } from './supabase';
import { generalCourseService } from './generalCourseService';

export interface MajorCourseAssignment {
  id: string;
  course_name: string;
  teacher_name: string;
  teacher_id: string;
  credit_hours: number;
  total_hours: number;
  weeks_pattern: string;
  priority: 'high' | 'medium' | 'low';
  notes?: string;
  classes: MajorCourseClass[];
  scheduled: boolean;
  schedule?: MajorCourseSchedule;
  created_at: string;
}

export interface MajorCourseClass {
  class_name: string;
  class_type: 'general' | 'upgrade';
  grade: string;
  student_count: number;
  scheduled: boolean;
}

export interface MajorCourseSchedule {
  weekday: number;
  period_start: number;
  period_end: number;
  location?: string;
  weeks_pattern: string;
}

export interface TeacherSchedule {
  teacher_id: string;
  teacher_name: string;
  assignments: MajorCourseAssignment[];
  available_times: TimeSlot[];
  schedule: TeacherScheduleItem[];
}

export interface TeacherScheduleItem {
  course_name: string;
  weekday: number;
  period_start: number;
  period_end: number;
  location?: string;
  weeks_pattern: string;
}

export interface TimeSlot {
  weekday: number;
  time_slot: string;
  available: boolean;
  reason?: string;
}

export interface MajorCourseResult {
  schedules: Record<string, TeacherSchedule>;
  blocked_times: TimeBlock[];
  summary: {
    total_assignments: number;
    scheduled_assignments: number;
    unscheduled_assignments: number;
    success_rate: number;
  };
}

class MajorCourseService {
  private assignments: MajorCourseAssignment[] = [];
  private teacherSchedules: Map<string, TeacherSchedule> = new Map();

  // 上传专业大课配课方案
  async uploadAssignmentPlan(file: File): Promise<MajorCourseAssignment[]> {
    try {
      const workbook = await this.parseExcelFile(file);
      const assignmentData = this.extractAssignmentData(workbook);
      
      const assignments: MajorCourseAssignment[] = [];
      
      // 按教师分组处理
      const teacherGroups = this.groupByTeacher(assignmentData);
      
      for (const [teacherName, courses] of teacherGroups) {
        for (const courseData of courses) {
          const assignment = await this.createAssignment(courseData, teacherName);
          assignments.push(assignment);
        }
      }
      
      this.assignments = assignments;
      return assignments;
    } catch (error) {
      console.error('上传专业大课配课方案失败:', error);
      throw new Error('上传专业大课配课方案失败');
    }
  }

  // 解析Excel文件
  private async parseExcelFile(file: File): Promise<any> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          // 实际实现中需要使用xlsx库
          resolve(this.mockParseExcelData());
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsArrayBuffer(file);
    });
  }

  // 模拟Excel数据解析
  private mockParseExcelData(): any {
    return {
      sheets: [
        {
          name: '课程基本信息',
          data: [
            {
              course_name: '《多声部音乐分析与写作（二）》',
              teacher_name: '王教授',
              teacher_id: '2023005',
              credit_hours: 2.0,
              total_hours: 32,
              weeks_pattern: '1-16周',
              priority: 'high',
              notes: '需钢琴教室'
            },
            {
              course_name: '《和声学基础》',
              teacher_name: '张老师',
              teacher_id: '2021001',
              credit_hours: 3.0,
              total_hours: 48,
              weeks_pattern: '1-16周',
              priority: 'medium',
              notes: ''
            }
          ]
        },
        {
          name: '班级分配信息',
          data: [
            {
              course_name: '《多声部音乐分析与写作（二）》',
              class_name: '音乐学2301',
              class_type: 'general',
              grade: '2023级',
              student_count: 28
            },
            {
              course_name: '《多声部音乐分析与写作（二）》',
              class_name: '音乐学专升本2301',
              class_type: 'upgrade',
              grade: '2023级',
              student_count: 25
            }
          ]
        }
      ]
    };
  }

  // 提取配课方案数据
  private extractAssignmentData(workbook: any): any[] {
    const coursesSheet = workbook.sheets.find((s: any) => s.name.includes('课程'));
    const classesSheet = workbook.sheets.find((s: any) => s.name.includes('班级'));
    
    const courses = coursesSheet?.data || [];
    const classes = classesSheet?.data || [];
    
    // 合并课程和班级信息
    return courses.map((course: any) => {
      const relatedClasses = classes.filter((cls: any) => cls.course_name === course.course_name);
      return {
        ...course,
        classes: relatedClasses
      };
    });
  }

  // 按教师分组
  private groupByTeacher(courses: any[]): Map<string, any[]> {
    const groups = new Map<string, any[]>();
    
    for (const course of courses) {
      const teacherName = course.teacher_name;
      if (!groups.has(teacherName)) {
        groups.set(teacherName, []);
      }
      groups.get(teacherName)!.push(course);
    }
    
    return groups;
  }

  // 创建配课任务
  private async createAssignment(courseData: any, teacherName: string): Promise<MajorCourseAssignment> {
    return {
      id: `assignment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      course_name: courseData.course_name,
      teacher_name: teacherName,
      teacher_id: courseData.teacher_id,
      credit_hours: courseData.credit_hours,
      total_hours: courseData.total_hours,
      weeks_pattern: courseData.weeks_pattern,
      priority: courseData.priority || 'medium',
      notes: courseData.notes,
      classes: courseData.classes.map((cls: any) => ({
        class_name: cls.class_name,
        class_type: cls.class_type,
        grade: cls.grade,
        student_count: cls.student_count,
        scheduled: false
      })),
      scheduled: false,
      created_at: new Date().toISOString()
    };
  }

  // 为单个教师排课
  async scheduleForTeacher(teacherId: string): Promise<TeacherSchedule> {
    try {
      const teacherAssignments = this.assignments.filter(a => a.teacher_id === teacherId);
      
      if (teacherAssignments.length === 0) {
        throw new Error('未找到该教师的配课任务');
      }

      // 获取可用时间（避开通适大课）
      const availableTimes = await this.getTeacherAvailableTimes(teacherId);
      
      const schedule: TeacherScheduleItem[] = [];
      let unscheduledCount = 0;

      // 按优先级排序
      const sortedAssignments = teacherAssignments.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      for (const assignment of sortedAssignments) {
        const bestTimeSlot = this.findBestTimeSlot(assignment, availableTimes, schedule);
        
        if (bestTimeSlot) {
          const scheduleItem: TeacherScheduleItem = {
            course_name: assignment.course_name,
            weekday: bestTimeSlot.weekday,
            period_start: bestTimeSlot.period_start,
            period_end: bestTimeSlot.period_end,
            location: this.findSuitableClassroom(assignment, bestTimeSlot),
            weeks_pattern: assignment.weeks_pattern
          };
          
          schedule.push(scheduleItem);
          assignment.scheduled = true;
          assignment.schedule = {
            weekday: bestTimeSlot.weekday,
            period_start: bestTimeSlot.period_start,
            period_end: bestTimeSlot.period_end,
            location: scheduleItem.location,
            weeks_pattern: assignment.weeks_pattern
          };

          // 标记时间为已占用
          this.markTimeSlotAsOccupied(availableTimes, bestTimeSlot);
        } else {
          unscheduledCount++;
        }
      }

      return {
        teacher_id: teacherId,
        teacher_name: teacherAssignments[0].teacher_name,
        assignments: teacherAssignments,
        available_times: availableTimes,
        schedule
      };
    } catch (error) {
      console.error(`为教师 ${teacherId} 排课失败:`, error);
      throw error;
    }
  }

  // 获取教师可用时间
  private async getTeacherAvailableTimes(teacherId: string): Promise<TimeSlot[]> {
    // 获取所有时间屏蔽
    const blockedTimes = await generalCourseService.getTimeBlocks('general_course');
    
    // 生成基础时间网格
    const baseTimes = this.generateTimeGrid();
    
    // 过滤被屏蔽的时间
    return baseTimes.map(timeSlot => {
      const isBlocked = blockedTimes.some(blocked => 
        blocked.weekday === timeSlot.weekday && 
        blocked.time_slot === timeSlot.time_slot
      );
      
      return {
        ...timeSlot,
        available: !isBlocked,
        reason: isBlocked ? '通适大课占用' : undefined
      };
    });
  }

  // 生成时间网格
  private generateTimeGrid(): TimeSlot[] {
    const timeSlots: TimeSlot[] = [];
    
    // 周一到周五
    for (let weekday = 1; weekday <= 5; weekday++) {
      // 上午1-2节
      timeSlots.push({ weekday, time_slot: '1-2', available: true });
      timeSlots.push({ weekday, time_slot: '3-4', available: true });
      
      // 下午5-6节
      timeSlots.push({ weekday, time_slot: '5-6', available: true });
      
      // 晚上7-8节
      timeSlots.push({ weekday, time_slot: '7-8', available: true });
    }
    
    return timeSlots;
  }

  // 为课程寻找最佳时间
  private findBestTimeSlot(
    assignment: MajorCourseAssignment,
    availableTimes: TimeSlot[],
    existingSchedule: TeacherScheduleItem[]
  ): TimeSlot | null {
    // 按优先级排序时间
    const preferredSlots = this.getPreferredTimeSlots(assignment);
    
    for (const preferredSlot of preferredSlots) {
      const matchingSlot = availableTimes.find(slot => 
        slot.available && 
        slot.weekday === preferredSlot.weekday &&
        slot.time_slot === preferredSlot.time_slot
      );
      
      if (matchingSlot && !this.hasConflict(matchingSlot, existingSchedule)) {
        return matchingSlot;
      }
    }
    
    // 如果首选时间都不可用，寻找其他可用时间
    const fallbackSlot = availableTimes.find(slot => 
      slot.available && !this.hasConflict(slot, existingSchedule)
    );
    
    return fallbackSlot || null;
  }

  // 获取首选时间槽
  private getPreferredTimeSlots(assignment: MajorCourseAssignment): TimeSlot[] {
    // 根据课程类型和优先级推荐时间
    const preferences: TimeSlot[] = [];
    
    if (assignment.priority === 'high') {
      // 高优先级课程优先选择上午时间
      preferences.push({ weekday: 2, time_slot: '3-4', available: true });
      preferences.push({ weekday: 4, time_slot: '1-2', available: true });
      preferences.push({ weekday: 1, time_slot: '5-6', available: true });
    } else {
      // 一般课程可以选择下午或晚上
      preferences.push({ weekday: 3, time_slot: '5-6', available: true });
      preferences.push({ weekday: 5, time_slot: '7-8', available: true });
      preferences.push({ weekday: 2, time_slot: '5-6', available: true });
    }
    
    return preferences;
  }

  // 检查时间冲突
  private hasConflict(timeSlot: TimeSlot, schedule: TeacherScheduleItem[]): boolean {
    return schedule.some(item =>
      item.weekday === timeSlot.weekday &&
      this.timeSlotsOverlap(item.period_start, item.period_end, timeSlot.period_start, timeSlot.period_end)
    );
  }

  // 检查节次是否重叠
  private timeSlotsOverlap(start1: number, end1: number, start2: number, end2: number): boolean {
    return !(end1 < start2 || end2 < start1);
  }

  // 寻找合适的教室
  private findSuitableClassroom(assignment: MajorCourseAssignment, timeSlot: TimeSlot): string {
    // 根据课程需求选择教室
    if (assignment.notes?.includes('钢琴')) {
      return `钢琴教室${this.getRandomRoomNumber(300, 310)}`;
    } else if (assignment.notes?.includes('多媒体')) {
      return `多媒体教室${this.getRandomRoomNumber(200, 210)}`;
    } else {
      return `理论教室${this.getRandomRoomNumber(100, 110)}`;
    }
  }

  // 生成随机教室号
  private getRandomRoomNumber(min: number, max: number): string {
    return String(Math.floor(Math.random() * (max - min + 1)) + min);
  }

  // 标记时间为已占用
  private markTimeSlotAsOccupied(availableTimes: TimeSlot[], timeSlot: TimeSlot): void {
    const slot = availableTimes.find(s => 
      s.weekday === timeSlot.weekday && s.time_slot === timeSlot.time_slot
    );
    if (slot) {
      slot.available = false;
      slot.reason = '专业大课占用';
    }
  }

  // 批量排课
  async scheduleAll(): Promise<MajorCourseResult> {
    const teacherIds = [...new Set(this.assignments.map(a => a.teacher_id))];
    const schedules: Record<string, TeacherSchedule> = {};
    const blocked_times: TimeBlock[] = [];
    
    let totalAssignments = 0;
    let scheduledAssignments = 0;

    for (const teacherId of teacherIds) {
      try {
        const teacherSchedule = await this.scheduleForTeacher(teacherId);
        schedules[teacherId] = teacherSchedule;
        
        // 统计
        totalAssignments += teacherSchedule.assignments.length;
        scheduledAssignments += teacherSchedule.schedule.length;
        
        // 生成时间屏蔽
        for (const scheduleItem of teacherSchedule.schedule) {
          blocked_times.push({
            weekday: scheduleItem.weekday,
            time_slot: `${scheduleItem.period_start}-${scheduleItem.period_end}`,
            weeks_pattern: scheduleItem.weeks_pattern,
            course_name: scheduleItem.course_name,
            teacher_name: teacherSchedule.teacher_name,
            block_type: 'major_course',
            priority: 80
          });
        }
      } catch (error) {
        console.error(`为教师 ${teacherId} 排课失败:`, error);
      }
    }

    // 保存到数据库
    await this.saveSchedules(schedules);
    await this.saveBlockedTimes(blocked_times);

    return {
      schedules,
      blocked_times,
      summary: {
        total_assignments: totalAssignments,
        scheduled_assignments: scheduledAssignments,
        unscheduled_assignments: totalAssignments - scheduledAssignments,
        success_rate: totalAssignments > 0 ? Math.round((scheduledAssignments / totalAssignments) * 100) : 0
      }
    };
  }

  // 保存排课结果
  private async saveSchedules(schedules: Record<string, TeacherSchedule>): Promise<void> {
    try {
      for (const [teacherId, schedule] of Object.entries(schedules)) {
        for (const scheduleItem of schedule.schedule) {
          await supabase
            .from('major_course_schedules')
            .insert({
              teacher_id: teacherId,
              course_name: scheduleItem.course_name,
              weekday: scheduleItem.weekday,
              period_start: scheduleItem.period_start,
              period_end: scheduleItem.period_end,
              location: scheduleItem.location,
              weeks_pattern: scheduleItem.weeks_pattern,
              semester: this.getCurrentSemester(),
              created_at: new Date().toISOString()
            });
        }
      }
    } catch (error) {
      console.error('保存排课结果失败:', error);
    }
  }

  // 保存时间屏蔽
  private async saveBlockedTimes(blockedTimes: TimeBlock[]): Promise<void> {
    try {
      for (const block of blockedTimes) {
        await supabase
          .from('time_block_records')
          .insert({
            ...block,
            semester: this.getCurrentSemester(),
            created_at: new Date().toISOString()
          });
      }
    } catch (error) {
      console.error('保存时间屏蔽失败:', error);
    }
  }

  // 获取当前学期
  private getCurrentSemester(): string {
    const now = new Date();
    const month = now.getMonth() + 1;
    const academicYear = month >= 8 ? `${now.getFullYear()}-${now.getFullYear() + 1}` : `${now.getFullYear() - 1}-${now.getFullYear()}`;
    const semester = month >= 8 ? '1' : '2';
    return `${academicYear}-${semester}`;
  }

  // 获取所有配课任务
  getAllAssignments(): MajorCourseAssignment[] {
    return this.assignments;
  }

  // 获取教师的排课结果
  getTeacherSchedule(teacherId: string): TeacherSchedule | null {
    return this.teacherSchedules.get(teacherId) || null;
  }
}

export const majorCourseService = new MajorCourseService();