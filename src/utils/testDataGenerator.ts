// 测试数据生成器 - 为学生分配功能添加测试数据

import { classService } from '../services';

// 学生测试数据
export const generateTestStudents = () => {
  const testStudents = [
    {
      id: 'student_001',
      student_id: '2024001',
      name: '张三',
      grade: 1,
      major_class: '音乐学2024级1班',
      class_type: '本科',
      enrollment_year: 2024,
      class_code: '01',
      instrument: '钢琴',
      primary_instrument: '钢琴',
      secondary_instrument1: '声乐',
      secondary_instrument2: '古筝',
      secondary_instrument3: '二胡',
      faculty_code: 'PIANO',
      teacher_id: 'teacher_001',
      notes: '主修钢琴，辅修声乐、古筝和二胡',
      preferred_teacher_id: 'teacher_001',
      max_students_per_class: 8
    },
    {
      id: 'student_002',
      student_id: '2024002',
      name: '李四',
      grade: 1,
      major_class: '音乐学2024级2班',
      class_type: '本科',
      enrollment_year: 2024,
      class_code: '02',
      instrument: '声乐',
      primary_instrument: '声乐',
      secondary_instrument1: '钢琴',
      secondary_instrument2: null,
      secondary_instrument3: null,
      faculty_code: 'VOCAL',
      teacher_id: 'teacher_002',
      notes: '主修声乐，辅修钢琴',
      preferred_teacher_id: 'teacher_002',
      max_students_per_class: 10
    },
    {
      id: 'student_003',
      student_id: '2024201',
      name: '王五',
      grade: 1,
      major_class: '音乐学专升本2024级1班',
      class_type: '专升本',
      enrollment_year: 2024,
      class_code: '01',
      instrument: '古筝',
      primary_instrument: '古筝',
      secondary_instrument1: '竹笛',
      secondary_instrument2: '琵琶',
      secondary_instrument3: null,
      faculty_code: 'INSTRUMENT',
      teacher_id: 'teacher_003',
      notes: '专升本学生，主修古筝，辅修竹笛和琵琶',
      preferred_teacher_id: 'teacher_003',
      max_students_per_class: 6
    },
    {
      id: 'student_004',
      student_id: '2024101',
      name: '赵六',
      grade: 1,
      major_class: '音乐学专科2024级1班',
      class_type: '专科',
      enrollment_year: 2024,
      class_code: '01',
      instrument: '钢琴',
      primary_instrument: '钢琴',
      secondary_instrument1: '器乐',
      secondary_instrument2: null,
      secondary_instrument3: null,
      faculty_code: 'PIANO',
      teacher_id: null, // 未分配教师
      notes: '主修钢琴，辅修器乐',
      preferred_teacher_id: null,
      max_students_per_class: 8
    },
    {
      id: 'student_005',
      student_id: '2024003',
      name: '孙七',
      grade: 2,
      major_class: '音乐学2023级2班',
      class_type: '本科',
      enrollment_year: 2023,
      class_code: '02',
      instrument: '声乐',
      primary_instrument: '声乐',
      secondary_instrument1: '器乐',
      secondary_instrument2: '钢琴',
      secondary_instrument3: null,
      faculty_code: 'VOCAL',
      teacher_id: 'teacher_002',
      notes: '主修声乐，辅修器乐和钢琴',
      preferred_teacher_id: 'teacher_002',
      max_students_per_class: 10
    },
    {
      id: 'student_006',
      student_id: '2024102',
      name: '周八',
      grade: 1,
      major_class: '音乐学专科2024级2班',
      class_type: '专科',
      enrollment_year: 2024,
      class_code: '02',
      instrument: '器乐',
      primary_instrument: '器乐',
      secondary_instrument1: null,
      secondary_instrument2: null,
      secondary_instrument3: null,
      faculty_code: 'INSTRUMENT',
      teacher_id: null, // 未分配教师
      notes: '只修器乐专业',
      preferred_teacher_id: null,
      max_students_per_class: 6
    },
    {
      id: 'student_007',
      student_id: '2023001',
      name: '吴九',
      grade: 2,
      major_class: '音乐学2023级1班',
      class_type: '本科',
      enrollment_year: 2023,
      class_code: '01',
      instrument: '钢琴',
      primary_instrument: '钢琴',
      secondary_instrument1: '声乐',
      secondary_instrument2: null,
      secondary_instrument3: null,
      faculty_code: 'PIANO',
      teacher_id: 'teacher_001',
      notes: '主修钢琴，辅修声乐',
      preferred_teacher_id: 'teacher_001',
      max_students_per_class: 8
    },
    {
      id: 'student_008',
      student_id: '2024004',
      name: '郑十',
      grade: 1,
      major_class: '音乐学2024级1班',
      class_type: '本科',
      enrollment_year: 2024,
      class_code: '01',
      instrument: '声乐',
      primary_instrument: '声乐',
      secondary_instrument1: '钢琴',
      secondary_instrument2: '器乐',
      secondary_instrument3: null,
      faculty_code: 'VOCAL',
      teacher_id: null, // 未分配教师
      notes: '主修声乐，辅修钢琴和器乐',
      preferred_teacher_id: null,
      max_students_per_class: 10
    }
  ];

  return testStudents;
};

