let dishesData = [];
let filteredData = [];

// AI 配置
const AI_STORAGE_KEYS = {
    baseUrl: 'ai_base_url',
    apiKey: 'ai_api_key',
    modelId: 'ai_model_id',
};

const aiConfig = {
    baseUrl: '',
    apiKey: '',
    modelId: '',
};

// 会话历史（不含 system）
let chatHistory = []; // {role:'user'|'assistant', content:string}

// 简易去抖
function debounce(fn, delay = 200) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), delay);
    };
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    loadSampleData();
    setupEventListeners();
    loadAIConfig();
    setupAIUI();
    refreshDataSummary();
});

function setupEventListeners() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');

    // 拖拽上传
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });

    // 键盘可达：Enter/Space 打开文件选择
    uploadArea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInput.click();
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    const debouncedFilter = debounce(() => { applyFilters(); refreshDataSummary(); }, 200);

    // 实时搜索/筛选（去抖）
    document.getElementById('searchInput').addEventListener('input', debouncedFilter);
    document.getElementById('minPrice').addEventListener('input', debouncedFilter);
    document.getElementById('maxPrice').addEventListener('input', debouncedFilter);
    document.getElementById('categoryFilter').addEventListener('change', debouncedFilter);
    document.getElementById('sortBy').addEventListener('change', debouncedFilter);
}

function loadSampleData() {
    // 加载示例数据
    const sampleData = [
        {
            image: 'https://www.matsuyafoods.co.jp/menu/upload_images/don_kalbi_hormone_hp_s_1.jpg',
            name_jp: 'カルビホルモン丼',
            name_cn: '烤牛五花与内脏盖饭',
            shop: '松屋',
            category: '店舗限定メニュー',
            price: 980,
            name: '烤牛五花与内脏盖饭'
        },
        {
            image: 'https://www.matsuyafoods.co.jp/menu/upload_images/cry_dry_green_hp_s_250805.jpg',
            name_jp: 'ドライグリーンカレー',
            name_cn: '干拌青咖喱',
            shop: '松屋',
            category: '店舗限定メニュー',
            price: 830,
            name: '干拌青咖喱'
        },
        {
            image: 'https://www.matsuyafoods.co.jp/menu/upload_images/don_chashu_egg_hp_s_250729.jpg',
            name_jp: '今治焼豚玉子飯',
            name_cn: '今治烤叉烧鸡蛋饭',
            shop: '松屋',
            category: '定食',
            price: 880,
            name: '今治烤叉烧鸡蛋饭'
        },
        {
            image: 'https://www.matsuyafoods.co.jp/menu/upload_images/don_chashu_egg_hot_hp_s_250729.jpg',
            name_jp: '今治辛玉焼豚玉子飯',
            name_cn: '今治辣味烤叉烧鸡蛋饭',
            shop: '松屋',
            category: '定食',
            price: 980,
            name: '今治辣味烤叉烧鸡蛋饭'
        }
    ];

    dishesData = sampleData;
    filteredData = [...dishesData];
    updateDisplay();
}

function handleFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const ext = (file.name || '').toLowerCase().split('.').pop();
            let workbook;
            if (ext === 'csv') {
                // 用 XLSX 解析 CSV，避免逗号/换行导致解析错误
                workbook = XLSX.read(e.target.result, { type: 'string' });
            } else {
                workbook = XLSX.read(e.target.result, { type: 'binary' });
            }
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: false, defval: '' });
            
            processDishData(data);
            showNotification('文件上传成功！', 'success');
            refreshDataSummary();
        } catch (error) {
            showNotification('文件解析失败，请检查文件格式', 'error');
            console.error('File parsing error:', error);
        }
    };

    if ((file.name || '').toLowerCase().endsWith('.csv')) {
        reader.readAsText(file);
    } else {
        reader.readAsBinaryString(file);
    }
}

function parseCSV(text) {
    const lines = text.split('\n');
    return lines.map(line => line.split(',').map(cell => cell.trim()));
}

