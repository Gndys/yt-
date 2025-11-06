/**
 * A.O.史密斯提成计算工具 - 公共工具库
 * @version 2.1
 * @date 2025-11-06
 */

// ==================== 消息提示 ====================

/**
 * 显示Toast消息
 * @param {string} message - 消息内容
 * @param {string} type - 消息类型: success, error, warning, info
 * @param {Object} options - 可选配置
 */
function showToast(message, type = 'info', options = {}) {
    const defaults = {
        duration: 3000,
        position: 'top-right',
        closable: true
    };
    
    const config = { ...defaults, ...options };
    
    // 创建toast容器（如果不存在）
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }
    
    // 创建toast元素
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
        background: white;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        min-width: 300px;
        max-width: 500px;
        display: flex;
        align-items: center;
        gap: 12px;
        pointer-events: auto;
        animation: slideInRight 0.3s ease;
    `;
    
    // 图标
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    
    const colors = {
        success: '#10B981',
        error: '#EF4444',
        warning: '#F59E0B',
        info: '#3B82F6'
    };
    
    const iconEl = document.createElement('div');
    iconEl.style.cssText = `
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: ${colors[type]};
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        flex-shrink: 0;
    `;
    iconEl.textContent = icons[type];
    
    // 消息内容
    const messageEl = document.createElement('div');
    messageEl.style.cssText = `
        flex: 1;
        color: #1F2937;
        line-height: 1.5;
    `;
    messageEl.textContent = message;
    
    toast.appendChild(iconEl);
    toast.appendChild(messageEl);
    
    // 关闭按钮
    if (config.closable) {
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: #9CA3AF;
            cursor: pointer;
            font-size: 18px;
            padding: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        `;
        closeBtn.onclick = () => removeToast(toast);
        toast.appendChild(closeBtn);
    }
    
    container.appendChild(toast);
    
    // 添加动画
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    if (!document.getElementById('toast-styles')) {
        style.id = 'toast-styles';
        document.head.appendChild(style);
    }
    
    // 自动关闭
    if (config.duration > 0) {
        setTimeout(() => removeToast(toast), config.duration);
    }
}

function removeToast(toast) {
    toast.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => toast.remove(), 300);
}

// ==================== 加载进度条 ====================

class ProgressBar {
    constructor(options = {}) {
        this.options = {
            container: document.body,
            color: '#FFC107',
            height: '4px',
            ...options
        };
        this.init();
    }
    
    init() {
        this.overlay = document.createElement('div');
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.3);
            z-index: 9999;
            display: none;
            align-items: center;
            justify-content: center;
        `;
        
        this.container = document.createElement('div');
        this.container.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            min-width: 400px;
        `;
        
        this.title = document.createElement('div');
        this.title.style.cssText = `
            font-size: 16px;
            font-weight: 600;
            color: #1F2937;
            margin-bottom: 16px;
        `;
        this.title.textContent = '处理中...';
        
        this.barContainer = document.createElement('div');
        this.barContainer.style.cssText = `
            width: 100%;
            height: ${this.options.height};
            background: #E5E7EB;
            border-radius: 999px;
            overflow: hidden;
            margin-bottom: 12px;
        `;
        
        this.bar = document.createElement('div');
        this.bar.style.cssText = `
            width: 0%;
            height: 100%;
            background: ${this.options.color};
            transition: width 0.3s ease;
        `;
        
        this.text = document.createElement('div');
        this.text.style.cssText = `
            font-size: 14px;
            color: #6B7280;
            text-align: center;
        `;
        this.text.textContent = '0%';
        
        this.barContainer.appendChild(this.bar);
        this.container.appendChild(this.title);
        this.container.appendChild(this.barContainer);
        this.container.appendChild(this.text);
        this.overlay.appendChild(this.container);
        document.body.appendChild(this.overlay);
    }
    
    show(title = '处理中...') {
        this.title.textContent = title;
        this.overlay.style.display = 'flex';
        this.update(0);
    }
    
    update(percent, text = null) {
        percent = Math.max(0, Math.min(100, percent));
        this.bar.style.width = percent + '%';
        this.text.textContent = text || `${Math.round(percent)}%`;
    }
    
    hide() {
        this.overlay.style.display = 'none';
    }
}

