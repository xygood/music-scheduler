// 检查教师琴房配置的脚本
import fs from 'fs';
import path from 'path';

// 读取本地存储文件
const storagePath = path.join('src/data/localStorage.json');

try {
  const storageData = JSON.parse(fs.readFileSync(storagePath, 'utf8'));
  
  // 查找林琳老师
  const teachers = storageData.teachers || [];
  console.log('总教师数:', teachers.length);
  
  const linlinTeacher = teachers.find(t => t.teacher_id === '120170194' || t.id === '120170194');
  
  if (linlinTeacher) {
    console.log('找到林琳老师:', linlinTeacher.name, '(', linlinTeacher.teacher_id, ')');
    console.log('ID:', linlinTeacher.id);
    console.log('固定琴房ID:', linlinTeacher.fixed_room_id);
    console.log('固定琴房配置:', JSON.stringify(linlinTeacher.fixed_rooms, null, 2));
  } else {
    console.log('未找到林琳老师');
    // 显示所有教师的工号和ID
    console.log('\n所有教师:');
    teachers.forEach(t => {
      console.log('-', t.name, '(工号:', t.teacher_id, ', ID:', t.id, ')');
    });
  }
  
  // 检查所有琴房
  const rooms = storageData.rooms || [];
  console.log('\n所有琴房:');
  rooms.forEach(room => {
    console.log('-', room.room_name, '(', room.id, ')');
  });
  
} catch (error) {
  console.error('读取本地存储文件失败:', error.message);
}
