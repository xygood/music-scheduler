// 统一时间屏蔽管理器
import { supabase } from './supabase';
import { generalCourseService } from './generalCourseService';
import { majorCourseService } from './majorCourseService';

export interface TimeBlock {
  id: string;
  block_type: 'general_course' | 'major_course' | 'group_course' | 'custom';
  weekday: number;
  time_slot: string;
  weeks_pattern: string;
  course_name: string;
  teacher_name: string;
  class_name?: string;
  reason?: string;
  priority: number;
  semester: string;
  is_active: boolean;
  created_at: string;
  created_by: string;
}

export interface TimeSlot {
  weekday: number;
  time_slot: string;
  available: boolean;
  blocks: TimeBlock[];
}

export interface TimeConstraints {
  blocked_times: TimeBlock[];
  available_times: TimeSlot[];
  statistics: {
    total_slots: number;
    blocked_slots: number;
    available_slots: number;
    occupancy_rate: number;
  };
}

class TimeBlockerService {
  private blockedTimesCache: TimeBlock[] = [];

  // 添加时间屏蔽
  async addTimeBlock(
    blockType: TimeBlock['block_type'],
    weekday: number,
    timeSlot: string,
    weeksPattern: string,
    courseName: string,
    teacherName: string,
    reason?: string,
    priority: number = 50
  ): Promise<string> {
    try {
      const timeBlock: Omit<TimeBlock, 'id' | 'created_at'> = {
        block_type: blockType,
        weekday,
        time_slot: timeSlot,
        weeks_pattern: weeksPattern,
        course_name: courseName,
        teacher_name: teacherName,
        reason,
        priority,
        semester: this.getCurrentSemester(),
        is_active: true,
        created_by: 'current_user' // 实际项目中应该从认证上下文获取
      };

      const { data, error } = await supabase
        .from('time_block_records')
        .insert(timeBlock)
        .select()
        .single();

      if (error) throw error;

      // 更新缓存
      this.blockedTimesCache.push(data);
      
      console.log(`时间屏蔽已添加: ${courseName} - 周${weekday} ${timeSlot}节`);
      return data.id;
    } catch (error) {
      console.error('添加时间屏蔽失败:', error);
      throw error;
    }
  }

  // 批量添加时间屏蔽
  async addTimeBlocks(blocks: Omit<TimeBlock, 'id' | 'created_at' | 'created_by'>[]): Promise<string[]> {
    try {
      const blocksWithMetadata = blocks.map(block => ({
        ...block,
        semester: this.getCurrentSemester(),
        is_active: true,
        created_by: 'current_user'
      }));

      const { data, error } = await supabase
        .from('time_block_records')
        .insert(blocksWithMetadata)
        .select('id');

      if (error) throw error;

      const ids = data.map(item => item.id);
      
      // 更新缓存
      this.blockedTimesCache.push(...data);
      
      console.log(`批量添加了 ${ids.length} 个时间屏蔽`);
      return ids;
    } catch (error) {
      console.error('批量添加时间屏蔽失败:', error);
      throw error;
    }
  }

  // 检查时间是否被占用
  isTimeBlocked(
    weekday: number,
    timeSlot: string,
    week?: number
  ): { blocked: boolean; block?: TimeBlock; reason?: string } {
    const blockedTime = this.blockedTimesCache.find(block =>
      block.is_active &&
      block.weekday === weekday &&
      block.time_slot === timeSlot &&
      (!week || this.isWeekInRange(week, block.weeks_pattern))
    );

    if (blockedTime) {
      return {
        blocked: true,
        block: blockedTime,
        reason: blockedTime.reason || `${blockedTime.block_type}: ${blockedTime.course_name}`
      };
    }

    return { blocked: false };
  }

  // 获取指定时间的冲突信息
  getTimeConflicts(
    weekday: number,
    timeSlot: string,
    week?: number
  ): TimeBlock[] {
    return this.blockedTimesCache.filter(block =>
      block.is_active &&
      block.weekday === weekday &&
      block.time_slot === timeSlot &&
      (!week || this.isWeekInRange(week, block.weeks_pattern))
    );
  }

