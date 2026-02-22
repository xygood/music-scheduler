import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { courseService, studentService, scheduleService, classService, teacherService, STORAGE_KEYS } from '../services';
import * as XLSX from 'xlsx';
import { Upload, Download, Plus, Trash2, Search, FileSpreadsheet, X, Clock, BookOpen, GraduationCap, Edit2, AlertTriangle } from 'lucide-react';
import type { Course } from '../types';
import {
  COURSE_CONFIG,
  getCourseCredit,
  getRequiredHours,
  calculateClassHours
} from '../types';

// 班级类型
const CLASS_TYPES = [
  { code: 'general', name: '普通班' },
  { code: 'upgrade', name: '专升本' }
] as const;

// 学期配置
const SEMESTERS = [
  { code: '2025-2026-1', name: '2025-2026-1' },
  { code: '2025-2026-2', name: '2025-2026-2' },
  { code: '2026-2027-1', name: '2026-2027-1' },
  { code: '2026-2027-2', name: '2026-2027-2' }
] as const;

// 班级类型定义
type ClassType = {
  id: string;
  class_id: string;
  class_name: string;
  enrollment_year: number;
  class_number: number;
  student_count: number;
  student_type: 'general' | 'upgrade';
  status: 'active' | 'inactive';
  created_at: string;
};

