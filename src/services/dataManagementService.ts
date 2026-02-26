// 数据管理服务 - 支持多种数据操作模式
import { 
  teacherService, 
  studentService, 
  classService, 
  courseService, 
  roomService, 
  scheduleService, 
  conflictService,
  largeClassScheduleService,
  clearAllData
} from './index';
import { DataOperationMode, DataManagementOptions, DataImportResult } from '../types/dataManagement';
import { createUserAccountsFromTeachers } from './localStorage';

class DataManagementService {
  // 备份当前数据
  private backupCurrentData(): string {
    const backup = {
      timestamp: new Date().toISOString(),
      data: {
        teachers: JSON.parse(localStorage.getItem('music_scheduler_teachers') || '[]'),
        students: JSON.parse(localStorage.getItem('music_scheduler_students') || '[]'),
        classes: JSON.parse(localStorage.getItem('music_scheduler_classes') || '[]'),
        courses: JSON.parse(localStorage.getItem('music_scheduler_courses') || '[]'),
        rooms: JSON.parse(localStorage.getItem('music_scheduler_rooms') || '[]'),
        scheduled_classes: JSON.parse(localStorage.getItem('music_scheduler_scheduled_classes') || '[]'),
        conflicts: JSON.parse(localStorage.getItem('music_scheduler_conflicts') || '[]'),
        large_class_schedules: JSON.parse(localStorage.getItem('music_scheduler_large_class_schedules') || '[]'),
        users: JSON.parse(localStorage.getItem('music_scheduler_users') || '[]')
      }
    };
    
    // 保存备份到localStorage（保留最近5个备份）
    const backups = JSON.parse(localStorage.getItem('music_scheduler_backups') || '[]');
    backups.unshift(backup);
    while (backups.length > 5) backups.pop();
    localStorage.setItem('music_scheduler_backups', JSON.stringify(backups));
    
    return JSON.stringify(backup);
  }

  // 获取数据标识符
  private getRecordId(record: any, type: string): string {
    switch (type) {
      case 'teachers':
      case 'students':
      case 'courses':
      case 'rooms':
        return record.id || record.teacher_id || record.student_id || record.course_id || record.room_id;
      case 'classes':
        return record.id || record.class_id;
      case 'scheduled_classes':
        return record.id || `${record.teacher_id}_${record.student_id}_${record.room_id}_${record.day_of_week}_${record.period}`;
      case 'conflicts':
        return record.id || `${record.teacher_id}_${record.conflict_type}`;
      case 'large_class_schedules':
        return record.file_name || record.id;
      case 'users':
        return record.id || record.teacher_id || record.email;
      default:
        return record.id || JSON.stringify(record);
    }
  }

  // 智能数据合并
  private smartMerge(existing: any[], incoming: any[], type: string): { existing: any[], added: any[], updated: any[], skipped: any[] } {
    const existingMap = new Map();
    const result = {
      existing: [...existing],
      added: [] as any[],
      updated: [] as any[],
      skipped: [] as any[]
    };

    // 构建现有数据的索引
    existing.forEach(item => {
      const id = this.getRecordId(item, type);
      existingMap.set(id, item);
    });

    // 处理传入的数据
    incoming.forEach(item => {
      const id = this.getRecordId(item, type);
      
      if (existingMap.has(id)) {
        // 记录已存在，检查是否需要更新
        const existingItem = existingMap.get(id);
        if (JSON.stringify(existingItem) !== JSON.stringify(item)) {
          // 数据不同，进行更新
          const updatedIndex = result.existing.findIndex(existingItem => this.getRecordId(existingItem, type) === id);
          if (updatedIndex !== -1) {
            result.existing[updatedIndex] = { ...item, updated_at: new Date().toISOString() };
            result.updated.push(item);
          }
        } else {
          result.skipped.push(item);
        }
      } else {
        // 新记录
        result.existing.push({ ...item, id: item.id || this.generateId(), created_at: item.created_at || new Date().toISOString() });
        result.added.push(item);
      }
    });

    return result;
  }

