/**
 * 基础禁排时间服务
 * 实现禁排时间的 CRUD 操作
 */

import { BaseBlockedTime, PriorityBlockedTime, RealTimeBlockedTime } from '../types/blockedTime';
import { STORAGE_KEYS } from './localStorage';

/**
 * 基础禁排时间服务
 */
export const blockedTimeService = {
  /**
   * 获取所有基础禁排时间
   * @param academicYear 学年
   * @param semesterLabel 学期标签
   * @returns 基础禁排时间列表
   */
  async getAllBaseBlockedTimes(academicYear?: string, semesterLabel?: string): Promise<BaseBlockedTime[]> {
    try {
      const storedData = localStorage.getItem(STORAGE_KEYS.BLOCKED_SLOTS);
      if (!storedData) return [];

      const blockedTimes: BaseBlockedTime[] = JSON.parse(storedData);
      
      // 取消所有过滤，返回所有禁排时间
      return blockedTimes;
    } catch (error) {
      console.error('获取基础禁排时间失败:', error);
      return [];
    }
  },

  /**
   * 根据 ID 获取基础禁排时间
   * @param id 禁排时间 ID
   * @returns 基础禁排时间对象
   */
  async getBaseBlockedTimeById(id: string): Promise<BaseBlockedTime | null> {
    try {
      const storedData = localStorage.getItem(STORAGE_KEYS.BLOCKED_SLOTS);
      if (!storedData) return null;

      const blockedTimes: BaseBlockedTime[] = JSON.parse(storedData);
      return blockedTimes.find(time => time.id === id) || null;
    } catch (error) {
      console.error('获取基础禁排时间失败:', error);
      return null;
    }
  },

  /**
   * 创建基础禁排时间
   * @param blockedTime 基础禁排时间对象
   * @returns 创建的基础禁排时间对象
   */
  async createBaseBlockedTime(blockedTime: Omit<BaseBlockedTime, 'id' | 'createdAt' | 'updatedAt'>): Promise<BaseBlockedTime> {
    try {
      const storedData = localStorage.getItem(STORAGE_KEYS.BLOCKED_SLOTS);
      const blockedTimes: BaseBlockedTime[] = storedData ? JSON.parse(storedData) : [];

      const newBlockedTime: BaseBlockedTime = {
        ...blockedTime,
        id: `blocked-time-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      blockedTimes.push(newBlockedTime);
      localStorage.setItem(STORAGE_KEYS.BLOCKED_SLOTS, JSON.stringify(blockedTimes));

      return newBlockedTime;
    } catch (error) {
      console.error('创建基础禁排时间失败:', error);
      throw error;
    }
  },

  /**
   * 更新基础禁排时间
   * @param id 禁排时间 ID
   * @param updates 更新对象
   * @returns 更新后的基础禁排时间对象
   */
  async updateBaseBlockedTime(id: string, updates: Partial<BaseBlockedTime>): Promise<BaseBlockedTime | null> {
    try {
      const storedData = localStorage.getItem(STORAGE_KEYS.BLOCKED_SLOTS);
      if (!storedData) return null;

      const blockedTimes: BaseBlockedTime[] = JSON.parse(storedData);
      const index = blockedTimes.findIndex(time => time.id === id);

      if (index === -1) return null;

      blockedTimes[index] = {
        ...blockedTimes[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      localStorage.setItem(STORAGE_KEYS.BLOCKED_SLOTS, JSON.stringify(blockedTimes));
      return blockedTimes[index];
    } catch (error) {
      console.error('更新基础禁排时间失败:', error);
      return null;
    }
  },

  /**
   * 删除基础禁排时间
   * @param id 禁排时间 ID
   * @returns 是否删除成功
   */
  async deleteBaseBlockedTime(id: string): Promise<boolean> {
    try {
      const storedData = localStorage.getItem(STORAGE_KEYS.BLOCKED_SLOTS);
      if (!storedData) return false;

      const blockedTimes: BaseBlockedTime[] = JSON.parse(storedData);
      const filteredTimes = blockedTimes.filter(time => time.id !== id);

      if (filteredTimes.length === blockedTimes.length) return false;

      localStorage.setItem(STORAGE_KEYS.BLOCKED_SLOTS, JSON.stringify(filteredTimes));
      return true;
    } catch (error) {
      console.error('删除基础禁排时间失败:', error);
      return false;
    }
  },

  /**
   * 批量创建基础禁排时间
   * @param blockedTimes 基础禁排时间列表
   * @returns 创建的基础禁排时间列表
   */
  async createMultipleBaseBlockedTimes(blockedTimes: Array<Omit<BaseBlockedTime, 'id' | 'createdAt' | 'updatedAt'>>): Promise<BaseBlockedTime[]> {
    try {
      const storedData = localStorage.getItem(STORAGE_KEYS.BLOCKED_SLOTS);
      const existingTimes: BaseBlockedTime[] = storedData ? JSON.parse(storedData) : [];

      const newBlockedTimes: BaseBlockedTime[] = blockedTimes.map(time => ({
        ...time,
        id: `blocked-time-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      const updatedTimes = [...existingTimes, ...newBlockedTimes];
      localStorage.setItem(STORAGE_KEYS.BLOCKED_SLOTS, JSON.stringify(updatedTimes));

      return newBlockedTimes;
    } catch (error) {
      console.error('批量创建基础禁排时间失败:', error);
      throw error;
    }
  },

  /**
   * 清空指定学年和学期的基础禁排时间
   * @param academicYear 学年
   * @param semesterLabel 学期标签
   * @returns 是否清空成功
   */
  async clearBaseBlockedTimes(academicYear: string, semesterLabel: string): Promise<boolean> {
    try {
      const storedData = localStorage.getItem(STORAGE_KEYS.BLOCKED_SLOTS);
      if (!storedData) return true;

      const blockedTimes: BaseBlockedTime[] = JSON.parse(storedData);
      const filteredTimes = blockedTimes.filter(time => 
        time.academicYear !== academicYear || time.semesterLabel !== semesterLabel
      );

      localStorage.setItem(STORAGE_KEYS.BLOCKED_SLOTS, JSON.stringify(filteredTimes));
      return true;
    } catch (error) {
      console.error('清空基础禁排时间失败:', error);
      return false;
    }
  }
};

/**
 * 实时禁排时间服务
 */
export const realTimeBlockedTimeService = {
  /**
   * 获取所有实时禁排时间
   * @param entityType 实体类型
   * @param entityId 实体 ID
   * @returns 实时禁排时间列表
   */
  async getAllRealTimeBlockedTimes(entityType?: string, entityId?: string): Promise<RealTimeBlockedTime[]> {
    try {
      const storedData = localStorage.getItem('music_scheduler_real_time_blocked_times');
      if (!storedData) return [];

      const blockedTimes: RealTimeBlockedTime[] = JSON.parse(storedData);
      
      // 按实体类型和 ID 筛选
      if (entityType && entityId) {
        return blockedTimes.filter(time => 
          time.entityType === entityType && time.entityId === entityId
        );
      }
      
      return blockedTimes;
    } catch (error) {
      console.error('获取实时禁排时间失败:', error);
      return [];
    }
  },

  /**
   * 创建实时禁排时间
   * @param blockedTime 实时禁排时间对象
   * @returns 创建的实时禁排时间对象
   */
  async createRealTimeBlockedTime(blockedTime: Omit<RealTimeBlockedTime, 'id' | 'createdAt'>): Promise<RealTimeBlockedTime> {
    try {
      const storedData = localStorage.getItem('music_scheduler_real_time_blocked_times');
      const blockedTimes: RealTimeBlockedTime[] = storedData ? JSON.parse(storedData) : [];

      const newBlockedTime: RealTimeBlockedTime = {
        ...blockedTime,
        id: `real-time-blocked-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString()
      };

      blockedTimes.push(newBlockedTime);
      localStorage.setItem('music_scheduler_real_time_blocked_times', JSON.stringify(blockedTimes));

      return newBlockedTime;
    } catch (error) {
      console.error('创建实时禁排时间失败:', error);
      throw error;
    }
  },

  /**
   * 批量创建实时禁排时间
   * @param blockedTimes 实时禁排时间列表
   * @returns 创建的实时禁排时间列表
   */
  async createMultipleRealTimeBlockedTimes(blockedTimes: Array<Omit<RealTimeBlockedTime, 'id' | 'createdAt'>>): Promise<RealTimeBlockedTime[]> {
    try {
      const storedData = localStorage.getItem('music_scheduler_real_time_blocked_times');
      const existingTimes: RealTimeBlockedTime[] = storedData ? JSON.parse(storedData) : [];

      const newBlockedTimes: RealTimeBlockedTime[] = blockedTimes.map(time => ({
        ...time,
        id: `real-time-blocked-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString()
      }));

      const updatedTimes = [...existingTimes, ...newBlockedTimes];
      localStorage.setItem('music_scheduler_real_time_blocked_times', JSON.stringify(updatedTimes));

      return newBlockedTimes;
    } catch (error) {
      console.error('批量创建实时禁排时间失败:', error);
      throw error;
    }
  },

  /**
   * 删除实时禁排时间
   * @param id 禁排时间 ID
   * @returns 是否删除成功
   */
  async deleteRealTimeBlockedTime(id: string): Promise<boolean> {
    try {
      const storedData = localStorage.getItem('music_scheduler_real_time_blocked_times');
      if (!storedData) return false;

      const blockedTimes: RealTimeBlockedTime[] = JSON.parse(storedData);
      const filteredTimes = blockedTimes.filter(time => time.id !== id);

      if (filteredTimes.length === blockedTimes.length) return false;

      localStorage.setItem('music_scheduler_real_time_blocked_times', JSON.stringify(filteredTimes));
      return true;
    } catch (error) {
      console.error('删除实时禁排时间失败:', error);
      return false;
    }
  },

  /**
   * 清空指定实体的实时禁排时间
   * @param entityType 实体类型
   * @param entityId 实体 ID
   * @returns 是否清空成功
   */
  async clearRealTimeBlockedTimes(entityType: string, entityId: string): Promise<boolean> {
    try {
      const storedData = localStorage.getItem('music_scheduler_real_time_blocked_times');
      if (!storedData) return true;

      const blockedTimes: RealTimeBlockedTime[] = JSON.parse(storedData);
      const filteredTimes = blockedTimes.filter(time => 
        time.entityType !== entityType || time.entityId !== entityId
      );

      localStorage.setItem('music_scheduler_real_time_blocked_times', JSON.stringify(filteredTimes));
      return true;
    } catch (error) {
      console.error('清空实时禁排时间失败:', error);
      return false;
    }
  }
};

