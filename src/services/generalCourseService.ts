// 通适大课自动识别服务
import type { Teacher } from '../types';
import { supabase } from './supabase';

export interface GeneralCourse {
  id: string;
  course_name: string;
  teacher_name: string;
  teacher_id?: string;
  weekday: number;
  period_start: number;
  period_end: number;
  location?: string;
  class_name?: string;
  credit_hours?: number;
  total_hours?: number;
  weeks_pattern?: string;
  notes?: string;
  course_type: 'general' | 'major' | 'uncertain';
  recognition_method: string;
  created_at: string;
  confirmed: boolean;
}

export interface CourseIdentificationResult {
  general_courses: GeneralCourse[];
  uncertain_courses: GeneralCourse[];
  statistics: {
    total: number;
    identified_general: number;
    uncertain: number;
    auto_recognition_rate: number;
  };
  blocked_times: TimeBlock[];
}

export interface TimeBlock {
  weekday: number;
  time_slot: string;
  weeks_pattern: string;
  course_name: string;
  teacher_name: string;
  block_type: 'general_course' | 'major_course' | 'group_course';
  priority: number;
}

class GeneralCourseService {
  private internalTeachers: Set<string> = new Set();
  private internalTeacherIds: Set<string> = new Set();

  // 加载本系教师名单
  async loadInternalTeachers(): Promise<void> {
    try {
      const { data: teachers } = await supabase
        .from('teachers')
        .select('name, teacher_id')
        .eq('is_active', true);
      
      if (teachers) {
        teachers.forEach(teacher => {
          if (teacher.name) this.internalTeachers.add(teacher.name);
          if (teacher.teacher_id) this.internalTeacherIds.add(teacher.teacher_id);
        });
      }
      
      console.log(`已加载 ${this.internalTeachers.size} 名本系教师`);
    } catch (error) {
      console.error('加载教师名单失败:', error);
    }
  }

  // 上传并识别通适大课
  async identifyGeneralCourses(file: File): Promise<CourseIdentificationResult> {
    try {
      await this.loadInternalTeachers();
      
      // 解析Excel文件
      const workbook = await this.parseExcelFile(file);
      const sheetData = this.extractSheetData(workbook);
      
      const identifiedCourses: GeneralCourse[] = [];
      const uncertainCourses: GeneralCourse[] = [];
      
      // 识别每门课程
      for (const courseData of sheetData) {
        const course = await this.identifyCourse(courseData);
        
        if (course.course_type === 'general') {
          identifiedCourses.push(course);
        } else {
          uncertainCourses.push(course);
        }
      }
      
      // 生成时间屏蔽
      const blocked_times = this.generateTimeBlocks(identifiedCourses);
      
      // 计算统计信息
      const total = identifiedCourses.length + uncertainCourses.length;
      const statistics = {
        total,
        identified_general: identifiedCourses.length,
        uncertain: uncertainCourses.length,
        auto_recognition_rate: total > 0 ? Math.round((identifiedCourses.length / total) * 100) : 0
      };
      
      const result: CourseIdentificationResult = {
        general_courses: identifiedCourses,
        uncertain_courses: uncertainCourses,
        statistics,
        blocked_times
      };
      
      // 保存识别结果
      await this.saveIdentificationResult(result, file.name);
      
      return result;
    } catch (error) {
      console.error('识别通适大课失败:', error);
      throw new Error('识别通适大课失败');
    }
  }

