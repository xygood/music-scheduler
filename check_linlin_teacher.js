#!/usr/bin/env node
"""
检查林琳老师的教师数据和琴房配置
"""

const fs = require('fs');
const path = require('path');

// 存储键
const STORAGE_KEYS = {
    TEACHERS: 'music_scheduler_teachers',
    ROOMS: 'music_scheduler_rooms'
};

// 从localStorage获取数据
function getLocalStorageData() {
    const data = {};
    
    // 尝试从浏览器localStorage文件获取
    const localStoragePath = path.join(process.env.HOME, 'Library/Application Support/Google/Chrome/Default/Local Storage/leveldb');
    
    // 尝试从备份文件获取
    const backupPath = path.join(__dirname, 'backups/src_20260222/data/localStorage.json');
    
    if (fs.existsSync(backupPath)) {
        console.log('从备份文件获取数据...');
        try {
            const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
            return backupData;
        } catch (error) {
            console.error('读取备份文件失败:', error.message);
        }
    }
    
    // 尝试从浏览器localStorage获取（简化版）
    console.log('从浏览器localStorage获取数据...');
    try {
        // 遍历leveldb目录
        if (fs.existsSync(localStoragePath)) {
            const files = fs.readdirSync(localStoragePath);
            for (const file of files) {
                if (file.endsWith('.ldb') || file.endsWith('.log')) {
                    const filePath = path