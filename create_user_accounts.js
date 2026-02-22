// 临时脚本：为特定教师创建用户账号
const localStorage = window.localStorage;

// 教师账号信息
const accountsToCreate = [
  { teacherId: '120100565' }
];

// 获取教师数据
const teachersData = JSON.parse(localStorage.getItem('music_scheduler_teachers') || '[]');
let usersData = JSON.parse(localStorage.getItem('music_scheduler_users') || '[]');

console.log('当前用户数据:', usersData);
console.log('教师数据:', teachersData);

accountsToCreate.forEach(account => {
  const teacher = teachersData.find(t => t.teacher_id === account.teacherId);
  
  if (teacher) {
    const existingUser = usersData.find(u => u.teacher_id === account.teacherId);
    
    if (!existingUser) {
      const newUser = {
        id: `user-${teacher.id}`,
        teacher_id: teacher.teacher_id,
        email: `${teacher.teacher_id}@music.edu.cn`,
        password: account.customPassword || account.teacherId + '123',
        full_name: teacher.name,
        department: teacher.faculty_name || '',
        faculty_id: teacher.faculty_id,
        faculty_code: teacher.faculty_code,
        specialty: teacher.can_teach_instruments || [],
        created_at: new Date().toISOString(),
      };
      
      usersData.push(newUser);
      const password = account.customPassword || account.teacherId + '123';
      console.log(`创建用户账号: ${account.teacherId} / ${password}`);
    } else {
      console.log(`用户账号已存在: ${account.teacherId}`);
    }
  } else {
    console.log(`未找到教师: ${account.teacherId}`);
  }
});

// 保存更新后的用户数据
localStorage.setItem('music_scheduler_users', JSON.stringify(usersData));
console.log('用户账号创建完成！');

console.log('最终用户数据:', usersData);
alert('用户账号创建完成！请尝试登录。');