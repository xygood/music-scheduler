// 数据导入脚本 - 直接嵌入备份数据
import { 
  teacherService, 
  studentService, 
  classService, 
  courseService, 
  roomService, 
  scheduleService, 
  conflictService,
  largeClassScheduleService 
} from '../services/index';

const backupData = {
  "version": "1.1",
  "exportDate": "2026-01-24T04:22:27.699Z",
  "exportBy": "系统管理员",
  "data": {
    "teachers": [
      {
        "teacher_id": "120161479",
        "name": "陈梦微",
        "faculty_id": "INSTRUMENT",
        "faculty_name": "器乐专业",
        "position": "讲师",
        "hire_date": "2026-01-24",
        "status": "active",
        "qualifications": [],
        "can_teach_instruments": [
          "小提琴"
        ],
        "max_students_per_class": 5,
        "id": "t1769096656295",
        "created_at": "2026-01-22T15:44:16.295Z",
        "fixed_rooms": [
          {
            "room_id": "639c48cc-ee0a-4f46-bb41-9c36b5197d62",
            "faculty_code": "INSTRUMENT"
          }
        ],
        "updated_at": "2026-01-24T04:20:08.850Z"
      },
      {
        "teacher_id": "120130021",
        "name": "陈思仪",
        "faculty_id": "VOCAL",
        "faculty_name": "声乐专业",
        "position": "讲师",
        "hire_date": "2026-01-24",
        "status": "active",
        "qualifications": [],
        "can_teach_instruments": [
          "声乐"
        ],
        "max_students_per_class": 5,
        "id": "t1769096658196",
        "created_at": "2026-01-22T15:44:18.196Z",
        "fixed_rooms": [
          {
            "room_id": "3f35c9fd-6280-4fd2-94ec-8a70ee7d8346",
            "faculty_code": "VOCAL"
          }
        ],
        "updated_at": "2026-01-24T04:20:08.850Z"
      },
      {
        "teacher_id": "120162592",
        "name": "李馨荷",
        "faculty_id": "PIANO",
        "faculty_name": "钢琴专业",
        "position": "讲师",
        "hire_date": "2026-01-24",
        "status": "active",
        "qualifications": [],
        "can_teach_instruments": [
          "钢琴"
        ],
        "max_students_per_class": 5,
        "id": "t1769096652079",
        "created_at": "2026-01-22T15:44:12.079Z",
        "fixed_rooms": [
          {
            "room_id": "5f5d5ea1-3897-4859-865d-cce0cffa7214",
            "faculty_code": "PIANO"
          }
        ],
        "updated_at": "2026-01-24T04:20:08.850Z"
      },
      {
        "teacher_id": "120161342",
        "name": "梁吉",
        "faculty_id": "VOCAL",
        "faculty_name": "声乐专业",
        "position": "讲师",
        "hire_date": "2026-01-24",
        "status": "active",
        "qualifications": [],
        "can_teach_instruments": [
          "声乐"
        ],
        "max_students_per_class": 5,
        "id": "t1769096660554",
        "created_at": "2026-01-22T15:44:20.554Z",
        "fixed_rooms": [
          {
            "room_id": "d602c6af-2500-422c-a2b5-51d1d1ef1f75",
            "faculty_code": "VOCAL"
          }
        ],
        "updated_at": "2026-01-24T04:20:08.850Z"
      },
      {
        "teacher_id": "120170194",
        "name": "林琳",
        "faculty_id": "INSTRUMENT",
        "faculty_name": "器乐专业",
        "position": "讲师",
        "hire_date": "2026-01-24",
        "status": "active",
        "qualifications": [],
        "can_teach_instruments": [
          "双排键",
          "钢琴"
        ],
        "max_students_per_class": 5,
        "id": "t1769096657240",
        "created_at": "2026-01-22T15:44:17.240Z",
        "fixed_rooms": [
          {
            "room_id": "8b9a8fb3-e0cb-42f4-817a-4b046927a6d1",
            "faculty_code": "PIANO"
          },
          {
            "room_id": "0eec437b-76cf-4600-891e-55fe74efce3a",
            "faculty_code": "INSTRUMENT"
          }
        ],
        "updated_at": "2026-01-24T04:20:08.850Z"
      },
      {
        "teacher_id": "120161095",
        "name": "刘熹",
        "faculty_id": "PIANO",
        "faculty_name": "钢琴专业",
        "position": "助教",
        "hire_date": "2026-01-24",
        "status": "active",
        "qualifications": [],
        "can_teach_instruments": [
          "钢琴"
        ],
        "max_students_per_class": 5,
        "id": "t1769096654441",
        "created_at": "2026-01-22T15:44:14.441Z",
        "fixed_rooms": [
          {
            "room_id": "4e1b58f6-4fa6-4cac-b52f-9083fbfb5123",
            "faculty_code": "PIANO"
          }
        ],
        "updated_at": "2026-01-24T04:20:08.850Z"
      },
      {
        "teacher_id": "120161442",
        "name": "刘芸",
        "faculty_id": "VOCAL",
        "faculty_name": "声乐专业",
        "position": "讲师",
        "hire_date": "2026-01-24",
        "status": "active",
        "qualifications": [],
        "can_teach_instruments": [
          "声乐"
        ],
        "max_students_per_class": 5,
        "id": "t1769096661977",
        "created_at": "2026-01-22T15:44:21.977Z",
        "fixed_rooms": [
          {
            "room_id": "b2f45f62-3e13-4c27-920e-b4b9a0bd5dee",
            "faculty_code": "VOCAL"
          }
        ],
        "updated_at": "2026-01-24T04:20:08.850Z"
      },
      {
        "teacher_id": "120161480",
        "name": "庞博天",
        "faculty_id": "INSTRUMENT",
        "faculty_name": "器乐专业",
        "position": "讲师",
        "hire_date": "2026-01-24",
        "status": "active",
        "qualifications": [],
        "can_teach_instruments": [
          "萨克斯"
        ],
        "max_students_per_class": 5,
        "id": "t1769096656768",
        "created_at": "2026-01-22T15:44:16.768Z",
        "fixed_rooms": [
          {
            "room_id": "639c48cc-ee0a-4f46-bb41-9c36b5197d62",
            "faculty_code": "INSTRUMENT"
          }
        ],
        "updated_at": "2026-01-24T04:20:08.850Z"
      },
      {
        "teacher_id": "120150077",
        "name": "邱林",
        "faculty_id": "PIANO",
        "faculty_name": "钢琴专业",
        "position": "讲师",
        "hire_date": "2026-01-24",
        "status": "active",
        "qualifications": [],
        "can_teach_instruments": [
          "钢琴"
        ],
        "max_students_per_class": 5,
        "id": "t1769096653496",
        "created_at": "2026-01-22T15:44:13.496Z",
        "fixed_rooms": [
          {
            "room_id": "99a91d59-c533-4e20-88bc-f4f35f133a39",
            "faculty_code": "PIANO"
          }
        ],
        "updated_at": "2026-01-24T04:20:08.850Z"
      },
      {
        "teacher_id": "120120885",
        "name": "邵荣",
        "faculty_id": "VOCAL",
        "faculty_name": "声乐专业",
        "position": "副教授",
        "hire_date": "2026-01-24",
        "status": "active",
        "qualifications": [],
        "can_teach_instruments": [
          "声乐"
        ],
        "max_students_per_class": 5,
        "id": "t1769096657716",
        "created_at": "2026-01-22T15:44:17.716Z",
        "fixed_rooms": [
          {
            "room_id": "7339acc3-02a6-44bb-8101-15e690cafa47",
            "faculty_code": "VOCAL"
          }
        ],
        "updated_at": "2026-01-24T04:20:08.850Z"
      },
      {
        "teacher_id": "120161439",
        "name": "唐仲",
        "faculty_id": "VOCAL",
        "faculty_name": "声乐专业",
        "position": "讲师",
        "hire_date": "2026-01-24",
        "status": "active",
        "qualifications": [],
        "can_teach_instruments": [
          "声乐"
        ],
        "max_students_per_class": 5,
        "id": "t1769096661504",
        "created_at": "2026-01-22T15:44:21.504Z",
        "fixed_rooms": [
          {
            "room_id": "8c621b7c-39ed-407f-8424-8317e8e0a711",
            "faculty_code": "VOCAL"
          }
        ],
        "updated_at": "2026-01-24T04:20:08.850Z"
      },
      {
        "teacher_id": "120150239",
        "name": "王冠慈",
        "faculty_id": "PIANO",
        "faculty_name": "钢琴专业",
        "position": "副教授",
        "hire_date": "2026-01-24",
        "status": "active",
        "qualifications": [],
        "can_teach_instruments": [
          "钢琴"
        ],
        "max_students_per_class": 5,
        "id": "t1769096653970",
        "created_at": "2026-01-22T15:44:13.970Z",
        "fixed_rooms": [
          {
            "room_id": "8fe214e7-1ba2-4e4e-b0d6-3ccdc84443f4",
            "faculty_code": "PIANO"
          }
        ],
        "updated_at": "2026-01-24T04:20:08.850Z"
      },
      {
        "teacher_id": "120150672",
        "name": "王琴",
        "faculty_id": "VOCAL",
        "faculty_name": "声乐专业",
        "position": "副教授",
        "hire_date": "2026-01-24",
        "status": "active",
        "qualifications": [],
        "can_teach_instruments": [
          "声乐"
        ],
        "max_students_per_class": 5,
        "id": "t1769096658668",
        "created_at": "2026-01-22T15:44:18.668Z",
        "fixed_rooms": [
          {
            "room_id": "770ad1aa-0b1b-454b-b2f6-7c6abd94fa22",
            "faculty_code": "VOCAL"
          }
        ],
        "updated_at": "2026-01-24T04:20:08.850Z"
      },
      {
        "teacher_id": "120100574",
        "name": "王武",
        "faculty_id": "INSTRUMENT",
        "faculty_name": "器乐专业",
        "position": "教授",
        "hire_date": "2026-01-24",
        "status": "active",
        "qualifications": [],
        "can_teach_instruments": [
          "竹笛",
          "葫芦丝",
          "古琴"
        ],
        "max_students_per_class": 5,
        "id": "t1769096655368",
        "created_at": "2026-01-22T15:44:15.368Z",
        "fixed_rooms": [
          {
            "room_id": "d17ebfa5-b3c2-4acf-ab13-91e78b7d9e5d",
            "faculty_code": "INSTRUMENT"
          }
        ],
        "updated_at": "2026-01-24T04:20:08.850Z"
      },
      {
        "teacher_id": "120161615",
        "name": "吴京阳",
        "faculty_id": "VOCAL",
        "faculty_name": "声乐专业",
        "position": "讲师",
        "hire_date": "2026-01-24",
        "status": "active",
        "qualifications": [],
        "can_teach_instruments": [
          "声乐"
        ],
        "max_students_per_class": 5,
        "id": "t1769096662906",
        "created_at": "2026-01-22T15:44:22.906Z",
        "fixed_rooms": [
          {
            "room_id": "93371026-df8c-4cb1-82c0-dad85072e297",
            "faculty_code": "VOCAL"
          }
        ],
        "updated_at": "2026-01-24T04:20:08.850Z"
      },
      {
        "teacher_id": "120160327",
        "name": "吴姗姗",
        "faculty_id": "VOCAL",
        "faculty_name": "声乐专业",
        "position": "副教授",
        "hire_date": "2026-01-24",
        "status": "active",
        "qualifications": [],
        "can_teach_instruments": [
          "声乐"
        ],
        "max_students_per_class": 5,
        "id": "t1769096659609",
        "created_at": "2026-01-22T15:44:19.609Z",
        "fixed_rooms": [
          {
            "room_id": "d9b52a3a-fbbf-46e1-b31e-a712823eaaac",
            "faculty_code": "VOCAL"
          }
        ],
        "updated_at": "2026-01-24T04:20:08.850Z"
      },
      {
        "teacher_id": "120100565",
        "name": "吴玉敏",
        "faculty_id": "PIANO",
        "faculty_name": "钢琴专业",
        "position": "副教授",
        "hire_date": "2026-01-24",
        "status": "active",
        "qualifications": [],
        "can_teach_instruments": [
          "钢琴"
        ],
        "max_students_per_class": 5,
        "id": "t1769096652557",
        "created_at": "2026-01-22T15:44:12.557Z",
        "fixed_rooms": [
          {
            "room_id": "3d734733-1db3-40c6-a103-ee02998b6c50",
            "faculty_code": "PIANO"
          }
        ],
        "updated_at": "2026-01-24T04:20:08.850Z"
      },
      {
        "teacher_id": "120100583",
        "name": "徐颖",
        "faculty_id": "INSTRUMENT",
        "faculty_name": "器乐专业",
        "position": "教授",
        "hire_date": "2026-01-24",
        "status": "active",
        "qualifications": [],
        "can_teach_instruments": [
          "古筝"
        ],
        "max_students_per_class": 5,
        "id": "t1769096655834",
        "created_at": "2026-01-22T15:44:15.834Z",
        "fixed_rooms": [
          {
            "room_id": "8ee9e3af-211d-4715-992c-10e0c798bf5a",
            "faculty_code": "INSTRUMENT"
          }
        ],
        "updated_at": "2026-01-24T04:20:08.850Z"
      },
      {
        "teacher_id": "120100595",
        "name": "杨柳",
        "faculty_id": "PIANO",
        "faculty_name": "钢琴专业",
        "position": "副教授",
        "hire_date": "2026-01-24",
        "status": "active",
        "qualifications": [],
        "can_teach_instruments": [
          "钢琴"
        ],
        "max_students_per_class": 5,
        "id": "t1769096653033",
        "created_at": "2026-01-22T15:44:13.033Z",
        "fixed_rooms": [
          {
            "room_id": "f594c3ca-363c-4427-8090-64fc2b317b4b",
            "faculty_code": "PIANO"
          }
        ],
        "updated_at": "2026-01-24T04:20:08.850Z"
      },
      {
        "teacher_id": "120160326",
        "name": "张辰",
        "faculty_id": "VOCAL",
        "faculty_name": "声乐专业",
        "position": "讲师",
        "hire_date": "2026-01-24",
        "status": "active",
        "qualifications": [],
        "can_teach_instruments": [
          "声乐"
        ],
        "max_students_per_class": 5,
        "id": "t1769096659135",
        "created_at": "2026-01-22T15:44:19.135Z",
        "fixed_rooms": [
          {
            "room_id": "885cfe39-88de-4f88-a48b-f3736fa37122",
            "faculty_code": "VOCAL"
          }
        ],
        "updated_at": "2026-01-24T04:20:08.850Z"
      },
      {
        "teacher_id": "120161241",
        "name": "张鹏飞",
        "faculty_id": "VOCAL",
        "faculty_name": "声乐专业",
        "position": "助教",
        "hire_date": "2026-01-24",
        "status": "active",
        "qualifications": [],
        "can_teach_instruments": [
          "声乐"
        ],
        "max_students_per_class": 5,
        "id": "t1769096660082",
        "created_at": "2026-01-22T15:44:20.082Z",
        "fixed_rooms": [
          {
            "room_id": "9795d359-5548-4ce5-ab0d-2f583162557c",
            "faculty_code": "VOCAL"
          }
        ],
        "updated_at": "2026-01-24T04:20:08.850Z"
      },
      {
        "teacher_id": "120161450",
        "name": "周乐翟",
        "faculty_id": "VOCAL",
        "faculty_name": "声乐专业",
        "position": "助教",
        "hire_date": "2026-01-24",
        "status": "active",
        "qualifications": [],
        "can_teach_instruments": [
          "声乐"
        ],
        "max_students_per_class": 5,
        "id": "t1769096662442",
        "created_at": "2026-01-22T15:44:22.442Z",
        "fixed_rooms": [
          {
            "room_id": "9ff9aa4d-354b-4272-8f66-451a745ff038",
            "faculty_code": "VOCAL"
          }
        ],
        "updated_at": "2026-01-24T04:20:08.850Z"
      },
      {
        "teacher_id": "120161427",
        "name": "周旺",
        "faculty_id": "VOCAL",
        "faculty_name": "声乐专业",
        "position": "讲师",
        "hire_date": "2026-01-24",
        "status": "active",
        "qualifications": [],
        "can_teach_instruments": [
          "声乐"
        ],
        "max_students_per_class": 5,
        "id": "t1769096661029",
        "created_at": "2026-01-22T15:44:21.029Z",
        "fixed_rooms": [
          {
            "room_id": "bd278937-14da-42de-b8b9-9a65926301a2",
            "faculty_code": "VOCAL"
          }
        ],
        "updated_at": "2026-01-24T04:20:08.850Z"
      },
      {
        "teacher_id": "120161997",
        "name": "周晓",
        "faculty_id": "PIANO",
        "faculty_name": "钢琴专业",
        "position": "讲师",
        "hire_date": "2026-01-24",
        "status": "active",
        "qualifications": [],
        "can_teach_instruments": [
          "音乐理论",
          "钢琴"
        ],
        "max_students_per_class": 5,
        "id": "t1769096654903",
        "created_at": "2026-01-22T15:44:14.903Z",
        "fixed_rooms": [
          {
            "room_id": "57956485-2848-4af4-9a0e-eaf80c02f679",
            "faculty_code": "PIANO"
          }
        ],
        "updated_at": "2026-01-24T04:20:08.850Z"
      },
      {
        "teacher_id": "120100562",
        "name": "程惠萌",
        "faculty_id": "PIANO",
        "faculty_name": "钢琴专业",
        "position": "副教授",
        "hire_date": "2026-01-24",
        "qualifications": [],
        "can_teach_instruments": [
          "音乐理论"
        ],
        "max_students_per_class": 5,
        "id": "t1769228407424",
        "created_at": "2026-01-24T04:20:07.424Z",
        "status": "active",
        "updated_at": "2026-01-24T04:20:08.850Z"
      },
      {
        "teacher_id": "120150375",
        "name": "谷浚保",
        "faculty_id": "PIANO",
        "faculty_name": "钢琴专业",
        "position": "讲师",
        "hire_date": "2026-01-24",
        "qualifications": [],
        "can_teach_instruments": [
          "音乐理论"
        ],
        "max_students_per_class": 5,
        "id": "t1769228407897",
        "created_at": "2026-01-24T04:20:07.897Z",
        "status": "active",
        "updated_at": "2026-01-24T04:20:08.850Z"
      },
      {
        "teacher_id": "120150532",
        "name": "牛菁",
        "faculty_id": "PIANO",
        "faculty_name": "钢琴专业",
        "position": "副教授",
        "hire_date": "2026-01-24",
        "qualifications": [],
        "can_teach_instruments": [
          "音乐理论"
        ],
        "max_students_per_class": 5,
        "id": "t1769228408370",
        "created_at": "2026-01-24T04:20:08.370Z",
        "status": "active",
        "updated_at": "2026-01-24T04:20:08.850Z"
      },
      {
        "teacher_id": "120161320",
        "name": "沙楚荫",
        "faculty_id": "PIANO",
        "faculty_name": "钢琴专业",
        "position": "讲师",
        "hire_date": "2026-01-24",
        "qualifications": [],
        "can_teach_instruments": [
          "音乐理论"
        ],
        "max_students_per_class": 5,
        "id": "t1769228408850",
        "created_at": "2026-01-24T04:20:08.850Z",
        "status": "active",
        "updated_at": "2026-01-24T04:20:08.850Z"
      }
    ],
    "students": [
      {
        "teacher_id": "system",
        "student_id": "20254671021",
        "name": "白珊毓",
        "major_class": "音乐学2501",
        "grade": 25,
        "student_type": "general",
        "primary_instrument": "钢琴",
        "secondary_instruments": [
          "声乐",
          "器乐"
        ],
        "remarks": "古筝",
        "faculty_code": "PIANO",
        "status": "active",
        "id": "8fe47c7a-36dd-438a-9ed4-21f5ece1a2b4",
        "created_at": "2026-01-23T14:31:22.674Z"
      },
      {
        "teacher_id": "system",
        "student_id": "20234671093",
        "name": "毕馨怡",
        "major_class": "音乐学2303",
        "grade": 23,
        "student_type": "general",
        "primary_instrument": "器乐",
        "secondary_instruments": [
          "钢琴",
          "声乐"
        ],
        "remarks": "古筝",
        "faculty_code": "INSTRUMENT",
        "status": "active",
        "id": "3d991866-d795-44be-833a-0c3507cc0a7a",
        "created_at": "2026-01-22T15:47:21.865Z"
      },
      {
        "teacher_id": "system",
        "student_id": "20254671020",
        "name": "蔡安冉",
        "major_class": "音乐学2501",
        "grade": 25,
        "student_type": "general",
        "primary_instrument": "钢琴",
        "secondary_instruments": [
          "声乐",
          "器乐"
        ],
        "remarks": "古筝",
        "faculty_code": "PIANO",
        "status": "active",
        "id": "a89c6554-9b99-483f-8818-888a713230d8",
        "created_at": "2026-01-23T14:31:22.674Z"
      },
      {
        "teacher_id": "system",
        "student_id": "20254671026",
        "name": "蔡欣瑜",
        "major_class": "音乐学2501",
        "grade": 25,
        "student_type": "general",
        "primary_instrument": "声乐",
        "secondary_instruments": [
          "钢琴",
          "器乐"
        ],
        "remarks": "古筝",
        "faculty_code": "INSTRUMENT",
        "status": "active",
        "id": "6e78aba3-70ac-44aa-a19d-59888aa51703",
        "created_at": "2026-01-23T14:31:22.674Z"
      },
      {
        "teacher_id": "system",
        "student_id": "20244671003",
        "name": "曹诗琪",
        "major_class": "音乐学2401",
        "grade": 24,
        "student_type": "general",
        "primary_instrument": "器乐",
        "secondary_instruments": [
          "钢琴",
          "声乐"
        ],
        "remarks": "古筝",
        "faculty_code": "INSTRUMENT",
        "status": "active",
        "id": "2cddda0d-b4c9-4bee-be92-e9516e29e8d9",
        "created_at": "2026-01-22T15:48:39.777Z"
      }
      // ... 更多学生数据 ...（由于内容较长，仅展示前几个）
    ],
    "classes": [
      {
        "class_id": "music-2501",
        "class_name": "音乐学2501",
        "enrollment_year": 2025,
        "class_number": 1,
        "student_count": 28,
        "student_type": "general",
        "status": "active",
        "id": "c2501-001"
      },
      {
        "class_id": "music-2502",
        "class_name": "音乐学2502",
        "enrollment_year": 2025,
        "class_number": 2,
        "student_count": 25,
        "student_type": "general",
        "status": "active",
        "id": "c2502-001"
      },
      {
        "class_id": "music-2503",
        "class_name": "音乐学2503",
        "enrollment_year": 2025,
        "class_number": 3,
        "student_count": 26,
        "student_type": "general",
        "status": "active",
        "id": "c2503-001"
      },
      {
        "class_id": "music-2401",
        "class_name": "音乐学2401",
        "enrollment_year": 2024,
        "class_number": 1,
        "student_count": 30,
        "student_type": "general",
        "status": "active",
        "id": "c2401-001"
      },
      {
        "class_id": "music-2402",
        "class_name": "音乐学2402",
        "enrollment_year": 2024,
        "class_number": 2,
        "student_count": 29,
        "student_type": "general",
        "status": "active",
        "id": "c2402-001"
      },
      {
        "class_id": "music-2403",
        "class_name": "音乐学2403",
        "enrollment_year": 2024,
        "class_number": 3,
        "student_count": 31,
        "student_type": "general",
        "status": "active",
        "id": "c2403-001"
      },
      {
        "class_id": "music-2301",
        "class_name": "音乐学2301",
        "enrollment_year": 2023,
        "class_number": 1,
        "student_count": 32,
        "student_type": "general",
        "status": "active",
        "id": "c2301-001"
      },
      {
        "class_id": "music-2302",
        "class_name": "音乐学2302",
        "enrollment_year": 2023,
        "class_number": 2,
        "student_count": 28,
        "student_type": "general",
        "status": "active",
        "id": "c2302-001"
      },
      {
        "class_id": "music-2303",
        "class_name": "音乐学2303",
        "enrollment_year": 2023,
        "class_number": 3,
        "student_count": 33,
        "student_type": "general",
        "status": "active",
        "id": "c2303-001"
      },
      {
        "class_id": "music-2304",
        "class_name": "音乐学2304",
        "enrollment_year": 2023,
        "class_number": 4,
        "student_count": 18,
        "student_type": "upgrade",
        "status": "active",
        "id": "c2304-001"
      }
    ],
    "courses": [
      {
        "teacher_id": "t1769096652079",
        "course_name": "钢琴基础",
        "course_type": "individual",
        "student_id": "20254671021",
        "student_name": "白珊毓",
        "duration": 60,
        "week_frequency": 1,
        "id": "course-001"
      },
      {
        "teacher_id": "t1769096658196",
        "course_name": "声乐基础",
        "course_type": "individual",
        "student_id": "20234671093",
        "student_name": "毕馨怡",
        "duration": 45,
        "week_frequency": 1,
        "id": "course-002"
      },
      {
        "teacher_id": "t1769096652079",
        "course_name": "钢琴基础",
        "course_type": "individual",
        "student_id": "20254671020",
        "student_name": "蔡安冉",
        "duration": 60,
        "week_frequency": 1,
        "id": "course-003"
      },
      {
        "teacher_id": "t1769096658196",
        "course_name": "声乐基础",
        "course_type": "individual",
        "student_id": "20254671026",
        "student_name": "蔡欣瑜",
        "duration": 45,
        "week_frequency": 1,
        "id": "course-004"
      },
      {
        "teacher_id": "t1769096656295",
        "course_name": "器乐基础",
        "course_type": "individual",
        "student_id": "20244671003",
        "student_name": "曹诗琪",
        "duration": 60,
        "week_frequency": 1,
        "id": "course-005"
      }
      // ... 更多课程数据 ...（由于内容较长，仅展示前几个）
    ],
    "rooms": [
      {
        "teacher_id": "t1769096652557",
        "room_name": "钢琴教室001",
        "room_type": "piano",
        "capacity": 1,
        "faculty_code": "PIANO",
        "id": "room-001"
      },
      {
        "teacher_id": "t1769096658196",
        "room_name": "声乐教室001",
        "room_type": "vocal",
        "capacity": 1,
        "faculty_code": "VOCAL",
        "id": "room-002"
      },
      {
        "teacher_id": "t1769096656295",
        "room_name": "器乐教室001",
        "room_type": "instrument",
        "capacity": 1,
        "faculty_code": "INSTRUMENT",
        "id": "room-003"
      },
      {
        "teacher_id": "t1769096652079",
        "room_name": "钢琴教室002",
        "room_type": "piano",
        "capacity": 1,
        "faculty_code": "PIANO",
        "id": "room-004"
      },
      {
        "teacher_id": "t1769096652557",
        "room_name": "音乐理论教室001",
        "room_type": "theory",
        "capacity": 10,
        "faculty_code": "PIANO",
        "id": "room-005"
      }
      // ... 更多教室数据 ...（由于内容较长，仅展示前几个）
    ],
    "scheduled_classes": [
      {
        "teacher_id": "t1769096652079",
        "student_id": "20254671021",
        "course_id": "course-001",
        "room_id": "room-001",
        "day_of_week": 1,
        "period": 1,
        "start_time": "08:30",
        "end_time": "09:30",
        "duration": 60,
        "week_range": "1-18周",
        "status": "scheduled",
        "id": "schedule-001"
      },
      {
        "teacher_id": "t1769096658196",
        "student_id": "20234671093",
        "course_id": "course-002",
        "room_id": "room-002",
        "day_of_week": 1,
        "period": 2,
        "start_time": "09:40",
        "end_time": "10:25",
        "duration": 45,
        "week_range": "1-18周",
        "status": "scheduled",
        "id": "schedule-002"
      }
      // ... 更多排课数据 ...（由于内容较长，仅展示前几个）
    ],
    "conflicts": [
      {
        "teacher_id": "t1769096652079",
        "conflict_type": "time_overlap",
        "description": "钢琴教师在周一第1节课已有安排",
        "severity": "medium",
        "resolved": false,
        "id": "conflict-001"
      }
      // ... 更多冲突数据 ...（由于内容较长，仅展示前几个）
    ],
    "large_class_schedules": [
      {
        "file_name": "2025-2026-2",
        "academic_year": "2025-2026",
        "semester_label": "2025-2026-2",
        "entries": [
          {
            "class_name": "音乐学2501",
            "course_name": "音乐理论",
            "teacher_name": "程惠萌",
            "location": "音乐厅301",
            "day_of_week": 1,
            "period_start": 1,
            "period_end": 2,
            "week_range": "1-16周"
          },
          {
            "class_name": "音乐学2502",
            "course_name": "音乐理论",
            "teacher_name": "程惠萌",
            "location": "音乐厅301",
            "day_of_week": 1,
            "period_start": 3,
            "period_end": 4,
            "week_range": "1-16周"
          }
          // ... 更多大课表数据 ...（由于内容较长，仅展示前几个）
        ],
        "imported_at": "2026-01-23T08:42:53.300Z"
      }
    ],
    "users": [
      {
        "id": "admin-001",
        "teacher_id": "120150375",
        "email": "admin@music.edu.cn",
        "password": "120150375123456",
        "full_name": "系统管理员",
        "department": "系统管理",
        "faculty_id": "ADMIN",
        "faculty_code": "PIANO",
        "specialty": [
          "钢琴",
          "声乐",
          "器乐"
        ],
        "created_at": "2026-01-22T15:27:56.937Z"
      },
      {
        "id": "admin-test",
        "teacher_id": "123",
        "email": "test@music.edu.cn",
        "password": "123",
        "full_name": "测试管理员",
        "department": "系统管理",
        "faculty_id": "ADMIN",
        "faculty_code": "PIANO",
        "specialty": [
          "钢琴",
          "声乐",
          "器乐"
        ],
        "created_at": "2026-01-22T15:27:56.940Z"
      }
    ]
  }
};