  // 获取所有可用时间
  getAvailableTimes(constraints?: {
    excludeTypes?: TimeBlock['block_type'][];
    minPriority?: number;
  }): TimeSlot[] {
    const allTimeSlots = this.generateTimeGrid();
    
    return allTimeSlots.map(slot => {
      const conflicts = this.getTimeConflicts(slot.weekday, slot.time_slot);
      
      // 应用约束条件
      let filteredConflicts = conflicts;
      if (constraints?.excludeTypes) {
        filteredConflicts = conflicts.filter(c => !constraints.excludeTypes!.includes(c.block_type));
      }
      if (constraints?.minPriority) {
        filteredConflicts = filteredConflicts.filter(c => c.priority >= constraints.minPriority!);
      }

      return {
        ...slot,
        available: filteredConflicts.length === 0,
        blocks: filteredConflicts
      };
    });
  }

  // 生成完整时间网格
  private generateTimeGrid(): TimeSlot[] {
    const timeSlots: TimeSlot[] = [];
    
    // 周一到周五
    for (let weekday = 1; weekday <= 5; weekday++) {
      // 上午1-2节
      timeSlots.push({ weekday, time_slot: '1-2', available: true, blocks: [] });
      timeSlots.push({ weekday, time_slot: '3-4', available: true, blocks: [] });
      
      // 下午5-6节
      timeSlots.push({ weekday, time_slot: '5-6', available: true, blocks: [] });
      
      // 晚上7-8节
      timeSlots.push({ weekday, time_slot: '7-8', available: true, blocks: [] });
    }
    
    return timeSlots;
  }

  // 检查周次是否在范围内
  private isWeekInRange(week: number, weeksPattern: string): boolean {
    const pattern = weeksPattern.replace(/周/g, '').trim();
    
    if (pattern.includes(',')) {
      // 处理间断模式，如 "1,3,5,7"
      const weeks = pattern.split(',').map(w => parseInt(w.trim()));
      return weeks.includes(week);
    } else if (pattern.includes('-')) {
      // 处理连续模式，如 "1-16"
      const [start, end] = pattern.split('-').map(w => parseInt(w.trim()));
      return week >= start && week <= end;
    } else if (pattern.includes('(')) {
      // 处理单双周模式，如 "1-16(单)"
      const basePattern = pattern.replace(/\(.*\)/, '');
      const modifier = pattern.match(/\((.*)\)/)?.[1];
      
      let weeks: number[] = [];
      if (basePattern.includes('-')) {
        const [start, end] = basePattern.split('-').map(w => parseInt(w.trim()));
        for (let w = start; w <= end; w++) {
          weeks.push(w);
        }
      } else {
        weeks = [parseInt(basePattern)];
      }
      
      if (modifier === '单') {
        return weeks.filter(w => w % 2 === 1).includes(week);
      } else if (modifier === '双') {
        return weeks.filter(w => w % 2 === 0).includes(week);
      }
    }
    
    return false;
  }

