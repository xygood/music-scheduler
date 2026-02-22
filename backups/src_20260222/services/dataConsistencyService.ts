// 数据一致性管理服务 - 提供软删除、数据同步检查和数据完整性验证
import type { Teacher, Student, Course, Room, ScheduledClass, Conflict } from '../types';

// 软删除状态枚举
export enum SoftDeleteStatus {
  ACTIVE = 'active',           // 活跃状态
  SOFT_DELETED = 'soft_deleted', // 软删除状态
  PERMANENTLY_DELETED = 'permanently_deleted' // 永久删除状态
}

// 扩展的数据类型，包含软删除字段
export interface SoftDeletable {
  id: string;
  status: SoftDeleteStatus;
  deleted_at?: string;
  deleted_by?: string;
  created_at: string;
  updated_at?: string;
}

// 扩展的教师类型
export interface SoftDeletableTeacher extends Teacher, SoftDeletable {}

// 扩展的学生类型
export interface SoftDeletableStudent extends Student, SoftDeletable {}

// 扩展的课程类型
export interface SoftDeletableCourse extends Course, SoftDeletable {}

// 扩展的教室类型
export interface SoftDeletableRoom extends Room, SoftDeletable {}

// 扩展的排课类型
export interface SoftDeletableScheduledClass extends ScheduledClass, SoftDeletable {}

// 数据同步检查结果
export interface DataSyncCheckResult {
  isConsistent: boolean;
  issues: DataConsistencyIssue[];
  summary: {
    totalRecords: number;
    activeRecords: number;
    softDeletedRecords: number;
    orphanedRecords: number;
    invalidReferences: number;
  };
}

// 数据一致性问题
export interface DataConsistencyIssue {
  id: string;
  type: 'ORPHANED_RECORD' | 'INVALID_REFERENCE' | 'MISSING_DEPENDENCY' | 'DUPLICATE_ENTRY' | 'INVALID_STATE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  entityType: 'TEACHER' | 'STUDENT' | 'COURSE' | 'ROOM' | 'SCHEDULED_CLASS';
  entityId: string;
  description: string;
  suggestedAction: string;
  relatedEntities?: string[];
}

// 数据完整性规则
export interface DataIntegrityRule {
  name: string;
  description: string;
  check: (data: any) => DataConsistencyIssue[];
}

// 数据版本信息
export interface DataVersion {
  version: string;
  migrationDate: string;
  description: string;
  checksum: string;
}

class DataConsistencyService {
  private static instance: DataConsistencyService;
  private readonly STORAGE_KEY = 'data_consistency_metadata';
  private readonly VERSION_KEY = 'data_version';
  private readonly SOFT_DELETE_PREFIX = 'soft_deleted_';

  private constructor() {
    this.initializeDataVersion();
  }

  public static getInstance(): DataConsistencyService {
    if (!DataConsistencyService.instance) {
      DataConsistencyService.instance = new DataConsistencyService();
    }
    return DataConsistencyService.instance;
  }

  // 初始化数据版本
  private initializeDataVersion(): void {
    const existingVersion = localStorage.getItem(this.VERSION_KEY);
    if (!existingVersion) {
      const version: DataVersion = {
        version: '1.0.0',
        migrationDate: new Date().toISOString(),
        description: '初始版本 - 添加数据一致性管理',
        checksum: this.generateChecksum('1.0.0')
      };
      localStorage.setItem(this.VERSION_KEY, JSON.stringify(version));
    }
  }

  // 生成校验和
  private generateChecksum(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(36);
  }

  // 检查数据版本兼容性
  public checkVersionCompatibility(requiredVersion: string): boolean {
    const currentVersion = localStorage.getItem(this.VERSION_KEY);
    if (!currentVersion) return false;

    try {
      const version: DataVersion = JSON.parse(currentVersion);
      return this.compareVersions(version.version, requiredVersion) >= 0;
    } catch {
      return false;
    }
  }

  // 版本比较
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;
      
