/**
 * YouTube API Manager
 * 用于管理YouTube Data API v3密钥的工具
 * 支持多个API密钥的添加、删除和轮换使用
 */

// YouTube API管理器对象
const youtubeApiManager = {
    apiKeys: JSON.parse(localStorage.getItem('youtubeApiKeys')) || [],
    currentKeyIndex: 0,
    
    addApiKey: function(key) {
        if (key && !this.apiKeys.includes(key)) {
            this.apiKeys.push(key);
            localStorage.setItem('youtubeApiKeys', JSON.stringify(this.apiKeys));
            return true;
        }
        return false;
    },
    
    removeApiKey: function(index) {
        if (index >= 0 && index < this.apiKeys.length) {
            this.apiKeys.splice(index, 1);
            localStorage.setItem('youtubeApiKeys', JSON.stringify(this.apiKeys));
            return true;
        }
        return false;
    },
    
    getCurrentKey: function() {
        if (this.apiKeys.length === 0) {
            return null;
        }
        return this.apiKeys[this.currentKeyIndex];
    },
    
    rotateKey: function() {
        if (this.apiKeys.length <= 1) return;
        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
        return this.getCurrentKey();
    }
};

// API Key Management Modal
function openApiKeyModal() {
    // Create modal if it doesn't exist
    if (!document.querySelector('.apikey-modal')) {
        createApiKeyModal();
    }
    
    // Update the API key list
    updateApiKeyList();
    
    // Show the modal
    const modal = document.querySelector('.apikey-modal');
    modal.style.display = 'block';
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
}

