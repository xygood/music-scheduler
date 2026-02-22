/**
 * 课程分配工具函数
 * 根据班级编号和学期序号生成应分配的课程名称
 */

import type { Course } from '../types';
import { v4 as uuidv4 } from 'uuid';

// 课程层级名称映射（只到七级）
const LEVEL_NAMES = ['', '一', '二', '三', '四', '五', '六', '七'];

// 课程类型配置
export interface CourseAssignment {
  piano: string | null;
  vocal: string | null;
  instrument: string | null;
}

/**
 * 根据班级编号和学期序号计算应分配的课程
 * @param classId 班级编号，如 "2401"、"专升本2401"
 * @param academicYear 学年，如 "2025-2026"
 * @param semester 学期序号（1-8）
 * @returns 课程分配对象
 */
export function getCoursesForClass(
  classId: string,
  academicYear: string,
  semesterNumber: number
): CourseAssignment {
  // 新生班在入学准备期无课程
  if (semesterNumber < 1) {
    return {
      piano: null,
      vocal: null,
      instrument: null
    };
  }

  // 超过7学期不再有课程
  if (semesterNumber > 7) {
    return {
      piano: null,
      vocal: null,
      instrument: null
    };
  }

  // 提取班级信息
  const isUpgradeClass = classId.includes('专升本');
  const classNumber = classId.replace(/[^0-9]/g, ''); // 提取数字部分
  const enrollmentYearPrefix = classNumber.slice(0, 2); // 入学年份前缀

  // 生成层级名称
  const levelName = LEVEL_NAMES[semesterNumber] || '';

  // 基础课程分配
  const courses: CourseAssignment = {
    piano: `钢琴（${levelName}）`,
    vocal: `声乐（${levelName}）`,
    instrument: '' as any, // 临时赋值，后面会覆盖
  };

  // 判断是否为毕业班（23级且班号<=3）
  const isGraduatingClass = enrollmentYearPrefix === '23' && parseInt(classNumber.slice(2)) <= 3;

  // 毕业班使用中国器乐
  if (isGraduatingClass) {
    courses.instrument = `中国器乐（${levelName}）`;
  } else {
    courses.instrument = `器乐（${levelName}）`;
  }

  return courses;
}

/**
 * 根据班级编号和学期标签计算学期序号
 * @param classId 班级编号
 * @param academicYear 学年
 * @param semesterLabel 学期标签，如 "2025-2026-1"
 * @returns 学期序号
 */
export function calculateSemesterNumber(
  classId: string,
  academicYear: string,
  semesterLabel: string
): number {
  // 提取入学年份
  const classNumber = classId.replace(/[^0-9]/g, '');
  const enrollmentYearPrefix = classNumber.slice(0, 2);
  const enrollmentYear = 2000 + parseInt(enrollmentYearPrefix); // 2301 -> 2023

  // 提取当前学年
  const currentYear = parseInt(academicYear.split('-')[0]); // 2025-2026 -> 2025

  // 提取学期号
  const semester = parseInt(semesterLabel.split('-').pop() || '1');

  // 计算学年差（当前学年 - 入学学年）
  const yearDiff = currentYear - enrollmentYear;

  // 计算学期序号
  return yearDiff * 2 + semester;
}

/**
 * 生成课程对象（用于保存到数据库）
 * @param classId 班级编号
 * @param academicYear 学年
 * @param semesterLabel 学期标签
 * @param teacherId 教师ID
 * @returns 课程对象数组
 */
