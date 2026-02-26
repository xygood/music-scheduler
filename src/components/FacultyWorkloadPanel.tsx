/**
 * 教研室工作量统计面板
 * 显示各教研室的工作量统计和警告
 */

import React from 'react';
import { FACULTIES } from '../types';
import { BarChart3, AlertTriangle, CheckCircle, Clock, Users, BookOpen } from 'lucide-react';

interface WorkloadData {
  facultyCode: string;
  totalClasses: number;
  dailyAverage: number;
  teacherCount: number;
  courseCount: number;
}

interface FacultyWorkloadPanelProps {
  workloadData: WorkloadData[];
  date?: string;
  showDetails?: boolean;
  className?: string;
}

const FacultyWorkloadPanel: React.FC<FacultyWorkloadPanelProps> = ({
  workloadData,
  date,
  showDetails = true,
  className = ''
}) => {
  // 教研室颜色
  const facultyColors: Record<string, { bg: string; text: string; border: string; chart: string }> = {
    PIANO: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      chart: 'bg-blue-500'
    },
    VOCAL: {
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200',
      chart: 'bg-green-500'
    },
    INSTRUMENT: {
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      border: 'border-orange-200',
      chart: 'bg-orange-500'
    }
  };

  // 计算最大工作量用于图表
  const maxClasses = Math.max(...workloadData.map(d => d.totalClasses), 10);

  // 获取教研室的统计信息
  const getWorkloadStatus = (data: WorkloadData) => {
    if (data.totalClasses >= 8) {
      return { status: 'high', label: '工作量较高', color: 'text-red-600', bg: 'bg-red-100' };
    } else if (data.totalClasses >= 5) {
      return { status: 'medium', label: '工作量适中', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    } else {
      return { status: 'low', label: '工作量正常', color: 'text-green-600', bg: 'bg-green-100' };
    }
  };

  return (
    <div className={`card ${className}`}>
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-600" />
          <h3 className="font-medium text-gray-900">教研室工作量统计</h3>
        </div>
        {date && (
          <span className="text-sm text-gray-500">
            {new Date(date).toLocaleDateString('zh-CN')}
          </span>
        )}
      </div>

      {/* 统计图表 */}
      <div className="p-4 space-y-4">
        {FACULTIES.map((faculty) => {
          const data = workloadData.find(d => d.facultyCode === faculty.faculty_code);
          const colors = facultyColors[faculty.faculty_code] || facultyColors.INSTRUMENT;
          const status = data ? getWorkloadStatus(data) : null;
          const percentage = data ? (data.totalClasses / maxClasses) * 100 : 0;

          return (
            <div key={faculty.faculty_code} className="space-y-2">
              {/* 标题和数值 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${colors.chart}`}></span>
                  <span className="font-medium text-gray-700">{faculty.faculty_name}</span>
                  {status && (
                    <span className={`px-2 py-0.5 rounded-full text-xs ${status.bg} ${status.color}`}>
                      {status.label}
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-500">
                  {data?.totalClasses || 0} 节课
                </span>
              </div>

              {/* 进度条 */}
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${colors.chart}`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>

              {/* 详细信息 */}
              {showDetails && data && (
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {data.teacherCount} 位教师
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    {data.courseCount} 门课程
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    日均 {data.dailyAverage} 节
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 警告信息 */}
      {workloadData.some(d => d.totalClasses >= 8) && (
        <div className="mx-4 mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800">工作量提示</p>
              <p className="text-yellow-700 mt-1">
                部分教研室工作量较高，建议平衡分配课程，避免教师过度疲劳。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 统计摘要 */}
      {showDetails && (
        <div className="p-4 bg-gray-50 rounded-b-lg border-t border-gray-100">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {workloadData.reduce((sum, d) => sum + d.totalClasses, 0)}
              </p>
              <p className="text-sm text-gray-500">总课程数</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {workloadData.reduce((sum, d) => sum + d.teacherCount, 0)}
              </p>
              <p className="text-sm text-gray-500">参与教师</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {workloadData.some(d => d.totalClasses >= 8) ? (
                  <span className="flex items-center justify-center gap-1 text-yellow-600">
                    <AlertTriangle className="w-5 h-5" />
                    1+
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    正常
                  </span>
                )}
              </p>
              <p className="text-sm text-gray-500">运行状态</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyWorkloadPanel;
