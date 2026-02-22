// 学生分配验证服务 - 阶段二：唯一性验证机制

import { Student, Teacher } from '../types';

// 分配冲突类型
export enum ConflictType {
  PRIMARY_DISCIPLINE_UNIQUE = 'primary_discipline_unique',      // 主项专业唯一性冲突
  INSTRUMENT_UNIQUE = 'instrument_unique',                      // 器乐唯一性冲突
  TEACHER_CAPACITY = 'teacher_capacity',                        // 教师容量超限冲突
  TEACHER_INSTRUMENT_MISMATCH = 'teacher_instrument_mismatch',  // 教师乐器不匹配
  STUDENT_OVERLOAD = 'student_overload',                       // 学生负荷超限
  TIME_CONFLICT = 'time_conflict',                             // 时间冲突
  DUPLICATE_ASSIGNMENT = 'duplicate_assignment'                 // 重复分配
}

// 冲突严重程度
export enum ConflictSeverity {
  ERROR = 'error',       // 严重错误，无法执行
  WARNING = 'warning',   // 警告，需要确认
  INFO = 'info'         // 信息性提示
}

// 验证规则配置
export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: ConflictSeverity;
  customMessage?: string;
}

// 分配冲突结果
export interface AllocationConflict {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  message: string;
  description: string;
  studentId?: string;
  studentName?: string;
  teacherId?: string;
  teacherName?: string;
  instrument?: string;
  affectedAllocation?: any;
  suggestedResolution?: string;
  resolutionConfidence?: number;
}

// 验证结果
export interface ValidationResult {
  isValid: boolean;
  conflicts: AllocationConflict[];
  warnings: AllocationConflict[];
  suggestions: AllocationSuggestion[];
  canProceed: boolean;
}

// 分配建议
export interface AllocationSuggestion {
  id: string;
  type: 'auto_assign' | 'manual_resolve' | 'capacity_adjust' | 'teacher_switch';
  title: string;
  description: string;
  confidence: number; // 0-1
  action: () => void;
  priority: 'high' | 'medium' | 'low';
}

// 分配历史记录
export interface AllocationHistory {
  id: string;
  timestamp: Date;
  action: 'assign' | 'unassign' | 'modify' | 'bulk_assign' | 'bulk_unassign';
  studentId: string;
  studentName: string;
  fromTeacherId?: string;
  fromTeacherName?: string;
  toTeacherId?: string;
  toTeacherName?: string;
  subjectType: 'primary' | 'secondary1' | 'secondary2';
  instrument?: string;
  reason?: string;
  userId: string;
  userName: string;
  success: boolean;
  errors?: string[];
}

// 分配统计
export interface AllocationStats {
  totalAssignments: number;
  successfulAssignments: number;
  failedAssignments: number;
  conflictsResolved: number;
  mostRequestedInstruments: Array<{ instrument: string; count: number }>;
  teacherWorkload: Array<{ teacherId: string; teacherName: string; workload: number }>;
}

// 验证规则配置
const DEFAULT_VALIDATION_RULES: ValidationRule[] = [
  {
    id: 'primary_discipline_unique',
    name: '主项专业唯一性',
    description: '学生的主项专业只能分配给一个教师',
    enabled: true,
    severity: ConflictSeverity.ERROR,
    customMessage: '学生的主项专业已分配给其他教师'
  },
  {
    id: 'instrument_unique',
    name: '器乐唯一性',
    description: '学生不能重复学习同一种乐器',
    enabled: true,
    severity: ConflictSeverity.ERROR,
    customMessage: '学生已经在其他专业中学习该乐器'
  },
  {
    id: 'teacher_capacity',
    name: '教师容量检查',
    description: '检查教师的学生数量是否超过容量限制',
    enabled: true,
    severity: ConflictSeverity.WARNING,
    customMessage: '教师的学生数量已达到或超过容量限制'
  },
  {
    id: 'teacher_instrument_match',
    name: '教师乐器匹配',
    description: '检查教师是否具备教授该乐器的能力',
    enabled: true,
    severity: ConflictSeverity.ERROR,
    customMessage: '教师不具备教授该乐器的技能'
  },
  {
    id: 'student_overload',
    name: '学生负荷检查',
    description: '检查学生的专业数量是否合理',
    enabled: true,
    severity: ConflictSeverity.WARNING,
    customMessage: '学生的专业数量可能过多'
  }
];

