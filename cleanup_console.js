// 浏览器控制台清理脚本
// 使用方法：在浏览器控制台中复制粘贴并运行此脚本

// 本地存储键名
const STORAGE_KEYS = {
    CLASSES: 'music_scheduler_classes',
    COURSES: 'music_scheduler_courses',
    STUDENTS: 'music_scheduler_students'
};

// 清理班级名称的函数
function cleanupClassName(className) {
    if (!className) return className;
    
    // 移除重复的前缀
    if (className.includes('音乐学音乐学')) {
        className = className.replace('音乐学音乐学', '音乐学');
    }
    // 也处理其他可能的重复前缀
    const prefixRegex = /^(音乐学|舞蹈学|美术学|表演系)\1+/;
    if (prefixRegex.test(className)) {
        className = className.replace(prefixRegex, '$1');
    }
    return className;
}

// 清理重复班级
function cleanupDuplicateClasses() {
    console.log('开始清理重复班级...');
    
    // 读取数据
    const storage = {};
    for (const key in STORAGE_KEYS) {
        const storageKey = STORAGE_KEYS[key];
        const value = localStorage.getItem(storageKey);
        if (value) {
            storage[storageKey] = JSON.parse(value);
        } else {
            storage[storageKey] = [];
        }
    }
    
    let classes = Array.isArray(storage[STORAGE_KEYS.CLASSES]) ? storage[STORAGE_KEYS.CLASSES] : [];
    let courses = Array.isArray(storage[STORAGE_KEYS.COURSES]) ? storage[STORAGE_KEYS.COURSES] : [];
    let students = Array.isArray(storage[STORAGE_KEYS.STUDENTS]) ? storage[STORAGE_KEYS.STUDENTS] : [];
    
    console.log(`原始班级数量: ${classes.length}`);
    console.log(`原始课程数量: ${courses.length}`);
    console.log(`原始学生数量: ${students.length}`);
    
    // 清理班级名称
    const cleanedClasses = [];
    const classMap = new Map(); // 用于去重和映射旧名称到新名称
    
    classes.forEach(cls => {
        const cleanedName = cleanupClassName(cls.class_name);
        
        // 检查是否已存在相同的清理后名称
        if (!classMap.has(cleanedName)) {
            // 更新班级名称
            const updatedClass = {
                ...cls,
                class_name: cleanedName,
                // 同时更新 class_id，确保一致性
                class_id: cleanedName.replace('音乐学', '')
            };
            
            cleanedClasses.push(updatedClass);
            classMap.set(cleanedName, updatedClass);
            
            // 同时记录旧名称到新名称的映射
            if (cls.class_name !== cleanedName) {
                console.log(`清理班级名称: ${cls.class_name} -> ${cleanedName}`);
                classMap.set(cls.class_name, updatedClass);
            }
        } else {
            console.log(`移除重复班级: ${cls.class_name}`);
            // 记录旧名称到新名称的映射
            classMap.set(cls.class_name, classMap.get(cleanedName));
        }
    });
    
    console.log(`清理后班级数量: ${cleanedClasses.length}`);
    
    // 更新课程中的班级名称
    const updatedCourses = courses.map(course => {
        if (course.major_class) {
            const mappedClass = classMap.get(course.major_class);
            if (mappedClass) {
                console.log(`更新课程班级: ${course.major_class} -> ${mappedClass.class_name}`);
                return {
                    ...course,
                    major_class: mappedClass.class_name
                };
            }
        }
        return course;
    });
    
    console.log(`更新后课程数量: ${updatedCourses.length}`);
    
    // 更新学生中的班级名称
    const updatedStudents = students.map(student => {
        if (student.major_class) {
            const mappedClass = classMap.get(student.major_class);
            if (mappedClass) {
                console.log(`更新学生班级: ${student.major_class} -> ${mappedClass.class_name}`);
                return {
                    ...student,
                    major_class: mappedClass.class_name
                };
            }
        }
        if (student.class_name) {
            const mappedClass = classMap.get(student.class_name);
            if (mappedClass) {
                console.log(`更新学生班级名称: ${student.class_name} -> ${mappedClass.class_name}`);
                return {
                    ...student,
                    class_name: mappedClass.class_name
                };
            }
        }
        return student;
    });
    
    console.log(`更新后学生数量: ${updatedStudents.length}`);
    
    // 更新数据
    storage[STORAGE_KEYS.CLASSES] = cleanedClasses;
    storage[STORAGE_KEYS.COURSES] = updatedCourses;
    storage[STORAGE_KEYS.STUDENTS] = updatedStudents;
    
    // 写入数据
    for (const key in storage) {
        localStorage.setItem(key, JSON.stringify(storage[key]));
    }
    
    console.log('清理完成！');
    console.log('请刷新页面查看清理结果。');
}

// 检查当前班级数据
function checkCurrentClasses() {
    console.log('检查当前班级数据...');
    const classesJson = localStorage.getItem('music_scheduler_classes');
    if (classesJson) {
        const classes = JSON.parse(classesJson);
        console.log(`当前班级数量: ${classes.length}`);
        console.log('班级列表:');
        classes.forEach(cls => {
            console.log(`- ${cls.class_name}`);
        });
    } else {
        console.log('未找到班级数据');
    }
}

// 运行检查
checkCurrentClasses();

// 运行清理
cleanupDuplicateClasses();

// 再次检查
setTimeout(checkCurrentClasses, 1000);
