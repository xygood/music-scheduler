/**
 * 详细器乐专业统计组件
 * 提供器乐专业的详细统计分析，包括主项/副项分别统计、趋势分析等
 */

import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Star,
  StarHalf,
  Activity,
  Award,
  PieChart,
  Music,
  Heart,
  ArrowUp,
  ArrowDown,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import type { Student } from '../types';

// 器乐专业配置
const INSTRUMENT_SPECS = [
  { name: '古筝', color: 'bg-red-100 text-red-700 border-red-200', icon: '🎵', popular: true },
  { name: '笛子', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: '🎶', popular: true },
  { name: '竹笛', color: 'bg-green-100 text-green-700 border-green-200', icon: '🎼', popular: false },
  { name: '葫芦丝', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: '🎭', popular: true },
  { name: '古琴', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: '🎹', popular: false },
  { name: '双排键', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: '🎛️', popular: false },
  { name: '小提琴', color: 'bg-pink-100 text-pink-700 border-pink-200', icon: '🎻', popular: true },
  { name: '萨克斯', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: '🎷', popular: true },
  { name: '大提琴', color: 'bg-teal-100 text-teal-700 border-teal-200', icon: '🎸', popular: false }
] as const;

// 统计数据类型
interface InstrumentStats {
  total: number;
  primary: number;
  secondary: number;
  growth: number;
  trend: 'up' | 'down' | 'stable';
  percentage: number;
  color: string;
  icon: string;
  popular: boolean;
}

interface DetailedInstrumentStatsProps {
  students: Student[];
  title?: string;
  showTrends?: boolean;
  showBreakdown?: boolean;
  maxDisplay?: number;
}

