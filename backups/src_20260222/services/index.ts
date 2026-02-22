// 服务统一导出 - 使用本地存储模式
// 切换到 Supabase 模式只需将这里改为导入 ./supabase

import localStorageService from './localStorage';
import dataManagementService from './dataManagementService';

// 使用本地存储服务
export const authService = localStorageService.authService;
export const studentService = localStorageService.studentService;
export const classService = localStorageService.classService;
export const courseService = localStorageService.courseService;
export const roomService = localStorageService.roomService;
export const scheduleService = localStorageService.scheduleService;
export const conflictService = localStorageService.conflictService;
export const teacherService = localStorageService.teacherService;
export const blockedSlotService = localStorageService.blockedSlotService;
export const weekConfigService = localStorageService.weekConfigService;
export const dataConsistencyService = localStorageService.dataConsistencyService;
export const clearAllData = localStorageService.clearAllData;
export const importDemoData = localStorageService.importDemoData;
export const STORAGE_KEYS = localStorageService.STORAGE_KEYS;
export const largeClassScheduleService = localStorageService.largeClassScheduleService;

// 新增：学生-教师分配相关服务
export const studentTeacherAssignmentService = localStorageService.studentTeacherAssignmentService;
export const studentMajorAssignmentService = localStorageService.studentMajorAssignmentService;

// 新增：高级排课服务
export { generalCourseService } from './generalCourseService';
export { majorCourseService } from './majorCourseService';
export { timeBlockerService } from './timeBlockerService';
export { largeClassBlockerService } from './largeClassBlockerService';

// 数据管理服务
export { dataManagementService };

// 排课视图服务 - 统一数据获取和转换
export { scheduleViewService } from './scheduleViewService';
export type {
  ScheduleResult,
  ScheduleClassView,
  ViewFilters,
  StudentInfo,
  OriginalSchedule,
  TimeSlot
} from './scheduleViewService';
