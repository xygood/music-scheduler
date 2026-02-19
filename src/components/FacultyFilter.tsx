/**
 * 教研室筛选组件
 * 支持按教研室筛选教师和乐器
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { FACULTIES } from '../types';
import { Users, Music, ChevronDown, ChevronUp } from 'lucide-react';

interface Teacher {
  id: string;
  name: string;
  faculty_id: string;
  can_teach_courses?: string[];
}

interface FacultyFilterProps {
  onFacultySelect?: (facultyCode: string | null) => void;
  onInstrumentSelect?: (instrument: string | null) => void;
  selectedFaculty?: string | null;
  selectedInstrument?: string | null;
  showInstruments?: boolean;
  className?: string;
  teachers?: Teacher[];
}

const FacultyFilter: React.FC<FacultyFilterProps> = ({
  onFacultySelect,
  onInstrumentSelect,
  selectedFaculty,
  selectedInstrument,
  showInstruments = true,
  className = '',
  teachers: externalTeachers
}) => {
  const { teacher } = useAuth();
  const [isExpanded, setIsExpanded] = useState(true);
  const [localTeachers, setLocalTeachers] = useState<Teacher[]>([]);

  // 加载教师数据
  useEffect(() => {
    if (externalTeachers && externalTeachers.length > 0) {
      setLocalTeachers(externalTeachers);
    } else {
      try {
        const teachersData = JSON.parse(localStorage.getItem('music_scheduler_teachers') || '[]');
        setLocalTeachers(teachersData);
      } catch (e) {
        console.error('加载教师数据失败:', e);
      }
    }
  }, [externalTeachers]);

  // 教研室颜色主题
  const facultyColors: Record<string, { bg: string; text: string; border: string; light: string }> = {
    PIANO: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      light: 'bg-blue-100'
    },
    VOCAL: {
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200',
      light: 'bg-green-100'
    },
    INSTRUMENT: {
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      border: 'border-orange-200',
      light: 'bg-orange-100'
    },
    THEORY: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      light: 'bg-purple-100'
    }
  };

  // 从教师数据中动态获取可教课程列表
  const facultyInstruments = useMemo(() => {
    const result: Record<string, string[]> = {
      PIANO: ['钢琴'],
      VOCAL: ['声乐'],
      INSTRUMENT: []
    };

    // 各教研室专属乐器
    const facultyExclusiveInstruments: Record<string, string[]> = {
      PIANO: ['钢琴'],
      VOCAL: ['声乐'],
      INSTRUMENT: ['古筝', '竹笛', '葫芦丝', '古琴', '双排键', '小提琴', '萨克斯']
    };

    // 器乐教研室的专属乐器集合
    const instrumentFacultyInstruments = new Set(facultyExclusiveInstruments.INSTRUMENT);

    // 从器乐教研室的教师中提取可教课程
    const instrumentTeachers = localTeachers.filter(t => t.faculty_id === 'INSTRUMENT');
    const instrumentsSet = new Set<string>();
    
    instrumentTeachers.forEach(teacher => {
      if (teacher.can_teach_courses && Array.isArray(teacher.can_teach_courses)) {
        teacher.can_teach_courses.forEach(course => {
          // 过滤掉非乐器课程（如音乐理论）和属于其他教研室的乐器（如钢琴）
          if (course && !course.includes('理论') && instrumentFacultyInstruments.has(course)) {
            instrumentsSet.add(course);
          }
        });
      }
    });

    // 按预定义顺序排序
    const orderedInstruments = facultyExclusiveInstruments.INSTRUMENT.filter(inst => instrumentsSet.has(inst));
    result.INSTRUMENT = orderedInstruments;
    
    return result;
  }, [localTeachers]);

  const handleFacultyClick = (facultyCode: string) => {
    const newSelection = selectedFaculty === facultyCode ? null : facultyCode;
    onFacultySelect?.(newSelection);
    onInstrumentSelect?.(null);
  };

  const handleInstrumentClick = (instrument: string) => {
    const newSelection = selectedInstrument === instrument ? null : instrument;
    onInstrumentSelect?.(newSelection);
  };

  return (
    <div className={`card ${className}`}>
      {/* 头部 */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-600" />
          <h3 className="font-medium text-gray-900">教研室筛选</h3>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* 教研室选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择教研室
            </label>
            <div className="grid grid-cols-3 gap-2">
              {FACULTIES.map((faculty) => {
                const colors = facultyColors[faculty.faculty_code] || facultyColors.INSTRUMENT;
                const isSelected = selectedFaculty === faculty.faculty_code;

                return (
                  <button
                    key={faculty.faculty_code}
                    onClick={() => handleFacultyClick(faculty.faculty_code)}
                    className={`p-3 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? `${colors.bg} ${colors.border} ${colors.text}`
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <span className="font-medium text-sm">{faculty.faculty_name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 乐器选择 - 理论教研室不显示乐器筛选 */}
          {showInstruments && selectedFaculty && selectedFaculty !== 'THEORY' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Music className="w-4 h-4" />
                选择乐器
              </label>
              <div className="flex flex-wrap gap-2">
                {facultyInstruments[selectedFaculty]?.map((instrument) => {
                  const isSelected = selectedInstrument === instrument;

                  return (
                    <button
                      key={instrument}
                      onClick={() => handleInstrumentClick(instrument)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        isSelected
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {instrument}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 当前筛选状态 */}
          {(selectedFaculty || selectedInstrument) && (
            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
              <span className="text-sm text-gray-500">当前筛选：</span>
              {selectedFaculty && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                  {FACULTIES.find(f => f.faculty_code === selectedFaculty)?.faculty_name}
                  <button
                    onClick={() => {
                      onFacultySelect?.(null);
                      onInstrumentSelect?.(null);
                    }}
                    className="hover:text-purple-900"
                  >
                    ×
                  </button>
                </span>
              )}
              {selectedInstrument && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                  {selectedInstrument}
                  <button
                    onClick={() => onInstrumentSelect?.(null)}
                    className="hover:text-blue-900"
                  >
                    ×
                  </button>
                </span>
              )}
              <button
                onClick={() => {
                  onFacultySelect?.(null);
                  onInstrumentSelect?.(null);
                }}
                className="text-sm text-gray-400 hover:text-gray-600 ml-auto"
              >
                清除筛选
              </button>
            </div>
          )}

          {/* 快速筛选提示 */}
          <div className="text-xs text-gray-400 space-y-1">
            <p>💡 提示：</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>点击教研室查看该室下的乐器</li>
              <li>乐器列表来自教师的可教课程</li>
              <li>筛选将应用于教师列表和排课</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyFilter;