function processDishData(data) {
    const newDishes = [];
    if (!Array.isArray(data) || data.length === 0) return;

    // 表头驱动：按标题定位列索引
    const headers = (data[0] || []).map(h => String(h || '').trim());
    const lower = headers.map(h => h.toLowerCase());
    const pickIndex = (cands) => {
        for (const c of cands) {
            const idx = lower.indexOf(String(c).toLowerCase());
            if (idx !== -1) return idx;
        }
        return -1;
    };

    const iImage = pickIndex(['图片链接','图片URL','图片','image','图片地址']);
    const iNameCN = pickIndex(['中文翻译','中文名','菜品名称','名称','name','中文名称']);
    const iNameJP = pickIndex(['日文名','日文名称','原名','日语名']);
    const iSmart  = pickIndex(['智能分类','分类(智能)','AI分类','智能标签']);
    const iOrig   = pickIndex(['原始分类','分类']);
    const iPrice  = pickIndex(['价格','价钱','列4','price']);
    const iShop   = pickIndex(['店名','店铺','商家','门店','品牌','shop','store','brand']);

    const getCell = (row, idx, def='') => (!row || idx < 0 || idx >= row.length) ? def : row[idx];
    const extractPrice = (v) => {
        if (typeof v === 'number') return Number(v) || 0;
        return parseFloat(String(v || '').replace(/[^\d.]/g, '')) || 0;
    };
    const normalizeCategory = (v) => {
        const text = String(v || '').trim();
        if (!text) return '未分类';
        const parts = text.split(/[,，、\/\\|]+/).map(s => s.trim()).filter(Boolean);
        return parts[0] || '未分类';
    };
    const pickName = (row) => {
        const cn = String(getCell(row, iNameCN, '') || '').trim();
        if (cn) return cn;
        const jp = String(getCell(row, iNameJP, '') || '').trim();
        if (jp) return jp;
        return '未命名';
    };

    // 跳过标题行，从第二行开始处理
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row) continue;

        const image = String(getCell(row, iImage, '') || '').trim();
        const nameCN = String(getCell(row, iNameCN, '') || '').trim();
        const nameJP = String(getCell(row, iNameJP, '') || '').trim();
        const name = nameCN || nameJP || pickName(row);
        let category = normalizeCategory(getCell(row, iSmart, ''));
        if (!category || category === '未分类') {
            category = normalizeCategory(getCell(row, iOrig, ''));
        }
        const price = extractPrice(getCell(row, iPrice, ''));
        const shop = String(getCell(row, iShop, '') || '').trim();

        if (!image || !name) continue;

        newDishes.push({
            image,
            name,
            name_cn: nameCN,
            name_jp: nameJP,
            shop,
            category,
            price,
            description: ''
        });
    }

    dishesData = [...dishesData, ...newDishes];
    filteredData = [...dishesData];
    updateDisplay();
}

function updateDisplay() {
    updateStats();
    updateCategoryFilter();
    renderDishes();
}

function updateStats() {
    const totalDishes = filteredData.length;
    const categories = [...new Set(filteredData.map(dish => dish.category))];
    const avgPrice = totalDishes > 0 ? 
        filteredData.reduce((sum, dish) => sum + (dish.price || 0), 0) / totalDishes : 0;

    document.getElementById('totalDishes').textContent = totalDishes;
    document.getElementById('totalCategories').textContent = categories.length;
    document.getElementById('avgPrice').textContent = `¥${Math.round(avgPrice)}`;
}

function updateCategoryFilter() {
    const categories = [...new Set(dishesData.map(dish => dish.category))];
    const select = document.getElementById('categoryFilter');
    const currentValue = select.value;
    
    select.innerHTML = '<option value="">全部分类</option>';
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        select.appendChild(option);
    });
    
    select.value = currentValue;
}

