import type { Course, Room, Student, ScheduledClass, Conflict, PERIOD_CONFIG } from '../types';
import { generateId } from './excel';

// 节次配置（两节课之间休息10分钟）
const PERIODS_CONFIG: { period: number; startTime: string; endTime: string }[] = [
  { period: 1, startTime: '08:10', endTime: '08:55' },
  { period: 2, startTime: '09:05', endTime: '09:50' },
  { period: 3, startTime: '10:20', endTime: '11:05' },
  { period: 4, startTime: '11:15', endTime: '12:00' },
  { period: 5, startTime: '13:45', endTime: '14:30' },
  { period: 6, startTime: '14:40', endTime: '15:25' },
  { period: 7, startTime: '15:40', endTime: '16:25' },
  { period: 8, startTime: '16:35', endTime: '17:20' },
  { period: 9, startTime: '18:30', endTime: '19:15' },
  { period: 10, startTime: '19:25', endTime: '20:10' },
];

export interface SchedulingParams {
  preferredDays?: number[];
  maxConsecutive?: number;
}

interface PeriodSlot {
  day: number;
  period: number;
  isOccupied: boolean;
  courseId?: string;
  roomId?: string;
}

interface SchedulingResult {
  success: boolean;
  scheduledClasses: ScheduledClass[];
  conflicts: Conflict[];
  unassignedCourses: Course[];
}

export class AutoScheduler {
  private courses: Course[];
  private rooms: Room[];
  private students: Student[];
  private existingSchedule: ScheduledClass[];
  private params: SchedulingParams;
  private periodSlots: Map<string, PeriodSlot[]> = new Map();

  constructor(
    courses: Course[],
    rooms: Room[],
    students: Student[],
    existingSchedule: ScheduledClass[] = [],
    params: SchedulingParams = {}
  ) {
    this.courses = courses;
    this.rooms = rooms;
    this.students = students;
    this.existingSchedule = existingSchedule;
    this.params = {
      preferredDays: params.preferredDays ?? [1, 2, 3, 4, 5],
      maxConsecutive: params.maxConsecutive ?? 3,
    };
    this.initializePeriodSlots();
  }

  private initializePeriodSlots(): void {
    const { preferredDays } = this.params;
    for (const day of preferredDays) {
      const daySlots: PeriodSlot[] = [];
      for (const periodConfig of PERIODS_CONFIG) {
        const isOccupied = this.existingSchedule.some(
          cls => cls.day_of_week === day && cls.period === periodConfig.period
        );
        daySlots.push({
          day,
          period: periodConfig.period,
          isOccupied,
        });
      }
      this.periodSlots.set(`day_${day}`, daySlots);
    }
  }

  autoSchedule(): SchedulingResult & { conflictReport: string } {
    const scheduledClasses: ScheduledClass[] = [];
    const conflicts: Conflict[] = [];
    const unassignedCourses: Course[] = [];
    const sortedCourses = [...this.courses].sort((a, b) => {
      if (a.week_frequency !== b.week_frequency) return b.week_frequency - a.week_frequency;
      return b.duration - a.duration;
    });

    for (const course of sortedCourses) {
      const result = this.scheduleCourse(course);
      if (result.success) {
        scheduledClasses.push(...result.scheduledClasses);
      } else {
        unassignedCourses.push(course);
        conflicts.push(...result.conflicts);
      }
    }

    const baseResult = { 
      success: unassignedCourses.length === 0, 
      scheduledClasses, 
      conflicts, 
      unassignedCourses 
    };

    return {
      ...baseResult,
      conflictReport: this.generateConflictReport(conflicts)
    };
  }