export const DetailedInstrumentStats: React.FC<DetailedInstrumentStatsProps> = ({
  students,
  title = '专业细分统计',
  showTrends = true,
  showBreakdown = true,
  maxDisplay = 12
}) => {
  // 切换状态：'general' 为普通班，'degree' 为专升本
  const [viewMode, setViewMode] = useState<'general' | 'degree'>('general');
  // 从备注中提取具体器乐专业名称的函数
  const extractInstrumentFromRemarks = (remarks: string): string => {
    if (!remarks) return '';
    // 从 "主项:古筝" 或 "古筝" 中提取具体专业名称
    const match = remarks.match(/(?:主项:)?(.+)/);
    return match ? match[1].trim() : '';
  };

  // 计算主项和副项统计数据
  const { primaryStats, secondaryStats } = useMemo(() => {
    const primaryStats: Record<string, number> = {};
    const secondaryStats: Record<string, number> = {};
    
    if (viewMode === 'general') {
      // 普通班模式：统计普通班学生的主项和副项
      const regularStudents = students.filter(s => s.student_type === 'general');
      
      // 主项统计（普通班）
      regularStudents.forEach(student => {
        if (student.primary_instrument === '钢琴') {
          primaryStats['钢琴'] = (primaryStats['钢琴'] || 0) + 1;
        } else if (student.primary_instrument === '声乐') {
          primaryStats['声乐'] = (primaryStats['声乐'] || 0) + 1;
        } else if (student.primary_instrument === '器乐' && student.remarks) {
          const instrument = extractInstrumentFromRemarks(student.remarks);
          if (instrument) {
            primaryStats[instrument] = (primaryStats[instrument] || 0) + 1;
          }
        }
      });
      
      // 副项统计（普通班）
      regularStudents.forEach(student => {
        if (student.secondary_instruments && Array.isArray(student.secondary_instruments)) {
          student.secondary_instruments.forEach(secondary => {
            if (secondary === '钢琴') {
              secondaryStats['钢琴'] = (secondaryStats['钢琴'] || 0) + 1;
            } else if (secondary === '声乐') {
              secondaryStats['声乐'] = (secondaryStats['声乐'] || 0) + 1;
            } else if (secondary === '器乐' && student.remarks) {
              const instrument = extractInstrumentFromRemarks(student.remarks);
              if (instrument) {
                secondaryStats[instrument] = (secondaryStats[instrument] || 0) + 1;
              }
            }
          });
        }
      });
    } else {
      // 专升本模式：统计专升本学生的副项1、副项2、副项3
      const degreeStudents = students.filter(s => s.student_type !== 'general');
      
      // 副项1、副项2、副项3统计（专升本）
      degreeStudents.forEach(student => {
        if (student.secondary_instruments && Array.isArray(student.secondary_instruments)) {
          student.secondary_instruments.forEach((secondary, index) => {
            // 统计所有副项
            if (secondary === '钢琴') {
              secondaryStats['钢琴'] = (secondaryStats['钢琴'] || 0) + 1;
            } else if (secondary === '声乐') {
              secondaryStats['声乐'] = (secondaryStats['声乐'] || 0) + 1;
            } else if (secondary === '器乐' && student.remarks) {
              const instrument = extractInstrumentFromRemarks(student.remarks);
              if (instrument) {
                secondaryStats[instrument] = (secondaryStats[instrument] || 0) + 1;
              }
            }
            
            // 如果是副项1，也计入主项统计（专升本的副项1即为主项）
            if (index === 0) {
              if (secondary === '钢琴') {
                primaryStats['钢琴'] = (primaryStats['钢琴'] || 0) + 1;
              } else if (secondary === '声乐') {
                primaryStats['声乐'] = (primaryStats['声乐'] || 0) + 1;
              } else if (secondary === '器乐' && student.remarks) {
                const instrument = extractInstrumentFromRemarks(student.remarks);
                if (instrument) {
                  primaryStats[instrument] = (primaryStats[instrument] || 0) + 1;
                }
              }
            }
          });
        }
      });
    }
    
    return { primaryStats, secondaryStats };
  }, [students, viewMode]);

  // 获取趋势颜色
  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-500';
    }
  };

  // 获取趋势图标
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <ArrowUp className="w-3 h-3" />;
      case 'down': return <ArrowDown className="w-3 h-3" />;
      default: return <Activity className="w-3 h-3" />;
    }
  };

  // 合并主项和副项统计，获取所有专业名称
  const allInstrumentNames = useMemo(() => {
    const names = new Set([...Object.keys(primaryStats), ...Object.keys(secondaryStats)]);
    return Array.from(names).sort();
  }, [primaryStats, secondaryStats]);

  // 获取专业样式配置
  const getInstrumentStyle = (instrumentName: string) => {
    const spec = INSTRUMENT_SPECS.find(s => s.name === instrumentName);
    return {
      color: spec?.color || 'bg-gray-100 text-gray-700 border-gray-200',
      icon: spec?.icon || '🎵'
    };
  };

  // 获取热门程度标识
  const getPopularBadge = (popular: boolean) => {
    if (!popular) return null;
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">
        <Star className="w-3 h-3" />
        热门
      </span>
    );
  };

  // 计算总数用于空状态判断
  const totalCount = Object.values(primaryStats).reduce((sum, count) => sum + count, 0);

  // 如果没有数据，显示空状态
  if (totalCount === 0) {
    return (
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <Music className="w-6 h-6 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
        <div className="text-center py-12 text-gray-500">
          <Music className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-medium mb-2">暂无专业统计数据</p>
          <p className="text-sm">
            {viewMode === 'general' 
              ? '请先导入普通班学生数据以查看专业统计' 
              : '请先导入专升本学生数据以查看专业统计'
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Music className="w-6 h-6 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
        <div className="flex items-center gap-4">
          {/* 切换按钮 */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('general')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'general'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              普通班
            </button>
            <button
              onClick={() => setViewMode('degree')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'degree'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              专升本
            </button>
          </div>
          <div className="text-sm text-gray-500">
            {viewMode === 'general' ? '普通班学生专业分布统计' : '专升本学生专业分布统计'}
          </div>
        </div>
      </div>

      {/* 主项和副项统计卡片 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* 主项统计 */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Star className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-blue-800">主项专业统计</h4>
              <p className="text-sm text-blue-600">学生选择的主要专业方向</p>
            </div>
          </div>
          
          <div className="space-y-3">
            {allInstrumentNames
              .sort((a, b) => (primaryStats[b] || 0) - (primaryStats[a] || 0))
              .map(instrumentName => {
                const count = primaryStats[instrumentName] || 0;
                const style = getInstrumentStyle(instrumentName);
                const totalPrimary = Object.values(primaryStats).reduce((sum, c) => sum + c, 0);
                const percentage = totalPrimary > 0 ? (count / totalPrimary * 100) : 0;
                
                return (
                  <div key={`primary-${instrumentName}`} className={`rounded-lg p-4 border ${style.color}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{style.icon}</span>
                        <span className="font-medium">{instrumentName}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold">{count}</div>
                        <div className="text-xs opacity-75">{percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                    <div className="w-full bg-white/30 rounded-full h-2">
                      <div
                        className="bg-white/80 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(5, percentage)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
          
          <div className="mt-4 pt-4 border-t border-blue-200">
            <div className="flex justify-between text-sm text-blue-700">
              <span>总计：{Object.values(primaryStats).reduce((sum, count) => sum + count, 0)} 人</span>
              <span>{Object.keys(primaryStats).length} 个专业</span>
            </div>
          </div>
        </div>

        {/* 副项统计 */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
              <StarHalf className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-green-800">副项专业统计</h4>
              <p className="text-sm text-green-600">学生选择的辅助专业方向</p>
            </div>
          </div>
          
          <div className="space-y-3">
            {allInstrumentNames
              .sort((a, b) => (secondaryStats[b] || 0) - (secondaryStats[a] || 0))
              .map(instrumentName => {
                const count = secondaryStats[instrumentName] || 0;
                const style = getInstrumentStyle(instrumentName);
                const totalSecondary = Object.values(secondaryStats).reduce((sum, c) => sum + c, 0);
                const percentage = totalSecondary > 0 ? (count / totalSecondary * 100) : 0;
                
                return (
                  <div key={`secondary-${instrumentName}`} className={`rounded-lg p-4 border ${style.color}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{style.icon}</span>
                        <span className="font-medium">{instrumentName}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold">{count}</div>
                        <div className="text-xs opacity-75">{percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                    <div className="w-full bg-white/30 rounded-full h-2">
                      <div
                        className="bg-white/80 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(5, percentage)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
          
          <div className="mt-4 pt-4 border-t border-green-200">
            <div className="flex justify-between text-sm text-green-700">
              <span>总计：{Object.values(secondaryStats).reduce((sum, count) => sum + count, 0)} 人次</span>
              <span>{Object.keys(secondaryStats).length} 个专业</span>
            </div>
          </div>
        </div>
      </div>

      {/* 对比图表 */}
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-600" />
          主副项对比
        </h4>
        
        <div className="space-y-4">
          {allInstrumentNames
            .sort((a, b) => Math.max(primaryStats[b] || 0, secondaryStats[b] || 0) - Math.max(primaryStats[a] || 0, secondaryStats[a] || 0))
            .map(instrumentName => {
              const primaryCount = primaryStats[instrumentName] || 0;
              const secondaryCount = secondaryStats[instrumentName] || 0;
              const style = getInstrumentStyle(instrumentName);
              const maxCount = Math.max(primaryCount, secondaryCount);
              
              return (
                <div key={`compare-${instrumentName}`} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{style.icon}</span>
                      <span className="font-medium text-gray-800">{instrumentName}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      主项: {primaryCount} | 副项: {secondaryCount}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {/* 主项条 */}
                    <div className="flex-1">
                      <div className="text-xs text-blue-600 mb-1">主项</div>
                      <div className="w-full bg-blue-200 rounded-full h-3">
                        <div
                          className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${maxCount > 0 ? (primaryCount / maxCount) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* 副项条 */}
                    <div className="flex-1">
                      <div className="text-xs text-green-600 mb-1">副项</div>
                      <div className="w-full bg-green-200 rounded-full h-3">
                        <div
                          className="bg-green-600 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${maxCount > 0 ? (secondaryCount / maxCount) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* 底部说明 */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-3">
          <Activity className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h5 className="font-medium text-blue-800 mb-2">统计说明</h5>
            <div className="text-sm text-blue-700 space-y-1">
              {viewMode === 'general' ? (
                <>
                  <p>• <strong>数据范围</strong>：仅统计普通班学生</p>
                  <p>• <strong>主项统计</strong>：显示各专业作为主项的学生人数</p>
                  <p>• <strong>副项统计</strong>：显示各专业作为副项的学生人次（一个学生可选择多个副项）</p>
                  <p>• <strong>器乐细分</strong>：器乐大类中的具体专业名称从学生备注中提取</p>
                </>
              ) : (
                <>
                  <p>• <strong>数据范围</strong>：仅统计专升本学生</p>
                  <p>• <strong>主项统计</strong>：专升本学生的副项1作为主项统计</p>
                  <p>• <strong>副项统计</strong>：显示专升本学生的副项1、副项2、副项3的学生人次</p>
                  <p>• <strong>器乐细分</strong>：器乐大类中的具体专业名称从学生备注中提取</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailedInstrumentStats;