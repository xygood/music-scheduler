// 本地存储服务 - 替代 Supabase 的本地数据存储
import { v4 as uuidv4 } from 'uuid';
import type { Teacher, Student, Course, Room, ScheduledClass, Conflict, FACULTIES, SemesterWeekConfig, BlockedSlot, BlockedSlotType, LargeClassSchedule, LargeClassEntry } from '../types';
import { setTeacherRoomByFaculty, getFacultyCodeForInstrument } from '../types';
import DataConsistencyService from './dataConsistencyService';

// 类型定义 - 兼容旧版本的department字段
interface User {
  id: string;
  teacher_id: string;          // 工号，如 120150375
  email: string;
  password?: string;
  full_name: string;
  department: string;          // 兼容旧版本：教研室名称
  faculty_id?: string;         // 教研室ID
  faculty_code?: string;       // 教研室代码（PIANO, VOCAL, INSTRUMENT）
  specialty: string[];         // 可教授的专业/乐器列表
  created_at: string;
}

// 教研室配置
interface FacultyConfig {
  faculty_name: string;
  faculty_code: string;
  description: string;
}

const FACULTY_CONFIG: FacultyConfig[] = [
  { faculty_name: '钢琴专业', faculty_code: 'PIANO', description: '负责所有钢琴课程教学' },
  { faculty_name: '声乐专业', faculty_code: 'VOCAL', description: '负责所有声乐课程教学' },
  { faculty_name: '器乐专业', faculty_code: 'INSTRUMENT', description: '负责所有器乐课程教学（古筝、笛子、古琴、葫芦丝、双排键、小提琴、萨克斯等）' },
];

interface Session {
  user: User | null;
}

// 存储键
export const STORAGE_KEYS = {
  USERS: 'music_scheduler_users',
  CURRENT_USER: 'music_scheduler_current_user',
  TEACHERS: 'music_scheduler_teachers',
  STUDENTS: 'music_scheduler_students',
  CLASSES: 'music_scheduler_classes',
  COURSES: 'music_scheduler_courses',
  ROOMS: 'music_scheduler_rooms',
  SCHEDULED_CLASSES: 'music_scheduler_scheduled_classes',
  CONFLICTS: 'music_scheduler_conflicts',
  SEMESTER_WEEK_CONFIGS: 'music_scheduler_semester_week_configs',
  BLOCKED_SLOTS: 'music_scheduler_blocked_slots',
  LARGE_CLASS_SCHEDULES: 'music_scheduler_large_class_schedules',
  // 新增：学生-教师分配相关存储键
  STUDENT_TEACHER_ASSIGNMENTS: 'music_scheduler_student_teacher_assignments',
  STUDENT_MAJOR_ASSIGNMENTS: 'music_scheduler_student_major_assignments',
  // 新增：在线教师状态和多用户登录
  ONLINE_TEACHERS: 'music_scheduler_online_teachers',
  LOGGED_IN_USERS: 'music_scheduler_logged_in_users',
};

// 初始化示例数据
const initializeDemoData = async () => {
  // 确保用户数据存储存在
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([]));
  }

  // 重新读取用户数据
  let users: User[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
  
  // 检查并创建管理员账号（使用工号作为唯一标识）
  const adminExists = users.find(u => u.teacher_id === '110');
  
  if (!adminExists) {
    const adminUser: User = {
      id: 'admin-001',
      teacher_id: '110',
      email: 'admin@music.edu.cn',
      password: '135',
      full_name: '谷歌',
      department: '系统管理',
      faculty_id: 'ADMIN',
      faculty_code: 'PIANO',
      specialty: ['钢琴', '声乐', '器乐'],
      created_at: new Date().toISOString(),
    };
    users.push(adminUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    console.log('✅ 管理员账号已创建: 工号 110 / 密码 135');
  } else {
    // 强制更新管理员账号信息
    const adminIndex = users.findIndex(u => u.teacher_id === '110');
    if (adminIndex !== -1) {
      users[adminIndex] = {
        ...users[adminIndex],
        full_name: '谷歌',
        password: '135',
        email: 'admin@music.edu.cn',
      };
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      
      // 同步更新当前登录用户
      const currentUserStr = sessionStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (currentUserStr) {
        const currentUser = JSON.parse(currentUserStr);
        if (currentUser.teacher_id === '110') {
          currentUser.full_name = '谷歌';
          sessionStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
        }
      }
    }
    console.log('ℹ️ 管理员账号已存在: 工号 110');
  }

  // 初始化教师数据
  if (!localStorage.getItem(STORAGE_KEYS.TEACHERS)) {
    const initialTeachers: Teacher[] = [
      {
        id: 't1',
        teacher_id: '12015001',
        name: '张老师',
        faculty_id: 'PIANO',
        faculty_name: '钢琴教研室',
        position: '副教授',
        hire_date: '2018-09-01',
        status: 'active',
        qualifications: [
          { instrument_name: '钢琴', proficiency_level: 'primary', granted_at: '2018-09-15T10:00:00Z' },
          { instrument_name: '钢琴伴奏', proficiency_level: 'secondary', granted_at: '2019-03-20T14:30:00Z' }
        ],
        can_teach_instruments: ['钢琴', '钢琴伴奏'],
        max_students_per_class: 5,
        created_at: '2018-09-01T00:00:00Z'
      },
      {
        id: 't2',
        teacher_id: '12015002',
        name: '李老师',
        faculty_id: 'VOCAL',
        faculty_name: '声乐教研室',
        position: '教授',
        hire_date: '2015-03-15',
        status: 'active',
        qualifications: [
          { instrument_name: '声乐', proficiency_level: 'primary', granted_at: '2015-04-01T09:00:00Z' },
          { instrument_name: '合唱', proficiency_level: 'primary', granted_at: '2015-04-01T09:30:00Z' }
        ],
        can_teach_instruments: ['声乐', '合唱'],
        max_students_per_class: 6,
        created_at: '2015-03-15T00:00:00Z'
      },
      {
        id: 't3',
        teacher_id: '12015003',
        name: '王老师',
        faculty_id: 'INSTRUMENT',
        faculty_name: '器乐教研室',
        position: '讲师',
        hire_date: '2020-07-01',
        status: 'active',
        qualifications: [
          { instrument_name: '古筝', proficiency_level: 'primary', granted_at: '2020-08-15T11:00:00Z' },
          { instrument_name: '笛子', proficiency_level: 'secondary', granted_at: '2021-01-10T16:00:00Z' }
        ],
        can_teach_instruments: ['古筝', '笛子'],
        max_students_per_class: 8,
        created_at: '2020-07-01T00:00:00Z'
      },
      {
        id: 't4',
        teacher_id: '12015004',
        name: '赵老师',
        faculty_id: 'PIANO',
        faculty_name: '钢琴教研室',
        position: '助教',
        hire_date: '2022-09-01',
        status: 'active',
        qualifications: [
          { instrument_name: '钢琴', proficiency_level: 'assistant', granted_at: '2022-10-01T10:00:00Z' }
        ],
        can_teach_instruments: ['钢琴'],
        max_students_per_class: 5,
        created_at: '2022-09-01T00:00:00Z'
      },
      {
        id: 't5',
        teacher_id: '12015005',
        name: '陈老师',
        faculty_id: 'VOCAL',
        faculty_name: '声乐教研室',
        position: '副教授',
        hire_date: '2017-11-01',
        status: 'on_leave',
        qualifications: [
          { instrument_name: '声乐', proficiency_level: 'primary', granted_at: '2017-12-15T09:00:00Z' }
        ],
        can_teach_instruments: ['声乐'],
        max_students_per_class: 6,
        created_at: '2017-11-01T00:00:00Z'
      }
    ];
    localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(initialTeachers));
  }

  if (!localStorage.getItem(STORAGE_KEYS.STUDENTS)) {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.COURSES)) {
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.ROOMS)) {
    localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.SCHEDULED_CLASSES)) {
    localStorage.setItem(STORAGE_KEYS.SCHEDULED_CLASSES, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.CONFLICTS)) {
    localStorage.setItem(STORAGE_KEYS.CONFLICTS, JSON.stringify([]));
  }

  // 初始化周次配置数据
  if (!localStorage.getItem(STORAGE_KEYS.SEMESTER_WEEK_CONFIGS)) {
    localStorage.setItem(STORAGE_KEYS.SEMESTER_WEEK_CONFIGS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.BLOCKED_SLOTS)) {
    localStorage.setItem(STORAGE_KEYS.BLOCKED_SLOTS, JSON.stringify([]));
  }
  // 初始化大课表数据
  if (!localStorage.getItem(STORAGE_KEYS.LARGE_CLASS_SCHEDULES)) {
    localStorage.setItem(STORAGE_KEYS.LARGE_CLASS_SCHEDULES, JSON.stringify([]));
  }
  
  // 为教师数据创建用户账号
  await createUserAccountsFromTeachers();
};

// 初始化
(async () => {
  try {
    // 清理旧的在线教师数据（解决账号更换后显示重复的问题）
    const onlineTeachersStr = localStorage.getItem(STORAGE_KEYS.ONLINE_TEACHERS);
    if (onlineTeachersStr) {
      const onlineTeachers = JSON.parse(onlineTeachersStr);
      // 清理工号为110110110的旧数据
      const filteredTeachers = onlineTeachers.filter((t: any) => t.teacher_id !== '110110110');
      if (filteredTeachers.length !== onlineTeachers.length) {
        localStorage.setItem(STORAGE_KEYS.ONLINE_TEACHERS, JSON.stringify(filteredTeachers));
        console.log('✅ 已清理旧的在线教师数据');
      }
    }
    
    // 清理已登录用户列表中的旧数据
    const loggedInUsersStr = localStorage.getItem(STORAGE_KEYS.LOGGED_IN_USERS);
    if (loggedInUsersStr) {
      const loggedInUsers = JSON.parse(loggedInUsersStr);
      const filteredUsers = loggedInUsers.filter((u: any) => u.teacher_id !== '110110110');
      if (filteredUsers.length !== loggedInUsers.length) {
        localStorage.setItem(STORAGE_KEYS.LOGGED_IN_USERS, JSON.stringify(filteredUsers));
        console.log('✅ 已清理旧的已登录用户数据');
      }
    }
    
    console.log('初始化完成');
  } catch (error) {
    console.log('初始化跳过:', error?.message || '未知错误');
  }
})();