function renderDishes() {
    const grid = document.getElementById('dishGrid');
    
    if (filteredData.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <h3>没有找到匹配的菜品</h3>
                <p>尝试调整筛选条件或上传更多数据</p>
            </div>
        `;
        return;
    }

    const fallback = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik0xNTAgMTAwQzE1MCA4Ni4xOTI5IDE1MCA3Mi4zODU4IDE1MCA1OC41Nzg3QzE1MCA0NC43NzE2IDE1MCAzMC45NjQ1IDE1MCAyMC4xNTc0QzE1MCA5LjM1MDMgMTUwIDAgMTUwIDBIMTUwQzE1MCA5LjM1MDMgMTUwIDE4LjcwMDYgMTUwIDI4LjA1MDlDMTUwIDM3LjQwMTIgMTUwIDQ2Ljc1MTUgMTUwIDU2LjEwMThDMTUwIDY1LjQ1MjEgMTUwIDc0LjgwMjQgMTUwIDg0LjE1MjdDMTUwIDkzLjUwMyAxNTAgMTAyLjg1MyAxNTAgMTEyLjIwM0MxNTAgMTIxLjU1MyAxNTAgMTMwLjkwMyAxNTAgMTQwLjI1M0MxNTAgMTQ5LjYwMyAxNTAgMTU4Ljk1MyAxNTAgMTY4LjMwM0MxNTAgMTc3LjY1MyAxNTAgMTg3LjAwMyAxNTAgMTk2LjM1M0MxNTAgMjAwIDE1MCAyMDAgMTUwIDIwMEgxNTBDMTUwIDIwMCAxNTAgMjAwIDE1MCAyMDBWMTAwWiIgZmlsbD0iI0RFRTJFNiIvPgo8dGV4dCB4PSIxNTAiIHk9IjEwNSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzZDNzU3RCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0Ij7lm77niYfkuI3lrZjlnKg8L3RleHQ+Cjwvc3ZnPgo=';
    grid.innerHTML = filteredData.map(dish => `
        <div class="dish-card" data-dish-index="${dishesData.indexOf(dish)}" title="点击查看详情" role="button" tabindex="0" aria-label="查看菜品：${dish.name}">
            <img src="${dish.image}" alt="${dish.name}" class="dish-image"
                 loading="lazy" decoding="async" referrerpolicy="no-referrer"
                 data-loading="true"
                 onload="this.removeAttribute('data-loading')"
                 onerror="this.src='${fallback}'; this.removeAttribute('data-loading')">
            <div class="dish-info">
                <div class="dish-name">${dish.name}</div>
                <div class="dish-category">${dish.category}</div>
                <div class="dish-price">¥${dish.price}</div>
            </div>
        </div>
    `).join('');

    // 键盘可达：回车/空格打开详情
    const dishGrid = document.getElementById('dishGrid');
    dishGrid.addEventListener('keydown', (e) => {
        const card = e.target.closest('.dish-card');
        if (!card) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const idx = Number(card.dataset.dishIndex);
            if (!Number.isNaN(idx) && dishesData[idx]) {
                openDishDetail(dishesData[idx]);
            }
        }
    });

    // 点击打开详情（事件委托，兜底一次绑定，避免重复）
    if (!dishGrid.dataset.clickBound) {
        dishGrid.addEventListener('click', (e) => {
            const card = e.target.closest('.dish-card');
            if (!card) return;
            const idx = Number(card.dataset.dishIndex);
            if (Number.isNaN(idx) || !dishesData[idx]) return;
            openDishDetail(dishesData[idx]);
        });
        dishGrid.dataset.clickBound = '1';
    }
}

function applyFilters() {
    const category = document.getElementById('categoryFilter').value;
    const minPrice = parseFloat(document.getElementById('minPrice').value) || 0;
    const maxPrice = parseFloat(document.getElementById('maxPrice').value) || Infinity;
    const searchTerm = (document.getElementById('searchInput').value || '').toLowerCase();
    const sortBy = document.getElementById('sortBy').value;

    filteredData = dishesData.filter(dish => {
        const matchesCategory = !category || dish.category === category;
        const matchesPrice = (dish.price || 0) >= minPrice && (dish.price || 0) <= maxPrice;
        const matchesSearch = !searchTerm || (dish.name || '').toLowerCase().includes(searchTerm);
        
        return matchesCategory && matchesPrice && matchesSearch;
    });

    // 排序
    filteredData.sort((a, b) => {
        switch (sortBy) {
            case 'name':
                return (a.name || '').localeCompare(b.name || '');
            case 'price-asc':
                return (a.price || 0) - (b.price || 0);
            case 'price-desc':
                return (b.price || 0) - (a.price || 0);
            case 'category':
                return (a.category || '').localeCompare(b.category || '');
            default:
                return 0;
        }
    });

    updateStats();
    renderDishes();
    refreshDataSummary();
}

function clearFilters() {
    document.getElementById('categoryFilter').value = '';
    document.getElementById('minPrice').value = '';
    document.getElementById('maxPrice').value = '';
    document.getElementById('searchInput').value = '';
    document.getElementById('sortBy').value = 'name';
    
    filteredData = [...dishesData];
    updateDisplay();
    refreshDataSummary();
}

function clearAllData() {
    if (!confirm('确认清空所有菜品数据？此操作不可撤销。')) return;

    // 清空数据
    dishesData = [];
    filteredData = [];

    // 重置筛选控件
    document.getElementById('categoryFilter').value = '';
    document.getElementById('minPrice').value = '';
    document.getElementById('maxPrice').value = '';
    document.getElementById('searchInput').value = '';
    document.getElementById('sortBy').value = 'name';

    // 关闭详情弹窗（如已打开）
    closeDishDetail();

    // 刷新界面与统计/摘要
    updateDisplay();
    refreshDataSummary();

    showNotification('已清空所有菜品数据', 'success');
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.setAttribute('role', 'status');
    notification.setAttribute('aria-live', 'polite');
    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add('show'), 50);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 250);
    }, 3000);
}

// ========== AI 功能 ==========

function setupAIUI() {
    const toggleBtn = document.getElementById('chatToggleBtn');
    const chatCloseBtn = document.getElementById('chatCloseBtn');
    const panel = document.getElementById('chatPanel');
    const sendBtn = document.getElementById('chatSendBtn');
    const input = document.getElementById('chatInput');
    const useFiltered = document.getElementById('useFiltered');
    const toggleKeyVisibility = document.getElementById('toggleKeyVisibility');

    toggleBtn.addEventListener('click', () => {
        panel.classList.toggle('open');
        if (panel.classList.contains('open')) {
            input.focus();
        }
    });

    chatCloseBtn.addEventListener('click', () => {
        panel.classList.remove('open');
    });

    sendBtn.addEventListener('click', () => sendAIMessage());
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendAIMessage();
        }
    });

    useFiltered.addEventListener('change', refreshDataSummary);

    // AI 设置按钮
    document.getElementById('saveAIConfigBtn').addEventListener('click', saveAIConfig);
    document.getElementById('testAIConfigBtn').addEventListener('click', testAIConnection);
    document.getElementById('clearAIConfigBtn').addEventListener('click', clearAIConfig);

    toggleKeyVisibility.addEventListener('click', (e) => {
        e.preventDefault();
        const apiKeyInput = document.getElementById('aiApiKey');
        apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
    });

    // 菜品卡片点击（事件委托，兜底：renderDishes 里也做了绑定保护）
    const dishGrid = document.getElementById('dishGrid');
    if (!dishGrid.dataset.clickBound) {
        dishGrid.addEventListener('click', (e) => {
            const card = e.target.closest('.dish-card');
            if (!card) return;
            const idx = Number(card.dataset.dishIndex);
            if (Number.isNaN(idx) || !dishesData[idx]) return;
            openDishDetail(dishesData[idx]);
        });
        dishGrid.dataset.clickBound = '1';
    }

    // 弹窗关闭交互
    const overlay = document.getElementById('dishDetailOverlay');
    const detailCloseBtn = document.getElementById('dishDetailCloseBtn');
    if (overlay) overlay.addEventListener('click', closeDishDetail);
    if (detailCloseBtn) detailCloseBtn.addEventListener('click', closeDishDetail);

    // 快捷键：Esc 关闭模态/聊天；/ 聚焦搜索
    document.addEventListener('keydown', (e) => {
        // 如果是输入/文本域/选择控件，忽略快捷键
        const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
        const isTyping = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;

        if (e.key === 'Escape') {
            closeDishDetail();
            const chat = document.getElementById('chatPanel');
            if (chat) chat.classList.remove('open');
        }

        if (!isTyping && e.key === '/') {
            e.preventDefault();
            const si = document.getElementById('searchInput');
            if (si) si.focus();
        }
    });
}

function loadAIConfig() {
    aiConfig.baseUrl = localStorage.getItem(AI_STORAGE_KEYS.baseUrl) || '';
    aiConfig.apiKey = localStorage.getItem(AI_STORAGE_KEYS.apiKey) || '';
    aiConfig.modelId = localStorage.getItem(AI_STORAGE_KEYS.modelId) || '';

    document.getElementById('aiBaseUrl').value = aiConfig.baseUrl;
    document.getElementById('aiApiKey').value = aiConfig.apiKey;
    document.getElementById('aiModelId').value = aiConfig.modelId;
}

function saveAIConfig() {
    const baseUrl = (document.getElementById('aiBaseUrl').value || '').trim();
    const apiKey = (document.getElementById('aiApiKey').value || '').trim();
    const modelId = (document.getElementById('aiModelId').value || '').trim();

    // 验证模型ID格式，移除多余空格和特殊字符
    const cleanedModelId = modelId.replace(/\s+/g, ' ').trim();
    
    aiConfig.baseUrl = baseUrl;
    aiConfig.apiKey = apiKey;
    aiConfig.modelId = cleanedModelId;

    localStorage.setItem(AI_STORAGE_KEYS.baseUrl, baseUrl);
    localStorage.setItem(AI_STORAGE_KEYS.apiKey, apiKey);
    localStorage.setItem(AI_STORAGE_KEYS.modelId, cleanedModelId);

    // 更新输入框中的值，确保一致性
    document.getElementById('aiModelId').value = cleanedModelId;

    showNotification('AI 设置已保存', 'success');
}

function clearAIConfig() {
    localStorage.removeItem(AI_STORAGE_KEYS.baseUrl);
    localStorage.removeItem(AI_STORAGE_KEYS.apiKey);
    localStorage.removeItem(AI_STORAGE_KEYS.modelId);

    aiConfig.baseUrl = '';
    aiConfig.apiKey = '';
    aiConfig.modelId = '';

    document.getElementById('aiBaseUrl').value = '';
    document.getElementById('aiApiKey').value = '';
    document.getElementById('aiModelId').value = '';

    showNotification('已清除本地保存的 AI 凭据', 'success');
}

function trimBaseUrl(url) {
    if (!url) return '';
    return url.replace(/\/+$/, '');
}

async function testAIConnection() {
    // 读取最新输入并保存配置
    saveAIConfig();
    
    if (!aiConfig.baseUrl || !aiConfig.apiKey) {
        showNotification('请先填写 Base URL 和 API Key', 'error');
        return;
    }

    const base = trimBaseUrl(aiConfig.baseUrl);

    // 优先尝试 /v1/models（不保证所有服务可用/有 CORS）
    try {
        const res = await fetchWithTimeout(`${base}/v1/models`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${aiConfig.apiKey}`
            }
        }, 10000);

        if (res.ok) {
            showNotification('测试成功：/v1/models 可访问', 'success');
            return;
        }
    } catch (e) {
        // 忽略，走对话回退
    }

    // 回退：发起一个极小的对话请求（可能产生极少 token 费用）
    if (!aiConfig.modelId) {
        showNotification('测试失败：/v1/models 不可用，请填写 Model ID 后再试最小对话测试', 'error');
        return;
    }

    try {
        const endpoint = `${base}/v1/chat/completions`;
        const body = {
            model: aiConfig.modelId,
            temperature: 0,
            max_tokens: 4,
            messages: [
                { role: 'system', content: '你是测试探活助手。仅回复“ok”两个字符。' },
                { role: 'user', content: 'ping' }
            ]
        };
        const res = await fetchWithTimeout(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${aiConfig.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        }, 15000);

        if (!res.ok) {
            const text = await safeReadText(res);
            let errorMsg = `HTTP ${res.status}: ${text.slice(0, 200)}`;
            try {
                const errorJson = JSON.parse(text);
                if (errorJson.error && errorJson.error.message) {
                    errorMsg = errorJson.error.message;
                }
            } catch (e) {
                // 如果JSON解析失败，保持原错误信息
            }
            throw new Error(errorMsg);
        }

        const data = await res.json();
        const reply = data?.choices?.[0]?.message?.content || '';
        if (reply.toLowerCase().includes('ok')) {
            showNotification('测试成功：对话接口可用', 'success');
        } else {
            showNotification('测试返回异常，但接口可访问', 'success');
        }
    } catch (e) {
        console.error(e);
        showNotification(`测试失败：${e.message || e}`, 'error');
    }
}

