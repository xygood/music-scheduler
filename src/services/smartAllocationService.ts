// 智能分配服务 - 阶段三：智能匹配算法优化

import { Student, Teacher } from '../types';
import { 
  allocationValidationService, 
  ValidationResult, 
  AllocationConflict,
  ConflictType 
} from './allocationValidationService';

// 匹配质量评分
export interface MatchQualityScore {
  overall: number; // 总体匹配度 (0-100)
  teacherCapability: number; // 教师能力匹配度 (0-100)
  workloadBalance: number; // 工作量平衡度 (0-100)
  studentPreference: number; // 学生偏好匹配度 (0-100)
  instrumentSpecialization: number; // 乐器专业度 (0-100)
  availability: number; // 可用性 (0-100)
  conflicts: number; // 冲突程度 (0-100，越低越好)
}

// 智能分配结果
export interface SmartAllocationResult {
  studentId: string;
  teacherId: string | null;
  subjectType: 'primary' | 'secondary1' | 'secondary2';
  confidence: number; // 匹配置信度 (0-1)
  qualityScore: MatchQualityScore;
  reasons: string[]; // 匹配理由
  alternatives: Array<{
    teacherId: string;
    confidence: number;
    qualityScore: MatchQualityScore;
    reason: string;
  }>;
  conflicts: AllocationConflict[];
  warnings: string[];
}

// 批量智能分配结果
export interface BulkSmartAllocationResult {
  totalStudents: number;
  successfullyAllocated: number;
  failedAllocations: number;
  conflictsResolved: number;
  averageConfidence: number;
  qualityDistribution: {
    excellent: number; // 90-100分
    good: number; // 80-89分
    fair: number; // 70-79分
    poor: number; // 60-69分
    unacceptable: number; // <60分
  };
  results: SmartAllocationResult[];
  recommendations: string[];
}

// 分配偏好设置
export interface AllocationPreferences {
  studentId: string;
  preferredTeachers: string[]; // 偏好教师ID列表
  avoidTeachers: string[]; // 避免的教师ID列表
  preferredInstruments: string[]; // 偏好乐器
  maxTravelTime?: number; // 最大通勤时间
  timePreferences?: {
    morning: number; // 早上时段偏好 (0-1)
    afternoon: number; // 下午时段偏好 (0-1)
    evening: number; // 晚上时段偏好 (0-1)
  };
  groupPreference?: 'individual' | 'small_group' | 'large_group'; // 小组课偏好
}

// 教师专长信息
export interface TeacherSpecialization {
  primaryInstruments: string[]; // 主要擅长乐器
  secondaryInstruments: string[]; // 次要擅长乐器
  teachingStyle: 'traditional' | 'modern' | 'mixed'; // 教学风格
  experience: {
    years: number; // 教学年限
    levels: string[]; // 教学水平 (初级、中级、高级)
  };
  effectiveness: {
    studentSatisfaction: number; // 学生满意度 (0-1)
    completionRate: number; // 完成率 (0-1)
    improvementRate: number; // 进步率 (0-1)
  };
}

// 智能匹配引擎配置
export interface SmartMatchingConfig {
  weights: {
    teacherCapability: number; // 教师能力权重
    workloadBalance: number; // 工作量平衡权重
    studentPreference: number; // 学生偏好权重
    instrumentSpecialization: number; // 乐器专业度权重
    availability: number; // 可用性权重
    conflicts: number; // 冲突惩罚权重
  };
  thresholds: {
    minimumConfidence: number; // 最低置信度要求
    acceptableQuality: number; // 可接受的最低质量分数
    maxWorkloadImbalance: number; // 最大工作量不平衡度
  };
  learning: {
    enabled: boolean; // 是否启用学习功能
    feedbackWeight: number; // 反馈权重
    adaptationRate: number; // 适应率
  };
}

export class SmartAllocationService {
  private config: SmartMatchingConfig;
  private allocationHistory: Array<{
    studentId: string;
    teacherId: string;
    success: boolean;
    feedback?: number; // 用户反馈 (-1 到 1)
    timestamp: Date;
  }> = [];

  constructor(config?: Partial<SmartMatchingConfig>) {
    this.config = {
      weights: {
        teacherCapability: 0.25,
        workloadBalance: 0.20,
        studentPreference: 0.20,
        instrumentSpecialization: 0.15,
        availability: 0.10,
        conflicts: 0.10
      },
      thresholds: {
        minimumConfidence: 0.6,
        acceptableQuality: 70,
        maxWorkloadImbalance: 0.3
      },
      learning: {
        enabled: true,
        feedbackWeight: 0.3,
        adaptationRate: 0.1
      },
      ...config
    };
  }

