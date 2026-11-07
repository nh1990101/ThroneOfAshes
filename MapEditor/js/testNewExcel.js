// 测试读取新的Excel表格结构
const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, '../../sharedata/excel/F-副本资源表(MapResourcesData).xlsx');
console.log('读取文件:', excelPath);

try {
    const workbook = XLSX.readFile(excelPath);
    console.log('\n所有工作表名称:', workbook.SheetNames);

    // 读取第一个工作表（地图资源表）
    const firstSheetName = workbook.SheetNames[0];
    console.log('\n当前读取工作表:', firstSheetName);

    const worksheet = workbook.Sheets[firstSheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: null
    });

    console.log('\n前10行原始数据:');
    for (let i = 0; i < Math.min(10, data.length); i++) {
        console.log(`第${i + 1}行 (索引${i}):`, data[i]);
    }

    // 重点查看字段名定义行
    if (data.length > 3) {
        console.log('\n字段名定义行 (索引3):');
        const headers = data[3];
        headers.forEach((header, index) => {
            console.log(`  [${index}] = ${header}`);
        });
    }

} catch (error) {
    console.error('读取失败:', error.message);
}
