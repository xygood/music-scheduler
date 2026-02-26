// 测试parseClassInfoImproved方法处理多门课程的情况

// 模拟parseClassInfoImproved方法的逻辑
function parseClassInfoImproved(cellContent) {
  if (!cellContent) {
    return [];
  }

  const result = [];

  const cleanText = String(cellContent).trim();
  
  // 按换行符分割，处理多门课程的情况
  const courses = cleanText.split(/\n+/);
  
  // 提取所有课程的周次信息
  const allWeekRanges = [];
  
  for (const course of courses) {
    if (!course.trim()) continue;
    
    // 提取周次信息
    const weekMatch = course.match(/【([^】]+)】/);
    if (weekMatch) {
      allWeekRanges.push(weekMatch[1].trim());
    }
  }
  
  // 处理第一门课程
  if (courses.length > 0) {
    const firstCourse = courses[0].trim();
    const info = {
      courseName: '',
      teacherName: '',
      location: ''
    };

    // 提取第一门课程的周次信息（会被合并的周次替换）
    const weekMatch = firstCourse.match(/【([^】]+)】/);
    if (weekMatch) {
      info.weekRange = weekMatch[1].trim();
    }
    
    // 提取教室信息（周次之后的内容）
    const weekParts = firstCourse.split('】');
    if (weekParts.length > 1) {
      const afterWeek = weekParts[1].trim();
      if (afterWeek && !afterWeek.includes('【')) {
        info.location = afterWeek;
      }
    }
    
    // 提取课程名称和教师
    // 支持中文冒号和英文冒号
    const cleanTextWithEnglishColon = firstCourse.replace(/：/g, ':');
    
    // 格式1："课程名称- 教师名:【周次】" 或 "课程名称-教师名:【周次】"
    const colonParts = cleanTextWithEnglishColon.split(':');
    if (colonParts.length >= 2) {
      const beforeColon = colonParts[0].trim();
      
      // 优先检查是否包含"-"，这是最常见的格式
      if (beforeColon.includes('-')) {
        // 按 "-" 分割（最后一个 "-" 是分隔符）
        const dashParts = beforeColon.split('-');
        if (dashParts.length >= 2) {
          // 最后一个部分是教师，前面的是课程名称
          info.teacherName = dashParts[dashParts.length - 1].trim();
          info.courseName = dashParts.slice(0, dashParts.length - 1).join('-').trim();
        } else {
          // 格式2："教师名:【周次】" 格式
          info.courseName = beforeColon;
        }
      } else {
        // 检查是否包含空格，可能是空格分隔格式 "课程名称 教师名:【周次】"
        const spaceParts = beforeColon.split(/\s+/);
        if (spaceParts.length >= 2) {
          // 空格分隔格式：最后一个部分是教师，前面的是课程名称
          info.teacherName = spaceParts[spaceParts.length - 1].trim();
          info.courseName = spaceParts.slice(0, spaceParts.length - 1).join(' ').trim();
        } else {
          // 格式2："教师名:【周次】" 格式
          info.courseName = beforeColon;
        }
      }
    } else {
      // 格式3："创新素质培育（理论） 王薇：【1-5，8-17周】 实训207"（空格分隔格式）
      // 尝试按空格分割，找到包含":"的部分作为教师信息
      const parts = cleanTextWithEnglishColon.split(/\s+/);
      let courseNameParts = [];
      let foundTeacher = false;
      
      for (const part of parts) {
        if (part.includes(':')) {
          // 找到教师信息
          info.teacherName = part.replace(':', '').trim();
          foundTeacher = true;
        } else if (part.includes('【')) {
          // 找到周次信息，跳过
          continue;
        } else if (part.includes('】')) {
          // 找到周次结束，后面可能是地点，跳过
          continue;
        } else if (foundTeacher) {
          // 教师信息后面的可能是地点，跳过
          continue;
        } else {
          // 课程名称部分
          courseNameParts.push(part);
        }
      }
      
      if (courseNameParts.length > 0) {
        info.courseName = courseNameParts.join(' ').trim();
      } else {
        // 如果没有解析出课程名称，使用整个文本
        info.courseName = firstCourse;
      }
    }

    // 合并所有周次信息到第一门课程
    if (allWeekRanges.length > 0) {
      info.weekRange = allWeekRanges.join('; ');
    }

    // 确保至少有课程名称或教师姓名
    if (info.courseName || info.teacherName) {
      // 如果只有教师姓名，将其作为课程名称
      if (!info.courseName && info.teacherName) {
        info.courseName = info.teacherName;
        info.teacherName = '';
      }
      result.push(info);
    }
  }

  return result;
}

// 测试多门课程的情况
const testData = `劳动教育（理论）
实训指导老师：【14周】
中国近现代史纲要
侯宪：【1-5，7-13，15-17周】
实训312`;

console.log('测试数据（多门课程）:');
console.log(testData);
const result = parseClassInfoImproved(testData);
console.log('解析结果:', JSON.stringify(result, null, 2));

// 测试单门课程的情况
const testData2 = "创新素质培育（理论） 王薇：【1-5，8-17周】 实训207";
console.log('\n测试数据（单门课程）:', testData2);
const result2 = parseClassInfoImproved(testData2);
console.log('解析结果2:', JSON.stringify(result2, null, 2));

// 测试"-"分隔格式
const testData3 = "合唱与指挥（二）- 王冠慈:【1-2,5,7-18周】 音乐厅310";
console.log('\n测试数据3（"-"分隔格式）:', testData3);
const result3 = parseClassInfoImproved(testData3);
console.log('解析结果3:', JSON.stringify(result3, null, 2));
