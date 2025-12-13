// 全局变量
let sourceFileData = null;
let employeeFileData = null;
let resultWorkbook = null;

// 月份列表（用于识别表头并汇总月份列）
const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

// 销售组织
const salesOrg = "杭州中冠电器有限公司";

// 部门映射
const deptMapping = {
    '杭州': '杭州大区',
    '湖州': '湖州办事处',
    '金华': '金华办事处',
    '嘉兴': '嘉兴办事处',
    '台州': '台州办事处',
    '绍兴': '绍兴办事处',
    '温州': '温州办事处',
    '丽水': '丽水办事处'
};

// 工作表名称列表（需要处理的地区）
const sheetNames = ['杭州', '湖州', '金衢', '嘉兴', '台州', '绍兴', '温丽 '];

// DOM 元素
const sourceFileInput = document.getElementById('sourceFile');
const employeeFileInput = document.getElementById('employeeFile');
const sourceFileNameEl = document.getElementById('sourceFileName');
const employeeFileNameEl = document.getElementById('employeeFileName');
const convertBtn = document.getElementById('convertBtn');
const progressSection = document.getElementById('progressSection');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const resultSection = document.getElementById('resultSection');
const errorSection = document.getElementById('errorSection');
const errorMessage = document.getElementById('errorMessage');
const downloadBtn = document.getElementById('downloadBtn');

// 文件上传事件
sourceFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        sourceFileNameEl.textContent = file.name;
        sourceFileNameEl.classList.add('selected');
        readFile(file, 'source');
    }
});

employeeFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        employeeFileNameEl.textContent = file.name;
        employeeFileNameEl.classList.add('selected');
        readFile(file, 'employee');
    }
});

// 读取文件
function readFile(file, type) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        if (type === 'source') {
            sourceFileData = workbook;
        } else if (type === 'employee') {
            employeeFileData = workbook;
        }
        
        // 检查是否两个文件都已上传
        if (sourceFileData && employeeFileData) {
            convertBtn.disabled = false;
        }
    };
    reader.readAsArrayBuffer(file);
}

// 转换按钮点击事件
convertBtn.addEventListener('click', async () => {
    try {
        showProgress();
        await processData();
        showResult();
    } catch (error) {
        showError(error.message);
    }
});

// 显示进度
function showProgress() {
    progressSection.style.display = 'block';
    resultSection.style.display = 'none';
    errorSection.style.display = 'none';
    convertBtn.disabled = true;
}

// 更新进度
function updateProgress(percent, text) {
    progressFill.style.width = percent + '%';
    progressText.textContent = text;
}

// 显示结果
function showResult() {
    progressSection.style.display = 'none';
    resultSection.style.display = 'block';
    convertBtn.disabled = false;
}

// 显示错误
function showError(message) {
    progressSection.style.display = 'none';
    errorSection.style.display = 'block';
    errorMessage.textContent = message;
    convertBtn.disabled = false;
}