export class AllocationValidationService {
  private validationRules: ValidationRule[] = [...DEFAULT_VALIDATION_RULES];
  private allocationHistory: AllocationHistory[] = [];
  private stats: AllocationStats = {
    totalAssignments: 0,
    successfulAssignments: 0,
    failedAssignments: 0,
    conflictsResolved: 0,
    mostRequestedInstruments: [],
    teacherWorkload: []
  };

  // 验证单个分配
  async validateAllocation(
    student: Student,
    teacherId: string | null,
    subjectType: 'primary' | 'secondary1' | 'secondary2',
    allStudents: Student[],
    allTeachers: Teacher[],
    isImport: boolean = false
  ): Promise<ValidationResult> {
    const conflicts: AllocationConflict[] = [];
    const warnings: AllocationConflict[] = [];
    const suggestions: AllocationSuggestion[] = [];

    // 获取教师信息
    const teacher = teacherId ? allTeachers.find(t => t.id === teacherId) : null;
    const targetInstrument = subjectType === 'primary' ? student.primary_instrument :
                           subjectType === 'secondary1' ? student.secondary_instrument1 :
                           student.secondary_instrument2;

    // 应用验证规则
    for (const rule of this.validationRules.filter(r => r.enabled)) {
      // 导入模式下跳过教师乐器匹配验证
      if (isImport && rule.id === 'teacher_instrument_match') {
        continue;
      }
      const conflict = await this.applyValidationRule(
        rule, student, teacher, subjectType, targetInstrument, allStudents, allTeachers
      );

      if (conflict) {
        if (conflict.severity === ConflictSeverity.ERROR) {
          conflicts.push(conflict);
        } else {
          warnings.push(conflict);
        }
      }
    }

    // 生成建议
    const generatedSuggestions = await this.generateSuggestions(
      student, teacher, subjectType, targetInstrument, conflicts, allTeachers
    );
    suggestions.push(...generatedSuggestions);

    const isValid = conflicts.length === 0;
    const canProceed = isValid || this.hasHighConfidenceSuggestion(suggestions);

    return {
      isValid,
      conflicts,
      warnings,
      suggestions,
      canProceed
    };
  }

  // 验证批量分配
  async validateBulkAllocation(
    allocations: Array<{
      studentId: string;
      teacherId: string | null;
      subjectType: 'primary' | 'secondary1' | 'secondary2';
    }>,
    allStudents: Student[],
    allTeachers: Teacher[]
  ): Promise<ValidationResult> {
    const allConflicts: AllocationConflict[] = [];
    const allWarnings: AllocationConflict[] = [];
    const allSuggestions: AllocationSuggestion[] = [];

    // 并行验证每个分配
    const validationPromises = allocations.map(async (allocation) => {
      const student = allStudents.find(s => s.id === allocation.studentId);
      if (!student) {
        return {
          conflicts: [{
            id: `student_not_found_${Date.now()}`,
            type: ConflictType.DUPLICATE_ASSIGNMENT,
            severity: ConflictSeverity.ERROR,
            message: '找不到指定的学生',
            description: `学生ID ${allocation.studentId} 不存在`,
            studentId: allocation.studentId
          }] as AllocationConflict[],
          warnings: [],
          suggestions: []
        };
      }

      return await this.validateAllocation(
        student,
        allocation.teacherId,
        allocation.subjectType,
        allStudents,
        allTeachers
      );
    });

    const results = await Promise.all(validationPromises);

    // 汇总结果
    results.forEach(result => {
      allConflicts.push(...result.conflicts);
      allWarnings.push(...result.warnings);
      allSuggestions.push(...result.suggestions);
    });

    // 检查跨学生冲突
    const crossStudentConflicts = this.detectCrossStudentConflicts(
      allocations, allStudents, allTeachers
    );
    allConflicts.push(...crossStudentConflicts);

    const isValid = allConflicts.length === 0;
    const canProceed = isValid;

    return {
      isValid,
      conflicts: allConflicts,
      warnings: allWarnings,
      suggestions: allSuggestions,
      canProceed
    };
  }

  // 应用单个验证规则
  private async applyValidationRule(
    rule: ValidationRule,
    student: Student,
    teacher: Teacher | null,
    subjectType: 'primary' | 'secondary1' | 'secondary2',
    instrument: string | undefined,
    allStudents: Student[],
    allTeachers: Teacher[]
  ): Promise<AllocationConflict | null> {
    switch (rule.id) {
      case 'primary_discipline_unique':
        return this.checkPrimaryDisciplineUnique(student, teacher, subjectType, rule);
      
      case 'instrument_unique':
        return this.checkInstrumentUnique(student, teacher, subjectType, instrument, rule);
      
      case 'teacher_capacity':
        return this.checkTeacherCapacity(student, teacher, subjectType, rule);
      
      case 'teacher_instrument_match':
        return this.checkTeacherInstrumentMatch(student, teacher, instrument, rule);
      
      case 'student_overload':
        return this.checkStudentOverload(student, subjectType, rule);
      
      default:
        return null;
    }
  }

  // 检查主项专业唯一性
  private checkPrimaryDisciplineUnique(
    student: Student,
    teacher: Teacher | null,
    subjectType: 'primary' | 'secondary1' | 'secondary2',
    rule: ValidationRule
  ): AllocationConflict | null {
    if (subjectType !== 'primary' || !teacher) return null;

    const existingPrimary = student.assigned_teachers.primary_teacher_id;
    if (existingPrimary && existingPrimary !== teacher.id) {
      const existingTeacher = student.assigned_teachers.primary_teacher_name;
      return {
        id: `primary_unique_${Date.now()}`,
        type: ConflictType.PRIMARY_DISCIPLINE_UNIQUE,
        severity: rule.severity,
        message: rule.customMessage || rule.description,
        description: `学生 ${student.name} 的主项专业 ${student.primary_instrument} 已经分配给 ${existingTeacher}`,
        studentId: student.id,
        studentName: student.name,
        teacherId: teacher.id,
        teacherName: teacher.name,
        instrument: student.primary_instrument,
        suggestedResolution: `替换当前分配给 ${existingTeacher} 的主项专业，或者为该学生添加副项专业`
      };
    }

    return null;
  }

  // 检查器乐唯一性
  private checkInstrumentUnique(
    student: Student,
    teacher: Teacher | null,
    subjectType: 'primary' | 'secondary1' | 'secondary2',
    instrument: string | undefined,
    rule: ValidationRule
  ): AllocationConflict | null {
    if (!instrument || !teacher) return null;

    // 检查是否在其他专业中已经学习同种乐器
    const existingInstruments = [
      student.primary_instrument,
      student.secondary_instrument1,
      student.secondary_instrument2
    ].filter(i => i && i !== instrument);

    if (existingInstruments.includes(instrument)) {
      return {
        id: `instrument_unique_${Date.now()}`,
        type: ConflictType.INSTRUMENT_UNIQUE,
        severity: rule.severity,
        message: rule.customMessage || rule.description,
        description: `学生 ${student.name} 已经在其他专业中学习 ${instrument}`,
        studentId: student.id,
        studentName: student.name,
        teacherId: teacher.id,
        teacherName: teacher.name,
        instrument: instrument,
        suggestedResolution: '选择不同的乐器类型，或者取消现有的该乐器分配'
      };
    }

    return null;
  }

