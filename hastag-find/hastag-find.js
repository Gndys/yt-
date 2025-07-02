// Mobile menu toggle
document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }
    
    // Smooth scrolling for navigation links
    const navLinks = document.querySelectorAll('a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const headerHeight = document.querySelector('.header').offsetHeight;
                const targetPosition = targetSection.offsetTop - headerHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Header background on scroll
    const header = document.querySelector('.header');
    window.addEventListener('scroll', function() {
        if (window.scrollY > 100) {
            header.style.background = 'rgba(255, 255, 255, 0.98)';
        } else {
            header.style.background = 'rgba(255, 255, 255, 0.95)';
        }
    });
    
    // Intersection Observer for animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    const animatedElements = document.querySelectorAll('.feature-card, .testimonial-card, .step');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
    
    // YouTube API Manager
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
    
    // Button click handlers for YouTube Competitor Analysis Tool
    const ctaButtons = document.querySelectorAll('.cta-button, .primary-button');
    ctaButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Check if we have any API keys first
            if (youtubeApiManager.apiKeys.length === 0) {
                openApiKeyModal();
            } else {
                openAnalysisModal();
            }
        });
    });
    
    // Demo button handler
    const demoButton = document.querySelector('.secondary-button');
    if (demoButton) {
        demoButton.addEventListener('click', function() {
            // Show a demo video or process
            showToast('演示功能即将推出', 'info');
        });
    }
    
    // Counter animation for stats
    function animateCounter(element, target, duration = 2000) {
        let start = 0;
        const increment = target / (duration / 16);
        
        function updateCounter() {
            start += increment;
            if (start < target) {
                element.textContent = Math.floor(start).toLocaleString() + '+';
                requestAnimationFrame(updateCounter);
            } else {
                element.textContent = target.toLocaleString() + '+';
            }
        }
        
        updateCounter();
    }
    
    // Animate stats when they come into view
    const statsObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const statNumber = entry.target.querySelector('.stat-number');
                if (statNumber && !statNumber.classList.contains('animated')) {
                    statNumber.classList.add('animated');
                    const text = statNumber.textContent;
                    const number = parseInt(text.replace(/[^0-9]/g, ''));
                    if (number) {
                        animateCounter(statNumber, number);
                    }
                }
            }
        });
    }, { threshold: 0.5 });
    
    const stats = document.querySelectorAll('.stat');
    stats.forEach(stat => {
        statsObserver.observe(stat);
    });
    
    // Form validation for YouTube channel inputs
    function validateYouTubeChannel(channelInput) {
        // This will handle both channel IDs (UC...) and full URLs
        if (!channelInput || channelInput.trim() === '') return false;
        
        // Extract channel ID if it's a URL
        let channelId = channelInput.trim();
        
        // Check if it's a YouTube URL
        if (channelId.includes('youtube.com/')) {
            // Try to extract the channel ID
            const urlPattern = /youtube\.com\/(channel|c|user|@)\/([^\/\?]+)/;
            const match = channelId.match(urlPattern);
            
            if (match && match[2]) {
                channelId = match[2];
            } else {
                return false; // Invalid YouTube URL format
            }
        }
        
        return true;
    }
    
    // Extract channel ID from different YouTube URL formats
    function extractChannelId(channelInput) {
        let channelId = channelInput.trim();
        
        // If it's already a channel ID (starts with UC)
        if (/^UC[\w-]{21,24}$/.test(channelId)) {
            return channelId;
        }
        
        // Extract from YouTube URL formats
        if (channelId.includes('youtube.com/')) {
            // Channel format: youtube.com/channel/UC...
            if (channelId.includes('/channel/')) {
                const match = channelId.match(/youtube\.com\/channel\/(UC[\w-]{21,24})/);
                if (match && match[1]) return match[1];
            }
            
            // Custom URL format: youtube.com/c/ChannelName or youtube.com/@ChannelName
            // These require an additional API call to resolve to channel ID
            if (channelId.includes('/c/') || channelId.includes('/user/') || channelId.includes('/@')) {
                // Return the handle to be resolved later
                const match = channelId.match(/youtube\.com\/(c|user|@)\/([^\/\?]+)/);
                if (match && match[2]) return match[2];
            }
        }
        
        // Return as is if we couldn't parse it
        return channelId;
    }
    
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
                openAnalysisModal();
            } else {
                showToast('请至少添加一个API密钥', 'error');
            }
        });
        
        // Add modal styles (reuse styles from analysis modal)
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
    
    // YouTube Competitor Analysis Modal Functions
    function openAnalysisModal() {
        // Create modal if it doesn't exist
        if (!document.querySelector('.analysis-modal')) {
            createAnalysisModal();
        }
        
        // Reset the analysis form
        resetAnalysisForm();
        
        // Show the modal
        const modal = document.querySelector('.analysis-modal');
        modal.style.display = 'block';
        setTimeout(() => {
            modal.classList.add('active');
        }, 10);
    }
    
    function closeAnalysisModal() {
        const modal = document.querySelector('.analysis-modal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
    }
    
    function resetAnalysisForm() {
        // Clear channel inputs
        const channelInputs = document.querySelectorAll('#channel1, #channel2, #channel3');
        channelInputs.forEach(input => input.value = '');
        
        // Hide results and show analyze button
        if (document.querySelector('.analysis-results')) {
            document.querySelector('.analysis-results').style.display = 'none';
        }
        
        if (document.querySelector('.analysis-status')) {
            document.querySelector('.analysis-status').style.display = 'none';
        }
        
        if (document.getElementById('analyze-btn')) {
            document.getElementById('analyze-btn').style.display = 'block';
        }
    }
    
    function createAnalysisModal() {
        const modal = document.createElement('div');
        modal.className = 'analysis-modal';
        
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <h2>YouTube对标账号分析</h2>
                <p>请输入三个YouTube频道ID或完整链接进行分析</p>
                
                <div class="api-settings">
                    <button id="manage-api-keys" class="secondary-button">
                        <i class="fas fa-key"></i>
                        管理API密钥
                    </button>
                    <div class="api-status">
                        已配置 <span id="api-key-count">${youtubeApiManager.apiKeys.length}</span> 个API密钥
                    </div>
                </div>
                
                <div class="channel-inputs">
                    <div class="input-group">
                        <label for="channel1">频道1</label>
                        <input type="text" id="channel1" placeholder="例如：UCxxx或https://youtube.com/channel/UCxxx">
                    </div>
                    <div class="input-group">
                        <label for="channel2">频道2</label>
                        <input type="text" id="channel2" placeholder="例如：UCxxx或https://youtube.com/channel/UCxxx">
                    </div>
                    <div class="input-group">
                        <label for="channel3">频道3</label>
                        <input type="text" id="channel3" placeholder="例如：UCxxx或https://youtube.com/channel/UCxxx">
                    </div>
                </div>
                <button id="analyze-btn" class="primary-button">开始分析</button>
                
                <div class="analysis-status" style="display: none;">
                    <div class="loader"></div>
                    <p class="status-message">正在分析中，请稍候...</p>
                    <div class="progress-container">
                        <div class="progress-bar"></div>
                    </div>
                    <p class="progress-text">步骤 1/5: 获取频道信息</p>
                </div>
                
                <div class="analysis-results" style="display: none;">
                    <h3>分析结果</h3>
                    <div class="results-summary"></div>
                    <div class="competitor-channels">
                        <h4>发现的对标频道</h4>
                        <div class="channels-list"></div>
                    </div>
                    <div class="top-hashtags-container">
                        <h4>热门Hashtags</h4>
                        <div class="top-hashtags"></div>
                    </div>
                    <button id="download-results" class="primary-button">
                        <i class="fas fa-download"></i>
                        下载分析表格
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners
        document.querySelector('.analysis-modal .close-modal').addEventListener('click', closeAnalysisModal);
        document.getElementById('analyze-btn').addEventListener('click', performAnalysis);
        // 更新原来的downloadResults函数调用
        document.getElementById('download-results').addEventListener('click', function() {
            loadJSZip(function(error) {
        downloadResults();
        });
});
        document.getElementById('manage-api-keys').addEventListener('click', function() {
            closeAnalysisModal();
            openApiKeyModal();
        });
        
        // Close modal when clicking outside
        window.addEventListener('click', function(event) {
            if (event.target === modal) {
                closeAnalysisModal();
            }
        });
        
        // Add modal styles
        const modalStyles = `
            .analysis-modal {
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
            
            .analysis-modal.active {
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
            
            .analysis-modal.active .modal-content {
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
            
            .api-settings {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin: 20px 0;
                padding: 10px;
                background: #f9fafb;
                border-radius: 8px;
            }
            
            .api-status {
                color: #6b7280;
            }
            
            #manage-api-keys {
                padding: 8px 16px;
                font-size: 0.9rem;
            }
            
            .channel-inputs {
                margin: 30px 0;
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
            
            .analysis-status {
                text-align: center;
                margin: 30px 0;
            }
            
            .loader {
                display: inline-block;
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #6366f1;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: 15px;
            }
            
            .progress-container {
                margin: 20px 0;
                background: #e5e7eb;
                height: 8px;
                border-radius: 4px;
                overflow: hidden;
            }
            
            .progress-bar {
                height: 100%;
                background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                width: 0%;
                transition: width 0.3s ease;
            }
            
            .progress-text {
                color: #6b7280;
                font-size: 0.9rem;
                margin-top: 8px;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .analysis-results {
                margin-top: 30px;
            }
            
            .results-summary {
                background: #f9fafb;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 20px;
            }
            
            .competitor-channels {
                margin-top: 30px;
            }
            
            .channels-list {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                gap: 15px;
                margin-top: 15px;
            }
            
            .channel-card {
                background: #fff;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 15px;
                display: flex;
                flex-direction: column;
                transition: all 0.3s ease;
            }
            
            .channel-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
            }
            
            .channel-name {
                font-weight: 600;
                margin-bottom: 5px;
                word-break: break-word;
            }
            
            .channel-stats {
                color: #6b7280;
                font-size: 0.85rem;
            }
            
            .channel-link {
                margin-top: 10px;
                font-size: 0.9rem;
                color: #6366f1;
                text-decoration: none;
            }
            
            .channel-link:hover {
                text-decoration: underline;
            }
            
            .top-hashtags-container {
                margin-top: 30px;
                margin-bottom: 30px;
            }
            
            .top-hashtags {
                margin-top: 15px;
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
            }
            
            .hashtag-pill {
                display: inline-block;
                background: #e0e7ff;
                color: #4f46e5;
                padding: 5px 12px;
                border-radius: 20px;
                font-size: 14px;
            }
            
            #download-results {
                margin-top: 20px;
            }
            
            @media (max-width: 768px) {
                .modal-content {
                    width: 95%;
                    padding: 20px;
                }
                
                .channels-list {
                    grid-template-columns: 1fr;
                }
            }
        `;
        
        const styleSheet = document.createElement('style');
        styleSheet.textContent = modalStyles;
        document.head.appendChild(styleSheet);
    }
    
    // Store analysis results for download
    let analysisResults = {
        inputChannels: [],
        topVideos: [],
        hashtags: [],
        competitorChannels: []
    };
    
    // Perform YouTube channel analysis function with real API integration
    async function performAnalysis() {
        const channel1 = document.getElementById('channel1').value;
        const channel2 = document.getElementById('channel2').value;
        const channel3 = document.getElementById('channel3').value;
        
        // Validate inputs
        if (!validateYouTubeChannel(channel1) || 
            !validateYouTubeChannel(channel2) || 
            !validateYouTubeChannel(channel3)) {
            showToast('请输入三个有效的YouTube频道', 'error');
            return;
        }
        
        // Check if we have API keys
        if (youtubeApiManager.apiKeys.length === 0) {
            showToast('请先添加YouTube API密钥', 'error');
            closeAnalysisModal();
            openApiKeyModal();
            return;
        }
        
        // Hide analysis button, show loading status
        document.getElementById('analyze-btn').style.display = 'none';
        const statusElement = document.querySelector('.analysis-status');
        statusElement.style.display = 'block';
        
        // Reset results storage
        analysisResults = {
            inputChannels: [channel1, channel2, channel3],
            topVideos: [],
            hashtags: [],
            competitorChannels: []
        };
        
        try {
            // Step 1: Extract channel IDs
            updateProgress(10, '步骤 1/5: 获取频道信息');
            
            const channelIds = [
                extractChannelId(channel1),
                extractChannelId(channel2),
                extractChannelId(channel3)
            ];
            
            // Step 2: Get top videos from each channel
            updateProgress(30, '步骤 2/5: 获取热门视频');
            
            const allTopVideos = [];
            for (let i = 0; i < channelIds.length; i++) {
                const channelId = channelIds[i];
                try {
                    const topVideos = await getTopVideosFromChannel(channelId, 5);
                    allTopVideos.push(...topVideos);
                } catch (error) {
                    console.error(`Error fetching videos for channel ${channelId}:`, error);
                    // If API key quota exceeded, try to rotate key
                    if (error.message.includes('quota') && youtubeApiManager.apiKeys.length > 1) {
                        youtubeApiManager.rotateKey();
                        i--; // Retry with new key
                    }
                }
            }
            
            analysisResults.topVideos = allTopVideos;
            
            // Step 3: Extract hashtags from videos
            updateProgress(50, '步骤 3/5: 提取视频标签');
            
            const hashtags = extractHashtagsFromVideos(allTopVideos);
            const topHashtags = getTopHashtags(hashtags, 10);
            
            analysisResults.hashtags = topHashtags;
            
            // Step 4: Find related videos using hashtags
            updateProgress(70, '步骤 4/5: 寻找相关视频');
            
            const relatedVideos = [];
            for (let i = 0; i < Math.min(topHashtags.length, 5); i++) {
                try {
                    const videos = await searchVideosByHashtag(topHashtags[i].tag);
                    relatedVideos.push(...videos);
                } catch (error) {
                    console.error(`Error searching videos for hashtag ${topHashtags[i].tag}:`, error);
                    // If API key quota exceeded, try to rotate key
                    if (error.message.includes('quota') && youtubeApiManager.apiKeys.length > 1) {
                        youtubeApiManager.rotateKey();
                        i--; // Retry with new key
                    }
                }
            }
            
            // Step 5: Extract competitor channels
            updateProgress(90, '步骤 5/5: 识别对标频道');
            
            const competitorChannels = extractCompetitorChannels(relatedVideos, channelIds);
            
            analysisResults.competitorChannels = competitorChannels;
            
            // Complete progress
            updateProgress(100, '分析完成');
            
            // Display results
            displayResults(competitorChannels, topHashtags, allTopVideos.length, relatedVideos.length);
            
            // Hide status and show results
            statusElement.style.display = 'none';
            document.querySelector('.analysis-results').style.display = 'block';
            
            showToast('分析完成！', 'success');
        } catch (error) {
            console.error('Analysis error:', error);
            statusElement.style.display = 'none';
            document.getElementById('analyze-btn').style.display = 'block';
            
            showToast('分析过程中出错: ' + error.message, 'error');
        }
    }
    
    // Update progress bar and text
    function updateProgress(percent, message) {
        const progressBar = document.querySelector('.progress-bar');
        const progressText = document.querySelector('.progress-text');
        const statusMessage = document.querySelector('.status-message');
        
        if (progressBar) progressBar.style.width = `${percent}%`;
        if (progressText) progressText.textContent = message;
        if (statusMessage) statusMessage.textContent = '正在分析中，请稍候...';
    }
    
    // Get top videos from a channel using YouTube API
    async function getTopVideosFromChannel(channelId, maxResults = 5) {
        const apiKey = youtubeApiManager.getCurrentKey();
        if (!apiKey) throw new Error('没有可用的API密钥');
        
        // First, search for the channel's uploads playlist
        let searchUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`;
        
        // If it's not a channel ID but a username/custom URL
        if (!channelId.startsWith('UC')) {
            searchUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forUsername=${channelId}&key=${apiKey}`;
        }
        
        const channelResponse = await fetch(searchUrl);
        const channelData = await channelResponse.json();
        
        if (channelData.error) {
            if (channelData.error.errors[0].reason === 'quotaExceeded') {
                throw new Error('API配额已用完');
            }
            throw new Error(channelData.error.message);
        }
        
        if (!channelData.items || channelData.items.length === 0) {
            throw new Error(`未找到频道: ${channelId}`);
        }
        
        const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;
        
        // Get videos from the uploads playlist
        const videosUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=${maxResults}&playlistId=${uploadsPlaylistId}&key=${apiKey}`;
        const videosResponse = await fetch(videosUrl);
        const videosData = await videosResponse.json();
        
        if (videosData.error) {
            if (videosData.error.errors[0].reason === 'quotaExceeded') {
                throw new Error('API配额已用完');
            }
            throw new Error(videosData.error.message);
        }
        
        // Extract video IDs
        const videoIds = videosData.items.map(item => item.snippet.resourceId.videoId);
        
        // Get video statistics
        const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds.join(',')}&key=${apiKey}`;
        const statsResponse = await fetch(statsUrl);
        const statsData = await statsResponse.json();
        
        if (statsData.error) {
            if (statsData.error.errors[0].reason === 'quotaExceeded') {
                throw new Error('API配额已用完');
            }
            throw new Error(statsData.error.message);
        }
        
        // Sort by view count and return top videos
        return statsData.items
            .sort((a, b) => parseInt(b.statistics.viewCount) - parseInt(a.statistics.viewCount))
            .slice(0, maxResults)
            .map(video => ({
                id: video.id,
                title: video.snippet.title,
                description: video.snippet.description,
                channelId: video.snippet.channelId,
                channelTitle: video.snippet.channelTitle,
                viewCount: parseInt(video.statistics.viewCount),
                likeCount: parseInt(video.statistics.likeCount || 0),
                commentCount: parseInt(video.statistics.commentCount || 0),
                publishedAt: video.snippet.publishedAt
            }));
    }
    
    // Extract hashtags from video titles and descriptions
    function extractHashtagsFromVideos(videos) {
        const hashtagMap = new Map();
        
        videos.forEach(video => {
            // Extract from title
            const titleHashtags = (video.title.match(/#\w+/g) || [])
                .map(tag => tag.toLowerCase());
            
            // Extract from description
            const descHashtags = (video.description.match(/#\w+/g) || [])
                .map(tag => tag.toLowerCase());
            
            // Combine and count occurrences
            const allTags = [...new Set([...titleHashtags, ...descHashtags])];
            
            allTags.forEach(tag => {
                if (hashtagMap.has(tag)) {
                    hashtagMap.set(tag, hashtagMap.get(tag) + 1);
                } else {
                    hashtagMap.set(tag, 1);
                }
            });
        });
        
        // Convert to array and sort by frequency
        return Array.from(hashtagMap.entries())
            .map(([tag, count]) => ({ tag, count }));
    }
    
    // Get top hashtags by frequency
    function getTopHashtags(hashtags, count = 10) {
        return hashtags
            .sort((a, b) => b.count - a.count)
            .slice(0, count);
    }
    
    // Search videos by hashtag
    async function searchVideosByHashtag(hashtag) {
        const apiKey = youtubeApiManager.getCurrentKey();
        if (!apiKey) throw new Error('没有可用的API密钥');
        
        // Remove # from hashtag if present
        const query = hashtag.startsWith('#') ? hashtag.substring(1) : hashtag;
        
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=10&order=viewCount&key=${apiKey}`;
        
        const response = await fetch(searchUrl);
        const data = await response.json();
        
        if (data.error) {
            if (data.error.errors[0].reason === 'quotaExceeded') {
                throw new Error('API配额已用完');
            }
            throw new Error(data.error.message);
        }
        
        // Get video details and statistics
        const videoIds = data.items.map(item => item.id.videoId).join(',');
        
        if (!videoIds) return [];
        
        const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds}&key=${apiKey}`;
        const videosResponse = await fetch(videosUrl);
        const videosData = await videosResponse.json();
        
        if (videosData.error) {
            if (videosData.error.errors[0].reason === 'quotaExceeded') {
                throw new Error('API配额已用完');
            }
            throw new Error(videosData.error.message);
        }
        
        return videosData.items.map(video => ({
            id: video.id,
            title: video.snippet.title,
            description: video.snippet.description,
            channelId: video.snippet.channelId,
            channelTitle: video.snippet.channelTitle,
            viewCount: parseInt(video.statistics.viewCount || 0),
            likeCount: parseInt(video.statistics.likeCount || 0),
            commentCount: parseInt(video.statistics.commentCount || 0),
            publishedAt: video.snippet.publishedAt
        }));
    }
    
    // Extract competitor channels from related videos
    function extractCompetitorChannels(videos, excludeChannelIds) {
        // Count channel occurrences
        const channelCount = new Map();
        
        videos.forEach(video => {
            if (!excludeChannelIds.includes(video.channelId)) {
                if (channelCount.has(video.channelId)) {
                    const channel = channelCount.get(video.channelId);
                    channel.count++;
                    channel.totalViews += video.viewCount;
                    channel.videos.push({
                        id: video.id,
                        title: video.title,
                        viewCount: video.viewCount
                    });
                } else {
                    channelCount.set(video.channelId, {
                        id: video.channelId,
                        title: video.channelTitle,
                        count: 1,
                        totalViews: video.viewCount,
                        videos: [{
                            id: video.id,
                            title: video.title,
                            viewCount: video.viewCount
                        }]
                    });
                }
            }
        });
        
        // Convert to array and sort by occurrence count and views
        return Array.from(channelCount.values())
            .sort((a, b) => {
                // Sort first by count, then by total views
                if (b.count !== a.count) {
                    return b.count - a.count;
                }
                return b.totalViews - a.totalViews;
            })
            .slice(0, 12); // Get top 12 channels
    }
    
    // Display analysis results
    function displayResults(competitorChannels, topHashtags, videoCount, relatedVideoCount) {
        // Update summary
        const summaryElement = document.querySelector('.results-summary');
        summaryElement.innerHTML = `
            <p>已分析 ${analysisResults.inputChannels.length} 个频道的热门视频</p>
            <p>处理了 ${videoCount} 个视频数据</p>
            <p>提取了 ${topHashtags.length} 个独特的Hashtags</p>
            <p>发现了 ${competitorChannels.length} 个潜在的对标账号</p>
            <p>分析了 ${relatedVideoCount} 个相关热门视频</p>
        `;
        
        // Display top hashtags
        const hashtagsContainer = document.querySelector('.top-hashtags');
        hashtagsContainer.innerHTML = '';
        
        topHashtags.forEach(hashtag => {
            const hashtagElement = document.createElement('span');
            hashtagElement.className = 'hashtag-pill';
            hashtagElement.textContent = hashtag.tag;
            hashtagsContainer.appendChild(hashtagElement);
        });
        
        // Display competitor channels
        const channelsContainer = document.querySelector('.channels-list');
        channelsContainer.innerHTML = '';
        
        competitorChannels.forEach(channel => {
            const channelCard = document.createElement('div');
            channelCard.className = 'channel-card';
            
            channelCard.innerHTML = `
                <div class="channel-name">${channel.title}</div>
                <div class="channel-stats">
                    <div>相关视频: ${channel.count}</div>
                    <div>总观看量: ${channel.totalViews.toLocaleString()}</div>
                </div>
                <a href="https://youtube.com/channel/${channel.id}" target="_blank" class="channel-link">
                    <i class="fas fa-external-link-alt"></i> 查看频道
                </a>
            `;
            
            channelsContainer.appendChild(channelCard);
        });
    }
    
    // Download analysis results as Excel
    // Download analysis results as CSV
function downloadResults() {
    showToast('正在准备下载...', 'info');
    
    try {
        // 创建三个CSV文件的内容
        const channelsCSV = generateCSV([
            ['频道名称', '频道ID', '相关视频数', '总观看量', '频道链接'],
            ...analysisResults.competitorChannels.map(channel => [
                channel.title,
                channel.id,
                channel.count,
                channel.totalViews,
                `https://youtube.com/channel/${channel.id}`
            ])
        ]);
        
        const hashtagsCSV = generateCSV([
            ['Hashtag', '出现次数'],
            ...analysisResults.hashtags.map(hashtag => [
                hashtag.tag,
                hashtag.count
            ])
        ]);
        
        const videosCSV = generateCSV([
            ['视频标题', '频道名称', '频道ID', '观看量', '点赞数', '评论数', '发布日期', '视频链接'],
            ...analysisResults.topVideos.map(video => [
                video.title,
                video.channelTitle,
                video.channelId,
                video.viewCount,
                video.likeCount,
                video.commentCount,
                new Date(video.publishedAt).toLocaleDateString(),
                `https://youtube.com/watch?v=${video.id}`
            ])
        ]);
        
        // 创建一个ZIP文件包含所有CSV
        const zip = new JSZip();
        zip.file("对标频道.csv", channelsCSV);
        zip.file("热门Hashtag.csv", hashtagsCSV);
        zip.file("热门视频.csv", videosCSV);
        
        // 生成ZIP文件并下载
        zip.generateAsync({type:"blob"}).then(function(content) {
            const url = URL.createObjectURL(content);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'YouTubeCompetitor分析结果.zip';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            showToast('下载已开始', 'success');
        });
    } catch (error) {
        console.error('Download error:', error);
        
        // 如果没有JSZip库，退回到下载单个CSV文件
        try {
            // 合并所有数据到一个CSV文件
            const allDataCSV = generateCSV([
                ['=== 对标频道 ==='],
                ['频道名称', '频道ID', '相关视频数', '总观看量', '频道链接'],
                ...analysisResults.competitorChannels.map(channel => [
                    channel.title,
                    channel.id,
                    channel.count,
                    channel.totalViews,
                    `https://youtube.com/channel/${channel.id}`
                ]),
                [''], [''], // 空行分隔
                ['=== 热门Hashtag ==='],
                ['Hashtag', '出现次数'],
                ...analysisResults.hashtags.map(hashtag => [
                    hashtag.tag,
                    hashtag.count
                ]),
                [''], [''], // 空行分隔
                ['=== 热门视频 ==='],
                ['视频标题', '频道名称', '频道ID', '观看量', '点赞数', '评论数', '发布日期', '视频链接'],
                ...analysisResults.topVideos.map(video => [
                    video.title,
                    video.channelTitle,
                    video.channelId,
                    video.viewCount,
                    video.likeCount,
                    video.commentCount,
                    new Date(video.publishedAt).toLocaleDateString(),
                    `https://youtube.com/watch?v=${video.id}`
                ])
            ]);
            
            // 下载单个CSV文件
            downloadCSV(allDataCSV, 'YouTubeCompetitor分析结果.csv');
            showToast('下载已开始', 'success');
        } catch (csvError) {
            showToast('下载出错: ' + error.message, 'error');
        }
    }
}

// 生成CSV内容
function generateCSV(rows) {
    return rows.map(row => {
        return row.map(cell => {
            // 处理包含逗号、引号或换行符的单元格
            if (cell === null || cell === undefined) {
                return '';
            }
            
            cell = String(cell);
            
            if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
                // 将引号替换为双引号，并用引号括起来
                return '"' + cell.replace(/"/g, '""') + '"';
            }
            return cell;
        }).join(',');
    }).join('\n');
}

// 下载CSV文件
function downloadCSV(csvContent, filename) {
    // 添加BOM以确保Excel正确识别UTF-8编码
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// 加载JSZip库（如果需要）
function loadJSZip(callback) {
    if (window.JSZip) {
        callback();
        return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js';
    script.onload = callback;
    script.onerror = function() {
        showToast('无法加载JSZip库，将下载单个CSV文件', 'warning');
        callback(new Error('JSZip加载失败'));
    };
    document.head.appendChild(script);
}
    
    
    // Convert array data to sheet format (simplified for demo)
    function arrayToSheet(data) {
        const sheet = {};
        
        // Generate Excel-style references (A1, B1, etc.)
        for (let row = 0; row < data.length; row++) {
            for (let col = 0; col < data[row].length; col++) {
                const cellRef = String.fromCharCode(65 + col) + (row + 1);
                sheet[cellRef] = { v: data[row][col] };
            }
        }
        
        // Define sheet range
        sheet['!ref'] = `A1:${String.fromCharCode(64 + data[0].length)}${data.length}`;
        
        return sheet;
    }
    
    // Generate Excel binary (simplified for demo)
    // In a real implementation, you would use a library like SheetJS/xlsx
    function generateExcel(workbook) {
        // This is a mock function - in reality you'd use a proper Excel generation library
        // For demo purposes, we're creating a simple JSON representation
        const jsonContent = JSON.stringify(workbook);
        
        // Convert string to ArrayBuffer
        const buffer = new ArrayBuffer(jsonContent.length);
        const view = new Uint8Array(buffer);
        for (let i = 0; i < jsonContent.length; i++) {
            view[i] = jsonContent.charCodeAt(i);
        }
        
        return buffer;
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
});

// Additional mobile menu styles
const mobileMenuStyles = `
@media (max-width: 768px) {
    .nav-menu.active {
        display: flex;
        position: absolute;
        top: 100%;
        left: 0;
        width: 100%;
        background: white;
        flex-direction: column;
        padding: 1rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        border-top: 1px solid #e5e7eb;
    }
    
    .nav-menu.active a {
        padding: 0.75rem 0;
        border-bottom: 1px solid #f3f4f6;
    }
    
    .hamburger.active span:nth-child(1) {
        transform: rotate(-45deg) translate(-5px, 6px);
    }
    
    .hamburger.active span:nth-child(2) {
        opacity: 0;
    }
    
    .hamburger.active span:nth-child(3) {
        transform: rotate(45deg) translate(-5px, -6px);
    }
}
`;

// Inject mobile menu styles
const styleSheet = document.createElement('style');
styleSheet.textContent = mobileMenuStyles;
document.head.appendChild(styleSheet);

document.addEventListener('DOMContentLoaded', function() {
    // 处理汉堡菜单点击
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger) {
        hamburger.addEventListener('click', function() {
            this.classList.toggle('active');
            
            // 切换菜单显示状态
            if (navMenu) {
                if (navMenu.style.display === 'flex') {
                    navMenu.style.display = 'none';
                } else {
                    navMenu.style.display = 'flex';
                    navMenu.style.flexDirection = 'column';
                    navMenu.style.position = 'absolute';
                    navMenu.style.top = '70px';
                    navMenu.style.left = '0';
                    navMenu.style.width = '100%';
                    navMenu.style.background = 'white';
                    navMenu.style.padding = '20px';
                    navMenu.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.1)';
                }
            }
        });
    }
    
    // 移动端时下拉菜单的点击展开
    const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
    
    if (window.innerWidth <= 768) {
        dropdownToggles.forEach(toggle => {
            toggle.addEventListener('click', function(e) {
                e.preventDefault();
                const dropdownMenu = this.nextElementSibling;
                
                if (dropdownMenu.style.display === 'block') {
                    dropdownMenu.style.display = 'none';
                    dropdownMenu.style.opacity = '0';
                } else {
                    dropdownMenu.style.display = 'block';
                    dropdownMenu.style.opacity = '1';
                    dropdownMenu.style.visibility = 'visible';
                    dropdownMenu.style.transform = 'translateY(0)';
                }
            });
        });
    }
});