  // 智能分配单个学生
  async smartAllocateStudent(
    student: Student,
    allStudents: Student[],
    allTeachers: Teacher[],
    preferences?: AllocationPreferences
  ): Promise<SmartAllocationResult> {
    
    // 获取所有可能的教师匹配
    const teacherMatches = await this.findTeacherMatches(
      student, allTeachers, preferences
    );

    // 计算每个匹配的详细质量评分
    const detailedScores = await Promise.all(
      teacherMatches.map(match => this.calculateMatchQuality(
        student, match.teacher, allStudents, preferences
      ))
    );

    // 应用验证检查
    const validatedScores = await Promise.all(
      detailedScores.map(async (score) => {
        const validationResult = await allocationValidationService.validateAllocation(
          student,
          score.teacher.id,
          'primary', // 这里应该根据具体需要调整
          allStudents,
          allTeachers
        );

        return {
          ...score,
          conflicts: validationResult.conflicts,
          warnings: validationResult.warnings
        };
      })
    );

    // 排序并选择最佳匹配
    const sortedMatches = validatedScores
      .sort((a, b) => b.qualityScore.overall - a.qualityScore.overall);

    const bestMatch = sortedMatches[0];
    
    // 生成替代方案
    const alternatives = sortedMatches.slice(1, 4).map(match => ({
      teacherId: match.teacher.id,
      confidence: match.confidence,
      qualityScore: match.qualityScore,
      reason: this.generateMatchReason(match)
    }));

    return {
      studentId: student.id,
      teacherId: bestMatch?.teacher.id || null,
      subjectType: 'primary',
      confidence: bestMatch?.confidence || 0,
      qualityScore: bestMatch?.qualityScore || this.createEmptyQualityScore(),
      reasons: bestMatch ? this.generateMatchReason(bestMatch) : ['没有找到合适的教师'],
      alternatives,
      conflicts: bestMatch?.conflicts || [],
      warnings: bestMatch?.warnings || []
    };
  }

