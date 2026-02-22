/**
 * 优先级评分引擎
 * 基于稀缺优先原则计算班级排课优先级
 */

import {
  ClassSuggestion,
  TimeSlot,
  ConflictDetail,
  LargeClassInfo,
  PRIORITY_LEVELS
} from '../types/prioritySuggestion';
import {
  TimeWindow,
  countAvailableSlots,
  calculateScarcityScore,
  getTheoreticalMaxSlots,
  formatTimeSlots
} from './timeAnalysis';

export interface ScoringWeights {
  scarcity: number;
  compactness: number;
  conflictPenalty: number;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  scarcity: 0.6,
  compactness: 0.3,
  conflictPenalty: 0.1
};

export function calculatePriorityScore(
  availableSlotCount: number,
  blockedSlotCount: number,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): number {
  const maxSlots = getTheoreticalMaxSlots();
  const scarcityScore = calculateScarcityScore(availableSlotCount, maxSlots);
  
  const compactnessScore = calculateCompactnessScore(availableSlotCount, blockedSlotCount);
  
  const conflictPenalty = calculateConflictPenalty(blockedSlotCount);
  
  const score = (
    weights.scarcity * scarcityScore +
    weights.compactness * compactnessScore -
    weights.conflictPenalty * conflictPenalty
  );
  
  return Math.max(0, Math.min(1, score));
}

export function calculateCompactnessScore(
  availableSlotCount: number,
  blockedSlotCount: number
): number {
  const total = availableSlotCount + blockedSlotCount;
  if (total === 0) return 0;
  
  return availableSlotCount / total;
}

export function calculateConflictPenalty(blockedSlotCount: number): number {
  const maxSlots = getTheoreticalMaxSlots();
  return Math.min(1, blockedSlotCount / maxSlots);
}

export function determinePriorityLevel(score: number): 'urgent' | 'high' | 'normal' | 'relaxed' {
  if (score >= PRIORITY_LEVELS.urgent.threshold) return 'urgent';
  if (score >= PRIORITY_LEVELS.high.threshold) return 'high';
  if (score >= PRIORITY_LEVELS.normal.threshold) return 'normal';
  return 'relaxed';
}

export function generateRecommendation(
  priorityLevel: 'urgent' | 'high' | 'normal' | 'relaxed',
  availableSlotCount: number,
  conflictDetails: ConflictDetail[]
): string {
  const levelInfo = PRIORITY_LEVELS[priorityLevel];
  
  const recommendations: Record<string, string[]> = {
    urgent: [
      `仅剩 ${availableSlotCount} 个时段可用，建议立即排课`,
      '时段资源紧张，不先排可能被其他教师占用',
      '如无法排课，请联系教务处协调'
    ],
    high: [
      `剩余 ${availableSlotCount} 个时段可用，建议尽快排课`,
      '选择有限，优先选择连续时段'
    ],
    normal: [
      `有 ${availableSlotCount} 个时段可用，可按需排课`,
      '建议选择连续时段以提高教学效率'
    ],
    relaxed: [
      `有 ${availableSlotCount} 个时段可用，选择余地大`,
      '可最后排课，灵活安排时间'
    ]
  };
  
  const baseRecommendation = recommendations[priorityLevel][0];
  
  if (conflictDetails.length > 0) {
    const highPriorityConflicts = conflictDetails.filter(c => c.type === 'large_class');
    if (highPriorityConflicts.length > 0) {
      return `${baseRecommendation}。注意：有 ${highPriorityConflicts.length} 个时段与大课冲突`;
    }
  }
  
  return baseRecommendation;
}

export function assessRiskLevel(
  availableSlotCount: number,
  competingTeachers: number
): 'high' | 'medium' | 'low' {
  if (availableSlotCount <= 3 || competingTeachers >= 3) return 'high';
  if (availableSlotCount <= 6 || competingTeachers >= 1) return 'medium';
  return 'low';
}

