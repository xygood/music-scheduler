import { useState, useEffect, useCallback } from 'react';
import { TimeAvailability, BaseBlockedTime, PriorityBlockedTime } from '../types/blockedTime';
import { blockedTimeService, priorityBlockedTimeService } from '../services/blockedTimeService';
import { timeAvailabilityService } from '../services/timeAvailabilityService';
import { largeClassBlockedTimeService } from '../services/largeClassBlockedTimeService';

// 订阅者类型
type Subscriber = () => void;

// 全局状态管理器
class BlockedTimeStateManager {
  private subscribers: Subscriber[] = [];
  private isUpdating = false;

  // 添加订阅者
  subscribe(subscriber: Subscriber): () => void {
    this.subscribers.push(subscriber);
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== subscriber);
    };
  }

  // 通知所有订阅者
  notify(): void {
    if (this.isUpdating) return;
    
    this.isUpdating = true;
    try {
      this.subscribers.forEach(subscriber => {
        try {
          subscriber();
        } catch (error) {
          console.error('订阅者执行失败:', error);
        }
      });
    } finally {
      this.isUpdating = false;
    }
  }
}

// 创建全局状态管理器实例
const stateManager = new BlockedTimeStateManager();

interface UseBlockedTimeReturn {
  // 状态
  baseBlockedTimes: BaseBlockedTime[];
  priorityBlockedTimes: PriorityBlockedTime[];
  loading: boolean;
  error: string | null;
  
  // 操作方法
  checkTimeAvailability: (week: number, day: number, period: number, entities?: any) => Promise<TimeAvailability>;
  createBaseBlockedTime: (data: Omit<BaseBlockedTime, 'id' | 'createdAt' | 'updatedAt'>) => Promise<BaseBlockedTime | null>;
  deleteBaseBlockedTime: (id: string) => Promise<boolean>;
  clearBaseBlockedTimes: () => Promise<boolean>;
  
  // 通适大课相关
  generateLargeClassBlockedTimes: () => Promise<{ success: boolean; message: string; generatedCount: number }>;
  clearLargeClassBlockedTimes: () => Promise<boolean>;
  getLargeClassBlockedTimeStats: () => Promise<{ total: number; byCourse: Record<string, number> }>;
  
  // 优先级禁排时间
  createPriorityBlockedTime: (data: Omit<PriorityBlockedTime, 'id' | 'createdAt'>) => Promise<PriorityBlockedTime | null>;
  deletePriorityBlockedTime: (id: string) => Promise<boolean>;
  
  // 刷新数据
  refreshBlockedTimes: () => Promise<void>;
}

interface UseBlockedTimeProps {
  academicYear: string;
  semesterLabel: string;
}

/**
 * 禁排时间管理 Hook
 * 提供全局状态管理和订阅机制
 */