  // 移除时间屏蔽
  async removeTimeBlock(blockId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('time_block_records')
        .update({ is_active: false })
        .eq('id', blockId);

      if (error) throw error;

      // 更新缓存
      const index = this.blockedTimesCache.findIndex(block => block.id === blockId);
      if (index !== -1) {
        this.blockedTimesCache.splice(index, 1);
      }
      
      console.log(`时间屏蔽已移除: ${blockId}`);
    } catch (error) {
      console.error('移除时间屏蔽失败:', error);
      throw error;
    }
  }

  // 清空指定类型的时间屏蔽
  async clearTimeBlocks(blockType: TimeBlock['block_type']): Promise<void> {
    try {
      const { error } = await supabase
        .from('time_block_records')
        .update({ is_active: false })
        .eq('block_type', blockType)
        .eq('semester', this.getCurrentSemester());

      if (error) throw error;

      // 更新缓存
      this.blockedTimesCache = this.blockedTimesCache.filter(block => 
        block.block_type !== blockType || block.semester !== this.getCurrentSemester()
      );
      
      console.log(`已清空 ${blockType} 类型的时间屏蔽`);
    } catch (error) {
      console.error('清空时间屏蔽失败:', error);
      throw error;
    }
  }

  // 加载所有时间屏蔽
  async loadTimeBlocks(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('time_block_records')
        .select('*')
        .eq('is_active', true)
        .eq('semester', this.getCurrentSemester())
        .order('weekday', { ascending: true });

      if (error) throw error;

      this.blockedTimesCache = data || [];
      console.log(`已加载 ${this.blockedTimesCache.length} 个时间屏蔽记录`);
    } catch (error) {
      console.error('加载时间屏蔽失败:', error);
    }
  }

  // 获取时间约束条件
  async getTimeConstraints(): Promise<TimeConstraints> {
    if (this.blockedTimesCache.length === 0) {
      await this.loadTimeBlocks();
    }

    const availableTimes = this.getAvailableTimes();
    const blockedSlots = availableTimes.filter(slot => !slot.available).length;
    const totalSlots = availableTimes.length;
    
    return {
      blocked_times: this.blockedTimesCache,
      available_times: availableTimes,
      statistics: {
        total_slots: totalSlots,
        blocked_slots: blockedSlots,
        available_slots: totalSlots - blockedSlots,
        occupancy_rate: totalSlots > 0 ? Math.round((blockedSlots / totalSlots) * 100) : 0
      }
    };
  }

  // 为小组课导出屏蔽时间
  async exportBlockedTimesForGroupCourses(): Promise<TimeBlock[]> {
    const groupCourseBlocks = this.blockedTimesCache.filter(block => 
      block.block_type === 'general_course' || block.block_type === 'major_course'
    );

    // 转换为小组课系统能理解的格式
    return groupCourseBlocks.map(block => ({
      ...block,
      reason: `${block.block_type === 'general_course' ? '通适大课' : '专业大课'}: ${block.course_name}`,
      priority: block.block_type === 'general_course' ? 100 : 80
    }));
  }

  // 获取屏蔽时间概览
  getBlockedTimesOverview(): {
    by_type: Record<TimeBlock['block_type'], number>;
    by_weekday: Record<number, number>;
    top_reasons: Array<{ reason: string; count: number }>;
  } {
    const byType: Record<TimeBlock['block_type'], number> = {
      general_course: 0,
      major_course: 0,
      group_course: 0,
      custom: 0
    };

    const byWeekday: Record<number, number> = {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0
    };

    const reasonCounts: Map<string, number> = new Map();

    for (const block of this.blockedTimesCache) {
      byType[block.block_type]++;
      byWeekday[block.weekday]++;
      
      const reason = block.reason || `${block.block_type}: ${block.course_name}`;
      reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
    }

    const topReasons = Array.from(reasonCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([reason, count]) => ({ reason, count }));

    return { by_type: byType, by_weekday: byWeekday, top_reasons: topReasons };
  }

  // 获取当前学期
  private getCurrentSemester(): string {
    const now = new Date();
    const month = now.getMonth() + 1;
    const academicYear = month >= 8 ? `${now.getFullYear()}-${now.getFullYear() + 1}` : `${now.getFullYear() - 1}-${now.getFullYear()}`;
    const semester = month >= 8 ? '1' : '2';
    return `${academicYear}-${semester}`;
  }

  // 获取所有屏蔽记录
  getAllBlockedTimes(): TimeBlock[] {
    return this.blockedTimesCache;
  }

  // 检查是否可以安排课程
  canScheduleCourse(
    weekday: number,
    timeSlot: string,
    minPriority: number = 50
  ): { canSchedule: boolean; conflicts: TimeBlock[] } {
    const conflicts = this.blockedTimesCache.filter(block =>
      block.is_active &&
      block.weekday === weekday &&
      block.time_slot === timeSlot &&
      block.priority >= minPriority
    );

    return {
      canSchedule: conflicts.length === 0,
      conflicts
    };
  }
}

export const timeBlockerService = new TimeBlockerService();