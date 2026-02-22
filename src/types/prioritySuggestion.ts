/**
 * 教师优先排课建议相关数据模型
 * 基于稀缺优先原则：可排时间段越少，优先级越高
 */

export interface TimeSlot {
  dayOfWeek: number;
  periodStart: number;
  periodEnd: number;
  weekRange: {
    start: number;
    end: number;
  };
  weekRanges: Array<{ start: number; end: number }>;
  availableWeeksCount: number;
  quality: 'best' | 'good' | 'acceptable';
}

export interface ClassSuggestion {
  classId: string;
  className: string;
  studentCount: number;
  primaryStudents: string[];
  secondaryStudents: string[];
  
  priorityScore: number;
  scarcityScore: number;
  priorityLevel: 'urgent' | 'high' | 'normal' | 'relaxed';
  
  availableTimeSlots: TimeSlot[];
  availableSlotCount: number;
  totalAvailableSlotWeeks: number;
  
  blockedReasons: string[];
  conflictDetails: ConflictDetail[];
  
  sharedLargeClasses: LargeClassInfo[];
  competingTeachers: string[];
  riskLevel: 'high' | 'medium' | 'low';
  
  recommendation: string;
}

export interface ConflictDetail {
  type: 'large_class' | 'blocked_time' | 'scheduled' | 'teacher_unavailable';
  description: string;
  dayOfWeek: number;
  periodStart: number;
  periodEnd: number;
  source: string;
}

export interface LargeClassInfo {
  courseName: string;
  dayOfWeek: number;
  periodStart: number;
  periodEnd: number;
  weekRange: string;
}

export interface TeacherPrioritySuggestion {
  teacherId: string;
  teacherName: string;
  facultyName: string;
  
  calculatedAt: string;
  dataFreshness: 'realtime';
  
  dataVersion: {
    largeClassesHash: string;
    blockedTimesHash: string;
    scheduledClassesHash: string;
  };
  
  suggestions: ClassSuggestion[];
  
  summary: {
    totalClasses: number;
    urgentCount: number;
    highCount: number;
    normalCount: number;
    relaxedCount: number;
  };
}

export interface PrioritySuggestionParams {
  teacherId: string;
  academicYear?: string;
  semesterLabel?: string;
  includeCompleted?: boolean;
}

export interface TimeWindow {
  dayOfWeek: number;
  period: number;
  isAvailable: boolean;
  blockedBy: BlockedByInfo[];
}

export interface BlockedByInfo {
  type: 'large_class' | 'blocked_time' | 'scheduled' | 'teacher_unavailable';
  reason: string;
  priority: 'high' | 'medium' | 'low';
  source: string;
}

export const PRIORITY_LEVELS = {
  urgent: { label: '紧急优先', color: 'red', threshold: 0.7, description: '可排时段极少，立即排课' },
  high: { label: '优先', color: 'yellow', threshold: 0.4, description: '可排时段较少，尽快排课' },
  normal: { label: '正常', color: 'blue', threshold: 0.2, description: '可排时段适中，按需排课' },
  relaxed: { label: '宽松', color: 'green', threshold: 0, description: '可排时段充裕，最后排课' },
} as const;

export const DAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] as const;
export const MAX_PERIODS_PER_DAY = 10;
export const MAX_WEEKS_PER_SEMESTER = 20;
