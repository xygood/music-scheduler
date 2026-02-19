/**
 * 时间可用性检查服务
 * 实现分层时间可用性检查逻辑
 */

import { TimeAvailability } from '../types/blockedTime';
import { blockedTimeService, priorityBlockedTimeService } from './blockedTimeService';

/**
 * 时间可用性检查服务
 */
export const timeAvailabilityService = {
  /**
   * 检查时间是否可用
   * @param academicYear 学年
   * @param semesterLabel 学期标签
   * @param week 周次
   * @param day 星期
   * @param period 节次
   * @param entities 相关实体
   * @returns 时间可用性信息
   */
  async checkTimeAvailability(
    academicYear: string,
    semesterLabel: string,
    week: number,
    day: number,
    period: number,
    entities?: {
      teacherId?: string;
      classroomId?: string;
      classId?: string;
      studentId?: string;
    }
  ): Promise<TimeAvailability> {
    try {
      // 分层检查：先检查高优先级，再检查中优先级，最后检查低优先级
      
      // 1. 检查高优先级禁排时间（周次配置和通适大课）
      const highPriorityBlockedTimes = await priorityBlockedTimeService.getAllPriorityBlockedTimes('high');
      const highPriorityConflict = highPriorityBlockedTimes.find(time => 
        this.isTimeConflict(time, week, day, period)
      );
      
      if (highPriorityConflict) {
        return {
          available: false,
          reason: `高优先级禁排: ${highPriorityConflict.reason}`,
          conflictSource: highPriorityConflict.source,
          priority: 'high'
        };
      }
      
      // 2. 检查中优先级禁排时间（专业大课）
      const mediumPriorityBlockedTimes = await priorityBlockedTimeService.getAllPriorityBlockedTimes('medium');
      const mediumPriorityConflict = mediumPriorityBlockedTimes.find(time => 
        this.isTimeConflict(time, week, day, period)
      );
      
      if (mediumPriorityConflict) {
        return {
          available: false,
          reason: `中优先级禁排: ${mediumPriorityConflict.reason}`,
          conflictSource: mediumPriorityConflict.source,
          priority: 'medium'
        };
      }
      
      // 3. 检查低优先级禁排时间（专业小课）
      const lowPriorityBlockedTimes = await priorityBlockedTimeService.getAllPriorityBlockedTimes('low');
      const lowPriorityConflict = lowPriorityBlockedTimes.find(time => 
        this.isTimeConflict(time, week, day, period)
      );
      
      if (lowPriorityConflict) {
        return {
          available: false,
          reason: `低优先级禁排: ${lowPriorityConflict.reason}`,
          conflictSource: lowPriorityConflict.source,
          priority: 'low'
        };
      }
      
      // 4. 检查基础禁排时间（周次配置中的手动禁排）
      const baseBlockedTimes = await blockedTimeService.getAllBaseBlockedTimes(academicYear, semesterLabel);
      const baseConflict = baseBlockedTimes.find(time => 
        this.isBaseTimeConflict(time, week, day, period)
      );
      
      if (baseConflict) {
        return {
          available: false,
          reason: `基础禁排: ${baseConflict.reason || '手动配置的禁排时间'}`,
          conflictSource: 'base_blocked_time',
          priority: 'high'
        };
      }
      
      // 5. 检查相关实体的冲突（教师、教室、班级、学生）
      if (entities) {
        const entityConflict = await this.checkEntityConflicts(entities, week, day, period);
        if (!entityConflict.available) {
          return entityConflict;
        }
      }
      
      // 时间可用
      return {
        available: true,
        reason: '时间可用',
        conflictSource: null,
        priority: null
      };
    } catch (error) {
      console.error('检查时间可用性失败:', error);
      return {
        available: false,
        reason: '检查失败',
        conflictSource: 'system',
        priority: 'system'
      };
    }
  },
  
  /**
   * 批量检查时间可用性
   * @param timeSlots 时间槽列表
   * @param entities 相关实体
   * @returns 时间可用性信息列表
   */
  async checkMultipleTimeSlots(
    timeSlots: Array<{
      academicYear: string;
      semesterLabel: string;
      week: number;
      day: number;
      period: number;
    }>,
    entities?: {
      teacherId?: string;
      classroomId?: string;
      classId?: string;
      studentId?: string;
    }
  ): Promise<Array<{
    timeSlot: {
      academicYear: string;
      semesterLabel: string;
      week: number;
      day: number;
      period: number;
    };
    availability: TimeAvailability;
  }>> {
    try {
      const results = await Promise.all(
        timeSlots.map(async (slot) => ({
          timeSlot: slot,
          availability: await this.checkTimeAvailability(
            slot.academicYear,
            slot.semesterLabel,
            slot.week,
            slot.day,
            slot.period,
            entities
          )
        }))
      );
      
      return results;
    } catch (error) {
      console.error('批量检查时间可用性失败:', error);
      return timeSlots.map(slot => ({
        timeSlot: slot,
        availability: {
          available: false,
          reason: '检查失败',
          conflictSource: 'system',
          priority: 'system'
        }
      }));
    }
  },
  
  /**
   * 检查实体冲突
   * @param entities 实体信息
   * @param week 周次
   * @param day 星期
   * @param period 节次
   * @returns 时间可用性信息
   */
  async checkEntityConflicts(
    entities: {
      teacherId?: string;
      classroomId?: string;
      classId?: string;
      studentId?: string;
    },
    week: number,
    day: number,
    period: number
  ): Promise<TimeAvailability> {
    try {
      // 这里可以实现具体的实体冲突检查逻辑
      // 例如检查教师是否有其他课程，教室是否被占用等
      
      return {
        available: true,
        reason: '实体无冲突',
        conflictSource: null,
        priority: null
      };
    } catch (error) {
      console.error('检查实体冲突失败:', error);
      return {
        available: false,
        reason: '实体冲突检查失败',
        conflictSource: 'system',
        priority: 'system'
      };
    }
  },
  
  /**
   * 检查时间是否冲突
   * @param blockedTime 禁排时间
   * @param week 周次
   * @param day 星期
   * @param period 节次
   * @returns 是否冲突
   */
  isTimeConflict(
    blockedTime: {
      weekRange: string;
      day: number;
      periods: number[];
    },
    week: number,
    day: number,
    period: number
  ): boolean {
    // 检查星期是否匹配
    if (blockedTime.day !== day) {
      return false;
    }
    
    // 检查节次是否匹配
    if (!blockedTime.periods.includes(period)) {
      return false;
    }
    
    // 检查周次是否在范围内
    return this.isWeekInRange(blockedTime.weekRange, week);
  },
  
  /**
   * 检查基础禁排时间是否冲突
   * @param blockedTime 基础禁排时间
   * @param week 周次
   * @param day 星期
   * @param period 节次
   * @returns 是否冲突
   */
  isBaseTimeConflict(
    blockedTime: {
      weekRange: string;
      day: number;
      periods: number[];
    },
    week: number,
    day: number,
    period: number
  ): boolean {
    return this.isTimeConflict(blockedTime, week, day, period);
  },
  
  /**
   * 检查周次是否在范围内
   * @param weekRange 周次范围字符串
   * @param week 周次
   * @returns 是否在范围内
   */
  isWeekInRange(weekRange: string, week: number): boolean {
    // 解析周次范围
    if (weekRange.includes('-')) {
      const [start, end] = weekRange.split('-').map(Number);
      return week >= start && week <= end;
    } else if (weekRange.includes(',')) {
      const weeks = weekRange.split(',').map(Number);
      return weeks.includes(week);
    } else {
      return parseInt(weekRange) === week;
    }
  }
};
