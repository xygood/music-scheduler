import * as apiService from './api';

export const authService = {
  async signIn(teacherId: string, password: string) {
    return this.login(teacherId, password);
  },

  async signUp(email: string, password: string, fullName: string, facultyCode: string, specialty?: string[]) {
    return this.register({
      teacher_id: email,
      password,
      full_name: fullName,
      faculty_code: facultyCode,
      specialty: specialty || []
    });
  },

  async login(teacherId: string, password: string) {
    try {
      const response = await apiService.authApi.login(teacherId, password);
      if (response.user) {
        const user = response.user;
        const userData = {
          id: user.id,
          teacher_id: user.teacher_id,
          full_name: user.full_name,
          email: user.email,
          faculty_id: user.faculty_id,
          faculty_code: user.faculty_code,
          is_admin: user.is_admin
        };
        localStorage.setItem('music_scheduler_current_user', JSON.stringify(userData));
        localStorage.setItem('music_scheduler_auth_token', btoa(`${teacherId}:${password}`));
        
        this.setTeacherOnline(userData);
        this.addToLoggedInUsers(userData);
      }
      return response;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },

  async register(data: any) {
    try {
      const response = await apiService.authApi.register(data);
      if (response.user) {
        const user = response.user;
        localStorage.setItem('music_scheduler_current_user', JSON.stringify(user));
        localStorage.setItem('music_scheduler_auth_token', btoa(`${data.teacher_id}:${data.password}`));
      }
      return response;
    } catch (error) {
      console.error('Register failed:', error);
      throw error;
    }
  },

  async getCurrentUser() {
    const userStr = localStorage.getItem('music_scheduler_current_user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  async getTeacherProfile(teacherId?: string) {
    const user = await this.getCurrentUser();
    if (!user) return null;
    
    const id = teacherId || user.teacher_id;
    if (!id) return null;
    
    try {
      const response = await apiService.teachersApi.getById(id);
      return response;
    } catch (error) {
      console.error('Get teacher profile failed:', error);
      return user;
    }
  },

  async updateProfile(updates: any) {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('No user logged in');
    
    try {
      await apiService.teachersApi.update(user.teacher_id, updates);
      
      const updatedUser = { ...user, ...updates };
      localStorage.setItem('music_scheduler_current_user', JSON.stringify(updatedUser));
      
      return { message: 'Profile updated successfully' };
    } catch (error) {
      console.error('Update profile failed:', error);
      throw error;
    }
  },

  async changePassword(oldPassword: string, newPassword: string) {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('No user logged in');
    
    try {
      await apiService.authApi.changePassword(user.teacher_id, oldPassword, newPassword);
      
      localStorage.setItem('music_scheduler_auth_token', btoa(`${user.teacher_id}:${newPassword}`));
      
      return { message: 'Password changed successfully' };
    } catch (error) {
      console.error('Change password failed:', error);
      throw error;
    }
  },

  async signOut() {
    const user = await this.getCurrentUser();
    if (user) {
      this.setTeacherOffline(user.teacher_id);
    }
    localStorage.removeItem('music_scheduler_current_user');
    localStorage.removeItem('music_scheduler_auth_token');
    return { message: 'Logged out successfully' };
  },

  getOnlineTeachers() {
    const teachersStr = localStorage.getItem('music_scheduler_online_teachers');
    if (!teachersStr) return [];
    try {
      return JSON.parse(teachersStr);
    } catch {
      return [];
    }
  },

  setTeacherOnline(user: any) {
    const teachers = this.getOnlineTeachers();
    const existingIndex = teachers.findIndex((t: any) => t.teacher_id === user.teacher_id);
    const onlineTeacher = {
      id: user.id,
      teacher_id: user.teacher_id,
      name: user.full_name,
      faculty_id: user.faculty_id,
      faculty_name: user.faculty_code || '',
      loginTime: Date.now(),
      lastActivityTime: Date.now(),
      status: 'online'
    };
    
    if (existingIndex >= 0) {
      teachers[existingIndex] = onlineTeacher;
    } else {
      teachers.push(onlineTeacher);
    }
    localStorage.setItem('music_scheduler_online_teachers', JSON.stringify(teachers));
  },

  setTeacherOffline(teacherId: string) {
    const teachers = this.getOnlineTeachers();
    const updated = teachers.filter((t: any) => t.teacher_id !== teacherId);
    localStorage.setItem('music_scheduler_online_teachers', JSON.stringify(updated));
  },

  updateTeacherActivity(teacherId: string) {
    const teachers = this.getOnlineTeachers();
    const updated = teachers.map((t: any) => 
      t.teacher_id === teacherId ? { ...t, lastActivityTime: Date.now() } : t
    );
    localStorage.setItem('music_scheduler_online_teachers', JSON.stringify(updated));
  },

  getLoggedInUsers() {
    const usersStr = localStorage.getItem('music_scheduler_logged_in_users');
    if (!usersStr) return [];
    try {
      return JSON.parse(usersStr);
    } catch {
      return [];
    }
  },

  addToLoggedInUsers(user: any) {
    const users = this.getLoggedInUsers();
    const existingIndex = users.findIndex((u: any) => u.id === user.id);
    const loggedInUser = {
      id: user.id,
      teacher_id: user.teacher_id,
      name: user.full_name,
      faculty_id: user.faculty_id,
      faculty_name: user.faculty_code || '',
      loginTime: Date.now()
    };
    
    if (existingIndex >= 0) {
      users[existingIndex] = loggedInUser;
    } else {
      users.push(loggedInUser);
    }
    localStorage.setItem('music_scheduler_logged_in_users', JSON.stringify(users));
  },

  switchToUser(userId: string) {
    const users = this.getLoggedInUsers();
    const targetUser = users.find((u: any) => u.id === userId);
    if (!targetUser) {
      throw new Error('User not found in logged in list');
    }
    
    localStorage.setItem('music_scheduler_current_user', JSON.stringify(targetUser));
    return targetUser;
  },

  removeUserFromLoggedInList(userId: string) {
    const users = this.getLoggedInUsers();
    const updated = users.filter((u: any) => u.id !== userId);
    localStorage.setItem('music_scheduler_logged_in_users', JSON.stringify(updated));
  },

  async initializeDefaultData() {
    console.log('API mode: initializeDefaultData - skipping (data should come from server)');
    return { message: 'Data initialization skipped in API mode' };
  },

  async clearAllData() {
    console.log('API mode: clearAllData - skipping (use syncApi.clear instead)');
    return { message: 'Data clear skipped in API mode' };
  }
};