  // 检查教师容量
  private checkTeacherCapacity(
    student: Student,
    teacher: Teacher | null,
    subjectType: 'primary' | 'secondary1' | 'secondary2',
    rule: ValidationRule
  ): AllocationConflict | null {
    if (!teacher) return null;

    // 模拟教师容量检查（实际项目中应该从数据库获取）
    const currentStudentCount = 12; // 模拟当前学生数
    const maxCapacity = 10; // 模拟最大容量

    if (currentStudentCount >= maxCapacity) {
      return {
        id: `capacity_${Date.now()}`,
        type: ConflictType.TEACHER_CAPACITY,
        severity: rule.severity,
        message: rule.customMessage || rule.description,
        description: `教师 ${teacher.name} 的学生数量 (${currentStudentCount}) 已达到容量上限 (${maxCapacity})`,
        studentId: student.id,
        studentName: student.name,
        teacherId: teacher.id,
        teacherName: teacher.name,
        suggestedResolution: `为该教师增加容量限制，或者重新分配部分学生给其他教师`
      };
    }

    return null;
  }

  // 检查教师乐器匹配
  private checkTeacherInstrumentMatch(
    student: Student,
    teacher: Teacher | null,
    instrument: string | undefined,
    rule: ValidationRule
  ): AllocationConflict | null {
    if (!teacher || !instrument) return null;

    // 改进的教师技能匹配逻辑
    const teacherInstruments = teacher.instruments || [];
    const teacherCapabilities = teacher.teaching_capabilities || [];
    
    // 首先检查 instruments 字段
    if (teacherInstruments.includes(instrument)) {
      return null; // 技能匹配成功
    }
    
    // 如果 instruments 字段为空，检查 teaching_capabilities
    const hasCapability = teacherCapabilities.some(cap => cap.instrument === instrument);
    if (hasCapability) {
      return null; // 能力匹配成功
    }
    
    // 如果两者都没有，检查教师教研室是否匹配（基于乐器分类的智能匹配）
    const instrumentFaculty = this.getInstrumentFaculty(instrument);
    const teacherFaculty = teacher.faculty_code;
    
    if (instrumentFaculty && teacherFaculty === instrumentFaculty) {
      return null; // 教研室匹配，认为有资格教授
    }
    
    // 最后都不匹配，返回错误
    return {
      id: `instrument_match_${Date.now()}`,
      type: ConflictType.TEACHER_INSTRUMENT_MISMATCH,
      severity: rule.severity,
      message: rule.customMessage || rule.description,
      description: `教师 ${teacher.name} 不具备教授 ${instrument} 的技能`,
      studentId: student.id,
      studentName: student.name,
      teacherId: teacher.id,
      teacherName: teacher.name,
      instrument: instrument,
      suggestedResolution: `选择具备 ${instrument} 教授能力的教师，或者为 ${teacher.name} 添加该乐器的教学能力`
    };
  }
  
