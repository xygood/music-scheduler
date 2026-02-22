from sqlalchemy import Column, String, Text, DateTime, Boolean, Integer, JSON
from sqlalchemy.sql import func
from .database import Base
import uuid

class Student(Base):
    __tablename__ = 'students'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String(50), unique=True, nullable=False, comment='学号')
    name = Column(String(100), nullable=False, comment='姓名')
    teacher_id = Column(String(50), comment='关联教师工号')
    major_class = Column(String(100), comment='专业班级')
    grade = Column(Integer, comment='年级')
    student_type = Column(String(20), default='general', comment='学生类型')
    primary_instrument = Column(String(100), comment='主项')
    secondary_instruments = Column(JSON, comment='副项列表')
    faculty_code = Column(String(50))
    enrollment_year = Column(Integer, comment='入学年份')
    current_grade = Column(Integer, comment='当前年级')
    student_status = Column(String(20), default='active', comment='学生状态')
    status = Column(String(20), default='active')
    remarks = Column(Text)
    assigned_teachers = Column(JSON, comment='分配的教师信息')
    secondary1_teacher_id = Column(String(50), comment='副项1教师ID')
    secondary1_teacher_name = Column(String(100), comment='副项1教师姓名')
    secondary2_teacher_id = Column(String(50), comment='副项2教师ID')
    secondary2_teacher_name = Column(String(100), comment='副项2教师姓名')
    secondary3_teacher_id = Column(String(50), comment='副项3教师ID')
    secondary3_teacher_name = Column(String(100), comment='副项3教师姓名')
    secondary_instrument1 = Column(String(100), comment='副项1专业')
    secondary_instrument2 = Column(String(100), comment='副项2专业')
    secondary_instrument3 = Column(String(100), comment='副项3专业')
    notes = Column(Text, comment='备注')
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'name': self.name,
            'teacher_id': self.teacher_id,
            'major_class': self.major_class,
            'grade': self.grade,
            'student_type': self.student_type,
            'primary_instrument': self.primary_instrument,
            'secondary_instruments': self.secondary_instruments or [],
            'faculty_code': self.faculty_code,
            'enrollment_year': self.enrollment_year,
            'current_grade': self.current_grade,
            'student_status': self.student_status,
            'status': self.status,
            'remarks': self.remarks,
            'assigned_teachers': self.assigned_teachers,
            'secondary1_teacher_id': self.secondary1_teacher_id,
            'secondary1_teacher_name': self.secondary1_teacher_name,
            'secondary2_teacher_id': self.secondary2_teacher_id,
            'secondary2_teacher_name': self.secondary2_teacher_name,
            'secondary3_teacher_id': self.secondary3_teacher_id,
            'secondary3_teacher_name': self.secondary3_teacher_name,
            'secondary_instrument1': self.secondary_instrument1,
            'secondary_instrument2': self.secondary_instrument2,
            'secondary_instrument3': self.secondary_instrument3,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
