// 清理重复班级名称的脚本
// 运行方式：node cleanup_duplicate_classes.js

import fs from 'fs';
import path from 'path';

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

// 获取当前文件目录
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取本地存储数据
function readLocalStorage() {
  try {
    // 尝试从浏览器本地存储文件读取
    const browserStoragePath = path.join(__dirname, 'src', 'data', 'localStorage.json');
    if (fs.existsSync(browserStoragePath)) {
      const data = fs.readFileSync(browserStoragePath, 'utf8');
      console.log(`从 ${browserStoragePath} 读取数据`);
      return JSON.parse(data);
    }
    
    // 尝试从根目录读取
    const rootStoragePath = path.join(__dirname, 'localStorage.json');
    if (fs.existsSync(rootStoragePath)) {
      const data = fs.readFileSync(rootStoragePath, 'utf8');
      console.log(`从 ${rootStoragePath} 读取数据`);
      return JSON.parse(data);
    }
    
    console.log('未找到本地存储文件，返回空对象');
    return {};
  } catch (error) {
    console.error('读取本地存储失败:', error);
    return {};
  }
}

// 写入本地存储数据
function writeLocalStorage(data) {
  try {
    // 写入浏览器本地存储文件
    const browserStoragePath = path.join(__dirname, 'src', 'data');
    if (!fs.existsSync(browserStoragePath)) {
      fs.mkdirSync(browserStoragePath, { recursive: true });
    }
    const browserStorageFilePath = path.join(browserStoragePath, 'localStorage.json');
    fs.writeFileSync(browserStorageFilePath, JSON.stringify(data, null, 2));
    console.log(`本地存储已更新到 ${browserStorageFilePath}`);
    
    // 同时写入根目录备份
    const rootStoragePath = path.join(__dirname, 'localStorage.json');
    fs.writeFileSync(rootStoragePath, JSON.stringify(data, null, 2));
    console.log(`本地存储已备份到 ${rootStoragePath}`);
  } catch (error) {
    console.error('写入本地存储失败:', error);
  }
}

// 清理重复班级
function cleanupDuplicateClasses() {
  console.log('开始清理重复班级...');
  
  // 读取数据
  const storage = readLocalStorage();
  // 确保数据是数组
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
  writeLocalStorage(storage);
  
  console.log('清理完成！');
}

// 运行清理
cleanupDuplicateClasses();