export const useBlockedTime = ({ academicYear, semesterLabel }: UseBlockedTimeProps): UseBlockedTimeReturn => {
  const [baseBlockedTimes, setBaseBlockedTimes] = useState<BaseBlockedTime[]>([]);
  const [priorityBlockedTimes, setPriorityBlockedTimes] = useState<PriorityBlockedTime[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载基础禁排时间
  const loadBaseBlockedTimes = useCallback(async () => {
    try {
      const times = await blockedTimeService.getAllBaseBlockedTimes(academicYear, semesterLabel);
      setBaseBlockedTimes(times);
    } catch (err) {
      console.error('加载基础禁排时间失败:', err);
    }
  }, [academicYear, semesterLabel]);

  // 加载优先级禁排时间
  const loadPriorityBlockedTimes = useCallback(async () => {
    try {
      const times = await priorityBlockedTimeService.getAllPriorityBlockedTimes();
      
      // 只按学年筛选，不按学期筛选
      const filteredTimes = times.filter(time => 
        time.academicYear === academicYear
      );
      
      console.log('加载优先级禁排时间:', {
        total: times.length,
        filtered: filteredTimes.length,
        academicYear
      });
      
      setPriorityBlockedTimes(filteredTimes);
    } catch (err) {
      console.error('加载优先级禁排时间失败:', err);
    }
  }, [academicYear]);

  // 刷新所有禁排时间数据
  const refreshBlockedTimes = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        loadBaseBlockedTimes(),
        loadPriorityBlockedTimes()
      ]);
    } catch (err) {
      setError('刷新禁排时间失败');
      console.error('刷新禁排时间失败:', err);
    } finally {
      setLoading(false);
    }
  }, [loadBaseBlockedTimes, loadPriorityBlockedTimes]);

  // 检查时间可用性
  const checkTimeAvailability = useCallback(async (
    week: number,
    day: number,
    period: number,
    entities?: any
  ): Promise<TimeAvailability> => {
    return timeAvailabilityService.checkTimeAvailability(
      academicYear,
      semesterLabel,
      week,
      day,
      period,
      entities
    );
  }, [academicYear, semesterLabel]);

  // 创建基础禁排时间
  const createBaseBlockedTime = useCallback(async (
    data: Omit<BaseBlockedTime, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<BaseBlockedTime | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const newTime = await blockedTimeService.createBaseBlockedTime(data);
      await refreshBlockedTimes();
      stateManager.notify();
      return newTime;
    } catch (err) {
      setError('创建禁排时间失败');
      console.error('创建禁排时间失败:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [refreshBlockedTimes]);

  // 删除基础禁排时间
  const deleteBaseBlockedTime = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const success = await blockedTimeService.deleteBaseBlockedTime(id);
      if (success) {
        await refreshBlockedTimes();
        stateManager.notify();
      }
      return success;
    } catch (err) {
      setError('删除禁排时间失败');
      console.error('删除禁排时间失败:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [refreshBlockedTimes]);

  // 清空基础禁排时间
  const clearBaseBlockedTimes = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const success = await blockedTimeService.clearBaseBlockedTimes(academicYear, semesterLabel);
      if (success) {
        await refreshBlockedTimes();
        stateManager.notify();
      }
      return success;
    } catch (err) {
      setError('清空禁排时间失败');
      console.error('清空禁排时间失败:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [academicYear, semesterLabel, refreshBlockedTimes]);

  // 生成通适大课禁排时间
  const generateLargeClassBlockedTimes = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await largeClassBlockedTimeService.validateAndGenerateBlockedTimes(academicYear, semesterLabel);
      if (result.success) {
        await refreshBlockedTimes();
        stateManager.notify();
      }
      return result;
    } catch (err) {
      setError('生成通适大课禁排时间失败');
      console.error('生成通适大课禁排时间失败:', err);
      return { success: false, message: '生成失败', generatedCount: 0 };
    } finally {
      setLoading(false);
    }
  }, [academicYear, semesterLabel, refreshBlockedTimes]);

  // 清空通适大课禁排时间
  const clearLargeClassBlockedTimes = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const success = await largeClassBlockedTimeService.clearLargeClassBlockedTimes();
      if (success) {
        await refreshBlockedTimes();
        stateManager.notify();
      }
      return success;
    } catch (err) {
      setError('清空通适大课禁排时间失败');
      console.error('清空通适大课禁排时间失败:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [refreshBlockedTimes]);

  // 获取通适大课禁排时间统计
  const getLargeClassBlockedTimeStats = useCallback(async () => {
    return largeClassBlockedTimeService.getLargeClassBlockedTimeStats();
  }, []);

  // 创建优先级禁排时间
  const createPriorityBlockedTime = useCallback(async (
    data: Omit<PriorityBlockedTime, 'id' | 'createdAt'>
  ): Promise<PriorityBlockedTime | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const newTime = await priorityBlockedTimeService.createPriorityBlockedTime(data);
      await refreshBlockedTimes();
      stateManager.notify();
      return newTime;
    } catch (err) {
      setError('创建优先级禁排时间失败');
      console.error('创建优先级禁排时间失败:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [refreshBlockedTimes]);

  // 删除优先级禁排时间
  const deletePriorityBlockedTime = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const success = await priorityBlockedTimeService.deletePriorityBlockedTime(id);
      if (success) {
        await refreshBlockedTimes();
        stateManager.notify();
      }
      return success;
    } catch (err) {
      setError('删除优先级禁排时间失败');
      console.error('删除优先级禁排时间失败:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [refreshBlockedTimes]);

  // 组件挂载时加载数据
  useEffect(() => {
    refreshBlockedTimes();
  }, [refreshBlockedTimes]);

  // 订阅全局状态变化
  useEffect(() => {
    const unsubscribe = stateManager.subscribe(() => {
      refreshBlockedTimes();
    });

    return unsubscribe;
  }, [refreshBlockedTimes]);

  return {
    // 状态
    baseBlockedTimes,
    priorityBlockedTimes,
    loading,
    error,
    
    // 操作方法
    checkTimeAvailability,
    createBaseBlockedTime,
    deleteBaseBlockedTime,
    clearBaseBlockedTimes,
    
    // 通适大课相关
    generateLargeClassBlockedTimes,
    clearLargeClassBlockedTimes,
    getLargeClassBlockedTimeStats,
    
    // 优先级禁排时间
    createPriorityBlockedTime,
    deletePriorityBlockedTime,
    
    // 刷新数据
    refreshBlockedTimes
  };
};
