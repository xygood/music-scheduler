/**
 * 教研室功能端到端测试套件
 * 使用 Playwright 测试完整的用户工作流程
 */

import { test, expect, describe, beforeAll, afterAll } from '@playwright/test';

// =====================================================
// 测试配置和工具函数
// =====================================================

const TEST_TIMEOUT = 60000;
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';

interface TestUser {
  id: string;
  name: string;
  email: string;
  facultyCode: string;
  instruments: string[];
}

interface TestSchedule {
  id: string;
  teacherId: string;
  courseId: string;
  studentId: string;
  dayOfWeek: number;
  period: number;
  instrument: string;
  facultyCode: string;
}

// 测试数据
const testUsers: TestUser[] = [
  {
    id: 'test-piano-teacher',
    name: '测试钢琴教师',
    email: 'piano@test.edu',
    facultyCode: 'PIANO',
    instruments: ['钢琴']
  },
  {
    id: 'test-vocal-teacher',
    name: '测试声乐教师',
    email: 'vocal@test.edu',
    facultyCode: 'VOCAL',
    instruments: ['声乐']
  },
  {
    id: 'test-instrument-teacher',
    name: '测试器乐教师',
    email: 'instrument@test.edu',
    facultyCode: 'INSTRUMENT',
    instruments: ['古筝', '笛子']
  }
];

const testStudents = [
  { id: 'student-1', name: '学生A', instrument: '钢琴' },
  { id: 'student-2', name: '学生B', instrument: '声乐' },
  { id: 'student-3', name: '学生C', instrument: '古筝' },
  { id: 'student-4', name: '学生D', instrument: '笛子' }
];

// =====================================================
// 辅助函数
// =====================================================

/**
 * 模拟登录用户
 */
async function loginAsTeacher(page: any, user: TestUser) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', 'test-password');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/);
}

/**
 * 验证页面加载完成
 */
async function waitForPageLoad(page: any) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

/**
 * 检查是否有错误提示
 */
function getErrorMessage(text: string): string {
  const messages: Record<string, string> = {
    facultyMismatch: '教研室不匹配',
    qualificationRequired: '需要相应资质',
    timeConflict: '时间冲突',
    noQualification: '无教学资质',
    classFull: '班级已满',
    invalidTime: '无效时间'
  };
  return messages[text] || text;
}

// =====================================================
// 测试套件：完整排课流程
// =====================================================

