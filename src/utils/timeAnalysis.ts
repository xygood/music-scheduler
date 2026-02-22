/**
 * 时间分析工具
 * 用于计算教师和班级的可用时间窗口
 */

import { 
  TimeSlot, 
  TimeWindow, 
  BlockedByInfo,
  DAY_NAMES, 
  MAX_PERIODS_PER_DAY,
  MAX_WEEKS_PER_SEMESTER 
} from '../types/prioritySuggestion';

export interface TimeBlock {
  dayOfWeek: number;
  periodStart: number;
  periodEnd: number;
  weekStart: number;
  weekEnd: number;
  reason: string;
  type: 'large_class' | 'blocked_time' | 'scheduled' | 'teacher_unavailable';
  priority: 'high' | 'medium' | 'low';
  source: string;
}

export function initializeTimeGrid(): TimeWindow[][] {
  const grid: TimeWindow[][] = [];
  for (let day = 0; day < 7; day++) {
    grid[day] = [];
    for (let period = 0; period < MAX_PERIODS_PER_DAY; period++) {
      grid[day][period] = {
        dayOfWeek: day + 1,
        period: period + 1,
        isAvailable: true,
        blockedBy: []
      };
    }
  }
  return grid;
}

export function applyTimeBlocks(
  grid: TimeWindow[][],
  blocks: TimeBlock[]
): TimeWindow[][] {
  const newGrid = grid.map(day => day.map(slot => ({ ...slot, blockedBy: [...slot.blockedBy] })));
  
  for (const block of blocks) {
    const dayIndex = block.dayOfWeek - 1;
    if (dayIndex < 0 || dayIndex >= 7) continue;
    
    for (let period = block.periodStart - 1; period < block.periodEnd && period < MAX_PERIODS_PER_DAY; period++) {
      if (period < 0) continue;
      
      newGrid[dayIndex][period].isAvailable = false;
      newGrid[dayIndex][period].blockedBy.push({
        type: block.type,
        reason: block.reason,
        priority: block.priority,
        source: block.source
      });
    }
  }
  
  return newGrid;
}

export function getAvailableSlots(grid: TimeWindow[][]): TimeSlot[] {
  const slots: TimeSlot[] = [];
  
  for (let day = 0; day < 7; day++) {
    let periodStart = -1;
    
    for (let period = 0; period <= MAX_PERIODS_PER_DAY; period++) {
      const isEnd = period === MAX_PERIODS_PER_DAY;
      const slot = !isEnd ? grid[day][period] : null;
      
      if (slot?.isAvailable && periodStart === -1) {
        periodStart = period;
      } else if ((!slot?.isAvailable || isEnd) && periodStart !== -1) {
        slots.push({
          dayOfWeek: day + 1,
          periodStart: periodStart + 1,
          periodEnd: isEnd ? MAX_PERIODS_PER_DAY : period,
          weekRange: { start: 1, end: MAX_WEEKS_PER_SEMESTER },
          quality: 'good'
        });
        periodStart = -1;
      }
    }
  }
  
  return slots;
}

export function intersectTimeGrids(
  grid1: TimeWindow[][],
  grid2: TimeWindow[][]
): TimeWindow[][] {
  const result: TimeWindow[][] = [];
  
  for (let day = 0; day < 7; day++) {
    result[day] = [];
    for (let period = 0; period < MAX_PERIODS_PER_DAY; period++) {
      const slot1 = grid1[day][period];
      const slot2 = grid2[day][period];
      
      result[day][period] = {
        dayOfWeek: day + 1,
        period: period + 1,
        isAvailable: slot1.isAvailable && slot2.isAvailable,
        blockedBy: [...slot1.blockedBy, ...slot2.blockedBy]
      };
    }
  }
  
  return result;
}

export function countAvailableSlots(grid: TimeWindow[][]): number {
  let count = 0;
  for (let day = 0; day < 7; day++) {
    for (let period = 0; period < MAX_PERIODS_PER_DAY; period++) {
      if (grid[day][period].isAvailable) {
        count++;
      }
    }
  }
  return count;
}

export function calculateScarcityScore(
  availableCount: number,
  maxPossible: number = 7 * MAX_PERIODS_PER_DAY
): number {
  if (maxPossible === 0) return 0;
  const ratio = availableCount / maxPossible;
  return Math.max(0, Math.min(1, 1 - ratio));
}

export function formatTimeSlot(slot: TimeSlot): string {
  const dayName = DAY_NAMES[slot.dayOfWeek - 1] || `周${slot.dayOfWeek}`;
  return `${dayName}第${slot.periodStart}-${slot.periodEnd}节`;
}

export function formatTimeSlots(slots: TimeSlot[], maxDisplay: number = 5): string {
  if (slots.length === 0) return '无可用时段';
  
  const display = slots.slice(0, maxDisplay).map(formatTimeSlot);
  const remaining = slots.length - maxDisplay;
  
  if (remaining > 0) {
    display.push(`...还有${remaining}个时段`);
  }
  
  return display.join('、');
}

export function getBlockSummary(grid: TimeWindow[][]): {
  totalBlocked: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
} {
  let totalBlocked = 0;
  const byType: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  
  for (let day = 0; day < 7; day++) {
    for (let period = 0; period < MAX_PERIODS_PER_DAY; period++) {
      const slot = grid[day][period];
      if (!slot.isAvailable) {
        totalBlocked++;
        for (const block of slot.blockedBy) {
          byType[block.type] = (byType[block.type] || 0) + 1;
          byPriority[block.priority] = (byPriority[block.priority] || 0) + 1;
        }
      }
    }
  }
  
  return { totalBlocked, byType, byPriority };
}

export function mergeWeekRanges(
  ranges: Array<{ start: number; end: number }>
): Array<{ start: number; end: number }> {
  if (ranges.length === 0) return [];
  
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [];
  
  let current = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start <= current.end + 1) {
      current = { start: current.start, end: Math.max(current.end, sorted[i].end) };
    } else {
      merged.push(current);
      current = sorted[i];
    }
  }
  merged.push(current);
  
  return merged;
}

export function parseWeekRangeString(weekStr: string): { start: number; end: number } | null {
  if (!weekStr) return null;
  
  const match = weekStr.match(/(\d+)\s*[-–~]\s*(\d+)/);
  if (match) {
    return { start: parseInt(match[1]), end: parseInt(match[2]) };
  }
  
  const singleMatch = weekStr.match(/(\d+)/);
  if (singleMatch) {
    const week = parseInt(singleMatch[1]);
    return { start: week, end: week };
  }
  
  return null;
}

export function getTheoreticalMaxSlots(): number {
  return 7 * MAX_PERIODS_PER_DAY;
}
