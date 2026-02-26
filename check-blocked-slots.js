// 检查本地存储中的禁排时间数据
import fs from 'fs';
import path from 'path';

// 读取本地存储文件
const storagePath = path.join(process.cwd(), 'localStorage.json');

if (fs.existsSync(storagePath)) {
  try {
    const storageData = JSON.parse(fs.readFileSync(storagePath, 'utf8'));
    const blockedSlots = storageData.music_scheduler_blocked_slots || [];
    
    console.log('禁排时间数据数量:', blockedSlots.length);
    console.log('\n禁排时间详情:');
    blockedSlots.forEach((slot, index) => {
      console.log(`\n${index + 1}. ID: ${slot.id}`);
      console.log(`   学期: ${slot.semester_label}`);
      console.log(`   类型: ${slot.type}`);
      console.log(`   周次: ${slot.week_number}`);
      console.log(`   星期: ${slot.day_of_week}`);
      console.log(`   开始节次: ${slot.start_period}`);
      console.log(`   结束节次: ${slot.end_period}`);
      console.log(`   禁排原因: ${slot.reason}`);
      console.log(`   特定周次: ${JSON.stringify(slot.specific_week_days || [])}`);
      console.log(`   班级关联: ${JSON.stringify(slot.class_associations || [])}`);
    });
    
    // 检查第10周的禁排时间
    const week10Slots = blockedSlots.filter(slot => {
      // 检查直接的week_number
      if (slot.week_number === 10) return true;
      // 检查specific_week_days中的周次
      if (slot.specific_week_days) {
        return slot.specific_week_days.some(wd => wd.week === 10);
      }
      return false;
    });
    
    console.log('\n=== 第10周禁排时间 ===');
    if (week10Slots.length === 0) {
      console.log('没有找到第10周的禁排时间');
    } else {
      console.log('找到', week10Slots.length, '条第10周的禁排时间');
      week10Slots.forEach((slot, index) => {
        console.log(`\n${index + 1}. ${slot.reason}`);
        console.log(`   类型: ${slot.type}`);
        console.log(`   星期: ${slot.day_of_week}`);
        console.log(`   节次: ${slot.start_period}-${slot.end_period}`);
        console.log(`   学期: ${slot.semester_label}`);
      });
    }
    
  } catch (error) {
    console.error('读取本地存储文件失败:', error);
  }
} else {
  console.log('本地存储文件不存在，尝试检查浏览器本地存储格式');
  
  // 检查是否存在其他本地存储文件
  const possibleStorageFiles = [
    'storage.json',
    'localStorage.data',
    '.localStorage'
  ];
  
  for (const fileName of possibleStorageFiles) {
    const filePath = path.join(process.cwd(), fileName);
    if (fs.existsSync(filePath)) {
      console.log(`找到存储文件: ${fileName}`);
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        console.log('文件内容:', Object.keys(data));
        if (data.music_scheduler_blocked_slots) {
          console.log('找到禁排时间数据，数量:', data.music_scheduler_blocked_slots.length);
        }
      } catch (error) {
        console.error('读取文件失败:', error);
      }
      break;
    }
  }
}