  // 获取乐器所属教研室（与teacherValidation.ts中的逻辑保持一致）
  private getInstrumentFaculty(instrument: string): string | null {
    const INSTRUMENT_FACULTY_MAPPING: Record<string, string> = {
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
    
    return INSTRUMENT_FACULTY_MAPPING[instrument] || null;
  }

  // 检查学生负荷
  private checkStudentOverload(
    student: Student,
    subjectType: 'primary' | 'secondary1' | 'secondary2',
    rule: ValidationRule
  ): AllocationConflict | null {
    const existingSubjects = [
      student.assigned_teachers.primary_teacher_id ? 1 : 0,
      student.assigned_teachers.secondary1_teacher_id ? 1 : 0,
      student.assigned_teachers.secondary2_teacher_id ? 1 : 0
    ].reduce((sum, count) => sum + count, 0);

    // 建议最多3个专业
    if (existingSubjects >= 3) {
      return {
        id: `overload_${Date.now()}`,
        type: ConflictType.STUDENT_OVERLOAD,
        severity: rule.severity,
        message: rule.customMessage || rule.description,
        description: `学生 ${student.name} 的专业数量 (${existingSubjects}) 可能过多`,
        studentId: student.id,
        studentName: student.name,
        suggestedResolution: '考虑减少专业数量，或者将某些专业设置为选修'
      };
    }

    return null;
  }

  // 检测跨学生冲突
  private detectCrossStudentConflicts(
    allocations: Array<{
      studentId: string;
      teacherId: string | null;
      subjectType: 'primary' | 'secondary1' | 'secondary2';
    }>,
    allStudents: Student[],
    allTeachers: Teacher[]
  ): AllocationConflict[] {
    const conflicts: AllocationConflict[] = [];
    
    // 检查重复分配
    const assignmentKey = (studentId: string, teacherId: string, subjectType: string) => 
      `${studentId}_${teacherId}_${subjectType}`;
    
    const assignmentMap = new Map<string, number>();
    
    allocations.forEach(allocation => {
      if (allocation.teacherId) {
        const key = assignmentKey(allocation.studentId, allocation.teacherId, allocation.subjectType);
        assignmentMap.set(key, (assignmentMap.get(key) || 0) + 1);
      }
    });

    assignmentMap.forEach((count, key) => {
      if (count > 1) {
        const [studentId, teacherId, subjectType] = key.split('_');
        const student = allStudents.find(s => s.id === studentId);
        const teacher = allTeachers.find(t => t.id === teacherId);
        
        if (student && teacher) {
          conflicts.push({
            id: `duplicate_${Date.now()}`,
            type: ConflictType.DUPLICATE_ASSIGNMENT,
            severity: ConflictSeverity.ERROR,
            message: '发现重复的分配',
            description: `学生 ${student.name} 对教师 ${teacher.name} 的${subjectType === 'primary' ? '主项' : subjectType === 'secondary1' ? '副项1' : '副项2'}专业分配重复`,
            studentId: student.id,
            studentName: student.name,
            teacherId: teacher.id,
            teacherName: teacher.name,
            instrument: subjectType === 'primary' ? student.primary_instrument :
                       subjectType === 'secondary1' ? student.secondary_instrument1 :
                       student.secondary_instrument2,
            suggestedResolution: '移除重复的分配，保留一个有效的分配'
          });
        }
      }
    });

    return conflicts;
  }

  // 生成建议
  private async generateSuggestions(
    student: Student,
    teacher: Teacher | null,
    subjectType: 'primary' | 'secondary1' | 'secondary2',
    instrument: string | undefined,
    conflicts: AllocationConflict[],
    allTeachers: Teacher[]
  ): Promise<AllocationSuggestion[]> {
    const suggestions: AllocationSuggestion[] = [];

    // 如果有教师容量冲突，建议其他教师
    const capacityConflict = conflicts.find(c => c.type === ConflictType.TEACHER_CAPACITY);
    if (capacityConflict && instrument) {
      const alternativeTeachers = allTeachers.filter(t => 
        t.instruments.includes(instrument) && t.id !== teacher?.id
      );

      if (alternativeTeachers.length > 0) {
        const bestAlternative = alternativeTeachers[0];
        suggestions.push({
          id: `teacher_switch_${Date.now()}`,
          type: 'teacher_switch',
          title: `切换到 ${bestAlternative.name}`,
          description: `建议将学生 ${student.name} 分配给 ${bestAlternative.name}，该教师具备 ${instrument} 教学能力且有剩余容量`,
          confidence: 0.8,
          action: () => {
            // 这里可以实现自动切换逻辑
            console.log(`建议切换到 ${bestAlternative.name}`);
          },
          priority: 'high'
        });
      }
    }

    // 如果有乐器冲突，建议不同的乐器
    const instrumentConflict = conflicts.find(c => c.type === ConflictType.INSTRUMENT_UNIQUE);
    if (instrumentConflict && teacher) {
      const availableInstruments = teacher.instruments.filter(i => 
        ![
          student.primary_instrument,
          student.secondary_instrument1,
          student.secondary_instrument2
        ].includes(i)
      );

      if (availableInstruments.length > 0) {
        suggestions.push({
          id: `instrument_change_${Date.now()}`,
          type: 'auto_assign',
          title: `选择其他乐器`,
          description: `教师 ${teacher.name} 还可以教授 ${availableInstruments.join('、')}，建议选择其中一个`,
          confidence: 0.7,
          action: () => {
            console.log('建议选择其他乐器');
          },
          priority: 'medium'
        });
      }
    }

    return suggestions;
  }

  // 检查是否有高置信度建议
  private hasHighConfidenceSuggestion(suggestions: AllocationSuggestion[]): boolean {
    return suggestions.some(s => s.confidence >= 0.8);
  }

  // 记录分配历史
  recordAllocationHistory(history: AllocationHistory): void {
    this.allocationHistory.push(history);
    this.updateStats(history);
  }

  // 获取分配历史
  getAllocationHistory(filters?: {
    studentId?: string;
    teacherId?: string;
    dateRange?: { start: Date; end: Date };
    action?: 'assign' | 'unassign' | 'modify';
  }): AllocationHistory[] {
    let filtered = [...this.allocationHistory];

    if (filters?.studentId) {
      filtered = filtered.filter(h => h.studentId === filters.studentId);
    }

    if (filters?.teacherId) {
      filtered = filtered.filter(h => 
        h.fromTeacherId === filters.teacherId || h.toTeacherId === filters.teacherId
      );
    }

    if (filters?.action) {
      filtered = filtered.filter(h => h.action === filters.action);
    }

    if (filters?.dateRange) {
      filtered = filtered.filter(h => 
        h.timestamp >= filters.dateRange!.start && h.timestamp <= filters.dateRange!.end
      );
    }

    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // 获取分配统计
  getAllocationStats(): AllocationStats {
    return { ...this.stats };
  }

  // 更新统计数据
  private updateStats(history: AllocationHistory): void {
    this.stats.totalAssignments++;
    if (history.success) {
      this.stats.successfulAssignments++;
    } else {
      this.stats.failedAssignments++;
    }

    // 更新乐器请求统计
    if (history.instrument) {
      const existing = this.stats.mostRequestedInstruments.find(
        item => item.instrument === history.instrument
      );
      if (existing) {
        existing.count++;
      } else {
        this.stats.mostRequestedInstruments.push({
          instrument: history.instrument,
          count: 1
        });
      }
    }

    // 更新教师工作量
    if (history.toTeacherId && history.success) {
      const existing = this.stats.teacherWorkload.find(
        item => item.teacherId === history.toTeacherId
      );
      if (existing) {
        existing.workload++;
      } else {
        this.stats.teacherWorkload.push({
          teacherId: history.toTeacherId,
          teacherName: history.toTeacherName || 'Unknown',
          workload: 1
        });
      }
    }
  }

  // 获取验证规则
  getValidationRules(): ValidationRule[] {
    return [...this.validationRules];
  }

  // 更新验证规则
  updateValidationRule(ruleId: string, updates: Partial<ValidationRule>): void {
    const index = this.validationRules.findIndex(r => r.id === ruleId);
    if (index !== -1) {
      this.validationRules[index] = { ...this.validationRules[index], ...updates };
    }
  }

  // 重置验证规则
  resetValidationRules(): void {
    this.validationRules = [...DEFAULT_VALIDATION_RULES];
  }
}

// 导出单例实例
export const allocationValidationService = new AllocationValidationService();
