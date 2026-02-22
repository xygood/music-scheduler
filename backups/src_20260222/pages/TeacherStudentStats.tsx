import React, { useState, useEffect, useRef } from 'react';
import { Users, User, ChevronDown, ChevronRight, Filter, Search, Building } from 'lucide-react';
import { studentService, teacherService } from '../services';

// 扩展的学生数据接口
interface Student {
  id: string;
  student_id: string;
  name: string;
  grade: number;
  class_name: string;
  major_class: string;
  instrument: string;
  faculty_code: string;
  assigned_teacher_id?: string;
  assigned_teacher_name?: string;
  primary_instrument: string;
  secondary_instruments: string[];
  secondary_instrument1?: string;
  secondary_instrument2?: string;
  secondary_instrument3?: string;
  secondary1_teacher_id?: string;
  secondary1_teacher_name?: string;
  secondary2_teacher_id?: string;
  secondary2_teacher_name?: string;
  secondary3_teacher_id?: string;
  secondary3_teacher_name?: string;
  notes?: string;
  assigned_teachers: {
    primary_teacher_id?: string;
    primary_teacher_name?: string;
    secondary1_teacher_id?: string;
    secondary1_teacher_name?: string;
    secondary2_teacher_id?: string;
    secondary2_teacher_name?: string;
    secondary3_teacher_id?: string;
    secondary3_teacher_name?: string;
  };
}

// 教师数据接口
interface Teacher {
  id: string;
  name: string;
  faculty_name: string;
  faculty_code: string;
  instruments: string[];
  student_count: number;
}

// 班级学生统计接口
interface ClassStats {
  class_name: string;
  students: Student[];
}

// 教师统计接口
interface TeacherStats {
  teacher: Teacher;
  primaryStats: Record<string, ClassStats[]>;
  secondaryStats: Record<string, ClassStats[]>;
  totalPrimaryStudents: number;
  totalSecondaryStudents: number;
}

