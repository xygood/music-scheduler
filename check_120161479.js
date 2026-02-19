// 检查工号120161479的状态
const localStorage = window.localStorage;

console.log('=== 检查工号120161479登录问题 ===');

// 获取当前数据
const usersData = JSON.parse(localStorage.getItem('music_scheduler_users') || '[]');
const teachersData = JSON.parse(localStorage.getItem('music_scheduler_teachers') || '[]');

console.log('用户数据总数:', usersData.length);
console.log('教师数据总数:', teachersData.length);

// 检查教师数据中是否存在120161479
const teacher = teachersData.find(t => t.teacher_id === '120161479');

console.log('\n=== 教师数据检查 ===');
if (teacher) {
  console.log('✅ 找到教师120161479:');
  console.log('姓名:', teacher.name);
  console.log('教研室:', teacher.faculty_name);
  console.log('职位:', teacher.position);
  console.log('状态:', teacher.status);
} else {
  console.log('❌ 未找到教师120161479');
  console.log('现有教师工号:', teachersData.map(t => t.teacher_id));
}

// 检查用户账号中是否存在120161479
console.log('\n=== 用户账号检查 ===');
const user = usersData.find(u => u.teacher_id === '120161479');

if (user) {
  console.log('✅ 找到用户账号:');
  console.log('工号:', user.teacher_id);
  console.log('密码:', user.password);
  console.log('姓名:', user.full_name);
  console.log('邮箱:', user.email);
  
  // 验证密码格式
  const expectedPassword = '120161479123';
  console.log('预期密码:', expectedPassword);
  console.log('密码是否正确:', user.password === expectedPassword);
  
} else {
  console.log('❌ 未找到用户账号');
  console.log('现有用户工号:', usersData.map(u => u.teacher_id));
}

// 如果存在教师但不存在用户，创建用户账号
if (teacher && !user) {
  console.log('\n=== 创建用户账号 ===');
  console.log('正在为教师120161479创建用户账号...');
  
  const newUser = {
    id: `user-${teacher.id}`,
    teacher_id: teacher.teacher_id,
    email: `${teacher.teacher_id}@music.edu.cn`,
    password: '120161479123',  // 工号+123
    full_name: teacher.name,
    department: teacher.faculty_name || '',
    faculty_id: teacher.faculty_id,
    faculty_code: teacher.faculty_code,
    specialty: teacher.can_teach_instruments || [],
    created_at: new Date().toISOString(),
  };
  
  usersData.push(newUser);
  localStorage.setItem('music_scheduler_users', JSON.stringify(usersData));
  
  console.log('✅ 用户账号创建成功!');
  console.log('账号信息:');
  console.log('- 工号:', newUser.teacher_id);
  console.log('- 密码:', newUser.password);
  console.log('- 姓名:', newUser.full_name);
  console.log('- 教研室:', newUser.department);
  
  alert(`用户账号创建成功!\n\n请使用以下凭据登录:\n工号: ${newUser.teacher_id}\n密码: ${newUser.password}`);
  
} else if (teacher && user && user.password !== '120161479123') {
  console.log('\n=== 更新用户密码 ===');
  user.password = '120161479123';
  localStorage.setItem('music_scheduler_users', JSON.stringify(usersData));
  console.log('✅ 密码已更新为正确格式');
  
  alert(`密码已更新!\n\n请使用以下凭据登录:\n工号: ${user.teacher_id}\n密码: ${user.password}`);
  
} else if (!teacher) {
  console.log('\n=== 问题诊断 ===');
  console.log('教师数据不存在，需要先导入教师数据');
  alert('未找到工号120161479的教师数据，请先导入教师数据。');
  
} else {
  console.log('\n=== 状态检查 ===');
  console.log('教师数据和用户账号都存在且正常');
}

// 显示所有现有用户账号
console.log('\n=== 所有现有用户账号 ===');
usersData.forEach(u => {
  console.log(`工号: ${u.teacher_id}, 密码: ${u.password}, 姓名: ${u.full_name}`);
});