// 本地认证服务
export const authService = {
  async signUp(
    email: string,
    password: string,
    fullName: string,
    facultyCode: string,
    specialty: string[] = []
  ): Promise<{ user: User }> {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 500));

    const users: User[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');

    // 检查邮箱是否已存在
    if (users.find(u => u.email === email)) {
      throw new Error('该邮箱已被注册');
    }

    // 获取教研室信息
    const faculty = FACULTY_CONFIG.find(f => f.faculty_code === facultyCode);

    const newUser: User = {
      id: uuidv4(),
      teacher_id: `T${Date.now().toString().slice(-6)}`,
      email,
      password, // 注意：生产环境中不应存储明文密码
      full_name: fullName,
      department: faculty?.faculty_name || '', // 兼容旧版本
      faculty_id: faculty?.faculty_code, // 使用faculty_code作为ID
      faculty_code: facultyCode,
      specialty: specialty.length > 0 ? specialty : [facultyCode === 'PIANO' ? '钢琴' : facultyCode === 'VOCAL' ? '声乐' : '钢琴'],
      created_at: new Date().toISOString(),
    };

    users.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

    // 自动登录
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(newUser));

    return { user: newUser };
  },

  async updateProfile(userId: string, updates: Partial<Pick<User, 'full_name' | 'faculty_code' | 'specialty'>>): Promise<User> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const users: User[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
      throw new Error('用户不存在');
    }

    const faculty = FACULTY_CONFIG.find(f => f.faculty_code === updates.faculty_code);

    users[userIndex] = {
      ...users[userIndex],
      ...updates,
      department: faculty?.faculty_name || users[userIndex].department,
    };

    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

    const teachers: Teacher[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TEACHERS) || '[]');
    const teacherIndex = teachers.findIndex(t => t.teacher_id === users[userIndex].teacher_id);

    if (teacherIndex !== -1) {
      teachers[teacherIndex] = {
        ...teachers[teacherIndex],
        name: updates.full_name || teachers[teacherIndex].name,
        full_name: updates.full_name || teachers[teacherIndex].full_name,
        faculty_code: updates.faculty_code || teachers[teacherIndex].faculty_code,
        faculty_id: updates.faculty_code || teachers[teacherIndex].faculty_id,
        faculty_name: faculty?.faculty_name || teachers[teacherIndex].faculty_name,
        can_teach_instruments: updates.specialty || teachers[teacherIndex].can_teach_instruments,
      };
      localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
    }

    sessionStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(users[userIndex]));

    return users[userIndex];
  },

  async signIn(teacherId: string, password: string): Promise<{ user: User }> {
    await new Promise(resolve => setTimeout(resolve, 500));

    let users: User[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    
    // 调试信息
    console.log('=== 登录调试信息 ===');
    console.log('输入工号:', teacherId);
    console.log('输入密码:', password);
    console.log('预期密码:', teacherId + '123');
    console.log('用户总数:', users.length);
    
    // 查找工号匹配的用户
    let user = users.find(u => u.teacher_id === teacherId);
    
    // 如果用户不存在，检查是否有对应的教师数据并自动创建
    if (!user) {
      console.log(`🔍 未找到工号 ${teacherId} 对应的用户账号，正在检查教师数据...`);
      
      // 检查是否有对应的教师数据
      const teachers: Teacher[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TEACHERS) || '[]');
      const teacher = teachers.find(t => t.teacher_id === teacherId);
      
      if (teacher) {
        console.log(`✅ 找到教师数据: ${teacher.name} (${teacher.teacher_id})，正在创建用户账号...`);
        
        // 为教师创建用户账号
        const defaultPassword = teacherId === '110' ? '135' : teacherId + '123';
        const newUser: User = {
          id: `user-${teacher.id}`,
          teacher_id: teacher.teacher_id,
          email: `${teacher.teacher_id}@music.edu.cn`,
          password: defaultPassword,
          full_name: teacherId === '110' ? '谷歌' : teacher.name,
          department: teacherId === '110' ? '系统管理' : teacher.faculty_name || '',
          faculty_id: teacherId === '110' ? 'ADMIN' : teacher.faculty_id,
          faculty_code: teacher.faculty_code,
          specialty: teacherId === '110' ? ['钢琴', '声乐', '器乐'] : teacher.can_teach_instruments || [],
          created_at: new Date().toISOString(),
        };
        
        users.push(newUser);
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
        user = newUser;
        console.log(`✅ 用户账号已自动创建: ${teacher.teacher_id} / ${defaultPassword}`);
      } else {
        console.log(`⚠️ 未找到工号 ${teacherId} 对应的教师数据，但仍为该工号创建基本用户账号...`);
        
        // 即使没有教师数据，也为该工号创建一个基本的用户账号
        const defaultPassword = teacherId === '110' ? '135' : teacherId + '123';
        const newUser: User = {
          id: `user-temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          teacher_id: teacherId,
          email: `${teacherId}@music.edu.cn`,
          password: defaultPassword,
          full_name: teacherId === '110' ? '谷歌' : '用户' + teacherId, // 管理员使用固定名称
          department: teacherId === '110' ? '系统管理' : '音乐系',
          faculty_id: teacherId === '110' ? 'ADMIN' : 'PIANO',
          faculty_code: 'PIANO',
          specialty: ['钢琴', '声乐', '器乐'],
          created_at: new Date().toISOString(),
        };
        
        users.push(newUser);
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
        user = newUser;
        console.log(`✅ 基本用户账号已自动创建: ${teacherId} / ${defaultPassword}`);
        console.log(`💡 建议导入完整的教师数据以获得更完整的用户信息`);
      }
    }
    
    // 如果仍然没有找到用户（包括教师数据），抛出错误
    if (!user) {
      console.log('❌ 未找到工号匹配的用户');
      // 显示所有工号用于调试
      const allTeacherIds = users.map(u => u.teacher_id);
      console.log('现有工号:', allTeacherIds);
      throw new Error(`工号 ${teacherId} 不存在，请检查工号是否正确`);
    }
    
    console.log('✅ 找到用户:', user.full_name);
    console.log('用户存储的密码:', user.password);
    
    // 验证密码
    let expectedPassword = teacherId + '123';
    
    if (teacherId === '110') {
      expectedPassword = '135';
    }
    
    if (user.password !== expectedPassword) {
      console.log('❌ 密码不匹配');
      console.log('输入密码:', password);
      console.log('预期密码:', expectedPassword);
      console.log('实际密码:', user.password);
      throw new Error('密码错误，请检查工号和密码');
    }
    
    console.log('✅ 登录成功');
    
    // 使用 sessionStorage 存储当前用户，支持多标签页独立登录
    sessionStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    
    // 添加到已登录用户列表（多用户登录支持，使用 localStorage 以便跨标签页共享）
    this.addUserToLoggedInList(user);
    
    // 添加到在线教师列表（使用 localStorage 以便跨标签页共享）
    this.setTeacherOnline(user);
    
    return { user };
  },

  async signOut(): Promise<void> {
    const currentUser = await this.getCurrentUser();
    if (currentUser) {
      // 从在线教师列表中移除
      this.setTeacherOffline(currentUser.id);
    }
    // 使用 sessionStorage，每个标签页独立
    sessionStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  },

  async getCurrentUser(): Promise<User | null> {
    // 使用 sessionStorage，每个标签页独立
    const userStr = sessionStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!userStr) return null;
    return JSON.parse(userStr);
  },

  onAuthStateChange(callback: (event: string, session: { user: User | null }) => void): { data: { subscription: { unsubscribe: () => void } } } {
    // 监听存储变化
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.CURRENT_USER) {
        const userStr = e.newValue;
        const user = userStr ? JSON.parse(userStr) : null;
        callback('SIGNED_OUT', { user });
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return {
      data: {
        subscription: {
          unsubscribe: () => {
            window.removeEventListener('storage', handleStorageChange);
          },
        },
      },
    };
  },

  async getTeacherProfile(userId: string): Promise<Teacher> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const users: User[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    const user = users.find(u => u.id === userId);

    if (!user) {
      throw new Error('用户不存在');
    }

    const teachers: Teacher[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TEACHERS) || '[]');
    const teacher = teachers.find(t => t.teacher_id === user.teacher_id);

    if (teacher) {
      return teacher;
    }

    return {
      id: user.id,
      teacher_id: user.teacher_id,
      name: user.full_name,
      full_name: user.full_name,
      faculty_id: user.faculty_id || '',
      faculty_name: user.department || '',
      faculty_code: user.faculty_code,
      position: '管理员',
      hire_date: user.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      status: 'active',
      can_teach_instruments: user.specialty || [],
      created_at: user.created_at || new Date().toISOString(),
    } as Teacher;
  },

  // 获取教研室配置
  async getFaculties(): Promise<FacultyConfig[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return FACULTY_CONFIG;
  },

  // ========== 在线教师状态管理 ==========
  
  // 在线教师信息接口
  getOnlineTeachers(): Array<{
    id: string;
    teacher_id: string;
    name: string;
    faculty_id: string;
    faculty_name: string;
    loginTime: number;
    lastActivityTime: number;
    status: 'online' | 'busy' | 'away';
  }> {
    const onlineTeachersStr = localStorage.getItem(STORAGE_KEYS.ONLINE_TEACHERS);
    if (!onlineTeachersStr) return [];
    
    const onlineTeachers = JSON.parse(onlineTeachersStr);
    
    const now = Date.now();
    const activeTeachers = onlineTeachers.filter((t: any) => {
      return now - t.lastActivityTime < 5 * 60 * 1000;
    });
    
    const uniqueTeachers: Map<string, any> = new Map();
    activeTeachers.forEach((t: any) => {
      const existing = uniqueTeachers.get(t.teacher_id);
      if (!existing || t.lastActivityTime > existing.lastActivityTime) {
        uniqueTeachers.set(t.teacher_id, t);
      }
    });
    
    const result = Array.from(uniqueTeachers.values());
    
    if (result.length !== onlineTeachers.length) {
      localStorage.setItem(STORAGE_KEYS.ONLINE_TEACHERS, JSON.stringify(result));
    }
    
    return result;
  },

  // 设置教师在线
  setTeacherOnline(user: User): void {
    const onlineTeachers = this.getOnlineTeachers();
    
    const existingIndex = onlineTeachers.findIndex(t => t.teacher_id === user.teacher_id);
    
    const teacherInfo = {
      id: user.id,
      teacher_id: user.teacher_id,
      name: user.full_name,
      faculty_id: user.faculty_id || '',
      faculty_name: user.department || '',
      loginTime: existingIndex >= 0 ? onlineTeachers[existingIndex].loginTime : Date.now(),
      lastActivityTime: Date.now(),
      status: 'online' as const,
    };
    
    if (existingIndex >= 0) {
      onlineTeachers[existingIndex] = teacherInfo;
    } else {
      onlineTeachers.push(teacherInfo);
    }
    
    localStorage.setItem(STORAGE_KEYS.ONLINE_TEACHERS, JSON.stringify(onlineTeachers));
  },

  // 设置教师离线
  setTeacherOffline(userId: string): void {
    const onlineTeachers = this.getOnlineTeachers();
    const filteredTeachers = onlineTeachers.filter(t => t.id !== userId);
    localStorage.setItem(STORAGE_KEYS.ONLINE_TEACHERS, JSON.stringify(filteredTeachers));
  },

  // 更新教师活动时间（心跳）
  updateTeacherActivity(userId: string): void {
    const onlineTeachers = this.getOnlineTeachers();
    const teacherIndex = onlineTeachers.findIndex(t => t.id === userId);
    
    if (teacherIndex >= 0) {
      onlineTeachers[teacherIndex].lastActivityTime = Date.now();
      localStorage.setItem(STORAGE_KEYS.ONLINE_TEACHERS, JSON.stringify(onlineTeachers));
    }
  },

  // ========== 多用户登录支持 ==========

  // 已登录用户信息接口
  getLoggedInUsers(): Array<{
    id: string;
    teacher_id: string;
    name: string;
    faculty_id: string;
    faculty_name: string;
    loginTime: number;
  }> {
    const loggedInUsersStr = localStorage.getItem(STORAGE_KEYS.LOGGED_IN_USERS);
    if (!loggedInUsersStr) return [];
    return JSON.parse(loggedInUsersStr);
  },

  // 添加用户到已登录列表
  addUserToLoggedInList(user: User): void {
    const loggedInUsers = this.getLoggedInUsers();
    
    const existingIndex = loggedInUsers.findIndex(u => u.teacher_id === user.teacher_id);
    
    const userInfo = {
      id: user.id,
      teacher_id: user.teacher_id,
      name: user.full_name,
      faculty_id: user.faculty_id || '',
      faculty_name: user.department || '',
      loginTime: existingIndex >= 0 ? loggedInUsers[existingIndex].loginTime : Date.now(),
    };
    
    if (existingIndex >= 0) {
      loggedInUsers[existingIndex] = userInfo;
    } else {
      loggedInUsers.push(userInfo);
    }
    
    localStorage.setItem(STORAGE_KEYS.LOGGED_IN_USERS, JSON.stringify(loggedInUsers));
  },

  // 从已登录列表中移除用户
  removeUserFromLoggedInList(userId: string): void {
    const loggedInUsers = this.getLoggedInUsers();
    const filteredUsers = loggedInUsers.filter(u => u.id !== userId);
    localStorage.setItem(STORAGE_KEYS.LOGGED_IN_USERS, JSON.stringify(filteredUsers));
  },

  // 切换到已登录的用户
  async switchToUser(userId: string): Promise<User | null> {
    const users: User[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    const user = users.find(u => u.id === userId);
    
    if (user) {
      // 使用 sessionStorage 存储当前用户，支持多标签页独立登录
      sessionStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      this.setTeacherOnline(user);
      return user;
    }
    
    return null;
  },
};

// 教师服务
export const teacherService = {
  async getAll(): Promise<Teacher[]> {
    return withDataConsistency(async () => {
      await new Promise(resolve => setTimeout(resolve, 200));
      return getDataWithStatus<Teacher>(STORAGE_KEYS.TEACHERS);
    }, 'teacher');
  },

  async getById(id: string): Promise<Teacher | null> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const teachers: Teacher[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TEACHERS) || '[]');
    return teachers.find(t => t.id === id) || null;
  },

  async create(teacher: Omit<Teacher, 'id' | 'created_at'>): Promise<Teacher> {
    return withDataConsistency(async () => {
      await new Promise(resolve => setTimeout(resolve, 200));

      const teachers = getDataWithStatus<Teacher>(STORAGE_KEYS.TEACHERS, true);

      const newTeacher: Teacher = {
        ...teacher,
        id: `t${Date.now()}`,
        created_at: new Date().toISOString(),
        status: 'active'
      };

      teachers.push(newTeacher);
      saveDataWithStatus(STORAGE_KEYS.TEACHERS, teachers);

      // 为新创建的教师创建用户账号
      console.log(`为新教师 ${newTeacher.teacher_id} 创建用户账号...`);
      await createUserAccountsFromTeachers();

      return newTeacher;
    }, 'teacher');
  },

  // 导入教师（存在则覆盖，不存在则创建）
  async importManyWithUpsert(teachers: Omit<Teacher, 'id' | 'created_at'>[]): Promise<{
    created: number;
    updated: number;
    skipped: number;
  }> {
    await new Promise(resolve => setTimeout(resolve, 500));

    const existingTeachers: Teacher[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TEACHERS) || '[]');
    // 使用工号作为唯一标识
    const teacherMap = new Map(existingTeachers.map(t => [t.teacher_id, t]));
    const updatedTeachers = [...existingTeachers];

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const teacher of teachers) {
      // 跳过无效数据
      if (!teacher.teacher_id) {
        skipped++;
        continue;
      }

      const existing = teacherMap.get(teacher.teacher_id);
      if (existing) {
        // 更新现有教师
        const index = updatedTeachers.findIndex(t => t.id === existing.id);
        if (index !== -1) {
          updatedTeachers[index] = {
            ...existing,
            ...teacher,
            updated_at: new Date().toISOString(),
          };
        }
        updated++;
      } else {
        // 创建新教师
        const newTeacher: Teacher = {
          ...teacher,
          id: `t${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          created_at: new Date().toISOString(),
        };
        updatedTeachers.push(newTeacher);
        created++;
      }
    }

    localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(updatedTeachers));

    // 如果有新创建的教师，为其创建用户账号
    if (created > 0) {
      console.log(`检测到 ${created} 个新教师，正在为其创建用户账号...`);
      await createUserAccountsFromTeachers();
    }

    return { created, updated, skipped };
  },

  async update(id: string, updates: Partial<Teacher>): Promise<Teacher> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const teachers: Teacher[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TEACHERS) || '[]');
    const index = teachers.findIndex(t => t.id === id);

    if (index === -1) {
      throw new Error('教师不存在');
    }

    teachers[index] = { ...teachers[index], ...updates };
    localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));

    return teachers[index];
  },

  async exists(teacherId: string): Promise<boolean> {
    const teachers: Teacher[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TEACHERS) || '[]');
    return teachers.some(t => t.teacher_id === teacherId);
  },

  // 通过工号查找教师
  async getByTeacherId(teacherId: string): Promise<Teacher | null> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const teachers: Teacher[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TEACHERS) || '[]');
    // 先通过工号精确匹配
    let teacher = teachers.find(t => t.teacher_id === teacherId);
    if (teacher) return teacher;
    // 如果没找到，尝试通过姓名匹配（模糊匹配）
    return teachers.find(t => t.name?.includes(teacherId) || t.full_name?.includes(teacherId)) || null;
  },

  // 更新教师的固定琴房
  async updateFixedRoom(teacherId: string, roomId: string): Promise<Teacher | null> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const teachers: Teacher[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TEACHERS) || '[]');
    const index = teachers.findIndex(t => t.id === teacherId);

    if (index === -1) {
      // 如果按ID没找到，尝试按工号找
      const altIndex = teachers.findIndex(t => t.teacher_id === teacherId);
      if (altIndex === -1) return null;
      teachers[altIndex] = { ...teachers[altIndex], fixed_room_id: roomId };
      localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
      return teachers[altIndex];
    }

    teachers[index] = { ...teachers[index], fixed_room_id: roomId };
    localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
    return teachers[index];
  },

  // 导入教师-琴房关联
  async importTeacherRooms(entries: { teacherIdentifier: string; roomName: string }[]): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    await new Promise(resolve => setTimeout(resolve, 500));

    const teachers: Teacher[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TEACHERS) || '[]');
    const rooms: Room[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.ROOMS) || '[]');

    let success = 0;
    const errors: string[] = [];
    const roomMap = new Map<string, Room>();
    rooms.forEach(r => roomMap.set(r.room_name, r));

    for (const entry of entries) {
      try {
        // 1. 查找教师
        let teacher = teachers.find(t => t.teacher_id === entry.teacherIdentifier);
        if (!teacher) {
          // 尝试通过姓名匹配
          teacher = teachers.find(t =>
            t.name === entry.teacherIdentifier ||
            t.full_name === entry.teacherIdentifier
          );
        }
        if (!teacher) {
          errors.push(`教师 "${entry.teacherIdentifier}" 未找到`);
          continue;
        }

        // 2. 查找或创建教室
        let room = roomMap.get(entry.roomName);
        if (!room) {
          // 创建新教室
          room = {
            id: uuidv4(),
            teacher_id: teacher.id,
            room_name: entry.roomName,
            room_type: '琴房',
            capacity: 1,
            created_at: new Date().toISOString(),
          };
          rooms.push(room);
          roomMap.set(entry.roomName, room);
        }

        // 3. 更新教师的固定琴房
        const teacherIndex = teachers.findIndex(t => t.id === teacher.id);
        if (teacherIndex !== -1) {
          teachers[teacherIndex] = { ...teachers[teacherIndex], fixed_room_id: room.id };
        }

        success++;
      } catch (err: any) {
        errors.push(`教师 "${entry.teacherIdentifier}" / 琴房 "${entry.roomName}": ${err.message}`);
      }
    }

    // 保存所有更改
    localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
    localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(rooms));

    return { success, failed: entries.length - success, errors };
  },

  // 获取教师-琴房关联列表（用于教室管理页面）- 支持多琴房
  async getTeacherRoomMappings(): Promise<Array<{
    teacher: Teacher;
    rooms: Array<{ room: Room | null; faculty_code: string; faculty_name: string }>;
  }>> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const teachers: Teacher[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TEACHERS) || '[]');
    const rooms: Room[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.ROOMS) || '[]');
    const roomMap = new Map(rooms.map(r => [r.id, r]));

    // 教研室配置
    const FACULTY_CONFIG = [
      { faculty_name: '钢琴专业', faculty_code: 'PIANO' },
      { faculty_name: '声乐专业', faculty_code: 'VOCAL' },
      { faculty_name: '器乐专业', faculty_code: 'INSTRUMENT' },
    ];

    return teachers
      .filter(t => t.status !== 'inactive')
      .map(teacher => {
        // 构建教师现有琴房的映射
        const existingRoomsMap = new Map<string, string>();
        if (teacher.fixed_rooms) {
          teacher.fixed_rooms.forEach(fr => {
            existingRoomsMap.set(fr.faculty_code, fr.room_id);
          });
        } else if (teacher.fixed_room_id) {
          existingRoomsMap.set('PIANO', teacher.fixed_room_id);
        }

        // 为每个专业构建琴房数据，确保所有专业都有对应的记录
        const roomList: Array<{ room: Room | null; faculty_code: string; faculty_name: string }> = [];
        
        // 遍历所有专业配置
        for (const faculty of FACULTY_CONFIG) {
          const roomId = existingRoomsMap.get(faculty.faculty_code);
          roomList.push({
            room: roomId ? roomMap.get(roomId) || null : null,
            faculty_code: faculty.faculty_code,
            faculty_name: faculty.faculty_name,
          });
        }

        return { teacher, rooms: roomList };
      });
  },

  // 根据专业代码更新教师的琴房
  async updateTeacherRoomByFaculty(
    teacherId: string,
    facultyCode: string,
    roomId: string
  ): Promise<Teacher | null> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const teachers: Teacher[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TEACHERS) || '[]');
    const index = teachers.findIndex(t => t.id === teacherId);

    if (index === -1) {
      // 如果按ID没找到，尝试按工号找
      const altIndex = teachers.findIndex(t => t.teacher_id === teacherId);
      if (altIndex === -1) return null;

      teachers[altIndex] = setTeacherRoomByFaculty(teachers[altIndex], facultyCode, roomId);
      localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
      return teachers[altIndex];
    }

    teachers[index] = setTeacherRoomByFaculty(teachers[index], facultyCode, roomId);
    localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
    return teachers[index];
  },

  // 清除教师指定专业的琴房
  async clearTeacherRoomByFaculty(teacherId: string, facultyCode: string): Promise<Teacher | null> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const teachers: Teacher[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TEACHERS) || '[]');
    const index = teachers.findIndex(t => t.id === teacherId);

    if (index === -1) {
      const altIndex = teachers.findIndex(t => t.teacher_id === teacherId);
      if (altIndex === -1) return null;

      const teacher = teachers[altIndex];
      if (teacher.fixed_rooms) {
        teacher.fixed_rooms = teacher.fixed_rooms.filter(r => r.faculty_code !== facultyCode);
      }
      localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
      return teacher;
    }

    const teacher = teachers[index];
    if (teacher.fixed_rooms) {
      teacher.fixed_rooms = teacher.fixed_rooms.filter(r => r.faculty_code !== facultyCode);
    }
    localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
    return teacher;
  },

  // 导入教师-琴房关联（多列格式，支持一位教师多个琴房）
  async importTeacherRoomsByFaculty(entries: {
    teacherIdentifier: string;
    pianoRoom?: string;
    vocalRoom?: string;
    instrumentRoom?: string;
    largeClassroom?: string;
    largeClassroomCapacity?: string;
  }[]): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    await new Promise(resolve => setTimeout(resolve, 500));

    // 调试信息：显示输入的条目
    console.log('=== 导入教师琴房关联：输入条目 ===');
    console.log(entries);

    const teachers: Teacher[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TEACHERS) || '[]');
    const rooms: Room[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.ROOMS) || '[]');

    // 调试信息：显示现有教师数据
    console.log('=== 现有教师数据 ===');
    console.log(teachers);

    // 调试信息：显示现有教室数据
    console.log('=== 现有教室数据 ===');
    console.log(rooms);

    let success = 0;
    const errors: string[] = [];
    const roomMap = new Map<string, Room>();
    rooms.forEach(r => roomMap.set(r.room_name, r));

    // 教研室代码映射
    const FACULTY_MAP: Record<string, string> = {
      '钢琴琴房': 'PIANO',
      '声乐琴房': 'VOCAL',
      '器乐琴房': 'INSTRUMENT',
      '大教室': 'LARGE_CLASSROOM',
    };

    for (const entry of entries) {
      try {
        console.log('=== 处理条目 ===');
        console.log('条目数据:', entry);
        
        // 验证教师标识符
        if (!entry.teacherIdentifier || entry.teacherIdentifier.trim() === '') {
          console.log('教师标识符为空，跳过该条目');
          continue;
        }
        
        // 1. 查找教师
        let teacher = teachers.find(t => t.teacher_id === entry.teacherIdentifier);
        console.log('通过工号匹配教师:', teacher);
        
        if (!teacher) {
          // 尝试通过姓名匹配
          teacher = teachers.find(t =>
            t.name === entry.teacherIdentifier ||
            t.full_name === entry.teacherIdentifier
          );
          console.log('通过姓名匹配教师:', teacher);
        }
        if (!teacher) {
          errors.push(`教师 "${entry.teacherIdentifier}" 未找到`);
          console.log('教师未找到，添加错误:', entry.teacherIdentifier);
          continue;
        }

        const teacherIndex = teachers.findIndex(t => t.id === teacher!.id);
        console.log('教师索引:', teacherIndex);

        // 先清除教师现有的所有琴房关联，确保导入的数据是干净的
        console.log('=== 清除现有琴房关联 ===');
        if (teachers[teacherIndex].fixed_rooms) {
          console.log('清除前的fixed_rooms:', teachers[teacherIndex].fixed_rooms);
          teachers[teacherIndex].fixed_rooms = [];
        }
        if (teachers[teacherIndex].fixed_room_id) {
          console.log('清除前的fixed_room_id:', teachers[teacherIndex].fixed_room_id);
          teachers[teacherIndex].fixed_room_id = undefined;
        }
        console.log('清除后的教师数据:', teachers[teacherIndex]);

        // 2. 处理每个专业的琴房
        const roomEntries = [];
        
        // 只处理有实际值的琴房字段
        if (entry.pianoRoom && entry.pianoRoom.trim() !== '') {
          roomEntries.push({ roomName: entry.pianoRoom, facultyCode: 'PIANO', roomType: '琴房', capacity: 1 });
        }
        if (entry.vocalRoom && entry.vocalRoom.trim() !== '') {
          roomEntries.push({ roomName: entry.vocalRoom, facultyCode: 'VOCAL', roomType: '琴房', capacity: 1 });
        }
        if (entry.instrumentRoom && entry.instrumentRoom.trim() !== '') {
          roomEntries.push({ roomName: entry.instrumentRoom, facultyCode: 'INSTRUMENT', roomType: '琴房', capacity: 1 });
        }

        // 处理大教室
        if (entry.largeClassroom && entry.largeClassroom.trim() !== '') {
          const largeClassroomCapacity = entry.largeClassroomCapacity ? parseInt(entry.largeClassroomCapacity) : 50;
          roomEntries.push({
            roomName: entry.largeClassroom,
            facultyCode: 'LARGE_CLASSROOM',
            roomType: '大教室' as const,
            capacity: largeClassroomCapacity > 0 ? largeClassroomCapacity : 50,
          });
        }

        console.log('=== 要处理的琴房条目 ===');
        console.log(roomEntries);

        for (const roomEntry of roomEntries) {
          console.log('=== 处理琴房 ===');
          console.log('琴房条目:', roomEntry);

          // 查找或创建教室
          let room = roomMap.get(roomEntry.roomName);
          console.log('查找现有教室:', room);
          
          if (!room) {
            console.log('创建新教室');
            room = {
              id: uuidv4(),
              teacher_id: roomEntry.roomType === '大教室' ? '' : teacher!.id,
              room_name: roomEntry.roomName,
              room_type: roomEntry.roomType,
              capacity: roomEntry.capacity,
              faculty_code: roomEntry.facultyCode,
              created_at: new Date().toISOString(),
            };
            console.log('新教室:', room);
            rooms.push(room);
            roomMap.set(roomEntry.roomName, room);
          } else {
            console.log('更新现有教室');
            // 更新已有教室的专业代码和容量
            if (!room.faculty_code) {
              room.faculty_code = roomEntry.facultyCode;
              console.log('更新教室专业代码:', roomEntry.facultyCode);
            }
            // 如果是大教室且有容量信息，更新容量
            if (roomEntry.roomType === '大教室' && roomEntry.capacity > 0) {
              room.capacity = roomEntry.capacity;
              console.log('更新教室容量:', roomEntry.capacity);
            }
          }

          // 更新教师的专业琴房
          console.log('更新教师琴房关联');
          console.log('教师原数据:', teachers[teacherIndex]);
          console.log('要设置的琴房:', room.id);
          console.log('要设置的专业:', roomEntry.facultyCode);
          
          teachers[teacherIndex] = setTeacherRoomByFaculty(
            teachers[teacherIndex],
            roomEntry.facultyCode,
            room.id
          );
          
          console.log('教师更新后数据:', teachers[teacherIndex]);
        }

        success++;
      } catch (err: any) {
        errors.push(`教师 "${entry.teacherIdentifier}": ${err.message}`);
      }
    }

    // 保存所有更改
    localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
    localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(rooms));

    return { success, failed: entries.length - success, errors };
  },

  async delete(id: string): Promise<void> {
    return withDataConsistency(async () => {
      await new Promise(resolve => setTimeout(resolve, 200));

      const teachers = getDataWithStatus<Teacher>(STORAGE_KEYS.TEACHERS, true);
      const filtered = teachers.filter(t => t.id !== id);
      saveDataWithStatus(STORAGE_KEYS.TEACHERS, filtered);
    }, 'teacher');
  },

  // 新增：软删除教师
  async softDelete(id: string, deletedBy?: string): Promise<void> {
    return withDataConsistency(async () => {
      await new Promise(resolve => setTimeout(resolve, 200));

      const teachers = getDataWithStatus<Teacher>(STORAGE_KEYS.TEACHERS, true);
      const index = teachers.findIndex(t => t.id === id);
      
      if (index !== -1) {
        teachers[index] = {
          ...teachers[index],
          status: 'soft_deleted',
          deleted_at: new Date().toISOString(),
          deleted_by: deletedBy,
          updated_at: new Date().toISOString()
        };
        saveDataWithStatus(STORAGE_KEYS.TEACHERS, teachers);
      }
    }, 'teacher');
  },

  // 新增：恢复软删除的教师
  async restore(id: string): Promise<void> {
    return withDataConsistency(async () => {
      await new Promise(resolve => setTimeout(resolve, 200));

      const teachers = getDataWithStatus<Teacher>(STORAGE_KEYS.TEACHERS, true);
      const index = teachers.findIndex(t => t.id === id);
      
      if (index !== -1) {
        teachers[index] = {
          ...teachers[index],
          status: 'active',
          deleted_at: undefined,
          deleted_by: undefined,
          updated_at: new Date().toISOString()
        };
        saveDataWithStatus(STORAGE_KEYS.TEACHERS, teachers);
      }
    }, 'teacher');
  },

  // 新增：永久删除教师
  async permanentDelete(id: string): Promise<void> {
    return withDataConsistency(async () => {
      await new Promise(resolve => setTimeout(resolve, 200));

      const teachers = getDataWithStatus<Teacher>(STORAGE_KEYS.TEACHERS, true);
      const filtered = teachers.filter(t => t.id !== id);
      saveDataWithStatus(STORAGE_KEYS.TEACHERS, filtered);
    }, 'teacher');
  },
};