export function buildClassSuggestion(
  classId: string,
  className: string,
  studentCount: number,
  availableGrid: TimeWindow[][],
  conflictDetails: ConflictDetail[],
  sharedLargeClasses: LargeClassInfo[],
  competingTeachers: string[]
): ClassSuggestion {
  const availableSlotCount = countAvailableSlots(availableGrid);
  const blockedSlotCount = getTheoreticalMaxSlots() - availableSlotCount;
  
  const priorityScore = calculatePriorityScore(availableSlotCount, blockedSlotCount);
  const scarcityScore = calculateScarcityScore(availableSlotCount);
  const priorityLevel = determinePriorityLevel(priorityScore);
  
  const availableTimeSlots = extractAvailableSlots(availableGrid);
  const blockedReasons = extractBlockedReasons(availableGrid);
  
  const riskLevel = assessRiskLevel(availableSlotCount, competingTeachers.length);
  const recommendation = generateRecommendation(priorityLevel, availableSlotCount, conflictDetails);
  
  return {
    classId,
    className,
    studentCount,
    priorityScore,
    scarcityScore,
    priorityLevel,
    availableTimeSlots,
    availableSlotCount,
    blockedReasons,
    conflictDetails,
    sharedLargeClasses,
    competingTeachers,
    riskLevel,
    recommendation
  };
}

export function extractAvailableSlots(grid: TimeWindow[][]): TimeSlot[] {
  const slots: TimeSlot[] = [];
  
  for (let day = 0; day < 7; day++) {
    let periodStart = -1;
    
    for (let period = 0; period <= 10; period++) {
      const isEnd = period === 10;
      const slot = !isEnd ? grid[day][period] : null;
      
      if (slot?.isAvailable && periodStart === -1) {
        periodStart = period;
      } else if ((!slot?.isAvailable || isEnd) && periodStart !== -1) {
        slots.push({
          dayOfWeek: day + 1,
          periodStart: periodStart + 1,
          periodEnd: isEnd ? 10 : period,
          weekRange: { start: 1, end: 20 },
          quality: determineSlotQuality(periodStart + 1, isEnd ? 10 : period)
        });
        periodStart = -1;
      }
    }
  }
  
  return slots;
}

export function determineSlotQuality(
  periodStart: number,
  periodEnd: number
): 'best' | 'good' | 'acceptable' {
  const morningSlots = [1, 2, 3, 4];
  const afternoonSlots = [5, 6, 7, 8];
  
  const isMorning = periodStart <= 4;
  const isAfternoon = periodStart >= 5 && periodStart <= 8;
  
  if (isMorning && periodEnd <= 4) return 'best';
  if (isAfternoon && periodEnd <= 8) return 'good';
  return 'acceptable';
}

export function extractBlockedReasons(grid: TimeWindow[][]): string[] {
  const reasons = new Set<string>();
  
  for (let day = 0; day < 7; day++) {
    for (let period = 0; period < 10; period++) {
      const slot = grid[day][period];
      for (const block of slot.blockedBy) {
        reasons.add(block.reason);
      }
    }
  }
  
  return Array.from(reasons);
}

export function sortSuggestionsByPriority(suggestions: ClassSuggestion[]): ClassSuggestion[] {
  return [...suggestions].sort((a, b) => {
    if (a.priorityLevel !== b.priorityLevel) {
      const levelOrder = { urgent: 0, high: 1, normal: 2, relaxed: 3 };
      return levelOrder[a.priorityLevel] - levelOrder[b.priorityLevel];
    }
    return b.priorityScore - a.priorityScore;
  });
}

export function generateSummary(suggestions: ClassSuggestion[]): {
  totalClasses: number;
  urgentCount: number;
  highCount: number;
  normalCount: number;
  relaxedCount: number;
} {
  return {
    totalClasses: suggestions.length,
    urgentCount: suggestions.filter(s => s.priorityLevel === 'urgent').length,
    highCount: suggestions.filter(s => s.priorityLevel === 'high').length,
    normalCount: suggestions.filter(s => s.priorityLevel === 'normal').length,
    relaxedCount: suggestions.filter(s => s.priorityLevel === 'relaxed').length
  };
}
