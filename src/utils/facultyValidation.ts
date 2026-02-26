/**
 * 教研室约束验证器
 * 验证排课相关的教研室约束
 */

import type { Course, Student, ScheduledClass } from '../types';
import { INSTRUMENT_FACULTY_MAPPING, FACULTY_CONFIG } from './teacherValidation';

// 扩展的课表类型，包含关联数据
interface EnrichedScheduledClass extends ScheduledClass {
  date: string; // 添加日期字段
  courses?: Course; // 添加课程关联
}

// 课表提案
export interface ScheduleProposal {
  teacherId: string;
  instrumentType: string;
  students: Student[];
  date: string; // YYYY-MM-DD format
  period: number;
  course?: Course;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FacultyWorkload {
  facultyName: string;
  classCount: number;
}

class FacultyConstraintValidator {
  private existingSchedule: EnrichedScheduledClass[] = [];

  constructor(existingSchedule: ScheduledClass[] = []) {
    // 转换数据，添加必要的字段
    this.existingSchedule = existingSchedule.map(cls => ({
      ...cls,
      date: (cls as any).date || new Date().toISOString().split('T')[0],
      courses: (cls as any).courses
    })) as EnrichedScheduledClass[];
  }

  /**
   * 验证教研室相关约束
   */
  validateFacultyConstraints(proposal: ScheduleProposal): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. 验证教师是否有资格教授该乐器
    const qualificationResult = this.checkTeacherQualification(
      proposal.teacherId,
      proposal.instrumentType
    );
    if (!qualificationResult.valid) {
      errors.push(qualificationResult.message);
    }

    // 2. 验证教师教研室与乐器教研室是否匹配
    const facultyMatchResult = this.checkFacultyMatch(
      proposal.teacherId,
      proposal.instrumentType
    );
    if (!facultyMatchResult.valid) {
      errors.push(facultyMatchResult.message);
    }

