'use strict';
/*
 * Excel表数据解析器
 * 读取地图表(MapData)配置
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

            // 第3行是表头
            const headers = data[2];
            const result = [];

            // 从第6行开始是实际数据
            for (let i = 5; i < data.length; i++) {
                const row = data[i];
                if (!row || row.every(cell => cell === null || cell === '')) {
                    continue; // 跳过空行
                }

                const obj = {
                    id: row[1], // 属性名（ID）
                    name: row[2], // 中文索引
                    type: row[3], // 类型
                    area: row[4], // 地图占格子数
                    offsetPos: row[5], // 偏移坐标
                    show_url: row[6], // 显示资源路径
                    params: row[7] // 其它参数
                };

                // 解析area字段 "x_y" -> {x, y}
                if (obj.area && typeof obj.area === 'string') {
                    const parts = obj.area.split('_');
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

                // 解析offsetPos字段 "x_y" -> {offsetX, offsetY}
                if (obj.offsetPos && typeof obj.offsetPos === 'string') {
                    const parts = obj.offsetPos.split('_');
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

                result.push(obj);
            }

            this.mapData = result;
            console.log('地图表数据加载成功:', result.length, '条记录');
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
