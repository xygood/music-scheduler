// 测试脚本：检查教师和学生分配数据
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 模拟localStorage
const localStorage = {
  data: {},
  getItem(key) {
    return this.data[key] || null;
  },
  setItem(key, value) {
    this.data[key] = value;
  }
};

// 加载本地存储数据
const loadLocalStorage = () => {
  const storagePath = path.join(__dirname, 'localStorage.json');
  try {
    if (fs.existsSync(storagePath)) {
      const data = fs.readFileSync(storagePath, 'utf8');
      localStorage.data = JSON.parse(data);
      console.log('✅ 从 localStorage.json 加载数据成功');
    } else {
      console.log('⚠️  localStorage.json 不存在，使用空数据');
    }
  } catch (error) {
    console.error('❌ 加载 localStorage.json 失败:', error.message);
  }
};

// 保存本地存储数据
const saveLocalStorage = () => {
  const storagePath = path.join(__dirname, 'localStorage.json');
  try {
    fs.writeFileSync(storagePath, JSON.stringify(localStorage.data, null, 2));
    console.log('✅ 数据已保存到 localStorage.json');
  } catch (error) {
    console.error('❌ 保存 localStorage.json 失败:', error.message);
  }
};

// 检查并修复教师数据
const checkAndFixTeachers = () => {
  console.log('\n=== 检查教师数据 ===');
  
  const teachersJson = localStorage.getItem('music_scheduler_teachers');
  let teachers = teachersJson ? JSON.parse(teachersJson) : [];
  
  console.log(`现有教师数: ${teachers.length}`);
  
  // 检查关键教师
  const keyTeachers = ['徐颖', '邵荣', '李馨荷'];
  const instrumentsMap = {
    '徐颖': ['古筝'],
    '邵荣': ['声乐'],
    '李馨荷': ['钢琴']
  };
  
  keyTeachers.forEach(name => {
    let teacher = teachers.find(t => t.name === name);
    if (!teacher) {
      // 创建缺失的教师
      teacher = {
        id: `t_${name}_${Date.now()}`,
        teacher_id: `12015${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        name: name,
        faculty_id: instrumentsMap[name][0] === '声乐' ? 'VOCAL' : 
                   instrumentsMap[name][0] === '钢琴' ? 'PIANO' : 'INSTRUMENT',
        faculty_name: instrumentsMap[name][0] === '声乐' ? '声乐教研室' : 
                     instrumentsMap[name][0] === '钢琴' ? '钢琴教研室' : '器乐教研室',
        can_teach_instruments: instrumentsMap[name],
        instruments: instrumentsMap[name], // 确保instruments字段存在
        status: 'active',
        created_at: new Date().toISOString()
      };
      teachers.push(teacher);
      console.log(`✅ 创建教师: ${name} (可教: ${instrumentsMap[name].join(', ')})`);
    } else {
      // 确保can_teach_instruments和instruments字段正确
      if (!teacher.can_teach_instruments) {
        teacher.can_teach_instruments = instrumentsMap[name];
        console.log(`✅ 更新教师 ${name} 的可教课程: ${instrumentsMap[name].join(', ')}`);
      }
      if (!teacher.instruments) {
        teacher.instruments = teacher.can_teach_instruments;
        console.log(`✅ 更新教师 ${name} 的instruments字段`);
      }
    }
  });
  
  // 保存教师数据
  localStorage.setItem('music_scheduler_teachers', JSON.stringify(teachers));
  console.log('✅ 教师数据检查完成');
  
  return teachers;
};

// 检查并修复学生数据
const checkAndFixStudents = (teachers) => {
  console.log('\n=== 检查学生数据 ===');
  
  const studentsJson = localStorage.getItem('music_scheduler_students');
  let students = studentsJson ? JSON.parse(studentsJson) : [];
  
  console.log(`现有学生数: ${students.length}`);
  
  // 检查李宇萱同学
  let liYuxuan = students.find(s => s.name === '李宇萱');
  if (!liYuxuan) {
    // 创建李宇萱同学
    liYuxuan = {
      id: `s_liyuxuan_${Date.now()}`,
      student_id: '20230101',
      name: '李宇萱',
      grade: 2023,
      class_name: '音乐学2301',
      major_class: '音乐学2301',
      primary_instrument: '古筝',
      secondary_instruments: ['声乐', '钢琴'],
      secondary_instrument1: '声乐',
      secondary_instrument2: '钢琴',
      assigned_teachers: {
        primary_teacher_id: null,
        primary_teacher_name: null,
        secondary1_teacher_id: null,
        secondary1_teacher_name: null,
        secondary2_teacher_id: null,
        secondary2_teacher_name: null
      },
      status: 'active',
      created_at: new Date().toISOString()
    };
    students.push(liYuxuan);
    console.log('✅ 创建学生: 李宇萱');
    console.log('  主项: 古筝');
    console.log('  副项1: 声乐');
    console.log('  副项2: 钢琴');
  } else {
    // 确保专业信息正确
    if (liYuxuan.primary_instrument !== '古筝') {
      liYuxuan.primary_instrument = '古筝';
      console.log('✅ 更新李宇萱的主项为: 古筝');
    }
    if (!liYuxuan.secondary_instruments || !liYuxuan.secondary_instruments.includes('声乐')) {
      liYuxuan.secondary_instruments = ['声乐', '钢琴'];
      console.log('✅ 更新李宇萱的副项为: 声乐, 钢琴');
    }
    if (liYuxuan.secondary_instrument1 !== '声乐') {
      liYuxuan.secondary_instrument1 = '声乐';
      console.log('✅ 更新李宇萱的副项1为: 声乐');
    }
    if (liYuxuan.secondary_instrument2 !== '钢琴') {
      liYuxuan.secondary_instrument2 = '钢琴';
      console.log('✅ 更新李宇萱的副项2为: 钢琴');
    }
  }
  
  // 保存学生数据
  localStorage.setItem('music_scheduler_students', JSON.stringify(students));
  console.log('✅ 学生数据检查完成');
  
  return students;
};

// 测试分配逻辑
const testAllocation = (teachers, students) => {
  console.log('\n=== 测试分配逻辑 ===');
  
  // 找到关键教师
  const xuYing = teachers.find(t => t.name === '徐颖');
  const shaoRong = teachers.find(t => t.name === '邵荣');
  const liXinhe = teachers.find(t => t.name === '李馨荷');
  
  // 找到李宇萱
  const liYuxuan = students.find(s => s.name === '李宇萱');
  
  console.log('\n=== 教师信息 ===');
  console.log(`徐颖 - 可教课程: ${xuYing?.instruments?.join(', ') || '无'}`);
  console.log(`邵荣 - 可教课程: ${shaoRong?.instruments?.join(', ') || '无'}`);
  console.log(`李馨荷 - 可教课程: ${liXinhe?.instruments?.join(', ') || '无'}`);
  
  console.log('\n=== 学生信息 ===');
  console.log(`李宇萱 - 主项: ${liYuxuan?.primary_instrument || '无'}`);
  console.log(`李宇萱 - 副项1: ${liYuxuan?.secondary_instrument1 || '无'}`);
  console.log(`李宇萱 - 副项2: ${liYuxuan?.secondary_instrument2 || '无'}`);
  
  // 测试分配
  console.log('\n=== 测试分配 ===');
  
  // 主项分配：徐颖 -> 古筝
  if (xuYing && liYuxuan) {
    const canTeachGuZheng = xuYing.instruments?.includes('古筝');
    console.log(`徐颖能否教古筝: ${canTeachGuZheng ? '✅ 可以' : '❌ 不可以'}`);
  }
  
  // 副项1分配：邵荣 -> 声乐
  if (shaoRong && liYuxuan) {
    const canTeachShengYue = shaoRong.instruments?.includes('声乐');
    console.log(`邵荣能否教声乐: ${canTeachShengYue ? '✅ 可以' : '❌ 不可以'}`);
  }
  
  // 副项2分配：李馨荷 -> 钢琴
  if (liXinhe && liYuxuan) {
    const canTeachGangQin = liXinhe.instruments?.includes('钢琴');
    console.log(`李馨荷能否教钢琴: ${canTeachGangQin ? '✅ 可以' : '❌ 不可以'}`);
  }
  
  console.log('\n=== 分配测试完成 ===');
};

// 主函数
const main = () => {
  console.log('🚀 开始测试教师和学生分配数据');
  
  loadLocalStorage();
  const teachers = checkAndFixTeachers();
  const students = checkAndFixStudents(teachers);
  testAllocation(teachers, students);
  
  saveLocalStorage();
  
  console.log('\n🎉 测试完成！');
  console.log('\n=== 下一步操作 ===');
  console.log('1. 运行: node test-allocation.js 检查数据');
  console.log('2. 在学生分配页面下载导入模板');
  console.log('3. 填写教师-学生对应表，包含专业类型字段');
  console.log('4. 导入表格，系统会自动分配教师到对应列');
};

// 运行测试
main();
