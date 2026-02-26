// 更新通适大课数据中的班级名称
// 将"音乐学（专升本）2304"改为"音乐学2304"

import { STORAGE_KEYS } from '../services/localStorage';

const updateLargeClassClassName = () => {
  try {
    // 从localStorage获取通适大课数据
    const largeClassData = localStorage.getItem(STORAGE_KEYS.LARGE_CLASS_SCHEDULES);
    
    if (!largeClassData) {
      console.log('没有找到通适大课数据');
      return;
    }

    const schedules = JSON.parse(largeClassData);
    
    if (!Array.isArray(schedules)) {
      console.log('通适大课数据格式错误');
      return;
    }

    let updatedCount = 0;

    // 遍历所有通适大课数据
    schedules.forEach(schedule => {
      if (schedule.entries && Array.isArray(schedule.entries)) {
        // 遍历每个课程条目
        schedule.entries.forEach(entry => {
          if (entry.class_name === '音乐学（专升本）2304') {
            entry.class_name = '音乐学2304';
            updatedCount++;
          }
        });
      }
    });

    // 保存更新后的数据
    localStorage.setItem(STORAGE_KEYS.LARGE_CLASS_SCHEDULES, JSON.stringify(schedules));

    console.log(`成功更新了 ${updatedCount} 条通适大课数据中的班级名称`);
    console.log('已将所有"音乐学（专升本）2304"改为"音乐学2304"');
  } catch (error) {
    console.error('更新通适大课数据失败:', error);
  }
};

// 执行更新
updateLargeClassClassName();
