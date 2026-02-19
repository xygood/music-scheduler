// 检查用户账号数据的脚本
const localStorage = window.localStorage;

// 获取所有用户数据
const usersData = JSON.parse(localStorage.getItem('music_scheduler_users') || '[]');
const teachersData = JSON.parse(localStorage.getItem('music_scheduler_teachers') || '[]');

console.log('=== 用户账号数据 ===');
console.log('用户总数:', usersData.length);
usersData.forEach(user => {
  console.log(`用户ID: ${user.id}`);
  console.log(`工号: ${user.teacher_id}`);
  console.log(`邮箱: ${user.email}`);
  console.log(`密码: ${user.password}`);
  console.log(`姓名: ${user.full_name}`);
  console.log('---');
});

console.log('\n=== 教师数据 ===');
console.log('教师总数:', teachersData.length);
const teacher120100565 = teachersData.find(t => t.teacher_id === '120100565');
if (teacher120100565) {
  console.log('找到教师120100565:');
  console.log('姓名:', teacher120100565.name);
  console.log('ID:', teacher120100565.id);
  console.log('教研室:', teacher120100565.faculty_name);
} else {
  console.log('未找到教师120100565');
}

console.log('\n=== 检查对应用户账号 ===');
const user120100565 = usersData.find(u => u.teacher_id === '120100565');
if (user120100565) {
  console.log('找到用户账号:');
  console.log('工号:', user120100565.teacher_id);
  console.log('密码:', user120100565.password);
  console.log('预期密码: 120100565123');
  console.log('密码是否正确:', user120100565.password === '120100565123');
} else {
  console.log('未找到工号120100565的用户账号');
}

// 模拟登录验证
console.log('\n=== 模拟登录验证 ===');
const testTeacherId = '120100565';
const testPassword = '120100565123';

const matchedUser = usersData.find(u => {
  console.log(`检查用户 ${u.teacher_id}: 密码 ${u.password}`);
  return u.teacher_id === testTeacherId && u.password === testPassword;
});

if (matchedUser) {
  console.log('✅ 登录验证成功');
} else {
  console.log('❌ 登录验证失败');
  console.log('可能原因:');
  console.log('1. 用户账号不存在');
  console.log('2. 密码不匹配');
}