// 学生服务
export const studentService = {
  async create(student: Omit<Student, 'id' | 'created_at'>): Promise<Student> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const students: Student[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENTS) || '[]');

    const newStudent: Student = {
      ...student,
      id: uuidv4(),
      created_at: new Date().toISOString(),
    };

    students.push(newStudent);
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));

    return newStudent;
  },

  async createMany(students: Omit<Student, 'id' | 'created_at'>[]): Promise<Student[]> {
    await new Promise(resolve => setTimeout(resolve, 500));

    const existingStudents: Student[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENTS) || '[]');
    const newStudents: Student[] = students.map(student => ({
      ...student,
      id: uuidv4(),
      created_at: new Date().toISOString(),
    }));

    const updatedStudents = [...existingStudents, ...newStudents];
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updatedStudents));

    return newStudents;
  },

  // 导入学生（存在则覆盖，不存在则创建）
  async importManyWithUpsert(students: Omit<Student, 'id' | 'created_at'>[]): Promise<{
    created: number;
    updated: number;
    skipped: number;
  }> {
    await new Promise(resolve => setTimeout(resolve, 500));

    const existingStudents: Student[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENTS) || '[]');
    const studentMap = new Map(existingStudents.map(s => [s.student_id, s]));
    const updatedStudents = [...existingStudents];

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const student of students) {
      // 跳过无效数据
      if (!student.student_id) {
        skipped++;
        continue;
      }

      const existing = studentMap.get(student.student_id);
      if (existing) {
        // 更新现有学生
        const index = updatedStudents.findIndex(s => s.id === existing.id);
        if (index !== -1) {
          updatedStudents[index] = {
            ...existing,
            ...student,
            updated_at: new Date().toISOString(),
          };
        }
        updated++;
      } else {
        // 创建新学生
        const newStudent: Student = {
          ...student,
          id: uuidv4(),
          created_at: new Date().toISOString(),
        };
        updatedStudents.push(newStudent);
        created++;
      }
    }

    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updatedStudents));

    return { created, updated, skipped };
  },

  async getByTeacher(teacherId: string): Promise<Student[]> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const students: Student[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENTS) || '[]');
    return students.filter(s => s.teacher_id === teacherId).sort((a, b) => a.name.localeCompare(b.name));
  },

  async getAll(): Promise<Student[]> {
    const students: Student[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENTS) || '[]');
    return students.sort((a, b) => a.name.localeCompare(b.name));
  },

  async getByTeacherAndInstrument(teacherId: string, instruments: string[]): Promise<Student[]> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const students: Student[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENTS) || '[]');
    return students.filter(s => {
      const inst = s.primary_instrument || (s.secondary_instruments?.[0]) || '钢琴';
      return s.teacher_id === teacherId && instruments.includes(inst);
    }).sort((a, b) => a.name.localeCompare(b.name));
  },

  async delete(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const students: Student[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENTS) || '[]');
    const filtered = students.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(filtered));
  },

  async update(id: string, updates: Partial<Student>): Promise<Student> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const students: Student[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENTS) || '[]');
    const index = students.findIndex(s => s.id === id);

    if (index === -1) {
      throw new Error('学生不存在');
    }

    students[index] = { ...students[index], ...updates };
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));

    return students[index];
  },

  async clearAll(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200));
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify([]));
  },
};