/**
 * 优先级禁排时间服务
 */
export const priorityBlockedTimeService = {
  /**
   * 获取所有优先级禁排时间
   * @param priority 优先级
   * @param source 来源
   * @returns 优先级禁排时间列表
   */
  async getAllPriorityBlockedTimes(priority?: 'high' | 'medium' | 'low', source?: string): Promise<PriorityBlockedTime[]> {
    try {
      const storedData = localStorage.getItem('music_scheduler_priority_blocked_times');
      if (!storedData) return [];

      const blockedTimes: PriorityBlockedTime[] = JSON.parse(storedData);
      
      // 按优先级和来源筛选
      if (priority) {
        return blockedTimes.filter(time => time.priority === priority);
      }
      
      if (source) {
        return blockedTimes.filter(time => time.source === source);
      }
      
      return blockedTimes;
    } catch (error) {
      console.error('获取优先级禁排时间失败:', error);
      return [];
    }
  },

  /**
   * 创建优先级禁排时间
   * @param blockedTime 优先级禁排时间对象
   * @returns 创建的优先级禁排时间对象
   */
  async createPriorityBlockedTime(blockedTime: Omit<PriorityBlockedTime, 'id' | 'createdAt'>): Promise<PriorityBlockedTime> {
    try {
      const storedData = localStorage.getItem('music_scheduler_priority_blocked_times');
      const blockedTimes: PriorityBlockedTime[] = storedData ? JSON.parse(storedData) : [];

      const newBlockedTime: PriorityBlockedTime = {
        ...blockedTime,
        id: `priority-blocked-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString()
      };

      blockedTimes.push(newBlockedTime);
      localStorage.setItem('music_scheduler_priority_blocked_times', JSON.stringify(blockedTimes));

      return newBlockedTime;
    } catch (error) {
      console.error('创建优先级禁排时间失败:', error);
      throw error;
    }
  },

  /**
   * 批量创建优先级禁排时间
   * @param blockedTimes 优先级禁排时间列表
   * @returns 创建的优先级禁排时间列表
   */
  async createMultiplePriorityBlockedTimes(blockedTimes: Array<Omit<PriorityBlockedTime, 'id' | 'createdAt'>>): Promise<PriorityBlockedTime[]> {
    try {
      const storedData = localStorage.getItem('music_scheduler_priority_blocked_times');
      const existingTimes: PriorityBlockedTime[] = storedData ? JSON.parse(storedData) : [];

      const newBlockedTimes: PriorityBlockedTime[] = blockedTimes.map(time => ({
        ...time,
        id: `priority-blocked-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString()
      }));

      const updatedTimes = [...existingTimes, ...newBlockedTimes];
      localStorage.setItem('music_scheduler_priority_blocked_times', JSON.stringify(updatedTimes));

      return newBlockedTimes;
    } catch (error) {
      console.error('批量创建优先级禁排时间失败:', error);
      throw error;
    }
  },

  /**
   * 删除优先级禁排时间
   * @param id 禁排时间 ID
   * @returns 是否删除成功
   */
  async deletePriorityBlockedTime(id: string): Promise<boolean> {
    try {
      const storedData = localStorage.getItem('music_scheduler_priority_blocked_times');
      if (!storedData) return false;

      const blockedTimes: PriorityBlockedTime[] = JSON.parse(storedData);
      const filteredTimes = blockedTimes.filter(time => time.id !== id);

      if (filteredTimes.length === blockedTimes.length) return false;

      localStorage.setItem('music_scheduler_priority_blocked_times', JSON.stringify(filteredTimes));
      return true;
    } catch (error) {
      console.error('删除优先级禁排时间失败:', error);
      return false;
    }
  },

  /**
   * 清空指定优先级的禁排时间
   * @param priority 优先级
   * @returns 是否清空成功
   */
  async clearPriorityBlockedTimes(priority: 'high' | 'medium' | 'low'): Promise<boolean> {
    try {
      const storedData = localStorage.getItem('music_scheduler_priority_blocked_times');
      if (!storedData) return true;

      const blockedTimes: PriorityBlockedTime[] = JSON.parse(storedData);
      const filteredTimes = blockedTimes.filter(time => time.priority !== priority);

      localStorage.setItem('music_scheduler_priority_blocked_times', JSON.stringify(filteredTimes));
      return true;
    } catch (error) {
      console.error('清空优先级禁排时间失败:', error);
      return false;
    }
  }
};
