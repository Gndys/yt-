
let uploadedData = null;
let currentFileName = '';
let workbook = null; // 存储Excel工作簿
let allSheetsData = {}; // 存储所有工作表数据

// 文件拖拽处理
const fileUpload = document.getElementById('fileUpload');

fileUpload.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileUpload.classList.add('dragover');
});

fileUpload.addEventListener('dragleave', () => {
    fileUpload.classList.remove('dragover');
});

fileUpload.addEventListener('drop', (e) => {
    e.preventDefault();
    fileUpload.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

// 测试API连接
async function testAPI() {
    const baseUrl = document.getElementById('baseUrl').value;
    const apiKey = document.getElementById('apiKey').value;
    const modelId = document.getElementById('modelId').value;
    const status = document.getElementById('apiStatus');

    if (!baseUrl || !apiKey || !modelId) {
        showStatus(status, 'error', '请填写完整的API配置信息');
        return;
    }

    try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: modelId,
                messages: [{ role: 'user', content: 'Hello' }],
                max_tokens: 10
            })
        });

        if (response.ok) {
            showStatus(status, 'success', 'API连接测试成功！');
        } else {
            showStatus(status, 'error', `API连接失败: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        showStatus(status, 'error', `连接错误: ${error.message}`);
    }
}

// 显示状态信息
function showStatus(element, type, message) {
    element.className = `status ${type}`;
    element.textContent = message;
    element.style.display = 'block';
    setTimeout(() => {
        element.style.display = 'none';
    }, 5000);
}

// 处理文件上传
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
        handleFile(file);
    }
}

// 处理文件
function handleFile(file) {
    currentFileName = file.name;
    const fileExtension = file.name.split('.').pop().toLowerCase();

    if (!['csv', 'xlsx', 'xls'].includes(fileExtension)) {
        alert('请上传CSV或Excel格式的文件');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            if (fileExtension === 'csv') {
                // CSV处理
                const data = parseCSV(e.target.result);
                uploadedData = data;
                allSheetsData = { 'CSV数据': data };
                displayPreview(data);
                // 隐藏工作表选择器
                document.getElementById('sheetSelector').style.display = 'none';
            } else {
                // Excel处理
                workbook = XLSX.read(e.target.result, { type: 'binary' });
                
                // 处理所有工作表
                allSheetsData = {};
                workbook.SheetNames.forEach(sheetName => {
                    const sheet = workbook.Sheets[sheetName];
                    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                    allSheetsData[sheetName] = data;
                });
                
                // 默认显示第一个工作表
                uploadedData = allSheetsData[workbook.SheetNames[0]];
                
                // 显示工作表选择器
                displaySheetSelector(workbook.SheetNames);
                
                // 显示第一个工作表的预览
                displayPreview(uploadedData, workbook.SheetNames[0]);
            }
        } catch (error) {
            alert('文件解析失败，请检查文件格式');
            console.error(error);
        }
    };

    if (fileExtension === 'csv') {
        reader.readAsText(file);
    } else {
        reader.readAsBinaryString(file);
    }
}

// 显示工作表选择器
function displaySheetSelector(sheetNames) {
    const sheetSelector = document.getElementById('sheetSelector');
    const sheetList = document.getElementById('sheetList');
    
    sheetSelector.style.display = 'block';
    sheetList.innerHTML = '';
    
    sheetNames.forEach((sheetName, index) => {
        const sheetItem = document.createElement('div');
        sheetItem.className = 'sheet-item' + (index === 0 ? ' active' : '');
        sheetItem.textContent = sheetName;
        sheetItem.dataset.sheetName = sheetName;
        sheetItem.onclick = function() {
            // 移除其他工作表的active类
            document.querySelectorAll('.sheet-item').forEach(item => {
                item.classList.remove('active');
            });
            // 添加当前工作表的active类
            this.classList.add('active');
            // 显示当前工作表的预览
            const selectedSheet = this.dataset.sheetName;
            displayPreview(allSheetsData[selectedSheet], selectedSheet);
        };
        sheetList.appendChild(sheetItem);
    });
}

// 解析CSV
function parseCSV(text) {
    const lines = text.split('\n');
    return lines.map(line => {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    }).filter(row => row.some(cell => cell !== ''));
}

// 显示数据预览
function displayPreview(data, sheetName = '') {
    const previewCard = document.getElementById('previewCard');
    const previewDiv = document.getElementById('dataPreview');
    
    if (data.length === 0) {
        previewDiv.innerHTML = '<p>没有数据可预览</p>';
        return;
    }

    const maxRows = Math.min(10, data.length);
    let html = `<p>文件名: <strong>${currentFileName}</strong>`;
    
    if (sheetName) {
        html += ` | 工作表: <strong>${sheetName}</strong>`;
    }
    
    html += ` | 总行数: <strong>${data.length}</strong> | 预览前${maxRows}行</p>`;
    html += '<table class="preview-table">';
    
    for (let i = 0; i < maxRows; i++) {
        html += '<tr>';
        const maxCols = Math.min(10, data[i].length);
        for (let j = 0; j < maxCols; j++) {
            const tag = i === 0 ? 'th' : 'td';
            html += `<${tag}>${data[i][j] || ''}</${tag}>`;
        }
        html += '</tr>';
    }
    html += '</table>';
    
    previewDiv.innerHTML = html;
    previewCard.style.display = 'block';
}

// 生成报告
async function generateReport() {
    const baseUrl = document.getElementById('baseUrl').value;
    const apiKey = document.getElementById('apiKey').value;
    const modelId = document.getElementById('modelId').value;

    if (!baseUrl || !apiKey || !modelId) {
        alert('请先配置API信息');
        return;
    }

    if (!uploadedData) {
        alert('请先上传数据文件');
        return;
    }

    // 显示加载状态
    document.getElementById('loadingCard').style.display = 'block';
    document.getElementById('generateBtn').disabled = true;

    try {
        // 准备所有工作表数据
        let allDataText = '';
        
        // 获取当前选中的工作表
        const activeSheetItem = document.querySelector('.sheet-item.active');
        
        if (activeSheetItem) {
            // 如果有工作表选择器，使用选中的工作表
            const selectedSheetName = activeSheetItem.dataset.sheetName;
            const selectedData = allSheetsData[selectedSheetName];
            
            allDataText = `【${selectedSheetName}】\n`;
            allDataText += selectedData.map(row => row.join('\t')).join('\n');
        } else {
            // 如果没有工作表选择器（CSV文件），使用当前数据
            allDataText = uploadedData.map(row => row.join('\t')).join('\n');
        }
        
        const prompt = `你是一位资深的商业数据分析师。你的任务是基于我提供的销售数据表格，为我生成一份全面、深入的销售分析报告。报告需要清晰地揭示销售表现、关键驱动因素和潜在的商业机会。

数据内容：
${allDataText}

请严格按照以下结构生成报告，并为每个部分添加明确的标题：

## 📊 总体销售业绩分析
- 计算并展示总销售额、平均客户销售额
- 分析销售额最高的客户和最低的客户，并列出具体数值
- 分析销售额随时间的变化趋势（如果数据包含时间信息）

## 🏆 核心客户分析
- 识别出销售额排名前10的客户
- 用表格形式展示这10位客户的客户名称、销售金额及其占总销售额的百分比
- 分析这些核心客户的共同特点

## 📈 客户分层与帕累托分析
- 对所有客户进行ABC分层
- 进行帕累托分析（80/20法则），计算大约多少比例的客户贡献了80%的销售额
- 描述客户销售额的分布情况

## 💡 关键洞察与策略建议
- 总结关键发现：用2-3点概括最重要的分析结果
- 提出策略建议：基于以上分析，针对客户维护、新客户开拓、销售资源分配等方面，提出3-5条具体、可行的建议

## 📋 数据摘要
- 将关键的指标汇总成一个简洁的摘要表格

报告应使用中文撰写，语言风格应专业、客观。关键数据和结论需要突出显示。`;

        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: modelId,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 4000,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        const reportText = result.choices[0].message.content;

        // 显示报告
        displayReport(reportText);

    } catch (error) {
        alert(`生成报告失败: ${error.message}`);
        console.error(error);
    } finally {
        document.getElementById('loadingCard').style.display = 'none';
        document.getElementById('generateBtn').disabled = false;
    }
}

// 显示报告
function displayReport(reportText) {
    const reportCard = document.getElementById('reportCard');
    const reportContent = document.getElementById('reportContent');
    
    // 使用marked库将markdown转换为HTML
    if (!window.marked) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
        script.onload = () => renderMarkdown(reportText);
        document.head.appendChild(script);
    } else {
        renderMarkdown(reportText);
    }

    function renderMarkdown(mdText) {
        marked.setOptions({
            breaks: true,
            gfm: true
        });
        const html = marked.parse(mdText);
        reportContent.innerHTML = html;
        enhanceTables();
    }

    // 表格样式增强
    function enhanceTables() {
        const tables = reportContent.querySelectorAll('table');
        tables.forEach(table => {
            table.classList.add('preview-table');
        });
    }

    // 尝试提取表格或关键数据生成简单可视化
    try {
// 创建图表容器并插入三个canvas
const chartContainer = document.createElement('div');
chartContainer.className = 'chart-container';
chartContainer.innerHTML = `
<h4>柱状图</h4><canvas id="reportBarChart"></canvas>
<h4>饼状图</h4><canvas id="reportPieChart"></canvas>
<h4>折线图</h4><canvas id="reportLineChart"></canvas>
`;
reportContent.appendChild(chartContainer);

// 从报告文本中解析数据
const dataLines = reportText.split('\n').filter(line => line.includes('%') || /\d+(\.\d+)?/.test(line));
const labels = [];
const values = [];
dataLines.forEach(line => {
const match = line.match(/([\u4e00-\u9fa5A-Za-z0-9_]+)[\s|：:]+([\d,.]+)/);
if (match) {
labels.push(match[1]);
values.push(parseFloat(match[2].replace(/,/g, '')));
}
});

if (labels.length && values.length) {
// 颜色调色板
const colors = [
'rgba(102, 126, 234, 0.6)',
'rgba(118, 75, 162, 0.6)',
'rgba(72, 187, 120, 0.6)',
'rgba(246, 173, 85, 0.6)',
'rgba(237, 100, 166, 0.6)',
'rgba(56, 178, 172, 0.6)',
'rgba(245, 101, 101, 0.6)',
'rgba(128, 90, 213, 0.6)',
'rgba(66, 153, 225, 0.6)',
'rgba(160, 174, 192, 0.6)'
];

const topLabels = labels.slice(0, 10);
const topValues = values.slice(0, 10);

// 柱状图
new Chart(document.getElementById('reportBarChart'), {
type: 'bar',
data: {
    labels: topLabels,
    datasets: [{
        label: '数值',
        data: topValues,
        backgroundColor: colors
    }]
},
options: {
    responsive: true,
    plugins: {
        legend: { display: false },
        title: { display: true, text: '关键数据 - 柱状图' }
    }
}
});

// 饼状图
new Chart(document.getElementById('reportPieChart'), {
type: 'pie',
data: {
    labels: topLabels,
    datasets: [{
        label: '占比',
        data: topValues,
        backgroundColor: colors
    }]
},
options: {
    responsive: true,
    plugins: {
        legend: { position: 'right' },
        title: { display: true, text: '关键数据占比 - 饼状图' }
    }
}
});

// 折线图
new Chart(document.getElementById('reportLineChart'), {
type: 'line',
data: {
    labels: topLabels,
    datasets: [{
        label: '数值趋势',
        data: topValues,
        fill: false,
        borderColor: 'rgba(102, 126, 234, 1)',
        backgroundColor: 'rgba(102, 126, 234, 0.6)',
        tension: 0.3
    }]
},
options: {
    responsive: true,
    plugins: {
        legend: { display: false },
        title: { display: true, text: '关键数据趋势 - 折线图' }
    }
}
});
}
    } catch (err) {
        console.warn('生成图表失败', err);
    }

    // 添加告示栏
    const notice = document.createElement('div');
    notice.className = 'custom-notice';
    notice.innerHTML = '💡 更多表格定制，请访问 <a> 这里</a>';
    reportContent.appendChild(notice);

    reportCard.style.display = 'block';
    // 滚动到报告位置
    reportCard.scrollIntoView({ behavior: 'smooth' });
}

// 导出PDF
async function exportToPDF() {
    const reportContent = document.getElementById('reportContent');
    if (!reportContent) return;

    try {
        // 创建临时容器用于PDF生成
        const tempDiv = document.createElement('div');
        tempDiv.style.width = '210mm';
        tempDiv.style.padding = '20mm';
        tempDiv.style.fontFamily = 'Arial, sans-serif';
        tempDiv.style.fontSize = '12px';
        tempDiv.style.lineHeight = '1.6';
        tempDiv.style.color = '#333';
        tempDiv.style.backgroundColor = 'white';
        tempDiv.innerHTML = `
            <h1 style="text-align: center; color: #667eea; margin-bottom: 30px;">📊 数据分析报告</h1>
            <p style="text-align: center; color: #666; margin-bottom: 40px;">生成时间: ${new Date().toLocaleString()}</p>
            ${reportContent.innerHTML}
        `;
        
        document.body.appendChild(tempDiv);

        // 使用html2canvas生成图片
        const canvas = await html2canvas(tempDiv, {
            scale: 2,
            useCORS: true,
            allowTaint: true
        });

        // 创建PDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        const imgWidth = 210;
        const pageHeight = 297;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        pdf.save(`数据分析报告_${new Date().toISOString().split('T')[0]}.pdf`);
        
        // 清理临时元素
        document.body.removeChild(tempDiv);
        
    } catch (error) {
        alert('PDF导出失败: ' + error.message);
        console.error(error);
    }
}

// 重新生成报告
function generateNewReport() {
    if (confirm('确定要重新生成报告吗？')) {
        generateReport();
    }
}