  // 生成唯一ID
  private generateId(): string {
    return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 主要数据导入方法
  async importData(data: any, options: DataManagementOptions): Promise<DataImportResult> {
    const { mode, backupBeforeOperation = true } = options;
    const result: DataImportResult = {
      success: false,
      mode,
      summary: {},
      errors: [],
      warnings: []
    };

    try {
      // 备份现有数据
      if (backupBeforeOperation) {
        this.backupCurrentData();
      }

      // 根据模式执行不同的操作
      switch (mode) {
        case DataOperationMode.OVERWRITE:
          result.summary = await this.overwriteData(data);
          break;
          
        case DataOperationMode.ADD:
          result.summary = await this.addData(data);
          break;
          
        case DataOperationMode.UPDATE:
          result.summary = await this.updateData(data);
          break;
          
        case DataOperationMode.MERGE:
          result.summary = await this.mergeData(data);
          break;
          
        default:
          throw new Error(`不支持的数据操作模式: ${mode}`);
      }

      result.success = true;
      return result;

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
      return result;
    }
  }

  // 覆盖模式：清空现有数据并导入新数据
  private async overwriteData(data: any): Promise<any> {
    // 清空所有数据
    clearAllData();
    
    const summary: any = {};
    
    // 导入各类数据
    if (data.teachers?.length) {
      const teacherResult = await teacherService.createMany(data.teachers);
      summary.teachers = { 
        created: teacherResult?.length || 0, 
        updated: 0, 
        skipped: 0, 
        errors: 0 
      };
    }
    
    if (data.students?.length) {
      const studentResult = await studentService.createMany(data.students);
      summary.students = { 
        created: studentResult?.length || 0, 
        updated: 0, 
        skipped: 0, 
        errors: 0 
      };
    }
    
    if (data.classes?.length) {
      for (const classData of data.classes) {
        await classService.create(classData);
      }
      summary.classes = { 
        created: data.classes.length, 
        updated: 0, 
        skipped: 0, 
        errors: 0 
      };
    }
    
    if (data.courses?.length) {
      const courseResult = await courseService.createMany(data.courses);
      summary.courses = { 
        created: courseResult?.length || 0, 
        updated: 0, 
        skipped: 0, 
        errors: 0 
      };
    }
    
    if (data.rooms?.length) {
      const roomResult = await roomService.importManyWithUpsert(data.rooms);
      summary.rooms = { 
        created: roomResult?.created?.length || 0,
        updated: roomResult?.updated?.length || 0, 
        skipped: 0, 
        errors: 0 
      };
    }
    
    if (data.scheduled_classes?.length) {
      const scheduleResult = await scheduleService.createMany(data.scheduled_classes);
      summary.scheduled_classes = { 
        created: scheduleResult?.length || 0, 
        updated: 0, 
        skipped: 0, 
        errors: 0 
      };
    }
    
    if (data.conflicts?.length) {
      for (const conflict of data.conflicts) {
        await conflictService.create(conflict);
      }
      summary.conflicts = { 
        created: data.conflicts.length, 
        updated: 0, 
        skipped: 0, 
        errors: 0 
      };
    }
    
    if (data.large_class_schedules?.length) {
      for (const schedule of data.large_class_schedules) {
        await largeClassScheduleService.importSchedule(
          schedule.file_name,
          schedule.academic_year,
          schedule.semester_label,
          schedule.entries
        );
      }
      summary.large_class_schedules = { 
        created: data.large_class_schedules.length, 
        updated: 0, 
        skipped: 0, 
        errors: 0 
      };
    }
    
    if (data.users?.length) {
      localStorage.setItem('music_scheduler_users', JSON.stringify(data.users));
      summary.users = { 
        created: data.users.length, 
        updated: 0, 
        skipped: 0, 
        errors: 0 
      };
    }

    // 同步班级数据
    const students = await studentService.getAll();
    await classService.syncFromStudents(students);
    
    // 为导入的教师数据创建用户账号
    await createUserAccountsFromTeachers();
    
    return summary;
  }

  // 新增模式：仅添加新数据，不覆盖现有数据
  private async addData(data: any): Promise<any> {
    const summary: any = {};
    
    // 处理各类数据，只添加不重复的记录
    if (data.teachers?.length) {
      const existing = JSON.parse(localStorage.getItem('music_scheduler_teachers') || '[]');
      const existingIds = new Set(existing.map((t: any) => t.teacher_id || t.id));
      const newTeachers = data.teachers.filter((t: any) => !existingIds.has(t.teacher_id || t.id));
      
      if (newTeachers.length > 0) {
        const teacherResult = await teacherService.createMany(newTeachers);
        summary.teachers = { 
          created: teacherResult?.length || newTeachers.length, 
          updated: 0, 
          skipped: data.teachers.length - newTeachers.length, 
          errors: 0 
        };
        
        // 为新添加的教师数据创建用户账号
        await createUserAccountsFromTeachers();
      }
    }
    
    // 类似地处理其他数据类型...
    // 这里可以继续实现其他类型的add逻辑
    
    return summary;
  }

  // 更新模式：根据ID匹配更新现有数据
  private async updateData(data: any): Promise<any> {
    const summary: any = {};
    
    // 实现更新逻辑
    if (data.teachers?.length) {
      const existing = JSON.parse(localStorage.getItem('music_scheduler_teachers') || '[]');
      let updated = 0;
      let skipped = 0;
      
      data.teachers.forEach((teacher: any) => {
        const existingIndex = existing.findIndex((t: any) => 
          t.teacher_id === teacher.teacher_id || t.id === teacher.id
        );
        
        if (existingIndex !== -1) {
          existing[existingIndex] = { ...teacher, updated_at: new Date().toISOString() };
          updated++;
        } else {
          skipped++;
        }
      });
      
      localStorage.setItem('music_scheduler_teachers', JSON.stringify(existing));
      summary.teachers = { 
        created: 0, 
        updated, 
        skipped, 
        errors: 0 
      };
      
      // 为更新的教师数据检查并创建用户账号（如果有新增）
      await createUserAccountsFromTeachers();
    }
    
    return summary;
  }

  // 合并模式：智能合并数据
  private async mergeData(data: any): Promise<any> {
    const summary: any = {};
    
    // 实现合并逻辑
    if (data.teachers?.length) {
      const existing = JSON.parse(localStorage.getItem('music_scheduler_teachers') || '[]');
      const mergeResult = this.smartMerge(existing, data.teachers, 'teachers');
      
      localStorage.setItem('music_scheduler_teachers', JSON.stringify(mergeResult.existing));
      summary.teachers = { 
        created: mergeResult.added.length, 
        updated: mergeResult.updated.length, 
        skipped: mergeResult.skipped.length, 
        errors: 0 
      };
      
      // 为新合并的教师数据创建用户账号
      if (mergeResult.added.length > 0) {
        await createUserAccountsFromTeachers();
      }
    }
    
    return summary;
  }

  // 初始化默认数据
  async initializeDefaultData(): Promise<void> {
    // 检查是否已经有数据
    const existingTeachers = JSON.parse(localStorage.getItem('music_scheduler_teachers') || '[]');
    
    if (existingTeachers.length === 0) {
      // 如果没有数据，导入默认数据
      try {
        // 这里可以导入您的备份数据
        const defaultData = await this.loadDefaultBackupData();
        await this.importData(defaultData, {
          mode: DataOperationMode.OVERWRITE,
          backupBeforeOperation: false
        });
        console.log('默认数据初始化完成');
      } catch (error) {
        console.error('默认数据初始化失败:', error);
      }
    }
  }

  // 加载默认备份数据
  private async loadDefaultBackupData(): Promise<any> {
    // 这里可以返回您备份的数据
    // 由于数据较大，建议从服务器获取或使用Promise.resolve()返回嵌入的数据
    return {
      teachers: [],
      students: [],
      classes: [],
      courses: [],
      rooms: [],
      scheduled_classes: [],
      conflicts: [],
      large_class_schedules: [],
      users: []
    };
  }

  // 获取备份列表
  getBackups(): any[] {
    return JSON.parse(localStorage.getItem('music_scheduler_backups') || '[]');
  }

  // 恢复备份
  restoreBackup(backupIndex: number): boolean {
    try {
      const backups = this.getBackups();
      if (backupIndex >= 0 && backupIndex < backups.length) {
        const backup = backups[backupIndex];
        // 清空当前数据并恢复备份
        clearAllData();
        Object.keys(backup.data).forEach(key => {
          if (backup.data[key]?.length > 0) {
            localStorage.setItem(`music_scheduler_${key}`, JSON.stringify(backup.data[key]));
          }
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('恢复备份失败:', error);
      return false;
    }
  }
}

// 导出单例实例
export const dataManagementService = new DataManagementService();
export default dataManagementService;