// 班级类型定义
interface Class {
  id: string;
  class_id: string;
  class_name: string;
  enrollment_year: number;
  class_number: number;
  student_count: number;
  student_type: 'general' | 'upgrade';
  status: 'active' | 'inactive';
  created_at: string;
}

// 班级服务
export const classService = {
  async getAll(): Promise<Class[]> {
    try {
      let classes: Class[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CLASSES) || '[]');
      
      // 确保 classes 是数组
      if (!Array.isArray(classes)) {
        console.warn('班级数据不是数组，重置为空数组');
        classes = [];
        localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes));
      }
      
      // 清理班级名称，防止重复前缀
      const cleanedClasses = classes.map(cls => {
        let cleanedClassName = cls.class_name;
        if (cleanedClassName.includes('音乐学音乐学')) {
          cleanedClassName = cleanedClassName.replace('音乐学音乐学', '音乐学');
        }
        // 也处理其他可能的重复前缀
        const prefixRegex = /^(音乐学|舞蹈学|美术学|表演系)\1+/;
        if (prefixRegex.test(cleanedClassName)) {
          cleanedClassName = cleanedClassName.replace(prefixRegex, '$1');
        }
        
        return {
          ...cls,
          class_name: cleanedClassName,
          class_id: cleanedClassName.replace('音乐学', '')
        };
      });
      
      // 去重，只保留一个正确格式的班级
      const uniqueClasses = [];
      const classMap = new Map();
      
      cleanedClasses.forEach(cls => {
        if (!classMap.has(cls.class_name)) {
          classMap.set(cls.class_name, cls);
          uniqueClasses.push(cls);
        }
      });
      
      return uniqueClasses.sort((a, b) => {
        // 按年份降序，再按班号排序
        if (b.enrollment_year !== a.enrollment_year) {
          return b.enrollment_year - a.enrollment_year;
        }
        return a.class_number - b.class_number;
      });
    } catch (error) {
      console.error('获取班级数据失败:', error);
      return [];
    }
  },

  async getById(id: string): Promise<Class | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    const classes: Class[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CLASSES) || '[]');
    return classes.find(c => c.id === id) || null;
  },

  async getByClassName(className: string): Promise<Class | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    const classes: Class[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CLASSES) || '[]');
    return classes.find(c => c.class_name === className) || null;
  },

  // 从学生数据中提取并更新班级信息
  async syncFromStudents(students: Student[]): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const classes: Class[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CLASSES) || '[]');
    const classMap = new Map<string, Class>();

    // 现有班级转为Map
    classes.forEach(c => classMap.set(c.class_name, c));

    // 统计每个班级的学生
    const studentCountByClass: Record<string, number> = {};
    students.forEach(s => {
      if (s.major_class) {
        studentCountByClass[s.major_class] = (studentCountByClass[s.major_class] || 0) + 1;
      }
    });

    // 更新或创建班级
    const updatedClasses: Class[] = [];
    const processedClasses = new Set<string>();

    classes.forEach(cls => {
      const count = studentCountByClass[cls.class_name] || 0;
      if (count > 0) {
        // 班级还有学生，更新人数
        updatedClasses.push({
          ...cls,
          student_count: count,
          status: 'active'
        });
        processedClasses.add(cls.class_name);
      } else {
        // 班级没有学生，标记为 inactive
        updatedClasses.push({
          ...cls,
          student_count: 0,
          status: 'inactive'
        });
      }
    });

    // 为新出现的班级创建记录
    Object.entries(studentCountByClass).forEach(([className, count]) => {
      // 清理班级名称，防止重复的前缀
      let cleanedClassName = className;
      if (cleanedClassName.includes('音乐学音乐学')) {
        cleanedClassName = cleanedClassName.replace('音乐学音乐学', '音乐学');
      }
      // 也处理其他可能的重复前缀
      const prefixRegex = /^(音乐学|舞蹈学|美术学|表演系)\1+/;
      if (prefixRegex.test(cleanedClassName)) {
        cleanedClassName = cleanedClassName.replace(prefixRegex, '$1');
      }
      
      // 确保班级名称以"音乐学"开头
      if (!cleanedClassName.startsWith('音乐学')) {
        cleanedClassName = `音乐学${cleanedClassName}`;
      }
      
      // 检查是否已经存在正确格式的班级
      if (classMap.has(cleanedClassName)) {
        // 如果已经存在正确格式的班级，更新学生人数
        const existingClass = classMap.get(cleanedClassName);
        if (existingClass) {
          const existingIndex = updatedClasses.findIndex(c => c.class_name === cleanedClassName);
          if (existingIndex !== -1) {
            updatedClasses[existingIndex] = {
              ...updatedClasses[existingIndex],
              student_count: count,
              status: 'active'
            };
          }
        }
      } else if (!processedClasses.has(cleanedClassName) && count > 0) {
        // 解析班级信息
        const isUpgrade = cleanedClassName.includes('专升本');
        const numberMatch = cleanedClassName.match(/(\d+)$/);
        const number = numberMatch ? parseInt(numberMatch[1]) : 1;
        
        // 获取该班级对应的学生数据
        const classStudents = students.filter(s => s.major_class === className || s.major_class === cleanedClassName);
        // 从班级名称中解析入学年份，支持多种格式
        let enrollmentYear: number;
        
        // 格式1: 音乐学2024级1班 (包含完整年份和"级"字)
        const fullYearMatch = cleanedClassName.match(/(20\d{2})级/);
        if (fullYearMatch) {
          enrollmentYear = parseInt(fullYearMatch[1]);
        } 
        // 格式2: 音乐学2401 (2位年份 + 2位班号)
        else if (cleanedClassName.includes('音乐学')) {
          const shortYearMatch = cleanedClassName.match(/音乐学(\d{2})/);
          if (shortYearMatch) {
            enrollmentYear = 2000 + parseInt(shortYearMatch[1]);
          } else {
            enrollmentYear = new Date().getFullYear();
          }
        }
        // 格式3: 使用学生的enrollment_year字段
        else if (classStudents.length > 0 && classStudents[0].enrollment_year) {
          enrollmentYear = classStudents[0].enrollment_year;
        }
        // 格式4: 使用学生的grade字段 (23 -> 2023, 24 -> 2024)
        else if (classStudents.length > 0 && classStudents[0].grade) {
          const grade = classStudents[0].grade;
          enrollmentYear = grade >= 20 ? 2000 + grade : new Date().getFullYear();
        }
        // 默认为当前年份
        else {
          enrollmentYear = new Date().getFullYear();
        }

        const newClass: Class = {
          id: uuidv4(),
          class_id: cleanedClassName.replace('音乐学', ''),
          class_name: cleanedClassName,
          enrollment_year: enrollmentYear,
          class_number: number,
          student_count: count,
          student_type: isUpgrade ? 'upgrade' : 'general',
          status: 'active',
          created_at: new Date().toISOString(),
        };
        updatedClasses.push(newClass);
      }
      
      // 标记清理后的班级名称为已处理
      processedClasses.add(cleanedClassName);
      // 也标记原始班级名称为已处理，防止重复处理
      processedClasses.add(className);
    });

    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(updatedClasses));
  },

  async create(cls: Omit<Class, 'id' | 'created_at'>): Promise<Class> {
    await new Promise(resolve => setTimeout(resolve, 200));

    // 清理班级名称，防止重复前缀
    let cleanedClassName = cls.class_name;
    if (cleanedClassName.includes('音乐学音乐学')) {
      cleanedClassName = cleanedClassName.replace('音乐学音乐学', '音乐学');
    }
    // 也处理其他可能的重复前缀
    const prefixRegex = /^(音乐学|舞蹈学|美术学|表演系)\1+/;
    if (prefixRegex.test(cleanedClassName)) {
      cleanedClassName = cleanedClassName.replace(prefixRegex, '$1');
    }
    
    // 确保班级ID与班级名称一致
    let cleanedClassId = cls.class_id;
    if (cleanedClassId.includes('音乐学')) {
      cleanedClassId = cleanedClassId.replace('音乐学', '');
    }

    const classes: Class[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CLASSES) || '[]');
    const newClass: Class = {
      ...cls,
      class_name: cleanedClassName,
      class_id: cleanedClassId,
      id: uuidv4(),
      created_at: new Date().toISOString(),
    };

    // 检查是否已存在相同的班级
    const existingClass = classes.find(c => c.class_name === cleanedClassName);
    if (existingClass) {
      console.log('班级已存在，返回现有班级:', cleanedClassName);
      return existingClass;
    }

    classes.push(newClass);
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes));

    return newClass;
  },

  async update(id: string, data: Partial<Class>): Promise<Class | null> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const classes: Class[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CLASSES) || '[]');
    const index = classes.findIndex(c => c.id === id);

    if (index === -1) return null;

    classes[index] = { ...classes[index], ...data };
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes));

    return classes[index];
  },

  async delete(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const classes: Class[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CLASSES) || '[]');
    const filtered = classes.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(filtered));
  },
};