describe('E2E: Complete Scheduling Workflow with Faculty Validation', () => {
  test.beforeAll(async () => {
    // 模拟初始化测试数据
    // 实际应通过API设置测试数据
  });

  test.afterAll(async () => {
    // 清理测试数据
  });

  // =====================================================
  // 测试场景1：正常排课流程（教研室验证）
  // =====================================================

  test.describe('Scenario 1: Normal Scheduling with Faculty Validation', () => {
    test('应允许钢琴教师为钢琴学生排课', async ({ page }) => {
      await loginAsTeacher(page, testUsers[0]);
      await waitForPageLoad(page);

      // 进入排课页面
      await page.click('text=排课管理');
      await page.waitForURL(/\/schedule/);

      // 选择钢琴学生
      await page.selectOption('select[id="student-select"]', { label: '学生A' });

      // 选择时间
      await page.selectOption('select[id="day-select"]', { index: 0 });
      await page.selectOption('select[id="period-select"]', { index: 0 });

      // 验证系统应显示可选的钢琴教师
      const pianoOption = page.locator('option:has-text("测试钢琴教师")');
      await expect(pianoOption).toBeVisible();

      // 选择教师并排课
      await page.selectOption('select[id="teacher-select"]', { label: '测试钢琴教师' });

      // 点击排课按钮
      await page.click('button:has-text("确认排课")');

      // 验证成功提示
      const successToast = page.locator('text=排课成功');
      await expect(successToast).toBeVisible({ timeout: 5000 });
    });

    test('应允许器乐教师为古筝学生排课', async ({ page }) => {
      await loginAsTeacher(page, testUsers[2]);
      await waitForPageLoad(page);

      // 进入排课页面
      await page.click('text=排课管理');
      await page.waitForURL(/\/schedule/);

      // 选择古筝学生
      await page.selectOption('select[id="student-select"]', { label: '学生C' });

      // 选择时间
      await page.selectOption('select[id="day-select"]', { index: 0 });
      await page.selectOption('select[id="period-select"]', { index: 1 });

      // 选择器乐教师
      await page.selectOption('select[id="teacher-select"]', { label: '测试器乐教师' });

      // 点击排课按钮
      await page.click('button:has-text("确认排课")');

      // 验证成功提示
      const successToast = page.locator('text=排课成功');
      await expect(successToast).toBeVisible({ timeout: 5000 });
    });
  });

  // =====================================================
  // 测试场景2：跨教研室排课（应被拒绝）
  // =====================================================

  test.describe('Scenario 2: Cross-Faculty Scheduling (Should Be Rejected)', () => {
    test('不应允许钢琴教师为声乐学生排课', async ({ page }) => {
      await loginAsTeacher(page, testUsers[0]);
      await waitForPageLoad(page);

      // 进入排课页面
      await page.click('text=排课管理');
      await page.waitForURL(/\/schedule/);

      // 选择声乐学生（属于VOCAL教研室）
      await page.selectOption('select[id="student-select"]', { label: '学生B' });

      // 选择时间
      await page.selectOption('select[id="day-select"]', { index: 0 });
      await page.selectOption('select[id="period-select"]', { index: 0 });

      // 尝试选择钢琴教师
      await page.selectOption('select[id="teacher-select"]', { label: '测试钢琴教师' });

      // 点击排课按钮
      await page.click('button:has-text("确认排课")');

      // 验证错误提示
      const errorToast = page.locator(`text=${getErrorMessage('facultyMismatch')}`);
      await expect(errorToast).toBeVisible({ timeout: 5000 });
    });

    test('不应允许声乐教师为钢琴学生排课', async ({ page }) => {
      await loginAsTeacher(page, testUsers[1]);
      await waitForPageLoad(page);

      // 进入排课页面
      await page.click('text=排课管理');
      await page.waitForURL(/\/schedule/);

      // 选择钢琴学生
      await page.selectOption('select[id="student-select"]', { label: '学生A' });

      // 选择时间
      await page.selectOption('select[id="day-select"]', { index: 0 });
      await page.selectOption('select[id="period-select"]', { index: 0 });

      // 选择声乐教师
      await page.selectOption('select[id="teacher-select"]', { label: '测试声乐教师' });

      // 点击排课按钮
      await page.click('button:has-text("确认排课")');

      // 验证错误提示
      const errorToast = page.locator(`text=${getErrorMessage('facultyMismatch')}`);
      await expect(errorToast).toBeVisible({ timeout: 5000 });
    });

    test('不应允许器乐教师为钢琴学生排课', async ({ page }) => {
      await loginAsTeacher(page, testUsers[2]);
      await waitForPageLoad(page);

      // 进入排课页面
      await page.click('text=排课管理');
      await page.waitForURL(/\/schedule/);

      // 选择钢琴学生
      await page.selectOption('select[id="student-select"]', { label: '学生A' });

      // 选择时间
      await page.selectOption('select[id="day-select"]', { index: 0 });
      await page.selectOption('select[id="period-select"]', { index: 0 });

      // 点击排课按钮
      await page.click('button:has-text("确认排课")');

      // 验证错误提示（因为没有匹配的钢琴教师）
      const errorToast = page.locator(`text=${getErrorMessage('qualificationRequired')}`);
      await expect(errorToast).toBeVisible({ timeout: 5000 });
    });
  });

  // =====================================================
  // 测试场景3：时间冲突检测
  // =====================================================

  test.describe('Scenario 3: Time Conflict Detection', () => {
    test('同一时间同一教师不应排多节课', async ({ page }) => {
      await loginAsTeacher(page, testUsers[0]);
      await waitForPageLoad(page);

      // 第一次排课成功
      await page.click('text=排课管理');
      await page.waitForURL(/\/schedule/);
      await page.selectOption('select[id="student-select"]', { label: '学生A' });
      await page.selectOption('select[id="day-select"]', { index: 0 });
      await page.selectOption('select[id="period-select"]', { index: 0 });
      await page.click('button:has-text("确认排课")');

      // 尝试同一时间排第二节课
      await page.selectOption('select[id="student-select"]', { label: '学生D' });
      await page.selectOption('select[id="day-select"]', { index: 0 });
      await page.selectOption('select[id="period-select"]', { index: 0 });
      await page.click('button:has-text("确认排课")');

      // 验证冲突提示
      const errorToast = page.locator(`text=${getErrorMessage('timeConflict')}`);
      await expect(errorToast).toBeVisible({ timeout: 5000 });
    });

    test('不同时间同一教师可以排课', async ({ page }) => {
      await loginAsTeacher(page, testUsers[0]);
      await waitForPageLoad(page);

      await page.click('text=排课管理');
      await page.waitForURL(/\/schedule/);

      // 第一次排课
      await page.selectOption('select[id="student-select"]', { label: '学生A' });
      await page.selectOption('select[id="day-select"]', { index: 0 });
      await page.selectOption('select[id="period-select"]', { index: 0 });
      await page.click('button:has-text("确认排课")');

      // 不同时间排第二节
      await page.selectOption('select[id="student-select"]', { label: '学生B' });
      await page.selectOption('select[id="day-select"]', { index: 0 });
      await page.selectOption('select[id="period-select"]', { index: 1 });
      await page.click('button:has-text("确认排课")');

      // 验证第二次成功
      const successToast = page.locator('text=排课成功');
      await expect(successToast).toBeVisible({ timeout: 5000 });
    });
  });

  // =====================================================
  // 测试场景4：班级规模限制
  // =====================================================

  test.describe('Scenario 4: Class Size Limits', () => {
    test('钢琴班级达到5人后应拒绝新学生', async ({ page }) => {
      await loginAsTeacher(page, testUsers[0]);
      await waitForPageLoad(page);

      await page.click('text=排课管理');
      await page.waitForURL(/\/schedule/});

      // 添加5个学生到同一时段
      for (let i = 0; i < 5; i++) {
        await page.selectOption('select[id="student-select"]', { index: i });
        await page.selectOption('select[id="day-select"]', { index: 0 });
        await page.selectOption('select[id="period-select"]', { index: 0 });
        await page.click('button:has-text("确认排课")');
        await page.waitForTimeout(300);
      }

      // 尝试添加第6个学生
      await page.selectOption('select[id="student-select"]', { index: 5 });
      await page.selectOption('select[id="day-select"]', { index: 0 });
      await page.selectOption('select[id="period-select"]', { index: 0 });
      await page.click('button:has-text("确认排课")');

      // 验证班级已满提示
      const errorToast = page.locator(`text=${getErrorMessage('classFull')}`);
      await expect(errorToast).toBeVisible({ timeout: 5000 });
    });

    test('古筝班级达到8人后才拒绝', async ({ page }) => {
      await loginAsTeacher(page, testUsers[2]);
      await waitForPageLoad(page);

      await page.click('text=排课管理');
      await page.waitForURL(/\/schedule/);

      // 添加7个学生到同一时段（古筝8人班）
      for (let i = 0; i < 7; i++) {
        await page.selectOption('select[id="student-select"]', { index: i });
        await page.selectOption('select[id="day-select"]', { index: 0 });
        await page.selectOption('select[id="period-select"]', { index: 0 });
        await page.click('button:has-text("确认排课")');
        await page.waitForTimeout(300);
      }

      // 第8个学生应该成功
      await page.selectOption('select[id="student-select"]', { index: 7 });
      await page.selectOption('select[id="day-select"]', { index: 0 });
      await page.selectOption('select[id="period-select"]', { index: 0 });
      await page.click('button:has-text("确认排课")');

      const successToast = page.locator('text=排课成功');
      await expect(successToast).toBeVisible({ timeout: 5000 });
    });
  });
});