function getActiveDishData() {
    const useFiltered = document.getElementById('useFiltered')?.checked;
    if (useFiltered && filteredData.length > 0) {
        return filteredData;
    }
    return dishesData;
}

function buildKnowledge(data, maxItems = 200) {
    const items = (data || []).slice(0, maxItems).map((d, idx) => {
        const priceNum = typeof d.price === 'number' ? d.price : parseFloat(String(d.price || '0').replace(/[^\d.]/g, '')) || 0;
        const nameCN = (d.name_cn || '').toString().trim();
        const nameJP = (d.name_jp || '').toString().trim();
        const shop = (d.shop || '').toString().trim();
        const baseName = (d.name || nameCN || nameJP || '').toString().trim();
        const nameDisplay = (nameCN && nameJP) ? `${nameCN}（${nameJP}）` : (nameCN || nameJP || baseName || '未命名');
        const category = (d.category || '未分类').toString().trim();
        return `${idx + 1}. 名称: ${nameDisplay} | 店名: ${shop || '未知'} | 分类: ${category} | 价格: ${priceNum}`;
    });
    return items.join('\n');
}

function buildSystemPrompt(knowledge) {
    return [
        '你是一个菜品数据助理。你只能依据下面提供的“知识库”进行回答。',
        '如果问题超出知识库范围，直接回答“我不知道”。',
        '当用户要求统计/排序时，请基于知识库数据进行计算，并尽量简洁清晰地给出结果；可使用项目符号或简单表格风格（文本对齐）展示。',
        '当被询问某道菜的店名时，请直接根据知识库条目里的“店名”字段作答；若未出现则回答“我不知道”。',
        '价格如需输出，请以¥前缀或纯数字给出。',
        '',
        '【知识库】',
        knowledge || '(空)'
    ].join('\n');
}