const TeacherStudentStats: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterFaculty, setFilterFaculty] = useState<string>('all');
  const [expandedClass, setExpandedClass] = useState<{ teacherId: string; className: string; type: 'primary' | 'secondary' } | null>(null);
  const [expandedFaculties, setExpandedFaculties] = useState<Set<string>>(new Set());
  // 切换教师选项卡
  const [activeTeacherId, setActiveTeacherId] = useState<string | null>(null);
  // 用于监听点击事件的 ref
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 获取唯一班级列表
  const uniqueClasses = [...new Set(students.map(s => s.class_name).filter(Boolean))].sort();
  
  // 获取唯一教研室列表
  const uniqueFaculties = [...new Set(teachers.map(t => t.faculty_name).filter(Boolean))].sort();
  
  // 加载数据
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [studentsData, teachersData] = await Promise.all([
          studentService.getAll(),
          teacherService.getAll()
        ]);
        
        setStudents(studentsData || []);
        setTeachers(teachersData || []);
      } catch (error) {
        console.error('加载数据失败:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // 计算教师学生统计
  const calculateTeacherStats = (): TeacherStats[] => {
    const stats: TeacherStats[] = [];
    
    teachers.forEach(teacher => {
      const primaryStats: Record<string, ClassStats[]> = {};
      const secondaryStats: Record<string, ClassStats[]> = {};
      let totalPrimaryStudents = 0;
      let totalSecondaryStudents = 0;
      
      // 按班级分组统计主项学生
      students.forEach(student => {
        if (student.assigned_teachers?.primary_teacher_id === teacher.id) {
          const className = student.class_name || '未知班级';
          if (!primaryStats[className]) {
            primaryStats[className] = [{ class_name: className, students: [] }];
          }
          primaryStats[className][0].students.push(student);
          totalPrimaryStudents++;
        }
        
        // 统计副项学生 - 按人次统计，每个副项分配都单独计数
        if (student.assigned_teachers?.secondary1_teacher_id === teacher.id) {
          const className = student.class_name || '未知班级';
          if (!secondaryStats[className]) {
            secondaryStats[className] = [{ class_name: className, students: [] }];
          }
          // 创建学生副本，添加副项类型信息
          const studentCopy = {
            ...student,
            __secondaryType: student.secondary_instrument1 || student.secondary_instruments?.[0] || ''
          };
          secondaryStats[className][0].students.push(studentCopy);
          totalSecondaryStudents++;
        }
        if (student.assigned_teachers?.secondary2_teacher_id === teacher.id) {
          const className = student.class_name || '未知班级';
          if (!secondaryStats[className]) {
            secondaryStats[className] = [{ class_name: className, students: [] }];
          }
          // 创建学生副本，添加副项类型信息
          const studentCopy = {
            ...student,
            __secondaryType: student.secondary_instrument2 || student.secondary_instruments?.[1] || ''
          };
          secondaryStats[className][0].students.push(studentCopy);
          totalSecondaryStudents++;
        }
        if (student.assigned_teachers?.secondary3_teacher_id === teacher.id) {
          const className = student.class_name || '未知班级';
          if (!secondaryStats[className]) {
            secondaryStats[className] = [{ class_name: className, students: [] }];
          }
          // 创建学生副本，添加副项类型信息
          const studentCopy = {
            ...student,
            __secondaryType: student.secondary_instrument3 || student.secondary_instruments?.[2] || ''
          };
          secondaryStats[className][0].students.push(studentCopy);
          totalSecondaryStudents++;
        }
      });
      
      // 只添加有学生的教师
      if (totalPrimaryStudents > 0 || totalSecondaryStudents > 0) {
        stats.push({
          teacher,
          primaryStats,
          secondaryStats,
          totalPrimaryStudents,
          totalSecondaryStudents
        });
      }
    });
    
    return stats.sort((a, b) => {
      // 使用teacher_id（工号）进行排序
      const idA = a.teacher.teacher_id || a.teacher.id;
      const idB = b.teacher.teacher_id || b.teacher.id;
      return idA.localeCompare(idB);
    });
  };
  
  const teacherStats = calculateTeacherStats();
  
  // 默认展开第一个教师的结果
  useEffect(() => {
    if (teacherStats.length > 0 && !activeTeacherId) {
      setActiveTeacherId(teacherStats[0].teacher.id);
    }
  }, [teacherStats, activeTeacherId]);
  
  // 监听点击事件，点击空白区域关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setExpandedFaculties(new Set());
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // 切换班级展开/折叠
  const toggleClass = (teacherId: string, className: string, type: 'primary' | 'secondary') => {
    const key = { teacherId, className, type };
    setExpandedClass(expandedClass && 
      expandedClass.teacherId === teacherId && 
      expandedClass.className === className && 
      expandedClass.type === type ? null : key);
  };
  
  // 切换教研室展开/折叠
  const toggleFaculty = (faculty: string) => {
    const newExpandedFaculties = new Set(expandedFaculties);
    if (newExpandedFaculties.has(faculty)) {
      newExpandedFaculties.delete(faculty);
    } else {
      // 只展开当前教研室，关闭其他所有教研室
      newExpandedFaculties.clear();
      newExpandedFaculties.add(faculty);
    }
    setExpandedFaculties(newExpandedFaculties);
  };
  
  // 加载状态
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 lg:p-6">
      <div className="max-w-[1400px] mx-auto">
        {/* 页面标题 */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-3">
                <Users className="w-8 h-8 text-purple-600" />
                教师分配
              </h1>
              <p className="text-gray-600 mt-1">
                按教师归类统计学生分布情况，支持按班级查看详情
              </p>
            </div>
          </div>
        </div>
        
        {/* 筛选器 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索教师姓名"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div>
              <select
                value={filterFaculty}
                onChange={(e) => setFilterFaculty(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">全部教研室</option>
                {uniqueFaculties.map(faculty => (
                  <option key={faculty} value={faculty}>{faculty}</option>
                ))}
              </select>
            </div>
            
            <div>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">全部班级</option>
                {uniqueClasses.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        {/* 教师管理整体模块 */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden" ref={containerRef}>
          {/* 教师列表部分 - 第一级别 */}
          <div className="p-6 bg-white border-b border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                教师列表
              </h3>
            </div>
            
            {/* 按教研室分组 - 一行多个 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {(() => {
                // 按教研室分组教师
                const facultyGroups: Record<string, typeof teacherStats> = {};
                
                teacherStats.forEach(teacherStat => {
                  // 应用筛选
                  if (searchTerm && !teacherStat.teacher.name.includes(searchTerm)) {
                    return;
                  }
                  
                  if (filterFaculty !== 'all' && teacherStat.teacher.faculty_name !== filterFaculty) {
                    return;
                  }
                  
                  // 检查是否有符合条件的学生
                  const hasPrimaryStudents = Object.values(teacherStat.primaryStats).some(classStats => 
                    filterClass === 'all' || classStats.some(cs => cs.class_name === filterClass)
                  );
                  
                  const hasSecondaryStudents = Object.values(teacherStat.secondaryStats).some(classStats => 
                    filterClass === 'all' || classStats.some(cs => cs.class_name === filterClass)
                  );
                  
                  if (!hasPrimaryStudents && !hasSecondaryStudents) {
                    return;
                  }
                  
                  const faculty = teacherStat.teacher.faculty_name || '未分配教研室';
                  if (!facultyGroups[faculty]) {
                    facultyGroups[faculty] = [];
                  }
                  facultyGroups[faculty].push(teacherStat);
                });
                
                // 转换为数组并排序
                return Object.entries(facultyGroups).sort(([a], [b]) => a.localeCompare(b));
              })().map(([faculty, teachersInFaculty]) => (
                <div 
                key={faculty} 
                className="relative"
              >
                {/* 教研室标题 - 可点击展开/折叠 */}
                <div 
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg font-medium flex items-center justify-between cursor-pointer hover:bg-purple-50 hover:border-purple-200 transition-all shadow-sm"
                  onClick={() => toggleFaculty(faculty)}
                >
                  <span className="text-sm font-medium text-gray-800">{faculty} ({teachersInFaculty.length}人)</span>
                  <div className="text-purple-500 transition-transform">
                    {expandedFaculties.has(faculty) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </div>
                </div>
                
                {/* 该教研室的教师列表 - 浮动下拉菜单 */}
                {expandedFaculties.has(faculty) && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 w-full max-h-80 overflow-y-auto">
                    <div className="p-2">
                      <div className="space-y-1">
                        {teachersInFaculty.map(teacherStat => {
                          const totalStudents = teacherStat.totalPrimaryStudents + teacherStat.totalSecondaryStudents;
                          
                          return (
                            <button
                              key={teacherStat.teacher.id}
                              onClick={() => {
                                setActiveTeacherId(teacherStat.teacher.id);
                                // 点击教师后关闭下拉菜单
                                const newExpandedFaculties = new Set(expandedFaculties);
                                newExpandedFaculties.delete(faculty);
                                setExpandedFaculties(newExpandedFaculties);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between text-sm ${activeTeacherId === teacherStat.teacher.id ? 'bg-purple-600 text-white' : 'bg-white hover:bg-purple-50'}`}
                              title={`${teacherStat.teacher.name} - 主项: ${teacherStat.totalPrimaryStudents}人, 副项: ${teacherStat.totalSecondaryStudents}人`}
                            >
                              <span>{teacherStat.teacher.name}</span>
                              <span className={`text-xs font-semibold ${activeTeacherId === teacherStat.teacher.id ? 'bg-white text-purple-600' : 'bg-purple-100 text-purple-800'} rounded-full px-2 py-0.5`}>
                                {totalStudents}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              ))}
            </div>
          </div>
          
          {/* 教师统计详情部分 */}
          {activeTeacherId ? (
            teacherStats.map(teacherStat => {
              if (teacherStat.teacher.id !== activeTeacherId) {
                return null;
              }
              
              return (
                <div key={teacherStat.teacher.id} className="border-t border-gray-200">
                  {/* 教师头部 - 第二级别 */}
                  <div className="px-6 py-5 bg-white border-b border-gray-200 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <User className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600" />
                        <div>
                          <h3 className="text-xl font-bold text-gray-800">{teacherStat.teacher.name}</h3>
                          <p className="text-gray-600">{teacherStat.teacher.faculty_name}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 px-4 py-2 rounded-full text-sm shadow-sm">
                          <span className="font-medium text-gray-700">主项:</span>
                          <span className="font-bold text-blue-600">{teacherStat.totalPrimaryStudents}人</span>
                        </div>
                        <div className="flex items-center gap-2 bg-green-50 border border-green-100 px-4 py-2 rounded-full text-sm shadow-sm">
                          <span className="font-medium text-gray-700">副项:</span>
                          <span className="font-bold text-green-600">{teacherStat.totalSecondaryStudents}人</span>
                        </div>
                        <div className="flex items-center gap-2 bg-purple-50 border border-purple-100 px-4 py-2 rounded-full text-sm shadow-sm">
                          <span className="font-medium text-gray-700">总计:</span>
                          <span className="font-bold text-purple-600">{teacherStat.totalPrimaryStudents + teacherStat.totalSecondaryStudents}人</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 教师详情 - 第三级别 */}
                  <div className="p-6 bg-white">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* 主项统计 */}
                      <div className="bg-white rounded-xl p-5 border border-blue-100 shadow-sm">
                        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                          <Users className="w-5 h-5 text-blue-500" />
                          主项学生统计
                        </h4>
                        <div className="space-y-4">
                          {Object.entries(teacherStat.primaryStats).sort(([a], [b]) => a.localeCompare(b)).map(([className, classStats]) => {
                            if (filterClass !== 'all' && className !== filterClass) {
                              return null;
                            }
                            
                            return (
                              <div key={className} className="bg-white rounded-lg border border-blue-100 overflow-hidden shadow-sm">
                                <div 
                                  className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-blue-50 transition-colors"
                                  onClick={() => toggleClass(teacherStat.teacher.id, className, 'primary')}
                                >
                                  <div className="flex items-center gap-2">
                                    <Building className="w-4 h-4 text-blue-500" />
                                    <span className="font-medium text-gray-800">{className}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-blue-500">{classStats[0].students.length}人</span>
                                    {expandedClass && 
                                      expandedClass.teacherId === teacherStat.teacher.id && 
                                      expandedClass.className === className && 
                                      expandedClass.type === 'primary' ? 
                                      <ChevronDown className="w-4 h-4 text-blue-500" /> : 
                                      <ChevronRight className="w-4 h-4 text-blue-500" />
                                    }
                                  </div>
                                </div>
                                
                                {/* 学生列表 */}
                                {expandedClass && 
                                  expandedClass.teacherId === teacherStat.teacher.id && 
                                  expandedClass.className === className && 
                                  expandedClass.type === 'primary' && (
                                    <div className="px-4 py-4 bg-white border-t border-blue-50">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {classStats[0].students.map(student => (
                                          <div key={student.id} className="flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-blue-100 transition-colors border border-blue-100">
                                            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                                              {student.name.charAt(0)}
                                            </div>
                                            <div className="flex-1">
                                              <p className="font-medium text-gray-900">{student.name}</p>
                                              <p className="text-xs text-gray-600">{student.student_id}</p>
                                            </div>
                                            <div>
                                              <span className="px-2 py-1 bg-blue-500 text-white rounded-full text-xs font-medium">
                                                {student.primary_instrument || student.instrument}
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      {/* 副项统计 */}
                      <div className="bg-white rounded-xl p-5 border border-green-100 shadow-sm">
                        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                          <Users className="w-5 h-5 text-green-500" />
                          副项学生统计
                        </h4>
                        <div className="space-y-4">
                          {Object.entries(teacherStat.secondaryStats).sort(([a], [b]) => a.localeCompare(b)).map(([className, classStats]) => {
                            if (filterClass !== 'all' && className !== filterClass) {
                              return null;
                            }
                            
                            return (
                              <div key={className} className="bg-white rounded-lg border border-green-100 overflow-hidden shadow-sm">
                                <div 
                                  className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-green-50 transition-colors"
                                  onClick={() => toggleClass(teacherStat.teacher.id, className, 'secondary')}
                                >
                                  <div className="flex items-center gap-2">
                                    <Building className="w-4 h-4 text-green-500" />
                                    <span className="font-medium text-gray-800">{className}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-green-500">{classStats[0].students.length}人</span>
                                    {expandedClass && 
                                      expandedClass.teacherId === teacherStat.teacher.id && 
                                      expandedClass.className === className && 
                                      expandedClass.type === 'secondary' ? 
                                      <ChevronDown className="w-4 h-4 text-green-500" /> : 
                                      <ChevronRight className="w-4 h-4 text-green-500" />
                                    }
                                  </div>
                                </div>
                                
                                {/* 学生列表 */}
                                {expandedClass && 
                                  expandedClass.teacherId === teacherStat.teacher.id && 
                                  expandedClass.className === className && 
                                  expandedClass.type === 'secondary' && (
                                    <div className="px-4 py-4 bg-white border-t border-green-50">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {classStats[0].students.map((student, index) => {
                                          // 使用学生副本中的副项类型信息
                                          const secondaryType = student.__secondaryType || '';
                                          // 使用索引作为key的一部分，确保即使是同一学生的多个副项也能正确显示
                                          const studentKey = `${student.id}_${index}`;
                                          
                                          return (
                                            <div key={studentKey} className="flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-green-100 transition-colors border border-green-100">
                                              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                                                {student.name.charAt(0)}
                                              </div>
                                              <div className="flex-1">
                                                <p className="font-medium text-gray-900">{student.name}</p>
                                                <p className="text-xs text-gray-600">{student.student_id}</p>
                                              </div>
                                              <div>
                                                <span className="px-2 py-1 bg-green-500 text-white rounded-full text-xs font-medium">
                                                  {secondaryType}
                                                </span>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-10 flex flex-col items-center justify-center border-t border-gray-200 bg-white">
              <Users className="w-20 h-20 text-purple-200 mb-6" />
              <h3 className="text-xl font-semibold text-gray-700 mb-3">请选择一位教师</h3>
              <p className="text-gray-500 text-center max-w-md">
                从上方教师列表中选择一位教师，查看其名下学生的详细统计信息
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherStudentStats;