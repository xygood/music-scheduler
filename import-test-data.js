// 导入测试数据到localStorage
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取测试数据
const readTestData = () => {
  const storagePath = path.join(__dirname, 'localStorage.json');
  try {
    if (fs.existsSync(storagePath)) {
      const data = fs.readFileSync(storagePath, 'utf8');
      return JSON.parse(data);
    } else {
      console.error('❌ localStorage.json 不存在');
      return null;
    }
  } catch (error) {
    console.error('❌ 读取 localStorage.json 失败:', error.message);
    return null;
  }
};

// 导入数据到localStorage
const importToLocalStorage = (data) => {
  if (!data) return false;
  
  try {
    // 检查浏览器环境
    if (typeof window !== 'undefined' && window.localStorage) {
      // 在浏览器环境中运行
      Object.entries(data).forEach(([key, value]) => {
        window.localStorage.setItem(key, JSON.stringify(value));
      });
      console.log('✅ 数据已成功导入到浏览器 localStorage');
      return true;
    } else {
      // 在Node.js环境中运行，提示用户手动导入
      console.log('⚠️ 当前在Node.js环境中，无法直接访问浏览器 localStorage');
      console.log('\n=== 手动导入步骤 ===');
      console.log('1. 打开浏览器开发者工具 (F12)');
      console.log('2. 切换到 Console 标签页');
      console.log('3. 复制以下代码并粘贴到控制台执行:');
      console.log('\n// 导入测试数据');
      console.log('const testData = ' + JSON.stringify(data, null, 2) + ';');
      console.log('Object.entries(testData).forEach(([key, value]) => {');
      console.log('  localStorage.setItem(key, JSON.stringify(value));');
      console.log('});');
      console.log('console.log("✅ 测试数据导入成功!");');
      console.log('\n4. 刷新页面查看数据');
      return false;
    }
  } catch (error) {
    console.error('❌ 导入数据失败:', error.message);
    return false;
  }
};

// 主函数
const main = () => {
  console.log('🚀 开始导入测试数据');
  
  const testData = readTestData();
  if (testData) {
    importToLocalStorage(testData);
    console.log('\n🎉 导入操作完成！');
    console.log('\n=== 测试数据详情 ===');
    console.log(`教师数: ${testData.music_scheduler_teachers ? testData.music_scheduler_teachers.length : 0}`);
    console.log(`学生数: ${testData.music_scheduler_students ? testData.music_scheduler_students.length : 0}`);
    
    if (testData.music_scheduler_teachers) {
      console.log('\n=== 教师列表 ===');
      testData.music_scheduler_teachers.forEach(teacher => {
        console.log(`${teacher.name} - 可教: ${teacher.instruments?.join(', ') || '无'}`);
      });
    }
    
    if (testData.music_scheduler_students) {
      console.log('\n=== 学生列表 ===');
      testData.music_scheduler_students.forEach(student => {
        console.log(`${student.name} - 主项: ${student.primary_instrument}, 副项: ${student.secondary_instruments?.join(', ') || '无'}`);
      });
    }
  } else {
    console.error('❌ 没有找到测试数据');
  }
};

// 运行导入
main();
