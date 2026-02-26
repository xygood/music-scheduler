from sqlalchemy import Column, String, Text, DateTime, Integer, JSON
from sqlalchemy.sql import func
from .database import Base
import uuid

class Course(Base):
    __tablename__ = 'courses'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    course_id = Column(String(50), comment='课程编号')
    course_name = Column(String(200), nullable=False, comment='课程名称')
    course_type = Column(String(50), nullable=False, comment='课程类型')
    faculty_id = Column(String(50))
    teacher_id = Column(String(50), comment='教师工号')
    teacher_name = Column(String(100))
    student_id = Column(String(50))
    student_name = Column(String(100))
    major_class = Column(String(100), comment='专业班级')
    academic_year = Column(String(20), comment='学年')
    semester = Column(Integer, comment='学期序号')
    semester_label = Column(String(20), comment='学期标签')
    course_category = Column(String(20), default='general', comment='课程类别')
    primary_instrument = Column(String(100))
    secondary_instrument = Column(String(100))
    duration = Column(Integer, default=30, comment='时长(分钟)')
    week_frequency = Column(Integer, default=1, comment='周频次')
    credit = Column(Integer, default=1, comment='学分')
    required_hours = Column(Integer, default=16, comment='所需课时')
    group_size = Column(Integer, default=1, comment='小组人数')
    student_count = Column(Integer, default=1, comment='学生数量')
    teaching_type = Column(String(50), comment='授课类型')
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    def to_dict(self):
        return {
            'id': self.id,
            'course_id': self.course_id,
            'course_name': self.course_name,
            'course_type': self.course_type,
            'faculty_id': self.faculty_id,
            'teacher_id': self.teacher_id,
            'teacher_name': self.teacher_name,
            'student_id': self.student_id,
            'student_name': self.student_name,
            'major_class': self.major_class,
            'academic_year': self.academic_year,
            'semester': self.semester,
            'semester_label': self.semester_label,
            'course_category': self.course_category,
            'primary_instrument': self.primary_instrument,
            'secondary_instrument': self.secondary_instrument,
            'duration': self.duration,
            'week_frequency': self.week_frequency,
            'credit': self.credit,
            'required_hours': self.required_hours,
            'group_size': self.group_size,
            'student_count': self.student_count,
            'teaching_type': self.teaching_type,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
