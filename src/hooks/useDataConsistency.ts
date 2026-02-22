// 数据一致性检查的 React Hook
import { useState, useEffect, useCallback } from 'react';
import DataConsistencyService, { 
  DataSyncCheckResult, 
  DataConsistencyIssue, 
  SoftDeleteStatus 
} from '../services/dataConsistencyService';

interface UseDataConsistencyResult {
  // 数据同步检查结果
  syncResult: DataSyncCheckResult | null;
  isChecking: boolean;
  lastCheckTime: string | null;
  
  // 数据一致性状态
  isDataConsistent: boolean;
  totalIssues: number;
  criticalIssues: number;
  
  // 操作方法
  performSyncCheck: () => Promise<void>;
  fixIssues: (issueIds: string[]) => Promise<{ success: boolean; fixedIssues: string[]; errors: string[] }>;
  softDelete: (entityId: string, entityType: string, deletedBy?: string) => Promise<{ success: boolean; error?: string }>;
  restoreSoftDelete: (entityId: string, entityType: string) => Promise<{ success: boolean; error?: string }>;
  permanentDelete: (entityId: string, entityType: string) => Promise<{ success: boolean; error?: string }>;
  
  // 数据统计
  getDataStats: () => {
    totalRecords: number;
    activeRecords: number;
    softDeletedRecords: number;
    consistencyScore: number;
  };
}

export function useDataConsistency(): UseDataConsistencyResult {
  const [syncResult, setSyncResult] = useState<DataSyncCheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<string | null>(null);

  // 执行数据同步检查
  const performSyncCheck = useCallback(async () => {
    setIsChecking(true);
    try {
      const result = await DataConsistencyService.performDataSyncCheck();
      setSyncResult(result);
      setLastCheckTime(new Date().toISOString());
    } catch (error) {
      console.error('数据同步检查失败:', error);
      setSyncResult({
        isConsistent: false,
        issues: [{
          id: 'check_failed',
          type: 'INVALID_STATE',
          severity: 'CRITICAL',
          entityType: 'SYSTEM',
          entityId: 'system',
          description: `数据同步检查失败: ${error}`,
          suggestedAction: '检查系统状态并重试'
        }],
        summary: {
          totalRecords: 0,
          activeRecords: 0,
          softDeletedRecords: 0,
          orphanedRecords: 0,
          invalidReferences: 0
        }
      });
    } finally {
      setIsChecking(false);
    }
  }, []);

  // 修复数据一致性问题
  const fixIssues = useCallback(async (issueIds: string[]) => {
    try {
      const result = await DataConsistencyService.fixDataConsistencyIssues(issueIds);
      
      // 修复后重新检查数据一致性
      if (result.success) {
        await performSyncCheck();
      }
      
      return result;
    } catch (error) {
      console.error('修复数据一致性问题失败:', error);
      return {
        success: false,
        fixedIssues: [],
        errors: [`修复失败: ${error}`]
      };
    }
  }, [performSyncCheck]);

  // 软删除操作
  const softDelete = useCallback(async (entityId: string, entityType: string, deletedBy?: string) => {
    try {
      const result = DataConsistencyService.softDelete(entityId, entityType as any, deletedBy);
      
      // 操作后重新检查数据一致性
      if (result.success) {
        await performSyncCheck();
      }
      
      return result;
    } catch (error) {
      console.error('软删除失败:', error);
      return {
        success: false,
        error: `软删除失败: ${error}`
      };
    }
  }, [performSyncCheck]);

  // 恢复软删除
  const restoreSoftDelete = useCallback(async (entityId: string, entityType: string) => {
    try {
      const result = DataConsistencyService.restoreSoftDelete(entityId, entityType as any);
      
      // 操作后重新检查数据一致性
      if (result.success) {
        await performSyncCheck();
      }
      
      return result;
    } catch (error) {
      console.error('恢复软删除失败:', error);
      return {
        success: false,
        error: `恢复失败: ${error}`
      };
    }
  }, [performSyncCheck]);

  // 永久删除
  const permanentDelete = useCallback(async (entityId: string, entityType: string) => {
    try {
      const result = DataConsistencyService.permanentDelete(entityId, entityType as any);
      
      // 操作后重新检查数据一致性
      if (result.success) {
        await performSyncCheck();
      }
      
      return result;
    } catch (error) {
      console.error('永久删除失败:', error);
      return {
        success: false,
        error: `永久删除失败: ${error}`
      };
    }
  }, [performSyncCheck]);

  // 获取数据统计信息
  const getDataStats = useCallback(() => {
    if (!syncResult) {
      return {
        totalRecords: 0,
        activeRecords: 0,
        softDeletedRecords: 0,
        consistencyScore: 0
      };
    }

    const { summary } = syncResult;
    const consistencyScore = summary.totalRecords > 0 
      ? Math.max(0, 100 - (summary.orphanedRecords + summary.invalidReferences) * 10)
      : 100;

    return {
      totalRecords: summary.totalRecords,
      activeRecords: summary.activeRecords,
      softDeletedRecords: summary.softDeletedRecords,
      consistencyScore
    };
  }, [syncResult]);

  // 计算数据一致性状态
  const isDataConsistent = syncResult?.isConsistent ?? false;
  const totalIssues = syncResult?.issues.length ?? 0;
  const criticalIssues = syncResult?.issues.filter(issue => issue.severity === 'CRITICAL').length ?? 0;

  // 组件挂载时自动执行一次检查
  useEffect(() => {
    performSyncCheck();
  }, [performSyncCheck]);

  return {
    // 数据同步检查结果
    syncResult,
    isChecking,
    lastCheckTime,
    
    // 数据一致性状态
    isDataConsistent,
    totalIssues,
    criticalIssues,
    
    // 操作方法
    performSyncCheck,
    fixIssues,
    softDelete,
    restoreSoftDelete,
    permanentDelete,
    
    // 数据统计
    getDataStats
  };
}

