// 数据管理相关类型定义

// 数据操作模式
export enum DataOperationMode {
  ADD = 'add',           // 新增：添加到现有数据
  OVERWRITE = 'overwrite', // 覆盖：清空并替换
  UPDATE = 'update',     // 更新：根据ID匹配更新
  MERGE = 'merge'        // 合并：智能合并数据
}

// 数据管理选项
export interface DataManagementOptions {
  mode: DataOperationMode;
  backupBeforeOperation?: boolean;
  skipOnConflict?: boolean;
  customMergeStrategy?: (existing: any, incoming: any) => any;
}

// 数据导入结果
export interface DataImportResult {
  success: boolean;
  mode: DataOperationMode;
  summary: {
    teachers?: { added: number; updated: number; skipped: number; errors: number };
    students?: { added: number; updated: number; skipped: number; errors: number };
    classes?: { added: number; updated: number; skipped: number; errors: number };
    courses?: { added: number; updated: number; skipped: number; errors: number };
    rooms?: { added: number; updated: number; skipped: number; errors: number };
    scheduled_classes?: { added: number; updated: number; skipped: number; errors: number };
    conflicts?: { added: number; updated: number; skipped: number; errors: number };
    large_class_schedules?: { added: number; updated: number; skipped: number; errors: number };
    users?: { added: number; updated: number; skipped: number; errors: number };
  };
  errors: string[];
  warnings: string[];
}