function closeApiKeyModal() {
    const modal = document.querySelector('.apikey-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}

function createApiKeyModal() {
    const modal = document.createElement('div');
    modal.className = 'apikey-modal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h2>YouTube API密钥管理</h2>
            <p>请添加至少一个YouTube Data API v3密钥以使用分析功能</p>
            
            <div class="api-key-form">
                <div class="input-group">
                    <label for="api-key">API密钥</label>
                    <input type="text" id="api-key" placeholder="输入您的YouTube Data API v3密钥">
                </div>
                <button id="add-api-key" class="primary-button">添加密钥</button>
            </div>
            
            <div class="api-keys-list">
                <h3>已添加的API密钥</h3>
                <div class="keys-container"></div>
            </div>
            
            <div class="api-key-help">
                <h4>如何获取YouTube API密钥？</h4>
                <ol>
                    <li>访问 <a href="https://console.developers.google.com/" target="_blank">Google Cloud Console</a></li>
                    <li>创建新项目或选择现有项目</li>
                    <li>启用 YouTube Data API v3</li>
                    <li>在"凭据"页面创建API密钥</li>
                    <li>复制API密钥并粘贴到上方输入框</li>
                </ol>
            </div>
            
            <button id="continue-to-analysis" class="primary-button" style="margin-top: 20px;">继续到分析</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    document.querySelector('.apikey-modal .close-modal').addEventListener('click', closeApiKeyModal);
    document.getElementById('add-api-key').addEventListener('click', addApiKey);
    document.getElementById('continue-to-analysis').addEventListener('click', function() {
        if (youtubeApiManager.apiKeys.length > 0) {
            closeApiKeyModal();
            // 触发自定义事件以便调用页面可以响应
            const event = new CustomEvent('apikeycontinue');
            document.dispatchEvent(event);
        } else {
            showToast('请至少添加一个API密钥', 'error');
        }
    });
    
    // Add modal styles
    const modalStyles = `
        .apikey-modal {
            display: none;
            position: fixed;
            z-index: 2000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            opacity: 0;
            transition: opacity 0.3s ease;
            overflow-y: auto;
        }
        
        .apikey-modal.active {
            opacity: 1;
        }
        
        .modal-content {
            position: relative;
            background-color: #fff;
            margin: 5vh auto;
            padding: 30px;
            width: 90%;
            max-width: 800px;
            border-radius: 12px;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
            transform: translateY(20px);
            transition: transform 0.3s ease;
        }
        
        .apikey-modal.active .modal-content {
            transform: translateY(0);
        }
        
        .close-modal {
            position: absolute;
            top: 20px;
            right: 20px;
            font-size: 28px;
            font-weight: bold;
            color: #666;
            cursor: pointer;
        }
        
        .api-key-form {
            margin: 30px 0;
        }
        
        .keys-container {
            margin: 15px 0;
            max-height: 200px;
            overflow-y: auto;
            background: #f9fafb;
            border-radius: 8px;
            padding: 10px;
        }
        
        .api-key-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .api-key-item:last-child {
            border-bottom: none;
        }
        
        .api-key-value {
            font-family: monospace;
            background: #e0e7ff;
            padding: 5px 10px;
            border-radius: 4px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            max-width: 300px;
        }
        
        .api-key-remove {
            background: transparent;
            color: #ef4444;
            border: none;
            cursor: pointer;
            font-size: 18px;
        }
        
        .api-key-help {
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
        }
        
        .api-key-help h4 {
            margin-bottom: 10px;
        }
        
        .api-key-help ol {
            padding-left: 20px;
        }
        
        .api-key-help li {
            margin-bottom: 8px;
        }
        
        .api-key-help a {
            color: #6366f1;
            text-decoration: none;
        }
        
        .api-key-help a:hover {
            text-decoration: underline;
        }
        
        .input-group {
            margin-bottom: 15px;
        }
        
        .input-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
        }
        
        .input-group input {
            width: 100%;
            padding: 12px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            font-size: 16px;
            transition: border 0.3s ease;
        }
        
        .input-group input:focus {
            border-color: #6366f1;
            outline: none;
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = modalStyles;
    document.head.appendChild(styleSheet);
}

function addApiKey() {
    const apiKeyInput = document.getElementById('api-key');
    const key = apiKeyInput.value.trim();
    
    if (!key) {
        showToast('请输入有效的API密钥', 'error');
        return;
    }
    
    if (youtubeApiManager.addApiKey(key)) {
        apiKeyInput.value = '';
        updateApiKeyList();
        showToast('API密钥已添加', 'success');
    } else {
        showToast('此API密钥已存在', 'error');
    }
}

function updateApiKeyList() {
    const keysContainer = document.querySelector('.keys-container');
    if (!keysContainer) return;
    
    keysContainer.innerHTML = '';
    
    if (youtubeApiManager.apiKeys.length === 0) {
        keysContainer.innerHTML = '<p>尚未添加任何API密钥</p>';
        return;
    }
    
    youtubeApiManager.apiKeys.forEach((key, index) => {
        const keyItem = document.createElement('div');
        keyItem.className = 'api-key-item';
        
        // Mask the API key (show first 6 and last 4 characters)
        const maskedKey = key.length > 10 
            ? key.substring(0, 6) + '...' + key.substring(key.length - 4) 
            : key;
        
        keyItem.innerHTML = `
            <div class="api-key-value">${maskedKey}</div>
            <button class="api-key-remove" data-index="${index}">&times;</button>
        `;
        
        keysContainer.appendChild(keyItem);
    });
    
    // Add event listeners to remove buttons
    document.querySelectorAll('.api-key-remove').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            if (youtubeApiManager.removeApiKey(index)) {
                updateApiKeyList();
                showToast('API密钥已删除', 'success');
            }
        });
    });
}

// Toast notification system
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // Add toast styles
    Object.assign(toast.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '12px 24px',
        borderRadius: '8px',
        color: 'white',
        fontWeight: '500',
        zIndex: '9999',
        opacity: '0',
        transform: 'translateX(100%)',
        transition: 'all 0.3s ease'
    });
    
    // Set background color based on type
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#6366f1'
    };
    toast.style.backgroundColor = colors[type] || colors.info;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// 为了方便其他页面使用，将所有功能暴露出去
window.YouTubeApiManager = {
    manager: youtubeApiManager,
    openApiKeyModal: openApiKeyModal,
    closeApiKeyModal: closeApiKeyModal,
    showToast: showToast
};