// 课程服务
export const courseService = {
  async create(course: Omit<Course, 'id' | 'created_at'>): Promise<Course> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const courses: Course[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.COURSES) || '[]');

    const newCourse: Course = {
      ...course,
      id: uuidv4(),
      created_at: new Date().toISOString(),
    };

    courses.push(newCourse);
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));

    return newCourse;
  },

  // 从智能分配数据同步课程
  async syncFromSmartAssignment(): Promise<{
    created: number;
    updated: number;
    total: number;
  }> {
    await new Promise(resolve => setTimeout(resolve, 500));

    const students: any[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENTS) || '[]');
    const courses: Course[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.COURSES) || '[]');
    const teachers: Teacher[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TEACHERS) || '[]');

    let created = 0;
    let updated = 0;

    // 构建教师映射
    const teacherMap = new Map();
    teachers.forEach(teacher => {
      teacherMap.set(teacher.id, teacher);
      if (teacher.name) {
        // 也按姓名构建映射，便于查找
        teacherMap.set(teacher.name, teacher);
      }
    });

    // 构建现有课程映射
    const courseMap = new Map();
    courses.forEach(course => {
      courseMap.set(course.id, course);
    });

    // 处理每个学生的专业和教师分配
    students.forEach(student => {
      // 处理主项课程
      if (student.primary_instrument && student.assigned_teachers?.primary_teacher_id) {
        const primaryTeacher = teacherMap.get(student.assigned_teachers.primary_teacher_id);
        if (primaryTeacher) {
          const courseKey = `primary_${student.id}_${student.primary_instrument}`;
          const existingCourse = Array.from(courseMap.values()).find(course => 
            // 核心匹配：课程名称和班级
            course.course_name === student.primary_instrument &&
            (course.major_class === student.major_class || course.major_class === student.class_name) &&
            // 灵活处理课程类型
            (course.course_type === '专业小课' || course.course_type === '小组课' || course.course_type === '钢琴' || course.course_type === '声乐' || course.course_type === '器乐' || !course.course_type) &&
            // 灵活处理教师字段
            (!course.teacher_id || course.teacher_id === primaryTeacher.id) &&
            // 灵活处理授课类型
            (!course.teaching_type || course.teaching_type === '专业小课' || course.teaching_type === '小组课' || course.teaching_type === '专业大课')
          );

          if (existingCourse) {
            // 更新现有课程
            existingCourse.student_count = (existingCourse.student_count || 0) + 1;
            updated++;
          } else {
            // 创建新课程
            const newCourse: Course = {
              id: uuidv4(),
              course_id: `MINOR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              course_name: student.primary_instrument,
              course_type: '专业小课',
              teaching_type: '专业小课',
              credit_hours: 16,
              teacher_id: primaryTeacher.id,
              teacher_name: primaryTeacher.name,
              major_class: student.major_class || student.class_name,
              student_count: 1,
              created_at: new Date().toISOString()
            };
            courses.push(newCourse);
            courseMap.set(newCourse.id, newCourse);
            created++;
          }
        }
      }

      // 处理副项1课程
      if (student.secondary_instrument1 && student.assigned_teachers?.secondary1_teacher_id) {
        const secondary1Teacher = teacherMap.get(student.assigned_teachers.secondary1_teacher_id);
        if (secondary1Teacher) {
          const existingCourse = Array.from(courseMap.values()).find(course => 
            // 核心匹配：课程名称和班级
            course.course_name === student.secondary_instrument1 &&
            (course.major_class === student.major_class || course.major_class === student.class_name) &&
            // 灵活处理课程类型
            (course.course_type === '专业小课' || course.course_type === '小组课' || course.course_type === '钢琴' || course.course_type === '声乐' || course.course_type === '器乐' || !course.course_type) &&
            // 灵活处理教师字段
            (!course.teacher_id || course.teacher_id === secondary1Teacher.id) &&
            // 灵活处理授课类型
            (!course.teaching_type || course.teaching_type === '专业小课' || course.teaching_type === '小组课' || course.teaching_type === '专业大课')
          );

          if (existingCourse) {
            existingCourse.student_count = (existingCourse.student_count || 0) + 1;
            updated++;
          } else {
            const newCourse: Course = {
              id: uuidv4(),
              course_id: `MINOR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              course_name: student.secondary_instrument1,
              course_type: '专业小课',
              teaching_type: '专业小课',
              credit_hours: 16,
              teacher_id: secondary1Teacher.id,
              teacher_name: secondary1Teacher.name,
              major_class: student.major_class || student.class_name,
              student_count: 1,
              created_at: new Date().toISOString()
            };
            courses.push(newCourse);
            courseMap.set(newCourse.id, newCourse);
            created++;
          }
        }
      }

      // 处理副项2课程
      if (student.secondary_instrument2 && student.assigned_teachers?.secondary2_teacher_id) {
        const secondary2Teacher = teacherMap.get(student.assigned_teachers.secondary2_teacher_id);
        if (secondary2Teacher) {
          const existingCourse = Array.from(courseMap.values()).find(course => 
            // 核心匹配：课程名称和班级
            course.course_name === student.secondary_instrument2 &&
            (course.major_class === student.major_class || course.major_class === student.class_name) &&
            // 灵活处理课程类型
            (course.course_type === '专业小课' || course.course_type === '小组课' || course.course_type === '钢琴' || course.course_type === '声乐' || course.course_type === '器乐' || !course.course_type) &&
            // 灵活处理教师字段
            (!course.teacher_id || course.teacher_id === secondary2Teacher.id) &&
            // 灵活处理授课类型
            (!course.teaching_type || course.teaching_type === '专业小课' || course.teaching_type === '小组课' || course.teaching_type === '专业大课')
          );

          if (existingCourse) {
            existingCourse.student_count = (existingCourse.student_count || 0) + 1;
            updated++;
          } else {
            const newCourse: Course = {
              id: uuidv4(),
              course_id: `MINOR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              course_name: student.secondary_instrument2,
              course_type: '专业小课',
              teaching_type: '专业小课',
              credit_hours: 16,
              teacher_id: secondary2Teacher.id,
              teacher_name: secondary2Teacher.name,
              major_class: student.major_class || student.class_name,
              student_count: 1,
              created_at: new Date().toISOString()
            };
            courses.push(newCourse);
            courseMap.set(newCourse.id, newCourse);
            created++;
          }
        }
      }

      // 处理副项3课程（专升本）
      if (student.secondary_instrument3 && student.assigned_teachers?.secondary3_teacher_id) {
        const secondary3Teacher = teacherMap.get(student.assigned_teachers.secondary3_teacher_id);
        if (secondary3Teacher) {
          const existingCourse = Array.from(courseMap.values()).find(course => 
            // 核心匹配：课程名称和班级
            course.course_name === student.secondary_instrument3 &&
            (course.major_class === student.major_class || course.major_class === student.class_name) &&
            // 灵活处理课程类型
            (course.course_type === '专业小课' || course.course_type === '小组课' || course.course_type === '钢琴' || course.course_type === '声乐' || course.course_type === '器乐' || !course.course_type) &&
            // 灵活处理教师字段
            (!course.teacher_id || course.teacher_id === secondary3Teacher.id) &&
            // 灵活处理授课类型
            (!course.teaching_type || course.teaching_type === '专业小课' || course.teaching_type === '小组课' || course.teaching_type === '专业大课')
          );

          if (existingCourse) {
            existingCourse.student_count = (existingCourse.student_count || 0) + 1;
            updated++;
          } else {
            const newCourse: Course = {
              id: uuidv4(),
              course_id: `MINOR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              course_name: student.secondary_instrument3,
              course_type: '专业小课',
              teaching_type: '专业小课',
              credit_hours: 16,
              teacher_id: secondary3Teacher.id,
              teacher_name: secondary3Teacher.name,
              major_class: student.major_class || student.class_name,
              student_count: 1,
              created_at: new Date().toISOString()
            };
            courses.push(newCourse);
            courseMap.set(newCourse.id, newCourse);
            created++;
          }
        }
      }
    });

    // 保存更新后的课程数据
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));

    return {
      created,
      updated,
      total: created + updated
    };
  },

  async createMany(courses: Omit<Course, 'id' | 'created_at'>[]): Promise<Course[]> {
    await new Promise(resolve => setTimeout(resolve, 500));

    const existingCourses: Course[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.COURSES) || '[]');
    const newCourses: Course[] = courses.map(course => ({
      ...course,
      id: uuidv4(),
      created_at: new Date().toISOString(),
    }));

    const updatedCourses = [...existingCourses, ...newCourses];
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(updatedCourses));

    return newCourses;
  },

  async getByTeacher(teacherId: string): Promise<Course[]> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const courses: Course[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.COURSES) || '[]');
    return courses.filter(c => c.teacher_id === teacherId).sort((a, b) => a.course_name.localeCompare(b.course_name));
  },

  async getAll(): Promise<Course[]> {
    try {
      const courses: Course[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.COURSES) || '[]');
      return courses.sort((a, b) => a.course_name.localeCompare(b.course_name));
    } catch (error) {
      console.error('获取课程数据失败:', error);
      return [];
    }
  },

  async update(id: string, updates: Partial<Course>): Promise<Course> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const courses: Course[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.COURSES) || '[]');
    const index = courses.findIndex(c => c.id === id);

    if (index === -1) {
      throw new Error('课程不存在');
    }

    courses[index] = { ...courses[index], ...updates };
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));

    return courses[index];
  },

  async getByTeacherAndCourseType(teacherId: string, courseTypes: string[]): Promise<Course[]> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const courses: Course[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.COURSES) || '[]');
    return courses.filter(c =>
      c.teacher_id === teacherId && courseTypes.includes(c.course_type)
    ).sort((a, b) => a.course_name.localeCompare(b.course_name));
  },

  async delete(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const courses: Course[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.COURSES) || '[]');
    const filtered = courses.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(filtered));
  },
};