function appendChatMessage(role, content) {
    const messagesEl = document.getElementById('chatMessages');
    const wrapper = document.createElement('div');
    wrapper.className = `chat-message ${role}`;
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = content;
    wrapper.appendChild(bubble);
    messagesEl.appendChild(wrapper);
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

function refreshDataSummary() {
    const data = getActiveDishData();
    const el = document.getElementById('dataSummary');
    if (el) el.textContent = `数据：${data.length} 条`;
}

async function sendAIMessage() {
    // 先保存当前配置，确保使用最新值
    saveAIConfig();
    
    if (!aiConfig.baseUrl || !aiConfig.apiKey || !aiConfig.modelId) {
        showNotification('请先完整填写 Base URL、API Key 和 Model ID', 'error');
        return;
    }

    const data = getActiveDishData();
    if (!data || data.length === 0) {
        showNotification('当前没有菜品数据，请先上传或使用示例数据', 'error');
        return;
    }

    const inputEl = document.getElementById('chatInput');
    const sendBtn = document.getElementById('chatSendBtn');
    const userText = (inputEl.value || '').trim();
    if (!userText) return;

    appendChatMessage('user', userText);
    inputEl.value = '';
    sendBtn.disabled = true;
    sendBtn.textContent = '发送中...';

    try {
        const knowledge = buildKnowledge(data, 200);
        const systemPrompt = buildSystemPrompt(knowledge);

        // 保留最近 6 条历史（3 来回），避免过长
        const trimmedHistory = chatHistory.slice(-6);
        const messages = [
            { role: 'system', content: systemPrompt },
            ...trimmedHistory,
            { role: 'user', content: userText }
        ];

        const endpoint = `${trimBaseUrl(aiConfig.baseUrl)}/v1/chat/completions`;
        const body = {
            model: aiConfig.modelId,
            temperature: 0.2,
            messages
        };

        const res = await fetchWithTimeout(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${aiConfig.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        }, 30000);

        if (!res.ok) {
            const text = await safeReadText(res);
            let errorMsg = `HTTP ${res.status}: ${text.slice(0, 500)}`;
            try {
                const errorJson = JSON.parse(text);
                if (errorJson.error && errorJson.error.message) {
                    errorMsg = errorJson.error.message;
                }
            } catch (e) {
                // 如果JSON解析失败，保持原错误信息
            }
            throw new Error(errorMsg);
        }

        const dataRes = await res.json();
        const reply = dataRes?.choices?.[0]?.message?.content?.trim();
        if (!reply) throw new Error('接口返回为空');

        appendChatMessage('assistant', reply);

        // 更新历史
        chatHistory.push({ role: 'user', content: userText });
        chatHistory.push({ role: 'assistant', content: reply });
    } catch (err) {
        console.error(err);
        const msg = String(err?.message || err || '请求失败');
        showNotification(msg, 'error');
        appendChatMessage('assistant', `抱歉，请求失败：${msg}`);
    } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = '发送';
        refreshDataSummary();
    }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        return res;
    } finally {
        clearTimeout(id);
    }
}

