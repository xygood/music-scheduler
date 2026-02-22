import React, { useState, useEffect } from 'react';
import {
  TestTube,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  AlertTriangle,
  Activity,
  BarChart3,
  Users,
  BookOpen,
  Calendar
} from 'lucide-react';

// 测试结果接口
interface TestResult {
  id: string;
  name: string;
  category: string;
  status: 'passed' | 'failed' | 'pending' | 'running';
  duration: number;
  timestamp: Date;
  details?: string;
}

// 模拟测试数据
const mockTestResults: TestResult[] = [
  // 集成测试
  { id: 'int-1', name: '钢琴教研室分配', category: 'integration', status: 'passed', duration: 45, timestamp: new Date(), details: '教师正确分配到钢琴教研室' },
  { id: 'int-2', name: '声乐教研室分配', category: 'integration', status: 'passed', duration: 42, timestamp: new Date(), details: '教师正确分配到声乐教研室' },
  { id: 'int-3', name: '器乐教研室分配', category: 'integration', status: 'passed', duration: 38, timestamp: new Date(), details: '教师正确分配到器乐教研室' },
  { id: 'int-4', name: '教师资格验证 - 钢琴', category: 'integration', status: 'passed', duration: 52, timestamp: new Date(), details: '钢琴教师资质验证通过' },
  { id: 'int-5', name: '教师资格验证 - 声乐', category: 'integration', status: 'passed', duration: 48, timestamp: new Date(), details: '声乐教师资质验证通过' },
  { id: 'int-6', name: '班级规模验证 - 5人班', category: 'integration', status: 'passed', duration: 35, timestamp: new Date(), details: '普通班级限制为5人' },
  { id: 'int-7', name: '班级规模验证 - 8人班', category: 'integration', status: 'passed', duration: 40, timestamp: new Date(), details: '古筝等特殊乐器限制为8人' },
  { id: 'int-8', name: '跨教研室验证', category: 'integration', status: 'passed', duration: 55, timestamp: new Date(), details: '正确拒绝跨教研室排课' },

  // E2E测试
  { id: 'e2e-1', name: '完整排课流程 - 钢琴', category: 'e2e', status: 'passed', duration: 1250, timestamp: new Date(), details: '排课流程完整执行' },
  { id: 'e2e-2', name: '完整排课流程 - 器乐', category: 'e2e', status: 'passed', duration: 1180, timestamp: new Date(), details: '排课流程完整执行' },
  { id: 'e2e-3', name: '跨教研室排课拒绝', category: 'e2e', status: 'passed', duration: 890, timestamp: new Date(), details: '系统正确拒绝跨教研室排课' },
  { id: 'e2e-4', name: '时间冲突检测', category: 'e2e', status: 'passed', duration: 760, timestamp: new Date(), details: '正确检测时间冲突' },
  { id: 'e2e-5', name: '班级规模限制', category: 'e2e', status: 'passed', duration: 2100, timestamp: new Date(), details: '班级满员后正确拒绝' },
  { id: 'e2e-6', name: '教研室仪表板', category: 'e2e', status: 'passed', duration: 680, timestamp: new Date(), details: '仪表板显示正确' },
  { id: 'e2e-7', name: '资质管理流程', category: 'e2e', status: 'passed', duration: 950, timestamp: new Date(), details: '资质申请流程完整' },
  { id: 'e2e-8', name: '响应式设计', category: 'e2e', status: 'passed', duration: 1520, timestamp: new Date(), details: '移动端和平板端正常' },

  // 性能测试
  { id: 'perf-1', name: '教研室查询性能', category: 'performance', status: 'passed', duration: 12, timestamp: new Date(), details: '平均响应时间: 12ms' },
  { id: 'perf-2', name: '教师资格验证性能', category: 'performance', status: 'passed', duration: 8, timestamp: new Date(), details: '平均响应时间: 8ms' },
  { id: 'perf-3', name: '排课验证性能', category: 'performance', status: 'passed', duration: 15, timestamp: new Date(), details: '平均响应时间: 15ms' },
  { id: 'perf-4', name: '工作量计算性能', category: 'performance', status: 'passed', duration: 18, timestamp: new Date(), details: '平均响应时间: 18ms' },
  { id: 'perf-5', name: '批量操作性能', category: 'performance', status: 'passed', duration: 145, timestamp: new Date(), details: '100条记录批量处理' },
  { id: 'perf-6', name: '并发验证性能', category: 'performance', status: 'passed', duration: 95, timestamp: new Date(), details: '20并发请求处理' },
];

// 统计数据计算
const calculateStats = (results: TestResult[]) => {
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const total = results.length;
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / total;
  const byCategory = {
    integration: results.filter(r => r.category === 'integration').length,
    e2e: results.filter(r => r.category === 'e2e').length,
    performance: results.filter(r => r.category === 'performance').length,
  };

  return { passed, failed, total, avgDuration, byCategory };
};