  // 批量智能分配
  async bulkSmartAllocate(
    students: Student[],
    allTeachers: Teacher[],
    preferencesMap?: Map<string, AllocationPreferences>
  ): Promise<BulkSmartAllocationResult> {
    
    const results: SmartAllocationResult[] = [];
    const recommendations: string[] = [];
    
    // 按优先级排序学生（未分配的学生优先）
    const sortedStudents = [...students].sort((a, b) => {
      const aAssigned = this.hasTeacherAssigned(a);
      const bAssigned = this.hasTeacherAssigned(b);
      if (aAssigned && !bAssigned) return 1;
      if (!aAssigned && bAssigned) return -1;
      return 0;
    });

    // 并行处理学生分配（但限制并发数）
    const batchSize = 5;
    for (let i = 0; i < sortedStudents.length; i += batchSize) {
      const batch = sortedStudents.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (student) => {
        const preferences = preferencesMap?.get(student.id);
        return await this.smartAllocateStudent(student, students, allTeachers, preferences);
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    // 分析结果并生成建议
    const analysis = this.analyzeAllocationResults(results);
    recommendations.push(...analysis.recommendations);

    return {
      totalStudents: students.length,
      successfullyAllocated: results.filter(r => r.teacherId).length,
      failedAllocations: results.filter(r => !r.teacherId).length,
      conflictsResolved: results.filter(r => r.conflicts.length === 0).length,
      averageConfidence: results.reduce((sum, r) => sum + r.confidence, 0) / results.length,
      qualityDistribution: analysis.qualityDistribution,
      results,
      recommendations
    };
  }

  // 寻找教师匹配
  private async findTeacherMatches(
    student: Student,
    allTeachers: Teacher[],
    preferences?: AllocationPreferences
  ): Promise<Array<{ teacher: Teacher; baseScore: number }>> {
    
    const matches = allTeachers.map(teacher => {
      let baseScore = 0;

      // 基础匹配：乐器能力
      if (teacher.instruments.includes(student.primary_instrument)) {
        baseScore += 50;
      }

      // 偏好匹配
      if (preferences?.preferredTeachers.includes(teacher.id)) {
        baseScore += 30;
      }

      // 避免匹配
      if (preferences?.avoidTeachers.includes(teacher.id)) {
        baseScore -= 50;
      }

      // 工作量考虑
      const currentWorkload = this.calculateTeacherWorkload(teacher, []);
      if (currentWorkload < 8) {
        baseScore += 20; // 奖励有可用容量的教师
      } else if (currentWorkload >= 12) {
        baseScore -= 30; // 惩罚工作过重的教师
      }

      return { teacher, baseScore: Math.max(0, baseScore) };
    });

    // 只返回有正向匹配分数的教师
    return matches.filter(match => match.baseScore > 0);
  }

  // 计算匹配质量评分
  private async calculateMatchQuality(
    student: Student,
    teacher: Teacher,
    allStudents: Student[],
    preferences?: AllocationPreferences
  ): Promise<{
    teacher: Teacher;
    confidence: number;
    qualityScore: MatchQualityScore;
  }> {
    
    // 1. 教师能力匹配度
    const teacherCapability = this.calculateTeacherCapability(teacher, student);
    
    // 2. 工作量平衡度
    const workloadBalance = this.calculateWorkloadBalance(teacher, allStudents);
    
    // 3. 学生偏好匹配度
    const studentPreference = this.calculateStudentPreference(teacher, preferences);
    
    // 4. 乐器专业度
    const instrumentSpecialization = this.calculateInstrumentSpecialization(teacher, student);
    
    // 5. 可用性
    const availability = this.calculateAvailability(teacher);
    
    // 6. 冲突程度
    const conflicts = await this.calculateConflictLevel(student, teacher);
    
    // 计算综合评分
    const overall = (
      teacherCapability * this.config.weights.teacherCapability +
      workloadBalance * this.config.weights.workloadBalance +
      studentPreference * this.config.weights.studentPreference +
      instrumentSpecialization * this.config.weights.instrumentSpecialization +
      availability * this.config.weights.availability +
      (100 - conflicts) * this.config.weights.conflicts
    );

    const qualityScore: MatchQualityScore = {
      overall: Math.round(overall),
      teacherCapability: Math.round(teacherCapability),
      workloadBalance: Math.round(workloadBalance),
      studentPreference: Math.round(studentPreference),
      instrumentSpecialization: Math.round(instrumentSpecialization),
      availability: Math.round(availability),
      conflicts: Math.round(conflicts)
    };

    // 计算置信度（基于质量分数）
    const confidence = Math.min(1, qualityScore.overall / 100);

    return {
      teacher,
      confidence,
      qualityScore
    };
  }

  // 计算教师能力匹配度
  private calculateTeacherCapability(teacher: Teacher, student: Student): number {
    let score = 0;
    
    // 基础乐器匹配
    if (teacher.instruments.includes(student.primary_instrument)) {
      score += 60;
    }
    
    // 副项匹配
    if (student.secondary_instrument1 && teacher.instruments.includes(student.secondary_instrument1)) {
      score += 20;
    }
    
    if (student.secondary_instrument2 && teacher.instruments.includes(student.secondary_instrument2)) {
      score += 20;
    }
    
    return Math.min(100, score);
  }

  // 计算工作量平衡度
  private calculateWorkloadBalance(teacher: Teacher, allStudents: Student[]): number {
    const currentStudents = allStudents.filter(s => 
      s.assigned_teacher_id === teacher.id ||
      s.assigned_teachers.primary_teacher_id === teacher.id ||
      s.assigned_teachers.secondary1_teacher_id === teacher.id ||
      s.assigned_teachers.secondary2_teacher_id === teacher.id
    ).length;
    
    // 理想负载范围：6-10个学生
    const idealMin = 6;
    const idealMax = 10;
    
    if (currentStudents < idealMin) {
      return 100; // 新教师或负载不足，给予满分数
    } else if (currentStudents <= idealMax) {
      return 90; // 理想负载
    } else if (currentStudents <= idealMax + 2) {
      return 70; // 轻微超载
    } else {
      return 30; // 严重超载
    }
  }

  // 计算学生偏好匹配度
  private calculateStudentPreference(teacher: Teacher, preferences?: AllocationPreferences): number {
    if (!preferences) return 50; // 无偏好信息时的默认分数
    
    let score = 50; // 基础分数
    
    if (preferences.preferredTeachers.includes(teacher.id)) {
      score += 40;
    }
    
    if (preferences.avoidTeachers.includes(teacher.id)) {
      score -= 50;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  // 计算乐器专业度
  private calculateInstrumentSpecialization(teacher: Teacher, student: Student): number {
    // 这里可以实现更复杂的专业度计算逻辑
    // 比如根据教师的教育背景、教学经验等
    return teacher.instruments.includes(student.primary_instrument) ? 85 : 20;
  }

  // 计算可用性
  private calculateAvailability(teacher: Teacher): number {
    // 模拟可用性计算（实际项目中可能需要查询教师的日程表）
    return Math.random() > 0.3 ? 80 : 40;
  }

  // 计算冲突程度
  private async calculateConflictLevel(student: Student, teacher: Teacher): Promise<number> {
    // 这里可以调用验证服务来检查潜在冲突
    // 现在简化处理，返回随机值
    return Math.random() * 20; // 0-20的冲突程度
  }

  // 计算教师工作量
  private calculateTeacherWorkload(teacher: Teacher, students: Student[]): number {
    return students.filter(s => s.assigned_teacher_id === teacher.id).length;
  }

  // 检查学生是否已有教师分配
  private hasTeacherAssigned(student: Student): boolean {
    return !!(
      student.assigned_teacher_id ||
      student.assigned_teachers.primary_teacher_id ||
      student.assigned_teachers.secondary1_teacher_id ||
      student.assigned_teachers.secondary2_teacher_id
    );
  }

  // 分析分配结果
  private analyzeAllocationResults(results: SmartAllocationResult[]) {
    const qualityDistribution = {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0,
      unacceptable: 0
    };

    results.forEach(result => {
      const score = result.qualityScore.overall;
      if (score >= 90) qualityDistribution.excellent++;
      else if (score >= 80) qualityDistribution.good++;
      else if (score >= 70) qualityDistribution.fair++;
      else if (score >= 60) qualityDistribution.poor++;
      else qualityDistribution.unacceptable++;
    });

    const recommendations: string[] = [];
    
    if (qualityDistribution.unacceptable > 0) {
      recommendations.push(`有${qualityDistribution.unacceptable}个分配质量不理想，建议人工审查`);
    }
    
    if (qualityDistribution.excellent < results.length * 0.3) {
      recommendations.push('高质量分配比例较低，建议调整匹配算法权重');
    }

    return { qualityDistribution, recommendations };
  }

  // 生成匹配理由
  private generateMatchReason(match: any): string[] {
    const reasons: string[] = [];
    
    if (match.qualityScore.teacherCapability > 80) {
      reasons.push('教师具备优秀的专业能力');
    }
    
    if (match.qualityScore.workloadBalance > 80) {
      reasons.push('教师工作量适中，能提供充分关注');
    }
    
    if (match.qualityScore.studentPreference > 70) {
      reasons.push('符合学生偏好设置');
    }
    
    if (match.confidence > 0.8) {
      reasons.push('匹配置信度很高');
    }
    
    return reasons.length > 0 ? reasons : ['基础匹配'];
  }

  // 创建空质量评分
  private createEmptyQualityScore(): MatchQualityScore {
    return {
      overall: 0,
      teacherCapability: 0,
      workloadBalance: 0,
      studentPreference: 0,
      instrumentSpecialization: 0,
      availability: 0,
      conflicts: 100
    };
  }

  // 获取配置
  getConfig(): SmartMatchingConfig {
    return { ...this.config };
  }

  // 更新配置
  updateConfig(newConfig: Partial<SmartMatchingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // 记录反馈（用于机器学习）
  recordFeedback(studentId: string, teacherId: string, feedback: number): void {
    if (!this.config.learning.enabled) return;
    
    this.allocationHistory.push({
      studentId,
      teacherId,
      success: feedback > 0,
      feedback,
      timestamp: new Date()
    });
    
    // 简单的学习逻辑：调整偏好权重
    if (feedback > 0.5) {
      // 正面反馈：略微增加这种匹配模式的权重
      this.adaptWeights(studentId, teacherId, 0.1);
    } else if (feedback < -0.5) {
      // 负面反馈：略微减少这种匹配模式的权重
      this.adaptWeights(studentId, teacherId, -0.1);
    }
  }

  // 调整权重（简单的学习算法）
  private adaptWeights(studentId: string, teacherId: string, delta: number): void {
    // 这里可以实现更复杂的学习算法
    // 现在简化处理：略微调整学生偏好权重
    this.config.weights.studentPreference = Math.max(0.1, 
      Math.min(0.5, this.config.weights.studentPreference + delta * this.config.learning.adaptationRate)
    );
  }
}

// 导出单例实例
export const smartAllocationService = new SmartAllocationService();
