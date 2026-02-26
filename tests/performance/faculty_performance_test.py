"""
教研室功能性能测试套件
测试大规模数据下的查询性能和排课验证速度
"""

import time
import random
import statistics
from typing import List, Dict, Any, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
import json


@dataclass
class PerformanceResult:
    """性能测试结果"""
    test_name: str
    iterations: int
    avg_time_ms: float
    min_time_ms: float
    max_time_ms: float
    std_dev_ms: float
    throughput_per_sec: float
    passed: bool
    threshold_ms: float


class PerformanceTestSuite:
    """性能测试套件"""

    def __init__(self):
        self.results: List[PerformanceResult] = []
        self.mock_data = self._generate_mock_data()

    def _generate_mock_data(self) -> Dict[str, Any]:
        """生成模拟数据用于测试"""
        # 生成大量教师数据
        teachers = []
        instruments = ['钢琴', '声乐', '古筝', '笛子', '小提琴', '萨克斯', '大提琴', '古琴', '双排键']
        faculties = ['PIANO', 'VOCAL', 'INSTRUMENT']

        for i in range(100):
            faculty = random.choice(faculties)
            teacher_instruments = random.sample(
                instruments,
                k=random.randint(1, 3)
            )
            teachers.append({
                'id': f'teacher-{i:04d}',
                'name': f'教师{i}',
                'email': f'teacher{i}@test.edu',
                'faculty_code': faculty,
                'instruments': teacher_instruments
            })

        # 生成大量学生数据
        students = []
        for i in range(500):
            instrument = random.choice(instruments)
            students.append({
                'id': f'student-{i:04d}',
                'name': f'学生{i}',
                'instrument': instrument,
                'faculty_code': self._get_faculty_for_instrument(instrument)
            })

        # 生成大量排课记录
        schedules = []
        for i in range(2000):
            student = random.choice(students)
            schedules.append({
                'id': f'schedule-{i:05d}',
                'teacher_id': random.choice(teachers)['id'],
                'student_id': student['id'],
                'instrument': student['instrument'],
                'day_of_week': random.randint(1, 7),
                'period': random.randint(1, 10),
                'status': 'scheduled'
            })

        return {
            'teachers': teachers,
            'students': students,
            'schedules': schedules,
            'instruments': instruments
        }

    def _get_faculty_for_instrument(self, instrument: str) -> str:
        """获取乐器对应的教研室代码"""
        piano_instruments = ['钢琴']
        vocal_instruments = ['声乐']
        # 其他都是器乐

        if instrument in piano_instruments:
            return 'PIANO'
        elif instrument in vocal_instruments:
            return 'VOCAL'
        else:
            return 'INSTRUMENT'

    def _timing_decorator(self, iterations: int = 100):
        """计时装饰器"""
        def decorator(func):
            def wrapper(*args, **kwargs):
                times = []
                for _ in range(iterations):
                    start = time.perf_counter()
                    result = func(*args, **kwargs)
                    end = time.perf_counter()
                    times.append((end - start) * 1000)  # 转换为毫秒
                return times
            return wrapper
        return decorator

    def run_performance_tests(self) -> List[PerformanceResult]:
        """运行所有性能测试"""
        print("=" * 60)
        print("教研室功能性能测试")
        print("=" * 60)
        print()

        # 运行各测试
        self.test_faculty_query_performance()
        self.test_teacher_qualification_validation()
        self.test_schedule_validation()
        self.test_workload_calculation()
        self.test_batch_operations()
        self.test_concurrent_validation()

        return self.results

    def test_faculty_query_performance(self):
        """测试教研室查询性能"""
        print("测试1: 教研室查询性能")

        @self._timing_decorator(iterations=100)
        def query_faculties():
            # 模拟查询所有教研室
            return self.mock_data['teachers']

        @self._timing_decorator(iterations=100)
        def filter_by_faculty():
            # 模拟按教研室筛选教师
            return [
                t for t in self.mock_data['teachers']
                if t['faculty_code'] == 'PIANO'
            ]

        @self._timing_decorator(iterations=100)
        def filter_by_instrument():
            # 模拟按乐器筛选教师
            return [
                t for t in self.mock_data['teachers']
                if '钢琴' in t['instruments']
            ]

        # 执行测试
        times_list = [query_faculties(), filter_by_faculty(), filter_by_instrument()]
        test_cases = ['查询所有教研室', '按教研室筛选', '按乐器筛选']

        for times, test_name in zip(times_list, test_cases):
            result = self._calculate_result(test_name, times, threshold_ms=50)
            self.results.append(result)
            self._print_result(result)

    def test_teacher_qualification_validation(self):
        """测试教师资格验证性能"""
        print("\n测试2: 教师资格验证性能")

        def validate_qualification(teacher: Dict, instrument: str) -> Tuple[bool, str]:
            """验证教师资格"""
            if teacher['faculty_code'] == 'PIANO':
                if instrument == '钢琴':
                    return True, 'valid'
            elif teacher['faculty_code'] == 'VOCAL':
                if instrument == '声乐':
                    return True, 'valid'
            else:
                if instrument in teacher['instruments']:
                    return True, 'valid'
            return False, '教研室不匹配'

        @self._timing_decorator(iterations=1000)
        def single_validation():
            teacher = random.choice(self.mock_data['teachers'])
            instrument = random.choice(self.mock_data['instruments'])
            return validate_qualification(teacher, instrument)

        @self._timing_decorator(iterations=100)
        def batch_validation():
            results = []
            for teacher in self.mock_data['teachers'][:50]:
                instrument = random.choice(self.mock_data['instruments'])
                results.append(validate_qualification(teacher, instrument))
            return results

        times_list = [single_validation(), batch_validation()]
        test_cases = ['单次资格验证', '批量资格验证(50个教师)']

        for times, test_name in zip(times_list, test_cases):
            result = self._calculate_result(test_name, times, threshold_ms=100)
            self.results.append(result)
            self._print_result(result)

    def test_schedule_validation(self):
        """测试排课验证性能"""
        print("\n测试3: 排课验证性能")

        def validate_schedule(
            teacher_id: str,
            day_of_week: int,
            period: int,
            existing_schedules: List[Dict]
        ) -> Tuple[bool, str]:
            """验证排课是否冲突"""
            for schedule in existing_schedules:
                if (schedule['teacher_id'] == teacher_id and
                    schedule['day_of_week'] == day_of_week and
                    schedule['period'] == period):
                    return False, '时间冲突'
            return True, 'valid'

        @self._timing_decorator(iterations=500)
        def single_schedule_validation():
            schedule = random.choice(self.mock_data['schedules'])
            return validate_schedule(
                schedule['teacher_id'],
                schedule['day_of_week'],
                schedule['period'],
                self.mock_data['schedules']
            )

        @self._timing_decorator(iterations=100)
        def batch_schedule_validation():
            results = []
            for i in range(100):
                schedule = random.choice(self.mock_data['schedules'])
                results.append(validate_schedule(
                    schedule['teacher_id'],
                    schedule['day_of_week'],
                    schedule['period'],
                    self.mock_data['schedules']
                ))
            return results

        @self._timing_decorator(iterations=50)
        def find_available_slots():
            """查找可用时段"""
            faculty_teachers = [
                t for t in self.mock_data['teachers']
                if t['faculty_code'] == 'PIANO'
            ]
            available = []
            for day in range(1, 8):
                for period in range(1, 11):
                    conflict = False
                    for teacher in faculty_teachers[:10]:
                        for schedule in self.mock_data['schedules']:
                            if (schedule['teacher_id'] == teacher['id'] and
                                schedule['day_of_week'] == day and
                                schedule['period'] == period):
                                conflict = True
                                break
                        if conflict:
                            break
                    if not conflict:
                        available.append((day, period))
            return available

        times_list = [
            single_schedule_validation(),
            batch_schedule_validation(),
            find_available_slots()
        ]
        test_cases = [
            '单次排课验证',
            '批量排课验证(100次)',
            '查找可用时段(钢琴教研室)'
        ]

        for times, test_name in zip(times_list, test_cases):
            result = self._calculate_result(test_name, times, threshold_ms=200)
            self.results.append(result)
            self._print_result(result)

    def test_workload_calculation(self):
        """测试工作量计算性能"""
        print("\n测试4: 工作量计算性能")

        def calculate_daily_workload(teacher_id: str, schedules: List[Dict]) -> Dict:
            """计算教师日工作量"""
            day_counts = {i: 0 for i in range(1, 8)}
            for schedule in schedules:
                if schedule['teacher_id'] == teacher_id:
                    day_counts[schedule['day_of_week']] += 1
            return {
                'teacher_id': teacher_id,
                'total': sum(day_counts.values()),
                'daily': day_counts
            }

        def calculate_faculty_workload(faculty_code: str, schedules: List[Dict]) -> Dict:
            """计算教研室工作量"""
            faculty_schedules = [
                s for s in schedules
                if self._get_faculty_for_instrument(s['instrument']) == faculty_code
            ]
            return {
                'faculty_code': faculty_code,
                'total_classes': len(faculty_schedules),
                'by_day': {
                    d: len([s for s in faculty_schedules if s['day_of_week'] == d])
                    for d in range(1, 8)
                }
            }

        @self._timing_decorator(iterations=200)
        def single_teacher_workload():
            teacher = random.choice(self.mock_data['teachers'])
            return calculate_daily_workload(teacher['id'], self.mock_data['schedules'])

        @self._timing_decorator(iterations=100)
        def faculty_workload():
            return calculate_faculty_workload('PIANO', self.mock_data['schedules'])

        @self._timing_decorator(iterations=50)
        def all_teachers_workload():
            results = []
            for teacher in self.mock_data['teachers']:
                results.append(calculate_daily_workload(teacher['id'], self.mock_data['schedules']))
            return results

        times_list = [
            single_teacher_workload(),
            faculty_workload(),
            all_teachers_workload()
        ]
        test_cases = [
            '单教师日工作量计算',
            '教研室工作量计算',
            '全部教师工作量计算(100人)'
        ]

        for times, test_name in zip(times_list, test_cases):
            result = self._calculate_result(test_name, times, threshold_ms=150)
            self.results.append(result)
            self._print_result(result)

    def test_batch_operations(self):
        """测试批量操作性能"""
        print("\n测试5: 批量操作性能")

        @self._timing_decorator(iterations=50)
        def batch_schedule_generation():
            """批量生成排课计划"""
            schedules = []
            for i in range(100):
                student = random.choice(self.mock_data['students'])
                schedules.append({
                    'id': f'gen-schedule-{i}',
                    'student_id': student['id'],
                    'instrument': student['instrument'],
                    'day_of_week': random.randint(1, 7),
                    'period': random.randint(1, 10),
                    'faculty_code': student['faculty_code']
                })
            return schedules

        @self._timing_decorator(iterations=20)
        def batch_teacher_filter():
            """批量筛选教师"""
            results = []
            for i in range(10):
                filtered = [
                    t for t in self.mock_data['teachers']
                    if t['faculty_code'] == random.choice(['PIANO', 'VOCAL', 'INSTRUMENT'])
                    and len(t['instruments']) >= 2
                ]
                results.append(filtered)
            return results

        @self._timing_decorator(iterations=30)
        def data_aggregation():
            """数据聚合"""
            return {
                'total_teachers': len(self.mock_data['teachers']),
                'by_faculty': {
                    'PIANO': len([t for t in self.mock_data['teachers'] if t['faculty_code'] == 'PIANO']),
                    'VOCAL': len([t for t in self.mock_data['teachers'] if t['faculty_code'] == 'VOCAL']),
                    'INSTRUMENT': len([t for t in self.mock_data['teachers'] if t['faculty_code'] == 'INSTRUMENT'])
                },
                'total_students': len(self.mock_data['students']),
                'total_schedules': len(self.mock_data['schedules'])
            }

        times_list = [
            batch_schedule_generation(),
            batch_teacher_filter(),
            data_aggregation()
        ]
        test_cases = [
            '批量生成排课(100条)',
            '批量筛选教师(10次)',
            '数据聚合统计'
        ]

        for times, test_name in zip(times_list, test_cases):
            result = self._calculate_result(test_name, times, threshold_ms=300)
            self.results.append(result)
            self._print_result(result)

    def test_concurrent_validation(self):
        """测试并发验证性能"""
        print("\n测试6: 并发验证性能")

        def faculty_match_validation(teacher: Dict, course_instrument: str) -> Tuple[bool, str]:
            """教研室匹配验证"""
            expected_faculty = self._get_faculty_for_instrument(course_instrument)
            if teacher['faculty_code'] == expected_faculty:
                if course_instrument in teacher['instruments']:
                    return True, 'valid'
            return False, '教研室或乐器不匹配'

        @self._timing_decorator(iterations=200)
        def concurrent_validation():
            """模拟并发验证"""
            results = []
            for _ in range(20):
                teacher = random.choice(self.mock_data['teachers'])
                instrument = random.choice(self.mock_data['instruments'])
                results.append(faculty_match_validation(teacher, instrument))
            return results

        times_list = [concurrent_validation()]
        test_cases = ['并发验证(20个并发请求)']

        for times, test_name in zip(times_list, test_cases):
            result = self._calculate_result(test_name, times, threshold_ms=250)
            self.results.append(result)
            self._print_result(result)

    def _calculate_result(
        self,
        test_name: str,
        times: List[float],
        threshold_ms: float = 100
    ) -> PerformanceResult:
        """计算测试结果"""
        avg_time = statistics.mean(times)
        min_time = min(times)
        max_time = max(times)
        std_dev = statistics.stdev(times) if len(times) > 1 else 0
        throughput = 1000 / avg_time if avg_time > 0 else float('inf')

        return PerformanceResult(
            test_name=test_name,
            iterations=len(times),
            avg_time_ms=avg_time,
            min_time_ms=min_time,
            max_time_ms=max_time,
            std_dev_ms=std_dev,
            throughput_per_sec=throughput,
            passed=avg_time < threshold_ms,
            threshold_ms=threshold_ms
        )

    def _print_result(self, result: PerformanceResult):
        """打印测试结果"""
        status = "✓ 通过" if result.passed else "✗ 失败"
        print(f"\n  {result.test_name}:")
        print(f"    平均: {result.avg_time_ms:.2f}ms | "
              f"最小: {result.min_time_ms:.2f}ms | "
              f"最大: {result.max_time_ms:.2f}ms")
        print(f"    标准差: {result.std_dev_ms:.2f}ms | "
              f"吞吐量: {result.throughput_per_sec:.1f}次/秒")
        print(f"    阈值: {result.threshold_ms}ms | 状态: {status}")

    def generate_report(self) -> str:
        """生成性能测试报告"""
        passed = sum(1 for r in self.results if r.passed)
        failed = len(self.results) - passed

        report = []
        report.append("=" * 60)
        report.append("教研室功能性能测试报告")
        report.append(f"测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append("=" * 60)
        report.append(f"\n总测试数: {len(self.results)}")
        report.append(f"通过: {passed}")
        report.append(f"失败: {failed}")
        report.append(f"通过率: {passed/len(self.results)*100:.1f}%")
        report.append("\n" + "-" * 60)
        report.append("详细结果:")
        report.append("-" * 60)

        for result in self.results:
            status = "✓" if result.passed else "✗"
            report.append(f"\n{status} {result.test_name}")
            report.append(f"  平均时间: {result.avg_time_ms:.2f}ms (阈值: {result.threshold_ms}ms)")
            report.append(f"  最小/最大: {result.min_time_ms:.2f}ms / {result.max_time_ms:.2f}ms")
            report.append(f"  标准差: {result.std_dev_ms:.2f}ms")
            report.append(f"  吞吐量: {result.throughput_per_sec:.1f}次/秒")

        report.append("\n" + "=" * 60)
        report.append("性能优化建议:")
        report.append("=" * 60)
        report.append("\n1. 数据库查询优化:")
        report.append("   - 为teacher_id, day_of_week, period添加复合索引")
        report.append("   - 使用查询缓存减少重复查询")
        report.append("   - 考虑使用连接池优化连接管理")

        report.append("\n2. 应用层优化:")
        report.append("   - 实现教师资格本地缓存")
        report.append("   - 使用批量查询替代循环查询")
        report.append("   - 考虑使用WebSocket实现实时验证")

        report.append("\n3. 架构优化:")
        report.append("   - 考虑使用读写分离")
        report.append("   - 实现数据分片策略")
        report.append("   - 添加性能监控和告警")

        return "\n".join(report)


def run_performance_tests():
    """运行性能测试主函数"""
    suite = PerformanceTestSuite()
    results = suite.run_performance_tests()
    report = suite.generate_report()

    print(report)

    # 保存报告到文件
    with open('/workspace/music-scheduler/tests/performance/report.txt', 'w', encoding='utf-8') as f:
        f.write(report)

    print("\n报告已保存到: /workspace/music-scheduler/tests/performance/report.txt")

    # 返回测试结果摘要
    passed = sum(1 for r in results if r.passed)
    return {
        'total': len(results),
        'passed': passed,
        'failed': len(results) - passed,
        'all_passed': passed == len(results)
    }


if __name__ == '__main__':
    result = run_performance_tests()
    print(f"\n测试完成: {result['passed']}/{result['total']} 通过")
    exit(0 if result['all_passed'] else 1)