  private scheduleCourse(course: Course) {
    const scheduledClasses: ScheduledClass[] = [];
    const conflicts: Conflict[] = [];
    const suitableRoom = this.findSuitableRoom(course);
    if (!suitableRoom) {
      conflicts.push({
        id: generateId(),
        teacher_id: course.teacher_id,
        type: 'room_conflict',
        scheduled_class_id: '',
        description: `无法为课程"${course.course_name}"找到合适的教室`,
        resolved: false,
        created_at: new Date().toISOString(),
      });
      return { success: false, scheduledClasses, conflicts };
    }

    for (let i = 0; i < course.week_frequency; i++) {
      const slot = this.findAvailableSlot(course, i);
      if (!slot) {
        conflicts.push({
          id: generateId(),
          teacher_id: course.teacher_id,
          type: 'student_conflict',
          scheduled_class_id: '',
          description: `无法为课程"${course.course_name}"的第${i + 1}节课找到合适的节次`,
          resolved: false,
          created_at: new Date().toISOString(),
        });
        continue;
      }

      const conflictResult = this.checkConflict(slot.day, slot.period, suitableRoom.id, course.student_id || '', course.teacher_id);
      if (conflictResult.hasConflict) {
        // 为每种冲突类型创建详细的冲突记录
        for (const conflictType of conflictResult.conflictTypes) {
          let conflictDescription = '';
          let detailedDescription = '';
          
          switch (conflictType) {
            case 'room_conflict':
              const roomClass = this.existingSchedule.find(cls =>
                cls.day_of_week === slot.day && cls.period === slot.period && cls.room_id === suitableRoom.id
              );
              conflictDescription = '教室冲突';
              detailedDescription = `教室"${suitableRoom.room_name}"在${this.formatDay(slot.day)}第${slot.period}节已被课程占用`;
              if (roomClass) {
                const roomCourse = this.courses.find(c => c.id === roomClass.course_id);
                if (roomCourse) {
                  detailedDescription += `（当前课程：${roomCourse.course_name}）`;
                }
              }
              break;
              
            case 'student_conflict':
              const studentClass = this.existingSchedule.find(cls =>
                cls.day_of_week === slot.day && cls.period === slot.period && cls.student_id === course.student_id
              );
              conflictDescription = '学生冲突';
              detailedDescription = `学生"${course.student_name}"在${this.formatDay(slot.day)}第${slot.period}节已有课程安排`;
              if (studentClass) {
                const studentCourse = this.courses.find(c => c.id === studentClass.course_id);
                if (studentCourse) {
                  detailedDescription += `（当前课程：${studentCourse.course_name}）`;
                }
              }
              break;
              
            case 'teacher_conflict':
              const teacherClass = this.existingSchedule.find(cls =>
                cls.day_of_week === slot.day && cls.period === slot.period && cls.teacher_id === course.teacher_id
              );
              conflictDescription = '教师冲突';
              detailedDescription = `教师在${this.formatDay(slot.day)}第${slot.period}节已有其他课程安排`;
              if (teacherClass) {
                const teacherCourse = this.courses.find(c => c.id === teacherClass.course_id);
                if (teacherCourse) {
                  detailedDescription += `（当前课程：${teacherCourse.course_name}）`;
                }
              }
              break;
          }
          
          conflicts.push({
            id: generateId(),
            teacher_id: course.teacher_id,
            type: conflictType as 'room_conflict' | 'student_conflict' | 'teacher_conflict',
            scheduled_class_id: '',
            conflicting_class_id: conflictType === 'room_conflict' ? 
              this.existingSchedule.find(cls => cls.day_of_week === slot.day && cls.period === slot.period && cls.room_id === suitableRoom.id)?.id :
              conflictType === 'student_conflict' ?
              this.existingSchedule.find(cls => cls.day_of_week === slot.day && cls.period === slot.period && cls.student_id === course.student_id)?.id :
              this.existingSchedule.find(cls => cls.day_of_week === slot.day && cls.period === slot.period && cls.teacher_id === course.teacher_id)?.id,
            description: `${conflictDescription}：${detailedDescription}`,
            resolved: false,
            created_at: new Date().toISOString(),
          });
        }
        continue;
      }

      const scheduledClass: ScheduledClass = {
        id: generateId(),
        teacher_id: course.teacher_id,
        course_id: course.id,
        room_id: suitableRoom.id,
        student_id: course.student_id || '',
        day_of_week: slot.day,
        period: slot.period,
        start_week: 1,
        end_week: 16,
        status: 'scheduled',
        created_at: new Date().toISOString(),
      };
      scheduledClasses.push(scheduledClass);
      slot.isOccupied = true;
    }

    return { success: scheduledClasses.length === course.week_frequency, scheduledClasses, conflicts };
  }

