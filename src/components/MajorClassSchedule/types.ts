// 星期标签
export const WEEKDAYS = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 7, label: '周日' },
];

// 课程状态类型
export type CourseStatus = 'pending' | 'in_progress' | 'completed' | 'submitted' | 'reviewing' | 'locked';

// 课程状态配置
export const courseStatusConfig = {
  pending: { label: '待排课', color: 'bg-gray-100 text-gray-700', actionable: true },
  in_progress: { label: '排课中', color: 'bg-blue-100 text-blue-700', actionable: true },
  completed: { label: '已完成', color: 'bg-green-100 text-green-700', actionable: false },
  submitted: { label: '已提交', color: 'bg-green-100 text-green-700', actionable: false },
  reviewing: { label: '审核中', color: 'bg-orange-100 text-orange-700', actionable: false },
  locked: { label: '已锁定', color: 'bg-red-100 text-red-700', actionable: false }
};

// 课程排课状态接口
export interface CourseScheduleStatus {
  id: string;
  course_id: string;
  class_id: string;
  course_name: string;
  class_name: string;
  room_id: string;
  room_name: string;
  teacher_id: string;
  teacher_name: string;
  total_hours: number;
  scheduled_hours: number;
  status: CourseStatus;
  schedule_time: string;
  week_number: number;
  day_of_week: number;
  period: number;
}

// 班级类型定义
export interface Class {
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

// 时间槽类型
export interface TimeSlot {
  week: number;
  day: number;
  period: number;
}

// 冲突类型
export interface Conflict {
  week: number;
  day: number;
  period: number;
  type: 'room' | 'time' | 'class';
  message: string;
  suggestion: string;
}

// 排课记录类型
export interface Schedule {
  id: string;
  course_id: string;
  class_id: string;
  room_id: string;
  week_number: number;
  day_of_week: number;
  period: number;
  start_week: number;
  end_week: number;
  created_at: string;
  status: 'draft' | 'submitted';
}

// 分组排课类型
export interface GroupedSchedule {
  day_of_week: number;
  period: number;
  room_id: string;
  schedules: Schedule[];
}

// 时间网格状态类型
export interface TimeGridStatus {
  status: 'available' | 'scheduled' | 'blocked';
  courseId?: string;
}

// 复制选项类型
export interface CopyOptions {
  weeks2_5: boolean;
  weeks7_10: boolean;
  weeks11_14: boolean;
  weeks15_17: boolean;
}
