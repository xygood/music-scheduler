import React from 'react';
import { X } from 'lucide-react';
import { WEEKDAYS } from './types';

interface SelectedTimeSlotsProps {
  selectedTimeSlots: any[];
  onRemoveSlot: (day: number, startPeriod: number, endPeriod: number, weeks: number[]) => void;
}

const SelectedTimeSlots: React.FC<SelectedTimeSlotsProps> = ({ selectedTimeSlots, onRemoveSlot }) => {
  if (selectedTimeSlots.length === 0) return null;

  // 对已选时段进行分组，按星期和节次分组，合并连续的周次
  const groupedSlots = selectedTimeSlots.reduce((groups, slot) => {
    // 对于两节连排的课程，使用开始节次作为分组键
    const groupPeriod = slot.period % 2 === 1 ? slot.period : slot.period - 1;
    const key = `${slot.day}-${groupPeriod}`;
    if (!groups[key]) {
      groups[key] = {
        day: slot.day,
        startPeriod: groupPeriod,
        endPeriod: groupPeriod + 1,
        weeks: []
      };
    }
    // 只添加一次周次，避免重复
    if (!groups[key].weeks.includes(slot.week)) {
      groups[key].weeks.push(slot.week);
    }
    return groups;
  }, {});
  
  // 处理每个分组，合并连续的周次
  const processedGroups = Object.values(groupedSlots).map(group => {
    // 排序周次
    const sortedWeeks = group.weeks.sort((a, b) => a - b);
    
    // 合并连续周次
    const ranges = [];
    let start = sortedWeeks[0];
    
    for (let i = 1; i <= sortedWeeks.length; i++) {
      if (i === sortedWeeks.length || sortedWeeks[i] > sortedWeeks[i - 1] + 1) {
        ranges.push(start === sortedWeeks[i - 1] ? `${start}` : `${start}-${sortedWeeks[i - 1]}`);
        start = sortedWeeks[i];
      }
    }
    
    return {
      ...group,
      weekRanges: ranges
    };
  });
  
  // 排序分组：先按星期，再按节次
  processedGroups.sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day;
    return a.startPeriod - b.startPeriod;
  });

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h3 className="text-sm font-medium text-gray-700 mb-2">已选时间 ({selectedTimeSlots.length / 2} 个时段)</h3>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {processedGroups.map((group, index) => (
          <div key={index} className="text-xs bg-purple-100 text-purple-700 p-2 rounded flex items-center justify-between">
            <span>{group.weekRanges.join('、')}周 {WEEKDAYS[group.day - 1].label} 第{group.startPeriod}-{group.endPeriod}节</span>
            <button
              onClick={() => onRemoveSlot(group.day, group.startPeriod, group.endPeriod, group.weeks)}
              className="text-purple-500 hover:text-purple-700"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SelectedTimeSlots;