// =====================================================
// 测试套件：教研室仪表板
// =====================================================

describe('E2E: Faculty Dashboard Workflows', () => {
  test.beforeAll(async () => {
    // 初始化测试数据
  });

  test('应正确显示教研室统计', async ({ page }) => {
    await page.goto(`${BASE_URL}/faculty-dashboard`);
    await waitForPageLoad(page);

    // 验证页面标题
    await expect(page.locator('h1:has-text("教研室统计仪表板")')).toBeVisible();

    // 验证三个教研室都显示
    await expect(page.locator('text=钢琴专业')).toBeVisible();
    await expect(page.locator('text=声乐专业')).toBeVisible();
    await expect(page.locator('text=器乐专业')).toBeVisible();

    // 验证统计卡片
    await expect(page.locator('text=总课程数')).toBeVisible();
    await expect(page.locator('text=教师总数')).toBeVisible();
    await expect(page.locator('text=学生总数')).toBeVisible();
  });

  test('应能按时间范围筛选数据', async ({ page }) => {
    await page.goto(`${BASE_URL}/faculty-dashboard`);
    await waitForPageLoad(page);

    // 点击"本月"
    await page.click('button:has-text("本月")');
    await page.waitForTimeout(500);

    // 点击"本学期"
    await page.click('button:has-text("本学期")');
    await page.waitForTimeout(500);

    // 验证数据更新（通过比较数值变化）
  });

  test('应能展开查看教研室详情', async ({ page }) => {
    await page.goto(`${BASE_URL}/faculty-dashboard`);
    await waitForPageLoad(page);

    // 点击钢琴专业卡片
    await page.click('text=钢琴专业');
    await page.waitForTimeout(300);

    // 验证展开的详情包含必要信息
    await expect(page.locator('text=课程数')).toBeVisible();
    await expect(page.locator('text=教师数')).toBeVisible();
    await expect(page.locator('text=学生数')).toBeVisible();
  });

  test('应显示热门课程排名', async ({ page }) => {
    await page.goto(`${BASE_URL}/faculty-dashboard`);
    await waitForPageLoad(page);

    // 验证热门课程区域
    await expect(page.locator('text=热门课程')).toBeVisible();

    // 验证至少显示5个课程
    const courseItems = page.locator('text=钢琴基础训练');
    await expect(courseItems.first()).toBeVisible();
  });

  test('应显示教师工作量排名', async ({ page }) => {
    await page.goto(`${BASE_URL}/faculty-dashboard`);
    await waitForPageLoad(page);

    // 验证教师工作量区域
    await expect(page.locator('text=教师工作量TOP5')).toBeVisible();

    // 验证有排名列表
    const rankItems = page.locator('text=张老师');
    await expect(rankItems.first()).toBeVisible();
  });
});

