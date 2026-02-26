/**
 * 教研室功能集成测试套件
 * 测试所有教研室相关的核心功能
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FacultyConstraintValidator } from '../src/utils/facultyValidation';
import { validateTeacherQualification, getFacultyCodeByInstrument } from '../src/utils/teacherValidation';
import { FACULTIES, INSTRUMENT_CONFIGS, getFacultyCodeForInstrument, getMaxStudentsForInstrument } from '../src/types';

// =====================================================
// 测试数据
// =====================================================

const mockTeachers = [
  {
    id: 'teacher-1',
    full_name: '张老师',
    email: 'zhang@music.edu',
    faculty_code: 'PIANO',
    faculty_id: 'faculty-piano',
    can_teach_instruments: ['钢琴'],
    primary_instrument: '钢琴',
    status: 'active' as const
  },
  {
    id: 'teacher-2',
    full_name: '李老师',
    email: 'li@music.edu',
    faculty_code: 'VOCAL',
    faculty_id: 'faculty-vocal',
    can_teach_instruments: ['声乐'],
    primary_instrument: '声乐',
    status: 'active' as const
  },
  {
    id: 'teacher-3',
    full_name: '王老师',
    email: 'wang@music.edu',
    faculty_code: 'INSTRUMENT',
    faculty_id: 'faculty-instrument',
    can_teach_instruments: ['古筝', '笛子'],
    primary_instrument: '古筝',
    status: 'active' as const
  }
];

const mockScheduleRecords = [
  {
    id: 'schedule-1',
    teacher_id: 'teacher-1',
    course_id: 'course-1',
    room_id: 'room-1',
    student_id: 'student-1',
    day_of_week: 1,
    period: 1,
    date: '2024-01-08',
    faculty_id: 'faculty-piano',
    status: 'scheduled' as const,
    course_type: '钢琴',
    created_at: '2024-01-01T00:00:00Z'
  }
];

// =====================================================
// 教研室分配逻辑测试
// =====================================================

describe('Faculty Assignment Logic', () => {
  test('钢琴应分配到钢琴专业', () => {
    expect(getFacultyCodeForInstrument('钢琴')).toBe('PIANO');
  });

  test('声乐应分配到声乐专业', () => {
    expect(getFacultyCodeForInstrument('声乐')).toBe('VOCAL');
  });

  test('古筝应分配到器乐专业', () => {
    expect(getFacultyCodeForInstrument('古筝')).toBe('INSTRUMENT');
  });

  test('笛子应分配到器乐专业', () => {
    expect(getFacultyCodeForInstrument('笛子')).toBe('INSTRUMENT');
  });

  test('小提琴应分配到器乐专业', () => {
    expect(getFacultyCodeForInstrument('小提琴')).toBe('INSTRUMENT');
  });

  test('未知乐器默认分配到器乐专业', () => {
    expect(getFacultyCodeForInstrument('未知乐器')).toBe('INSTRUMENT');
  });

  test('所有教研室配置应正确', () => {
    expect(FACULTIES).toHaveLength(3);

    const pianoFaculty = FACULTIES.find(f => f.faculty_code === 'PIANO');
    expect(pianoFaculty?.faculty_name).toBe('钢琴专业');

    const vocalFaculty = FACULTIES.find(f => f.faculty_code === 'VOCAL');
    expect(vocalFaculty?.faculty_name).toBe('声乐专业');

    const instrumentFaculty = FACULTIES.find(f => f.faculty_code === 'INSTRUMENT');
    expect(instrumentFaculty?.faculty_name).toBe('器乐专业');
  });
});

// =====================================================
// 教师资格验证测试
// =====================================================

describe('Teacher Qualification Validation', () => {
  test('钢琴教师应有钢琴教学资格', () => {
    const result = validateTeacherQualification(
      'PIANO',
      ['钢琴'],
      '钢琴'
    );
    expect(result.valid).toBe(true);
  });

  test('声乐教师应有声乐教学资格', () => {
    const result = validateTeacherQualification(
      'VOCAL',
      ['声乐'],
      '声乐'
    );
    expect(result.valid).toBe(true);
  });

  test('钢琴教师不应有声乐教学资格', () => {
    const result = validateTeacherQualification(
      'PIANO',
      ['钢琴'],
      '声乐'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('教研室不匹配');
  });

  test('声乐教师不应有钢琴教学资格', () => {
    const result = validateTeacherQualification(
      'VOCAL',
      ['声乐'],
      '钢琴'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('教研室不匹配');
  });

  test('器乐教师应有古筝教学资格', () => {
    const result = validateTeacherQualification(
      'INSTRUMENT',
      ['古筝', '笛子'],
      '古筝'
    );
    expect(result.valid).toBe(true);
  });

  test('器乐教师不应有钢琴教学资格', () => {
    const result = validateTeacherQualification(
      'INSTRUMENT',
      ['古筝', '笛子'],
      '钢琴'
    );
    expect(result.valid).toBe(false);
  });

  test('未在任何教研室的教师不应有资格', () => {
    const result = validateTeacherQualification(
      undefined,
      ['钢琴'],
      '钢琴'
    );
    expect(result.valid).toBe(false);
  });

  test('没有在可教授列表中的乐器应被拒绝', () => {
    const result = validateTeacherQualification(
      'INSTRUMENT',
      ['古筝'],
      '钢琴'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('钢琴');
  });
});

// =====================================================
// 班级规模验证测试
// =====================================================

describe('Class Size Validation', () => {
  test('钢琴每班最多5人', () => {
    expect(getMaxStudentsForInstrument('钢琴')).toBe(5);
  });

  test('声乐每班最多5人', () => {
    expect(getMaxStudentsForInstrument('声乐')).toBe(5);
  });

  test('古筝每班最多8人', () => {
    expect(getMaxStudentsForInstrument('古筝')).toBe(8);
  });

  test('笛子每班最多8人', () => {
    expect(getMaxStudentsForInstrument('笛子')).toBe(8);
  });

  test('竹笛每班最多8人', () => {
    expect(getMaxStudentsForInstrument('竹笛')).toBe(8);
  });

  test('葫芦丝每班最多8人', () => {
    expect(getMaxStudentsForInstrument('葫芦丝')).toBe(8);
  });

  test('小提琴每班最多5人', () => {
    expect(getMaxStudentsForInstrument('小提琴')).toBe(5);
  });

  test('萨克斯每班最多5人', () => {
    expect(getMaxStudentsForInstrument('萨克斯')).toBe(5);
  });

  test('未知乐器默认5人', () => {
    expect(getMaxStudentsForInstrument('未知乐器')).toBe(5);
  });
});

// =====================================================
// 教研室约束验证器测试
// =====================================================

describe('Faculty Constraint Validator', () => {
  let validator: FacultyConstraintValidator;

  beforeEach(() => {
    validator = new FacultyConstraintValidator(mockScheduleRecords as any);
  });

  test('应正确检查教师资格', () => {
    const teacher = mockTeachers[0];
    const result = validator.checkTeacherQualification(teacher.id, '钢琴');

    expect(result.valid).toBe(true);
  });

  test('应正确检查教研室匹配', () => {
    const teacher = mockTeachers[0];
    const result = validator.checkFacultyMatch(teacher.id, '钢琴');

    expect(result.valid).toBe(true);
  });

  test('应检测教研室不匹配', () => {
    const teacher = mockTeachers[0];
    const result = validator.checkFacultyMatch(teacher.id, '声乐');

    expect(result.valid).toBe(false);
    expect(result.message).toContain('教研室');
  });

  test('应检测时间冲突', () => {
    const hasConflict = validator.hasTimeConflict('teacher-1', '2024-01-08', 1);

    expect(hasConflict).toBe(true);
  });

  test('应检测无时间冲突', () => {
    const hasConflict = validator.hasTimeConflict('teacher-1', '2024-01-08', 2);

    expect(hasConflict).toBe(false);
  });

  test('应检测不同日期无冲突', () => {
    const hasConflict = validator.hasTimeConflict('teacher-1', '2024-01-09', 1);

    expect(hasConflict).toBe(false);
  });

  test('应正确计算教研室工作量', () => {
    const workload = validator.getFacultyWorkload('teacher-1', '2024-01-08');

    expect(workload).toHaveLength(1);
    expect(workload[0].facultyName).toBe('钢琴专业');
    expect(workload[0].classCount).toBe(1);
  });

  test('应正确检测工作量警告', () => {
    const result = validator.checkFacultyDailyLoad('teacher-1', '2024-01-08');

    // 由于只有1节课，不应有警告
    expect(result.warning).toBe(false);
  });

  test('应检测工作量过高', () => {
    // 模拟9节课的情况
    const heavySchedule = Array.from({ length: 9 }, (_, i) => ({
      ...mockScheduleRecords[0],
      id: `schedule-${i}`,
      period: i + 1,
      course_type: '钢琴'
    }));

    const heavyValidator = new FacultyConstraintValidator(heavySchedule as any);
    const result = heavyValidator.checkFacultyDailyLoad('teacher-1', '2024-01-08');

    expect(result.warning).toBe(true);
    expect(result.message).toContain('10节课');
  });
});

// =====================================================
// 乐器配置完整性测试
// =====================================================

describe('Instrument Configuration Integrity', () => {
  test('所有乐器应有教研室归属', () => {
    const instruments = Object.keys(INSTRUMENT_CONFIGS);

    instruments.forEach(instrument => {
      const config = INSTRUMENT_CONFIGS[instrument];
      const facultyCode = getFacultyCodeForInstrument(instrument);

      expect(config.faculty_code).toBe(facultyCode);
      expect(['PIANO', 'VOCAL', 'INSTRUMENT']).toContain(facultyCode);
    });
  });

  test('特殊乐器应有正确的班级规模', () => {
    const specialInstruments = ['古筝', '笛子', '竹笛', '葫芦丝'];

    specialInstruments.forEach(instrument => {
      const maxStudents = getMaxStudentsForInstrument(instrument);
      expect(maxStudents).toBe(8);
    });
  });

  test('普通乐器应有正确的班级规模', () => {
    const regularInstruments = ['钢琴', '声乐', '古琴', '双排键', '小提琴', '萨克斯', '大提琴'];

    regularInstruments.forEach(instrument => {
      const maxStudents = getMaxStudentsForInstrument(instrument);
      expect(maxStudents).toBe(5);
    });
  });

  test('所有乐器配置应有课时系数', () => {
    const instruments = Object.keys(INSTRUMENT_CONFIGS);

    instruments.forEach(instrument => {
      const config = INSTRUMENT_CONFIGS[instrument];

      expect(config.duration_coefficient).toBeDefined();
      expect(config.duration_coefficient.major_duration).toBe(0.5);
      expect(config.duration_coefficient.minor_duration).toBe(0.25);
    });
  });
});

// =====================================================
// 边界情况测试
// =====================================================

describe('Edge Cases', () => {
  test('空教研室代码应默认到器乐', () => {
    const result = validateTeacherQualification(
      '',
      ['钢琴'],
      '钢琴'
    );
    expect(result.valid).toBe(false);
  });

  test('空乐器列表应拒绝所有请求', () => {
    const result = validateTeacherQualification(
      'PIANO',
      [],
      '钢琴'
    );
    expect(result.valid).toBe(false);
  });

  test('验证器应处理空课表', () => {
    const validator = new FacultyConstraintValidator([]);
    const result = validator.checkFacultyDailyLoad('teacher-1', '2024-01-08');

    expect(result.warning).toBe(false);
  });

  test('验证器应处理空教师列表', () => {
    const validator = new FacultyConstraintValidator(mockScheduleRecords as any);
    const result = validator.checkTeacherQualification('non-existent', '钢琴');

    expect(result.valid).toBe(false);
  });

  test('教研室工作量统计应处理无数据情况', () => {
    const validator = new FacultyConstraintValidator([]);
    const workload = validator.getFacultyWorkload('teacher-1', '2024-01-08');

    expect(workload).toHaveLength(0);
  });

  test('周工作量统计应正确计算', () => {
    const validator = new FacultyConstraintValidator(mockScheduleRecords as any);
    const weekly = validator.getWeeklyWorkload('teacher-1', '2024-01-08');

    expect(weekly.total).toBeGreaterThanOrEqual(0);
    expect(weekly.dailyCounts).toBeDefined();
    expect(weekly.byFaculty).toBeDefined();
  });
});

// =====================================================
// 教师数据测试
// =====================================================

describe('Teacher Data Validation', () => {
  test('模拟教师数据应有正确的教研室归属', () => {
    const pianoTeacher = mockTeachers.find(t => t.faculty_code === 'PIANO');
    expect(pianoTeacher).toBeDefined();
    expect(pianoTeacher?.can_teach_instruments).toContain('钢琴');
  });

  test('声乐教师数据应正确', () => {
    const vocalTeacher = mockTeachers.find(t => t.faculty_code === 'VOCAL');
    expect(vocalTeacher).toBeDefined();
    expect(vocalTeacher?.can_teach_instruments).toContain('声乐');
  });

  test('器乐教师数据应支持多种乐器', () => {
    const instrumentTeacher = mockTeachers.find(t => t.faculty_code === 'INSTRUMENT');
    expect(instrumentTeacher).toBeDefined();
    expect(instrumentTeacher?.can_teach_instruments?.length).toBeGreaterThan(1);
  });

  test('所有教师应处于活跃状态', () => {
    mockTeachers.forEach(teacher => {
      expect(teacher.status).toBe('active');
    });
  });
});

// =====================================================
// 排课记录测试
// =====================================================

describe('Schedule Records Validation', () => {
  test('模拟排课记录应有正确的教研室', () => {
    const schedule = mockScheduleRecords[0];
    expect(schedule.faculty_id).toBe('faculty-piano');
  });

  test('排课记录状态应为已安排', () => {
    const schedule = mockScheduleRecords[0];
    expect(schedule.status).toBe('scheduled');
  });

  test('排课记录应有有效的教师ID', () => {
    const schedule = mockScheduleRecords[0];
    expect(schedule.teacher_id).toMatch(/^teacher-/);
  });

  test('排课记录应有有效的课程ID', () => {
    const schedule = mockScheduleRecords[0];
    expect(schedule.course_id).toMatch(/^course-/);
  });
});

// =====================================================
// API数据结构测试
// =====================================================

describe('API Data Structures', () => {
  test('教研室数据结构应完整', () => {
    FACULTIES.forEach(faculty => {
      expect(faculty).toHaveProperty('faculty_name');
      expect(faculty).toHaveProperty('faculty_code');
      expect(faculty.faculty_code).toMatch(/^(PIANO|VOCAL|INSTRUMENT)$/);
    });
  });

  test('乐器配置数据结构应完整', () => {
    Object.values(INSTRUMENT_CONFIGS).forEach(config => {
      expect(config).toHaveProperty('id');
      expect(config).toHaveProperty('instrument_name');
      expect(config).toHaveProperty('max_students_per_class');
      expect(config).toHaveProperty('faculty_code');
      expect(config).toHaveProperty('duration_coefficient');
    });
  });

  test('所有教研室代码应唯一', () => {
    const codes = FACULTIES.map(f => f.faculty_code);
    const uniqueCodes = new Set(codes);

    expect(codes.length).toBe(uniqueCodes.size);
  });

  test('所有乐器名称应唯一', () => {
    const instruments = Object.keys(INSTRUMENT_CONFIGS);
    const uniqueInstruments = new Set(instruments);

    expect(instruments.length).toBe(uniqueInstruments.size);
  });
});

// =====================================================
// 运行测试
// =====================================================

/*
运行命令：
npm test

或运行特定测试：
npm test -- --testNamePattern="Faculty Assignment"
*/