  private findSuitableRoom(course: Course): Room | null {
    const suitableRooms = this.rooms.filter(room => {
      if (course.course_type === '钢琴' && room.room_type === '琴房') return true;
      if (course.course_type === '声乐' && room.room_type !== '排练厅') return true;
      if (course.course_type === '器乐' && room.room_type !== '教室') return true;
      return room.room_type === '教室';
    });
    if (suitableRooms.length === 0) return this.rooms[0] || null;
    return suitableRooms[0];
  }

  private findAvailableSlot(course: Course, frequencyIndex: number): PeriodSlot | null {
    const days = this.params.preferredDays!;
    for (const day of days) {
      const daySlots = this.periodSlots.get(`day_${day}`);
      if (!daySlots) continue;
      const preferredDay = days[frequencyIndex % days.length];
      const targetDay = frequencyIndex < days.length ? preferredDay : day;
      const targetSlots = this.periodSlots.get(`day_${targetDay}`);
      if (!targetSlots) continue;
      // 节次模式：每节课占一个节次
      for (const slot of targetSlots) {
        if (!slot.isOccupied) {
          return slot;
        }
      }
    }
    // 如果首选日期没有可用节次，随机找一个可用的
    for (const day of days) {
      const daySlots = this.periodSlots.get(`day_${day}`);
      if (!daySlots) continue;
      const availableSlots = daySlots.filter(slot => !slot.isOccupied);
      if (availableSlots.length > 0) return availableSlots[0];
    }
    return null;
  }

  private checkConflict(day: number, period: number, roomId: string, studentId: string, teacherId: string): { hasConflict: boolean; conflictTypes: string[] } {
    const conflictTypes: string[] = [];
    
    // 检查教室冲突
    const roomConflict = this.existingSchedule.some(cls =>
      cls.day_of_week === day && cls.period === period && cls.room_id === roomId
    );
    if (roomConflict) {
      conflictTypes.push('room_conflict');
    }
    
    // 检查学生冲突
    if (studentId) {
      const studentConflict = this.existingSchedule.some(cls =>
        cls.day_of_week === day && cls.period === period && cls.student_id === studentId
      );
      if (studentConflict) {
        conflictTypes.push('student_conflict');
      }
    }
    
    // 检查教师冲突（新增）
    if (teacherId) {
      const teacherConflict = this.existingSchedule.some(cls =>
        cls.day_of_week === day && cls.period === period && cls.teacher_id === teacherId
      );
      if (teacherConflict) {
        conflictTypes.push('teacher_conflict');
      }
    }
    
    return { hasConflict: conflictTypes.length > 0, conflictTypes };
  }

  private formatDay(day: number): string {
    const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    return days[day - 1] || '';
  }

  // 新增：获取冲突的详细信息
  private getConflictDetails(day: number, period: number, targetType: 'room' | 'student' | 'teacher', targetId: string): {
    existingClass?: ScheduledClass;
    conflictInfo: string;
  } {
    const existingClass = this.existingSchedule.find(cls =>
      cls.day_of_week === day && cls.period === period &&
      (targetType === 'room' ? cls.room_id === targetId :
       targetType === 'student' ? cls.student_id === targetId :
       cls.teacher_id === targetId)
    );

    let conflictInfo = '';
    if (existingClass) {
      const conflictCourse = this.courses.find(c => c.id === existingClass.course_id);
      if (conflictCourse) {
        switch (targetType) {
          case 'room':
            conflictInfo = `教室"${targetId}"在${this.formatDay(day)}第${period}节已被课程"${conflictCourse.course_name}"占用`;
            break;
          case 'student':
            conflictInfo = `学生"${targetId}"在${this.formatDay(day)}第${period}节已有课程"${conflictCourse.course_name}"安排`;
            break;
          case 'teacher':
            conflictInfo = `教师"${targetId}"在${this.formatDay(day)}第${period}节已有课程"${conflictCourse.course_name}"安排`;
            break;
        }
      } else {
        conflictInfo = `${this.formatDay(day)}第${period}节存在${targetType === 'room' ? '教室' : targetType === 'student' ? '学生' : '教师'}冲突`;
      }
    }

    return { existingClass, conflictInfo };
  }