const TestDashboard: React.FC = () => {
  const [results] = useState<TestResult[]>(mockTestResults);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isRunning, setIsRunning] = useState(false);

  const stats = calculateStats(results);

  const filteredResults = results.filter(r => {
    const categoryMatch = selectedCategory === 'all' || r.category === selectedCategory;
    const statusMatch = filterStatus === 'all' || r.status === filterStatus;
    return categoryMatch && statusMatch;
  });

  const handleRunTests = () => {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
    }, 3000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'running':
        return <Activity className="w-5 h-5 text-blue-500 animate-pulse" />;
      default:
        return null;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'integration':
        return 'bg-blue-100 text-blue-700';
      case 'e2e':
        return 'bg-purple-100 text-purple-700';
      case 'performance':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <TestTube className="w-10 h-10 text-blue-600" />
            测试仪表板
            <span className="text-sm font-normal text-gray-500 ml-4">
              教研室功能测试结果
            </span>
          </h1>
          <p className="text-gray-600 mt-2">
            查看所有测试用例的执行结果，包括集成测试、端到端测试和性能测试
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">总测试数</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <TestTube className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex gap-2 text-xs">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                集成: {stats.byCategory.integration}
              </span>
              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
                E2E: {stats.byCategory.e2e}
              </span>
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                性能: {stats.byCategory.performance}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">通过</p>
                <p className="text-3xl font-bold text-green-600">{stats.passed}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(stats.passed / stats.total) * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                通过率: {((stats.passed / stats.total) * 100).toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">失败</p>
                <p className="text-3xl font-bold text-red-600">{stats.failed}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
            {stats.failed > 0 && (
              <div className="mt-4 flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">需要关注</span>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">平均耗时</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.avgDuration < 1000
                    ? `${stats.avgDuration.toFixed(0)}ms`
                    : `${(stats.avgDuration / 1000).toFixed(2)}s`
                  }
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
              <TrendingUp className="w-4 h-4" />
              <span>性能良好</span>
            </div>
          </div>
        </div>

        {/* 筛选和控制栏 */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">类别:</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">全部</option>
                  <option value="integration">集成测试</option>
                  <option value="e2e">端到端测试</option>
                  <option value="performance">性能测试</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">状态:</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">全部</option>
                  <option value="passed">通过</option>
                  <option value="failed">失败</option>
                  <option value="pending">待测试</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleRunTests}
              disabled={isRunning}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                isRunning
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isRunning ? (
                <span className="flex items-center gap-2">
                  <Activity className="w-4 h-4 animate-spin" />
                  运行中...
                </span>
              ) : (
                '重新运行测试'
              )}
            </button>
          </div>
        </div>

        {/* 测试结果列表 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              测试结果 ({filteredResults.length})
            </h2>
          </div>

          <div className="divide-y divide-gray-200">
            {filteredResults.map((result) => (
              <div
                key={result.id}
                className="px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {getStatusIcon(result.status)}
                    <div>
                      <h3 className="font-medium text-gray-900">{result.name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(result.category)}`}>
                          {result.category === 'integration' && '集成测试'}
                          {result.category === 'e2e' && '端到端测试'}
                          {result.category === 'performance' && '性能测试'}
                        </span>
                        <span className="text-sm text-gray-500">
                          {result.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">耗时</p>
                      <p className="font-medium text-gray-900">
                        {result.duration < 1000 ? `${result.duration}ms` : `${(result.duration / 1000).toFixed(2)}s`}
                      </p>
                    </div>
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                      查看详情
                    </button>
                  </div>
                </div>

                {result.details && (
                  <p className="mt-2 text-sm text-gray-600 ml-9">
                    {result.details}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 测试覆盖说明 */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-blue-900">集成测试</h3>
            </div>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-500" />
                教研室分配逻辑
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-500" />
                教师资格验证
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-500" />
                班级规模限制
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-500" />
                跨教研室验证
              </li>
            </ul>
          </div>

          <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-semibold text-purple-900">端到端测试</h3>
            </div>
            <ul className="space-y-2 text-sm text-purple-800">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-purple-500" />
                完整排课流程
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-purple-500" />
                时间冲突检测
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-purple-500" />
                仪表板功能
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-purple-500" />
                资质管理流程
              </li>
            </ul>
          </div>

          <div className="bg-green-50 rounded-xl p-6 border border-green-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-semibold text-green-900">性能测试</h3>
            </div>
            <ul className="space-y-2 text-sm text-green-800">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                教研室查询 &lt; 50ms
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                资格验证 &lt; 100ms
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                排课验证 &lt; 200ms
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                并发处理能力
              </li>
            </ul>
          </div>
        </div>

        {/* 快速链接 */}
        <div className="mt-8 bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">测试文档链接</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <a
              href="/docs/api/faculty-api-docs.html"
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <BookOpen className="w-8 h-8 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">API 文档</p>
                <p className="text-sm text-gray-500">教研室接口说明</p>
              </div>
            </a>

            <a
              href="/docs/user/faculty-user-manual.html"
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Users className="w-8 h-8 text-green-600" />
              <div>
                <p className="font-medium text-gray-900">用户手册</p>
                <p className="text-sm text-gray-500">功能使用指南</p>
              </div>
            </a>

            <a
              href="/docs/developer/faculty-developer-guide.html"
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Calendar className="w-8 h-8 text-purple-600" />
              <div>
                <p className="font-medium text-gray-900">开发者指南</p>
                <p className="text-sm text-gray-500">架构和扩展说明</p>
              </div>
            </a>

            <a
              href="/tests/performance/report.txt"
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <BarChart3 className="w-8 h-8 text-orange-600" />
              <div>
                <p className="font-medium text-gray-900">性能报告</p>
                <p className="text-sm text-gray-500">详细性能数据</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestDashboard;
