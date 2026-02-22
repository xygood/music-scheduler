// 分析2301班劳动教育课程的周次-星期-节次规律
// 在浏览器控制台中运行此脚本

// 从localStorage中获取大课表数据
const STORAGE_KEYS = {
  LARGE_CLASS_SCHEDULES: 'music_scheduler_large_class_schedules'
};

function analyzeLaborEducationClass() {
  console.log('=== 分析2301班劳动教育课程规律 ===');
  
  // 获取大课表数据
  const schedulesData = localStorage.getItem(STORAGE_KEYS.LARGE_CLASS_SCHEDULES);
  if (!schedulesData) {
    console.log('❌ 未找到大课表数据，请先导入数据');
    return;
  }
  
  const schedules = JSON.parse(schedulesData);
  console.log(`📊 找到 ${schedules.length} 个大课表文件`);
  
  // 提取所有课程条目
  let allEntries = [];
  schedules.forEach(schedule => {
    allEntries = [...allEntries, ...schedule.entries];
  });
  
  console.log(`📋 总课程条目数: ${allEntries.length}`);
  
  // 过滤出2301班的劳动教育课程
  const laborEducationEntries = allEntries.filter(entry => {
    // 检查班级是否包含2301
    const is2301Class = entry.class_name && entry.class_name.includes('2301');
    // 检查课程名称是否包含劳动教育
    const isLaborEducation = entry.course_name && entry.course_name.includes('劳动教育');
    return is2301Class && isLaborEducation;
  });
  
  console.log(`🎯 2301班劳动教育课程条目数: ${laborEducationEntries.length}`);
  
  if (laborEducationEntries.length === 0) {
    console.log('❌ 未找到2301班的劳动教育课程数据');
    return;
  }
  
  // 显示所有相关条目
  console.log('\n=== 详细数据 ===');
  laborEducationEntries.forEach((entry, index) => {
    // 转换星期为中文
    const dayMap = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const dayOfWeek = dayMap[entry.day_of_week] || '未知';
    
    // 生成节次字符串
    const periodStr = entry.period_start === entry.period_end 
      ? `${entry.period_start}` 
      : `${entry.period_start}-${entry.period_end}`;
    
    console.log(`条目 ${index + 1}:`);
    console.log(`  课程名称: ${entry.course_name}`);
    console.log(`  班级: ${entry.class_name}`);
    console.log(`  周次: ${entry.week_range || '全学期'}`);
    console.log(`  星期: ${dayOfWeek} (${entry.day_of_week})`);
    console.log(`  节次: ${periodStr}`);
    console.log(`  教室: ${entry.location || '未知教室'}`);
    console.log(`  教师: ${entry.teacher_name || '未知教师'}`);
    console.log('---');
  });
  
  // 分析规律
  console.log('\n=== 规律分析 ===');
  
  // 分析星期分布
  const dayDistribution = {};
  laborEducationEntries.forEach(entry => {
    const day = entry.day_of_week;
    dayDistribution[day] = (dayDistribution[day] || 0) + 1;
  });
  
  console.log('星期分布:');
  Object.entries(dayDistribution).forEach(([day, count]) => {
    const dayMap = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const dayName = dayMap[parseInt(day)] || '未知';
    console.log(`  ${dayName}: ${count}次`);
  });
  
  // 分析节次分布
  const periodDistribution = {};
  laborEducationEntries.forEach(entry => {
    const periodKey = `${entry.period_start}-${entry.period_end}`;
    periodDistribution[periodKey] = (periodDistribution[periodKey] || 0) + 1;
  });
  
  console.log('\n节次分布:');
  Object.entries(periodDistribution).forEach(([period, count]) => {
    console.log(`  节次 ${period}: ${count}次`);
  });
  
  // 分析周次规律
  const weekRanges = laborEducationEntries.map(entry => entry.week_range || '全学期');
  console.log('\n周次范围:');
  weekRanges.forEach((range, index) => {
    console.log(`  条目 ${index + 1}: ${range}`);
  });
  
  // 总结规律
  console.log('\n=== 规律总结 ===');
  
  // 找出最常见的星期
  const mostCommonDay = Object.entries(dayDistribution).reduce((a, b) => dayDistribution[a[0]] > dayDistribution[b[0]] ? a : b);
  const dayMap = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const mostCommonDayName = dayMap[parseInt(mostCommonDay[0])] || '未知';
  
  // 找出最常见的节次
  const mostCommonPeriod = Object.entries(periodDistribution).reduce((a, b) => periodDistribution[a[0]] > periodDistribution[b[0]] ? a : b);
  
  console.log(`🎯 最常见的上课时间:`);
  console.log(`  星期: ${mostCommonDayName} (出现 ${mostCommonDay[1]} 次)`);
  console.log(`  节次: ${mostCommonPeriod[0]} (出现 ${mostCommonPeriod[1]} 次)`);
  
  // 分析周次规律
  if (weekRanges.length > 0) {
    const firstWeekRange = weekRanges[0];
    const allSameWeekRange = weekRanges.every(range => range === firstWeekRange);
    
    if (allSameWeekRange) {
      console.log(`📅 周次规律: 所有课程都在 ${firstWeekRange}`);
    } else {
      console.log(`📅 周次规律: 周次范围不一致，详情见上方列表`);
    }
  }
  
  console.log('\n=== 分析完成 ===');
}

// 运行分析
if (typeof window !== 'undefined') {
  // 在浏览器环境中运行
  analyzeLaborEducationClass();
} else {
  // 在Node.js环境中运行（需要模拟localStorage）
  console.log('请在浏览器控制台中运行此脚本');
}
