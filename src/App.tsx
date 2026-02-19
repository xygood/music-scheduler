import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { NotificationProvider } from './contexts/NotificationContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import Students from './pages/Students';
import Classes from './pages/Classes';
import Rooms from './pages/Rooms';
import Courses from './pages/Courses';

import AutoSchedule from './pages/AutoSchedule';
import Profile from './pages/Profile';
import TestDashboard from './pages/TestDashboard';

import FacultyScheduleView from './pages/FacultyScheduleView';
import Teachers from './pages/Teachers';
import StudentImport from './pages/StudentImport';
import StudentAssignment from './pages/SmartStudentAssignment';
import TeacherStudentStats from './pages/TeacherStudentStats';
import ArrangeClass from './pages/ArrangeClass';
import CourseAssignmentTest from './pages/CourseAssignmentTest';
import TeacherWorkload from './pages/TeacherWorkload';
import Backup from './pages/Backup';
import WeekConfig from './pages/WeekConfig';
import MajorClassSchedule from './pages/MajorClassSchedule_Simple';
import CourseScheduleStats from './pages/CourseScheduleStats';

import LargeClass from './pages/LargeClass';

import { dataManagementService } from './services';
// import { initializeTestData } from './utils/testDataGenerator';
import './index.css';

// 应用初始化组件
function AppInitializer({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    // 应用启动时初始化默认数据
    const initializeApp = async () => {
      try {
        // 暂时跳过初始化测试数据，避免自动添加默认班级
        // await initializeTestData();
        
        console.log('跳过数据初始化，直接使用应用');
        // await dataManagementService.initializeDefaultData();
        console.log('应用数据初始化完成');
      } catch (error) {
        console.log('应用数据初始化跳过（临时修复）:', error.message);
      }
    };
    
    initializeApp();
  }, []);
  
  return <>{children}</>;
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 to-indigo-900">
        <div className="text-white text-xl">加载中...</div>
      </div>
    );
  }
  return user ? <>{children}</> : <Navigate to="/login" />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 to-indigo-900">
        <div className="text-white text-xl">加载中...</div>
      </div>
    );
  }
  return user ? <Navigate to="/" /> : <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="admin-dashboard" element={<AdminDashboard />} />
        <Route path="students" element={<Students />} />
        <Route path="classes" element={<Classes />} />
        <Route path="courses" element={<Courses />} />
        <Route path="rooms" element={<Rooms />} />

        <Route path="auto-schedule" element={<AutoSchedule />} />
        <Route path="profile" element={<Profile />} />
        {/* 教研室相关页面 */}
        <Route path="faculty-schedule" element={<FacultyScheduleView />} />
        <Route path="teachers" element={<Teachers />} />
        {/* 学生管理相关页面 */}
        <Route path="student-import" element={<StudentImport />} />
        <Route path="smart-student-assignment" element={<StudentAssignment />} />
        <Route path="teacher-student-stats" element={<TeacherStudentStats />} />
        <Route path="arrange-class" element={<ArrangeClass />} />
        {/* 工作量统计 */}
        <Route path="workload" element={<TeacherWorkload />} />
        {/* 排课统计 */}
        <Route path="course-schedule-stats" element={<CourseScheduleStats />} />
        {/* 备份管理 */}
        <Route path="backup" element={<Backup />} />
        {/* 学期周次配置 */}
        <Route path="week-config" element={<WeekConfig />} />
        {/* 测试页面 */}
        <Route path="test-dashboard" element={<TestDashboard />} />
        <Route path="course-assignment-test" element={<CourseAssignmentTest />} />
        {/* 专业大课排课页面 */}
        <Route path="major-class-schedule" element={<MajorClassSchedule />} />

        {/* 通适大课页面 */}
        <Route path="large-class" element={<LargeClass />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <AppInitializer>
            <AppRoutes />
          </AppInitializer>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
