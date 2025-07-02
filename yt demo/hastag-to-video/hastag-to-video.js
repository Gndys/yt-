document.addEventListener('DOMContentLoaded', function() {
    // --- UI相关代码（保留原有代码） ---
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }
    
    const navLinks = document.querySelectorAll('a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            if (targetSection) {
                const headerHeight = document.querySelector('.header').offsetHeight;
                const targetPosition = targetSection.offsetTop - headerHeight;
                window.scrollTo({ top: targetPosition, behavior: 'smooth' });
            }
        });
    });

    const header = document.querySelector('.header');
    window.addEventListener('scroll', function() {
        if (window.scrollY > 100) {
            header.style.background = 'rgba(255, 255, 255, 0.98)';
        } else {
            header.style.background = 'rgba(255, 255, 255, 0.95)';
        }
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.step, .faq-item').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
    
    // --- 获取YouTube API管理器实例 ---
    const youtubeApiManager = window.YouTubeApiManager.manager;
    const showToast = window.YouTubeApiManager.showToast;
    const openApiKeyModal = window.YouTubeApiManager.openApiKeyModal;
    
    // --- Hashtag视频搜索工具实现 ---

    // 搜索结果状态管理
    let searchResultsData = {
        videos: [],
        channels: new Map(), // 使用Map保存唯一频道
    };

    // 获取页面元素
    const manageApiKeysBtn = document.getElementById('manage-api-keys');
    const apiKeyCountSpan = document.getElementById('api-key-count');
    const searchTabs = document.querySelectorAll('.tab-btn');
    const singleSearchContent = document.getElementById('single-search');
    const batchSearchContent = document.getElementById('batch-search');
    const startSearchBtn = document.getElementById('search-hashtags-btn');
    const ctaSearchBtn = document.getElementById('cta-search-btn');
    const startSearchBtnHero = document.getElementById('start-search-btn');
    const hashtagInput = document.getElementById('hashtag-input');
    const hashtagsBatchInput = document.getElementById('hashtags-batch');
    const resultsCountSelect = document.getElementById('results-count');
    const sortBySelect = document.getElementById('sort-by');
    const publishedAfterInput = document.getElementById('published-after');
    const publishedBeforeInput = document.getElementById('published-before');
    const includeChannelToggle = document.getElementById('include-channel');
    const searchStatus = document.querySelector('.search-status');
    const progressBar = document.querySelector('.progress-bar');
    const progressText = document.querySelector('.progress-text');
    const searchResultsContainer = document.querySelector('.search-results');
    const videosGrid = document.querySelector('.videos-grid');
    const channelsGrid = document.querySelector('.channels-grid');
    const resultHashtagCount = document.getElementById('hashtag-count');
    const resultVideoCount = document.getElementById('video-count');
    const resultChannelCount = document.getElementById('channel-count');
    const resultTotalViews = document.getElementById('total-views');
    const resultTabs = document.querySelectorAll('.result-tab');
    const videosResultContent = document.getElementById('videos-result');
    const channelsResultContent = document.getElementById('channels-result');
    const exportCsvBtn = document.getElementById('export-csv');
    const exportPdfBtn = document.getElementById('export-pdf');
    const filterHashtagSelect = document.getElementById('filter-hashtag');
    const minViewsInput = document.getElementById('min-views');
    const applyFiltersBtn = document.getElementById('apply-filters');

    // 初始化工具
    function initHashtagTool() {
        if (!startSearchBtn) return; // 仅在标签工具页面上运行

        updateApiKeyCount();

        // 注册事件监听器
        if (manageApiKeysBtn) {
            manageApiKeysBtn.addEventListener('click', openApiKeyModal);
        }
        
        // 自定义事件：当API密钥管理模态框确认继续时触发
        document.addEventListener('apikeycontinue', function() {
            updateApiKeyCount();
        });

        // 搜索选项卡切换
        searchTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                searchTabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                
                if (this.dataset.tab === 'single') {
                    singleSearchContent.style.display = 'block';
                    batchSearchContent.style.display = 'none';
                } else {
                    singleSearchContent.style.display = 'none';
                    batchSearchContent.style.display = 'block';
                }
            });
        });

        // 结果选项卡切换
        resultTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                resultTabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');

                videosResultContent.style.display = 'none';
                channelsResultContent.style.display = 'none';

                if (this.dataset.result === 'videos') {
                    videosResultContent.style.display = 'block';
                } else {
                    channelsResultContent.style.display = 'block';
                }
            });
        });
        
        // 各种搜索按钮
        if (startSearchBtn) {
            startSearchBtn.addEventListener('click', executeSearch);
        }
        
        if (ctaSearchBtn) {
            ctaSearchBtn.addEventListener('click', function() {
                document.querySelector('#search-tool').scrollIntoView({ behavior: 'smooth' });
            });
        }
        
        if (startSearchBtnHero) {
            startSearchBtnHero.addEventListener('click', function() {
                document.querySelector('#search-tool').scrollIntoView({ behavior: 'smooth' });
            });
        }
        
        // 导出按钮
        if (exportCsvBtn) {
            exportCsvBtn.addEventListener('click', exportToCsv);
        }
        
        if (exportPdfBtn) {
            exportPdfBtn.addEventListener('click', exportToPdf);
        }
        
        // 筛选功能
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', applyFilters);
        }

        // FAQ手风琴效果
        const faqItems = document.querySelectorAll('.faq-item');
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            question.addEventListener('click', () => {
                const isActive = item.classList.contains('active');
                faqItems.forEach(i => i.classList.remove('active'));
                if (!isActive) {
                    item.classList.add('active');
                }
            });
        });
        
        // 设置日期选择器默认值
        const today = new Date();
        const lastMonth = new Date();
        lastMonth.setMonth(today.getMonth() - 1);
        
        if (publishedAfterInput && !publishedAfterInput.value) {
            publishedAfterInput.valueAsDate = lastMonth;
        }
        
        if (publishedBeforeInput && !publishedBeforeInput.value) {
            publishedBeforeInput.valueAsDate = today;
        }
    }

    // 更新API密钥计数
    function updateApiKeyCount() {
        if (apiKeyCountSpan) {
            apiKeyCountSpan.textContent = youtubeApiManager.apiKeys.length;
        }
    }

    // 执行搜索
    async function executeSearch() {
        if (youtubeApiManager.apiKeys.length === 0) {
            showToast('请添加至少一个YouTube API密钥以开始搜索', 'error');
            openApiKeyModal();
            return;
        }

        const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
        let hashtags = [];
        if (activeTab === 'single') {
            hashtags = hashtagInput.value.split(',').map(h => h.trim()).filter(Boolean);
        } else {
            hashtags = hashtagsBatchInput.value.split('\n').map(h => h.trim()).filter(Boolean);
        }

        if (hashtags.length === 0) {
            showToast('请输入至少一个标签', 'error');
            return;
        }

        // 重置之前的结果
        searchResultsData = { videos: [], channels: new Map() };
        videosGrid.innerHTML = '';
        channelsGrid.innerHTML = '';
        searchResultsContainer.style.display = 'none';
        searchStatus.style.display = 'block';
        
        // 更新标签过滤下拉菜单
        updateHashtagFilter(hashtags);

        const searchOptions = {
            maxResults: parseInt(resultsCountSelect.value),
            order: sortBySelect.value,
            publishedAfter: publishedAfterInput.value ? new Date(publishedAfterInput.value).toISOString() : null,
            publishedBefore: publishedBeforeInput.value ? new Date(publishedBeforeInput.value).toISOString() : null,
            includeChannel: includeChannelToggle.checked
        };
        
        try {
            let allVideoIds = new Set();
            let allChannelIds = new Set();
            let hashtagToVideos = {}; // 跟踪每个标签找到的视频

            // 步骤1：按标签搜索视频
            for (let i = 0; i < hashtags.length; i++) {
                const hashtag = hashtags[i];
                updateProgress((i / hashtags.length) * 50, `步骤1/3: 搜索标签 #${hashtag} 的视频`);
                
                try {
                    const response = await fetchVideosByHashtag(hashtag, searchOptions);
                    
                    // 初始化此标签的视频数组
                    if (!hashtagToVideos[hashtag]) {
                        hashtagToVideos[hashtag] = [];
                    }
                    
                    if (response.items && response.items.length > 0) {
                        response.items.forEach(item => {
                            // 添加到标签->视频映射
                            hashtagToVideos[hashtag].push(item.id.videoId);
                            
                            // 添加到需要获取详情的视频和频道集合
                            allVideoIds.add(item.id.videoId);
                            if (searchOptions.includeChannel) {
                                allChannelIds.add(item.snippet.channelId);
                            }
                        });
                    }
                } catch (error) {
                    showToast(`搜索标签 #${hashtag} 时出错: ${error.message}`, 'error');
                    console.error(`搜索标签 #${hashtag} 时出错:`, error);
                    // 继续搜索其他标签
                }
            }

            // 步骤2：获取视频详细信息
            updateProgress(65, '步骤2/3: 获取视频详细信息...');
            if (allVideoIds.size > 0) {
                try {
                    const videoDetails = await fetchVideoDetails([...allVideoIds]);
                    
                    // 为每个视频添加它所属的标签
                    videoDetails.forEach(video => {
                        video.hashtags = [];
                        for (const tag in hashtagToVideos) {
                            if (hashtagToVideos[tag].includes(video.id)) {
                                video.hashtags.push(tag);
                            }
                        }
                    });
                    
                    searchResultsData.videos = videoDetails;
                } catch (error) {
                    showToast(`获取视频详情时出错: ${error.message}`, 'error');
                    console.error('获取视频详情时出错:', error);
                }
            }

            // 步骤3：获取频道详细信息
            if (searchOptions.includeChannel && allChannelIds.size > 0) {
                updateProgress(85, '步骤3/3: 获取频道信息...');
                try {
                    const channelDetails = await fetchChannelDetails([...allChannelIds]);
                    channelDetails.forEach(channel => searchResultsData.channels.set(channel.id, channel));
                } catch (error) {
                    showToast(`获取频道详情时出错: ${error.message}`, 'error');
                    console.error('获取频道详情时出错:', error);
                }
            }

            updateProgress(100, '搜索完成!');
            setTimeout(() => {
                searchStatus.style.display = 'none';
                displayResults();
            }, 500);

        } catch (error) {
            searchStatus.style.display = 'none';
            showToast(`搜索过程中发生错误: ${error.message}`, 'error');
            console.error('搜索过程中发生错误:', error);
        }
    }
    
    // 更新标签过滤下拉菜单
    function updateHashtagFilter(hashtags) {
        if (!filterHashtagSelect) return;
        
        // 清空现有选项，保留"所有标签"选项
        filterHashtagSelect.innerHTML = '<option value="all">所有标签</option>';
        
        // 添加每个标签作为选项
        hashtags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = `#${tag}`;
            filterHashtagSelect.appendChild(option);
        });
    }
    
    // 应用筛选条件
    function applyFilters() {
        const selectedHashtag = filterHashtagSelect.value;
        const minViews = parseInt(minViewsInput.value) || 0;
        
        let filteredVideos = [...searchResultsData.videos];
        
        // 按标签筛选
        if (selectedHashtag !== 'all') {
            filteredVideos = filteredVideos.filter(video => 
                video.hashtags && video.hashtags.includes(selectedHashtag)
            );
        }
        
        // 按最低观看量筛选
        if (minViews > 0) {
            filteredVideos = filteredVideos.filter(video => 
                parseInt(video.statistics.viewCount || 0) >= minViews
            );
        }
        
        renderVideoCards(filteredVideos);
        showToast(`已显示 ${filteredVideos.length} 个匹配的视频`, 'info');
    }
    
    // 更新进度显示
    function updateProgress(percent, text) {
        progressBar.style.width = `${percent}%`;
        progressText.textContent = text;
    }

    // API请求包装函数，支持密钥轮换
    async function apiFetch(url) {
        let apiKey = youtubeApiManager.getCurrentKey();
        if (!apiKey) throw new Error('没有可用的API密钥');

        let response = await fetch(`${url}&key=${apiKey}`);
        let data = await response.json();

        // 如果配额超出，尝试切换到下一个密钥
        if (data.error && data.error.errors && data.error.errors[0].reason === 'quotaExceeded') {
            apiKey = youtubeApiManager.rotateKey();
            if(!apiKey) throw new Error('所有API密钥配额已用尽');
            
            // 使用新密钥重试请求
            response = await fetch(`${url}&key=${apiKey}`);
            data = await response.json();
        }

        // 检查其他错误
        if (data.error) throw new Error(data.error.message || '请求失败');
        return data;
    }

    // 通过标签搜索视频
    async function fetchVideosByHashtag(hashtag, options) {
        let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(hashtag)}&maxResults=${options.maxResults}`;
        
        if (options.order) {
            url += `&order=${options.order}`;
        }
        
        if (options.publishedAfter) {
            url += `&publishedAfter=${options.publishedAfter}`;
        }
        
        if (options.publishedBefore) {
            url += `&publishedBefore=${options.publishedBefore}`;
        }
        
        return apiFetch(url);
    }

    // 获取视频详细信息
    async function fetchVideoDetails(videoIds) {
        const details = [];
        // API每次请求最多允许50个ID
        const chunks = chunkArray(videoIds, 50);
        
        for (const chunk of chunks) {
            const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${chunk.join(',')}`;
            try {
                const data = await apiFetch(url);
                if (data.items) {
                    details.push(...data.items);
                }
            } catch (error) {
                console.error('获取视频详情时出错:', error);
                // 继续处理其他块
            }
        }
        return details;
    }

    // 获取频道详细信息
    async function fetchChannelDetails(channelIds) {
        const details = [];
        const chunks = chunkArray(channelIds, 50);
        
        for (const chunk of chunks) {
            const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&id=${chunk.join(',')}`;
            try {
                const data = await apiFetch(url);
                if (data.items) {
                    details.push(...data.items);
                }
            } catch (error) {
                console.error('获取频道详情时出错:', error);
                // 继续处理其他块
            }
        }
        return details;
    }

    // 显示搜索结果
    function displayResults() {
        renderVideoCards(searchResultsData.videos);
        if (includeChannelToggle.checked) {
            renderChannelCards(Array.from(searchResultsData.channels.values()));
        }
        updateResultStats();
        searchResultsContainer.style.display = 'block';
    }

    // 更新结果统计信息
    function updateResultStats() {
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab) {
            if (activeTab.dataset.tab === 'single') {
                resultHashtagCount.textContent = hashtagInput.value.split(',').map(h => h.trim()).filter(Boolean).length;
            } else {
                resultHashtagCount.textContent = hashtagsBatchInput.value.split('\n').map(h => h.trim()).filter(Boolean).length;
            }
        } else {
            resultHashtagCount.textContent = '0';
        }
            
        resultVideoCount.textContent = searchResultsData.videos.length;
        resultChannelCount.textContent = searchResultsData.channels.size;
        
        const totalViews = searchResultsData.videos.reduce((acc, video) => 
            acc + parseInt(video.statistics.viewCount || 0), 0);
        resultTotalViews.textContent = totalViews.toLocaleString();
    }
    
    // 渲染视频卡片
    function renderVideoCards(videos) {
        videosGrid.innerHTML = '';
        if (videos.length === 0) {
            videosGrid.innerHTML = '<p class="no-results">未找到符合条件的视频</p>';
            return;
        }
        
        videos.forEach(video => {
            const card = document.createElement('div');
            card.className = 'video-card';
            const stats = video.statistics || {};
            const snippet = video.snippet || {};
            const duration = formatDuration(video.contentDetails?.duration || 'PT0S');
            const hashtags = video.hashtags || [];

            card.innerHTML = `
                <a href="https://www.youtube.com/watch?v=${video.id}" target="_blank" class="video-thumbnail">
                    <img src="${snippet.thumbnails?.high?.url || ''}" alt="${snippet.title || '视频封面'}">
                    <span class="video-duration">${duration}</span>
                </a>
                <div class="video-details">
                    <div class="video-channel-info">
                         <img src="${searchResultsData.channels.get(snippet.channelId)?.snippet?.thumbnails?.default?.url || ''}" class="channel-thumbnail-small" alt="${snippet.channelTitle}">
                        <a href="https://www.youtube.com/channel/${snippet.channelId}" target="_blank" class="video-channel-title">${snippet.channelTitle || '未知频道'}</a>
                    </div>
                    <a href="https://www.youtube.com/watch?v=${video.id}" target="_blank">
                        <h4 class="video-title" title="${snippet.title || ''}">${snippet.title || '无标题'}</h4>
                    </a>
                    <div class="video-meta">
                        <span class="video-meta-item">${parseInt(stats.viewCount || 0).toLocaleString()}次观看</span>
                        <span class="video-meta-separator">&bull;</span>
                        <span class="video-meta-item">${snippet.publishedAt ? new Date(snippet.publishedAt).toLocaleDateString() : '未知'}</span>
                    </div>
                    <div class="video-hashtags">
                        ${hashtags.map(tag => `<span class="video-hashtag">#${tag}</span>`).join('')}
                    </div>
                </div>
            `;
            videosGrid.appendChild(card);
        });
    }

    // 渲染频道卡片
    function renderChannelCards(channels) {
        channelsGrid.innerHTML = '';
        if (channels.length === 0) {
            channelsGrid.innerHTML = '<p class="no-results">未请求或未找到频道信息</p>';
            return;
        }
        
        channels.forEach(channel => {
            const card = document.createElement('div');
            card.className = 'channel-card';
            const stats = channel.statistics || {};
            const snippet = channel.snippet || {};

            card.innerHTML = `
                <div class="channel-info">
                    <img src="${snippet.thumbnails?.default?.url || ''}" alt="${snippet.title || '未知频道'}" class="channel-thumbnail">
                    <div>
                        <h4 class="channel-name">${snippet.title || '未知频道'}</h4>
                        <a href="https://youtube.com/channel/${channel.id}" target="_blank" class="channel-link">访问频道</a>
                    </div>
                </div>
                <div class="channel-stats">
                    <div class="channel-stat">
                        <span class="stat-label">订阅数</span>
                        <span class="stat-value">${parseInt(stats.subscriberCount || 0).toLocaleString()}</span>
                    </div>
                    <div class="channel-stat">
                        <span class="stat-label">总观看量</span>
                        <span class="stat-value">${parseInt(stats.viewCount || 0).toLocaleString()}</span>
                    </div>
                    <div class="channel-stat">
                        <span class="stat-label">视频数量</span>
                        <span class="stat-value">${parseInt(stats.videoCount || 0).toLocaleString()}</span>
                    </div>
                    <div class="channel-stat">
                        <span class="stat-label">所在国家</span>
                        <span class="stat-value">${snippet.country || '未知'}</span>
                    </div>
                </div>
                <div class="channel-description">
                    ${snippet.description ? `<p>${snippet.description.substring(0, 150)}${snippet.description.length > 150 ? '...' : ''}</p>` : ''}
                </div>
            `;
            channelsGrid.appendChild(card);
        });
    }

    // 导出为CSV
    function exportToCsv() {
        if (searchResultsData.videos.length === 0) {
            showToast('没有可导出的数据', 'info');
            return;
        }
        showToast('正在准备CSV下载...', 'info');

        // 使用JSZip打包多个CSV文件
        const zip = new JSZip();

        // 视频数据CSV
        const videoHeaders = ['视频ID', '标题', '频道名称', '频道ID', '发布日期', '观看量', '点赞数', '评论数', '时长', '视频URL', '相关标签'];
        const videoRows = searchResultsData.videos.map(v => [
            v.id, 
            v.snippet.title, 
            v.snippet.channelTitle, 
            v.snippet.channelId,
            new Date(v.snippet.publishedAt).toISOString(), 
            v.statistics.viewCount || '0',
            v.statistics.likeCount || '0', 
            v.statistics.commentCount || '0', 
            formatDuration(v.contentDetails.duration),
            `https://youtube.com/watch?v=${v.id}`,
            (v.hashtags || []).join(', ')
        ]);
        zip.file("videos.csv", generateCSV([videoHeaders, ...videoRows]));

        // 频道数据CSV
        if (searchResultsData.channels.size > 0) {
            const channelHeaders = ['频道ID', '频道名称', '订阅数', '总观看量', '视频数量', '所在国家', '创建日期', '频道URL'];
            const channelRows = Array.from(searchResultsData.channels.values()).map(c => [
                c.id, 
                c.snippet.title, 
                c.statistics.subscriberCount || '0', 
                c.statistics.viewCount || '0',
                c.statistics.videoCount || '0', 
                c.snippet.country || '未知', 
                new Date(c.snippet.publishedAt).toISOString(),
                `https://youtube.com/channel/${c.id}`
            ]);
            zip.file("channels.csv", generateCSV([channelHeaders, ...channelRows]));
        }

        // 生成并下载ZIP文件
        zip.generateAsync({ type: "blob" }).then(function(content) {
            downloadBlob(content, "youtube_hashtag_export.zip");
            showToast('下载已开始!', 'success');
        });
    }

    // 导出为PDF
    function exportToPdf() {
        if (searchResultsData.videos.length === 0) {
            showToast('没有可导出的数据', 'info');
            return;
        }
        
        showToast('正在打开PDF打印对话框...', 'info');

        // 创建新窗口用于打印
        const printWindow = window.open('', '_blank');
        let printContent = `
            <html>
            <head>
                <title>YouTube标签搜索结果</title>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    h1, h2 { color: #333; margin-bottom: 15px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; font-weight: bold; }
                    tr:nth-child(even) { background-color: #f9f9f9; }
                    .summary { margin-bottom: 20px; padding: 15px; background: #f5f5f5; border-radius: 5px; }
                    .summary div { margin-bottom: 5px; }
                    @media print {
                        .no-print { display: none; }
                        body { font-size: 12px; }
                        h1 { font-size: 18px; }
                        h2 { font-size: 16px; }
                    }
                </style>
            </head>
            <body>
                <h1>YouTube标签搜索结果</h1>
                
                <div class="summary">
                    <div><strong>搜索日期:</strong> ${new Date().toLocaleString()}</div>
                    <div><strong>标签数量:</strong> ${resultHashtagCount.textContent}</div>
                    <div><strong>视频数量:</strong> ${resultVideoCount.textContent}</div>
                    <div><strong>频道数量:</strong> ${resultChannelCount.textContent}</div>
                    <div><strong>总观看量:</strong> ${resultTotalViews.textContent}</div>
                </div>
        `;

        // 添加视频表格
        printContent += '<h2>视频数据</h2>';
        printContent += '<table><thead><tr><th>标题</th><th>频道</th><th>观看量</th><th>点赞数</th><th>评论数</th><th>发布日期</th><th>相关标签</th></tr></thead><tbody>';
        searchResultsData.videos.forEach(v => {
            printContent += `
                <tr>
                    <td>${v.snippet.title || '未知'}</td>
                    <td>${v.snippet.channelTitle || '未知'}</td>
                    <td>${parseInt(v.statistics.viewCount || 0).toLocaleString()}</td>
                    <td>${parseInt(v.statistics.likeCount || 0).toLocaleString()}</td>
                    <td>${parseInt(v.statistics.commentCount || 0).toLocaleString()}</td>
                    <td>${v.snippet.publishedAt ? new Date(v.snippet.publishedAt).toLocaleDateString() : '未知'}</td>
                    <td>${(v.hashtags || []).map(tag => `#${tag}`).join(', ')}</td>
                </tr>
            `;
        });
        printContent += '</tbody></table>';

        // 添加频道表格
        if(searchResultsData.channels.size > 0) {
            printContent += '<h2>频道数据</h2>';
            printContent += '<table><thead><tr><th>频道名称</th><th>订阅数</th><th>总观看量</th><th>视频数量</th><th>所在国家</th></tr></thead><tbody>';
            Array.from(searchResultsData.channels.values()).forEach(c => {
                printContent += `
                    <tr>
                        <td>${c.snippet.title || '未知'}</td>
                        <td>${parseInt(c.statistics.subscriberCount || 0).toLocaleString()}</td>
                        <td>${parseInt(c.statistics.viewCount || 0).toLocaleString()}</td>
                        <td>${parseInt(c.statistics.videoCount || 0).toLocaleString()}</td>
                        <td>${c.snippet.country || '未知'}</td>
                    </tr>
                `;
            });
            printContent += '</tbody></table>';
        }

        printContent += `
            <div class="no-print">
                <p>提示: 使用浏览器的打印功能(Ctrl+P或⌘+P)将此报告保存为PDF</p>
                <button onclick="window.print()">打印</button>
            </div>
        `;
        
        printContent += '</body></html>';
        
        // 写入打印窗口并触发打印
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        
        // 等待内容加载完成后打印
        setTimeout(() => {
            printWindow.print();
        }, 500);
    }

    // --- 辅助函数 ---
    
    // 将数组分割成指定大小的块
    function chunkArray(arr, size) {
        const chunks = [];
        for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
        }
        return chunks;
    }

    // 格式化视频时长
    function formatDuration(isoDuration) {
        const match = isoDuration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
        if (!match) return "00:00";
        
        const hours = parseInt(match[1]) || 0;
        const minutes = parseInt(match[2]) || 0;
        const seconds = parseInt(match[3]) || 0;
        
        let formatted = '';
        if (hours > 0) {
            formatted += `${hours.toString().padStart(2, '0')}:`;
        }
        formatted += `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        return formatted;
    }

    // 生成CSV内容
    function generateCSV(rows) {
        return rows.map(row => 
            row.map(cell => {
                let str = String(cell == null ? "" : cell);
                // 如果单元格内容包含逗号、引号或换行符，需要用引号包裹并转义内部引号
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    str = `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            }).join(',')
        ).join('\n');
    }

    // 下载Blob内容
    function downloadBlob(content, filename) {
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    // 初始化工具
    initHashtagTool();
});