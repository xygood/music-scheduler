/**
 * 数据备份与恢复页面
 * 管理员专用：导出和导入系统数据备份
 */

import React, { useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import localStorageService, { teacherService, studentService, courseService, roomService, scheduleService, STORAGE_KEYS } from '../services/localStorage';
import { largeClassScheduleService } from '../services';

import {
  Database,
  Download,
  Upload,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  FileJson,
  Clock,
  Users,
  BookOpen,
  MapPin,
  Calendar,
  Trash2
} from 'lucide-react';

const Backup: React.FC = () => {
  const { user } = useAuth();
  const [backupProgress, setBackupProgress] = useState('');
  const [restoreProgress, setRestoreProgress] = useState('');
  const [restoreResult, setRestoreResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [customFileName, setCustomFileName] = useState('');

  // 备份数据类型选择状态
  const [selectedBackupTypes, setSelectedBackupTypes] = useState({
    teachers: true,
    students: true,
    courses: true,
    rooms: true,
    largeClassSchedules: true,
    majorClassScheduledClasses: true,  // 专业大课排课记录
    groupClassScheduledClasses: true,  // 小组课排课记录
    conflicts: true,
    users: true,
    semesterWeekConfigs: true,
    classes: true,
    blockedSlots: true,
    importedBlockedTimes: true,
    studentTeacherAssignments: true,
    studentMajorAssignments: true,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 判断是否为管理员
  const isAdmin = user?.faculty_id === 'ADMIN' || user?.is_admin === true || user?.role === 'admin' || user?.teacher_id === '110' || user?.email === 'admin@music.edu.cn';

  // 导出备份
  const handleExportBackup = async () => {
    if (!isAdmin) {
      alert('此功能仅限管理员使用');
      return;
    }

    try {
      const backupData: any = {
        version: '1.7', // 更新版本号，支持课程编码字段和完整字段顺序导出
        exportDate: new Date().toISOString(),
        exportBy: user?.full_name || user?.email || '管理员',
        data: {}
      };

      // 根据选择导出数据
      if (selectedBackupTypes.teachers) {
        setBackupProgress('正在导出教师数据...');
        backupData.data.teachers = await teacherService.getAll();
      }

      if (selectedBackupTypes.students) {
        setBackupProgress('正在导出学生数据...');
        backupData.data.students = await studentService.getAll();
      }

      if (selectedBackupTypes.courses) {
        setBackupProgress('正在导出课程数据...');
        backupData.data.courses = await courseService.getAll();
      }

      if (selectedBackupTypes.rooms) {
        setBackupProgress('正在导出教室数据...');
        backupData.data.rooms = await roomService.getAll();
      }

      if (selectedBackupTypes.largeClassSchedules) {
        setBackupProgress('正在导出大课表数据...');
        backupData.data.large_class_schedules = await largeClassScheduleService.getAll();
      }

      // 排课记录按页面来源区分
      if (selectedBackupTypes.majorClassScheduledClasses || selectedBackupTypes.groupClassScheduledClasses) {
        const allScheduledClasses = JSON.parse(localStorage.getItem(STORAGE_KEYS.SCHEDULED_CLASSES) || '[]');
        const allCourses = JSON.parse(localStorage.getItem(STORAGE_KEYS.COURSES) || '[]');
        const allClasses = JSON.parse(localStorage.getItem(STORAGE_KEYS.CLASSES) || '[]');
        const allRooms = JSON.parse(localStorage.getItem(STORAGE_KEYS.ROOMS) || '[]');
        
        // 创建课程ID到课程的映射（同时支持内部ID和课程编号）
        const courseMap = new Map();
        allCourses.forEach((c: any) => {
          // 用内部ID作为键
          courseMap.set(c.id, c);
          // 如果有课程编号，也用课程编号作为键
          if (c.course_id) {
            courseMap.set(c.course_id, c);
          }
        });
        
        // 按页面来源筛选（通过关联的课程判断）
        if (selectedBackupTypes.majorClassScheduledClasses) {
          // 专业大课页面：关联的课程 teaching_type 为 '专业大课'
          const majorClassSchedules = allScheduledClasses.filter((s: any) => {
            const course = courseMap.get(s.course_id);
            return course && course.teaching_type === '专业大课';
          });
          
          // 按排课结果列表中的字段顺序导出，新增课程编码字段
          // 字段顺序：id, course_id, course_code, class_id, room_id, teacher_id, teacher_name, 
          //          day_of_week, period, week_number, start_week, end_week, status, created_at, updated_at
          const formattedMajorClassSchedules = majorClassSchedules.map((s: any) => {
            const course = courseMap.get(s.course_id);
            return {
              id: s.id,
              course_id: s.course_id,
              course_code: course?.course_code || '',  // 新增课程编码字段
              class_id: s.class_id,
              room_id: s.room_id,
              teacher_id: course?.teacher_id || s.teacher_id || '',
              teacher_name: course?.teacher_name || s.teacher_name || '',
              day_of_week: s.day_of_week,
              period: s.period,
              week_number: s.week_number,
              start_week: s.start_week,
              end_week: s.end_week,
              status: s.status,
              created_at: s.created_at,
              updated_at: s.updated_at
            };
          });
          
          backupData.data.major_class_scheduled_classes = formattedMajorClassSchedules;
          
          // 同时导出相关的课程、班级、教室数据
          const relatedCourseIds = new Set(majorClassSchedules.map((s: any) => s.course_id).filter(Boolean));
          const relatedClassIds = new Set(majorClassSchedules.map((s: any) => s.class_id).filter(Boolean));
          const relatedRoomIds = new Set(majorClassSchedules.map((s: any) => s.room_id).filter(Boolean));
          const relatedTeacherIds = new Set(majorClassSchedules.map((s: any) => {
            const course = courseMap.get(s.course_id);
            return course?.teacher_id || s.teacher_id;
          }).filter(Boolean));
          
          backupData.data.major_class_courses = allCourses.filter((c: any) => relatedCourseIds.has(c.id) || relatedCourseIds.has(c.course_id));
          backupData.data.major_class_classes = allClasses.filter((c: any) => relatedClassIds.has(c.class_id));
          backupData.data.major_class_rooms = allRooms.filter((r: any) => relatedRoomIds.has(r.id));
          
          // 导出相关的教师数据
          const allTeachers = JSON.parse(localStorage.getItem(STORAGE_KEYS.TEACHERS) || '[]');
          backupData.data.major_class_teachers = allTeachers.filter((t: any) => 
            relatedTeacherIds.has(t.id) || relatedTeacherIds.has(t.teacher_id)
          );
        }
        
        if (selectedBackupTypes.groupClassScheduledClasses) {
          // 专业小课页面：关联的课程 teaching_type 为 '小组课' 或其他
          const groupClassSchedules = allScheduledClasses.filter((s: any) => {
            const course = courseMap.get(s.course_id);
            // 专业小课：课程存在且 teaching_type 为 '小组课'，或者课程不存在（兼容旧数据）
            return !course || course.teaching_type === '小组课';
          });
          backupData.data.group_class_scheduled_classes = groupClassSchedules;
          
          // 同时导出相关的课程、班级、教室、学生数据
          const relatedCourseIds = new Set(groupClassSchedules.map((s: any) => s.course_id).filter(Boolean));
          const relatedClassIds = new Set(groupClassSchedules.map((s: any) => s.class_id).filter(Boolean));
          const relatedRoomIds = new Set(groupClassSchedules.map((s: any) => s.room_id).filter(Boolean));
          const relatedStudentIds = new Set(groupClassSchedules.map((s: any) => s.student_id).filter(Boolean));
          const relatedTeacherIds = new Set(groupClassSchedules.map((s: any) => s.teacher_id).filter(Boolean));
          
          backupData.data.group_class_courses = allCourses.filter((c: any) => relatedCourseIds.has(c.id) || relatedCourseIds.has(c.course_id));
          backupData.data.group_class_classes = allClasses.filter((c: any) => relatedClassIds.has(c.class_id));
          backupData.data.group_class_rooms = allRooms.filter((r: any) => relatedRoomIds.has(r.id));
          
          // 导出相关的学生和教师数据
          const allStudents = JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENTS) || '[]');
          const allTeachers = JSON.parse(localStorage.getItem(STORAGE_KEYS.TEACHERS) || '[]');
          backupData.data.group_class_students = allStudents.filter((s: any) => relatedStudentIds.has(s.id) || relatedStudentIds.has(s.student_id));
          backupData.data.group_class_teachers = allTeachers.filter((t: any) => relatedTeacherIds.has(t.id) || relatedTeacherIds.has(t.teacher_id));
        }
      }

      if (selectedBackupTypes.conflicts) {
        backupData.data.conflicts = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONFLICTS) || '[]');
      }

      if (selectedBackupTypes.users) {
        backupData.data.users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
      }

      if (selectedBackupTypes.semesterWeekConfigs) {
        backupData.data.semester_week_configs = JSON.parse(localStorage.getItem(STORAGE_KEYS.SEMESTER_WEEK_CONFIGS) || '[]');
      }

      if (selectedBackupTypes.classes) {
        backupData.data.classes = JSON.parse(localStorage.getItem(STORAGE_KEYS.CLASSES) || '[]');
      }

      if (selectedBackupTypes.blockedSlots) {
        backupData.data.blocked_slots = JSON.parse(localStorage.getItem(STORAGE_KEYS.BLOCKED_SLOTS) || '[]');
      }

      if (selectedBackupTypes.importedBlockedTimes) {
        backupData.data.imported_blocked_times = JSON.parse(localStorage.getItem('music_scheduler_imported_blocked_times') || '[]');
      }

      if (selectedBackupTypes.studentTeacherAssignments) {
        backupData.data.student_teacher_assignments = JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENT_TEACHER_ASSIGNMENTS) || '[]');
      }

      if (selectedBackupTypes.studentMajorAssignments) {
        backupData.data.student_major_assignments = JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENT_MAJOR_ASSIGNMENTS) || '[]');
      }

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const defaultFileName = `音乐排课系统备份_${new Date().toISOString().split('T')[0]}`;
      const finalFileName = customFileName.trim() 
        ? `${customFileName.trim()}_${new Date().toISOString().split('T')[0]}` 
        : defaultFileName;
      a.download = `${finalFileName}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setBackupProgress('导出完成！');
      setTimeout(() => setBackupProgress(''), 3000);
    } catch (error) {
      console.error('导出失败:', error);
      setBackupProgress('导出失败，请重试');
    }
  };

  // 处理恢复备份文件
  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isAdmin) {
      alert('此功能仅限管理员使用');
      return;
    }

    setRestoreProgress('正在读取备份文件...');
    setRestoreResult(null);

    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      // 验证备份格式
      if (!backupData.version || !backupData.data) {
        setRestoreResult({ success: false, message: '无效的备份文件格式' });
        setRestoreProgress('');
        return;
      }

      setRestoreProgress('正在恢复教师数据...');
      if (backupData.data.teachers) {
        localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(backupData.data.teachers));
      }

      setRestoreProgress('正在恢复学生数据...');
      if (backupData.data.students) {
        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(backupData.data.students));
      }

      setRestoreProgress('正在恢复课程数据...');
      if (backupData.data.courses) {
        localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(backupData.data.courses));
      }

      setRestoreProgress('正在恢复教室数据...');
      if (backupData.data.rooms) {
        localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(backupData.data.rooms));
      }

      // 恢复大课表数据
      setRestoreProgress('正在恢复大课表数据...');
      if (backupData.data.large_class_schedules) {
        localStorage.setItem(STORAGE_KEYS.LARGE_CLASS_SCHEDULES, JSON.stringify(backupData.data.large_class_schedules));
      }

      // 先恢复关联的课程数据（确保排课记录能正确判断类型）
      setRestoreProgress('正在恢复关联课程数据...');
      let existingCourses: any[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.COURSES) || '[]');
      if (!Array.isArray(existingCourses)) existingCourses = [];
      const existingCourseIds = new Set(existingCourses.map((c: any) => c.id));
      
      // 恢复专业大课关联的课程
      if (backupData.data.major_class_courses) {
        let majorClassCourses = backupData.data.major_class_courses;
        if (!Array.isArray(majorClassCourses)) majorClassCourses = [];
        const newCourses = majorClassCourses.filter((c: any) => !existingCourseIds.has(c.id));
        if (newCourses.length > 0) {
          localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify([...existingCourses, ...newCourses]));
          console.log(`✅ 恢复了 ${newCourses.length} 条专业大课课程数据`);
        }
      }
      
      // 恢复小组课关联的课程
      if (backupData.data.group_class_courses) {
        let updatedCourses: any[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.COURSES) || '[]');
        if (!Array.isArray(updatedCourses)) updatedCourses = [];
        const updatedCourseIds = new Set(updatedCourses.map((c: any) => c.id));
        let groupClassCourses = backupData.data.group_class_courses;
        if (!Array.isArray(groupClassCourses)) groupClassCourses = [];
        const newCourses = groupClassCourses.filter((c: any) => !updatedCourseIds.has(c.id));
        if (newCourses.length > 0) {
          localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify([...updatedCourses, ...newCourses]));
          console.log(`✅ 恢复了 ${newCourses.length} 条小组课课程数据`);
        }
      }

      // 恢复排课记录（增量恢复，不清空其他类型的数据）
      setRestoreProgress('正在恢复排课记录...');
      
      // 获取现有的排课数据和课程数据
      let existingScheduledClasses: any[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.SCHEDULED_CLASSES) || '[]');
      if (!Array.isArray(existingScheduledClasses)) existingScheduledClasses = [];
      let currentCourses: any[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.COURSES) || '[]');
      if (!Array.isArray(currentCourses)) currentCourses = [];
      
      // 创建课程映射（支持多种ID格式）
      const courseMap = new Map();
      currentCourses.forEach((c: any) => {
        if (c.id) courseMap.set(c.id, c);
        if (c.course_id) courseMap.set(c.course_id, c);
      });
      
      // 判断备份文件中包含哪些类型的排课数据
      const hasMajorClassData = backupData.data.major_class_scheduled_classes && backupData.data.major_class_scheduled_classes.length > 0;
      const hasGroupClassData = backupData.data.group_class_scheduled_classes && backupData.data.group_class_scheduled_classes.length > 0;
      const hasLegacyData = backupData.data.scheduled_classes && backupData.data.scheduled_classes.length > 0;
      
      let finalScheduledClasses: any[] = [];
      
      if (hasMajorClassData && !hasGroupClassData) {
        // 只导入专业大课：保留现有的小组课数据，替换专业大课数据
        const existingGroupClasses = existingScheduledClasses.filter((s: any) => {
          const course = courseMap.get(s.course_id);
          return !course || course.teaching_type === '小组课';
        });
        finalScheduledClasses = [...existingGroupClasses, ...backupData.data.major_class_scheduled_classes];
        console.log(`✅ 导入专业大课 ${backupData.data.major_class_scheduled_classes.length} 条，保留小组课 ${existingGroupClasses.length} 条`);
      } else if (hasGroupClassData && !hasMajorClassData) {
        // 只导入小组课：保留现有的专业大课数据，替换小组课数据
        const existingMajorClasses = existingScheduledClasses.filter((s: any) => {
          const course = courseMap.get(s.course_id);
          return course && course.teaching_type === '专业大课';
        });
        finalScheduledClasses = [...existingMajorClasses, ...backupData.data.group_class_scheduled_classes];
        console.log(`✅ 导入小组课 ${backupData.data.group_class_scheduled_classes.length} 条，保留专业大课 ${existingMajorClasses.length} 条`);
      } else if (hasMajorClassData && hasGroupClassData) {
        // 同时导入两种数据：全部替换
        finalScheduledClasses = [...backupData.data.major_class_scheduled_classes, ...backupData.data.group_class_scheduled_classes];
        console.log(`✅ 导入专业大课 ${backupData.data.major_class_scheduled_classes.length} 条，小组课 ${backupData.data.group_class_scheduled_classes.length} 条`);
      } else if (hasLegacyData) {
        // 兼容旧格式：直接替换
        finalScheduledClasses = backupData.data.scheduled_classes;
        console.log(`✅ 导入旧格式排课数据 ${backupData.data.scheduled_classes.length} 条`);
      } else {
        // 没有排课数据，保留现有数据
        finalScheduledClasses = existingScheduledClasses;
        console.log(`ℹ️ 备份文件中没有排课数据，保留现有数据`);
      }
      
      if (finalScheduledClasses.length > 0) {
        localStorage.setItem(STORAGE_KEYS.SCHEDULED_CLASSES, JSON.stringify(finalScheduledClasses));
      }
      
      // 恢复专业大课关联的班级数据
      if (backupData.data.major_class_classes) {
        let existingClasses: any[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CLASSES) || '[]');
        if (!Array.isArray(existingClasses)) existingClasses = [];
        const existingClassIds = new Set(existingClasses.map((c: any) => c.class_id));
        let majorClassClasses = backupData.data.major_class_classes;
        if (!Array.isArray(majorClassClasses)) majorClassClasses = [];
        const newClasses = majorClassClasses.filter((c: any) => !existingClassIds.has(c.class_id));
        if (newClasses.length > 0) {
          localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify([...existingClasses, ...newClasses]));
          console.log(`✅ 恢复了 ${newClasses.length} 条专业大课班级数据`);
        }
      }
      
      // 恢复小组课关联的班级数据
      if (backupData.data.group_class_classes) {
        let existingClasses: any[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CLASSES) || '[]');
        if (!Array.isArray(existingClasses)) existingClasses = [];
        const existingClassIds = new Set(existingClasses.map((c: any) => c.class_id));
        let groupClassClasses = backupData.data.group_class_classes;
        if (!Array.isArray(groupClassClasses)) groupClassClasses = [];
        const newClasses = groupClassClasses.filter((c: any) => !existingClassIds.has(c.class_id));
        if (newClasses.length > 0) {
          localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify([...existingClasses, ...newClasses]));
          console.log(`✅ 恢复了 ${newClasses.length} 条小组课班级数据`);
        }
      }
      
      // 恢复专业大课关联的教室数据
      if (backupData.data.major_class_rooms) {
        let existingRooms: any[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.ROOMS) || '[]');
        if (!Array.isArray(existingRooms)) existingRooms = [];
        const existingRoomIds = new Set(existingRooms.map((r: any) => r.id));
        let majorClassRooms = backupData.data.major_class_rooms;
        if (!Array.isArray(majorClassRooms)) majorClassRooms = [];
        const newRooms = majorClassRooms.filter((r: any) => !existingRoomIds.has(r.id));
        if (newRooms.length > 0) {
          localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify([...existingRooms, ...newRooms]));
          console.log(`✅ 恢复了 ${newRooms.length} 条专业大课教室数据`);
        }
      }
      
      // 恢复专业大课关联的教师数据
      if (backupData.data.major_class_teachers) {
        let existingTeachers: any[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TEACHERS) || '[]');
        if (!Array.isArray(existingTeachers)) existingTeachers = [];
        const existingTeacherIds = new Set(existingTeachers.map((t: any) => t.id));
        let majorClassTeachers = backupData.data.major_class_teachers;
        if (!Array.isArray(majorClassTeachers)) majorClassTeachers = [];
        const newTeachers = majorClassTeachers.filter((t: any) => !existingTeacherIds.has(t.id));
        if (newTeachers.length > 0) {
          localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify([...existingTeachers, ...newTeachers]));
          console.log(`✅ 恢复了 ${newTeachers.length} 条专业大课教师数据`);
        }
      }
      
      // 恢复小组课关联的教室数据
      if (backupData.data.group_class_rooms) {
        let existingRooms: any[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.ROOMS) || '[]');
        if (!Array.isArray(existingRooms)) existingRooms = [];
        const existingRoomIds = new Set(existingRooms.map((r: any) => r.id));
        let groupClassRooms = backupData.data.group_class_rooms;
        if (!Array.isArray(groupClassRooms)) groupClassRooms = [];
        const newRooms = groupClassRooms.filter((r: any) => !existingRoomIds.has(r.id));
        if (newRooms.length > 0) {
          localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify([...existingRooms, ...newRooms]));
          console.log(`✅ 恢复了 ${newRooms.length} 条小组课教室数据`);
        }
      }
      
      // 恢复小组课关联的学生数据
      if (backupData.data.group_class_students) {
        let existingStudents: any[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENTS) || '[]');
        if (!Array.isArray(existingStudents)) existingStudents = [];
        const existingStudentIds = new Set(existingStudents.map((s: any) => s.id));
        let groupClassStudents = backupData.data.group_class_students;
        if (!Array.isArray(groupClassStudents)) groupClassStudents = [];
        const newStudents = groupClassStudents.filter((s: any) => !existingStudentIds.has(s.id));
        if (newStudents.length > 0) {
          localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify([...existingStudents, ...newStudents]));
          console.log(`✅ 恢复了 ${newStudents.length} 条小组课学生数据`);
        }
      }
      
      // 恢复小组课关联的教师数据
      if (backupData.data.group_class_teachers) {
        let existingTeachers: any[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TEACHERS) || '[]');
        if (!Array.isArray(existingTeachers)) existingTeachers = [];
        const existingTeacherIds = new Set(existingTeachers.map((t: any) => t.id));
        let groupClassTeachers = backupData.data.group_class_teachers;
        if (!Array.isArray(groupClassTeachers)) groupClassTeachers = [];
        const newTeachers = groupClassTeachers.filter((t: any) => !existingTeacherIds.has(t.id));
        if (newTeachers.length > 0) {
          localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify([...existingTeachers, ...newTeachers]));
          console.log(`✅ 恢复了 ${newTeachers.length} 条小组课教师数据`);
        }
      }

      if (backupData.data.conflicts) {
        localStorage.setItem(STORAGE_KEYS.CONFLICTS, JSON.stringify(backupData.data.conflicts));
      }

      if (backupData.data.users) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(backupData.data.users));
      }

      // 恢复周次配置数据
      setRestoreProgress('正在恢复周次配置数据...');
      if (backupData.data.semester_week_configs) {
        localStorage.setItem(STORAGE_KEYS.SEMESTER_WEEK_CONFIGS, JSON.stringify(backupData.data.semester_week_configs));
      }

      // 恢复班级数据
      setRestoreProgress('正在恢复班级数据...');
      if (backupData.data.classes) {
        localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(backupData.data.classes));
      }

      // 恢复禁排时间数据
      setRestoreProgress('正在恢复禁排时间数据...');
      if (backupData.data.blocked_slots) {
        localStorage.setItem(STORAGE_KEYS.BLOCKED_SLOTS, JSON.stringify(backupData.data.blocked_slots));
      }

      // 恢复专业大课页面导入的禁排时间数据
      setRestoreProgress('正在恢复导入的禁排时间数据...');
      if (backupData.data.imported_blocked_times) {
        localStorage.setItem('music_scheduler_imported_blocked_times', JSON.stringify(backupData.data.imported_blocked_times));
      }

      // 恢复学生-教师分配数据
      setRestoreProgress('正在恢复学生-教师分配数据...');
      if (backupData.data.student_teacher_assignments) {
        localStorage.setItem(STORAGE_KEYS.STUDENT_TEACHER_ASSIGNMENTS, JSON.stringify(backupData.data.student_teacher_assignments));
      }

      // 恢复学生-专业分配数据
      setRestoreProgress('正在恢复学生-专业分配数据...');
      if (backupData.data.student_major_assignments) {
        localStorage.setItem(STORAGE_KEYS.STUDENT_MAJOR_ASSIGNMENTS, JSON.stringify(backupData.data.student_major_assignments));
      }

      setRestoreResult({ success: true, message: '数据恢复成功！请刷新页面查看数据。' });
      setRestoreProgress('');
    } catch (error) {
      console.error('恢复失败:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      setRestoreResult({ success: false, message: `恢复失败: ${errorMessage}` });
      setRestoreProgress('');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 清空所有数据
  const handleClearAllData = () => {
    if (!isAdmin) {
      alert('此功能仅限管理员使用');
      return;
    }
    
    try {
      // 保存当前用户信息，避免清空后需要重新登录
      const currentUser = sessionStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      
      // 清空所有 localStorage 数据
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      
      // 清除可能的其他自定义键
      localStorage.removeItem('music_scheduler_imported_blocked_times');
      
      // 恢复当前用户信息
      if (currentUser) {
        sessionStorage.setItem(STORAGE_KEYS.CURRENT_USER, currentUser);
      }
      
      // 重新初始化演示数据
      localStorageService.initializeDemoData();
      
      setRestoreResult({ success: true, message: '数据已清空！页面已自动重置。' });
      setShowClearConfirm(false);
      
      // 延迟刷新页面
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('清空数据失败:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      setRestoreResult({ success: false, message: `清空失败: ${errorMessage}` });
    }
  };



  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="page-title flex items-center gap-3">
          <Database className="w-8 h-8 text-orange-600" />
          数据备份与恢复
        </h1>
        <p className="text-gray-600 mt-2">
          导出或恢复系统数据备份。建议定期备份以防止数据丢失。
        </p>
      </div>

      {/* 警告信息 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium">注意事项：</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>此功能仅限管理员使用</li>
              <li>恢复备份会覆盖当前所有数据，请谨慎操作</li>
              <li>建议在恢复前先导出当前数据的备份</li>
              <li>恢复完成后请刷新页面查看数据</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 导出备份 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Download className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">导出备份</h3>
              <p className="text-sm text-gray-500">将所有系统数据导出为JSON文件</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-700">选择要备份的数据：</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedBackupTypes(prev => Object.keys(prev).reduce((acc, key) => ({ ...acc, [key]: true }), {} as typeof prev))}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  全选
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={() => setSelectedBackupTypes(prev => Object.keys(prev).reduce((acc, key) => ({ ...acc, [key]: false }), {} as typeof prev))}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  全不选
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                <input
                  type="checkbox"
                  checked={selectedBackupTypes.teachers}
                  onChange={(e) => setSelectedBackupTypes(prev => ({ ...prev, teachers: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <Users className="w-4 h-4 text-gray-400" />
                <span className={selectedBackupTypes.teachers ? 'text-gray-900' : 'text-gray-400'}>教师数据</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                <input
                  type="checkbox"
                  checked={selectedBackupTypes.students}
                  onChange={(e) => setSelectedBackupTypes(prev => ({ ...prev, students: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <Users className="w-4 h-4 text-gray-400" />
                <span className={selectedBackupTypes.students ? 'text-gray-900' : 'text-gray-400'}>学生数据</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                <input
                  type="checkbox"
                  checked={selectedBackupTypes.courses}
                  onChange={(e) => setSelectedBackupTypes(prev => ({ ...prev, courses: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <BookOpen className="w-4 h-4 text-gray-400" />
                <span className={selectedBackupTypes.courses ? 'text-gray-900' : 'text-gray-400'}>课程数据</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                <input
                  type="checkbox"
                  checked={selectedBackupTypes.rooms}
                  onChange={(e) => setSelectedBackupTypes(prev => ({ ...prev, rooms: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className={selectedBackupTypes.rooms ? 'text-gray-900' : 'text-gray-400'}>教室数据</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                <input
                  type="checkbox"
                  checked={selectedBackupTypes.largeClassSchedules}
                  onChange={(e) => setSelectedBackupTypes(prev => ({ ...prev, largeClassSchedules: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className={selectedBackupTypes.largeClassSchedules ? 'text-gray-900' : 'text-gray-400'}>通适大课</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                <input
                  type="checkbox"
                  checked={selectedBackupTypes.majorClassScheduledClasses}
                  onChange={(e) => setSelectedBackupTypes(prev => ({ ...prev, majorClassScheduledClasses: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className={selectedBackupTypes.majorClassScheduledClasses ? 'text-gray-900' : 'text-gray-400'}>专业大课排课结果</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                <input
                  type="checkbox"
                  checked={selectedBackupTypes.groupClassScheduledClasses}
                  onChange={(e) => setSelectedBackupTypes(prev => ({ ...prev, groupClassScheduledClasses: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className={selectedBackupTypes.groupClassScheduledClasses ? 'text-gray-900' : 'text-gray-400'}>专业小课排课结果</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                <input
                  type="checkbox"
                  checked={selectedBackupTypes.users}
                  onChange={(e) => setSelectedBackupTypes(prev => ({ ...prev, users: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <FileJson className="w-4 h-4 text-gray-400" />
                <span className={selectedBackupTypes.users ? 'text-gray-900' : 'text-gray-400'}>用户账户</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                <input
                  type="checkbox"
                  checked={selectedBackupTypes.semesterWeekConfigs}
                  onChange={(e) => setSelectedBackupTypes(prev => ({ ...prev, semesterWeekConfigs: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className={selectedBackupTypes.semesterWeekConfigs ? 'text-gray-900' : 'text-gray-400'}>周次配置</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                <input
                  type="checkbox"
                  checked={selectedBackupTypes.classes}
                  onChange={(e) => setSelectedBackupTypes(prev => ({ ...prev, classes: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <Users className="w-4 h-4 text-gray-400" />
                <span className={selectedBackupTypes.classes ? 'text-gray-900' : 'text-gray-400'}>班级数据</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                <input
                  type="checkbox"
                  checked={selectedBackupTypes.blockedSlots}
                  onChange={(e) => setSelectedBackupTypes(prev => ({ ...prev, blockedSlots: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <Clock className="w-4 h-4 text-gray-400" />
                <span className={selectedBackupTypes.blockedSlots ? 'text-gray-900' : 'text-gray-400'}>禁排时间</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                <input
                  type="checkbox"
                  checked={selectedBackupTypes.studentTeacherAssignments}
                  onChange={(e) => setSelectedBackupTypes(prev => ({ ...prev, studentTeacherAssignments: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <Users className="w-4 h-4 text-gray-400" />
                <span className={selectedBackupTypes.studentTeacherAssignments ? 'text-gray-900' : 'text-gray-400'}>学生-教师分配</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                <input
                  type="checkbox"
                  checked={selectedBackupTypes.studentMajorAssignments}
                  onChange={(e) => setSelectedBackupTypes(prev => ({ ...prev, studentMajorAssignments: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <Users className="w-4 h-4 text-gray-400" />
                <span className={selectedBackupTypes.studentMajorAssignments ? 'text-gray-900' : 'text-gray-400'}>学生-专业分配</span>
              </label>
            </div>
          </div>

          <div className="mb-4">
            <label className="label">自定义文件名（可选）</label>
            <input
              type="text"
              value={customFileName}
              onChange={(e) => setCustomFileName(e.target.value)}
              placeholder="留空则使用默认文件名"
              className="input"
            />
            <p className="text-xs text-gray-500 mt-1">
              最终文件名：{customFileName.trim() 
                ? `${customFileName.trim()}_${new Date().toISOString().split('T')[0]}.json`
                : `音乐排课系统备份_${new Date().toISOString().split('T')[0]}.json`}
            </p>
          </div>

          <button
            onClick={handleExportBackup}
            disabled={!!backupProgress}
            className="w-full btn-primary flex items-center justify-center gap-2"
          >
            {backupProgress ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                {backupProgress}
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                导出数据备份
              </>
            )}
          </button>
        </div>

        {/* 恢复备份 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Upload className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">恢复备份</h3>
              <p className="text-sm text-gray-500">从JSON备份文件恢复数据</p>
            </div>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-green-500 transition-colors mb-4">
            <FileJson className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600 mb-2">点击或拖拽上传备份文件</p>
            <p className="text-sm text-gray-500 mb-4">支持 .json 格式</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleRestoreBackup}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!!restoreProgress}
              className="btn-secondary"
            >
              选择备份文件
            </button>
          </div>

          {(restoreProgress || restoreResult) && (
            <div className="space-y-3">
              {restoreProgress && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  {restoreProgress}
                </div>
              )}

              {restoreResult && (
                <div className={`p-3 rounded-lg border ${
                  restoreResult.success
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {restoreResult.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    )}
                    <span className={`text-sm ${
                      restoreResult.success ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {restoreResult.message}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 备份历史建议 */}
      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">备份建议</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-800">定期备份</span>
            </div>
            <p className="text-sm text-blue-700">
              建议每周至少备份一次，特别是在重要操作前
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800">多地存储</span>
            </div>
            <p className="text-sm text-green-700">
              将备份文件保存到多个位置，防止单点故障
            </p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-purple-600" />
              <span className="font-medium text-purple-800">验证备份</span>
            </div>
            <p className="text-sm text-purple-700">
              定期尝试恢复备份文件，确保备份可用
            </p>
          </div>
        </div>
      </div>

      {/* 清空数据 */}
      <div className="mt-6 bg-white rounded-xl shadow-sm border border-red-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">清空所有数据</h3>
            <p className="text-sm text-gray-500">清空系统所有数据，恢复初始状态</p>
          </div>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="text-sm text-red-800">
              <p className="font-medium">⚠️ 警告：</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>此操作将清空所有数据，不可撤销</li>
                <li>建议先导出备份再执行此操作</li>
                <li>当前用户会保持登录状态</li>
              </ul>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowClearConfirm(true)}
          className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Trash2 className="w-5 h-5" />
          清空所有数据
        </button>
      </div>

      {/* 清空数据确认对话框 */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <h3 className="text-xl font-bold text-gray-900">确认清空数据？</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              此操作将清空系统所有数据，包括：教师、学生、课程、教室、排课记录等，恢复初始状态。此操作不可撤销！
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 py-2 px-4 rounded-lg font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleClearAllData}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
              >
                确认清空
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default Backup;