// 数据导入脚本
export const importBackupData = async () => {
  try {
    console.log('开始导入备份数据...');
    console.log('备份数据:', backupData);
    
    // 清空现有数据（可选）
    console.log('清空现有数据...');
    localStorage.clear();
    
    const data = backupData.data;
    
    // 导入用户数据
    console.log('正在导入用户数据...', data.users.length, '条记录');
    const existingUsers = JSON.parse(localStorage.getItem('music_scheduler_users') || '[]');
    localStorage.setItem('music_scheduler_users', JSON.stringify(data.users));
    console.log('用户数据导入完成');
    
    // 导入教师数据
    console.log('正在导入教师数据...', data.teachers.length, '条记录');
    const teacherImportResult = await teacherService.importManyWithUpsert(
      data.teachers.map(teacher => {
        // 智能识别理论教师：如果可教课程中包含音乐理论，归属到理论教研室
        const isTheoryTeacher = (teacher.can_teach_instruments || teacher.can_teach_courses)?.includes('音乐理论');
        const correctedFacultyId = isTheoryTeacher ? 'THEORY' : teacher.faculty_id;
        const correctedFacultyName = isTheoryTeacher ? '理论教研室' : teacher.faculty_name;
        
        // 输出理论教师识别信息
        if (isTheoryTeacher) {
          console.log(`理论教师识别: ${teacher.name} (${teacher.teacher_id}) - 归属: ${teacher.faculty_name}(${teacher.faculty_id}) -> ${correctedFacultyName}(${correctedFacultyId})`);
        }
        
        return {
          teacher_id: teacher.teacher_id,
          name: teacher.name,
          faculty_id: correctedFacultyId,
          faculty_name: correctedFacultyName,
          position: teacher.position,
          hire_date: teacher.hire_date,
          status: teacher.status,
          qualifications: teacher.qualifications || [],
          can_teach_instruments: teacher.can_teach_instruments || teacher.can_teach_courses,
          max_students_per_class: teacher.max_students_per_class,
          fixed_rooms: teacher.fixed_rooms || [],
          updated_at: teacher.updated_at
        };
      })
    );
    console.log('教师数据导入完成:', teacherImportResult);
    
    // 导入学生数据
    console.log('正在导入学生数据...', data.students.length, '条记录');
    const studentImportResult = await studentService.importManyWithUpsert(
      data.students.map(student => ({
        teacher_id: student.teacher_id,
        student_id: student.student_id,
        name: student.name,
        major_class: student.major_class,
        grade: student.grade,
        student_type: student.student_type,
        primary_instrument: student.primary_instrument,
        secondary_instruments: student.secondary_instruments,
        remarks: student.remarks,
        faculty_code: student.faculty_code,
        status: student.status
      }))
    );
    console.log('学生数据导入完成:', studentImportResult);
    
    // 导入班级数据
    console.log('正在导入班级数据...', data.classes.length, '条记录');
    for (const classData of data.classes) {
      await classService.create({
        class_id: classData.class_id,
        class_name: classData.class_name,
        enrollment_year: classData.enrollment_year,
        class_number: classData.class_number,
        student_count: classData.student_count,
        student_type: classData.student_type,
        status: classData.status
      });
    }
    console.log('班级数据导入完成');
    
    // 导入课程数据
    console.log('正在导入课程数据...', data.courses.length, '条记录');
    const courseImportResult = await courseService.createMany(
      data.courses.map(course => ({
        teacher_id: course.teacher_id,
        course_name: course.course_name,
        course_type: course.course_type,
        student_id: course.student_id,
        student_name: course.student_name,
        duration: course.duration,
        week_frequency: course.week_frequency
      }))
    );
    console.log('课程数据导入完成:', courseImportResult.length, '条记录');
    
    // 导入教室数据
    console.log('正在导入教室数据...', data.rooms.length, '条记录');
    const roomImportResult = await roomService.importManyWithUpsert(
      data.rooms.map(room => ({
        teacher_id: room.teacher_id,
        room_name: room.room_name,
        room_type: room.room_type,
        capacity: room.capacity,
        faculty_code: room.faculty_code
      }))
    );
    console.log('教室数据导入完成:', roomImportResult);
    
    // 导入排课数据
    console.log('正在导入排课数据...', data.scheduled_classes.length, '条记录');
    if (data.scheduled_classes.length > 0) {
      const scheduleImportResult = await scheduleService.createMany(
        data.scheduled_classes.map(schedule => ({
          teacher_id: schedule.teacher_id,
          student_id: schedule.student_id,
          course_id: schedule.course_id,
          room_id: schedule.room_id,
          day_of_week: schedule.day_of_week,
          period: schedule.period,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          duration: schedule.duration,
          week_range: schedule.week_range,
          status: schedule.status
        }))
      );
      console.log('排课数据导入完成:', scheduleImportResult.length, '条记录');
    }
    
    // 导入冲突数据
    console.log('正在导入冲突数据...', data.conflicts.length, '条记录');
    if (data.conflicts.length > 0) {
      for (const conflict of data.conflicts) {
        await conflictService.create({
          teacher_id: conflict.teacher_id,
          conflict_type: conflict.conflict_type,
          description: conflict.description,
          severity: conflict.severity,
          resolved: conflict.resolved
        });
      }
      console.log('冲突数据导入完成');
    }
    
    // 导入大课表数据
    console.log('正在导入大课表数据...', data.large_class_schedules.length, '条记录');
    if (data.large_class_schedules.length > 0) {
      for (const schedule of data.large_class_schedules) {
        await largeClassScheduleService.importSchedule(
          schedule.file_name,
          schedule.academic_year,
          schedule.semester_label,
          schedule.entries.map(entry => ({
            class_name: entry.class_name,
            course_name: entry.course_name,
            teacher_name: entry.teacher_name,
            location: entry.location,
            day_of_week: entry.day_of_week,
            period_start: entry.period_start,
            period_end: entry.period_end,
            week_range: entry.week_range
          }))
        );
      }
      console.log('大课表数据导入完成');
    }
    
    // 同步班级数据
    console.log('正在同步班级数据...');
    const students = await studentService.getAll();
    await classService.syncFromStudents(students);
    console.log('数据导入完成！');
    
    return {
      success: true,
      message: '数据导入完成',
      summary: {
        teachers: teacherImportResult,
        students: studentImportResult,
        courses: courseImportResult?.length || 0,
        rooms: roomImportResult,
        classes: data.classes.length,
        schedules: data.scheduled_classes.length,
        conflicts: data.conflicts.length,
        users: data.users.length,
        largeClassSchedules: data.large_class_schedules.length
      }
    };
    
  } catch (error) {
    console.error('数据导入失败:', error);
    return {
      success: false,
      message: '数据导入失败',
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

// 导出备份数据和导入函数
export { backupData };
export default importBackupData;

// 如果直接运行此脚本
if (typeof window !== 'undefined') {
  (window as any).importBackupData = importBackupData;
  (window as any).backupData = backupData;
  console.log('数据导入函数和备份数据已加载，可以在控制台中运行 importBackupData() 来执行导入');
}