// 教室服务
export const roomService = {
  async create(room: Omit<Room, 'id' | 'created_at'>): Promise<Room> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const rooms: Room[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.ROOMS) || '[]');

    const newRoom: Room = {
      ...room,
      id: uuidv4(),
      created_at: new Date().toISOString(),
    };

    rooms.push(newRoom);
    localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(rooms));

    return newRoom;
  },

  async createMany(rooms: Omit<Room, 'id' | 'created_at'>[]): Promise<Room[]> {
    await new Promise(resolve => setTimeout(resolve, 500));

    const existingRooms: Room[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.ROOMS) || '[]');
    const newRooms: Room[] = rooms.map(room => ({
      ...room,
      id: uuidv4(),
      created_at: new Date().toISOString(),
    }));

    const updatedRooms = [...existingRooms, ...newRooms];
    localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(updatedRooms));

    return newRooms;
  },

  // 导入教室（存在则覆盖，不存在则创建）
  async importManyWithUpsert(rooms: Omit<Room, 'id' | 'created_at'>[]): Promise<{
    created: number;
    updated: number;
    skipped: number;
  }> {
    await new Promise(resolve => setTimeout(resolve, 500));

    const existingRooms: Room[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.ROOMS) || '[]');
    // 使用教室名称作为唯一标识
    const roomMap = new Map(existingRooms.map(r => [r.room_name, r]));
    const updatedRooms = [...existingRooms];

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const room of rooms) {
      // 跳过无效数据
      if (!room.room_name) {
        skipped++;
        continue;
      }

      const existing = roomMap.get(room.room_name);
      if (existing) {
        // 更新现有教室
        const index = updatedRooms.findIndex(r => r.id === existing.id);
        if (index !== -1) {
          updatedRooms[index] = {
            ...existing,
            ...room,
            updated_at: new Date().toISOString(),
          };
        }
        updated++;
      } else {
        // 创建新教室
        const newRoom: Room = {
          ...room,
          id: uuidv4(),
          created_at: new Date().toISOString(),
        };
        updatedRooms.push(newRoom);
        created++;
      }
    }

    localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(updatedRooms));

    return { created, updated, skipped };
  },

  async getByTeacher(teacherId: string): Promise<Room[]> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const rooms: Room[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.ROOMS) || '[]');
    return rooms.filter(r => r.teacher_id === teacherId).sort((a, b) => a.room_name.localeCompare(b.room_name));
  },

  async getAll(): Promise<Room[]> {
    try {
      const rooms: Room[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.ROOMS) || '[]');
      return rooms.sort((a, b) => a.room_name.localeCompare(b.room_name));
    } catch (error) {
      console.error('获取教室数据失败:', error);
      return [];
    }
  },

  async delete(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const rooms: Room[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.ROOMS) || '[]');
    const filtered = rooms.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(filtered));
  },
};

// 排课服务
export const scheduleService = {
  async create(scheduledClass: Omit<ScheduledClass, 'id' | 'created_at'>): Promise<ScheduledClass> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const classes: ScheduledClass[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.SCHEDULED_CLASSES) || '[]');

    const newClass: ScheduledClass = {
      ...scheduledClass,
      id: uuidv4(),
      created_at: new Date().toISOString(),
    };

    classes.push(newClass);
    localStorage.setItem(STORAGE_KEYS.SCHEDULED_CLASSES, JSON.stringify(classes));

    return newClass;
  },

  async createMany(scheduledClasses: Omit<ScheduledClass, 'id' | 'created_at'>[]): Promise<ScheduledClass[]> {
    await new Promise(resolve => setTimeout(resolve, 500));

    const existingClasses: ScheduledClass[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.SCHEDULED_CLASSES) || '[]');
    const newClasses: ScheduledClass[] = scheduledClasses.map(cls => ({
      ...cls,
      id: uuidv4(),
      created_at: new Date().toISOString(),
    }));

    const updatedClasses = [...existingClasses, ...newClasses];
    localStorage.setItem(STORAGE_KEYS.SCHEDULED_CLASSES, JSON.stringify(updatedClasses));

    return newClasses;
  },

  async getByTeacher(teacherId: string, startDate?: string, endDate?: string): Promise<any[]> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const classes: ScheduledClass[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.SCHEDULED_CLASSES) || '[]');
    const courses: Course[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.COURSES) || '[]');
    const rooms: Room[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.ROOMS) || '[]');
    const students: Student[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENTS) || '[]');

    // 过滤当前教师的课程
    let filteredClasses = classes.filter(c => c.teacher_id === teacherId);

    // 排序：按星期和节次排序
    filteredClasses.sort((a, b) => {
      if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
      return a.period - b.period;
    });

    // 添加关联数据
    return filteredClasses.map(cls => ({
      ...cls,
      courses: courses.find(c => c.id === cls.course_id || (c as any).course_id === cls.course_id),
      rooms: rooms.find(r => r.id === cls.room_id),
      students: students.find(s => s.id === cls.student_id),
    }));
  },

  // 获取所有排课（用于班级课表展示）
  async getAll(): Promise<any[]> {
    try {
      const classes: ScheduledClass[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.SCHEDULED_CLASSES) || '[]');
      const courses: Course[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.COURSES) || '[]');
      const rooms: Room[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.ROOMS) || '[]');
      const students: Student[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENTS) || '[]');

      // 按星期和节次排序
      const sortedClasses = [...classes].sort((a, b) => {
        if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
        return a.period - b.period;
      });

      // 添加关联数据
      return sortedClasses.map(cls => ({
        ...cls,
        courses: courses.find(c => c.id === cls.course_id || (c as any).course_id === cls.course_id),
        rooms: rooms.find(r => r.id === cls.room_id),
        students: students.find(s => s.id === cls.student_id),
      }));
    } catch (error) {
      console.error('获取排课数据失败:', error);
      return [];
    }
  },

  async delete(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const classes: ScheduledClass[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.SCHEDULED_CLASSES) || '[]');
    const filtered = classes.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.SCHEDULED_CLASSES, JSON.stringify(filtered));
  },
};

// 冲突服务
export const conflictService = {
  async create(conflict: Omit<Conflict, 'id' | 'created_at'>): Promise<Conflict> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const conflicts: Conflict[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONFLICTS) || '[]');

    const newConflict: Conflict = {
      ...conflict,
      id: uuidv4(),
      created_at: new Date().toISOString(),
    };

    conflicts.push(newConflict);
    localStorage.setItem(STORAGE_KEYS.CONFLICTS, JSON.stringify(conflicts));

    return newConflict;
  },

  async getByTeacher(teacherId: string): Promise<Conflict[]> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const conflicts: Conflict[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONFLICTS) || '[]');
    return conflicts.filter(c => c.teacher_id === teacherId).sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  async markResolved(id: string): Promise<Conflict> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const conflicts: Conflict[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONFLICTS) || '[]');
    const index = conflicts.findIndex(c => c.id === id);

    if (index === -1) {
      throw new Error('冲突不存在');
    }

    conflicts[index].resolved = true;
    localStorage.setItem(STORAGE_KEYS.CONFLICTS, JSON.stringify(conflicts));

    return conflicts[index];
  },
};

// 工具函数：清空所有数据（用于测试）
export const clearAllData = () => {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
  initializeDemoData();
};

// 工具函数：导入示例数据
export const importDemoData = (userId: string) => {
  // 导入示例学生
  const demoStudents = [
    { teacher_id: userId, student_id: 'S0001', name: '张三', instrument: '钢琴', grade: '一年级' },
    { teacher_id: userId, student_id: 'S0002', name: '李四', instrument: '声乐', grade: '二年级' },
    { teacher_id: userId, student_id: 'S0003', name: '王五', instrument: '小提琴', grade: '一年级' },
    { teacher_id: userId, student_id: 'S0004', name: '赵六', instrument: '大提琴', grade: '三年级' },
    { teacher_id: userId, student_id: 'S0005', name: '陈七', instrument: '古筝', grade: '二年级' },
  ];
  studentService.createMany(demoStudents as any);

  // 导入示例教室
  const demoRooms = [
    { teacher_id: userId, room_name: '101琴房', room_type: '琴房', capacity: 1 },
    { teacher_id: userId, room_name: '102琴房', room_type: '琴房', capacity: 1 },
    { teacher_id: userId, room_name: '103琴房', room_type: '琴房', capacity: 1 },
    { teacher_id: userId, room_name: '201教室', room_type: '教室', capacity: 30 },
    { teacher_id: userId, room_name: '301排练厅', room_type: '排练厅', capacity: 50 },
  ];
  roomService.createMany(demoRooms as any);

  // 导入示例课程
  const demoCourses = [
    { teacher_id: userId, course_name: '钢琴基础训练', course_type: '钢琴' as const, student_id: '', student_name: '张三', duration: 30, week_frequency: 2 },
    { teacher_id: userId, course_name: '声乐技巧训练', course_type: '声乐' as const, student_id: '', student_name: '李四', duration: 45, week_frequency: 2 },
    { teacher_id: userId, course_name: '小提琴独奏', course_type: '器乐' as const, student_id: '', student_name: '王五', duration: 60, week_frequency: 1 },
    { teacher_id: userId, course_name: '大提琴合奏', course_type: '器乐' as const, student_id: '', student_name: '赵六', duration: 60, week_frequency: 1 },
  ];
  courseService.createMany(demoCourses as any);
};

// 数据一致性检查工具函数
const withDataConsistency = async <T>(
  operation: () => Promise<T>,
  entityType: 'teacher' | 'student' | 'course' | 'room' | 'scheduled_class'
): Promise<T> => {
  try {
    const result = await operation();
    // 操作成功后触发数据一致性检查（异步，不阻塞当前操作）
    setTimeout(() => {
      try {
        if (DataConsistencyService && typeof DataConsistencyService.performDataSyncCheck === 'function') {
          DataConsistencyService.performDataSyncCheck().catch(console.error);
        }
      } catch (syncError) {
        console.warn('数据一致性检查失败:', syncError);
      }
    }, 100);
    return result;
  } catch (error) {
    console.error(`数据操作失败 (${entityType}):`, error);
    throw error;
  }
};

// 获取带软删除状态的数据
const getDataWithStatus = <T extends { id: string }>(
  storageKey: string,
  includeDeleted: boolean = false
): T[] => {
  try {
    const data = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (includeDeleted) {
      return data;
    }
    // 默认只返回活跃状态的数据
    return data.filter((item: any) => item.status !== 'soft_deleted');
  } catch (error) {
    console.error(`获取数据失败 (${storageKey}):`, error);
    return [];
  }
};

