/**
 * 禁排时间相关数据模型
 * 定义优先级禁排时间和时间可用性接口
 */

/**
 * 优先级禁排时间模型
 * 用于存储不同优先级的禁排时间数据
 */
export interface PriorityBlockedTime {
  id: string;
  priority: 'high' | 'medium' | 'low';  // 优先级
  source: 'large_class' | 'week_config' | 'major_class' | 'minor_class';  // 来源
  entityType: 'teacher' | 'student' | 'room' | 'class' | 'system';  // 实体类型
  entityId: string;           // 实体ID
  entityName: string;         // 实体名称
  academicYear: string;       // 学年
  semesterLabel: string;      // 学期标签
  weekRange: {                // 周次范围
    startWeek: number;
    endWeek: number;
  };
  dayOfWeek: number;          // 星期几 (1-7)
  startPeriod: number;        // 开始节次
  endPeriod: number;          // 结束节次
  reason: string;             // 禁排原因
  createdAt: string;
}

/**
 * 时间可用性模型
 * 用于前端显示时间可用性和冲突信息
 */
export interface TimeAvailability {
  dayOfWeek: number;
  period: number;
  isAvailable: boolean;
  blockedReasons: Array<{
    reason: string;
    priority: 'high' | 'medium' | 'low';
    source: string;
    entityType: string;
    entityName: string;
  }>;
  highestPriorityBlock: 'high' | 'medium' | 'low' | null;  // 最高优先级的禁排原因
  conflictLevel: 'none' | 'warning' | 'error';  // 冲突级别
}

/**
 * 基础禁排时间模型
 * 用于周次配置页面手动设置的禁排时间
 */
export interface BaseBlockedTime {
  id: string;
  academicYear: string;         // 学年
  semesterLabel: string;        // 学期标签
  weekNumber?: number;          // 周次
  dayOfWeek?: number;           // 星期几 (1-7)
  startPeriod?: number;         // 开始节次
  endPeriod?: number;           // 结束节次
  reason: string;               // 禁排原因
  type: 'fixed' | 'recurring';  // 禁排类型
  createdAt: string;
  updatedAt: string;
}

/**
 * 实时禁排时间模型
 * 用于排课操作生成的实时禁排时间
 */
export interface RealTimeBlockedTime {
  id: string;
  entityType: 'teacher' | 'student' | 'room' | 'class';  // 实体类型
  entityId: string;           // 实体ID
  entityName: string;         // 实体名称
  dayOfWeek: number;          // 星期几
  period: number;              // 节次
  weekRange: {                // 周次范围
    startWeek: number;
    endWeek: number;
  };
  reason: string;             // 禁排原因（如"已排课"）
  createdAt: string;
}

/**
 * 周次范围解析结果
 */
export interface WeekRange {
  startWeek: number;
  endWeek: number;
}

/**
 * 解析周次范围字符串
 * @param weekRangeStr 周次范围字符串，如 "1-16周"
 * @returns 周次范围对象
 */
export function parseWeekRange(weekRangeStr: string): WeekRange | null {
  if (!weekRangeStr) return null;

  // 匹配 "1-16周" 或 "1-16" 格式
  const match = weekRangeStr.match(/(\d+)[-–](\d+)/);
  if (match) {
    const startWeek = parseInt(match[1]);
    const endWeek = parseInt(match[2]);
    return { startWeek, endWeek };
  }

  // 匹配单个周次 "第1周" 或 "1周"
  const singleMatch = weekRangeStr.match(/第?(\d+)周?/);
  if (singleMatch) {
    const week = parseInt(singleMatch[1]);
    return { startWeek: week, endWeek: week };
  }

  return null;
}

/**
 * 生成唯一ID
 * @returns 唯一ID字符串
 */
export function generateId(): string {
  return `blocked-time-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