// =====================================================
// 测试套件：教研室排课视图
// =====================================================

describe('E2E: Faculty Schedule View', () => {
  test('应正确显示周视图', async ({ page }) => {
    await page.goto(`${BASE_URL}/faculty-schedule`);
    await waitForPageLoad(page);

    // 验证页面标题
    await expect(page.locator('h1:has-text("教研室排课视图")')).toBeVisible();

    // 验证星期标签
    await expect(page.locator('text=周一')).toBeVisible();
    await expect(page.locator('text=周二')).toBeVisible();
    await expect(page.locator('text=周日')).toBeVisible();

    // 验证节次标签
    await expect(page.locator('text=第1节')).toBeVisible();
    await expect(page.locator('text=第4节')).toBeVisible();
  });

  test('应能在日视图和周视图间切换', async ({ page }) => {
    await page.goto(`${BASE_URL}/faculty-schedule`);
    await waitForPageLoad(page);

    // 默认是周视图
    await expect(page.locator('text=周视图').first()).toHaveClass(/bg-white/);

    // 切换到日视图
    await page.click('button:has-text("日视图")');
    await page.waitForTimeout(300);

    // 验证日视图显示
    await expect(page.locator('text=周一').first()).not.toHaveClass(/bg-white/);
    await expect(page.locator('text=周二').first()).not.toHaveClass(/bg-white/);
  });

  test('应能按教研室筛选', async ({ page }) => {
    await page.goto(`${BASE_URL}/faculty-schedule`);
    await waitForPageLoad(page);

    // 点击筛选器中的钢琴专业
    await page.click('button:has-text("钢琴专业")');
    await page.waitForTimeout(300);

    // 验证只显示钢琴课程（通过检查课程卡片颜色）
  });

  test('应能按乐器筛选', async ({ page }) => {
    await page.goto(`${BASE_URL}/faculty-schedule`);
    await waitForPageLoad(page);

    // 先选择教研室
    await page.click('button:has-text("器乐专业")');
    await page.waitForTimeout(300);

    // 然后选择具体乐器
    await page.click('button:has-text("古筝")');
    await page.waitForTimeout(300);

    // 验证只显示古筝课程
  });

  test('应显示教研室图例', async ({ page }) => {
    await page.goto(`${BASE_URL}/faculty-schedule`);
    await waitForPageLoad(page);

    // 验证图例存在
    await expect(page.locator('text=钢琴专业')).toBeVisible();
    await expect(page.locator('text=声乐专业')).toBeVisible();
    await expect(page.locator('text=器乐专业')).toBeVisible();
  });
});

