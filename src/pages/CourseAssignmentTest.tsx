import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { courseService } from '../services';
import {
  calculateSemesterNumber,
  getCoursesForClass,
  generateCoursesForClass,
  runCourseAssignmentTests,
  TEST_CASES,
  type CourseAssignment
} from '../utils/courseAssignment';
import { BookOpen, CheckCircle, XCircle, Play, Download, Plus } from 'lucide-react';

export default function CourseAssignmentTest() {
  const { teacher } = useAuth();
  const [testResults, setTestResults] = useState<{ name: string; passed: boolean; expected: any; actual: any }[]>([]);
  const [selectedTest, setSelectedTest] = useState<typeof TEST_CASES[0] | null>(null);
  const [generatedCourses, setGeneratedCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 运行所有测试
  const handleRunTests = () => {
    const results = runCourseAssignmentTests();
    setTestResults(results);
  };

  // 选择测试用例并生成课程
  const handleSelectTest = (testCase: typeof TEST_CASES[0]) => {
    setSelectedTest(testCase);
    const semesterNumber = calculateSemesterNumber(testCase.classId, testCase.academicYear, testCase.semesterLabel);
    const courses = getCoursesForClass(testCase.classId, testCase.academicYear, semesterNumber);
    setGeneratedCourses([
      { type: '钢琴', name: courses.piano },
      { type: '声乐', name: courses.vocal },
      { type: '器乐', name: courses.instrument }
    ]);
  };

  // 将生成的课程保存到数据库
  const handleSaveCourses = async () => {
    if (!selectedTest || !teacher) {
      setMessage({ type: 'error', text: '请先选择测试用例或登录' });
      return;
    }

    setLoading(true);
    try {
      const coursesToSave = generateCoursesForClass(
        selectedTest.classId,
        selectedTest.academicYear,
        selectedTest.semesterLabel,
        teacher.id
      );

      await courseService.createMany(coursesToSave);
      setMessage({ type: 'success', text: `成功保存 ${coursesToSave.length} 门课程` });
    } catch (error) {
      console.error('保存课程失败:', error);
      setMessage({ type: 'error', text: '保存课程失败' });
    } finally {
      setLoading(false);
    }
  };

  // 计算学期序号的辅助函数（用于显示）
  const getSemesterDisplay = (classId: string, academicYear: string, semesterLabel: string) => {
    const num = calculateSemesterNumber(classId, academicYear, semesterLabel);
    return `第${num}学期`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BookOpen className="w-10 h-10 text-blue-600" />
            课程分配测试
          </h1>
          <p className="text-gray-600 mt-2">
            根据班级编号和学期自动分配课程
          </p>
        </div>

        {/* 测试用例 */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">测试用例</h2>
            <button
              onClick={handleRunTests}
              className="btn-primary flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              运行测试
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEST_CASES.map((testCase, index) => {
              const semesterNumber = calculateSemesterNumber(testCase.classId, testCase.academicYear, testCase.semesterLabel);
              const courses = getCoursesForClass(testCase.classId, testCase.academicYear, semesterNumber);
              const result = testResults[index];

              return (
                <div
                  key={index}
                  onClick={() => handleSelectTest(testCase)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedTest === testCase
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-sm font-medium text-gray-500">用例 {index + 1}</span>
                    {result && (
                      result.passed ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )
                    )}
                  </div>
                  <p className="text-sm text-gray-900 font-medium mb-2">{testCase.name}</p>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>班级：{testCase.classId}</p>
                    <p>学期：{testCase.semesterLabel} → {getSemesterDisplay(testCase.classId, testCase.academicYear, testCase.semesterLabel)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 测试结果详情 */}
        {testResults.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">测试结果</h2>
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg ${
                    result.passed ? 'bg-green-50' : 'bg-red-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {result.passed ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className={`font-medium ${result.passed ? 'text-green-700' : 'text-red-700'}`}>
                      {result.passed ? '通过' : '失败'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{result.name}</p>
                  {!result.passed && (
                    <div className="text-sm">
                      <p className="text-red-600">预期: {JSON.stringify(result.expected)}</p>
                      <p className="text-red-600">实际: {JSON.stringify(result.actual)}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 选中的测试用例详情 */}
        {selectedTest && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">课程预览</h2>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">班级编号：</span>
                  <span className="font-medium">{selectedTest.classId}</span>
                </div>
                <div>
                  <span className="text-gray-500">学年：</span>
                  <span className="font-medium">{selectedTest.academicYear}</span>
                </div>
                <div>
                  <span className="text-gray-500">学期标签：</span>
                  <span className="font-medium">{selectedTest.semesterLabel}</span>
                </div>
                <div>
                  <span className="text-gray-500">学期序号：</span>
                  <span className="font-medium">{calculateSemesterNumber(selectedTest.classId, selectedTest.academicYear, selectedTest.semesterLabel)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {generatedCourses.map((course, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    course.name
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-gray-200 bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`badge ${
                      course.type === '钢琴' ? 'badge-info' :
                      course.type === '声乐' ? 'badge-success' :
                      'badge-warning'
                    }`}>
                      {course.type}
                    </span>
                  </div>
                  <p className="font-medium text-gray-900">
                    {course.name || '无课程'}
                  </p>
                </div>
              ))}
            </div>

            {message && (
              <div className={`p-4 rounded-lg mb-4 ${
                message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {message.text}
              </div>
            )}

            <button
              onClick={handleSaveCourses}
              disabled={loading || !teacher}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {loading ? '保存中...' : '保存课程'}
            </button>
          </div>
        )}

        {/* 规则说明 */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">课程分配规则</h2>
          <div className="prose text-gray-600">
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>学期序号计算：</strong>学期序号 = (当前学年 - 入学学年) × 2 + 学期号</li>
              <li><strong>新生班（入学第1学期）：</strong>分配钢琴（一）、声乐（一）、器乐（一）</li>
              <li><strong>普通班级：</strong>按学期序号分配对应层级的课程</li>
              <li><strong>毕业班（23级且班号≤3）：</strong>器乐课程使用"中国器乐"替代</li>
              <li><strong>专升本班：</strong>按入学年份计算学期序号，直接进入相应层级</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