// 保存数据并确保软删除字段存在
const saveDataWithStatus = <T extends { id: string; status?: string; created_at?: string }>(
  storageKey: string,
  data: T[]
): void => {
  try {
    // 为每条记录确保软删除字段存在
    const processedData = data.map(item => ({
      ...item,
      status: item.status || 'active',
      created_at: item.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    localStorage.setItem(storageKey, JSON.stringify(processedData));
  } catch (error) {
    console.error(`保存数据失败 (${storageKey}):`, error);
    throw error;
  }
};

export default {
  authService,
  teacherService,
  studentService,
  classService,
  courseService,
  roomService,
  scheduleService,
  conflictService,
  dataConsistencyService: DataConsistencyService,
  get weekConfigService() { return weekConfigService; },
  get blockedSlotService() { return blockedSlotService; },
  get largeClassScheduleService() { return largeClassScheduleService; },
  // 新增：学生-教师分配相关服务
  get studentTeacherAssignmentService() { return studentTeacherAssignmentService; },
  get studentMajorAssignmentService() { return studentMajorAssignmentService; },
  clearAllData,
  importDemoData,
  STORAGE_KEYS,
};


// 周次配置服务
export const weekConfigService = {
  async getBySemester(semesterLabel: string): Promise<SemesterWeekConfig | null> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const configs: SemesterWeekConfig[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.SEMESTER_WEEK_CONFIGS) || '[]');
    return configs.find(c => c.semester_label === semesterLabel) || null;
  },

  async save(config: Omit<SemesterWeekConfig, 'id' | 'created_at'> | SemesterWeekConfig): Promise<SemesterWeekConfig> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const configs: SemesterWeekConfig[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.SEMESTER_WEEK_CONFIGS) || '[]');
    const configWithId = config as SemesterWeekConfig;

    if (configWithId.id) {
      // 更新现有配置
      const index = configs.findIndex(c => c.id === configWithId.id);
      if (index !== -1) {
        configs[index] = {
          ...config,
          updated_at: new Date().toISOString(),
        } as SemesterWeekConfig;
        localStorage.setItem(STORAGE_KEYS.SEMESTER_WEEK_CONFIGS, JSON.stringify(configs));
        return configs[index];
      }
    }

    // 创建新配置
    const newConfig: SemesterWeekConfig = {
      ...config,
      id: configWithId.id || uuidv4(),
      created_at: new Date().toISOString(),
    } as SemesterWeekConfig;

    configs.push(newConfig);
    localStorage.setItem(STORAGE_KEYS.SEMESTER_WEEK_CONFIGS, JSON.stringify(configs));

    return newConfig;
  },

  async upsert(config: Omit<SemesterWeekConfig, 'id' | 'created_at'>): Promise<SemesterWeekConfig> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const configs: SemesterWeekConfig[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.SEMESTER_WEEK_CONFIGS) || '[]');

    // 查找是否已存在相同学期的配置
    const existingIndex = configs.findIndex(c => c.semester_label === config.semester_label);

    if (existingIndex !== -1) {
      // 更新现有配置
      configs[existingIndex] = {
        ...configs[existingIndex],
        ...config,
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEYS.SEMESTER_WEEK_CONFIGS, JSON.stringify(configs));
      return configs[existingIndex];
    }

    // 创建新配置
    const newConfig: SemesterWeekConfig = {
      ...config,
      id: uuidv4(),
      created_at: new Date().toISOString(),
    };

    configs.push(newConfig);
    localStorage.setItem(STORAGE_KEYS.SEMESTER_WEEK_CONFIGS, JSON.stringify(configs));

    return newConfig;
  },
};

// 禁排时段服务
export const blockedSlotService = {
  async getAll(): Promise<BlockedSlot[]> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const rawData = localStorage.getItem(STORAGE_KEYS.BLOCKED_SLOTS) || '[]';
    const slots: BlockedSlot[] = JSON.parse(rawData);
    
    // 同时从 priority_blocked_times 加载禁排数据
    const priorityData = localStorage.getItem('music_scheduler_priority_blocked_times') || '[]';
    const prioritySlots: any[] = JSON.parse(priorityData);
    
    // 将 prioritySlots 转换为 BlockedSlot 格式
    const convertedPrioritySlots: BlockedSlot[] = prioritySlots.map((p: any) => {
      // 处理周次范围
      let weeksStr = p.weeks;
      if (!weeksStr && p.weekRange) {
        // 从 weekRange 对象生成 weeks 字符串
        if (p.weekRange.startWeek === p.weekRange.endWeek) {
          weeksStr = String(p.weekRange.startWeek);
        } else {
          weeksStr = `${p.weekRange.startWeek}-${p.weekRange.endWeek}`;
        }
      }
      
      return {
        id: p.id,
        type: 'specific',
        reason: p.reason || p.name || '禁排时间',
        academic_year: p.academicYear,
        semester_label: p.semesterLabel,
        class_associations: p.classNames || p.class_associations || (p.entityName ? [p.entityName] : []),
        weeks: weeksStr,
        week_number: p.week,
        day_of_week: p.dayOfWeek,
        start_period: p.startPeriod,
        end_period: p.endPeriod,
        start_date: p.startDate,
        end_date: p.endDate,
        specific_week_days: p.specificWeekDays || [],
        created_at: p.createdAt,
        updated_at: p.updatedAt
      };
    });
    
    // 合并两种数据源
    const allSlots = [...slots, ...convertedPrioritySlots];
    
    return allSlots.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async getBySemester(semesterLabel: string): Promise<BlockedSlot[]> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const slots: BlockedSlot[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.BLOCKED_SLOTS) || '[]');
    return slots
      .filter(s => s.semester_label === semesterLabel)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async create(slot: Omit<BlockedSlot, 'id' | 'created_at'>): Promise<BlockedSlot> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const slots: BlockedSlot[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.BLOCKED_SLOTS) || '[]');

    const newSlot: BlockedSlot = {
      ...slot,
      id: uuidv4(),
      created_at: new Date().toISOString(),
    };

    slots.push(newSlot);
    localStorage.setItem(STORAGE_KEYS.BLOCKED_SLOTS, JSON.stringify(slots));

    return newSlot;
  },

  async delete(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const slots: BlockedSlot[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.BLOCKED_SLOTS) || '[]');
    const filtered = slots.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.BLOCKED_SLOTS, JSON.stringify(filtered));
  },

  async deleteBySemester(semesterLabel: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const slots: BlockedSlot[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.BLOCKED_SLOTS) || '[]');
    const filtered = slots.filter(s => s.semester_label !== semesterLabel);
    localStorage.setItem(STORAGE_KEYS.BLOCKED_SLOTS, JSON.stringify(filtered));
  },

  async update(id: string, updatedSlot: Partial<BlockedSlot>): Promise<BlockedSlot> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const slots: BlockedSlot[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.BLOCKED_SLOTS) || '[]');
    const index = slots.findIndex(s => s.id === id);

    if (index === -1) {
      throw new Error('禁排时段不存在');
    }

    const updated = {
      ...slots[index],
      ...updatedSlot,
    };

    slots[index] = updated;
    localStorage.setItem(STORAGE_KEYS.BLOCKED_SLOTS, JSON.stringify(slots));

    return updated;
  },
};

// ==================== 大课表服务 ====================

// 大课表服务
export const largeClassScheduleService = {
  // 获取所有大课表
  async getAll(): Promise<LargeClassSchedule[]> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const schedules: LargeClassSchedule[] = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.LARGE_CLASS_SCHEDULES) || '[]'
    );
    return schedules.sort((a, b) =>
      new Date(b.imported_at).getTime() - new Date(a.imported_at).getTime()
    );
  },

  // 根据学期获取大课表
  async getBySemester(semesterLabel: string): Promise<LargeClassSchedule | null> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const schedules: LargeClassSchedule[] = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.LARGE_CLASS_SCHEDULES) || '[]'
    );
    return schedules.find(s => s.semester_label === semesterLabel) || null;
  },

  // 获取所有大课条目（按学期过滤）
  async getEntries(semesterLabel?: string): Promise<LargeClassEntry[]> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const schedules: LargeClassSchedule[] = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.LARGE_CLASS_SCHEDULES) || '[]'
    );

    let entries: LargeClassEntry[] = [];
    for (const schedule of schedules) {
      if (semesterLabel && schedule.semester_label !== semesterLabel) continue;
      entries = [...entries, ...schedule.entries];
    }

    return entries;
  },

  // 获取通适大课课程表（兼容旧代码）
  async getLargeClassSchedule(academicYear: string, semesterLabel: string): Promise<LargeClassEntry[]> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const schedules: LargeClassSchedule[] = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.LARGE_CLASS_SCHEDULES) || '[]'
    );

    let entries: LargeClassEntry[] = [];
    for (const schedule of schedules) {
      if (schedule.academic_year === academicYear && schedule.semester_label === semesterLabel) {
        entries = [...entries, ...schedule.entries];
      }
    }

    return entries;
  },

  // 根据教师姓名获取大课条目
  async getEntriesByTeacher(teacherName: string, semesterLabel?: string): Promise<LargeClassEntry[]> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const entries = await this.getEntries(semesterLabel);
    return entries.filter(e =>
      e.teacher_name.includes(teacherName) ||
      teacherName.includes(e.teacher_name)
    );
  },

  // 导入大课表
  async importSchedule(
    fileName: string,
    academicYear: string,
    semesterLabel: string,
    entries: Omit<LargeClassEntry, 'id' | 'academic_year' | 'semester_label' | 'created_at'>[]
  ): Promise<LargeClassSchedule> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const schedules: LargeClassSchedule[] = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.LARGE_CLASS_SCHEDULES) || '[]'
    );

    // 删除已存在的相同学期的大课表
    const filteredSchedules = schedules.filter(s => s.semester_label !== semesterLabel);

    // 创建新课程条目（添加必要字段）
    const newEntries: LargeClassEntry[] = entries.map(entry => ({
      ...entry,
      id: uuidv4(),
      academic_year: academicYear,
      semester_label: semesterLabel,
      created_at: new Date().toISOString(),
    }));

    const newSchedule: LargeClassSchedule = {
      id: uuidv4(),
      file_name: fileName,
      academic_year: academicYear,
      semester_label: semesterLabel,
      entries: newEntries,
      imported_at: new Date().toISOString(),
    };

    filteredSchedules.push(newSchedule);
    localStorage.setItem(
      STORAGE_KEYS.LARGE_CLASS_SCHEDULES,
      JSON.stringify(filteredSchedules)
    );

    return newSchedule;
  },

  // 删除大课表
  async delete(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const schedules: LargeClassSchedule[] = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.LARGE_CLASS_SCHEDULES) || '[]'
    );
    const filtered = schedules.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.LARGE_CLASS_SCHEDULES, JSON.stringify(filtered));
  },

  // 清空所有大课表
  async clearAll(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200));
    localStorage.setItem(STORAGE_KEYS.LARGE_CLASS_SCHEDULES, JSON.stringify([]));
  },
};