  // 新增：生成详细的冲突报告
  generateConflictReport(conflicts: Conflict[]): string {
    if (conflicts.length === 0) {
      return '✅ 未发现排课冲突';
    }

    let report = `⚠️ 发现 ${conflicts.length} 个排课冲突：\n\n`;
    
    const conflictGroups = conflicts.reduce((groups, conflict) => {
      const type = conflict.type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(conflict);
      return groups;
    }, {} as Record<string, Conflict[]>);

    for (const [type, typeConflicts] of Object.entries(conflictGroups)) {
      const typeNames: Record<string, string> = {
        'room_conflict': '教室冲突',
        'student_conflict': '学生冲突',
        'teacher_conflict': '教师冲突'
      };
      
      report += `📍 ${typeNames[type]} (${typeConflicts.length}个):\n`;
      
      for (const conflict of typeConflicts) {
        report += `   • ${conflict.description}\n`;
      }
      report += '\n';
    }
    
    return report;
  }

  static detectConflicts(scheduledClasses: ScheduledClass[]): Conflict[] {
    const conflicts: Conflict[] = [];
    
    for (let i = 0; i < scheduledClasses.length; i++) {
      for (let j = i + 1; j < scheduledClasses.length; j++) {
        const cls1 = scheduledClasses[i];
        const cls2 = scheduledClasses[j];
        
        // 检查是否在同一时间
        const isSameTime = cls1.day_of_week === cls2.day_of_week && 
                           cls1.period === cls2.period &&
                           (!cls1.start_week || !cls2.start_week || 
                            !(cls1.end_week < cls2.start_week || cls2.end_week < cls1.start_week));
        
        if (!isSameTime) continue;
        
        // 教室冲突：同一天同一节次同一教室
        if (cls1.room_id === cls2.room_id) {
          const roomInfo = `教室"${cls1.room_id}"`;
          conflicts.push({
            id: generateId(),
            teacher_id: cls1.teacher_id,
            type: 'room_conflict',
            scheduled_class_id: cls1.id,
            conflicting_class_id: cls2.id,
            description: `教室冲突：${cls1.day_of_week}第${cls1.period}节 ${roomInfo} 同时被两节课占用`,
            resolved: false,
            created_at: new Date().toISOString(),
          });
        }
        
        // 学生冲突：同一天同一节次同一学生
        if (cls1.student_id && cls1.student_id === cls2.student_id) {
          conflicts.push({
            id: generateId(),
            teacher_id: cls1.teacher_id,
            type: 'student_conflict',
            scheduled_class_id: cls1.id,
            conflicting_class_id: cls2.id,
            description: `学生冲突：学生"${cls1.student_id}"在${cls1.day_of_week}第${cls1.period}节同时安排了两节课`,
            resolved: false,
            created_at: new Date().toISOString(),
          });
        }
        
        // 教师冲突：同一天同一节次同一教师（新增）
        if (cls1.teacher_id === cls2.teacher_id) {
          conflicts.push({
            id: generateId(),
            teacher_id: cls1.teacher_id,
            type: 'teacher_conflict',
            scheduled_class_id: cls1.id,
            conflicting_class_id: cls2.id,
            description: `教师冲突：教师"${cls1.teacher_id}"在${cls1.day_of_week}第${cls1.period}节同时安排了两节课`,
            resolved: false,
            created_at: new Date().toISOString(),
          });
        }
      }
    }
    
    return conflicts;
  }
}