async function safeReadText(res) {
    try {
        return await res.text();
    } catch {
        return '';
    }
}

// 工具函数（分类/价格处理）
function extractPrice(value) {
    if (typeof value === 'number') return Number(value) || 0;
    return parseFloat(String(value || '').replace(/[^\d.]/g, '')) || 0;
}
function normalizeCategory(value) {
    const text = String(value || '').trim();
    if (!text) return '未分类';
    const parts = text.split(/[,，、\/\\|]+/).map(s => s.trim()).filter(Boolean);
    return parts[0] || '未分类';
}
function pickIndex(headers, candidates) {
    const lower = (headers || []).map(h => String(h || '').trim().toLowerCase());
    for (const c of candidates) {
        const idx = lower.indexOf(String(c).toLowerCase());
        if (idx !== -1) return idx;
    }
    return -1;
}
function getCell(row, idx, def = '') {
    if (!row || idx < 0 || idx >= row.length) return def;
    return row[idx];
}

// ========== 详情弹窗 ==========
function openDishDetail(dish) {
    const overlay = document.getElementById('dishDetailOverlay');
    const modal = document.getElementById('dishDetailModal');
    if (!overlay || !modal || !dish) return;

    const imgEl = document.getElementById('detailImage');
    const nameEl = document.getElementById('detailName');
    const catEl = document.getElementById('detailCategory');
    const priceEl = document.getElementById('detailPrice');
    const descEl = document.getElementById('detailDesc');

    if (imgEl) {
        imgEl.loading = 'lazy';
        imgEl.decoding = 'async';
        imgEl.referrerPolicy = 'no-referrer';
        imgEl.src = dish.image || '';
        imgEl.alt = (dish.name || dish.name_cn || dish.name_jp || '菜品图片') + '';
    }
    if (nameEl) {
        const displayName = (dish.name_cn && String(dish.name_cn).trim()) || (dish.name && String(dish.name).trim()) || (dish.name_jp && String(dish.name_jp).trim()) || '';
        nameEl.textContent = displayName;
    }
    const nameJPEl = document.getElementById('detailNameJP');
    if (nameJPEl) nameJPEl.textContent = dish.name_jp || '';
    const nameCNEl = document.getElementById('detailNameCN');
    if (nameCNEl) nameCNEl.textContent = dish.name_cn || '';
    const shopEl = document.getElementById('detailShop');
    if (shopEl) shopEl.textContent = dish.shop || '';
    if (catEl) catEl.textContent = dish.category || '未分类';
    if (priceEl) {
        const priceNum = typeof dish.price === 'number' ? dish.price : parseFloat(String(dish.price || '0').replace(/[^\d.]/g, '')) || 0;
        priceEl.textContent = `¥${priceNum}`;
    }
    if (descEl) {
        const desc = (dish.description || '').toString().trim();
        descEl.textContent = desc;
        descEl.style.display = desc ? '' : 'none';
    }

    overlay.classList.add('show');
    modal.classList.add('show');
    document.body.classList.add('modal-open');

    const closeBtn = document.getElementById('dishDetailCloseBtn');
    if (closeBtn) {
        setTimeout(() => closeBtn.focus(), 0);
    }
}

function closeDishDetail() {
    const overlay = document.getElementById('dishDetailOverlay');
    const modal = document.getElementById('dishDetailModal');
    if (overlay) overlay.classList.remove('show');
    if (modal) modal.classList.remove('show');
    document.body.classList.remove('modal-open');
}
