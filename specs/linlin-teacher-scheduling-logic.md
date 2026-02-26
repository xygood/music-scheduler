# 林琳教师排课逻辑说明

## 1. 背景

林琳教师是一位特殊的教师，她同时教授钢琴和器乐课程，因此需要根据课程类型自动匹配不同的琴房。

## 2. 琴房配置

林琳教师有两个固定琴房：
- 影琴221-03（钢琴琴房）
- 器乐排练室114（器乐琴房）

## 3. 琴房自动匹配逻辑

### 3.1 保存排课时的琴房匹配

在 `handleSaveSchedule` 函数中，当用户未手动选择琴房时，系统会根据以下逻辑自动匹配琴房：

```typescript
// 林琳教师特殊处理：根据课程类型匹配特定琴房
if (isLinLinTeacher) {
  if (selectedCourseType === '钢琴') {
    // 匹配影琴221-03
    roomInfo = fixedRooms.find(r => r.room?.room_name === '影琴221-03');
  } else if (selectedCourseType === '器乐') {
    // 匹配器乐排练室114
    roomInfo = fixedRooms.find(r => r.room?.room_name === '器乐排练室114');
  } else {
    // 其他课程类型按正常逻辑匹配
    roomInfo = fixedRooms.find(r => r.facultyCode === facultyCode);
  }
}
```

### 3.2 排课结果计算时的琴房匹配

在 `scheduleResults` 计算中，系统会根据以下逻辑处理林琳教师的琴房信息：

```typescript
// 对于林琳老师的课程，根据课程类型重新匹配琴房
if (result.teacherName === '林琳') {
  // 根据课程类型匹配琴房
  if (result.courseType === '钢琴') {
    // 匹配影琴221-03
    const pianoRoom = fixedRooms.find(r => r.room?.room_name === '影琴221-03');
    if (pianoRoom) {
      room_id = pianoRoom.room?.id || pianoRoom.id;
      room_name = pianoRoom.room?.room_name || pianoRoom.room_name;
    }
  } else if (result.courseType === '器乐') {
    // 匹配器乐排练室114
    const instrumentalRoom = fixedRooms.find(r => r.room?.room_name === '器乐排练室114');
    if (instrumentalRoom) {
      room_id = instrumentalRoom.room?.id || instrumentalRoom.id;
      room_name = instrumentalRoom.room?.room_name || instrumentalRoom.room_name;
    }
  }
}
```

### 3.3 排课结果渲染时的琴房显示

在渲染排课结果时，系统会根据以下逻辑显示琴房信息：

```typescript
// 林琳教师特殊处理：根据课程类型只显示一个琴房
if (result.teacherName === '林琳' && result.courseType) {
  if (result.courseType === '钢琴') {
    // 匹配影琴221-03
    const pianoRoom = teacher.fixed_rooms.find(fr => {
      const room = rooms.find(r => r.id === fr.room_id || r.room_id === fr.room_id);
      return room?.room_name === '影琴221-03';
    });
    if (pianoRoom) {
      const room = rooms.find(r => r.id === pianoRoom.room_id || r.room_id === pianoRoom.room_id);
      return room?.room_name || pianoRoom.room_id;
    }
  } else if (result.courseType === '器乐') {
    // 匹配器乐排练室114
    const instrumentalRoom = teacher.fixed_rooms.find(fr => {
      const room = rooms.find(r => r.id === fr.room_id || r.room_id === fr.room_id);
      return room?.room_name === '器乐排练室114';
    });
    if (instrumentalRoom) {
      const room = rooms.find(r => r.id === instrumentalRoom.room_id || r.room_id === instrumentalRoom.room_id);
      return room?.room_name || instrumentalRoom.room_id;
    }
  }
}
```

## 4. 数据保存

### 4.1 排课记录保存

在保存排课时，系统会同时保存 `room_id` 和 `room_name` 字段：

```typescript
schedulesToCreate.push({
  // 其他字段...
  room_id: roomId,
  room_name: roomInfo?.room?.room_name,
  // 其他字段...
});
```

### 4.2 琴房信息获取

系统会从 `fixedRooms` 状态中获取教师的固定琴房信息，`fixedRooms` 会在组件初始化时从服务器获取：

```typescript
const roomList: Array<{ room: Room | null; facultyCode: string }> = [];
if (foundTeacher.fixed_rooms && foundTeacher.fixed_rooms.length > 0) {
  for (const fr of foundTeacher.fixed_rooms) {
    const room = allRooms.find(r => r.id === fr.room_id);
    roomList.push({ room: room || null, facultyCode: fr.faculty_code });
  }
}
setFixedRooms(roomList);
```

## 5. 特殊情况处理

### 5.1 课程类型识别

系统会根据课程名称自动识别课程类型：

```typescript
let courseType = '器乐'; // 默认值
if (selectedCourseName) {
  if (selectedCourseName.includes('钢琴')) {
    courseType = '钢琴';
  } else if (selectedCourseName.includes('声乐')) {
    courseType = '声乐';
  } else if (selectedCourseName.includes('器乐')) {
    courseType = '器乐';
  } else if (selectedCourseName.includes('中国器乐')) {
    courseType = '器乐';
  }
}
```

### 5.2 教师识别

系统通过教师工号识别林琳教师：

```typescript
const teacherNumber = effectiveTeacher.id;
const isLinLinTeacher = teacherNumber === '120170194';
```

## 6. 修复历史

### 6.1 修复时间：2026-02-26

### 6.2 修复问题：
- 林琳教师排课保存后出现两个琴房的问题

### 6.3 修复方案：
1. 在保存排课时添加 `room_name` 字段的保存
2. 优化排课结果渲染逻辑，确保只显示一个琴房
3. 为林琳教师添加特殊处理，根据课程类型匹配正确的琴房

## 7. 代码位置

- **保存排课逻辑**：`src/pages/ArrangeClass.tsx` 中的 `handleSaveSchedule` 函数
- **排课结果计算**：`src/pages/ArrangeClass.tsx` 中的 `scheduleResults` useMemo
- **排课结果渲染**：`src/pages/ArrangeClass.tsx` 中的 `renderScheduleResults` 函数

## 8. 注意事项

1. 当修改林琳教师的琴房配置时，需要同时更新代码中的琴房名称
2. 如果林琳教师开始教授其他类型的课程，需要在代码中添加相应的琴房匹配逻辑
3. 当添加新的教师需要类似的琴房匹配逻辑时，可以参考本文档的实现方式