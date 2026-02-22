// 快速修复理论教师归属问题
// 适用于不想重新导入全部数据的场景

import { teacherService } from '../services/localStorage';

/**
 * 快速修复理论教师归属
 * 将所有可教课程包含"音乐理论"的教师归属到理论教研室
 */
export const quickFixTheoryTeachers = async () => {
  console.log('🚀 开始快速修复理论教师归属...');
  
  try {
    // 获取所有教师数据
    const allTeachers = await teacherService.getAll();
    console.log(`📊 找到 ${allTeachers.length} 位教师`);
    
    // 查找需要修正的理论教师
    const theoryTeachers = allTeachers.filter(teacher => 
      teacher.can_teach_courses?.includes('音乐理论')
    );
    
    console.log(`🎯 找到 ${theoryTeachers.length} 位理论教师需要修正:`);
    theoryTeachers.forEach(teacher => {
      console.log(`   - ${teacher.name} (${teacher.teacher_id}): ${teacher.faculty_name} -> 理论教研室`);
    });
    
    if (theoryTeachers.length === 0) {
      console.log('✅ 未找到需要修正的理论教师');
      return { success: true, message: '没有需要修正的理论教师' };
    }
    
    // 执行修正
    let fixedCount = 0;
    for (const teacher of theoryTeachers) {
      try {
        const updatedTeacher = {
          ...teacher,
          faculty_id: 'THEORY',
          faculty_name: '理论教研室'
        };
        
        await teacherService.update(teacher.id, updatedTeacher);
        console.log(`✅ 修正完成: ${teacher.name} (${teacher.teacher_id})`);
        fixedCount++;
      } catch (error) {
        console.error(`❌ 修正失败: ${teacher.name} (${teacher.teacher_id})`, error);
      }
    }
    
    console.log(`🎉 修正完成！共修正 ${fixedCount}/${theoryTeachers.length} 位理论教师`);
    
    return {
      success: true,
      message: `修正完成！共修正 ${fixedCount}/${theoryTeachers.length} 位理论教师`,
      fixedCount,
      totalCount: theoryTeachers.length
    };
    
  } catch (error) {
    console.error('❌ 修正过程中发生错误:', error);
    return {
      success: false,
      message: '修正过程中发生错误',
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

// 在浏览器环境中可用
if (typeof window !== 'undefined') {
  (window as any).quickFixTheoryTeachers = quickFixTheoryTeachers;
  console.log('🎯 快速修复函数已加载！在控制台运行 quickFixTheoryTeachers() 来执行修复');
}

// 导出
export default quickFixTheoryTeachers;