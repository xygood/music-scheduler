/**
 * 禁排时间数据迁移工具
 * 将现有的禁排时间数据（周次配置中的禁排时段和通适大课数据）提取到新的禁排时间系统中
 */

import { blockedTimeService, priorityBlockedTimeService } from '../services/blockedTimeService';
import { largeClassBlockedTimeService } from '../services/largeClassBlockedTimeService';
import { largeClassScheduleService } from '../services/localStorage';

/**
 * 从周次配置的禁排时段迁移数据
 * @param academicYear 学年
 * @param semesterLabel 学期标签
 * @returns 迁移的记录数
 */
export const migrateBlockedSlots = async (academicYear: string, semesterLabel: string): Promise<number> => {
  try {
    console.log('开始迁移周次配置的禁排时段...');
    
    // 从旧系统获取禁排时段数据
    const blockedSlotsData = localStorage.getItem('music_scheduler_blocked_slots');
    if (!blockedSlotsData) {
      console.log('没有找到旧的禁排时段数据');
      return 0;
    }
    
    const blockedSlots = JSON.parse(blockedSlotsData);
    const filteredSlots = blockedSlots.filter((slot: any) => 
      slot.academic_year === academicYear && slot.semester_label === semesterLabel
    );
    
    console.log(`找到 ${filteredSlots.length} 条禁排时段记录`);
    
    // 清空现有的基础禁排时间
    await blockedTimeService.clearBaseBlockedTimes(academicYear, semesterLabel);
    
    // 迁移数据
    let migratedCount = 0;
    
    for (const slot of filteredSlots) {
      try {
        // 转换为新的格式
        let weekRange = '';
        let day = slot.day_of_week || 1;
        let periods: number[] = [];
        
        if (slot.type === 'recurring') {
          // 每周循环类型
          weekRange = '1-17'; // 默认全学期
          for (let i = slot.start_period; i <= slot.end_period; i++) {
            periods.push(i);
          }
        } else if (slot.type === 'specific') {
          // 特定周次类型
          if (slot.week_number) {
            weekRange = slot.week_number.toString();
          } else if (slot.specific_week_days) {
            const weeks = [...new Set(slot.specific_week_days.map((wd: any) => wd.week))];
            weekRange = weeks.join(',');
          } else {
            weekRange = '1-17';
          }
          for (let i = slot.start_period; i <= slot.end_period; i++) {
            periods.push(i);
          }
        }
        
        // 创建基础禁排时间
        await blockedTimeService.createBaseBlockedTime({
          academicYear,
          semesterLabel,
          weekRange,
          day,
          periods,
          reason: slot.reason || '从旧系统迁移'
        });
        
        migratedCount++;
      } catch (error) {
        console.error('迁移禁排时段失败:', error);
      }
    }
    
    console.log(`成功迁移 ${migratedCount} 条禁排时段记录`);
    return migratedCount;
  } catch (error) {
    console.error('迁移禁排时段失败:', error);
    return 0;
  }
};

/**
 * 从通适大课数据迁移禁排时间
 * @param academicYear 学年
 * @param semesterLabel 学期标签
 * @returns 迁移的记录数
 */
export const migrateLargeClassBlockedTimes = async (academicYear: string, semesterLabel: string): Promise<number> => {
  try {
    console.log('开始迁移通适大课禁排时间...');
    
    // 尝试不同的学期标签格式
    const formats = [
      semesterLabel,
      semesterLabel.replace(`${academicYear}-`, ''),
      '2025-2026-2', // 尝试硬编码的格式
      '2025-2026-1'
    ];
    
    let totalGenerated = 0;
    
    for (const format of formats) {
      console.log('尝试学期标签格式:', format);
      try {
        // 生成通适大课禁排时间
        const result = await largeClassBlockedTimeService.validateAndGenerateBlockedTimes(academicYear, format);
        
        if (result.success) {
          console.log(`成功迁移 ${result.generatedCount} 条通适大课禁排时间记录（格式: ${format}）`);
          totalGenerated += result.generatedCount;
          // 如果成功生成了数据，就停止尝试其他格式
          if (result.generatedCount > 0) {
            break;
          }
        } else {
          console.log('迁移通适大课禁排时间失败:', result.message);
        }
      } catch (error) {
        console.error(`尝试格式 ${format} 时失败:`, error);
      }
    }
    
    return totalGenerated;
  } catch (error) {
    console.error('迁移通适大课禁排时间失败:', error);
    return 0;
  }
};

/**
 * 执行完整的数据迁移
 * @param academicYear 学年
 * @param semesterLabel 学期标签
 * @returns 迁移结果
 */
export const migrateAllBlockedTimes = async (academicYear: string, semesterLabel: string): Promise<{
  blockedSlots: number;
  largeClassBlockedTimes: number;
  total: number;
}> => {
  try {
    console.log('开始执行完整的数据迁移...');
    
    // 迁移周次配置的禁排时段
    const blockedSlotsCount = await migrateBlockedSlots(academicYear, semesterLabel);
    
    // 迁移通适大课禁排时间
    const largeClassBlockedTimesCount = await migrateLargeClassBlockedTimes(academicYear, semesterLabel);
    
    const total = blockedSlotsCount + largeClassBlockedTimesCount;
    
    console.log(`数据迁移完成: 共迁移 ${total} 条记录`);
    console.log(`- 周次配置禁排时段: ${blockedSlotsCount} 条`);
    console.log(`- 通适大课禁排时间: ${largeClassBlockedTimesCount} 条`);
    
    return {
      blockedSlots: blockedSlotsCount,
      largeClassBlockedTimes: largeClassBlockedTimesCount,
      total
    };
  } catch (error) {
    console.error('执行完整的数据迁移失败:', error);
    return {
      blockedSlots: 0,
      largeClassBlockedTimes: 0,
      total: 0
    };
  }
};

/**
 * 检查迁移状态
 * @returns 迁移状态
 */
export const checkMigrationStatus = (): {
  hasOldBlockedSlots: boolean;
  hasLargeClassData: boolean;
  hasNewBlockedTimes: boolean;
  hasPriorityBlockedTimes: boolean;
} => {
  try {
    const hasOldBlockedSlots = !!localStorage.getItem('music_scheduler_blocked_slots');
    const hasLargeClassData = !!localStorage.getItem('music_scheduler_large_class_schedule');
    const hasNewBlockedTimes = !!localStorage.getItem('music_scheduler_blocked_slots'); // 新系统使用相同的存储键
    const hasPriorityBlockedTimes = !!localStorage.getItem('music_scheduler_priority_blocked_times');
    
    return {
      hasOldBlockedSlots,
      hasLargeClassData,
      hasNewBlockedTimes,
      hasPriorityBlockedTimes
    };
  } catch (error) {
    console.error('检查迁移状态失败:', error);
    return {
      hasOldBlockedSlots: false,
      hasLargeClassData: false,
      hasNewBlockedTimes: false,
      hasPriorityBlockedTimes: false
    };
  }
};