// 教师测试数据
export const generateTestTeachers = () => {
  const testTeachers = [
    {
      id: 'teacher_001',
      name: '李钢琴',
      full_name: '李钢琴',
      teacher_id: 'PIANO001',
      faculty_code: 'PIANO',
      faculty_name: '钢琴专业',
      can_teach_instruments: ['钢琴'],
      preferred_students: ['student_001', 'student_007'],
      max_students_per_instrument: {
        '钢琴': 8
      }
    },
    {
      id: 'teacher_002',
      name: '王声乐',
      full_name: '王声乐',
      teacher_id: 'VOCAL001',
      faculty_code: 'VOCAL',
      faculty_name: '声乐专业',
      can_teach_instruments: ['声乐'],
      preferred_students: ['student_002', 'student_005'],
      max_students_per_instrument: {
        '声乐': 10
      }
    },
    {
      id: 'teacher_003',
      name: '赵器乐',
      full_name: '赵器乐',
      teacher_id: 'INSTRUMENT001',
      faculty_code: 'INSTRUMENT',
      faculty_name: '器乐专业',
      can_teach_instruments: ['器乐', '钢琴'], // 器乐教师也可以教钢琴
      preferred_students: ['student_003'],
      max_students_per_instrument: {
        '器乐': 6,
        '钢琴': 4
      }
    },
    {
      id: 'teacher_004',
      name: '刘综合',
      full_name: '刘综合',
      teacher_id: 'COMPREHENSIVE001',
      faculty_code: 'INSTRUMENT',
      faculty_name: '综合专业',
      can_teach_instruments: ['钢琴', '声乐', '器乐'],
      preferred_students: [],
      max_students_per_instrument: {
        '钢琴': 5,
        '声乐': 5,
        '器乐': 3
      }
    }
  ];

  return testTeachers;
};

// 初始化测试数据的函数
export const initializeTestData = async () => {
  console.log('开始初始化测试数据...');
  
  // 获取现有数据
  const existingStudents = localStorage.getItem('music_scheduler_students');
  const existingTeachers = localStorage.getItem('music_scheduler_teachers');
  
  let needSyncClasses = false;
  
  // 只有在没有数据时才初始化测试数据
  if (!existingStudents || JSON.parse(existingStudents).length === 0) {
    const testStudents = generateTestStudents();
    localStorage.setItem('music_scheduler_students', JSON.stringify(testStudents));
    console.log('已添加测试学生数据:', testStudents.length, '条');
    needSyncClasses = true; // 学生数据已更新，需要同步班级数据
  }
  
  if (!existingTeachers || JSON.parse(existingTeachers).length === 0) {
    const testTeachers = generateTestTeachers();
    localStorage.setItem('music_scheduler_teachers', JSON.stringify(testTeachers));
    console.log('已添加测试教师数据:', testTeachers.length, '条');
  }
  
  // 如果有新的学生数据或没有班级数据，进行班级数据同步
  const existingClasses = localStorage.getItem('music_scheduler_classes');
  if (needSyncClasses || !existingClasses || JSON.parse(existingClasses).length === 0) {
    try {
      // 重新获取学生数据用于同步
      const studentsData = JSON.parse(localStorage.getItem('music_scheduler_students') || '[]');
      if (studentsData.length > 0) {
        await classService.syncFromStudents(studentsData);
        console.log('已同步班级数据');
      }
    } catch (error) {
      console.warn('班级数据同步失败:', error);
    }
  }
  
  console.log('测试数据初始化完成');
};

// 清除测试数据的函数
export const clearTestData = () => {
  localStorage.removeItem('music_scheduler_students');
  localStorage.removeItem('music_scheduler_teachers');
  console.log('测试数据已清除');
};

// 导出数据用于测试
export const exportTestData = () => {
  const students = generateTestStudents();
  const teachers = generateTestTeachers();
  
  // 从备注中提取具体乐器类型的函数
  const extractInstrumentFromNotes = (notes: string, instrumentType: string): string => {
    if (instrumentType !== '器乐' || !notes) return instrumentType;
    
    // 从备注中提取具体乐器类型
    const instrumentKeywords = [
      '古筝', '竹笛', '二胡', '琵琶', '古琴', '柳琴', '阮', '扬琴',
      '笛子', '箫', '葫芦丝', '笙', '唢呐', '巴乌', '陶笛', '木笛',
      '小提琴', '中提琴', '大提琴', '低音提琴', '单簧管', '双簧管',
      '萨克斯', '小号', '长号', '圆号', '大号', '长笛', '短笛',
      '打击乐', '马林巴', '钢琴', '电子琴', '手风琴'
    ];
    
    // 检查备注中是否包含具体乐器
    for (const keyword of instrumentKeywords) {
      if (notes.includes(keyword)) {
        return keyword;
      }
    }
    
    return '器乐'; // 如果没有找到具体乐器，返回默认器乐
  };

  // 统计各专业的学生数量（使用新的乐器细分逻辑）
  const instrumentStats: { [key: string]: number } = {};
  students.forEach(student => {
    const primaryInstrument = extractInstrumentFromNotes(student.notes || '', student.primary_instrument);
    instrumentStats[primaryInstrument] = (instrumentStats[primaryInstrument] || 0) + 1;
  });
  
  return {
    students,
    teachers,
    summary: {
      totalStudents: students.length,
      totalTeachers: teachers.length,
      studentsByInstrument: instrumentStats,
      assignedStudents: students.filter(s => s.teacher_id).length,
      unassignedStudents: students.filter(s => !s.teacher_id).length
    }
  };
};
