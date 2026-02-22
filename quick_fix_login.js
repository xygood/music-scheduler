// 快速修复登录问题的脚本
const localStorage = window.localStorage;

console.log('=== 快速修复登录问题 ===');

// 获取当前数据
const usersData = JSON.parse(localStorage.getItem('music_scheduler_users') || '[]');
const teachersData = JSON.parse(localStorage.getItem('music_scheduler_teachers') || '[]');

console.log('用户数量:', usersData.length);
console.log('教师数量:', teachersData.length);

// 为工号120100565创建账号
const teacherId = '120100565';
const teacher = teachersData.find(t => t.teacher_id === teacherId);

if (teacher) {
  console.log('找到教师:', teacher.name);
  
  // 检查现有用户
  let user = usersData.find(u => u.teacher_id === teacherId);
  
  if (!user) {
    // 创建新用户
    user = {
      id: `user-${teacher.id}`,
      teacher_id: teacher.teacher_id,
      email: `${teacher.teacher_id}@music.edu.cn`,
      password: `${teacher.teacher_id}123`,
      full_name: teacher.name,
      department: teacher.faculty_name || '',
      faculty_id: teacher.faculty_id,
      faculty_code: teacher.faculty_code,
      specialty: teacher.can_teach_instruments || [],
      created_at: new Date().toISOString(),
    };
    usersData.push(user);
    console.log('✅ 创建新用户账号');
  } else {
    // 更新密码
    user.password = `${teacher.teacher_id}123`;
    console.log('✅ 更新用户密码');
  }
  
  // 保存数据
  localStorage.setItem('music_scheduler_users', JSON.stringify(usersData));
  
  console.log('账号信息:');
  console.log('- 工号:', user.teacher_id);
  console.log('- 密码:', user.password);
  console.log('- 姓名:', user.full_name);
  
  alert(`登录问题已修复!\n\n请使用以下凭据登录:\n工号: ${user.teacher_id}\n密码: ${user.password}`);
  
} else {
  console.log('❌ 未找到教师');
  alert('未找到工号120100565的教师，请先导入教师数据。');
}

// 显示所有用户
console.log('\n所有用户账号:');
usersData.forEach(u => {
  console.log(`- ${u.teacher_id}: ${u.password}`);
});