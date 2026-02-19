/**
 * 学生列表统一筛选组件
 * 提供关联筛选：班级类型 -> 年级 -> 班级 -> 主项 -> 副项
 * 特点：班级类型、年级、班级相互关联，数据直接从学生字段提取
 */

import React, { useState, useMemo } from 'react';
import { Search, Filter, X } from 'lucide-react';
import type { Student } from '../types';

interface FilterState {
  classType: string;
  year: string;
  class: string;
  primaryInstrument: string;
  secondaryInstrument: string;
}

interface StudentListFiltersProps {
  students: Student[];
  onFiltersChange: (filters: FilterState) => void;
  onReset?: () => void;
  className?: string;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
}

export const StudentListFilters: React.FC<StudentListFiltersProps> = ({
  students,
  onFiltersChange,
  onReset,
  className = '',
  searchTerm = '',
  onSearchChange
}) => {
  const [filters, setFilters] = useState<FilterState>({
    classType: '',
    year: '',
    class: '',
    primaryInstrument: '',
    secondaryInstrument: ''
  });

  // 从学生数据中提取班级类型
  const availableClassTypes = useMemo(() => {
    if (!students || !Array.isArray(students)) return [];
    const classTypes = [...new Set(students.map(s => s.student_type))]
      .filter(Boolean)
      .sort()
      .map(type => ({
        value: type,
        label: type === 'upgrade' ? '专升本' : '普通班'
      }));
    return classTypes;
  }, [students]);

  // 根据班级类型过滤年级
  const availableYears = useMemo(() => {
    if (!students || !Array.isArray(students)) return [];
    let filtered = students;
    
    // 如果选择了班级类型，先按班级类型过滤
    if (filters.classType) {
      filtered = filtered.filter(s => s.student_type === filters.classType);
    }
    
    const years = [...new Set(filtered.map(s => s.grade))]
      .filter(Boolean)
      .sort((a, b) => b - a) // 年级倒序
      .map(year => ({
        value: String(year),
        label: `${year}级`
      }));
    return years;
  }, [students, filters.classType]);

  // 根据班级类型和年级过滤班级
  const availableClasses = useMemo(() => {
    if (!students || !Array.isArray(students)) return [];
    let filtered = students;
    
    // 按班级类型过滤
    if (filters.classType) {
      filtered = filtered.filter(s => s.student_type === filters.classType);
    }
    
    // 按年级过滤
    if (filters.year) {
      filtered = filtered.filter(s => s.grade === parseInt(filters.year));
    }
    
    const classes = [...new Set(filtered.map(s => s.major_class))]
      .filter(Boolean)
      .sort()
      .map(cls => ({
        value: cls,
        label: cls
      }));
    return classes;
  }, [students, filters.classType, filters.year]);

  // 从学生数据中提取所有主项专业
  const availablePrimaryInstruments = useMemo(() => {
    if (!students || !Array.isArray(students)) return [];
    let filtered = students;
    
    // 按班级类型过滤
    if (filters.classType) {
      filtered = filtered.filter(s => s.student_type === filters.classType);
    }
    
    // 按年级过滤
    if (filters.year) {
      filtered = filtered.filter(s => s.grade === parseInt(filters.year));
    }
    
    // 按班级过滤
    if (filters.class) {
      filtered = filtered.filter(s => s.major_class === filters.class);
    }
    
    const instruments = [...new Set(filtered.map(s => s.primary_instrument))]
      .filter(Boolean)
      .sort()
      .map(instrument => ({
        value: instrument,
        label: instrument
      }));
    return instruments;
  }, [students, filters.classType, filters.year, filters.class]);

  // 从学生数据中提取所有副项专业
  const availableSecondaryInstruments = useMemo(() => {
    if (!students || !Array.isArray(students)) return [];
    let filtered = students;
    
    // 按班级类型过滤
    if (filters.classType) {
      filtered = filtered.filter(s => s.student_type === filters.classType);
    }
    
    // 按年级过滤
    if (filters.year) {
      filtered = filtered.filter(s => s.grade === parseInt(filters.year));
    }
    
    // 按班级过滤
    if (filters.class) {
      filtered = filtered.filter(s => s.major_class === filters.class);
    }
    
    const secondaryInstruments = new Set<string>();
    filtered.forEach(s => {
      if (s.secondary_instruments && Array.isArray(s.secondary_instruments)) {
        s.secondary_instruments.forEach(instrument => {
          if (instrument) secondaryInstruments.add(instrument);
        });
      }
    });
    
    return Array.from(secondaryInstruments)
      .sort()
      .map(instrument => ({
        value: instrument,
        label: instrument
      }));
  }, [students, filters.classType, filters.year, filters.class]);

  // 筛选逻辑
  const filteredStudents = useMemo(() => {
    if (!students || !Array.isArray(students)) return [];
    let result = [...students];
    
    // 按班级类型筛选
    if (filters.classType) {
      result = result.filter(s => s.student_type === filters.classType);
    }

    // 按年级筛选
    if (filters.year) {
      result = result.filter(s => s.grade === parseInt(filters.year));
    }
    
    // 按具体班级筛选
    if (filters.class) {
      result = result.filter(s => s.major_class === filters.class);
    }
    
    // 按主项筛选
    if (filters.primaryInstrument) {
      result = result.filter(s => s.primary_instrument === filters.primaryInstrument);
    }
    
    // 按副项筛选
    if (filters.secondaryInstrument) {
      result = result.filter(s => 
        s.secondary_instruments && 
        s.secondary_instruments.includes(filters.secondaryInstrument)
      );
    }
    
    return result;
  }, [students, filters]);

  // 处理筛选器变化
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    
    // 如果班级类型改变，清空年级、班级选择
    if (key === 'classType') {
      newFilters.year = '';
      newFilters.class = '';
      newFilters.primaryInstrument = '';
      newFilters.secondaryInstrument = '';
    }
    
    // 如果年级改变，清空班级和主副项选择
    if (key === 'year') {
      newFilters.class = '';
      newFilters.primaryInstrument = '';
      newFilters.secondaryInstrument = '';
    }
    
    // 如果班级改变，清空主副项选择
    if (key === 'class') {
      newFilters.primaryInstrument = '';
      newFilters.secondaryInstrument = '';
    }
    
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  // 重置筛选器
  const handleReset = () => {
    const resetFilters: FilterState = {
      classType: '',
      year: '',
      class: '',
      primaryInstrument: '',
      secondaryInstrument: ''
    };
    setFilters(resetFilters);
    onFiltersChange(resetFilters);
    onReset?.();
  };

  // 检查是否有活动的筛选器
  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  return (
    <div className={`bg-white p-4 rounded-lg border border-gray-200 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="font-medium text-gray-900">学生筛选</h3>
          </div>
          {/* 搜索框移到标题后面 */}
          <div className="relative ml-4">
            <Search className="w-3 h-3 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索学生..."
              value={searchTerm}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="pl-9 pr-3 py-1.5 border border-gray-300 rounded-md text-sm w-48 focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
        </div>
        {hasActiveFilters && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
            清除筛选
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 班级类型筛选 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">班级类型</label>
          <select
            value={filters.classType}
            onChange={(e) => handleFilterChange('classType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="">全部类型</option>
            {availableClassTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* 年级筛选 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">年级</label>
          <select
            value={filters.year}
            onChange={(e) => handleFilterChange('year', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="">全部年级</option>
            {availableYears.map(year => (
              <option key={year.value} value={year.value}>
                {year.label}
              </option>
            ))}
          </select>
        </div>

        {/* 班级筛选 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">班级</label>
          <select
            value={filters.class}
            onChange={(e) => handleFilterChange('class', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
            disabled={!filters.classType && !filters.year}
          >
            <option value="">全部班级</option>
            {availableClasses.map(cls => (
              <option key={cls.value} value={cls.value}>
                {cls.label}
              </option>
            ))}
          </select>
        </div>

        {/* 主项筛选 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">主项</label>
          <select
            value={filters.primaryInstrument}
            onChange={(e) => handleFilterChange('primaryInstrument', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="">全部主项</option>
            {availablePrimaryInstruments.map(instrument => (
              <option key={instrument.value} value={instrument.value}>
                {instrument.label}
              </option>
            ))}
          </select>
        </div>

        {/* 副项筛选 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">副项</label>
          <select
            value={filters.secondaryInstrument}
            onChange={(e) => handleFilterChange('secondaryInstrument', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="">全部副项</option>
            {availableSecondaryInstruments.map(instrument => (
              <option key={instrument.value} value={instrument.value}>
                {instrument.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 筛选结果统计 */}
      {hasActiveFilters && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>找到 {filteredStudents.length} 名学生</span>
            {/* 调试信息 */}
            <span className="text-xs text-gray-400 ml-2">
              (筛选条件: {filters.classType || '全部类型'} / {filters.year || '全部年级'} / {filters.class || '全部班级'})
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentListFilters;