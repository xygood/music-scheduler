import React, { useState, useMemo } from 'react';
import { CheckCircle, Edit, Trash2, Users, Trash, CheckSquare, Square } from 'lucide-react';
import { getWeekRange } from './utils';
import { studentService, teacherService, scheduleService } from '../../services';

interface ScheduleResultProps {
  courses: any[];
  scheduledClasses: any[];
  rooms: any[];
  classes: any[];
  courseScheduleStatuses: any[];
  currentCourse: any;
  selectedTimeSlots: any[];
  selectedRoom: string;
  targetTeacher: any;
  currentTeacher: any;
  onEditGroup: (group: any) => void;
  onDeleteGroup: (group: any) => void;
  onSaveSchedule: () => void;
  selectedCourses?: string[];
  isAdmin?: boolean;
}

const ScheduleResult: React.FC<ScheduleResultProps> = ({ courses, scheduledClasses, rooms, classes, courseScheduleStatuses, currentCourse, selectedTimeSlots, selectedRoom, targetTeacher, currentTeacher, onEditGroup, onDeleteGroup, onSaveSchedule, selectedCourses = [], isAdmin = false }) => {
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  
  // 教师筛选状态
  const [selectedFilterTeacher, setSelectedFilterTeacher] = useState<string>('all');
  const [availableTeachers, setAvailableTeachers] = useState<any[]>([]);
  
  // 选择状态管理
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // 进度条状态
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // 加载教师列表
  React.useEffect(() => {
    const loadTeachers = async () => {
      try {
        const teachers = await teacherService.getAll();
        setAvailableTeachers(teachers);
      } catch (error) {
        console.error('加载教师列表失败:', error);
      }
    };
    loadTeachers();
  }, []);
  // 从学生管理页面获取学生人数
  const getStudentCount = (classId: string) => {
    // 从studentService获取学生数据，计算班级人数
    try {
      const students = studentService.getAll();
      // 确保students是数组
      if (Array.isArray(students)) {
        const classStudents = students.filter(student => student.class_id === classId);
        return classStudents.length;
      }
      // 如果不是数组，尝试从classes中获取学生人数
      const cls = classes.find(c => c.class_id === classId);
      return cls?.student_count || 0;
    } catch (error) {
      // 如果出错，从classes中获取学生人数
      const cls = classes.find(c => c.class_id === classId);
      return cls?.student_count || 0;
    }
  };
  
  // 从课程数据中获取课程信息
  const getCourseInfo = (courseId: string) => {
    return courses.find(course => course.id === courseId);
  };
  
  // 格式化排课时间（合并格式）
  const formatScheduleTime = (schedules: any[]) => {
    // 按星期和节次分组，收集相关周次
    const timeGroupMap = new Map();
    
    // 星期几映射
    const weekDayMap: {[key: number]: string} = {
      1: '周一',
      2: '周二',
      3: '周三',
      4: '周四',
      5: '周五',
      6: '周六',
      7: '周日'
    };
    
    // 快速分组
    for (let i = 0; i < schedules.length; i++) {
      const schedule = schedules[i];
      const week = schedule.week;
      const day = schedule.day;
      const period = schedule.period;
      
      // 对于偶数节次，检查是否已经存在对应的奇数节次时间组
      // 如果存在，就不再单独创建偶数节次的时间组
      if (period % 2 === 0) {
        const oddPeriod = period - 1;
        const oddKey = `${day}-${oddPeriod}`;
        if (timeGroupMap.has(oddKey)) {
          // 如果已经存在对应的奇数节次时间组，跳过当前偶数节次
          continue;
        }
      }
      
      const key = `${day}-${period}`;
      if (!timeGroupMap.has(key)) {
        timeGroupMap.set(key, {
          day,
          period,
          weeks: []
        });
      }
      timeGroupMap.get(key).weeks.push(week);
    }
    
    // 对每个时间组的周次进行排序和合并
    const formattedGroups = [];
    
    // 按星期和节次排序
    const sortedKeys = Array.from(timeGroupMap.keys()).sort((a, b) => {
      const [dayA, periodA] = a.split('-').map(Number);
      const [dayB, periodB] = b.split('-').map(Number);
      
      if (dayA !== dayB) return dayA - dayB;
      return periodA - periodB;
    });
    
    for (const key of sortedKeys) {
      const group = timeGroupMap.get(key);
      const { day, period, weeks } = group;
      
      // 对周次排序
      const sortedWeeks = [...new Set(weeks)].sort((a, b) => a - b);
      
      // 合并周次范围
      const weekRanges = [];
      let start = sortedWeeks[0];
      let end = start;
      
      for (let i = 1; i < sortedWeeks.length; i++) {
        const current = sortedWeeks[i];
        if (current === end + 1) {
          end = current;
        } else {
          weekRanges.push(start === end ? `${start}` : `${start}-${end}`);
          start = current;
          end = current;
        }
      }
      weekRanges.push(start === end ? `${start}` : `${start}-${end}`);
      
      // 格式化节次
      let periodText = '';
      if (period === 1) {
        periodText = '第1-2节';
      } else if (period === 3) {
        periodText = '第3-4节';
      } else if (period === 5) {
        periodText = '第5-6节';
      } else if (period === 7) {
        periodText = '第7-8节';
      } else {
        periodText = `第${period}节`;
      }
      
      // 生成最终文本
      const weekText = weekRanges.join('、');
      formattedGroups.push(`${weekText}周 ${weekDayMap[day]} ${periodText}`);
    }
    
    return formattedGroups.join('；');
  };
  
  // 按课程、教室和班级分组排课记录
  const groupedByCourseRoomClass = scheduledClasses.reduce((groups, schedule) => {
    const courseInfo = getCourseInfo(schedule.course_id);
    // 只处理理论课
    if (courseInfo && (courseInfo.course_type === '理论课' || (courseInfo as any).teaching_type === '专业大课')) {
      // 使用课程ID、教室ID和班级ID作为分组键，确保每个班级单独一行
      const key = `${schedule.course_id}-${schedule.room_id}-${schedule.class_id}`;
      if (!groups[key]) {
        groups[key] = {
          course_id: schedule.course_id,
          room_id: schedule.room_id,
          class_id: schedule.class_id,
          schedules: []
        };
      }
      groups[key].schedules.push(schedule);
    }
    return groups;
  }, {} as Record<string, { course_id: string; room_id: string; class_id: string; schedules: any[] }>);
  
  // 对每个课程教室组合进行处理，实现合班上课的显示逻辑
  const dayMap = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const allGroupEntries = [];
  let index = 0;
  
  Object.entries(groupedByCourseRoomClass).forEach(([key, courseRoomClassGroup]) => {
    const courseInfo = getCourseInfo(courseRoomClassGroup.course_id);
    if (!courseInfo) return;
    
    // 按时间模式分组排课记录
    const filteredSchedules = courseRoomClassGroup.schedules
      .sort((a, b) => {
        // 先按星期排序，再按节次排序，最后按周次排序
        if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
        if (a.period !== b.period) return a.period - b.period;
        return a.week_number - b.week_number;
      });
    
    // 分组逻辑 - 合并两节连排的课程
    const groupedSchedules = filteredSchedules.reduce((groups, schedule) => {
      // 对于两节连排的课程，使用开始节次作为分组键的一部分
      const groupPeriod = schedule.period % 2 === 1 ? schedule.period : schedule.period - 1;
      const groupKey = `${schedule.day_of_week}-${groupPeriod}`;
      if (!groups[groupKey]) {
        groups[groupKey] = {
          day_of_week: schedule.day_of_week,
          period: groupPeriod,
          room_id: courseRoomClassGroup.room_id,
          schedules: []
        };
      }
      groups[groupKey].schedules.push(schedule);
      return groups;
    }, {} as Record<string, { day_of_week: number; period: number; room_id: string; schedules: any[] }>);
    
    // 转换为数组并添加课程信息
    const timeGroups = Object.entries(groupedSchedules).map(([groupKey, group]) => ({
      ...group,
      course_id: courseRoomClassGroup.course_id,
      class_id: courseRoomClassGroup.class_id, // 单个班级ID
      courseInfo,
      uniqueKey: `${key}-${groupKey}`
    }));
    
    // 计算总课时（按一个班级的课时计算）
    let totalScheduledHours = 0;
    timeGroups.forEach(group => {
      // 计算每个时间模式的课时
      const uniqueTimeSlots = new Set();
      group.schedules.forEach(schedule => {
        if (schedule.period % 2 === 1) {
          uniqueTimeSlots.add(`${schedule.week_number}-${schedule.day_of_week}-${schedule.period}`);
        }
      });
      totalScheduledHours += uniqueTimeSlots.size * 2;
    });
    
    // 生成合并后的排课时间文本
    const mergedScheduleTimes = timeGroups.map(group => {
      const weeks = group.schedules.map(s => s.week_number);
      const weekRange = getWeekRange(weeks);
      const periodText = group.period % 2 === 1 ? `${group.period}-${group.period + 1}` : `${group.period - 1}-${group.period}`;
      return `${weekRange}，${dayMap[group.day_of_week] || ''}第${periodText}节`;
    }).join('\n'); // 分行显示
    
    // 获取班级名称
    const className = classes.find(c => c.class_id === courseRoomClassGroup.class_id)?.class_name || courseRoomClassGroup.class_id;
    
    // 计算班级人数
    const totalStudents = getStudentCount(courseRoomClassGroup.class_id);
    
    // 添加合并后的课程记录
    allGroupEntries.push({
      course_id: courseRoomClassGroup.course_id,
      class_id: courseRoomClassGroup.class_id, // 单个班级ID
      class_names: className, // 单个班级名称
      courseInfo,
      room_id: courseRoomClassGroup.room_id,
      totalStudents,
      timeGroups,
      mergedScheduleTimes,
      totalScheduledHours,
      uniqueKey: key,
      displayIndex: ++index
    });
  });

  // 根据选中的教师筛选排课结果
  const filteredGroupEntries = useMemo(() => {
    if (selectedFilterTeacher === 'all') {
      return allGroupEntries;
    }
    
    return allGroupEntries.filter(group => {
      const teacherName = group.courseInfo?.teacher_name || '';
      const teacherId = group.courseInfo?.teacher_id || '';
      
      // 匹配教师ID或教师姓名
      return teacherId === selectedFilterTeacher || 
             teacherName === selectedFilterTeacher ||
             (availableTeachers.find(t => t.teacher_id === selectedFilterTeacher)?.name === teacherName);
    });
  }, [allGroupEntries, selectedFilterTeacher, availableTeachers]);

  // 计算分页
  const totalItems = filteredGroupEntries.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedEntries = filteredGroupEntries.slice(startIndex, endIndex);

  // 生成分页页码数组
  const getPageNumbers = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  };
  
  // 处理单个组的选择/取消选择
  const handleGroupSelect = (groupKey: string) => {
    setSelectedGroups(prev => {
      if (prev.includes(groupKey)) {
        return prev.filter(key => key !== groupKey);
      } else {
        return [...prev, groupKey];
      }
    });
  };
  
  // 处理全选/取消全选
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedGroups([]);
      setSelectAll(false);
    } else {
      setSelectedGroups(paginatedEntries.map(group => group.uniqueKey));
      setSelectAll(true);
    }
  };
  
  // 处理批量删除
  const handleBatchDelete = async () => {
    if (selectedGroups.length === 0) return;
    
    if (window.confirm(`确定要删除选中的 ${selectedGroups.length} 个排课记录吗？`)) {
      try {
        // 收集所有要删除的排课记录
        const allSchedulesToDelete = [];
        
        selectedGroups.forEach(groupKey => {
          const group = filteredGroupEntries.find(g => g.uniqueKey === groupKey);
          if (group) {
            const schedules = group.timeGroups.flatMap(g => g.schedules);
            allSchedulesToDelete.push(...schedules);
          }
        });
        
        // 显示进度条
        setShowProgress(true);
        setProgress(0);
        
        // 执行删除操作
        const totalSchedules = allSchedulesToDelete.length;
        for (let i = 0; i < totalSchedules; i++) {
          const schedule = allSchedulesToDelete[i];
          await scheduleService.delete(schedule.id);
          // 更新进度
          setProgress(Math.floor(((i + 1) / totalSchedules) * 100));
        }
        
        // 清空选择
        setSelectedGroups([]);
        setSelectAll(false);
        
        // 隐藏进度条
        setTimeout(() => {
          setShowProgress(false);
          setProgress(0);
          // 刷新页面数据
          window.location.reload();
        }, 500);
      } catch (error) {
        console.error('批量删除失败:', error);
        alert('批量删除失败，请重试');
        // 隐藏进度条
        setShowProgress(false);
        setProgress(0);
      }
    }
  };

  return (
    <div className="bg-white rounded-lg p-6">
      {/* 进度条 */}
      {showProgress && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-blue-700">批量删除中...</span>
            <span className="text-sm text-blue-700">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-in-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          排课结果
        </h2>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          {/* 批量删除按钮 */}
          {selectedGroups.length > 0 && (
            <button
              onClick={handleBatchDelete}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-all duration-200 flex items-center gap-1"
            >
              <Trash className="w-4 h-4" />
              批量删除 ({selectedGroups.length})
            </button>
          )}
          
          {/* 教师筛选器 */}
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-500" />
            <select
              value={selectedFilterTeacher}
              onChange={(e) => {
                setSelectedFilterTeacher(e.target.value);
                setCurrentPage(1); // 重置到第一页
                setSelectedGroups([]); // 清空选择
                setSelectAll(false); // 重置全选状态
              }}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">全部教师</option>
              {availableTeachers.map(teacher => (
                <option key={teacher.teacher_id || teacher.id} value={teacher.teacher_id || teacher.id}>
                  {teacher.name || teacher.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-3 py-3 w-12 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={handleSelectAll}
                  className="p-1 hover:bg-gray-200 rounded"
                  title={selectAll ? "取消全选" : "全选"}
                >
                  {selectAll ? (
                    <CheckSquare className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </th>
              <th scope="col" className="px-3 py-3 w-16 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  序号
                </th>
                <th scope="col" className="px-3 py-3 w-20 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  课程编号
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  课程名称
                </th>
              <th scope="col" className="px-3 py-3 w-20 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                课程类型
              </th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                任课教师
              </th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                学生班级
              </th>
              <th scope="col" className="px-3 py-3 w-16 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                人数
              </th>
              <th scope="col" className="px-3 py-3 w-24 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                教室
              </th>
              <th scope="col" className="px-3 py-3 min-w-[280px] text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                排课时间
              </th>
              <th scope="col" className="px-3 py-3 w-24 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                已排课时
              </th>
              <th scope="col" className="px-3 py-3 w-20 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedEntries.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-6 py-8 text-center text-sm text-gray-500">
                  暂无排课记录
                </td>
              </tr>
            ) : (
              paginatedEntries.map((group) => {
                const room = rooms.find(r => r.id === group.room_id);
                const status = group.timeGroups[0]?.schedules[0]?.status || 'draft';
                const isSelected = selectedGroups.includes(group.uniqueKey);
                
                // 处理编辑和删除操作
                const handleEdit = () => {
                  // 为了编辑，我们需要创建一个包含所有排课记录的组对象
                  const allSchedules = group.timeGroups.flatMap(g => g.schedules);
                  const firstGroup = group.timeGroups[0];
                  onEditGroup({
                    ...firstGroup,
                    course_id: group.course_id,
                    class_id: group.class_id,
                    schedules: allSchedules
                  });
                };
                
                const handleDelete = () => {
                  // 为了删除，我们需要创建一个包含所有排课记录的组对象
                  const allSchedules = group.timeGroups.flatMap(g => g.schedules);
                  const firstGroup = group.timeGroups[0];
                  onDeleteGroup({
                    ...firstGroup,
                    course_id: group.course_id,
                    class_id: group.class_id,
                    schedules: allSchedules
                  });
                };
                
                return (
                  <tr key={group.uniqueKey} className={isSelected ? 'bg-blue-50' : ''}>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleGroupSelect(group.uniqueKey)}
                        className="p-1 hover:bg-gray-200 rounded"
                        title={isSelected ? "取消选择" : "选择"}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      {group.displayIndex}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      {group.courseInfo.course_code || group.courseInfo.course_id || '无'}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      {group.courseInfo.course_name}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      {group.courseInfo.course_type || '理论课'}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      {group.courseInfo.teacher_name || '未分配'}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      {group.class_names || '未知班级'}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      {group.totalStudents}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      {room?.room_name || '未分配'}
                    </td>
                    <td className="px-3 py-4 whitespace-pre-line text-sm text-gray-900 min-w-[280px]">
                      {group.mergedScheduleTimes}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      {group.totalScheduledHours}课时
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleEdit}
                          className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded"
                          disabled={status === 'submitted'}
                          title="编辑"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleDelete}
                          className="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded"
                          disabled={status === 'submitted'}
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 分页控件 */}
      {totalPages > 1 && (
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">每页显示:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1); // 重置到第一页
                setSelectedGroups([]); // 清空选择
                setSelectAll(false); // 重置全选状态
              }}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value={5}>5条</option>
              <option value={10}>10条</option>
              <option value={20}>20条</option>
              <option value={50}>50条</option>
              <option value={100}>100条</option>
            </select>
          </div>
          <div className="flex items-center justify-center gap-1">
            {/* 首页 */}
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              首页
            </button>
            
            {/* 上一页 */}
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一页
            </button>
            
            {/* 页码 */}
            {getPageNumbers().map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 text-sm rounded ${
                  currentPage === page
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {page}
              </button>
            ))}
            
            {/* 下一页 */}
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一页
            </button>
            
            {/* 尾页 */}
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              尾页
            </button>
          </div>
        </div>
      )}
      
      {/* 当前排课信息模块 */}
      {currentCourse && (
        <div className="mt-4 p-3 bg-green-50 rounded-lg">
          <h4 className="text-sm font-medium text-green-700 mb-2">当前排课信息</h4>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-2">
              <p className="text-xs text-gray-500">课程名称</p>
              <p className="text-sm font-medium truncate">{currentCourse.course_name}</p>
            </div>
            <div className="md:col-span-1">
              <p className="text-xs text-gray-500">任课教师</p>
              <p className="text-sm truncate">
                {(() => {
                  // 直接从原始课程数据中查找教师姓名
                  // 与 CourseList 组件的逻辑保持一致
                  const course = courses.find(c => c.id === currentCourse.course_id);
                  return course?.teacher_name || currentCourse?.teacher_name || '未选择';
                })()}
              </p>
            </div>
            <div className="md:col-span-1">
              <p className="text-xs text-gray-500">班级</p>
              <p className="text-sm whitespace-pre-line truncate">
                {(() => {
                  if (selectedCourses.length > 1) {
                    // 多个班级，分行展示，去重
                    const selectedStatuses = courseScheduleStatuses.filter(status => selectedCourses.includes(status.id));
                    const uniqueClassNames = [...new Set(selectedStatuses.map(status => status.class_name))];
                    return uniqueClassNames.join('\n');
                  } else {
                    // 单个班级
                    return currentCourse.class_name || '未选择';
                  }
                })()}
              </p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs text-gray-500">教室</p>
              <p className="text-sm truncate">{rooms.find(r => r.id === selectedRoom)?.room_name || '未选择教室'}</p>
            </div>
            <div className="md:col-span-1">
              <p className="text-xs text-gray-500">总学时</p>
              <p className="text-sm font-medium">
                {(() => {
                  const course = courses.find(c => c.id === currentCourse.course_id);
                  return course?.total_hours || course?.credit_hours || 32;
                })()}
                课时
              </p>
            </div>
            <div className="md:col-span-1">
              <p className="text-xs text-gray-500">人数</p>
              <p className="text-sm">
                {(() => {
                  if (selectedCourses.length > 1) {
                    // 多个班级，人数叠加
                    const selectedStatuses = courseScheduleStatuses.filter(status => selectedCourses.includes(status.id));
                    return selectedStatuses.reduce((sum, status) => sum + getStudentCount(status.class_id), 0);
                  } else {
                    // 单个班级
                    return getStudentCount(currentCourse.class_id);
                  }
                })()}
              </p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs text-gray-500">排课时间</p>
              <p className="text-sm truncate">{selectedTimeSlots.length > 0 ? formatScheduleTime(selectedTimeSlots) : '未选择时间'}</p>
            </div>
            <div className="md:col-span-2 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">已排课时</p>
                <p className="text-sm font-medium">
                  {(() => {
                    // 计算已排课时 - 每个单元格计2课时
                    // 只计算奇数槽的节次
                    const uniqueTimeSlots = new Set();
                    selectedTimeSlots.forEach(slot => {
                      if (slot.period % 2 === 1) {
                        uniqueTimeSlots.add(`${slot.week}-${slot.day}-${slot.period}`);
                      }
                    });
                    return uniqueTimeSlots.size * 2;
                  })()}
                  课时
                </p>
              </div>
              <button
                onClick={onSaveSchedule}
                disabled={selectedTimeSlots.length === 0}
                className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ml-2"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleResult;
