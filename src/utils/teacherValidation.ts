// 教研室配置
export const FACULTY_CONFIG = {
  PIANO: { code: 'PIANO', name: '钢琴专业', description: '负责所有钢琴课程教学' },
  VOCAL: { code: 'VOCAL', name: '声乐专业', description: '负责所有声乐课程教学' },
  INSTRUMENT: { code: 'INSTRUMENT', name: '器乐专业', description: '负责所有器乐课程教学（古筝、笛子、古琴、葫芦丝、双排键、小提琴、萨克斯等）' },
} as const;

// 乐器到教研室映射
export const INSTRUMENT_FACULTY_MAPPING: Record<string, keyof typeof FACULTY_CONFIG> = {
  '钢琴': 'PIANO',
  '声乐': 'VOCAL',
  '古筝': 'INSTRUMENT',
  '笛子': 'INSTRUMENT',
  '竹笛': 'INSTRUMENT',
  '古琴': 'INSTRUMENT',
  '葫芦丝': 'INSTRUMENT',
  '双排键': 'INSTRUMENT',
  '小提琴': 'INSTRUMENT',
  '萨克斯': 'INSTRUMENT',
  '大提琴': 'INSTRUMENT',
};

// 验证教师是否有资格教授指定乐器
export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateTeacherQualification(
  teacherFacultyCode: string | undefined,
  teacherInstruments: string[],
  targetInstrument: string
): ValidationResult {
  // 获取乐器所属教研室
  const instrumentFaculty = INSTRUMENT_FACULTY_MAPPING[targetInstrument];

  if (!instrumentFaculty) {
    return { valid: false, reason: `未知乐器: ${targetInstrument}` };
  }

  // 检查教研室是否匹配
  if (teacherFacultyCode !== instrumentFaculty) {
    const facultyName = FACULTY_CONFIG[instrumentFaculty]?.name || instrumentFaculty;
    const teacherFacultyName = FACULTY_CONFIG[teacherFacultyCode as keyof typeof FACULTY_CONFIG]?.name || teacherFacultyCode || '未知教研室';

    return {
      valid: false,
      reason: `教师属于${teacherFacultyName}，无法教授${targetInstrument}（${facultyName}）`
    };
  }

  // 检查教师是否具备该乐器教学资格
  if (!teacherInstruments.includes(targetInstrument)) {
    return {
      valid: false,
      reason: `教师未被授权教授${targetInstrument}`
    };
  }

  return { valid: true };
}

// 根据乐器获取教研室代码
export function getFacultyCodeByInstrument(instrument: string): string {
  return INSTRUMENT_FACULTY_MAPPING[instrument] || 'INSTRUMENT';
}

// 根据教研室代码获取教研室名称
export function getFacultyNameByCode(code: string): string {
  const config = Object.values(FACULTY_CONFIG).find(f => f.code === code);
  return config?.name || code;
}