    // 3. 检查教师是否超负荷（按教研室统计）
    const dailyLoadResult = this.checkFacultyDailyLoad(
      proposal.teacherId,
      proposal.date
    );
    if (dailyLoadResult.warning) {
      warnings.push(dailyLoadResult.message);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 检查教师教学资格
   */
  checkTeacherQualification(
    teacherId: string,
    instrumentType: string
  ): { valid: boolean; message?: string } {
    // 获取教师信息（这里需要从上下文或服务获取）
    const teacher = this.getTeacherInfo(teacherId);
    if (!teacher) {
      return { valid: false, message: `教师ID ${teacherId} 不存在` };
    }

    // 检查教师是否可以教授该乐器
    const canTeach = teacher.can_teach_instruments?.includes(instrumentType);
    if (!canTeach) {
      return {
        valid: false,
        message: `教师 ${teacher.full_name} 未获得 ${instrumentType} 的教学资格`,
      };
    }

    return { valid: true };
  }

  /**
   * 检查教研室匹配
   */
  checkFacultyMatch(
    teacherId: string,
    instrumentType: string
  ): { valid: boolean; message?: string } {
    const teacher = this.getTeacherInfo(teacherId);
    if (!teacher) {
      return { valid: false, message: `教师ID ${teacherId} 不存在` };
    }

    // 获取教师教研室
    const teacherFacultyCode = teacher.faculty_code;

    // 获取乐器所属教研室
    const instrumentFacultyCode = INSTRUMENT_FACULTY_MAPPING[instrumentType];

    if (!instrumentFacultyCode) {
      return {
        valid: false,
        message: `未知乐器类型: ${instrumentType}`,
      };
    }

    // 检查教研室是否匹配
    if (teacherFacultyCode !== instrumentFacultyCode) {
      const teacherFacultyName =
        FACULTY_CONFIG[teacherFacultyCode as keyof typeof FACULTY_CONFIG]?.name ||
        teacherFacultyCode;
      const instrumentFacultyName =
        FACULTY_CONFIG[instrumentFacultyCode as keyof typeof FACULTY_CONFIG]
          ?.name || instrumentFacultyCode;

      return {
        valid: false,
        message: `教师属于${teacherFacultyName}，不能教授${instrumentFacultyName}的课程`,
      };
    }

    return { valid: true };
  }

  /**
   * 检查教师当日教研室工作量
   */
  checkFacultyDailyLoad(
    teacherId: string,
    date: string
  ): { warning: boolean; message?: string } {
    // 获取教师当日已安排课程
    const dailySchedule = this.getTeacherDailySchedule(teacherId, date);

    // 检查总课程数是否超过10节
    if (dailySchedule.length >= 10) {
      return {
        warning: true,
        message: `教师当日已排满10节课`,
      };
    }

    // 按教研室统计工作量
    const facultyWorkload: Record<string, number> = {};
    for (const cls of dailySchedule) {
      // 从课程类型推断教研室
      const courseType = (cls as any).course_type;
      if (courseType) {
        const facultyCode = this.getFacultyCodeByCourseType(courseType);
        facultyWorkload[facultyCode] = (facultyWorkload[facultyCode] || 0) + 1;
      }
    }

    // 检查是否有教研室超负荷（超过8节）
    for (const [facultyCode, workload] of Object.entries(facultyWorkload)) {
      if (workload >= 8) {
        const facultyName =
          FACULTY_CONFIG[facultyCode as keyof typeof FACULTY_CONFIG]?.name ||
          facultyCode;
        return {
          warning: true,
          message: `教师当日在${facultyName}的工作量已达到${workload}节，建议平衡分配`,
        };
      }
    }

    return { warning: false };
  }

  /**
   * 获取教师信息
   */
  private getTeacherInfo(teacherId: string): any {
    // 这里应该从服务获取教师信息
    // 简化实现，返回null让调用方处理
    return null;
  }

  /**
   * 获取教师当日课表
   */
  private getTeacherDailySchedule(
    teacherId: string,
    date: string
  ): EnrichedScheduledClass[] {
    return this.existingSchedule.filter(
      (cls) =>
        cls.teacher_id === teacherId &&
        cls.date === date
    );
  }

  /**
   * 根据课程类型获取教研室代码
   */
  private getFacultyCodeByCourseType(courseType: string): string {
    const mapping: Record<string, string> = {
      钢琴: 'PIANO',
      声乐: 'VOCAL',
      器乐: 'INSTRUMENT',
    };
    return mapping[courseType] || 'INSTRUMENT';
  }

  /**
   * 获取教研室工作量统计
   */
  getFacultyWorkload(teacherId: string, date: string): FacultyWorkload[] {
    const dailySchedule = this.getTeacherDailySchedule(teacherId, date);
    const workloadMap: Record<string, number> = {};

    for (const cls of dailySchedule) {
      // 从课程类型推断教研室
      const courseType = (cls as any).course_type || cls.courses?.course_type;
      if (courseType) {
        const facultyCode = this.getFacultyCodeByCourseType(courseType);
        workloadMap[facultyCode] = (workloadMap[facultyCode] || 0) + 1;
      }
    }

    return Object.entries(workloadMap).map(([facultyCode, classCount]) => ({
      facultyName:
        FACULTY_CONFIG[facultyCode as keyof typeof FACULTY_CONFIG]?.name ||
        facultyCode,
      classCount,
    }));
  }

  /**
   * 检查特定时间段是否有冲突
   */
  hasTimeConflict(
    teacherId: string,
    date: string,
    period: number
  ): boolean {
    return this.existingSchedule.some(
      (cls) =>
        cls.teacher_id === teacherId &&
        cls.date === date &&
        cls.period === period
    );
  }

  /**
   * 获取教师某日的所有课程
   */
  getTeacherDaySchedule(teacherId: string, date: string): EnrichedScheduledClass[] {
    return this.getTeacherDailySchedule(teacherId, date).sort(
      (a, b) => a.period - b.period
    );
  }

  /**
   * 计算教师某周的工作量统计
   */
  getWeeklyWorkload(
    teacherId: string,
    weekStartDate: string
  ): { total: number; byFaculty: FacultyWorkload[]; dailyCounts: Record<string, number> } {
    const weekDays: string[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStartDate);
      date.setDate(date.getDate() + i);
      weekDays.push(date.toISOString().split('T')[0]);
    }

    let total = 0;
    const byFaculty: FacultyWorkload[] = [];
    const dailyCounts: Record<string, number> = {};

    for (const date of weekDays) {
      const daySchedule = this.getTeacherDailySchedule(teacherId, date);
      dailyCounts[date] = daySchedule.length;
      total += daySchedule.length;

      for (const cls of daySchedule) {
        const courseType = (cls as any).course_type || cls.courses?.course_type;
        if (courseType) {
          const facultyCode = this.getFacultyCodeByCourseType(courseType);
          const existing = byFaculty.find((f) => f.facultyName === facultyCode);
          if (existing) {
            existing.classCount++;
          } else {
            byFaculty.push({
              facultyName:
                FACULTY_CONFIG[facultyCode as keyof typeof FACULTY_CONFIG]
                  ?.name || facultyCode,
              classCount: 1,
            });
          }
        }
      }
    }

    return { total, byFaculty, dailyCounts };
  }
}

export default FacultyConstraintValidator;
