"""
API包
提供教研室管理、教师资格、排课等REST API接口
"""

from .faculty_api import (
    faculty_bp,
    teacher_bp,
    schedule_bp,
    register_api_routes,
    success_response,
    error_response
)

__all__ = [
    'faculty_bp',
    'teacher_bp',
    'schedule_bp',
    'register_api_routes',
    'success_response',
    'error_response'
]
