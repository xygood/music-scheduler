// 创建指定管理员账号的脚本
// 管理员账号: 110
// 管理员密码: 135
const localStorage = window.localStorage;

console.log('=== 创建管理员账号系统 ===');

// 获取当前用户数据
const usersData = JSON.parse(localStorage.getItem('music_scheduler_users') || '[]');

console.log('当前用户总数:', usersData.length);

// 管理员账号配置
const adminAccounts = [
  {
    teacher_id: '110',
    email: 'admin@music.edu.cn',
    password: '135',
    full_name: '谷歌',
    department: '系统管理',
    faculty_id: 'ADMIN',
    faculty_code: 'ADMIN',
    specialty: ['系统管理'],
    role: 'admin'
  }
];

console.log('\n=== 开始创建管理员账号 ===');

adminAccounts.forEach(admin => {
  // 检查是否已存在
  const existingUser = usersData.find(u => 
    u.teacher_id === admin.teacher_id || u.email === admin.email
  );
  
  if (!existingUser) {
    // 创建新管理员账号
    const newAdmin = {
      id: `admin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      teacher_id: admin.teacher_id,
      email: admin.email,
      password: admin.password,
      full_name: admin.full_name,
      department: admin.department,
      faculty_id: admin.faculty_id,
      faculty_code: admin.faculty_code,
      specialty: admin.specialty,
      role: admin.role,
      is_admin: true,
      created_at: new Date().toISOString(),
    };
    
    usersData.push(newAdmin);
    console.log(`✅ 创建管理员账号: ${admin.teacher_id} / ${admin.password}`);
  } else {
    // 更新现有账号为管理员
    existingUser.faculty_id = 'ADMIN';
    existingUser.faculty_code = 'ADMIN';
    existingUser.is_admin = true;
    existingUser.role = admin.role;
    console.log(`✅ 更新现有账号为管理员: ${admin.teacher_id}`);
  }
});

// 保存更新后的用户数据
localStorage.setItem('music_scheduler_users', JSON.stringify(usersData));

console.log('\n=== 管理员账号创建完成 ===');
console.log('所有管理员账号:');
usersData.filter(u => u.faculty_id === 'ADMIN' || u.is_admin).forEach(admin => {
  console.log(`- ${admin.teacher_id}: ${admin.password} (${admin.full_name})`);
});

// 显示结果
alert(`管理员账号创建完成!\n\n管理员账号信息:\n\n账号: 110\n密码: 135\n\n请使用上述账号登录系统。`);

console.log('=== 账号验证 ===');
// 验证创建结果
adminAccounts.forEach(admin => {
  const user = usersData.find(u => u.teacher_id === admin.teacher_id);
  if (user) {
    console.log(`✅ 验证成功: ${admin.teacher_id} - ${user.full_name}`);
    console.log(`   密码: ${user.password}`);
    console.log(`   是否管理员: ${user.is_admin}`);
  } else {
    console.log(`❌ 验证失败: ${admin.teacher_id}`);
  }
});