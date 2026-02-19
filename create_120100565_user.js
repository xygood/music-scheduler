// 直接为工号120100565创建用户账号
const localStorage = window.localStorage;

// 获取教师数据
const teachersData = JSON.parse(localStorage.getItem('music_scheduler_teachers') || '[]');
let usersData = JSON.parse(localStorage.getItem('music_scheduler_users') || '[]');

console.log('=== 创建用户账号调试信息 ===');
console.log('教师数据总数:', teachersData.length);
console.log('用户数据总数:', usersData.length);

// 查找教师120100565
const teacher = teachersData.find(t => t.teacher_id === '120100565');

if (teacher) {
  console.log('✅ 找到教师:', teacher.name);
  console.log('教师信息:', {
    id: teacher.id,
    name: teacher.name,
    faculty_name: teacher.faculty_name,
    faculty_id: teacher.faculty_id,
    can_teach_instruments: teacher.can_teach_instruments
  });
  
  // 检查是否已有用户账号
  const existingUser = usersData.find(u => u.teacher_id === '120100565');
  
  if (!existingUser) {
    // 创建新用户账号
    const newUser = {
      id: `user-${teacher.id}`,
      teacher_id: teacher.teacher_id,
      email: `${teacher.teacher_id}@music.edu.cn`,
      password: '120100565123',  // 明确的密码
      full_name: teacher.name,
      department: teacher.faculty_name || '',
      faculty_id: teacher.faculty_id,
      faculty_code: teacher.faculty_code,
      specialty: teacher.can_teach_instruments || [],
      created_at: new Date().toISOString(),
    };
    
    usersData.push(newUser);
    
    // 保存到localStorage
    localStorage.setItem('music_scheduler_users', JSON.stringify(usersData));
    
    console.log('✅ 用户账号创建成功!');
    console.log('账号信息:', {
      工号: newUser.teacher_id,
      密码: newUser.password,
      姓名: newUser.full_name,
      教研室: newUser.department
    });
    
    alert(`用户账号创建成功!\n\n工号: ${newUser.teacher_id}\n密码: ${newUser.password}\n姓名: ${newUser.full_name}\n\n现在可以使用此账号登录系统。`);
    
  } else {
    console.log('⚠️ 用户账号已存在');
    console.log('现有账号信息:', {
      工号: existingUser.teacher_id,
      密码: existingUser.password,
      姓名: existingUser.full_name
    });
    
    // 更新密码为正确格式
    existingUser.password = '120100565123';
    localStorage.setItem('music_scheduler_users', JSON.stringify(usersData));
    
    console.log('✅ 密码已更新为正确格式');
    alert(`用户账号已存在，密码已更新!\n\n工号: ${existingUser.teacher_id}\n密码: ${existingUser.password}\n\n现在可以使用此账号登录系统。`);
  }
} else {
  console.log('❌ 未找到工号120100565的教师');
  console.log('现有教师工号:', teachersData.map(t => t.teacher_id));
  alert('未找到工号120100565的教师，请检查教师数据是否已正确导入。');
}

console.log('=== 登录测试 ===');
// 验证登录逻辑
const testUser = usersData.find(u => u.teacher_id === '120100565');
if (testUser) {
  console.log('登录验证结果:');
  console.log('- 工号匹配:', testUser.teacher_id === '120100565');
  console.log('- 密码匹配:', testUser.password === '120100565123');
  console.log('- 可以登录:', testUser.teacher_id === '120100565' && testUser.password === '120100565123');
}