// 特定实体的软删除 Hook
export function useEntitySoftDelete<T extends { id: string }>(
  entityType: 'teacher' | 'student' | 'course' | 'room' | 'scheduled_class'
) {
  const { softDelete, restoreSoftDelete, permanentDelete } = useDataConsistency();
  
  const deleteEntity = useCallback(async (entity: T, deletedBy?: string) => {
    return await softDelete(entity.id, entityType, deletedBy);
  }, [softDelete, entityType]);

  const restoreEntity = useCallback(async (entity: T) => {
    return await restoreSoftDelete(entity.id, entityType);
  }, [restoreSoftDelete, entityType]);

  const permanentlyDeleteEntity = useCallback(async (entity: T) => {
    return await permanentDelete(entity.id, entityType);
  }, [permanentDelete, entityType]);

  return {
    deleteEntity,
    restoreEntity,
    permanentlyDeleteEntity
  };
}

// 数据一致性监控 Hook
export function useDataConsistencyMonitor() {
  const { syncResult, performSyncCheck, getDataStats } = useDataConsistency();
  const [autoCheckEnabled, setAutoCheckEnabled] = useState(true);
  const [checkInterval, setCheckInterval] = useState(5 * 60 * 1000); // 5分钟

  // 自动检查
  useEffect(() => {
    if (!autoCheckEnabled) return;

    const interval = setInterval(() => {
      performSyncCheck();
    }, checkInterval);

    return () => clearInterval(interval);
  }, [autoCheckEnabled, checkInterval, performSyncCheck]);

  const stats = getDataStats();
  const healthStatus = stats.consistencyScore >= 90 ? 'excellent' :
                     stats.consistencyScore >= 70 ? 'good' :
                     stats.consistencyScore >= 50 ? 'fair' : 'poor';

  return {
    stats,
    healthStatus,
    autoCheckEnabled,
    setAutoCheckEnabled,
    checkInterval,
    setCheckInterval,
    performManualCheck: performSyncCheck,
    lastCheckResult: syncResult
  };
}

// 数据修复建议 Hook
export function useDataRepairSuggestions() {
  const { syncResult } = useDataConsistency();

  const getSuggestions = useCallback(() => {
    if (!syncResult) return [];

    return syncResult.issues.map(issue => {
      switch (issue.type) {
        case 'ORPHANED_RECORD':
          return {
            issueId: issue.id,
            title: `修复孤立记录: ${issue.entityType}`,
            description: issue.description,
            action: '删除孤立记录或创建缺失依赖',
            priority: issue.severity,
            autoFixable: false
          };
        case 'INVALID_REFERENCE':
          return {
            issueId: issue.id,
            title: `修复无效引用: ${issue.entityType}`,
            description: issue.description,
            action: '更新引用或删除无效记录',
            priority: issue.severity,
            autoFixable: true
          };
        case 'DUPLICATE_ENTRY':
          return {
            issueId: issue.id,
            title: `处理重复条目: ${issue.entityType}`,
            description: issue.description,
            action: '合并或删除重复记录',
            priority: issue.severity,
            autoFixable: false
          };
        case 'MISSING_DEPENDENCY':
          return {
            issueId: issue.id,
            title: `补充缺失依赖: ${issue.entityType}`,
            description: issue.description,
            action: issue.suggestedAction,
            priority: issue.severity,
            autoFixable: true
          };
        default:
          return {
            issueId: issue.id,
            title: `未知问题: ${issue.entityType}`,
            description: issue.description,
            action: issue.suggestedAction,
            priority: issue.severity,
            autoFixable: false
          };
      }
    });
  }, [syncResult]);

  const autoFixableIssues = useCallback(() => {
    return getSuggestions().filter(suggestion => suggestion.autoFixable);
  }, [getSuggestions]);

  const manualFixIssues = useCallback(() => {
    return getSuggestions().filter(suggestion => !suggestion.autoFixable);
  }, [getSuggestions]);

  return {
    suggestions: getSuggestions(),
    autoFixableIssues: autoFixableIssues(),
    manualFixIssues: manualFixIssues()
  };
}