// 全局进度条实例
window.progressBar = window.progressBar || new ProgressBar();

// ==================== 本地存储管理 ====================

const Storage = {
    /**
     * 保存数据到localStorage
     */
    set(key, value, options = {}) {
        try {
            const data = {
                value: value,
                timestamp: Date.now(),
                version: options.version || '1.0',
                expires: options.expires || null
            };
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('保存数据失败:', e);
            return false;
        }
    },
    
    /**
     * 从localStorage读取数据
     */
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            if (!item) return defaultValue;
            
            const data = JSON.parse(item);
            
            // 检查是否过期
            if (data.expires && Date.now() > data.expires) {
                this.remove(key);
                return defaultValue;
            }
            
            return data.value;
        } catch (e) {
            console.error('读取数据失败:', e);
            return defaultValue;
        }
    },
    
    /**
     * 删除数据
     */
    remove(key) {
        localStorage.removeItem(key);
    },
    
    /**
     * 清空所有数据
     */
    clear() {
        localStorage.clear();
    },
    
    /**
     * 获取所有键
     */
    keys() {
        return Object.keys(localStorage);
    }
};

// ==================== 数据校验 ====================

const Validator = {
    /**
     * 检查是否为空
     */
    isEmpty(value) {
        return value === null || value === undefined || value === '';
    },
    
    /**
     * 检查是否为数字
     */
    isNumber(value) {
        return !isNaN(parseFloat(value)) && isFinite(value);
    },
    
    /**
     * 检查数字范围
     */
    inRange(value, min, max) {
        const num = parseFloat(value);
        return this.isNumber(num) && num >= min && num <= max;
    },
    
    /**
     * 检查是否为有效日期
     */
    isValidDate(value) {
        const date = new Date(value);
        return date instanceof Date && !isNaN(date);
    },
    
    /**
     * 检查Excel文件
     */
    isExcelFile(file) {
        const validExtensions = ['.xlsx', '.xls'];
        const fileName = file.name.toLowerCase();
        return validExtensions.some(ext => fileName.endsWith(ext));
    },
    
    /**
     * 检查文件大小（MB）
     */
    checkFileSize(file, maxSizeMB = 50) {
        return file.size <= maxSizeMB * 1024 * 1024;
    },
    
    /**
     * 批量校验
     */
    validate(data, rules) {
        const errors = [];
        
        for (const [field, rule] of Object.entries(rules)) {
            const value = data[field];
            
            if (rule.required && this.isEmpty(value)) {
                errors.push(`${rule.label || field} 不能为空`);
                continue;
            }
            
            if (!this.isEmpty(value) && rule.type === 'number' && !this.isNumber(value)) {
                errors.push(`${rule.label || field} 必须是数字`);
            }
            
            if (rule.min !== undefined && parseFloat(value) < rule.min) {
                errors.push(`${rule.label || field} 不能小于 ${rule.min}`);
            }
            
            if (rule.max !== undefined && parseFloat(value) > rule.max) {
                errors.push(`${rule.label || field} 不能大于 ${rule.max}`);
            }
            
            if (rule.pattern && !rule.pattern.test(value)) {
                errors.push(`${rule.label || field} 格式不正确`);
            }
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
};

// ==================== 日期处理 ====================

const DateUtils = {
    /**
     * 格式化日期
     */
    format(date, format = 'YYYY-MM-DD') {
        if (!date) return '';
        
        const d = new Date(date);
        if (isNaN(d)) return '';
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hour = String(d.getHours()).padStart(2, '0');
        const minute = String(d.getMinutes()).padStart(2, '0');
        const second = String(d.getSeconds()).padStart(2, '0');
        
        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hour)
            .replace('mm', minute)
            .replace('ss', second);
    },
    
    /**
     * 解析多种日期格式
     */
    parse(value) {
        if (!value) return null;
        
        // 尝试多种格式
        const formats = [
            /(\d{4})\.(\d{1,2})\.(\d{1,2})/,  // 2025.9.15
            /(\d{4})\/(\d{1,2})\/(\d{1,2})/,  // 2025/9/15
            /(\d{4})-(\d{1,2})-(\d{1,2})/     // 2025-09-15
        ];
        
        for (const regex of formats) {
            const match = String(value).match(regex);
            if (match) {
                const [, year, month, day] = match;
                return new Date(year, month - 1, day);
            }
        }
        
        // 尝试直接解析
        const date = new Date(value);
        return isNaN(date) ? null : date;
    },
    
    /**
     * 检查日期是否在范围内
     */
    inRange(date, startDate, endDate) {
        const d = this.parse(date);
        const start = this.parse(startDate);
        const end = this.parse(endDate);
        
        if (!d || !start || !end) return false;
        
        return d >= start && d <= end;
    }
};

// ==================== Excel处理 ====================

const ExcelUtils = {
    /**
     * 导出数据到Excel
     */
    export(data, filename, sheetName = 'Sheet1') {
        if (!window.XLSX) {
            showToast('XLSX库未加载', 'error');
            return;
        }
        
        try {
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
            
            const timestamp = DateUtils.format(new Date(), 'YYYYMMDD_HHmmss');
            const fileName = `${filename}_${timestamp}.xlsx`;
            
            XLSX.writeFile(wb, fileName);
            showToast('导出成功', 'success');
            return true;
        } catch (e) {
            console.error('导出失败:', e);
            showToast('导出失败: ' + e.message, 'error');
            return false;
        }
    },
    
    /**
     * 读取Excel文件
     */
    async read(file) {
        return new Promise((resolve, reject) => {
            if (!Validator.isExcelFile(file)) {
                reject(new Error('请选择Excel文件'));
                return;
            }
            
            if (!Validator.checkFileSize(file)) {
                reject(new Error('文件过大，请选择小于50MB的文件'));
                return;
            }
            
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    resolve(workbook);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsArrayBuffer(file);
        });
    },
    
    /**
     * 查找表头行（跳过空白行）
     */
    findHeaderRow(sheet, maxSearch = 5) {
        const range = XLSX.utils.decode_range(sheet['!ref']);
        
        for (let row = 0; row <= Math.min(maxSearch, range.e.r); row++) {
            let nonEmptyCount = 0;
            let stringCount = 0;
            
            for (let col = range.s.c; col <= range.e.c; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
                const cell = sheet[cellAddress];
                
                if (cell && cell.v !== null && cell.v !== undefined && cell.v !== '') {
                    nonEmptyCount++;
                    if (typeof cell.v === 'string' && cell.v.trim() !== '') {
                        stringCount++;
                    }
                }
            }
            
            // 判断是否为表头行：至少有2个非空字符串单元格
            if (stringCount >= 2) {
                return row;
            }
        }
        
        return 0;
    }
};

// ==================== 数字格式化 ====================

const NumberUtils = {
    /**
     * 格式化金额（千分位）
     */
    formatMoney(value, decimals = 2) {
        if (!Validator.isNumber(value)) return '0.00';
        
        const num = parseFloat(value);
        return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },
    
    /**
     * 格式化百分比
     */
    formatPercent(value, decimals = 2) {
        if (!Validator.isNumber(value)) return '0%';
        
        const num = parseFloat(value) * 100;
        return num.toFixed(decimals) + '%';
    },
    
    /**
     * 四舍五入
     */
    round(value, decimals = 2) {
        if (!Validator.isNumber(value)) return 0;
        
        const multiplier = Math.pow(10, decimals);
        return Math.round(value * multiplier) / multiplier;
    }
};

// ==================== 调试工具 ====================

const Debug = {
    enabled: false,
    
    log(...args) {
        if (this.enabled) {
            console.log('[DEBUG]', ...args);
        }
    },
    
    time(label) {
        if (this.enabled) {
            console.time(label);
        }
    },
    
    timeEnd(label) {
        if (this.enabled) {
            console.timeEnd(label);
        }
    },
    
    table(data) {
        if (this.enabled) {
            console.table(data);
        }
    }
};

// ==================== 导出 ====================

window.AOSmithUtils = {
    showToast,
    ProgressBar,
    Storage,
    Validator,
    DateUtils,
    ExcelUtils,
    NumberUtils,
    Debug
};

console.log('✓ A.O.史密斯工具库已加载 v2.1');

