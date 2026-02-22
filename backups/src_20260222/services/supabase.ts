import { createClient } from '@supabase/supabase-js';
import type { Teacher, Student, Course, Room, ScheduledClass, Conflict, Faculty } from '../types';

// 禁用Supabase连接，使用localStorage作为数据存储
const supabaseUrl = 'https://disabled-supabase.local';
const supabaseAnonKey = 'disabled-key';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 认证服务 - 使用localStorage而不是Supabase
export const authService = {
  async signUp(email: string, password: string, fullName: string, facultyCode: string, specialty: string[] = []) {
    // 使用localStorage实现注册
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    // 检查邮箱是否已存在
    if (users.some(u => u.email === email)) {
      throw new Error('邮箱已存在');
    }
    
    const newUser = {
      id: Date.now().toString(),
      email,
      password,
      full_name: fullName,
      faculty_code: facultyCode,
      specialty,
      created_at: new Date().toISOString()
    };
    
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    
    return { user: newUser, session: null };
  },

  async signIn(email: string, password: string) {
    // 使用localStorage实现登录
    const { authService: localAuthService } = await import('./localStorage');
    
    try {
      const result = await localAuthService.signIn(email, password);
      return { user: result.user, session: { user: result.user } };
    } catch (error) {
      throw error;
    }
  },

  async signOut() {
    // 使用localStorage实现登出
    localStorage.removeItem('current_user');
    return { error: null };
  },

  async getCurrentUser() {
    // 使用localStorage获取当前用户
    const { authService: localAuthService } = await import('./localStorage');
    return await localAuthService.getCurrentUser();
  },

  async getTeacherProfile(userId: string) {
    // 使用localStorage实现教师资料获取
    const { authService: localAuthService } = await import('./localStorage');
    return await localAuthService.getTeacherProfile(userId);
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    // 监听localStorage变化来模拟认证状态变化
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'current_user') {
        const userStr = e.newValue;
        const user = userStr ? JSON.parse(userStr) : null;
        callback(user ? 'SIGNED_IN' : 'SIGNED_OUT', { user });
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            window.removeEventListener('storage', handleStorageChange);
          }
        }
      }
    };
  },

  async getFaculties(): Promise<Faculty[]> {
    // 直接返回默认配置，不尝试连接Supabase
    return [
      { id: '1', faculty_name: '钢琴专业', faculty_code: 'PIANO', description: '负责所有钢琴课程教学', created_at: new Date().toISOString() },
      { id: '2', faculty_name: '声乐专业', faculty_code: 'VOCAL', description: '负责所有声乐课程教学', created_at: new Date().toISOString() },
      { id: '3', faculty_name: '器乐专业', faculty_code: 'INSTRUMENT', description: '负责所有器乐课程教学', created_at: new Date().toISOString() },
    ];
  },
};

// 学生服务 - 使用localStorage
export const studentService = {
  async create(student: Omit<Student, 'id' | 'created_at'>) {
    // 使用localStorage实现
    const { teacherService } = await import('./localStorage');
    return await teacherService.create(student);
  },

  async createMany(students: Omit<Student, 'id' | 'created_at'>[]) {
    // 使用localStorage实现
    const { teacherService } = await import('./localStorage');
    // 批量创建逻辑需要根据localStorage服务的实际实现来调整
    const results = [];
    for (const student of students) {
      const result = await teacherService.create(student);
      results.push(result);
    }
    return results;
  },

  async getByTeacher(teacherId: string) {
    // 使用localStorage实现
    const { teacherService } = await import('./localStorage');
    const teachers = await teacherService.getAll();
    const teacher = teachers.find(t => t.teacher_id === teacherId);
    
    if (!teacher) return [];
    
    // 这里需要根据localStorage的实际结构来获取学生数据
    const students = JSON.parse(localStorage.getItem('students') || '[]');
    return students.filter(s => s.teacher_id === teacherId);
  },

  async delete(id: string) {
    // 使用localStorage实现
    const students = JSON.parse(localStorage.getItem('students') || '[]');
    const filteredStudents = students.filter(s => s.id !== id);
    localStorage.setItem('students', JSON.stringify(filteredStudents));
  },
};

// 课程服务 - 使用localStorage
export const courseService = {
  async create(course: Omit<Course, 'id' | 'created_at'>) {
    // 使用localStorage实现
    const { courseService: localCourseService } = await import('./localStorage');
    return await localCourseService.create(course);
  },

  async createMany(courses: Omit<Course, 'id' | 'created_at'>[]) {
    // 使用localStorage实现
    const { courseService: localCourseService } = await import('./localStorage');
    return await localCourseService.createMany(courses);
  },

  async getByTeacher(teacherId: string) {
    // 使用localStorage实现
    const { courseService: localCourseService } = await import('./localStorage');
    return await localCourseService.getByTeacher(teacherId);
  },

  async delete(id: string) {
    // 使用localStorage实现
    const { courseService: localCourseService } = await import('./localStorage');
    return await localCourseService.delete(id);
  },
};

// 教室服务 - 使用localStorage
export const roomService = {
  async create(room: Omit<Room, 'id' | 'created_at'>) {
    // 使用localStorage实现
    const { roomService: localRoomService } = await import('./localStorage');
    return await localRoomService.create(room);
  },

  async createMany(rooms: Omit<Room, 'id' | 'created_at'>[]) {
    // 使用localStorage实现
    const { roomService: localRoomService } = await import('./localStorage');
    return await localRoomService.createMany(rooms);
  },

  async getByTeacher(teacherId: string) {
    // 使用localStorage实现
    const { roomService: localRoomService } = await import('./localStorage');
    return await localRoomService.getByTeacher(teacherId);
  },

  async delete(id: string) {
    // 使用localStorage实现
    const { roomService: localRoomService } = await import('./localStorage');
    return await localRoomService.delete(id);
  },
};

// 排课服务 - 使用localStorage
export const scheduleService = {
  async create(scheduledClass: Omit<ScheduledClass, 'id' | 'created_at'>) {
    // 使用localStorage实现
    const { scheduleService: localScheduleService } = await import('./localStorage');
    return await localScheduleService.create(scheduledClass);
  },

  async createMany(scheduledClasses: Omit<ScheduledClass, 'id' | 'created_at'>[]) {
    // 使用localStorage实现
    const { scheduleService: localScheduleService } = await import('./localStorage');
    return await localScheduleService.createMany(scheduledClasses);
  },

  async getByTeacher(teacherId: string, startDate?: string, endDate?: string) {
    // 使用localStorage实现
    const { scheduleService: localScheduleService } = await import('./localStorage');
    return await localScheduleService.getByTeacher(teacherId);
  },
};

// 冲突服务 - 使用localStorage
export const conflictService = {
  async create(conflict: Omit<Conflict, 'id' | 'created_at'>) {
    // 使用localStorage实现
    const { conflictService: localConflictService } = await import('./localStorage');
    return await localConflictService.create(conflict);
  },

  async getByTeacher(teacherId: string) {
    // 使用localStorage实现
    const { conflictService: localConflictService } = await import('./localStorage');
    return await localConflictService.getByTeacher(teacherId);
  },

  async markResolved(id: string) {
    // 使用localStorage实现
    const { conflictService: localConflictService } = await import('./localStorage');
    return await localConflictService.markResolved(id);
  },
};

export default supabase;
