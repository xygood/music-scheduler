from flask import request, jsonify
from models.database import get_db
from models.course import Course
from . import api_bp
import uuid

@api_bp.route('/courses', methods=['GET'])
def get_courses():
    db = next(get_db())
    try:
        courses = db.query(Course).all()
        return jsonify([c.to_dict() for c in courses])
    finally:
        db.close()

@api_bp.route('/courses/<course_id>', methods=['GET'])
def get_course(course_id):
    db = next(get_db())
    try:
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            return jsonify({'error': 'Course not found'}), 404
        return jsonify(course.to_dict())
    finally:
        db.close()

@api_bp.route('/courses', methods=['POST'])
def create_course():
    db = next(get_db())
    try:
        data = request.get_json()
        course = Course(
            id=str(uuid.uuid4()),
            course_id=data.get('course_id'),
            course_name=data.get('course_name'),
            course_type=data.get('course_type'),
            faculty_id=data.get('faculty_id'),
            teacher_id=data.get('teacher_id'),
            teacher_name=data.get('teacher_name'),
            student_id=data.get('student_id'),
            student_name=data.get('student_name'),
            major_class=data.get('major_class'),
            academic_year=data.get('academic_year'),
            semester=data.get('semester'),
            semester_label=data.get('semester_label'),
            course_category=data.get('course_category', 'general'),
            primary_instrument=data.get('primary_instrument'),
            secondary_instrument=data.get('secondary_instrument'),
            duration=data.get('duration', 30),
            week_frequency=data.get('week_frequency', 1),
            credit=data.get('credit', 1),
            required_hours=data.get('required_hours', 16),
            group_size=data.get('group_size', 1),
            student_count=data.get('student_count', 1),
            teaching_type=data.get('teaching_type')
        )
        db.add(course)
        db.commit()
        return jsonify(course.to_dict()), 201
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        db.close()

@api_bp.route('/courses/<course_id>', methods=['PUT'])
def update_course(course_id):
    db = next(get_db())
    try:
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            return jsonify({'error': 'Course not found'}), 404
        
        data = request.get_json()
        for key, value in data.items():
            if hasattr(course, key) and key not in ['id', 'created_at']:
                setattr(course, key, value)
        
        db.commit()
        return jsonify(course.to_dict())
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        db.close()

@api_bp.route('/courses/<course_id>', methods=['DELETE'])
def delete_course(course_id):
    db = next(get_db())
    try:
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            return jsonify({'error': 'Course not found'}), 404
        
        db.delete(course)
        db.commit()
        return jsonify({'message': 'Course deleted successfully'})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        db.close()
