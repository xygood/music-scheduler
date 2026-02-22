import React from 'react';
import { Users, BookOpen } from 'lucide-react';
import { courseStatusConfig } from './types';
import { getActualIndex } from './utils';

interface CourseListProps {
  paginatedCourses: any[];
  courses: any[];
  classes: any[];
  rooms: any[];
  startIndex: number;
  totalCourses: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  courseScheduleStatuses: any[];
  targetTeacher: any;
  isAdmin: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onCourseSelect: (courseStatus: any) => void;
  onCourseToggle: (courseStatus: any) => void;
  selectedCourses: string[];
  selectedRoom: string;
  onRoomChange: (roomId: string) => void;
  currentCourse: any;
  showSaveNotification: boolean;
  onSchedule: () => void;
}

const CourseList: React.FC<CourseListProps> = ({
  paginatedCourses,
  courses,
  classes,
  rooms,
  startIndex,
  totalCourses,
  totalPages,
  currentPage,
  pageSize,
  courseScheduleStatuses,
  targetTeacher,
  isAdmin,
  onPageChange,
  onPageSizeChange,
  onCourseSelect,
  onCourseToggle,
  selectedCourses,
  selectedRoom,
  onRoomChange,
  currentCourse,
  showSaveNotification,
  onSchedule
}) => {
  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-purple-600" />
        课程列表 ({targetTeacher?.name || (isAdmin && !targetTeacher ? '所有教师' : '教师')})
      </h2>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
          <thead className="bg-gray-200 border-b border-gray-200">
            <tr>
              <th scope="col" className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                选择
              </th>
              <th scope="col" className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                序号
              </th>
              <th scope="col" className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                课程名称
              </th>
              <th scope="col" className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                课程类型
              </th>
              <th scope="col" className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                授课类型
              </th>
              <th scope="col" className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                任课教师
              </th>
              <th scope="col" className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                班级
              </th>
              <th scope="col" className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                总学时
              </th>
              <th scope="col" className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                周数
              </th>
              <th scope="col" className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                周学时
              </th>
              <th scope="col" className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                学分
              </th>
              <th scope="col" className="px-4 py-3 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">
                状态
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedCourses.map((courseStatus, index) => {
              const statusConfig = courseStatusConfig[courseStatus.status];
              const course = courses.find(c => c.id === courseStatus.course_id);
              const classInfo = classes.find(c => c.class_id === courseStatus.class_id);
              
              // 直接使用课程的原始数据
              const totalHours = course?.total_hours || 32;
              const weeks = course?.weeks || 16;
              const weeklyHours = course?.week_frequency || 2;
              const credit = course?.credit_hours || 2;
              
              // 计算实际序号（考虑分页）
              const actualIndex = getActualIndex(startIndex, index);
              
              return (
                <tr
                  key={courseStatus.id}
                  onClick={() => onCourseSelect(courseStatus)}
                  className={`cursor-pointer transition-all duration-150 ${
                    currentCourse?.id === courseStatus.id
                      ? 'bg-blue-100 border-l-4 border-blue-600'
                      : selectedCourses.includes(courseStatus.id)
                      ? 'bg-green-50 border-l-4 border-green-600'
                      : actualIndex % 2 === 0
                      ? 'bg-gray-50 hover:bg-blue-50'
                      : 'hover:bg-blue-50'
                  }`}
                >
                  <td className="px-4 py-3 whitespace-nowrap text-center border-r border-gray-200">
                    <input
                      type="checkbox"
                      checked={selectedCourses.includes(courseStatus.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        onCourseToggle(courseStatus);
                      }}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center border-r border-gray-200">
                    {actualIndex + 1}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 text-center border-r border-gray-200">
                    {courseStatus.course_name}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-center border-r border-gray-200">
                    理论课
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-center border-r border-gray-200">
        {course?.teaching_type || courseStatus.teaching_type || '未设置'}
      </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-center border-r border-gray-200">
                    {course?.teacher_name || courseStatus.teacher_name || '未分配'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-center border-r border-gray-200">
                    {courseStatus.class_name}
                  </td>
                  <td className={`px-4 py-3 whitespace-nowrap text-sm text-center border-r border-gray-200 ${
                    credit === 1 ? 'text-red-600 font-medium' : 'text-gray-700'
                  }`}>
                    {totalHours}课时
                  </td>
                  <td className={`px-4 py-3 whitespace-nowrap text-sm text-center border-r border-gray-200 ${
                    credit === 1 ? 'text-red-600 font-medium' : 'text-gray-700'
                  }`}>
                    {weeks}周
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-center border-r border-gray-200">
                    {weeklyHours}课时/周
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center border-r border-gray-200">
                    <span className={`text-sm font-medium ${
                      credit === 1
                        ? 'text-red-600'
                        : credit === 2
                        ? 'text-gray-700'
                        : 'text-gray-700'
                    }`}>
                      {credit}学分
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${statusConfig.color}`}>
                      {statusConfig.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* 分页控件 */}
      {totalPages >= 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-700">
              显示 {startIndex + 1} 到 {Math.min(startIndex + paginatedCourses.length, totalCourses)} 共 {totalCourses} 个课程-班级组合
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">每页显示:</span>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value={5}>5条</option>
                <option value={10}>10条</option>
                <option value={20}>20条</option>
                <option value={50}>50条</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              首页
            </button>
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一页
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${currentPage === pageNum ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                {pageNum}
              </button>
            ))}
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一页
            </button>
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              末页
            </button>
          </div>
        </div>
      )}
      

      
      {/* 排课选项 */}
      <div className="mt-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">大教室选择</label>
          <select
            value={selectedRoom}
            onChange={(e) => onRoomChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
          >
            <option value="">请选择大教室</option>
            {rooms.filter(room => room.room_type === '大教室').sort((a, b) => (b.capacity || 0) - (a.capacity || 0)).map(room => (
              <option key={room.id} value={room.id}>
                {room.room_name} ({room.capacity}人)
              </option>
            ))}
          </select>
        </div>
      </div>
      

    </div>
  );
};

export default CourseList;