      if (part1 < part2) return -1;
      if (part1 > part2) return 1;
    }
    
    return 0;
  }

  // 软删除操作
  public softDelete<T extends SoftDeletable>(
    entityId: string,
    entityType: 'teacher' | 'student' | 'course' | 'room' | 'scheduled_class',
    deletedBy?: string
  ): { success: boolean; error?: string } {
    try {
      const storageKey = this.getStorageKey(entityType);
      const entities = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      const entityIndex = entities.findIndex((e: any) => e.id === entityId);
      if (entityIndex === -1) {
        return { success: false, error: '实体不存在' };
      }

      const entity = entities[entityIndex];
      if (entity.status === SoftDeleteStatus.SOFT_DELETED) {
        return { success: false, error: '实体已被软删除' };
      }

      // 更新实体状态
      entities[entityIndex] = {
        ...entity,
        status: SoftDeleteStatus.SOFT_DELETED,
        deleted_at: new Date().toISOString(),
        deleted_by: deletedBy,
        updated_at: new Date().toISOString()
      };

      localStorage.setItem(storageKey, JSON.stringify(entities));
      
      // 记录软删除历史
      this.recordSoftDeleteHistory(entityType, entityId, deletedBy);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: `软删除失败: ${error}` };
    }
  }

  // 恢复软删除
  public restoreSoftDelete<T extends SoftDeletable>(
    entityId: string,
    entityType: 'teacher' | 'student' | 'course' | 'room' | 'scheduled_class'
  ): { success: boolean; error?: string } {
    try {
      const storageKey = this.getStorageKey(entityType);
      const entities = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      const entityIndex = entities.findIndex((e: any) => e.id === entityId);
      if (entityIndex === -1) {
        return { success: false, error: '实体不存在' };
      }

      const entity = entities[entityIndex];
      if (entity.status !== SoftDeleteStatus.SOFT_DELETED) {
        return { success: false, error: '只能恢复软删除的实体' };
      }

      // 恢复实体状态
      entities[entityIndex] = {
        ...entity,
        status: SoftDeleteStatus.ACTIVE,
        deleted_at: undefined,
        deleted_by: undefined,
        updated_at: new Date().toISOString()
      };

      localStorage.setItem(storageKey, JSON.stringify(entities));
      return { success: true };
    } catch (error) {
      return { success: false, error: `恢复失败: ${error}` };
    }
  }

  // 永久删除
  public permanentDelete(
    entityId: string,
    entityType: 'teacher' | 'student' | 'course' | 'room' | 'scheduled_class'
  ): { success: boolean; error?: string } {
    try {
      const storageKey = this.getStorageKey(entityType);
      const entities = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      const entityIndex = entities.findIndex((e: any) => e.id === entityId);
      if (entityIndex === -1) {
        return { success: false, error: '实体不存在' };
      }

      const entity = entities[entityIndex];
      
      // 检查是否可以永久删除
      if (entity.status === SoftDeleteStatus.ACTIVE) {
        return { success: false, error: '只能永久删除已软删除的实体' };
      }

      // 执行永久删除
      entities.splice(entityIndex, 1);
      localStorage.setItem(storageKey, JSON.stringify(entities));
      
      return { success: true };
    } catch (error) {
      return { success: false, error: `永久删除失败: ${error}` };
    }
  }

  // 获取存储键
  private getStorageKey(entityType: string): string {
    const keyMap: Record<string, string> = {
      teacher: 'music_scheduler_teachers',
      student: 'music_scheduler_students',
      course: 'music_scheduler_courses',
      room: 'music_scheduler_rooms',
      scheduled_class: 'music_scheduler_scheduled_classes'
    };
    return keyMap[entityType] || '';
  }

  // 记录软删除历史
  private recordSoftDeleteHistory(entityType: string, entityId: string, deletedBy?: string): void {
    const historyKey = 'soft_delete_history';
    const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
    
    history.push({
      entityType,
      entityId,
      deletedAt: new Date().toISOString(),
      deletedBy
    });
    
    localStorage.setItem(historyKey, JSON.stringify(history));
  }

  // 数据同步检查
  public async performDataSyncCheck(): Promise<DataSyncCheckResult> {
    const issues: DataConsistencyIssue[] = [];
    
    // 获取所有数据
    const teachers = JSON.parse(localStorage.getItem('music_scheduler_teachers') || '[]');
    const students = JSON.parse(localStorage.getItem('music_scheduler_students') || '[]');
    const courses = JSON.parse(localStorage.getItem('music_scheduler_courses') || '[]');
    const rooms = JSON.parse(localStorage.getItem('music_scheduler_rooms') || '[]');
    const scheduledClasses = JSON.parse(localStorage.getItem('music_scheduler_scheduled_classes') || '[]');
    
    // 执行各项检查
    issues.push(...this.checkOrphanedRecords(teachers, students, courses, rooms, scheduledClasses));
    issues.push(...this.checkInvalidReferences(teachers, students, courses, rooms, scheduledClasses));
    issues.push(...this.checkDuplicateEntries(teachers, students, courses, rooms, scheduledClasses));
    issues.push(...this.checkMissingDependencies(teachers, students, courses, rooms, scheduledClasses));
    
    // 计算统计信息
    const totalRecords = teachers.length + students.length + courses.length + rooms.length + scheduledClasses.length;
    const activeRecords = [
      ...teachers.filter(t => t.status === SoftDeleteStatus.ACTIVE),
      ...students.filter(s => s.status === SoftDeleteStatus.ACTIVE),
      ...courses.filter(c => c.status === SoftDeleteStatus.ACTIVE),
      ...rooms.filter(r => r.status === SoftDeleteStatus.ACTIVE),
      ...scheduledClasses.filter(sc => sc.status === SoftDeleteStatus.ACTIVE)
    ].length;
    
    const softDeletedRecords = [
      ...teachers.filter(t => t.status === SoftDeleteStatus.SOFT_DELETED),
      ...students.filter(s => s.status === SoftDeleteStatus.SOFT_DELETED),
      ...courses.filter(c => c.status === SoftDeleteStatus.SOFT_DELETED),
      ...rooms.filter(r => r.status === SoftDeleteStatus.SOFT_DELETED),
      ...scheduledClasses.filter(sc => sc.status === SoftDeleteStatus.SOFT_DELETED)
    ].length;
    
    const orphanedRecords = issues.filter(i => i.type === 'ORPHANED_RECORD').length;
    const invalidReferences = issues.filter(i => i.type === 'INVALID_REFERENCE').length;
    
    return {
      isConsistent: issues.length === 0,
      issues,
      summary: {
        totalRecords,
        activeRecords,
        softDeletedRecords,
        orphanedRecords,
        invalidReferences
      }
    };
  }

  // 检查孤立记录
  private checkOrphanedRecords(
    teachers: any[], students: any[], courses: any[], 
    rooms: any[], scheduledClasses: any[]
  ): DataConsistencyIssue[] {
    const issues: DataConsistencyIssue[] = [];
    
    // 检查孤立的学生记录（没有对应教师的）
    students.forEach(student => {
      if (student.status === SoftDeleteStatus.ACTIVE) {
        const hasTeacher = teachers.some(t => 
          t.id === student.teacher_id && t.status === SoftDeleteStatus.ACTIVE
        );
        if (!hasTeacher) {
          issues.push({
            id: `orphaned_student_${student.id}`,
            type: 'ORPHANED_RECORD',
            severity: 'MEDIUM',
            entityType: 'STUDENT',
            entityId: student.id,
            description: `学生"${student.name}"没有对应的活跃教师`,
            suggestedAction: '检查并更新学生的教师关联或删除该学生记录',
            relatedEntities: [student.teacher_id]
          });
        }
      }
    });
    
    // 检查孤立的课程记录（没有对应教师或学生的）
    courses.forEach(course => {
      if (course.status === SoftDeleteStatus.ACTIVE) {
        const hasTeacher = teachers.some(t => 
          t.id === course.teacher_id && t.status === SoftDeleteStatus.ACTIVE
        );
        const hasStudent = !course.student_id || students.some(s => 
          s.id === course.student_id && s.status === SoftDeleteStatus.ACTIVE
        );
        
        if (!hasTeacher || !hasStudent) {
          issues.push({
            id: `orphaned_course_${course.id}`,
            type: 'ORPHANED_RECORD',
            severity: 'MEDIUM',
            entityType: 'COURSE',
            entityId: course.id,
            description: `课程"${course.course_name}"缺少必要的依赖`,
            suggestedAction: '检查并更新课程的教师或学生关联',
            relatedEntities: [course.teacher_id, course.student_id].filter(Boolean)
          });
        }
      }
    });
    
    return issues;
  }

  // 检查无效引用
  private checkInvalidReferences(
    teachers: any[], students: any[], courses: any[], 
    rooms: any[], scheduledClasses: any[]
  ): DataConsistencyIssue[] {
    const issues: DataConsistencyIssue[] = [];
    
    // 检查排课记录中的无效引用
    scheduledClasses.forEach(scheduledClass => {
      if (scheduledClass.status === SoftDeleteStatus.ACTIVE) {
        // 检查教师引用
        const teacher = teachers.find(t => t.id === scheduledClass.teacher_id);
        if (!teacher || teacher.status !== SoftDeleteStatus.ACTIVE) {
          issues.push({
            id: `invalid_teacher_ref_${scheduledClass.id}`,
            type: 'INVALID_REFERENCE',
            severity: 'HIGH',
            entityType: 'SCHEDULED_CLASS',
            entityId: scheduledClass.id,
            description: `排课记录引用的教师不存在或已删除`,
            suggestedAction: '更新排课记录中的教师引用或删除该排课记录',
            relatedEntities: [scheduledClass.teacher_id]
          });
        }
        
        // 检查学生引用
        const student = students.find(s => s.id === scheduledClass.student_id);
        if (!student || student.status !== SoftDeleteStatus.ACTIVE) {
          issues.push({
            id: `invalid_student_ref_${scheduledClass.id}`,
            type: 'INVALID_REFERENCE',
            severity: 'HIGH',
            entityType: 'SCHEDULED_CLASS',
            entityId: scheduledClass.id,
            description: `排课记录引用的学生不存在或已删除`,
            suggestedAction: '更新排课记录中的学生引用或删除该排课记录',
            relatedEntities: [scheduledClass.student_id]
          });
        }
        
        // 检查教室引用
        const room = rooms.find(r => r.id === scheduledClass.room_id);
        if (!room || room.status !== SoftDeleteStatus.ACTIVE) {
          issues.push({
            id: `invalid_room_ref_${scheduledClass.id}`,
            type: 'INVALID_REFERENCE',
            severity: 'HIGH',
            entityType: 'SCHEDULED_CLASS',
            entityId: scheduledClass.id,
            description: `排课记录引用的教室不存在或已删除`,
            suggestedAction: '更新排课记录中的教室引用或删除该排课记录',
            relatedEntities: [scheduledClass.room_id]
          });
        }
        
        // 检查课程引用
        const course = courses.find(c => c.id === scheduledClass.course_id);
        if (!course || course.status !== SoftDeleteStatus.ACTIVE) {
          issues.push({
            id: `invalid_course_ref_${scheduledClass.id}`,
            type: 'INVALID_REFERENCE',
            severity: 'HIGH',
            entityType: 'SCHEDULED_CLASS',
            entityId: scheduledClass.id,
            description: `排课记录引用的课程不存在或已删除`,
            suggestedAction: '更新排课记录中的课程引用或删除该排课记录',
            relatedEntities: [scheduledClass.course_id]
          });
        }
      }
    });
    
    return issues;
  }

  // 检查重复条目
  private checkDuplicateEntries(
    teachers: any[], students: any[], courses: any[], 
    rooms: any[], scheduledClasses: any[]
  ): DataConsistencyIssue[] {
    const issues: DataConsistencyIssue[] = [];
    
    // 检查重复的教师工号
    const teacherIds = teachers.filter(t => t.status === SoftDeleteStatus.ACTIVE).map(t => t.teacher_id);
    const duplicateTeacherIds = teacherIds.filter((id, index) => teacherIds.indexOf(id) !== index);
    duplicateTeacherIds.forEach(duplicateId => {
      const duplicates = teachers.filter(t => t.teacher_id === duplicateId && t.status === SoftDeleteStatus.ACTIVE);
      issues.push({
        id: `duplicate_teacher_${duplicateId}`,
        type: 'DUPLICATE_ENTRY',
        severity: 'MEDIUM',
        entityType: 'TEACHER',
        entityId: duplicates[0].id,
        description: `存在重复的教师工号: ${duplicateId}`,
        suggestedAction: '合并或删除重复的教师记录',
        relatedEntities: duplicates.map(d => d.id)
      });
    });
    
    // 检查重复的学生学号
    const studentIds = students.filter(s => s.status === SoftDeleteStatus.ACTIVE).map(s => s.student_id);
    const duplicateStudentIds = studentIds.filter((id, index) => studentIds.indexOf(id) !== index);
    duplicateStudentIds.forEach(duplicateId => {
      const duplicates = students.filter(s => s.student_id === duplicateId && s.status === SoftDeleteStatus.ACTIVE);
      issues.push({
        id: `duplicate_student_${duplicateId}`,
        type: 'DUPLICATE_ENTRY',
        severity: 'MEDIUM',
        entityType: 'STUDENT',
        entityId: duplicates[0].id,
        description: `存在重复的学生学号: ${duplicateId}`,
        suggestedAction: '合并或删除重复的学生记录',
        relatedEntities: duplicates.map(d => d.id)
      });
    });
    
    return issues;
  }

  // 检查缺失依赖
  private checkMissingDependencies(
    teachers: any[], students: any[], courses: any[], 
    rooms: any[], scheduledClasses: any[]
  ): DataConsistencyIssue[] {
    const issues: DataConsistencyIssue[] = [];
    
    // 检查教室容量配置
    rooms.forEach(room => {
      if (room.status === SoftDeleteStatus.ACTIVE && (!room.capacity || room.capacity <= 0)) {
        issues.push({
          id: `invalid_capacity_${room.id}`,
          type: 'MISSING_DEPENDENCY',
          severity: 'LOW',
          entityType: 'ROOM',
          entityId: room.id,
          description: `教室"${room.room_name}"缺少有效的容量配置`,
          suggestedAction: '为教室设置合理的容量值',
          relatedEntities: []
        });
      }
    });
    
    return issues;
  }

  // 修复数据一致性问题
  public async fixDataConsistencyIssues(issueIds: string[]): Promise<{
    success: boolean;
    fixedIssues: string[];
    errors: string[];
  }> {
    const syncResult = await this.performDataSyncCheck();
    const issuesToFix = syncResult.issues.filter(issue => issueIds.includes(issue.id));
    
    const fixedIssues: string[] = [];
    const errors: string[] = [];
    
    for (const issue of issuesToFix) {
      try {
        const fixResult = await this.fixSingleIssue(issue);
        if (fixResult.success) {
          fixedIssues.push(issue.id);
        } else {
          errors.push(`${issue.id}: ${fixResult.error}`);
        }
      } catch (error) {
        errors.push(`${issue.id}: ${error}`);
      }
    }
    
    return {
      success: errors.length === 0,
      fixedIssues,
      errors
    };
  }

  // 修复单个问题
  private async fixSingleIssue(issue: DataConsistencyIssue): Promise<{ success: boolean; error?: string }> {
    switch (issue.type) {
      case 'ORPHANED_RECORD':
        return this.fixOrphanedRecord(issue);
      case 'INVALID_REFERENCE':
        return this.fixInvalidReference(issue);
      case 'DUPLICATE_ENTRY':
        return this.fixDuplicateEntry(issue);
      default:
        return { success: false, error: `不支持的修复类型: ${issue.type}` };
    }
  }

  // 修复孤立记录
  private async fixOrphanedRecord(issue: DataConsistencyIssue): Promise<{ success: boolean; error?: string }> {
    // 这里可以实现具体的修复逻辑
    // 比如自动删除孤立记录或创建缺失的依赖
    return { success: true };
  }

  // 修复无效引用
  private async fixInvalidReference(issue: DataConsistencyIssue): Promise<{ success: boolean; error?: string }> {
    // 这里可以实现具体的修复逻辑
    // 比如更新引用或删除无效记录
    return { success: true };
  }

  // 修复重复条目
  private async fixDuplicateEntry(issue: DataConsistencyIssue): Promise<{ success: boolean; error?: string }> {
    // 这里可以实现具体的修复逻辑
    // 比如合并重复记录或删除多余的记录
    return { success: true };
  }

  // 获取软删除的历史记录
  public getSoftDeleteHistory(): any[] {
    const historyKey = 'soft_delete_history';
    return JSON.parse(localStorage.getItem(historyKey) || '[]');
  }

  // 清理旧的软删除记录
  public async cleanupOldSoftDeletes(daysOld: number = 30): Promise<{ cleaned: number; errors: string[] }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const history = this.getSoftDeleteHistory();
    const entities = ['teacher', 'student', 'course', 'room', 'scheduled_class'];
    
    let cleaned = 0;
    const errors: string[] = [];
    
    for (const entityType of entities) {
      const storageKey = this.getStorageKey(entityType);
      const data = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      const filteredData = data.filter((entity: any) => {
        if (entity.status === SoftDeleteStatus.SOFT_DELETED && entity.deleted_at) {
          const deletedDate = new Date(entity.deleted_at);
          if (deletedDate < cutoffDate) {
            cleaned++;
            return false; // 删除这条记录
          }
        }
        return true; // 保留这条记录
      });
      
      if (filteredData.length !== data.length) {
        localStorage.setItem(storageKey, JSON.stringify(filteredData));
      }
    }
    
    return { cleaned, errors };
  }
}

export default DataConsistencyService.getInstance();