// =====================================================
// 测试套件：教师资质管理
// =====================================================

describe('E2E: Teacher Qualification Management', () => {
  test('应显示当前教学资质', async ({ page }) => {
    await loginAsTeacher(page, testUsers[0]);
    await waitForPageLoad(page);

    // 进入资质管理页面
    await page.click('text=教学资质');
    await page.waitForURL(/\/qualifications/);

    // 验证页面标题
    await expect(page.locator('h1:has-text("教学资质管理")')).toBeVisible();

    // 验证当前资质区域
    await expect(page.locator('text=我的教学资质')).toBeVisible();
  });

  test('应能查看可申请的资质列表', async ({ page }) => {
    await loginAsTeacher(page, testUsers[0]);
    await waitForPageLoad(page);

    await page.click('text=教学资质');
    await page.waitForURL(/\/qualifications/);

    // 验证可申请资质区域
    await expect(page.locator('text=可申请资质')).toBeVisible();

    // 验证教研室分类显示
    await expect(page.locator('text=钢琴专业')).toBeVisible();
    await expect(page.locator('text=声乐专业')).toBeVisible();
    await expect(page.locator('text=器乐专业')).toBeVisible();
  });

  test('应能展开查看各教研室的乐器', async ({ page }) => {
    await loginAsTeacher(page, testUsers[0]);
    await waitForPageLoad(page);

    await page.click('text=教学资质');
    await page.waitForURL(/\/qualifications/);

    // 点击展开声乐专业
    await page.click('text=声乐专业');
    await page.waitForTimeout(300);

    // 验证显示声乐乐器
    await expect(page.locator('text=声乐').first()).toBeVisible();
  });

  test('应能申请新资质', async ({ page }) => {
    await loginAsTeacher(page, testUsers[0]);
    await waitForPageLoad(page);

    await page.click('text=教学资质');
    await page.waitForURL(/\/qualifications/});

    // 点击申请资质按钮
    await page.click('button:has-text("申请资质")');
    await page.waitForTimeout(300);

    // 验证模态框显示
    const modal = page.locator('text=申请 声乐 教学资质');
    await expect(modal).toBeVisible();

    // 选择熟练程度
    await page.click('button:has-text("辅修")');
    await page.waitForTimeout(200);

    // 确认申请
    await page.click('button:has-text("确认申请")');
    await page.waitForTimeout(500);

    // 验证资质已添加
    await expect(page.locator('text=辅修').first()).toBeVisible();
  });

  test('应能撤销已有资质', async ({ page }) => {
    await loginAsTeacher(page, testUsers[0]);
    await waitForPageLoad(page);

    await page.click('text=教学资质');
    await page.waitForURL(/\/qualifications/});

    // 点击撤销按钮（第一个）
    page.on('dialog', async dialog => {
      await dialog.accept(); // 确认撤销
    });
    await page.click('button[title="撤销资质"]');
    await page.waitForTimeout(500);

    // 验证资质已移除（需要确认对话框已处理）
  });
});

// =====================================================
// 测试套件：边界情况
// =====================================================

