import type { LargeClassEntry } from '../types';

// 解析周次范围字符串，返回包含的周次数组
export const parseWeekRange = (weekRange: string): number[] => {
  const weeks: number[] = [];
  if (!weekRange) return weeks;
  
  // 分割多个周次范围
  const ranges = weekRange.split(/[,，;；]/).map(r => r.trim()).filter(r => r);
  
  for (const range of ranges) {
    // 处理单个周次，如 "1"
    if (/^\d+$/.test(range)) {
      weeks.push(parseInt(range));
    }
    // 处理周次范围，如 "1-5"
    else if (/-/.test(range)) {
      const [start, end] = range.split('-').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
      if (start && end && start <= end) {
        for (let i = start; i <= end; i++) {
          weeks.push(i);
        }
      }
    }
  }
  
  // 去重并排序
  return [...new Set(weeks)].sort((a, b) => a - b);
};

// 检查指定周次、星期、节次是否与通适大课冲突
export const isSlotBlockedByLargeClass = (
  largeClassEntries: LargeClassEntry[],
  week: number,
  dayOfWeek: number,
  period: number,
  className?: string
): boolean => {
  return largeClassEntries.some(entry => {
    // 如果指定了班级，只检查该班级的课程
    if (className && entry.class_name !== className) {
      return false;
    }
    
    // 检查星期是否匹配
    if (entry.day_of_week !== dayOfWeek) {
      return false;
    }
    
    // 检查节次是否匹配
    if (period < entry.period_start || period > entry.period_end) {
      return false;
    }
    
    // 检查周次是否匹配
    const weeks = parseWeekRange(entry.week_range || '');
    return weeks.includes(week);
  });
};

// 批量检查多个时间段是否与通适大课冲突
export const checkSlotsForLargeClassConflicts = (
  largeClassEntries: LargeClassEntry[],
  slots: Array<{ week: number; day: number; period: number }>,
  className?: string
): Array<{ week: number; day: number; period: number; isBlocked: boolean }> => {
  return slots.map(slot => ({
    ...slot,
    isBlocked: isSlotBlockedByLargeClass(
      largeClassEntries,
      slot.week,
      slot.day,
      slot.period,
      className
    )
  }));
};

// 生成通适大课的禁排时段
export const generateBlockedSlotsFromLargeClasses = (
  largeClassEntries: LargeClassEntry[]
): Array<{ week: number; day: number; period: number; reason: string }> => {
  const blockedSlots: Array<{ week: number; day: number; period: number; reason: string }> = [];
  
  largeClassEntries.forEach(entry => {
    const weeks = parseWeekRange(entry.week_range || '');
    
    weeks.forEach(week => {
      for (let period = entry.period_start; period <= entry.period_end; period++) {
        blockedSlots.push({
          week,
          day: entry.day_of_week,
          period,
          reason: `通适大课: ${entry.course_name} (${entry.class_name})`
        });
      }
    });
  });
  
  return blockedSlots;
};

// 缓存禁排时段，提高查询性能
class LargeClassBlockerService {
  private blockedSlotsCache: Map<string, boolean> = new Map();
  private lastCacheUpdate: Date = new Date(0);
  
  // 检查是否需要更新缓存
  private shouldUpdateCache(): boolean {
    const now = new Date();
    return now.getTime() - this.lastCacheUpdate.getTime() > 60000; // 1分钟缓存
  }
  
  // 清除缓存
  clearCache(): void {
    this.blockedSlotsCache.clear();
    this.lastCacheUpdate = new Date(0);
  }
  
  // 检查时段是否被通适大课占用
  isSlotBlocked(
    largeClassEntries: LargeClassEntry[],
    week: number,
    dayOfWeek: number,
    period: number,
    className?: string
  ): boolean {
    const cacheKey = `${week}-${dayOfWeek}-${period}-${className || 'all'}`;
    
    // 检查缓存
    if (this.blockedSlotsCache.has(cacheKey) && !this.shouldUpdateCache()) {
      return this.blockedSlotsCache.get(cacheKey) || false;
    }
    
    // 计算结果
    const isBlocked = isSlotBlockedByLargeClass(
      largeClassEntries,
      week,
      dayOfWeek,
      period,
      className
    );
    
    // 更新缓存
    this.blockedSlotsCache.set(cacheKey, isBlocked);
    this.lastCacheUpdate = new Date();
    
    return isBlocked;
  }
  
  // 批量检查时段
  checkMultipleSlots(
    largeClassEntries: LargeClassEntry[],
    slots: Array<{ week: number; day: number; period: number }>,
    className?: string
  ): Array<{ week: number; day: number; period: number; isBlocked: boolean }> {
    return slots.map(slot => ({
      ...slot,
      isBlocked: this.isSlotBlocked(
        largeClassEntries,
        slot.week,
        slot.day,
        slot.period,
        className
      )
    }));
  }
  
  // 获取指定班级的所有禁排时段
  getBlockedSlotsForClass(
    largeClassEntries: LargeClassEntry[],
    className: string
  ): Array<{ week: number; day: number; period: number; reason: string }> {
    const blockedSlots: Array<{ week: number; day: number; period: number; reason: string }> = [];
    
    largeClassEntries.forEach(entry => {
      if (entry.class_name === className) {
        const weeks = parseWeekRange(entry.week_range || '');
        
        weeks.forEach(week => {
          for (let period = entry.period_start; period <= entry.period_end; period++) {
            blockedSlots.push({
              week,
              day: entry.day_of_week,
              period,
              reason: `通适大课: ${entry.course_name}`
            });
          }
        });
      }
    });
    
    return blockedSlots;
  }
}

export const largeClassBlockerService = new LargeClassBlockerService();