  // 解析Excel文件
  private async parseExcelFile(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          // 这里需要使用xlsx库解析Excel
          // 由于演示目的，我们模拟解析结果
          resolve(this.mockParseExcelData());
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsArrayBuffer(file);
    });
  }

  // 模拟Excel数据解析（实际项目中需要用xlsx库）
  private mockParseExcelData(): any[] {
    return [
      {
        course_name: '《多声部音乐分析与写作（二）》',
        teacher_name: '王教授',
        teacher_id: '2023005',
        weekday: 2,
        period_start: 3,
        period_end: 4,
        location: '音乐厅305',
        class_name: '音乐学2301',
        credit_hours: 2.0,
        total_hours: 32,
        weeks_pattern: '1-16周',
        notes: '需钢琴教室'
      },
      {
        course_name: '《和声学基础》',
        teacher_name: '张老师',
        teacher_id: '2021001',
        weekday: 1,
        period_start: 5,
        period_end: 6,
        location: '多媒体教室201',
        class_name: '音乐学2401',
        credit_hours: 3.0,
        total_hours: 48,
        weeks_pattern: '1-16周',
        notes: ''
      },
      {
        course_name: '《曲式分析》',
        teacher_name: '李老师',
        teacher_id: '2022003',
        weekday: 3,
        period_start: 1,
        period_end: 2,
        location: '理论教室105',
        class_name: '音乐学2302',
        credit_hours: 2.5,
        total_hours: 40,
        weeks_pattern: '1-16周(单)',
        notes: '多媒体教室'
      }
    ];
  }

  // 提取工作表数据
  private extractSheetData(workbook: any): any[] {
    // 实际实现中需要解析工作表
    return workbook.sheets?.[0]?.data || [];
  }

  // 识别单门课程
  private async identifyCourse(courseData: any): Promise<GeneralCourse> {
    const teacher_name = courseData.teacher_name || '';
    const teacher_id = courseData.teacher_id || '';
    
    // 判断课程类型
    let course_type: 'general' | 'major' | 'uncertain' = 'uncertain';
    let recognition_method = 'unknown';
    
    if (this.isExternalTeacher(teacher_name, teacher_id)) {
      course_type = 'general';
      recognition_method = 'teacher_name_not_in_internal_list';
    } else if (this.isInternalTeacher(teacher_name, teacher_id)) {
      course_type = 'major';
      recognition_method = 'teacher_name_in_internal_list';
    } else {
      course_type = 'uncertain';
      recognition_method = 'cannot_determine';
    }
    
    return {
      id: `gc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      course_name: courseData.course_name,
      teacher_name,
      teacher_id,
      weekday: courseData.weekday,
      period_start: courseData.period_start,
      period_end: courseData.period_end,
      location: courseData.location,
      class_name: courseData.class_name,
      credit_hours: courseData.credit_hours,
      total_hours: courseData.total_hours,
      weeks_pattern: courseData.weeks_pattern,
      notes: courseData.notes,
      course_type,
      recognition_method,
      created_at: new Date().toISOString(),
      confirmed: course_type === 'general'
    };
  }

  // 判断是否为外部教师
  private isExternalTeacher(teacher_name: string, teacher_id: string = ''): boolean {
    // 检查姓名是否在本系名单中
    if (teacher_name && !this.internalTeachers.has(teacher_name)) {
      return true;
    }
    
    // 如果有工号，检查工号前缀
    if (teacher_id) {
      // 本系教师工号通常以MUS、ART等开头
      const internalPrefixes = ['MUS', 'ART', 'MUSIC', 'ART'];
      const isInternalPrefix = internalPrefixes.some(prefix => 
        teacher_id.toUpperCase().startsWith(prefix)
      );
      if (!isInternalPrefix) {
        return true;
      }
    }
    
    return false;
  }

  // 判断是否为本系教师
  private isInternalTeacher(teacher_name: string, teacher_id: string = ''): boolean {
    // 姓名完全匹配
    if (teacher_name && this.internalTeachers.has(teacher_name)) {
      return true;
    }
    
    // 工号匹配
    if (teacher_id && this.internalTeacherIds.has(teacher_id)) {
      return true;
    }
    
    return false;
  }

  // 生成时间屏蔽
  private generateTimeBlocks(generalCourses: GeneralCourse[]): TimeBlock[] {
    return generalCourses.map(course => ({
      weekday: course.weekday,
      time_slot: `${course.period_start}-${course.period_end}`,
      weeks_pattern: course.weeks_pattern || '1-16周',
      course_name: course.course_name,
      teacher_name: course.teacher_name,
      block_type: 'general_course',
      priority: 100 // 通适大课优先级最高
    }));
  }

  // 保存识别结果
  private async saveIdentificationResult(result: CourseIdentificationResult, filename: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('general_course_identification')
        .insert({
          upload_batch: `batch_${Date.now()}`,
          original_filename: filename,
          total_records: result.statistics.total,
          identified_general: result.statistics.identified_general,
          uncertain: result.statistics.uncertain,
          auto_recognition_rate: result.statistics.auto_recognition_rate,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      // 保存识别出的课程
      if (result.general_courses.length > 0) {
        await supabase
          .from('general_courses')
          .insert(result.general_courses.map(course => ({
            ...course,
            identification_batch: data.id
          })));
      }

      // 保存时间屏蔽
      if (result.blocked_times.length > 0) {
        await supabase
          .from('time_block_records')
          .insert(result.blocked_times.map(block => ({
            ...block,
            semester: this.getCurrentSemester(),
            created_at: new Date().toISOString()
          })));
      }

      console.log('识别结果已保存到数据库');
    } catch (error) {
      console.error('保存识别结果失败:', error);
    }
  }

  // 获取当前学期
  private getCurrentSemester(): string {
    const now = new Date();
    const month = now.getMonth() + 1;
    const academicYear = month >= 8 ? `${now.getFullYear()}-${now.getFullYear() + 1}` : `${now.getFullYear() - 1}-${now.getFullYear()}`;
    const semester = month >= 8 ? '1' : '2';
    return `${academicYear}-${semester}`;
  }

  // 获取所有通适大课
  async getAllGeneralCourses(): Promise<GeneralCourse[]> {
    try {
      const { data, error } = await supabase
        .from('general_courses')
        .select('*')
        .eq('confirmed', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('获取通适大课失败:', error);
      return [];
    }
  }

  // 获取时间屏蔽记录
  async getTimeBlocks(blockType?: 'general_course' | 'major_course'): Promise<TimeBlock[]> {
    try {
      let query = supabase
        .from('time_block_records')
        .select('*')
        .eq('is_active', true)
        .eq('semester', this.getCurrentSemester());

      if (blockType) {
        query = query.eq('block_type', blockType);
      }

      const { data, error } = await query.order('weekday', { ascending: true });

      if (error) throw error;
      
      return data?.map(block => ({
        weekday: block.weekday,
        time_slot: block.time_slot,
        weeks_pattern: block.weeks_pattern,
        course_name: block.course_name || '',
        teacher_name: block.teacher_name || '',
        block_type: block.block_type,
        priority: block.priority
      })) || [];
    } catch (error) {
      console.error('获取时间屏蔽失败:', error);
      return [];
    }
  }

  // 确认识别结果
  async confirmIdentification(courseIds: string[], confirmations: Array<{course_id: string; confirm_type: 'general' | 'major'}>): Promise<void> {
    try {
      for (const confirmation of confirmations) {
        await supabase
          .from('general_courses')
          .update({ 
            course_type: confirmation.confirm_type,
            confirmed: true 
          })
          .eq('id', confirmation.course_id);

        // 如果确认为专业大课，添加到时间屏蔽
        if (confirmation.confirm_type === 'major') {
          const course = courseIds.find(c => c.id === confirmation.course_id);
          if (course) {
            await supabase
              .from('time_block_records')
              .insert({
                weekday: course.weekday,
                time_slot: `${course.period_start}-${course.period_end}`,
                weeks_pattern: course.weeks_pattern || '1-16周',
                course_name: course.course_name,
                teacher_name: course.teacher_name,
                block_type: 'major_course',
                priority: 80,
                semester: this.getCurrentSemester(),
                created_at: new Date().toISOString()
              });
          }
        }
      }
    } catch (error) {
      console.error('确认识别结果失败:', error);
      throw error;
    }
  }
}

export const generalCourseService = new GeneralCourseService();