// 新增：学生-教师分配服务
export const studentTeacherAssignmentService = {
  // 创建学生-教师分配
  async create(assignment: Omit<StudentTeacherAssignment, 'id' | 'created_at' | 'updated_at'>): Promise<StudentTeacherAssignment> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const assignments: StudentTeacherAssignment[] = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.STUDENT_TEACHER_ASSIGNMENTS) || '[]'
    );

    const newAssignment: StudentTeacherAssignment = {
      ...assignment,
      id: uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    assignments.push(newAssignment);
    localStorage.setItem(STORAGE_KEYS.STUDENT_TEACHER_ASSIGNMENTS, JSON.stringify(assignments));

    return newAssignment;
  },

  // 批量创建分配
  async createMany(assignments: Omit<StudentTeacherAssignment, 'id' | 'created_at' | 'updated_at'>[]): Promise<StudentTeacherAssignment[]> {
    await new Promise(resolve => setTimeout(resolve, 500));

    const existingAssignments: StudentTeacherAssignment[] = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.STUDENT_TEACHER_ASSIGNMENTS) || '[]'
    );
    const newAssignments: StudentTeacherAssignment[] = assignments.map(assignment => ({
      ...assignment,
      id: uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const updatedAssignments = [...existingAssignments, ...newAssignments];
    localStorage.setItem(STORAGE_KEYS.STUDENT_TEACHER_ASSIGNMENTS, JSON.stringify(updatedAssignments));

    return newAssignments;
  },

  // 获取所有分配
  async getAll(): Promise<StudentTeacherAssignment[]> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const assignments: StudentTeacherAssignment[] = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.STUDENT_TEACHER_ASSIGNMENTS) || '[]'
    );

    // 添加关联数据
    const students: Student[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENTS) || '[]');
    const teachers: Teacher[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TEACHERS) || '[]');

    return assignments.map(assignment => {
      const student = students.find(s => s.id === assignment.student_id);
      const teacher = teachers.find(t => t.id === assignment.teacher_id);
      
      return {
        ...assignment,
        student_name: student?.name,
        teacher_name: teacher?.full_name || teacher?.name,
        faculty_name: assignment.faculty_code === 'PIANO' ? '钢琴专业' : 
                     assignment.faculty_code === 'VOCAL' ? '声乐专业' : '器乐专业',
      };
    });
  },

  // 根据学生ID获取分配
  async getByStudentId(studentId: string): Promise<StudentTeacherAssignment[]> {
    const allAssignments = await this.getAll();
    return allAssignments.filter(a => a.student_id === studentId);
  },

  // 根据教师ID获取分配
  async getByTeacherId(teacherId: string): Promise<StudentTeacherAssignment[]> {
    const allAssignments = await this.getAll();
    return allAssignments.filter(a => a.teacher_id === teacherId);
  },

  // 根据教研室获取分配
  async getByFaculty(facultyCode: string): Promise<StudentTeacherAssignment[]> {
    const allAssignments = await this.getAll();
    return allAssignments.filter(a => a.faculty_code === facultyCode);
  },

  // 获取活跃分配
  async getActiveAssignments(): Promise<StudentTeacherAssignment[]> {
    const allAssignments = await this.getAll();
    return allAssignments.filter(a => a.is_active && a.assignment_status === 'active');
  },

  // 更新分配
  async update(id: string, updates: Partial<StudentTeacherAssignment>): Promise<StudentTeacherAssignment> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const assignments: StudentTeacherAssignment[] = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.STUDENT_TEACHER_ASSIGNMENTS) || '[]'
    );

    const index = assignments.findIndex(a => a.id === id);
    if (index === -1) {
      throw new Error('Assignment not found');
    }

    assignments[index] = {
      ...assignments[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEYS.STUDENT_TEACHER_ASSIGNMENTS, JSON.stringify(assignments));
    return assignments[index];
  },

  // 删除分配
  async delete(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const assignments: StudentTeacherAssignment[] = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.STUDENT_TEACHER_ASSIGNMENTS) || '[]'
    );

    const filtered = assignments.filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEYS.STUDENT_TEACHER_ASSIGNMENTS, JSON.stringify(filtered));
  },

  // 软删除（标记为非活跃）
  async deactivate(id: string): Promise<void> {
    await this.update(id, { 
      is_active: false, 
      assignment_status: 'inactive',
      ended_at: new Date().toISOString()
    });
  },

  // 检查学生在同一乐器上是否已有主修教师
  async hasPrimaryTeacherForInstrument(studentId: string, instrumentName: string): Promise<boolean> {
    const assignments = await this.getByStudentId(studentId);
    return assignments.some(a => 
      a.instrument_name === instrumentName && 
      a.assignment_type === 'primary' && 
      a.is_active
    );
  },

  // 获取分配统计
  async getAssignmentStats(): Promise<{
    totalAssignments: number;
    activeAssignments: number;
    byFaculty: Record<string, number>;
    byType: Record<string, number>;
  }> {
    const assignments = await this.getAll();
    
    return {
      totalAssignments: assignments.length,
      activeAssignments: assignments.filter(a => a.is_active && a.assignment_status === 'active').length,
      byFaculty: assignments.reduce((acc, a) => {
        acc[a.faculty_code] = (acc[a.faculty_code] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byType: assignments.reduce((acc, a) => {
        acc[a.assignment_type] = (acc[a.assignment_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  },

  // 批量分配学生给教师
  async assignStudentsToTeacher(
    studentIds: string[], 
    teacherId: string, 
    facultyCode: string, 
    instrumentName: string,
    assignmentType: 'primary' | 'secondary' | 'substitute' = 'primary'
  ): Promise<StudentTeacherAssignment[]> {
    const assignments: Omit<StudentTeacherAssignment, 'id' | 'created_at' | 'updated_at'>[] = [];

    for (const studentId of studentIds) {
      // 检查是否已有该乐器的分配
      const hasExisting = await this.hasPrimaryTeacherForInstrument(studentId, instrumentName);
      if (hasExisting && assignmentType === 'primary') {
        continue; // 跳过已有主修教师的分配
      }

      assignments.push({
        student_id: studentId,
        teacher_id: teacherId,
        faculty_code: facultyCode as 'PIANO' | 'VOCAL' | 'INSTRUMENT',
        instrument_name: instrumentName,
        assignment_type: assignmentType,
        is_active: true,
        assignment_status: 'active',
        assigned_at: new Date().toISOString(),
        effective_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD格式
      });
    }

    return await this.createMany(assignments);
  },

  // 获取学生分配概览
  async getStudentAssignmentOverview(studentId: string): Promise<StudentAssignmentOverview | null> {
    const assignments = await this.getByStudentId(studentId);
    const students: Student[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENTS) || '[]');
    const student = students.find(s => s.id === studentId);

    if (!student) return null;

    const pianoTeachers = assignments.filter(a => a.faculty_code === 'PIANO');
    const vocalTeachers = assignments.filter(a => a.faculty_code === 'VOCAL');
    const instrumentTeachers = assignments.filter(a => a.faculty_code === 'INSTRUMENT');

    return {
      student_id: studentId,
      student_name: student.name,
      student_number: student.student_id,
      major_class: student.major_class,
      grade: student.grade,
      enrollment_year: student.enrollment_year || new Date().getFullYear(),
      student_status: student.student_status || student.status,
      piano_teachers: pianoTeachers.length,
      vocal_teachers: vocalTeachers.length,
      instrument_teachers: instrumentTeachers.length,
      active_assignments: assignments.filter(a => a.is_active && a.assignment_status === 'active').length,
      piano_teacher_names: pianoTeachers.map(t => t.teacher_name).filter(Boolean).join(', '),
      vocal_teacher_names: vocalTeachers.map(t => t.teacher_name).filter(Boolean).join(', '),
      instrument_teacher_names: instrumentTeachers.map(t => t.teacher_name).filter(Boolean).join(', '),
    };
  },

  // 获取教师工作量统计
  async getTeacherWorkloadStats(teacherId: string): Promise<TeacherWorkloadStats | null> {
    const assignments = await this.getByTeacherId(teacherId);
    const teachers: Teacher[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TEACHERS) || '[]');
    const teacher = teachers.find(t => t.id === teacherId);

    if (!teacher) return null;

    const pianoStudents = assignments.filter(a => a.faculty_code === 'PIANO');
    const vocalStudents = assignments.filter(a => a.faculty_code === 'VOCAL');
    const instrumentStudents = assignments.filter(a => a.faculty_code === 'INSTRUMENT');

    return {
      teacher_id: teacherId,
      teacher_name: teacher.full_name || teacher.name,
      primary_instrument: teacher.primary_instrument,
      faculty_id: teacher.faculty_id,
      faculty_name: teacher.faculty_name,
      faculty_code: teacher.faculty_code,
      total_students: assignments.length,
      piano_students: pianoStudents.length,
      vocal_students: vocalStudents.length,
      instrument_students: instrumentStudents.length,
      active_assignments: assignments.filter(a => a.is_active && a.assignment_status === 'active').length,
      avg_assignments_per_faculty: assignments.length / 3, // 假设三个专业
    };
  },

  // 清空所有分配
  async clearAll(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200));
    localStorage.setItem(STORAGE_KEYS.STUDENT_TEACHER_ASSIGNMENTS, JSON.stringify([]));
  },
};

// 为教师数据创建用户账号的函数
export const createUserAccountsFromTeachers = async (): Promise<void> => {
  try {
    const teachers: Teacher[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TEACHERS) || '[]');
    let users: User[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    
    console.log('开始为教师数据创建用户账号...');
    
    for (const teacher of teachers) {
      // 检查是否已经存在对应的用户账号
      const existingUser = users.find(u => u.teacher_id === teacher.teacher_id);
      
      if (!existingUser) {
        const defaultPassword = teacher.teacher_id === '110' ? '135' : teacher.teacher_id + '123';
        
        const newUser: User = {
          id: `user-${teacher.id}`,
          teacher_id: teacher.teacher_id,
          email: `${teacher.teacher_id}@music.edu.cn`,
          password: defaultPassword,
          full_name: teacher.name,
          department: teacher.faculty_name || '',
          faculty_id: teacher.faculty_id,
          faculty_code: teacher.faculty_code,
          specialty: teacher.can_teach_instruments || [],
          created_at: new Date().toISOString(),
        };
        
        users.push(newUser);
        console.log(`✅ 已创建用户账号: ${teacher.teacher_id} / ${defaultPassword}`);
      }
    }
    
    // 保存更新后的用户数据
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    console.log('用户账号创建完成');
  } catch (error) {
    console.error('创建用户账号失败:', error);
  }
};

// 调试函数：检查教师和用户账号数据
export const debugUserAccountData = (): void => {
  console.log('=== 系统数据调试信息 ===');
  
  // 检查教师数据
  const teachers: Teacher[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TEACHERS) || '[]');
  console.log(`📊 教师数据总数: ${teachers.length}`);
  teachers.forEach(teacher => {
    console.log(`  - ${teacher.teacher_id}: ${teacher.name} (${teacher.faculty_name})`);
  });
  
  // 检查用户数据
  const users: User[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
  console.log(`👤 用户数据总数: ${users.length}`);
  users.forEach(user => {
    console.log(`  - ${user.teacher_id}: ${user.full_name} (${user.password})`);
  });
  
  // 匹配检查
  console.log('🔍 匹配检查:');
  teachers.forEach(teacher => {
    const user = users.find(u => u.teacher_id === teacher.teacher_id);
    if (!user) {
      console.log(`  ❌ 教师 ${teacher.teacher_id} (${teacher.name}) 没有对应的用户账号`);
    } else {
      console.log(`  ✅ 教师 ${teacher.teacher_id} (${teacher.name}) 有对应的用户账号`);
    }
  });
};

// 手动为特定教师创建用户账号
export const createUserAccountForTeacher = async (teacherId: string, customPassword?: string): Promise<void> => {
  try {
    const teachers: Teacher[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TEACHERS) || '[]');
    let users: User[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    
    const teacher = teachers.find(t => t.teacher_id === teacherId);
    if (!teacher) {
      throw new Error(`未找到工号为 ${teacherId} 的教师`);
    }
    
    // 检查是否已经存在对应的用户账号
    const existingUser = users.find(u => u.teacher_id === teacherId);
    if (existingUser) {
      console.log(`工号 ${teacherId} 的用户账号已存在`);
      return;
    }
    
    // 使用自定义密码或默认密码（管理员特殊处理）
    const password = customPassword || (teacherId === '110' ? '135' : teacherId + '123');
    
    const newUser: User = {
      id: `user-${teacher.id}`,
      teacher_id: teacher.teacher_id,
      email: `${teacher.teacher_id}@music.edu.cn`,
      password: password,
      full_name: teacher.name,
      department: teacher.faculty_name || '',
      faculty_id: teacher.faculty_id,
      faculty_code: teacher.faculty_code,
      specialty: teacher.can_teach_instruments || [],
      created_at: new Date().toISOString(),
    };
    
    users.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    
    console.log(`已为教师 ${teacherId} 创建用户账号: ${teacherId} / ${password}`);
    alert(`用户账号创建成功！\n工号: ${teacherId}\n密码: ${password}`);
  } catch (error) {
    console.error('创建用户账号失败:', error);
    alert(`创建用户账号失败: ${error.message}`);
  }
};

// 新增：学生专业分配服务
export const studentMajorAssignmentService = {
  // 创建学生专业分配
  async create(assignment: Omit<StudentMajorAssignment, 'id' | 'created_at' | 'updated_at'>): Promise<StudentMajorAssignment> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const assignments: StudentMajorAssignment[] = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.STUDENT_MAJOR_ASSIGNMENTS) || '[]'
    );

    const newAssignment: StudentMajorAssignment = {
      ...assignment,
      id: uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    assignments.push(newAssignment);
    localStorage.setItem(STORAGE_KEYS.STUDENT_MAJOR_ASSIGNMENTS, JSON.stringify(assignments));

    return newAssignment;
  },

  // 获取所有专业分配
  async getAll(): Promise<StudentMajorAssignment[]> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const assignments: StudentMajorAssignment[] = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.STUDENT_MAJOR_ASSIGNMENTS) || '[]'
    );

    // 添加关联数据
    const students: Student[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENTS) || '[]');

    return assignments.map(assignment => {
      const student = students.find(s => s.id === assignment.student_id);
      
      return {
        ...assignment,
        student_name: student?.name,
        primary_faculty_name: assignment.primary_faculty === 'PIANO' ? '钢琴专业' : 
                            assignment.primary_faculty === 'VOCAL' ? '声乐专业' : '器乐专业',
      };
    });
  },

  // 根据学生ID获取专业分配
  async getByStudentId(studentId: string): Promise<StudentMajorAssignment | null> {
    const allAssignments = await this.getAll();
    return allAssignments.find(a => a.student_id === studentId) || null;
  },

  // 清空所有专业分配
  async clearAll(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200));
    localStorage.setItem(STORAGE_KEYS.STUDENT_MAJOR_ASSIGNMENTS, JSON.stringify([]));
  },
};

// 将调试函数导出到全局作用域，便于在浏览器控制台中调用
if (typeof window !== 'undefined') {
  (window as any).debugUserAccountData = debugUserAccountData;
  (window as any).createUserAccountForTeacher = createUserAccountForTeacher;
}