// 主处理函数
async function processData() {
    updateProgress(10, '步骤 1/4: 读取员工基础信息...');
    
    // 读取员工基础信息
    const employeeSheet = employeeFileData.Sheets[employeeFileData.SheetNames[0]];
    const employeeData = XLSX.utils.sheet_to_json(employeeSheet);
    console.log('员工数:', employeeData.length);
    
    updateProgress(20, '步骤 2/4: 从各地区工作表汇总业务员回款数据...');
    
    // 汇总数据
    const salesmanData = {};
    
    // 处理每个地区工作表
    for (let i = 0; i < sheetNames.length; i++) {
        const sheetName = sheetNames[i];
        const progress = 20 + (i + 1) / sheetNames.length * 40;
        updateProgress(progress, `步骤 2/4: 处理【${sheetName.trim()}】工作表...`);
        
        await new Promise(resolve => setTimeout(resolve, 100)); // 让UI有时间更新
        
        processRegionSheet(sourceFileData, sheetName, salesmanData);
    }
    
    updateProgress(60, '步骤 3/4: 生成模板格式数据...');
    
    // 创建输出数据
    const outputData = [];
    let skippedCount = 0;
    const skippedNames = [];
    
    for (const [salesman, monthlyData] of Object.entries(salesmanData)) {
        // 获取员工信息
        const employeeInfo = employeeData.find(emp => emp['员工姓名'] === salesman);
        
        // ⚠️ 只处理在员工表中存在的业务员
        if (!employeeInfo) {
            skippedCount++;
            skippedNames.push(salesman);
            console.log(`⚠️ 跳过非员工: ${salesman}`);
            continue;
        }
        
        // 获取部门信息
        let dept = "销管部"; // 默认部门
        if (employeeInfo['所属地区']) {
            const region = employeeInfo['所属地区'];
            dept = deptMapping[region] || region;
        }
        
        // 计算参考总额
        const total = monthNames.reduce((sum, month) => sum + (monthlyData[month] || 0), 0);
        
        // 构建数据行
        const row = {
            '销售员': salesman,
            '销售组织': salesOrg,
            '销售部门': dept,
            '1月': monthlyData['1月'] || 0,
            '2月': monthlyData['2月'] || 0,
            '3月': monthlyData['3月'] || 0,
            '4月': monthlyData['4月'] || 0,
            '5月': monthlyData['5月'] || 0,
            '6月': monthlyData['6月'] || 0,
            '7月': monthlyData['7月'] || 0,
            '8月': monthlyData['8月'] || 0,
            '9月': monthlyData['9月'] || 0,
            '10月': monthlyData['10月'] || 0,
            '11月': monthlyData['11月'] || 0,
            '12月': monthlyData['12月'] || 0,
            '参考总额': total,
            '填写说明': '请将总额分配到各月,确保各月之和等于总额'
        };
        
        outputData.push(row);
    }
    
    // 输出过滤统计
    if (skippedCount > 0) {
        console.log(`\n✅ 已过滤 ${skippedCount} 个非员工记录：`, skippedNames.join(', '));
    }
    
    // 按参考总额降序排序
    outputData.sort((a, b) => b['参考总额'] - a['参考总额']);
    
    updateProgress(80, '步骤 4/4: 生成Excel文件...');
    
    // 创建工作簿
    const ws = XLSX.utils.json_to_sheet(outputData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "销售员回款汇总");
    
    resultWorkbook = wb;
    
    updateProgress(100, '转换完成！');
    
    // 更新统计信息
    const totalAmount = outputData.reduce((sum, row) => sum + row['参考总额'], 0);
    document.getElementById('statEmployeeCount').textContent = outputData.length + ' 人';
    document.getElementById('statTotalAmount').textContent = '¥' + totalAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    // 显示过滤信息
    if (skippedCount > 0) {
        document.getElementById('statFilteredCount').textContent = skippedCount + ' 个';
        document.getElementById('filteredInfo').style.display = 'block';
        document.getElementById('filteredNames').textContent = skippedNames.join('、');
    } else {
        document.getElementById('filteredInfo').style.display = 'none';
    }
    
    // 更新预览表格（前10名）
    const previewBody = document.getElementById('previewBody');
    previewBody.innerHTML = '';
    
    const top10 = outputData.slice(0, 10);
    top10.forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${row['销售员']}</td>
            <td>${row['销售部门']}</td>
            <td>${formatNumber(row['1月'])}</td>
            <td>${formatNumber(row['2月'])}</td>
            <td>${formatNumber(row['3月'])}</td>
            <td><strong>${formatNumber(row['参考总额'])}</strong></td>
        `;
        previewBody.appendChild(tr);
    });
}

// 处理地区工作表
function processRegionSheet(workbook, sheetName, salesmanData) {
    const normalizedSheetName = (sheetName || '').trim();
    console.log(`\n处理【${normalizedSheetName}】工作表...`);
    
    // 检查工作表是否存在
    if (!workbook.Sheets[normalizedSheetName]) {
        console.warn(`工作表 ${normalizedSheetName} 不存在，跳过`);
        return;
    }
    
    const sheet = workbook.Sheets[normalizedSheetName];
    
    // 将工作表转换为二维数组（保留原始格式）
    const range = XLSX.utils.decode_range(sheet['!ref']);
    const data = [];
    
    for (let R = range.s.r; R <= range.e.r; R++) {
        const row = [];
        for (let C = range.s.c; C <= range.e.c; C++) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            const cell = sheet[cellAddress];
            row.push(cell ? cell.v : null);
        }
        data.push(row);
    }
    
    if (data.length < 3) {
        console.warn(`工作表 ${sheetName} 数据不足，跳过`);
        return;
    }
    
    // 分析表头（前2行）
    const row0 = data[0]; // 字段名行
    const row1 = data[1]; // 年份行
    
    // 找出2025年数据所在的列
    const col2025Indices = {};
    let currentMonth = null;
    
    for (let i = 0; i < row0.length; i++) {
        const fieldVal = row0[i];
        
        // 检查是否是月份列
        if (fieldVal && typeof fieldVal === 'string' && fieldVal.includes('月')) {
            const monthStr = fieldVal.trim();
            if (monthNames.includes(monthStr)) {
                currentMonth = monthStr;
            }
        }
        
        // 检查年份
        const yearVal = row1[i];
        if (yearVal && typeof yearVal === 'string' && yearVal.includes('2025')) {
            if (currentMonth && !col2025Indices[currentMonth]) {
                col2025Indices[currentMonth] = i;
                console.log(`  找到: ${currentMonth} -> 列${i} (2025年)`);
            }
        } else if (yearVal && typeof yearVal === 'number' && yearVal === 2025) {
            if (currentMonth && !col2025Indices[currentMonth]) {
                col2025Indices[currentMonth] = i;
                console.log(`  找到: ${currentMonth} -> 列${i} (2025年)`);
            }
        }
    }
    
    // 业务员列索引（第7列，从0开始）
    const salesmanColIdx = 7;
    
    // 从第2行开始读取数据（跳过前2行表头）
    for (let rowIdx = 2; rowIdx < data.length; rowIdx++) {
        const row = data[rowIdx];
        
        if (row.length <= salesmanColIdx) continue;
        
        const salesman = row[salesmanColIdx];
        
        // 跳过无效的业务员名称
        if (!salesman || salesman === '业务员' || typeof salesman !== 'string') {
            continue;
        }
        
        // 初始化业务员数据
        if (!salesmanData[salesman]) {
            salesmanData[salesman] = {};
            monthNames.forEach(month => {
                salesmanData[salesman][month] = 0;
            });
        }
        
        // 累加各月数据
        for (const month of monthNames) {
            if (col2025Indices[month] !== undefined) {
                const colIdx = col2025Indices[month];
                if (colIdx < row.length) {
                    const value = row[colIdx];
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue)) {
                        salesmanData[salesman][month] += numValue;
                    }
                }
            }
        }
    }
    
    // 输出统计
    for (const [salesman, monthlyData] of Object.entries(salesmanData)) {
        const total = monthNames.reduce((sum, month) => sum + (monthlyData[month] || 0), 0);
        if (total > 0) {
            console.log(`  业务员 [${salesman}]: 1-10月合计 = ${total.toFixed(2)}`);
        }
    }
}

// 格式化数字
function formatNumber(num) {
    if (typeof num !== 'number') return '0';
    return num.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// 下载按钮点击事件
downloadBtn.addEventListener('click', () => {
    if (!resultWorkbook) return;
    
    // 生成文件名（包含当前日期）
    const date = new Date();
    const dateStr = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    const fileName = `销售员回款汇总表_1-12月_2025年数据_${dateStr}.xlsx`;
    
    // 导出文件
    XLSX.writeFile(resultWorkbook, fileName);
});
