import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { NotificationProvider } from './contexts/NotificationContext';
import { BlockedTimeProvider, useBlockedTime } from './contexts/BlockedTimeContext';
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
import OperationLogs from './pages/OperationLogs';

import './index.css';

// 应用初始化组件 - 强制预加载禁排数据
function AppInitializer({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { refreshBlockedTimes, isLoading } = useBlockedTime();
  const [hasAttemptedLoad, setHasAttemptedLoad] = React.useState(false);

  useEffect(() => {
    // 应用启动时初始化默认数据
    const initializeApp = async () => {
      try {
        console.log('应用启动，检查禁排数据缓存...');
      } catch (error) {
        console.log('应用初始化:', error);
      }
    };

    initializeApp();
  }, []);

  // 用户登录后强制预加载禁排数据（无论是否有缓存，都确保数据最新）
  useEffect(() => {
    const loadData = async () => {
      if (user && !hasAttemptedLoad) {
        setHasAttemptedLoad(true);
        
        // 检查是否已经有数据在 localStorage
        const legacyCache = localStorage.getItem('music_scheduler_imported_blocked_times');
        const newCache = localStorage.getItem('blockedTimesCache');
        
        if (!legacyCache || !newCache) {
          // 如果任一缓存不存在，强制从服务器加载
          console.log('禁排数据缓存不完整，强制从服务器加载...');
          try {
            await refreshBlockedTimes();
            console.log('禁排数据已强制加载完成');
          } catch (error) {
            console.error('禁排数据加载失败:', error);
          }
        } else {
          console.log('禁排数据缓存已存在');
        }
      }
    };

    loadData();
    // 注意：只在 user 变化时执行，避免重复加载
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // 显示全局加载提示
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-800">正在加载禁排时间数据...</span>
          </div>
          <p className="text-sm text-gray-500 mt-2">首次加载需要几秒钟，请耐心等待</p>
        </div>
      </div>
    );
  }

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
        
        {/* 操作日志页面 */}
        <Route path="operation-logs" element={<OperationLogs />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <BlockedTimeProvider>
            <AppInitializer>
              <AppRoutes />
            </AppInitializer>
          </BlockedTimeProvider>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
// Force redeploy 2026年 2月19日 星期四 17时53分07秒 CST