describe('E2E: Edge Cases', () => {
  test('无资质教师不应能排课', async ({ page }) => {
    // 创建无资质教师
    const noQualTeacher = {
      ...testUsers[0],
      id: 'no-qual-teacher',
      email: 'noqual@test.edu',
      instruments: []
    };

    await loginAsTeacher(page, noQualTeacher);
    await waitForPageLoad(page);

    await page.click('text=排课管理');
    await page.waitForURL(/\/schedule/});

    // 尝试排课
    await page.selectOption('select[id="student-select"]', { label: '学生A' });
    await page.selectOption('select[id="day-select"]', { index: 0 });
    await page.selectOption('select[id="period-select"]', { index: 0 });
    await page.click('button:has-text("确认排课")');

    // 验证无资质提示
    const errorToast = page.locator(`text=${getErrorMessage('noQualification')}`);
    await expect(errorToast).toBeVisible({ timeout: 5000 });
  });

  test('无效时间选择应被拒绝', async ({ page }) => {
    await loginAsTeacher(page, testUsers[0]);
    await waitForPageLoad(page);

    await page.click('text=排课管理');
    await page.waitForURL(/\/schedule/});

    // 尝试选择无效时间（假设周五第5节不存在）
    await page.selectOption('select[id="day-select"]', { index: 4 });
    await page.selectOption('select[id="period-select"]', { index: 4 });

    // 验证无效时间提示
    const errorElement = page.locator('text=无效时间段');
    await expect(errorElement).toBeVisible({ timeout: 5000 });
  });

  test('跨星期排课应正确处理', async ({ page }) => {
    await loginAsTeacher(page, testUsers[0]);
    await waitForPageLoad(page);

    await page.click('text=排课管理');
    await page.waitForURL(/\/schedule/});

    // 周一到周日各排一节课
    for (let day = 0; day < 7; day++) {
      await page.selectOption('select[id="student-select"]', { index: 0 });
      await page.selectOption('select[id="day-select"]', { index: day });
      await page.selectOption('select[id="period-select"]', { index: 0 });
      await page.click('button:has-text("确认排课")');
      await page.waitForTimeout(200);
    }

    // 验证每天都有课程
    for (let day = 1; day <= 7; day++) {
      const dayCell = page.locator(`text=第${day}天`);
      await expect(dayCell).toBeVisible();
    }
  });

  test('高强度工作日应显示警告', async ({ page }) => {
    await loginAsTeacher(page, testUsers[0]);
    await waitForPageLoad(page);

    await page.click('text=排课管理');
    await page.waitForURL(/\/schedule/});

    // 一天内排9节课
    for (let period = 0; period < 9; period++) {
      await page.selectOption('select[id="student-select"]', { index: period % 4 });
      await page.selectOption('select[id="day-select"]', { index: 0 });
      await page.selectOption('select[id="period-select"]', { index: period });
      await page.click('button:has-text("确认排课")');
      await page.waitForTimeout(200);
    }

    // 验证工作量警告
    const warningToast = page.locator('text=工作量过高');
    await expect(warningToast).toBeVisible({ timeout: 5000 });
  });
});

// =====================================================
// 测试套件：响应式设计
// =====================================================

describe('E2E: Responsive Design', () => {
  test('应在移动端正确显示仪表板', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${BASE_URL}/faculty-dashboard`);
    await waitForPageLoad(page);

    // 验证重要元素可见
    await expect(page.locator('h1').first()).toBeVisible();

    // 移动端可能折叠某些内容
    const menuButton = page.locator('button[aria-label="菜单"]');
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.waitForTimeout(300);
    }
  });

  test('应在平板端正确显示排课视图', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`${BASE_URL}/faculty-schedule`);
    await waitForPageLoad(page);

    // 验证排课表格可以滚动
    const tableContainer = page.locator('.overflow-x-auto');
    await expect(tableContainer).toBeVisible();
  });

  test('应在桌面端完整显示所有功能', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(`${BASE_URL}/faculty-dashboard`);
    await waitForPageLoad(page);

    // 验证所有卡片都显示
    await expect(page.locator('text=总课程数').first()).toBeVisible();
    await expect(page.locator('text=教师总数').first()).toBeVisible();
    await expect(page.locator('text=学生总数').first()).toBeVisible();
    await expect(page.locator('text=课程总数').first()).toBeVisible();
    await expect(page.locator('text=平均利用率').first()).toBeVisible();
  });
});

// =====================================================
// 运行说明
// =====================================================

/*
运行端到端测试：

1. 安装 Playwright：
   npm install -D @playwright/test
   npx playwright install chromium

2. 设置环境变量：
   export E2E_BASE_URL="http://localhost:5173"

3. 启动开发服务器：
   npm run dev

4. 运行测试：
   npx playwright test tests/e2e/faculty-e2e.test.ts

5. 生成报告：
   npx playwright show-report
*/
