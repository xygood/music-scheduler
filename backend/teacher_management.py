"""
音乐学校课程排课系统后端API
教师管理模块 - 支持按教研室和专业分配
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
from typing import List, Dict, Optional
import uuid

app = Flask(__name__)
CORS(app)

# 教研室配置
FACULTY_CONFIG = {
    '钢琴专业': {'code': 'PIANO', 'description': '负责所有钢琴课程教学'},
    '声乐专业': {'code': 'VOCAL', 'description': '负责所有声乐课程教学'},
    '器乐专业': {'code': 'INSTRUMENT', 'description': '负责所有器乐课程教学'}
}

# 乐器到教研室映射
FACULTY_MAPPING = {
    '钢琴': '钢琴专业',
    '声乐': '声乐专业',
    '古筝': '器乐专业',
    '笛子': '器乐专业',
    '竹笛': '器乐专业',
    '古琴': '器乐专业',
    '葫芦丝': '器乐专业',
    '双排键': '器乐专业',
    '小提琴': '器乐专业',
    '萨克斯': '器乐专业',
    '大提琴': '器乐专业'
}

# 乐器配置（每班最多学生数）
INSTRUMENT_CONFIGS = {
    '钢琴': {'max_students': 5, 'faculty': '钢琴专业'},
    '声乐': {'max_students': 5, 'faculty': '声乐专业'},
    '古筝': {'max_students': 8, 'faculty': '器乐专业'},
    '笛子': {'max_students': 8, 'faculty': '器乐专业'},
    '竹笛': {'max_students': 8, 'faculty': '器乐专业'},
    '古琴': {'max_students': 5, 'faculty': '器乐专业'},
    '葫芦丝': {'max_students': 8, 'faculty': '器乐专业'},
    '双排键': {'max_students': 5, 'faculty': '器乐专业'},
    '小提琴': {'max_students': 5, 'faculty': '器乐专业'},
    '萨克斯': {'max_students': 5, 'faculty': '器乐专业'},
    '大提琴': {'max_students': 5, 'faculty': '器乐专业'}
}

# 内存数据库（实际项目中应使用MySQL/PostgreSQL）
teachers_db = {}
teacher_instruments_db = {}  # teacher_id -> List[instrument_name]


class TeacherManagement:
    """教师管理类"""

    @staticmethod
    def assign_teacher_to_faculty(teacher_id: str, instrument_name: str) -> Dict:
        """
        根据教师教授的乐器分配教研室
        """
        faculty_name = FACULTY_MAPPING.get(instrument_name, '器乐专业')

        update_data = {
            'faculty_id': FACULTY_CONFIG[faculty_name]['code'],
            'faculty_name': faculty_name,
            'primary_instrument': instrument_name,
            'updated_at': datetime.now().isoformat()
        }

        # 更新教师信息
        if teacher_id in teachers_db:
            teachers_db[teacher_id].update(update_data)

        # 添加到教师可教授乐器列表
        TeacherManagement.add_teacher_instrument(teacher_id, instrument_name, 'primary')

        return update_data

    @staticmethod
    def add_teacher_instrument(teacher_id: str, instrument_name: str, instrument_type: str = 'primary'):
        """添加教师可教授乐器"""
        if teacher_id not in teacher_instruments_db:
            teacher_instruments_db[teacher_id] = []

        # 检查是否已存在
        exists = any(
            inst['instrument_name'] == instrument_name
            for inst in teacher_instruments_db[teacher_id]
        )

        if not exists:
            teacher_instruments_db[teacher_id].append({
                'instrument_name': instrument_name,
                'instrument_type': instrument_type,
                'added_at': datetime.now().isoformat()
            })

    @staticmethod
    def get_teachers_by_faculty_and_instrument(faculty_name: str, instrument_name: Optional[str] = None) -> List[Dict]:
        """
        根据教研室和乐器获取教师列表
        """
        result = []

        for teacher_id, teacher_data in teachers_db.items():
            # 检查教研室
            if teacher_data.get('faculty_name') != faculty_name:
                continue

            # 检查乐器
            if instrument_name:
                teacher_instruments = [
                    inst['instrument_name']
                    for inst in teacher_instruments_db.get(teacher_id, [])
                ]
                if instrument_name not in teacher_instruments:
                    continue

            result.append(teacher_data)

        return sorted(result, key=lambda x: x.get('name', ''))

    @staticmethod
    def validate_teacher_qualification(teacher_id: str, instrument_name: str) -> Dict:
        """
        验证教师是否有资格教授指定乐器
        """
        # 获取教师教研室
        teacher_faculty = teachers_db.get(teacher_id, {}).get('faculty_name')

        # 获取乐器所属教研室
        instrument_faculty = FACULTY_MAPPING.get(instrument_name)

        if not teacher_faculty or not instrument_faculty:
            return {'valid': False, 'reason': '教研室信息不完整'}

        # 检查教研室是否匹配
        if teacher_faculty != instrument_faculty:
            return {
                'valid': False,
                'reason': f'教师属于{teacher_faculty}，无法教授{instrument_name}（{instrument_faculty}）'
            }

        # 检查教师是否具备该乐器教学资格
        teacher_instruments = [
            inst['instrument_name']
            for inst in teacher_instruments_db.get(teacher_id, [])
        ]

        if instrument_name not in teacher_instruments:
            return {
                'valid': False,
                'reason': f'教师未被授权教授{instrument_name}'
            }

        return {'valid': True}


# API 路由

@app.route('/api/teachers', methods=['GET'])
def get_teachers():
    """获取教师列表"""
    faculty = request.args.get('faculty')
    instrument = request.args.get('instrument')

    if faculty:
        teachers = TeacherManagement.get_teachers_by_faculty_and_instrument(faculty, instrument)
    else:
        teachers = list(teachers_db.values())

    return jsonify({'success': True, 'data': teachers})


@app.route('/api/teachers', methods=['POST'])
def create_teacher():
    """创建教师"""
    data = request.json

    teacher_id = str(uuid.uuid4())

    teacher_data = {
        'id': teacher_id,
        'name': data['name'],
        'email': data['email'],
        'password': data['password'],  # 生产环境应加密
        'faculty_id': data.get('faculty_id'),
        'faculty_name': data.get('faculty_name'),
        'created_at': datetime.now().isoformat()
    }

    teachers_db[teacher_id] = teacher_data

    # 添加教师可教授乐器
    for instrument in data.get('instruments', []):
        TeacherManagement.add_teacher_instrument(teacher_id, instrument, 'secondary')

    return jsonify({'success': True, 'data': teacher_data}), 201


@app.route('/api/teachers/<teacher_id>/validate', methods=['POST'])
def validate_teacher(teacher_id: str):
    """验证教师资格"""
    data = request.json
    instrument_name = data.get('instrument_name')

    result = TeacherManagement.validate_teacher_qualification(teacher_id, instrument_name)

    return jsonify({
        'success': True,
        'data': result
    })


@app.route('/api/faculties', methods=['GET'])
def get_faculties():
    """获取教研室列表"""
    faculties = []

    for name, config in FACULTY_CONFIG.items():
        faculties.append({
            'faculty_name': name,
            'faculty_code': config['code'],
            'description': config['description']
        })

    return jsonify({'success': True, 'data': faculties})


@app.route('/api/instruments', methods=['GET'])
def get_instruments():
    """获取乐器列表（含配置）"""
    instruments = []

    for name, config in INSTRUMENT_CONFIGS.items():
        instruments.append({
            'instrument_name': name,
            'max_students': config['max_students'],
            'faculty': config['faculty']
        })

    return jsonify({'success': True, 'data': instruments})


@app.route('/api/instruments/<instrument_name>/max-students', methods=['GET'])
def get_instrument_max_students(instrument_name: str):
    """获取乐器每班最多学生数"""
    config = INSTRUMENT_CONFIGS.get(instrument_name)

    if not config:
        return jsonify({
            'success': False,
            'error': f'乐器 {instrument_name} 不存在'
        }), 404

    return jsonify({
        'success': True,
        'data': {
            'instrument_name': instrument_name,
            'max_students': config['max_students']
        }
    })


if __name__ == '__main__':
    # 支持Render等云平台的端口配置
    import os
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)