export default function Courses() {
  const { teacher, isAdmin } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [classes, setClasses] = useState<ClassType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCourseType, setFilterCourseType] = useState<'all' | '钢琴' | '声乐' | '器乐'>('all');
  const [selectedClass, setSelectedClass] = useState<string>('');
  // 教师选择状态
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [availableTeachers, setAvailableTeachers] = useState<any[]>([]);
  // 固定使用 2025-2026 学年，只使用完整的学期表示方式
  const [selectedSemesterLabel, setSelectedSemesterLabel] = useState('2025-2026-2');
  
  // 从学期标签中提取学年信息
  const getAcademicYearFromSemester = (semesterLabel: string): string => {
    return semesterLabel.split('-').slice(0, 2).join('-');
  };
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  const [importMode, setImportMode] = useState<'update' | 'override'>('update');
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [batchEditFormData, setBatchEditFormData] = useState({
    course_type: '' as '钢琴' | '声乐' | '器乐' | '',
    teaching_type: '' as '小组课' | '专业大课' | '',
    course_category: '' as 'primary' | 'secondary' | 'general' | '',
    week_frequency: 0,
    duration: 0,
    teacher_name: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    course_name: '',
    course_type: '钢琴' as '钢琴' | '声乐' | '器乐',
    course_category: 'general' as 'primary' | 'secondary' | 'general',
    teaching_type: '小组课' as '小组课' | '专业大课',
    student_id: '',
    student_name: '',
    major_class: '',
    semester_label: '2025-2026-1',
    duration: 30,
    week_frequency: 1,
    group_size: 1
  });

  // 加载教师列表
  useEffect(() => {
    const fetchTeachers = async () => {
      if (isAdmin) {
        try {
          const teachers = await teacherService.getAll();
          setAvailableTeachers(teachers);
        } catch (error) {
          console.error('加载教师列表失败:', error);
        }
      }
    };
    fetchTeachers();
  }, [isAdmin]);

  // 加载课程、学生和排课数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coursesData, studentsData, schedulesData, classesData] = await Promise.all([
          courseService.getAll(),
          studentService.getAll(),
          scheduleService.getAll(),
          classService.getAll()
        ]);
        setCourses(coursesData);
        setStudents(studentsData);
        setSchedules(schedulesData);
        // 只使用真实班级数据
        if (classesData.length > 0) {
          setClasses(classesData as ClassType[]);
        } else {
          setClasses([]);
        }
      } catch (error) {
        console.error('获取数据失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 根据课程获取学期序号
  const getSemesterFromCourse = (courseName: string): number => {
    const match = courseName.match(/[（(](\d+)[）)]/);
    return match ? parseInt(match[1]) : 1;
  };

  // 获取学生类型（普通/专升本）
  const getStudentType = (studentId: string): 'general' | 'upgrade' => {
    const student = students.find(s => s.id === studentId);
    return student?.student_type || 'general';
  };

  // 计算课程学分
  const calculateCredit = (course: Course): number => {
    const semester = course.semester || getSemesterFromCourse(course.course_name);
    const studentType = getStudentType(course.student_id || '');
    return getCourseCredit(course.course_name, semester, studentType);
  };

  // 计算所需课时
  const calculateRequiredHours = (course: Course): number => {
    const semester = course.semester || getSemesterFromCourse(course.course_name);
    const studentType = getStudentType(course.student_id || '');
    return getRequiredHours(course.course_name, semester, studentType);
  };

  // 计算已完成课时（根据排课记录）
  const calculateCompletedHours = (course: Course): number => {
    const courseSchedules = schedules.filter(s => s.course_id === course.id);
    return courseSchedules.reduce((total, sc) => {
      const persons = course.group_size || 1;
      return total + calculateClassHours(course.course_category, persons);
    }, 0);
  };

  // 计算课时完成进度
  const calculateProgress = (course: Course): { completed: number; required: number; percentage: number } => {
    const required = calculateRequiredHours(course);
    const completed = calculateCompletedHours(course);
    const percentage = required > 0 ? Math.min(100, (completed / required) * 100) : 0;
    return { completed: Math.round(completed * 100) / 100, required, percentage };
  };

  // 获取学生姓名
  const getStudentName = (studentId: string): string => {
    const student = students.find(s => s.id === studentId);
    return student?.name || '-';
  };

  // 获取学生主项乐器
  const getStudentPrimaryInstrument = (studentId: string): string => {
    const student = students.find(s => s.id === studentId);
    return student?.primary_instrument || '-';
  };

  // 计算学期序号（根据班级入学年份和当前学年学期）
  const calculateSemesterNumber = (classId: string, academicYear: string, semesterLabel: string): number => {
    const classInfo = classes.find(c => c.class_id === classId);
    if (!classInfo) return 1;

    const classYear = classInfo.enrollment_year;
    const currentYearParts = academicYear.split('-');
    const currentYear = parseInt(currentYearParts[0]);

    // 计算学年差（2025-2026学年，班级2024年入学，第一学期是第1学期）
    const yearDiff = currentYear - classYear;
    const semesterNum = semesterLabel.endsWith('-1') ? 1 : 2;

    return yearDiff * 2 + semesterNum;
  };

  // 获取班级应配课程配置
  const getCoursesForClass = (classId: string, academicYear: string, semesterNumber: number): { piano: string; vocal: string; instrument: string } => {
    const classInfo = classes.find(c => c.class_id === classId);
    if (!classInfo) return { piano: '', vocal: '', instrument: '' };

    const isUpgrade = classInfo.student_type === 'upgrade';
    const prefix = isUpgrade ? '专升本' : '';

    // 根据学期返回应配课程
    switch (semesterNumber) {
      case 1:
        return {
          piano: `${prefix}钢琴（一）`,
          vocal: `${prefix}声乐（一）`,
          instrument: `${prefix}器乐（一）`
        };
      case 2:
        return {
          piano: `${prefix}钢琴（二）`,
          vocal: `${prefix}声乐（二）`,
          instrument: `${prefix}器乐（二）`
        };
      case 3:
        return {
          piano: `${prefix}钢琴（三）`,
          vocal: `${prefix}声乐（三）`,
          instrument: `${prefix}器乐（三）`
        };
      case 4:
        return {
          piano: `${prefix}钢琴（四）`,
          vocal: `${prefix}声乐（四）`,
          instrument: `${prefix}器乐（四）`
        };
      case 5:
        return {
          piano: `${prefix}钢琴（五）`,
          vocal: `${prefix}声乐（五）`,
          instrument: `${prefix}器乐（五）`
        };
      case 6:
        return {
          piano: `${prefix}钢琴（六）`,
          vocal: `${prefix}声乐（六）`,
          instrument: `${prefix}器乐（六）`
        };
      case 7:
        return {
          piano: `${prefix}钢琴（七）`,
          vocal: `${prefix}声乐（七）`,
          instrument: `${prefix}器乐（七）`
        };
      default:
        return { piano: '', vocal: '', instrument: '' };
    }
  };

  // 获取选中班级和学期的应配课程
  const getExpectedCourses = () => {
    if (!selectedClass) return null;
    const academicYear = getAcademicYearFromSemester(selectedSemesterLabel);
    const semesterNumber = calculateSemesterNumber(selectedClass, academicYear, selectedSemesterLabel);
    return getCoursesForClass(selectedClass, academicYear, semesterNumber);
  };

  // 获取学期序号显示
  const getSemesterNumberDisplay = () => {
    if (!selectedClass) return '';
    const academicYear = getAcademicYearFromSemester(selectedSemesterLabel);
    const semesterNumber = calculateSemesterNumber(selectedClass, academicYear, selectedSemesterLabel);
    return `第${semesterNumber}学期`;
  };

  // 打开添加课程弹窗
  const handleOpenAddModal = () => {
    setEditingCourse(null);
    setFormData({
      course_name: '',
      course_type: '钢琴',
      course_category: 'general',
      teaching_type: '小组课',
      student_id: '',
      student_name: '',
      major_class: '',
      semester_label: '2025-2026-1',
      duration: 30,
      week_frequency: 1,
      group_size: 1
    });
    setShowModal(true);
  };

  // 打开编辑课程弹窗
  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      course_name: course.course_name,
      course_type: course.course_type,
      course_category: course.course_category,
      teaching_type: (course as any).teaching_type || '小组课',
      student_id: course.student_id || '',
      student_name: course.student_name || '',
      major_class: course.major_class || '',
      semester_label: course.semester_label || '2025-2026-1',
      duration: course.duration,
      week_frequency: course.week_frequency,
      group_size: course.group_size || 1
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacher) return;

    // 验证小组人数限制
    const { course_type, group_size } = formData;
    const LARGE_INSTRUMENTS = ['古筝', '竹笛', '葫芦丝'];
    const isLargeInstrument = LARGE_INSTRUMENTS.some(inst =>
      formData.course_name.includes(inst)
    );

    if (course_type === '器乐' && !isLargeInstrument && group_size > 4) {
      alert('非古筝、竹笛、葫芦丝的器乐课程，小组人数最多4人');
      return;
    }

    if (course_type === '器乐' && isLargeInstrument && group_size > 8) {
      alert('古筝、竹笛、葫芦丝课程，小组人数最多8人');
      return;
    }

    if (course_type !== '器乐' && group_size > 4) {
      alert('钢琴、声乐课程，小组人数最多4人');
      return;
    }

    try {
      const courseData = {
        ...formData,
        teacher_id: teacher.id,
        faculty_id: formData.course_type === '钢琴' ? 'PIANO' : formData.course_type === '声乐' ? 'VOCAL' : 'INSTRUMENT',
        academic_year: getAcademicYearFromSemester(formData.semester_label)
      };

      if (editingCourse) {
        await courseService.update(editingCourse.id, courseData);
      } else {
        await courseService.create(courseData);
      }

      setShowModal(false);
      const data = await courseService.getAll();
      setCourses(data);
    } catch (error) {
      console.error('保存课程失败:', error);
      alert('保存失败，请重试');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除该课程吗？')) return;
    try {
      await courseService.delete(id);
      const data = await courseService.getAll();
      setCourses(data);
    } catch (error) {
      console.error('删除课程失败:', error);
    }
  };

  // 批量删除功能
  const handleBatchDelete = async () => {
    if (!confirm(`确定要删除选中的 ${selectedCourses.length} 个课程吗？`)) return;
    try {
      for (const id of selectedCourses) {
        await courseService.delete(id);
      }
      const data = await courseService.getAll();
      setCourses(data);
      setSelectedCourses([]);
      setSelectAll(false);
    } catch (error) {
      console.error('批量删除课程失败:', error);
      alert('批量删除失败，请重试');
    }
  };

  // 批量编辑功能
  const handleBatchEdit = () => {
    // 重置批量编辑表单
    setBatchEditFormData({
      course_type: '',
      teaching_type: '',
      course_category: '',
      week_frequency: 0,
      duration: 0,
      teacher_name: ''
    });
    setShowBatchEditModal(true);
  };

  // 提交批量编辑
  const handleBatchEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      for (const id of selectedCourses) {
        const course = courses.find(c => c.id === id);
        if (course) {
          const updateData: any = {};
          
          // 只更新有值的字段
          if (batchEditFormData.course_type) {
            updateData.course_type = batchEditFormData.course_type;
            updateData.faculty_id = batchEditFormData.course_type === '钢琴' ? 'PIANO' : 
                                   batchEditFormData.course_type === '声乐' ? 'VOCAL' : 'INSTRUMENT';
          }
          if (batchEditFormData.teaching_type) {
            updateData.teaching_type = batchEditFormData.teaching_type;
          }
          if (batchEditFormData.course_category) {
            updateData.course_category = batchEditFormData.course_category;
          }
          if (batchEditFormData.week_frequency > 0) {
            updateData.week_frequency = batchEditFormData.week_frequency;
          }
          if (batchEditFormData.duration > 0) {
            updateData.duration = batchEditFormData.duration;
          }
          if (batchEditFormData.teacher_name) {
            updateData.teacher_name = batchEditFormData.teacher_name;
          }
          
          if (Object.keys(updateData).length > 0) {
            await courseService.update(id, updateData);
          }
        }
      }
      
      // 重新加载课程数据
      const data = await courseService.getAll();
      setCourses(data);
      setShowBatchEditModal(false);
      setSelectedCourses([]);
      setSelectAll(false);
    } catch (error) {
      console.error('批量编辑课程失败:', error);
      alert('批量编辑失败，请重试');
    }
  };

  // 下载导入模板
  const handleDownloadTemplate = () => {
    const template = [
      {
        '序号': 1,
        '课程编号': 'COURSE001',
        '课程名称': '合唱与指挥*',
        '课程类型': '理论课',
        '授课类型': '专业大课',
        '班级类型': '普通班',
        '年级': '2023级',
        '班级': '2301、2302、2303',
        '总学时': 32,
        '周数': 16,
        '周学时': 2,
        '学分': 2,
        '任课教师': '张辰',
        '备注': ''
      },
      {
        '序号': 2,
        '课程编号': 'COURSE002',
        '课程名称': '钢琴6*',
        '课程类型': '钢琴',
        '授课类型': '小组课',
        '班级类型': '普通班',
        '年级': '2023级',
        '班级': '2301、2302、2303',
        '总学时': 16,
        '周数': 16,
        '周学时': 1,
        '学分': 1,
        '任课教师': '钢琴教研室',
        '备注': ''
      },
      {
        '序号': 3,
        '课程编号': 'COURSE003',
        '课程名称': '曲式与作品分析2',
        '课程类型': '理论课',
        '授课类型': '专业大课',
        '班级类型': '普通班',
        '年级': '2023级',
        '班级': '2302',
        '总学时': 32,
        '周数': 16,
        '周学时': 2,
        '学分': 2,
        '任课教师': '周晓',
        '备注': ''
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '课程信息');
    XLSX.writeFile(workbook, '专业大课导入模板.xlsx');
  };

  // 处理文件上传
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFile(file);
    setUploading(true);
    setUploadProgress('正在解析文件...');
    setImportResult(null);

    try {
      const reader = new FileReader();
      const excelData = await new Promise<ArrayBuffer>((resolve, reject) => {
        reader.onload = (event) => resolve(event.target?.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      });

      const workbook = XLSX.read(excelData, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      setUploadProgress(`正在导入 ${jsonData.length} 条记录...`);

      let successCount = 0;
      let failedCount = 0;

      // 教研室代码映射 - 根据课程名称推断
      const getFacultyFromCourseName = (courseName: string): '钢琴' | '声乐' | '器乐' => {
        const vocalKeywords = ['演唱', '声乐', '合唱', '指挥', '视唱', '练耳'];
        const pianoKeywords = ['钢琴', '即兴伴奏'];
        const instrumentKeywords = ['器乐', '合奏', '室内乐', '曲式', '多声部', '音乐教育', '化妆造型', '视唱练耳'];

        if (vocalKeywords.some(keyword => courseName.includes(keyword))) {
          return '声乐';
        }
        if (pianoKeywords.some(keyword => courseName.includes(keyword))) {
          return '钢琴';
        }
        return '器乐';
      };

      // 教研室ID映射
      const facultyIdMap: Record<string, string> = {
        '钢琴': 'PIANO',
        '声乐': 'VOCAL',
        '器乐': 'INSTRUMENT'
      };

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        setUploadProgress(`正在处理 ${i + 1}/${jsonData.length} 条记录...`);


        // 验证必填字段
        if (!row['课程名称']) {
          console.error('课程名称不存在:', row);
          failedCount++;
          continue;
        }
        if (!row['班级']) {
          console.error('班级不存在:', row);
          failedCount++;
          continue;
        }
        if (!row['周学时']) {
          console.error('周学时不存在:', row);
          failedCount++;
          continue;
        }

        const courseName = row['课程名称'] || '';
        const courseId = row['课程编号'] || '';
        const teachingType = row['授课类型'] || '专业大课';
        const classType = row['班级类型'] || '普通班';
        const grade = String(row['年级'] || '').replace('级', '');
        const majorClasses = String(row['班级'] || '').trim();
        const totalHours = row['总学时'] || '';
        const weeks = row['周数'] || 16;
        const weeklyHours = row['周学时'] || 2;
        const credit = row['学分'] || 2;
        const teacherName = row['任课教师'] || '';
        const remark = row['备注'] || '';

        // 处理班级范围（如2301、2302、2303）
        const classList = majorClasses.split(/、|\/|,|，/).map(cls => cls.trim()).filter(cls => cls);

        // 获取课程类型
        const courseType = row['课程类型'] || getFacultyFromCourseName(courseName);
        const facultyId = facultyIdMap[courseType] || 'INSTRUMENT'; // 默认器乐教研室

        // 固定使用 2025-2026 学年
        const academicYear = '2025-2026';
        const semesterLabel = selectedSemesterLabel;

        try {
          // 检查必要的信息
          if (classList.length === 0) {
            console.error('班级列表为空:', majorClasses);
            failedCount++;
            continue;
          }
          
          
          // 为每个班级创建课程记录
          let classSuccessCount = 0;
          for (const className of classList) {
            try {
              const courseData = {
                course_id: courseId,
                course_name: courseName,
                course_type: courseType,
                course_category: 'general', // 默认通用分类
                teaching_type: teachingType,
                class_type: classType,
                semester: `${grade}级第${parseInt(semesterLabel.split('-')[2])}学期`,
                major_class: className,
                academic_year: academicYear,
                semester_label: semesterLabel,
                duration: teachingType === '专业大课' ? 45 : 30, // 专业大课默认45分钟/课时，小组课默认30分钟
                week_frequency: weeklyHours, // 周学时即为每周上课次数
                teacher_id: teacher?.id || 'unknown',
                student_id: '',
                student_name: '',
                faculty_id: facultyId,
                // 额外字段存储
                credit_hours: credit,
                total_hours: totalHours || (weeks * weeklyHours), // 总课时，优先使用模板中的总学时
                weeks: weeks,
                teacher_name: teacherName,
                remark: remark
              };
              
              
              // 检查localStorage容量
              const currentStorage = localStorage.getItem(STORAGE_KEYS.COURSES) || '[]';
              const currentSize = new Blob([currentStorage]).size;
              const newCourseSize = new Blob([JSON.stringify(courseData)]).size;
              
              if (currentSize + newCourseSize > 5 * 1024 * 1024) { // 5MB限制
                console.error('localStorage容量不足');
                throw new Error('localStorage容量不足');
              }
              
              // 根据导入模式决定是更新还是创建课程
              if (importMode === 'update') {
                // 查找现有课程（根据课程名称和班级）
                const existingCourse = courses.find(c => 
                  c.course_name === courseName && c.major_class === className
                );
                if (existingCourse) {
                  // 更新现有课程
                  await courseService.update(existingCourse.id, courseData);
                  classSuccessCount++;
                } else {
                  // 未找到现有课程，创建新课程
                  await courseService.create(courseData);
                  classSuccessCount++;
                }
              } else {
                // 覆盖模式，直接创建新课程
                await courseService.create(courseData);
                classSuccessCount++;
              }
            } catch (error) {
              console.error('创建课程失败:', error, '班级:', className);
              failedCount++;
            }
          }
          
          if (classSuccessCount > 0) {
            successCount++;
          } else {
            console.error('课程导入失败:', courseName);
          }
        } catch (error) {
          console.error('导入失败:', error);
          failedCount++;
        }

        await new Promise(resolve => setTimeout(resolve, 50));
      }

      setUploadProgress('导入完成！');
      setImportResult({ success: successCount, failed: failedCount });

      // 重新加载课程数据
      const data = await courseService.getAll();
      setCourses(data);
      
      // 从导入的课程中提取班级信息并更新班级列表
      const importedClasses = data.map(course => course.major_class).filter((cls): cls is string => cls !== undefined && cls !== '');
      const uniqueClasses = [...new Set(importedClasses)];
      
      // 更新班级列表
      const currentClasses = await classService.getAll();
      const currentClassIds = new Set(currentClasses.map(cls => cls.class_id));
      
      // 导入课程时不自动创建班级
      // 班级管理请在班级管理页面进行

      setTimeout(() => {
        setUploading(false);
      }, 1500);
    } catch (error) {
      console.error('导入失败:', error);
      setUploadProgress('导入失败，请检查文件格式');
      setUploading(false);
    }
  };

  // 关闭导入弹窗
  const handleCloseImportModal = () => {
    setShowImportModal(false);
    setUploadFile(null);
    setUploadProgress('');
    setImportResult(null);
    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 导出课程数据
  const handleExport = () => {
    const exportData = courses.map(course => ({
      '课程名称': course.course_name,
      '课程类型': course.course_type,
      '课程分类': course.course_category === 'primary' ? '主项' : course.course_category === 'secondary' ? '副项' : '通用',
      '专业班级': course.major_class || '-',
      '学期': course.semester_label || '-',
      '课时时长': course.duration,
      '周课时数': course.week_frequency
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '课程信息');
    XLSX.writeFile(workbook, '课程导出数据.xlsx');
  };

  // 过滤课程
  const filteredCourses = courses.filter(course => {
    // 搜索过滤
    const matchesSearch = course.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          course.student_name?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    // 班级过滤
    if (selectedClass && course.major_class !== selectedClass) return false;

    // 学期过滤
    const currentAcademicYear = getAcademicYearFromSemester(selectedSemesterLabel);
    if (course.academic_year !== currentAcademicYear) return false;
    if (course.semester_label !== selectedSemesterLabel) return false;

    // 课程类型过滤
    if (filterCourseType !== 'all' && course.course_type !== filterCourseType) return false;

    // 教师过滤
    if (!isAdmin) {
      // 非管理员：只能看到自己的课程
      if (course.teacher_id !== teacher?.id && course.teacher_name !== teacher?.name) return false;
    } else {
      // 管理员：根据选择的教师过滤
      if (selectedTeacher && course.teacher_id !== selectedTeacher) {
        // 如果没有teacher_id字段，尝试通过教师姓名匹配
        const selectedTeacherObj = availableTeachers.find(t => t.id === selectedTeacher);
        if (selectedTeacherObj && course.teacher_name !== selectedTeacherObj.name) {
          return false;
        }
      }
    }

    return true;
  });

  // 获取课程分类标签
  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'primary':
        return <span className="badge bg-blue-100 text-blue-700">主项</span>;
      case 'secondary':
        return <span className="badge bg-orange-100 text-orange-700">副项</span>;
      default:
        return <span className="badge bg-gray-100 text-gray-700">通用</span>;
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div></div>;

  return (
    <div className="animate-fade-in">
      <div className="max-w-[1380px] mx-auto px-2.5">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-purple-600" />
              课程管理
            </h1>
            <p className="text-gray-600 mt-1">
              管理课程的导入和排课，包括小组课和专业大课
            </p>
          </div>
        <div className="flex gap-3">

            <button onClick={handleDownloadTemplate} className="btn-secondary flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />下载课程模板
            </button>
            <button onClick={() => setShowImportModal(true)} className="btn-secondary flex items-center gap-2">
              <Upload className="w-4 h-4" />导入课程
            </button>
            <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
              <Download className="w-4 h-4" />导出课程数据
            </button>
          </div>
        </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 mb-4">
        {/* 专业大课统计 */}
        <div className="bg-blue-50 rounded-lg shadow-sm p-3 border border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-700">专业大课总数</p>
              <p className="text-xl font-bold text-blue-800">{courses.filter(c => (c as any).teaching_type === '专业大课').length}</p>
            </div>
            <div className="w-8 h-8 bg-blue-200 rounded flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-blue-700" />
            </div>
          </div>
        </div>
        <div className="bg-green-50 rounded-lg shadow-sm p-3 border border-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-green-700">小组课总数</p>
              <p className="text-xl font-bold text-green-800">{courses.filter(c => (c as any).teaching_type === '小组课').length}</p>
            </div>
            <div className="w-8 h-8 bg-green-200 rounded flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-green-700" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">2023级专业大课</p>
              <p className="text-xl font-bold text-blue-600">{courses.filter(c => (c as any).teaching_type === '专业大课' && c.major_class?.startsWith('23')).length}</p>
            </div>
            <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">2023级小组课</p>
              <p className="text-xl font-bold text-green-600">{courses.filter(c => (c as any).teaching_type === '小组课' && c.major_class?.startsWith('23')).length}</p>
            </div>
            <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">2024级专业大课</p>
              <p className="text-xl font-bold text-blue-600">{courses.filter(c => (c as any).teaching_type === '专业大课' && c.major_class?.startsWith('24')).length}</p>
            </div>
            <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">2024级小组课</p>
              <p className="text-xl font-bold text-green-600">{courses.filter(c => (c as any).teaching_type === '小组课' && c.major_class?.startsWith('24')).length}</p>
            </div>
            <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">2025级专业大课</p>
              <p className="text-xl font-bold text-blue-600">{courses.filter(c => (c as any).teaching_type === '专业大课' && c.major_class?.startsWith('25')).length}</p>
            </div>
            <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">2025级小组课</p>
              <p className="text-xl font-bold text-green-600">{courses.filter(c => (c as any).teaching_type === '小组课' && c.major_class?.startsWith('25')).length}</p>
            </div>
            <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-green-600" />
            </div>
          </div>
        </div>
      </div>



      <div className="card mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="搜索课程..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input pl-10" />
          </div>

          {/* 教师选择（仅管理员） */}
          {isAdmin && (
            <select
              value={selectedTeacher || ''}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              className="input w-48"
            >
              <option value="">全部教师</option>
              {availableTeachers.map(teacher => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name} ({teacher.faculty_name || '教师'})
                </option>
              ))}
            </select>
          )}

          {/* 班级选择 */}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="input w-48"
          >
            <option value="">全部班级</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.class_id}>
                {cls.class_name}
              </option>
            ))}
          </select>

          {/* 学期选择 */}
          <select
            value={selectedSemesterLabel}
            onChange={(e) => setSelectedSemesterLabel(e.target.value)}
            className="input w-40"
          >
            <option value="2025-2026-1">2025-2026-1 学期</option>
            <option value="2025-2026-2">2025-2026-2 学期</option>
          </select>

          <select value={filterCourseType} onChange={(e) => setFilterCourseType(e.target.value as 'all' | '钢琴' | '声乐' | '器乐')} className="input w-32">
            <option value="all">全部类型</option>
            <option value="钢琴">钢琴</option>
            <option value="声乐">声乐</option>
            <option value="器乐">器乐</option>
          </select>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="btn-secondary flex items-center gap-2" disabled={uploading}><Upload className="w-4 h-4" />{uploading ? '导入中...' : '导入 Excel'}</button>
        </div>

        {/* 显示应配课程信息 */}
        {selectedClass && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-900">
                {classes.find(c => c.class_id === selectedClass)?.class_name}
                {' '}{getSemesterNumberDisplay()}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {getExpectedCourses()?.piano && (
                <span className="badge badge-info">{getExpectedCourses()?.piano}</span>
              )}
              {getExpectedCourses()?.vocal && (
                <span className="badge badge-success">{getExpectedCourses()?.vocal}</span>
              )}
              {getExpectedCourses()?.instrument && (
                <span className="badge badge-warning">{getExpectedCourses()?.instrument}</span>
              )}
            </div>
          </div>
        )}

        {uploadFile && <div className="mt-4 p-3 bg-purple-50 rounded-lg"><span className="text-sm text-purple-600">{uploadProgress}</span></div>}
      </div>

      <div className="card">
        {/* 批量操作工具栏 */}
        {selectedCourses.length > 0 && (
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">已选择 <span className="font-medium text-purple-600">{selectedCourses.length}</span> 个课程</span>
              <button 
                onClick={() => setSelectedCourses([])}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                取消选择
              </button>
            </div>
            <div className="flex gap-2">
              <button 
                id="batchDeleteBtn"
                onClick={handleBatchDelete}
                className="btn-secondary flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />批量删除
              </button>
              <button 
                id="batchEditBtn"
                onClick={handleBatchEdit}
                className="btn-secondary flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" />批量编辑
              </button>
            </div>
          </div>
        )}
        <div className="table-container overflow-x-auto">
          <table className="table min-w-full">
            <thead>
              <tr>
                <th>
                  <input 
                    type="checkbox" 
                    checked={selectAll} 
                    onChange={(e) => {
                      setSelectAll(e.target.checked);
                      if (e.target.checked) {
                        setSelectedCourses(filteredCourses.map(course => course.id));
                      } else {
                        setSelectedCourses([]);
                      }
                    }} 
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                </th>
                <th>序号</th>
                <th>课程编号</th>
                <th>课程名称</th>
                <th>课程类型</th>
                <th>授课类型</th>
                <th>班级类型</th>
                <th>年级</th>
                <th>班级</th>
                <th>总学时</th>
                <th>周数</th>
                <th>周学时</th>
                <th>学分</th>
                <th>任课教师</th>
                <th>备注</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan={15} className="text-center py-8">
                    {selectedClass ? (
                      <div className="space-y-2">
                        <p className="text-gray-500">该班级在此学期暂无课程</p>
                        <p className="text-sm text-blue-600">
                          请使用上方的"导入课程"功能或"添加课程"按钮添加课程
                        </p>
                      </div>
                    ) : (
                      <p className="text-gray-500">请选择班级和学期查看课程</p>
                    )}
                  </td>
                </tr>
              ) : filteredCourses.map((course, index) => {
                const progress = calculateProgress(course);
                // 从 major_class 提取完整年级（如从"2401"提取"2024级"）
                const getFullGrade = (majorClass: string | undefined): string => {
                  if (!majorClass) return '-';
                  // 提取前两位数字作为年份后缀，转换为完整年份
                  const match = majorClass.match(/^(\d{2})/);
                  if (match) {
                    const yearSuffix = parseInt(match[1]);
                    // 根据年份后缀判断是20xx年
                    // 25-99表示2025-2099年，00-24表示2000-2024年
                    const fullYear = yearSuffix >= 25 ? 2000 + yearSuffix : 2000 + yearSuffix;
                    return fullYear + '级';
                  }
                  return '-';
                };
                const grade = getFullGrade(course.major_class);
                const isSelected = selectedCourses.includes(course.id);
                return (
                <tr key={course.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition-colors duration-200 border-b border-gray-200`}>
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCourses([...selectedCourses, course.id]);
                        } else {
                          setSelectedCourses(selectedCourses.filter(id => id !== course.id));
                        }
                      }}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                  </td>
                  <td className="py-3 px-4">{index + 1}</td>
                  <td className="py-3 px-4">{course.course_id || '-'}</td>
                  <td className="py-3 px-4 font-medium">{course.course_name}</td>
                  <td className="py-3 px-4">
                    <span className={`badge ${course.course_type === '钢琴' ? 'badge-info' : course.course_type === '声乐' ? 'badge-success' : 'badge-warning'}`}>
                      {course.course_type}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`badge ${(course as any).teaching_type === '专业大课' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {(course as any).teaching_type || '专业大课'}
                    </span>
                  </td>
                  <td className="py-3 px-4">{(course as any).class_type || '普通班'}</td>
                  <td className="py-3 px-4">{grade}</td>
                  <td className="py-3 px-4">{
                    (() => {
                      // 优先使用 class_name 字段
                      if ((course as any).class_name) {
                        return (course as any).class_name;
                      }
                      // 通过 class_id 查找班级名称
                      const classId = (course as any).class_id;
                      if (classId) {
                        const cls = classes.find(c => c.class_id === classId || c.id === classId);
                        if (cls) {
                          return cls.class_name;
                        }
                      }
                      // 通过 major_class 查找班级名称
                      if (course.major_class) {
                        const cls = classes.find(c => c.class_id === course.major_class);
                        if (cls) {
                          return cls.class_name;
                        }
                      }
                      // 回退到 major_class
                      return course.major_class || '-';
                    })()
                  }</td>
                  <td className="py-3 px-4">{course.total_hours || progress.required}课时</td>
                  <td className="py-3 px-4">{(course as any).weeks || 16}</td>
                  <td className="py-3 px-4">{course.week_frequency || 2}课时/周</td>
                  <td className="py-3 px-4">
                    <span className={`badge ${course.credit_hours === 2 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                      {course.credit_hours || calculateCredit(course)}学分
                    </span>
                  </td>
                  <td className="py-3 px-4">{course.teacher_name || teacher?.name || '-'}</td>
                  <td className="py-3 px-4">{(course as any).remark || '-'}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button onClick={() => handleEditCourse(course)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(course.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 添加/编辑课程弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">{editingCourse ? '编辑课程' : '添加课程'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">课程名称</label>
                <input type="text" value={formData.course_name} onChange={(e) => setFormData({ ...formData, course_name: e.target.value })} className="input" required placeholder="请输入课程名称" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">课程类型</label>
                  <select value={formData.course_type} onChange={(e) => setFormData({ ...formData, course_type: e.target.value as '钢琴' | '声乐' | '器乐' })} className="input">
                    <option value="钢琴">钢琴</option>
                    <option value="声乐">声乐</option>
                    <option value="器乐">器乐</option>
                  </select>
                </div>
                <div>
                  <label className="label">授课类型</label>
                  <select value={formData.teaching_type} onChange={(e) => setFormData({ ...formData, teaching_type: e.target.value as '小组课' | '专业大课' })} className="input">
                    <option value="小组课">小组课</option>
                    <option value="专业大课">专业大课</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">课程分类</label>
                <select value={formData.course_category} onChange={(e) => setFormData({ ...formData, course_category: e.target.value as 'primary' | 'secondary' | 'general' })} className="input">
                  <option value="general">通用课程</option>
                  <option value="primary">主项课程</option>
                  <option value="secondary">副项课程</option>
                </select>
              </div>

              <div>
                <label className="label">学期</label>
                <select value={formData.semester_label} onChange={(e) => setFormData({ ...formData, semester_label: e.target.value })} className="input">
                  <option value="2025-2026-1">2025-2026-1 学期</option>
                  <option value="2025-2026-2">2025-2026-2 学期</option>
                </select>
              </div>

              <div>
                <label className="label">专业班级（可选）</label>
                <input type="text" value={formData.major_class} onChange={(e) => setFormData({ ...formData, major_class: e.target.value })} className="input" placeholder="如：音乐学2401" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">课时长度</label>
                  <select value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })} className="input">
                    {COURSE_CONFIG.durationOptions.map(d => (
                      <option key={d} value={d}>{d}分钟</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">每周次数</label>
                  <select value={formData.week_frequency} onChange={(e) => setFormData({ ...formData, week_frequency: parseInt(e.target.value) })} className="input">
                    {COURSE_CONFIG.weekFrequencyOptions.map(f => (
                      <option key={f} value={f}>{f}次/周</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">小组人数（用于课时计算）</label>
                <select value={formData.group_size} onChange={(e) => setFormData({ ...formData, group_size: parseInt(e.target.value) })} className="input">
                  <option value={1}>1人（1对1）</option>
                  <option value={2}>2人</option>
                  <option value={3}>3人</option>
                  <option value={4}>4人</option>
                  {/* 古筝、竹笛、葫芦丝最多8人，其它最多4人 */}
                  {formData.course_type === '器乐' && (
                    <>
                      <option value={5}>5人</option>
                      <option value={6}>6人</option>
                      <option value={7}>7人</option>
                      <option value={8}>8人</option>
                    </>
                  )}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  根据小组人数自动计算课时系数
                  {formData.course_type === '器乐' && '（古筝、竹笛、葫芦丝最多8人，其它器乐最多4人）'}
                  {formData.course_type !== '器乐' && '（最多4人）'}
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 btn-secondary">取消</button>
                <button type="submit" className="flex-1 btn-primary">{editingCourse ? '保存修改' : '添加课程'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* 批量编辑弹窗 */}
      {showBatchEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">批量编辑课程</h2>
              <button onClick={() => setShowBatchEditModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleBatchEditSubmit} className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-4">
                <p className="text-sm text-blue-700">
                  批量编辑 {selectedCourses.length} 个课程，仅填写需要修改的字段
                </p>
              </div>

              <div>
                <label className="label">课程类型</label>
                <select 
                  value={batchEditFormData.course_type} 
                  onChange={(e) => setBatchEditFormData({ ...batchEditFormData, course_type: e.target.value as '钢琴' | '声乐' | '器乐' | '' })} 
                  className="input"
                >
                  <option value="">保持不变</option>
                  <option value="钢琴">钢琴</option>
                  <option value="声乐">声乐</option>
                  <option value="器乐">器乐</option>
                </select>
              </div>

              <div>
                <label className="label">授课类型</label>
                <select 
                  value={batchEditFormData.teaching_type} 
                  onChange={(e) => setBatchEditFormData({ ...batchEditFormData, teaching_type: e.target.value as '小组课' | '专业大课' | '' })} 
                  className="input"
                >
                  <option value="">保持不变</option>
                  <option value="小组课">小组课</option>
                  <option value="专业大课">专业大课</option>
                </select>
              </div>

              <div>
                <label className="label">课程分类</label>
                <select 
                  value={batchEditFormData.course_category} 
                  onChange={(e) => setBatchEditFormData({ ...batchEditFormData, course_category: e.target.value as 'primary' | 'secondary' | 'general' | '' })} 
                  className="input"
                >
                  <option value="">保持不变</option>
                  <option value="primary">主项课程</option>
                  <option value="secondary">副项课程</option>
                  <option value="general">通用课程</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">每周次数</label>
                  <select 
                    value={batchEditFormData.week_frequency} 
                    onChange={(e) => setBatchEditFormData({ ...batchEditFormData, week_frequency: parseInt(e.target.value) })} 
                    className="input"
                  >
                    <option value="0">保持不变</option>
                    {COURSE_CONFIG.weekFrequencyOptions.map(f => (
                      <option key={f} value={f}>{f}次/周</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">课时长度</label>
                  <select 
                    value={batchEditFormData.duration} 
                    onChange={(e) => setBatchEditFormData({ ...batchEditFormData, duration: parseInt(e.target.value) })} 
                    className="input"
                  >
                    <option value="0">保持不变</option>
                    {COURSE_CONFIG.durationOptions.map(d => (
                      <option key={d} value={d}>{d}分钟</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">任课教师</label>
                <input 
                  type="text" 
                  value={batchEditFormData.teacher_name} 
                  onChange={(e) => setBatchEditFormData({ ...batchEditFormData, teacher_name: e.target.value })} 
                  className="input" 
                  placeholder="保持不变" 
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowBatchEditModal(false)} className="flex-1 btn-secondary">取消</button>
                <button type="submit" className="flex-1 btn-primary">保存修改</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 导入课程弹窗 */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">导入课程</h2>
              <button onClick={handleCloseImportModal} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* 下载模板提示 */}
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700 mb-2">请先下载模板，按格式填写后上传课程信息</p>
              <button onClick={handleDownloadTemplate} className="text-sm text-blue-600 hover:text-blue-800 underline">
                下载专业大课导入模板
              </button>
            </div>

            {/* 导入模式选择 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">导入模式</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="importMode" 
                    value="update" 
                    checked={importMode === 'update'} 
                    onChange={() => setImportMode('update')} 
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-600">更新现有课程</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="importMode" 
                    value="override" 
                    checked={importMode === 'override'} 
                    onChange={() => setImportMode('override')} 
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-600">覆盖创建新课程</span>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                更新模式：根据课程名称和班级查找现有课程并更新，保留原有课程ID<br/>
                覆盖模式：忽略现有课程，创建全新的课程记录
              </p>
            </div>

            {/* 文件上传区域 */}
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${uploadFile ? 'border-purple-500 bg-purple-50' : 'border-gray-300 hover:border-purple-400'}`}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-2">
                {uploadFile ? uploadFile.name : '点击选择或拖拽 Excel 文件到此处'}
              </p>
              <p className="text-sm text-gray-400">支持 .xlsx, .xls, .csv 格式</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* 上传进度 */}
            {uploadProgress && (
              <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                  <span className="text-sm text-purple-600">{uploadProgress}</span>
                </div>
              </div>
            )}

            {/* 导入结果 */}
            {importResult && (
              <div className="mt-4 space-y-3">
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-green-600 font-medium">导入完成！</p>
                  <p className="text-sm text-green-500">成功：{importResult.success} 条，失败：{importResult.failed} 条</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-700 font-medium">课程导入完成</p>
                      <p className="text-sm text-blue-600">
                        课程已成功导入到系统中，可以进行后续的排课
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCloseImportModal}
                className="flex-1 btn-secondary"
                disabled={uploading}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