export function generateCoursesForClass(
  classId: string,
  academicYear: string,
  semesterLabel: string,
  teacherId: string
): Omit<Course, 'id' | 'created_at'>[] {
  const semesterNumber = calculateSemesterNumber(classId, academicYear, semesterLabel);
  const courseAssignment = getCoursesForClass(classId, academicYear, semesterNumber);

  const courses: Omit<Course, 'id' | 'created_at'>[] = [];

  // 添加钢琴课程
  if (courseAssignment.piano) {
    courses.push({
      teacher_id: teacherId,
      course_name: courseAssignment.piano,
      course_type: '钢琴',
      faculty_id: 'PIANO',
      major_class: classId,
      academic_year: academicYear,
      semester: semesterNumber,
      semester_label: semesterLabel,
      course_category: 'general',
      duration: 30,
      week_frequency: 1
    });
  }

  // 添加声乐课程
  if (courseAssignment.vocal) {
    courses.push({
      teacher_id: teacherId,
      course_name: courseAssignment.vocal,
      course_type: '声乐',
      faculty_id: 'VOCAL',
      major_class: classId,
      academic_year: academicYear,
      semester: semesterNumber,
      semester_label: semesterLabel,
      course_category: 'general',
      duration: 30,
      week_frequency: 1
    });
  }

  // 添加器乐课程
  if (courseAssignment.instrument) {
    courses.push({
      teacher_id: teacherId,
      course_name: courseAssignment.instrument,
      course_type: '器乐',
      faculty_id: 'INSTRUMENT',
      major_class: classId,
      academic_year: academicYear,
      semester: semesterNumber,
      semester_label: semesterLabel,
      course_category: 'general',
      duration: 30,
      week_frequency: 1
    });
  }

  return courses;
}

// 测试用例
export const TEST_CASES = [
  {
    name: '新生班（26xx）：2026-2027-1学期 → 第1学期 → 钢琴（一）',
    classId: '2601',
    academicYear: '2026-2027',
    semesterLabel: '2026-2027-1',
    expected: {
      semesterNumber: 1,
      courses: {
        piano: '钢琴（一）',
        vocal: '声乐（一）',
        instrument: '器乐（一）'
      }
    }
  },
  {
    name: '2025级（25xx）：2025-2026-2学期 → 第2学期 → 钢琴（二）',
    classId: '2501',
    academicYear: '2025-2026',
    semesterLabel: '2025-2026-2',
    expected: {
      semesterNumber: 2,
      courses: {
        piano: '钢琴（二）',
        vocal: '声乐（二）',
        instrument: '器乐（二）'
      }
    }
  },
  {
    name: '2024级（24xx）：2025-2026-2学期 → 第4学期 → 钢琴（四）',
    classId: '2401',
    academicYear: '2025-2026',
    semesterLabel: '2025-2026-2',
    expected: {
      semesterNumber: 4,
      courses: {
        piano: '钢琴（四）',
        vocal: '声乐（四）',
        instrument: '器乐（四）'
      }
    }
  },
  {
    name: '毕业班（2301）：2025-2026-2学期 → 第6学期 → 钢琴（六）+ 中国器乐（六）',
    classId: '2301',
    academicYear: '2025-2026',
    semesterLabel: '2025-2026-2',
    expected: {
      semesterNumber: 6,
      courses: {
        piano: '钢琴（六）',
        vocal: '声乐（六）',
        instrument: '中国器乐（六）'
      }
    }
  },
  {
    name: '专升本班（2404）：2026-2027-1学期 → 第1学期 → 钢琴（一）',
    classId: '专升本2404',
    academicYear: '2026-2027',
    semesterLabel: '2026-2027-1',
    expected: {
      semesterNumber: 1,
      courses: {
        piano: '钢琴（一）',
        vocal: '声乐（一）',
        instrument: '器乐（一）'
      }
    }
  }
];

/**
 * 运行测试用例
 */
export function runCourseAssignmentTests(): { name: string; passed: boolean; expected: any; actual: any }[] {
  return TEST_CASES.map(testCase => {
    const semesterNumber = calculateSemesterNumber(testCase.classId, testCase.academicYear, testCase.semesterLabel);
    const courses = getCoursesForClass(testCase.classId, testCase.academicYear, semesterNumber);

    const passed =
      semesterNumber === testCase.expected.semesterNumber &&
      courses.piano === testCase.expected.courses.piano &&
      courses.vocal === testCase.expected.courses.vocal &&
      courses.instrument === testCase.expected.courses.instrument;

    return {
      name: testCase.name,
      passed,
      expected: {
        semesterNumber: testCase.expected.semesterNumber,
        courses: testCase.expected.courses
      },
      actual: {
        semesterNumber,
        courses
      }
    };
  });
}
