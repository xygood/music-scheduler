/**
 * 通适大课禁排时间服务
 * 实现从通适大课数据生成禁排时间的逻辑
 */

import { priorityBlockedTimeService } from './blockedTimeService';
import { largeClassScheduleService } from './localStorage';

/**
 * 通适大课禁排时间服务
 */
export const largeClassBlockedTimeService = {
  /**
   * 从通适大课数据生成禁排时间
   * @param academicYear 学年
   * @param semesterLabel 学期标签
   * @returns 生成的禁排时间数量
   */
  async generateBlockedTimesFromLargeClasses(
    academicYear: string,
    semesterLabel: string
  ): Promise<number> {
    try {
      // 获取通适大课数据
      const largeClasses = await largeClassScheduleService.getLargeClassSchedule(academicYear, semesterLabel);
      
      if (!largeClasses || largeClasses.length === 0) {
        return 0;
      }
      
      // 清空现有的通适大课禁排时间
      await this.clearLargeClassBlockedTimes();
      
      // 生成禁排时间
      const blockedTimeData = largeClasses.map(classItem => {
        // 解析周次范围
        let weekRange = { startWeek: 1, endWeek: 16 };
        if (classItem.week_range) {
          const match = classItem.week_range.match(/(\d+)[-–](\d+)/);
          if (match) {
            weekRange = {
              startWeek: parseInt(match[1]),
              endWeek: parseInt(match[2])
            };
          }
        }
        
        return {
          priority: 'high' as const,
          source: 'large_class' as const,
          entityType: 'class' as const,
          entityId: classItem.id,
          entityName: classItem.class_name,
          academicYear,
          semesterLabel,
          weekRange,
          dayOfWeek: classItem.day_of_week || 1,
          startPeriod: classItem.period_start || 1,
          endPeriod: classItem.period_end || 1,
          reason: `${classItem.course_name} - ${classItem.class_name}`
        };
      });
      
      // 过滤掉无效数据
      const validBlockedTimeData = blockedTimeData.filter(data => 
        data.dayOfWeek > 0 && data.startPeriod > 0 && data.endPeriod >= data.startPeriod
      );
      
      // 批量创建优先级禁排时间
      if (validBlockedTimeData.length > 0) {
        await priorityBlockedTimeService.createMultiplePriorityBlockedTimes(validBlockedTimeData);
      }
      
      return validBlockedTimeData.length;
    } catch (error) {
      console.error('从通适大课生成禁排时间失败:', error);
      return 0;
    }
  },
  
  /**
   * 清空通适大课禁排时间
   * @returns 是否清空成功
   */
  async clearLargeClassBlockedTimes(): Promise<boolean> {
    try {
      // 获取所有优先级禁排时间
      const allBlockedTimes = await priorityBlockedTimeService.getAllPriorityBlockedTimes();
      
      // 筛选出通适大课的禁排时间
      const largeClassBlockedTimes = allBlockedTimes.filter(time => 
        time.source === 'large_class'
      );
      
      // 逐个删除
      for (const time of largeClassBlockedTimes) {
        await priorityBlockedTimeService.deletePriorityBlockedTime(time.id);
      }
      
      return true;
    } catch (error) {
      console.error('清空通适大课禁排时间失败:', error);
      return false;
    }
  },
  
  /**
   * 解析节次字符串为数组
   * @param periodStr 节次字符串
   * @returns 节次数组
   */
  parsePeriods(periodStr: string): number[] {
    try {
      // 处理如 "1-2" 或 "1,2,3" 的格式
      if (periodStr.includes('-')) {
        const [start, end] = periodStr.split('-').map(Number);
        const periods: number[] = [];
        for (let i = start; i <= end; i++) {
          periods.push(i);
        }
        return periods;
      } else if (periodStr.includes(',')) {
        return periodStr.split(',').map(Number);
      } else {
        return [Number(periodStr)];
      }
    } catch (error) {
      console.error('解析节次失败:', error);
      return [];
    }
  },
  
  /**
   * 验证通适大课数据并生成禁排时间
   * @param academicYear 学年
   * @param semesterLabel 学期标签
   * @returns 验证结果
   */
  async validateAndGenerateBlockedTimes(
    academicYear: string,
    semesterLabel: string
  ): Promise<{
    success: boolean;
    message: string;
    generatedCount: number;
  }> {
    try {
      const generatedCount = await this.generateBlockedTimesFromLargeClasses(academicYear, semesterLabel);
      
      if (generatedCount === 0) {
        return {
          success: false,
          message: '没有找到通适大课数据',
          generatedCount: 0
        };
      }
      
      return {
        success: true,
        message: `成功生成 ${generatedCount} 条通适大课禁排时间`,
        generatedCount
      };
    } catch (error) {
      console.error('验证并生成通适大课禁排时间失败:', error);
      return {
        success: false,
        message: '生成禁排时间失败',
        generatedCount: 0
      };
    }
  },
  
  /**
   * 获取通适大课禁排时间统计
   * @returns 统计信息
   */
  async getLargeClassBlockedTimeStats(): Promise<{
    total: number;
    byCourse: Record<string, number>;
  }> {
    try {
      // 获取所有优先级禁排时间
      const allBlockedTimes = await priorityBlockedTimeService.getAllPriorityBlockedTimes();
      
      // 筛选出通适大课的禁排时间
      const largeClassBlockedTimes = allBlockedTimes.filter(time => 
        time.source === 'large_class'
      );
      
      // 按课程统计
      const byCourse: Record<string, number> = {};
      largeClassBlockedTimes.forEach(time => {
        const courseName = time.reason.split(' - ')[0];
        byCourse[courseName] = (byCourse[courseName] || 0) + 1;
      });
      
      return {
        total: largeClassBlockedTimes.length,
        byCourse
      };
    } catch (error) {
      console.error('获取通适大课禁排时间统计失败:', error);
      return {
        total: 0,
        byCourse: {}
      };
    }
  }
};
