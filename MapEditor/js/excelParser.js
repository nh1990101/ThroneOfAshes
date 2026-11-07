'use strict';
/*
 * Excel表数据解析器
 * 读取地图资源表(MapResourcesData)配置
 * 表格：F-副本资源表(MapResourcesData).xlsx
 */

const ExcelParser = {
    // 缓存的地图数据
    mapData: null,

    /**
     * 解析Excel文件（使用SheetJS库）
     * @param {File} file - Excel文件
     */
    async parseMapData(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];

            // 转换为JSON，从第3行读取表头
            const data = XLSX.utils.sheet_to_json(worksheet, {
                header: 1,
                defval: null
            });

            if (data.length < 6) {
                throw new Error('Excel格式不正确，数据行数不足');
            }

            // 调试：打印前10行数据，看看表头在哪里
            console.log('Excel前10行原始数据:');
            for (let i = 0; i < Math.min(10, data.length); i++) {
                console.log(`第${i + 1}行 (索引${i}):`, data[i]);
            }

            // 调试：打印前10行数据，看看表头在哪里
            console.log('Excel前10行原始数据:');
            for (let i = 0; i < Math.min(10, data.length); i++) {
                console.log(`第${i + 1}行 (索引${i}):`, data[i]);
            }

            // 第4行（索引3）是字段名定义
            const headers = data[3];
            const result = [];

            // 从第7行（索引6）开始是实际数据
            for (let i = 6; i < data.length; i++) {
                const row = data[i];
                if (!row || row.every(cell => cell === null || cell === '')) {
                    continue; // 跳过空行
                }

                // 调试：打印整行原始数据
                if (i === 6 || i === 7) {
                    console.log(`第${i+1}行完整数据:`, row);
                    console.log(`  [0]=${row[0]}, [1]=${row[1]}, [2]=${row[2]}, [3]=${row[3]}, [4]=${row[4]}`);
                    console.log(`  [5]=${row[5]} (offset_pos), [6]=${row[6]} (is_walk), [7]=${row[7]} (is_flip), [8]=${row[8]} (show_url)`);
                }

                const obj = {
                    id: row[1], // 属性名（ID）
                    name: row[2], // 中文索引（ch_key）
                    interaction_type: row[3], // 交互类型
                    area: row[4], // 地图占格子数
                    offsetPos: row[5], // 偏移坐标（offset_pos）
                    isCanWalk: row[6], // 是否可移动（is_walk）
                    isFlipX: row[7], // 是否可随机翻转（is_flip）
                    show_url: row[8] // 显示资源路径
                };

                // 解析area字段 "x//y" -> {x, y}
                if (obj.area && typeof obj.area === 'string') {
                    const parts = obj.area.split('//');
                    if (parts.length === 2) {
                        obj.areaX = parseInt(parts[0]) || 1;
                        obj.areaY = parseInt(parts[1]) || 1;
                    } else {
                        obj.areaX = 0; // 可穿透
                        obj.areaY = 0;
                    }
                } else {
                    obj.areaX = 0; // 可穿透
                    obj.areaY = 0;
                }

                // 解析offsetPos字段 "x//y" -> {offsetX, offsetY}
                if (obj.offsetPos && typeof obj.offsetPos === 'string') {
                    const parts = obj.offsetPos.split('//');
                    if (parts.length === 2) {
                        obj.offsetX = parseInt(parts[0]) || 0;
                        obj.offsetY = parseInt(parts[1]) || 0;
                    } else {
                        obj.offsetX = 0;
                        obj.offsetY = 0;
                    }
                } else {
                    obj.offsetX = 0;
                    obj.offsetY = 0;
                }

                // 解析isCanWalk字段，转换为布尔值
                // Excel中可能是 1/0、true/false、是/否 等格式
                if (obj.isCanWalk !== undefined && obj.isCanWalk !== null) {
                    if (typeof obj.isCanWalk === 'number') {
                        obj.isCanWalk = obj.isCanWalk !== 0;
                    } else if (typeof obj.isCanWalk === 'string') {
                        const val = obj.isCanWalk.toLowerCase();
                        obj.isCanWalk = val === 'true' || val === '1' || val === '是';
                    } else if (typeof obj.isCanWalk === 'boolean') {
                        // 已经是布尔值，保持不变
                        obj.isCanWalk = obj.isCanWalk;
                    } else {
                        obj.isCanWalk = Boolean(obj.isCanWalk);
                    }
                } else {
                    obj.isCanWalk = false; // 默认不可行走
                }

                // 解析isFlipX字段，转换为布尔值
                // Excel中可能是 1/0、true/false、是/否 等格式
                if (obj.isFlipX !== undefined && obj.isFlipX !== null) {
                    if (typeof obj.isFlipX === 'number') {
                        obj.isFlipX = obj.isFlipX !== 0;
                    } else if (typeof obj.isFlipX === 'string') {
                        const val = obj.isFlipX.toLowerCase();
                        obj.isFlipX = val === 'true' || val === '1' || val === '是';
                    } else if (typeof obj.isFlipX === 'boolean') {
                        // 已经是布尔值，保持不变
                        obj.isFlipX = obj.isFlipX;
                    } else {
                        obj.isFlipX = Boolean(obj.isFlipX);
                    }
                } else {
                    obj.isFlipX = false; // 默认不翻转
                }

                console.log(`解析行${i + 1}: id=${obj.id}, name=${obj.name}, interaction_type=${obj.interaction_type}, isCanWalk原始值=${row[6]} (${typeof row[6]}), 转换后=${obj.isCanWalk}, isFlipX原始值=${row[7]} (${typeof row[7]}), 转换后=${obj.isFlipX}`);

                result.push(obj);
            }

            this.mapData = result;
            console.log('地图表数据加载成功:', result.length, '条记录');
            console.log('前3条数据示例:', result.slice(0, 3));
            return result;
        } catch (error) {
            console.error('解析Excel失败:', error);
            throw new Error('解析Excel失败: ' + error.message);
        }
    },

    /**
     * 根据ID获取地图物体配置
     */
    getById(id) {
        if (!this.mapData) return null;
        return this.mapData.find(item => item.id == id);
    },

    /**
     * 获取所有数据
     */
    getAll() {
        return this.mapData || [];
    }
};
