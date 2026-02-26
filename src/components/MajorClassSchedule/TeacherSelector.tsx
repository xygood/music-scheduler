import React from 'react';

interface TeacherSelectorProps {
  targetTeacher: any;
  availableTeachers: any[];
  isAdmin: boolean;
  onTeacherChange: (teacherId: string) => void;
}

const TeacherSelector: React.FC<TeacherSelectorProps> = ({
  targetTeacher,
  availableTeachers,
  isAdmin,
  onTeacherChange
}) => {
  return (
    <div className="bg-white rounded-lg p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <select
            value={targetTeacher?.teacher_id || 'all'}
            onChange={(e) => onTeacherChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
            disabled={!isAdmin}
          >
            {isAdmin && (
              <option key="all" value="all">
                所有教师
              </option>
            )}
            {availableTeachers.map(t => (
              <option key={t.teacher_id} value={t.teacher_id}>
                {t.name} ({t.faculty_name || '教师'})
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default TeacherSelector;
