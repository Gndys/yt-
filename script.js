// 存储数据的主对象
const youtubeData = {
    channels: [],
    videos: [],
    currentPage: 1,
    itemsPerPage: 10,
    apiKey: 'AIzaSyArthcKkeA3XMBl7T3-m53em7VcptvQj10' // 添加API密钥存储
};

// DOM 元素
const elements = {
    channelInput: document.getElementById('channelInput'),
    addChannelBtn: document.getElementById('addChannelBtn'),
    messageBox: document.getElementById('messageBox'),
    channelsList: document.getElementById('channelsList'),
    channelNameFilter: document.getElementById('channelNameFilter'), // 更改为文本输入框
    sortOption: document.getElementById('sortOption'),
    videosTableBody: document.getElementById('videosTableBody'),
    statsSummary: document.getElementById('statsSummary'),
    pagination: document.getElementById('pagination'),
    tabButtons: document.querySelectorAll('.tab-button'),
    tabContents: document.querySelectorAll('.tab-content'),
    apiKeyInput: document.getElementById('apiKeyInput'),
    saveApiKeyBtn: document.getElementById('saveApiKeyBtn'),
    apiKeyMessage: document.getElementById('apiKeyMessage'),
    batchImportBtn: document.getElementById('batchImportBtn'),
    batchImportModal: document.getElementById('batchImportModal'),
    closeModal: document.getElementById('closeModal'),
    batchLinks: document.getElementById('batchLinks'),
    startImportBtn: document.getElementById('startImportBtn'),
    importProgress: document.getElementById('importProgress'),
    // 日期筛选相关元素
    yearFilter: document.getElementById('yearFilter'),
    monthFilter: document.getElementById('monthFilter'),
    dayFilter: document.getElementById('dayFilter'), // 新增日期筛选元素
    clearDateFilterBtn: document.getElementById('clearDateFilterBtn')
};

// 页面加载时从本地存储加载数据
document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
    setupEventListeners();
    renderChannelsList();
    populateYearFilter(); // 填充年份筛选器
    renderVideosTable();
});

// 设置事件监听器
function setupEventListeners() {
    // 添加博主按钮点击事件
    elements.addChannelBtn.addEventListener('click', addChannel);
    
    // API密钥保存按钮点击事件
    elements.saveApiKeyBtn.addEventListener('click', saveApiKey);
    
    // 筛选和排序事件
    elements.channelNameFilter.addEventListener('input', renderVideosTable); // 更改为input事件
    elements.sortOption.addEventListener('change', renderVideosTable);
    
    // 日期筛选事件
    elements.yearFilter.addEventListener('change', renderVideosTable);
    elements.monthFilter.addEventListener('change', renderVideosTable);
    elements.dayFilter.addEventListener('change', renderVideosTable); // 新增日期筛选事件
    elements.clearDateFilterBtn.addEventListener('click', clearDateFilter);
    
    // 标签切换事件
    elements.tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
    
    // 批量导入按钮事件
    elements.batchImportBtn.addEventListener('click', () => {
        elements.batchImportModal.style.display = 'block';
        elements.importProgress.style.display = 'none';
        elements.batchLinks.value = '';
    });
    
    // 关闭模态对话框
    elements.closeModal.addEventListener('click', () => {
        elements.batchImportModal.style.display = 'none';
    });
    
    // 点击模态对话框外部关闭
    window.addEventListener('click', (event) => {
        if (event.target === elements.batchImportModal) {
            elements.batchImportModal.style.display = 'none';
        }
    });
    
    // 开始批量导入按钮
    elements.startImportBtn.addEventListener('click', startBatchImport);
}

// 填充年份筛选器
function populateYearFilter() {
    const years = new Set();
    
    // 从视频数据中获取所有年份
    youtubeData.videos.forEach(video => {
        const year = new Date(video.publishedAt).getFullYear();
        years.add(year);
    });
    
    // 添加当前年份，确保有2025年选项
    const currentYear = new Date().getFullYear();
    years.add(currentYear);
    if (currentYear !== 2025) {
        years.add(2025);
    }
    
    // 按降序排列年份
    const sortedYears = Array.from(years).sort((a, b) => b - a);
    
    // 生成年份选项
    let yearOptions = '<option value="">全部</option>';
    sortedYears.forEach(year => {
        yearOptions += `<option value="${year}">${year}年</option>`;
    });
    
    elements.yearFilter.innerHTML = yearOptions;
}

// 清除日期筛选
function clearDateFilter() {
    elements.yearFilter.value = '';
    elements.monthFilter.value = '';
    elements.dayFilter.value = ''; // 清除日期筛选
    renderVideosTable();
}

// 保存API密钥
function saveApiKey() {
    const apiKey = elements.apiKeyInput.value.trim();
    
    if (!apiKey) {
        showMessage('请输入有效的API密钥', 'warning', 'apiKeyMessage');
        return;
    }
    
    youtubeData.apiKey = apiKey;
    saveToLocalStorage();
    showMessage('API密钥已保存成功！', 'success', 'apiKeyMessage');
}

// 显示消息（支持指定消息容器）
function showMessage(text, type = 'success', containerId = 'messageBox') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `<div class="message ${type}">${text}</div>`;
    setTimeout(() => {
        container.innerHTML = '';
    }, 5000);
}

// 切换标签页
function switchTab(tabId) {
    elements.tabButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tabId) {
            btn.classList.add('active');
        }
    });
    
    elements.tabContents.forEach(content => {
        content.classList.remove('active');
    });
    
    document.getElementById(`${tabId}Tab`).classList.add('active');
    
    if (tabId === 'analytics') {
        renderAnalytics();
    }
}

// 批量导入功能
function startBatchImport() {
    const linksText = elements.batchLinks.value.trim();
    if (!linksText) {
        showMessage('请输入YouTube链接', 'warning', 'importProgress');
        elements.importProgress.style.display = 'block';
        return;
    }
    
    // 显示进度区域
    elements.importProgress.style.display = 'block';
    elements.importProgress.innerHTML = '<p>正在处理链接，请稍候...</p>';
    
    // 使用正则表达式提取所有可能的YouTube链接
    const regex = /(https?:\/\/)?(www\.)?(youtube\.com\/(c\/|channel\/|user\/|@)|youtu\.be\/|@)[\w\-\.]+/g;
    const links = linksText.match(regex) || [];
    
    if (links.length === 0) {
        elements.importProgress.innerHTML = '<p class="error">未找到有效的YouTube链接</p>';
        return;
    }
    
    // 开始批量处理
    processBatchImport(links);
}

// 处理批量导入
function processBatchImport(links) {
    let total = links.length;
    let success = 0;
    let failed = 0;
    let duplicates = 0;
    let processed = 0;
    
    // 更新初始进度
    updateImportProgress(processed, total, success, failed, duplicates);
    
    // 依次处理每个链接，使用setTimeout避免浏览器卡顿
    function processNextLink(index) {
        if (index >= links.length) {
            // 所有链接处理完成
            const finalMessage = `
                <h3>导入完成</h3>
                <p>总共处理: <strong>${total}</strong> 个链接</p>
                <p class="success">成功添加: <strong>${success}</strong> 个</p>
                <p class="warning">重复链接: <strong>${duplicates}</strong> 个</p>
                <p class="error">添加失败: <strong>${failed}</strong> 个</p>
            `;
            elements.importProgress.innerHTML = finalMessage;
            
            // 如果成功添加了博主，刷新博主列表
            if (success > 0) {
                renderChannelsList();
                populateYearFilter(); // 更新年份筛选器
            }
            
            return;
        }
        
        const url = links[index];
        const result = batchAddChannel(url);
        
        if (result === 'success') {
            success++;
        } else if (result === 'duplicate') {
            duplicates++;
        } else {
            failed++;
        }
        
        processed++;
        updateImportProgress(processed, total, success, failed, duplicates);
        
        // 处理下一个链接，添加小延迟避免界面冻结
        setTimeout(() => {
            processNextLink(index + 1);
        }, 50);
    }
    
    // 开始处理第一个链接
    processNextLink(0);
}

// 更新导入进度
function updateImportProgress(processed, total, success, failed, duplicates) {
    const percent = Math.floor((processed / total) * 100);
    elements.importProgress.innerHTML = `
        <h3>导入进度: ${percent}%</h3>
        <p>已处理: ${processed}/${total}</p>
        <p class="success">成功: ${success}</p>
        <p class="warning">重复: ${duplicates}</p>
        <p class="error">失败: ${failed}</p>
    `;
}

// 批量添加单个频道，返回处理结果状态
function batchAddChannel(channelUrl) {
    channelUrl = channelUrl.trim();
    
    // 验证链接格式 - 更宽松的验证以适应移动端
    if (!isValidYouTubeChannelUrl(channelUrl)) {
        console.log('无效的YouTube链接:', channelUrl);
        return 'failed';
    }
    
    // 检查是否已添加
    if (youtubeData.channels.some(channel => channel.url === channelUrl)) {
        return 'duplicate';
    }
    
    // 提取频道ID或用户名
    const channelId = extractChannelIdentifier(channelUrl);
    if (!channelId) {
        console.log('无法提取频道标识符:', channelUrl);
        return 'failed';
    }
    
    // 添加频道
    const newChannel = {
        id: generateId(),
        url: channelUrl,
        channelId: channelId,
        name: `未知博主 (${channelId})`, // 初始名称，后续可通过API获取更新
        addedAt: new Date().toISOString()
    };
    
    youtubeData.channels.push(newChannel);
    saveToLocalStorage();
    
    // 如果有API密钥，尝试获取真实数据
    if (youtubeData.apiKey) {
        // 使用setTimeout避免在批量导入时阻塞UI
        setTimeout(() => {
            fetchChannelData(newChannel.id);
        }, 500);
    } else {
        // 使用模拟数据
        addSampleVideos(newChannel);
    }
    
    return 'success';
}

// 添加YouTube博主
function addChannel() {
    const channelUrl = elements.channelInput.value.trim();
    
    if (!channelUrl) {
        showMessage('请输入YouTube博主链接', 'warning');
        return;
    }
    
    // 验证链接格式
    if (!isValidYouTubeChannelUrl(channelUrl)) {
        showMessage('无效的YouTube博主链接，请使用正确的YouTube链接格式', 'warning');
        return;
    }
    
    // 检查是否已添加
    if (youtubeData.channels.some(channel => channel.url === channelUrl)) {
        showMessage('此博主已经添加过了', 'warning');
        return;
    }
    
    // 提取频道ID或用户名
    const channelId = extractChannelIdentifier(channelUrl);
    if (!channelId) {
        showMessage('无法识别频道标识符', 'warning');
        return;
    }
    
    // 添加频道
    const newChannel = {
        id: generateId(),
        url: channelUrl,
        channelId: channelId,
        name: `未知博主 (${channelId})`, // 初始名称，后续可通过API获取更新
        addedAt: new Date().toISOString()
    };
    
    youtubeData.channels.push(newChannel);
    saveToLocalStorage();
    renderChannelsList();
    
    // 清空输入框
    elements.channelInput.value = '';
    
    // 显示成功消息
    showMessage(`已添加博主: ${channelUrl}`, 'success');
    
    // 如果有API密钥，尝试获取真实数据
    if (youtubeData.apiKey) {
        fetchChannelData(newChannel.id);
    } else {
        showMessage('提示：设置YouTube API密钥后可获取真实数据', 'warning');
        // 使用模拟数据
        addSampleVideos(newChannel);
    }
    
    // 更新年份筛选器
    populateYearFilter();
}

// 尝试使用API获取频道数据
function fetchChannelData(channelId) {
    const channel = youtubeData.channels.find(ch => ch.id === channelId);
    if (!channel || !youtubeData.apiKey) {
        if (!youtubeData.apiKey) {
            showMessage('请先在设置中设置有效的API密钥', 'warning');
        }
        return;
    }
    
    showMessage(`正在获取 ${channel.name} 的频道数据...`, 'success');
    
    // 确定是频道ID还是用户名
    let apiUrl;
    if (channel.channelId.startsWith('@')) {
        // 处理@格式的用户名
        apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&forHandle=${channel.channelId.substring(1)}&key=${youtubeData.apiKey}`;
    } else if (channel.url.includes('/channel/')) {
        apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&id=${channel.channelId}&key=${youtubeData.apiKey}`;
    } else if (channel.url.includes('/c/') || channel.url.includes('/user/') || channel.url.includes('@')) {
        apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&forUsername=${channel.channelId}&key=${youtubeData.apiKey}`;
    } else {
        showMessage(`无法识别频道链接格式`, 'warning');
        return;
    }
    
    // 发起API请求获取频道信息
    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (!data.items || data.items.length === 0) {
                throw new Error('未找到频道信息');
            }
            
            const channelData = data.items[0];
            const uploadPlaylistId = channelData.contentDetails.relatedPlaylists.uploads;
            
            // 更新频道信息
            channel.name = channelData.snippet.title;
            channel.description = channelData.snippet.description;
            channel.thumbnail = channelData.snippet.thumbnails.default.url;
            channel.uploadPlaylistId = uploadPlaylistId;
            
            // 保存更新的频道信息
            saveToLocalStorage();
            renderChannelsList();
            
            // 获取频道视频
            fetchVideosFromPlaylist(channel.id, uploadPlaylistId);
        })
        .catch(error => {
            console.error('获取频道信息失败:', error);
            showMessage(`获取频道信息失败: ${error.message}`, 'warning');
        });
}

// 添加从播放列表获取视频的函数
function fetchVideosFromPlaylist(channelId, playlistId, pageToken = null, existingVideos = []) {
    const channel = youtubeData.channels.find(ch => ch.id === channelId);
    if (!channel || !youtubeData.apiKey) return;
    
    const maxResults = 50; // YouTube API 单次请求最大视频数
    let apiUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=${maxResults}&playlistId=${playlistId}&key=${youtubeData.apiKey}`;
    
    if (pageToken) {
        apiUrl += `&pageToken=${pageToken}`;
    }
    
    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            // 收集视频IDs用于获取详细信息
            const videoItems = data.items || [];
            const videoIds = videoItems.map(item => item.snippet.resourceId.videoId);
            
            if (videoIds.length > 0) {
                // 将新视频项添加到集合中
                const newVideos = videoItems.map(item => ({
                    id: generateId(),
                    videoId: item.snippet.resourceId.videoId,
                    channelId: channelId,
                    title: item.snippet.title,
                    channelTitle: channel.name,
                    publishedAt: item.snippet.publishedAt,
                    thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
                    description: item.snippet.description,
                    // 这些统计数据将在下一步获取
                    viewCount: 0,
                    likeCount: 0,
                    commentCount: 0
                }));
                
                const combinedVideos = [...existingVideos, ...newVideos];
                
                // 获取视频详细信息（观看次数、点赞数等）
                fetchVideoDetails(videoIds, combinedVideos, channel);
                
                // 如果有更多页，继续获取
                if (data.nextPageToken) {
                    // 限制API请求频率，避免配额用尽
                    setTimeout(() => {
                        fetchVideosFromPlaylist(channelId, playlistId, data.nextPageToken, combinedVideos);
                    }, 1000);
                } else {
                    showMessage(`已获取 ${channel.name} 的所有视频数据`, 'success');
                    // 更新年份筛选器
                    populateYearFilter();
                }
            } else {
                // 没有视频或已获取完毕
                showMessage(`获取完成: ${channel.name} 的视频数据`, 'success');
            }
        })
        .catch(error => {
            console.error('获取视频列表失败:', error);
            showMessage(`获取视频列表失败: ${error.message}`, 'warning');
        });
}

// 添加获取视频详细信息的函数
function fetchVideoDetails(videoIds, videos, channel) {
    if (!youtubeData.apiKey || videoIds.length === 0) return;
    
    // YouTube API限制每次请求最多50个视频ID
    const idsString = videoIds.slice(0, 50).join(',');
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${idsString}&key=${youtubeData.apiKey}`;
    
    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            const items = data.items || [];
            
            // 更新视频统计数据
            items.forEach(item => {
                const video = videos.find(v => v.videoId === item.id);
                if (video) {
                    video.viewCount = parseInt(item.statistics.viewCount || '0', 10);
                    video.likeCount = parseInt(item.statistics.likeCount || '0', 10);
                    video.commentCount = parseInt(item.statistics.commentCount || '0', 10);
                }
            });
            
            // 删除该频道之前的视频数据
            youtubeData.videos = youtubeData.videos.filter(video => video.channelId !== channel.id);
            
            // 添加新的视频数据
            youtubeData.videos = [...youtubeData.videos, ...videos];
            
            // 保存到本地并更新表格
            saveToLocalStorage();
            renderVideosTable();
            populateYearFilter(); // 更新年份筛选器
        })
        .catch(error => {
            console.error('获取视频详情失败:', error);
            showMessage(`获取视频详情失败: ${error.message}`, 'warning');
        });
}

// 从本地存储加载数据
function loadFromLocalStorage() {
    try {
        const savedData = localStorage.getItem('youtubeAnalyzerData');
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            youtubeData.channels = parsedData.channels || [];
            youtubeData.videos = parsedData.videos || [];
            youtubeData.apiKey = parsedData.apiKey || '';
            
            // 如果有保存的API密钥，填充到输入框
            if (youtubeData.apiKey && elements.apiKeyInput) {
                elements.apiKeyInput.value = youtubeData.apiKey;
            }
        }
    } catch (error) {
        console.error('加载本地存储数据失败:', error);
    }
}

// 保存数据到本地存储
function saveToLocalStorage() {
    try {
        localStorage.setItem('youtubeAnalyzerData', JSON.stringify({
            channels: youtubeData.channels,
            videos: youtubeData.videos,
            apiKey: youtubeData.apiKey
        }));
    } catch (error) {
        console.error('保存到本地存储失败:', error);
        showMessage('保存数据失败，请检查浏览器存储设置', 'warning');
    }
}

// 生成唯一ID
function generateId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// 改进的YouTube链接验证函数，更宽松以适应移动端
function isValidYouTubeChannelUrl(url) {
    // 支持多种YouTube URL格式，包括移动端
    return /^(https?:\/\/)?(www\.|m\.)?((youtube\.com\/(c\/|channel\/|user\/|@))|youtu\.be\/|@)[\w\-\.]+/.test(url) || 
           /^@[\w\-\.]+$/.test(url) || // 支持直接的@username格式
           /youtube\.com\/@[\w\-\.]+/.test(url); // 支持不带www的格式
}

// 改进的频道标识符提取函数，增强对移动端URL格式的兼容性
function extractChannelIdentifier(url) {
    // 处理 /channel/ID 格式
    let matches = url.match(/\/channel\/([^\/\?]+)/);
    if (matches) return matches[1];
    
    // 处理 /c/NAME 格式
    matches = url.match(/\/c\/([^\/\?]+)/);
    if (matches) return matches[1];
    
    // 处理 /user/NAME 格式
    matches = url.match(/\/user\/([^\/\?]+)/);
    if (matches) return matches[1];
    
    // 处理 @USERNAME 格式 - 改进对移动端URL的处理
    matches = url.match(/\/@([^\/\?]+)/);
    if (matches) return '@' + matches[1];
    
    // 处理移动端可能的m.youtube.com格式
    matches = url.match(/m\.youtube\.com\/@([^\/\?]+)/);
    if (matches) return '@' + matches[1];
    
    // 处理youtube.com/@username格式 (不带www)
    matches = url.match(/youtube\.com\/@([^\/\?]+)/);
    if (matches) return '@' + matches[1];
    
    // 如果URL直接是@username格式
    if (url.startsWith('@')) {
        return url;
    }
    
    // 尝试从任何包含@的URL中提取用户名
    matches = url.match(/@([^\/\?\s]+)/);
    if (matches) return '@' + matches[1];
    
    return null;
}

// 渲染频道列表
function renderChannelsList() {
    if (youtubeData.channels.length === 0) {
        elements.channelsList.innerHTML = '<p>暂无添加的YouTube博主</p>';
        return;
    }
    
    let html = '';
    youtubeData.channels.forEach(channel => {
        html += `
        <div class="channel-item">
            <div>
                <strong>${channel.name}</strong>
                <div><small>${channel.url}</small></div>
            </div>
            <div>
                <button onclick="fetchChannelVideos('${channel.id}')">刷新数据</button>
                <button onclick="removeChannel('${channel.id}')">删除</button>
            </div>
        </div>`;
    });
    
    elements.channelsList.innerHTML = html;
}

// 渲染视频数据表格（修改为使用名称筛选）
function renderVideosTable() {
    // 获取筛选条件
    const channelNameQuery = elements.channelNameFilter.value.toLowerCase();
    const sortOption = elements.sortOption.value;
    const yearFilter = elements.yearFilter.value;
    const monthFilter = elements.monthFilter.value;
    const dayFilter = elements.dayFilter.value; // 获取日期筛选值
    
    // 筛选视频
    let filteredVideos = youtubeData.videos;
    
    // 博主名称筛选（新的逻辑）
    if (channelNameQuery) {
        filteredVideos = filteredVideos.filter(video => 
            video.channelTitle.toLowerCase().includes(channelNameQuery)
        );
    }
    
    // 日期筛选
    if (yearFilter || monthFilter || dayFilter) {
        filteredVideos = filteredVideos.filter(video => {
            const publishDate = new Date(video.publishedAt);
            const videoYear = publishDate.getFullYear();
            const videoMonth = publishDate.getMonth() + 1; // 月份从0开始，+1使其与选择器匹配
            const videoDay = publishDate.getDate(); // 获取日期
            
            // 筛选年份
            if (yearFilter && videoYear !== parseInt(yearFilter)) {
                return false;
            }
            
            // 筛选月份
            if (monthFilter && videoMonth !== parseInt(monthFilter)) {
                return false;
            }
            
            // 筛选日期
            if (dayFilter && videoDay !== parseInt(dayFilter)) {
                return false;
            }
            
            return true;
        });
    }
    
    // 排序视频
    filteredVideos = sortVideos(filteredVideos, sortOption);
    
    // 分页处理
    const totalPages = Math.ceil(filteredVideos.length / youtubeData.itemsPerPage);
    const startIndex = (youtubeData.currentPage - 1) * youtubeData.itemsPerPage;
    const paginatedVideos = filteredVideos.slice(startIndex, startIndex + youtubeData.itemsPerPage);
    
    // 生成表格
    if (paginatedVideos.length === 0) {
        elements.videosTableBody.innerHTML = `<tr><td colspan="5" class="loading">暂无符合条件的视频数据</td></tr>`;
        elements.pagination.innerHTML = '';
        return;
    }
    
    let html = '';
    paginatedVideos.forEach(video => {
        html += `
        <tr>
            <td>
                <img class="video-thumbnail" src="${video.thumbnail}" alt="${video.title}" />
            </td>
            <td>
                <a href="https://www.youtube.com/watch?v=${video.videoId}" target="_blank">${video.title}</a>
            </td>
            <td>${video.channelTitle}</td>
            <td>${formatDate(video.publishedAt)}</td>
            <td>${formatNumber(video.viewCount)}</td>
        </tr>`;
    });
    
    elements.videosTableBody.innerHTML = html;
    
    // 生成分页控件
    renderPagination(totalPages);
}

// 生成分页控件
function renderPagination(totalPages) {
    if (totalPages <= 1) {
        elements.pagination.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // 上一页按钮
    html += `<button ${youtubeData.currentPage === 1 ? 'disabled' : ''} onclick="changePage(${youtubeData.currentPage - 1})">上一页</button>`;
    
    // 页码按钮
    let startPage = Math.max(1, youtubeData.currentPage - 2);
    let endPage = Math.min(totalPages, youtubeData.currentPage + 2);
    
    if (startPage > 1) {
        html += `<button onclick="changePage(1)">1</button>`;
        if (startPage > 2) {
            html += `<span>...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<button ${youtubeData.currentPage === i ? 'disabled' : ''} onclick="changePage(${i})">${i}</button>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<span>...</span>`;
        }
        html += `<button onclick="changePage(${totalPages})">${totalPages}</button>`;
    }
    
    // 下一页按钮
    html += `<button ${youtubeData.currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${youtubeData.currentPage + 1})">下一页</button>`;
    
    elements.pagination.innerHTML = html;
}

// 切换页码
function changePage(page) {
    youtubeData.currentPage = page;
    renderVideosTable();
    window.scrollTo(0, document.getElementById('videosTableContainer').offsetTop);
}

// 排序视频
function sortVideos(videos, sortOption) {
    return [...videos].sort((a, b) => {
        switch (sortOption) {
            case 'publishedDesc':
                return new Date(b.publishedAt) - new Date(a.publishedAt);
            case 'publishedAsc':
                return new Date(a.publishedAt) - new Date(b.publishedAt);
            case 'viewsDesc':
                return b.viewCount - a.viewCount;
            case 'viewsAsc':
                return a.viewCount - b.viewCount;
            default:
                return new Date(b.publishedAt) - new Date(a.publishedAt);
        }
    });
}

// 渲染分析数据
function renderAnalytics() {
    if (youtubeData.videos.length === 0) {
        elements.statsSummary.innerHTML = '<p>暂无数据可供分析</p>';
        return;
    }
    
    // 生成统计摘要
    const stats = calculateStats();
    
    let summaryHtml = '<div class="stats-grid">';
    summaryHtml += createStatCard('博主总数', stats.totalChannels);
    summaryHtml += createStatCard('视频总数', stats.totalVideos);
    summaryHtml += createStatCard('总观看次数', formatNumber(stats.totalViews));
    summaryHtml += createStatCard('平均观看次数', formatNumber(stats.avgViews));
    summaryHtml += createStatCard('百万爆款数', stats.millionVideos);
    summaryHtml += createStatCard('千万爆款数', stats.tenMillionVideos);
    summaryHtml += createStatCard('播放过亿数', stats.hundredMillionVideos);
    summaryHtml += '</div>';
    
    elements.statsSummary.innerHTML = summaryHtml;
}

// 创建统计卡片
function createStatCard(title, value) {
    return `
    <div class="stat-card">
        <div class="stat-title">${title}</div>
        <div class="stat-value">${value}</div>
    </div>`;
}

// 计算统计数据（修改版）
function calculateStats() {
    const videos = youtubeData.videos;
    const totalVideos = videos.length;
    
    // 计算总博主数量
    const totalChannels = youtubeData.channels.length;
    
    if (totalVideos === 0) {
        return {
            totalChannels: totalChannels,
            totalVideos: 0,
            totalViews: 0,
            avgViews: 0,
            millionVideos: 0,
            tenMillionVideos: 0,
            hundredMillionVideos: 0
        };
    }
    
    const totalViews = videos.reduce((sum, video) => sum + video.viewCount, 0);
    
    // 计算不同播放量级别的视频数量
    const millionVideos = videos.filter(video => video.viewCount >= 1000000 && video.viewCount < 10000000).length;
    const tenMillionVideos = videos.filter(video => video.viewCount >= 10000000 && video.viewCount < 100000000).length;
    const hundredMillionVideos = videos.filter(video => video.viewCount >= 100000000).length;
    
    return {
        totalChannels,
        totalVideos,
        totalViews,
        avgViews: Math.round(totalViews / totalVideos),
        millionVideos,
        tenMillionVideos,
        hundredMillionVideos
    };
}

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN');
}

// 格式化数字
function formatNumber(num) {
    return num >= 10000 ? `${(num / 10000).toFixed(1)}万` : num.toLocaleString();
}

// 移除频道
function removeChannel(channelId) {
    if (confirm('确定要删除这个博主及其所有数据吗？')) {
        youtubeData.channels = youtubeData.channels.filter(channel => channel.id !== channelId);
        youtubeData.videos = youtubeData.videos.filter(video => video.channelId !== channelId);
        saveToLocalStorage();
        renderChannelsList();
        renderVideosTable();
        populateYearFilter(); // 更新年份筛选器
        showMessage('已删除博主及其数据', 'success');
    }
}

// 添加示例视频数据（仅用于演示）
function addSampleVideos(channel) {
    // 检查是否已有该频道的视频数据，避免重复添加示例
    const hasExistingVideos = youtubeData.videos.some(v => v.channelId === channel.id);
    if (hasExistingVideos) return;
    
    const sampleTitles = [
        "如何提高学习效率的10个技巧",
        "旅行VLOG: 探索美丽的山水风光",
        "2023年最值得买的科技产品推荐",
        "健身初学者必看：正确的锻炼方法",
        "美食制作: 简单易学的家常菜谱",
        "编程教程: JavaScript基础入门"
    ];
    
    const now = new Date();
    
    // 为这个频道生成5-10个示例视频
    const videoCount = 5 + Math.floor(Math.random() * 6);
    
    for (let i = 0; i < videoCount; i++) {
        const publishDate = new Date(now);
        publishDate.setDate(now.getDate() - i * 7 - Math.floor(Math.random() * 7));
        
        // 为确保有2025年4月的数据，为一部分视频设置为2025年4月
        if (i % 3 === 0) {
            publishDate.setFullYear(2025);
            publishDate.setMonth(3); // 4月，月份从0开始计数
            publishDate.setDate(1 + Math.floor(Math.random() * 28)); // 随机日期
            
            // 确保有4月17日的数据
            if (i === 0) {
                publishDate.setDate(17); // 设置为4月17日
            }
        }
        
        const viewCount = Math.floor(1000 + Math.random() * 100000);
        const likeCount = Math.floor(viewCount * (0.05 + Math.random() * 0.1));
        const commentCount = Math.floor(likeCount * (0.1 + Math.random() * 0.2));
        
        youtubeData.videos.push({
            id: generateId(),
            videoId: `sample-${generateId().substring(0, 8)}`,
            channelId: channel.id,
            title: `${sampleTitles[Math.floor(Math.random() * sampleTitles.length)]} ${i + 1}`,
            channelTitle: channel.name,
            publishedAt: publishDate.toISOString(),
            thumbnail: `https://picsum.photos/seed/${Math.random()}/${320}/${180}`,
            viewCount: viewCount,
            likeCount: likeCount,
            commentCount: commentCount
        });
    }
    
    // 更新频道信息（在实际应用中应从API获取）
    channel.name = channel.name.startsWith('未知博主') ? 
        `示例博主 ${channel.channelId}` : channel.name;
    
    // 更新年份筛选选项
    populateYearFilter();
}

// 刷新频道视频数据（用于全局调用）
function fetchChannelVideos(channelId) {
    const channel = youtubeData.channels.find(ch => ch.id === channelId);
    if (!channel) return;
    
    if (youtubeData.apiKey) {
        fetchChannelData(channelId);
    } else {
        showMessage('请先在设置中设置有效的API密钥', 'warning');
        // 使用模拟数据
        addSampleVideos(channel);
        renderVideosTable();
    }
}

// 公开函数，供全局调用
window.fetchChannelVideos = fetchChannelVideos;
window.removeChannel = removeChannel;
window.changePage = changePage;

// 改进的频道标识符提取函数，增强对移动端URL格式的兼容性
function extractChannelIdentifier(url) {
    // 处理直接的@username格式
    if (url.startsWith('@')) {
        return url;
    }
    
    // 处理 /channel/ID 格式
    let matches = url.match(/\/channel\/([^\/\?]+)/);
    if (matches) return matches[1];
    
    // 处理 /c/NAME 格式
    matches = url.match(/\/c\/([^\/\?]+)/);
    if (matches) return matches[1];
    
    // 处理 /user/NAME 格式
    matches = url.match(/\/user\/([^\/\?]+)/);
    if (matches) return matches[1];
    
    // 处理 @USERNAME 格式 - 改进对移动端URL的处理
    matches = url.match(/\/@([^\/\?]+)/);
    if (matches) return '@' + matches[1];
    
    // 处理移动端可能的m.youtube.com格式
    matches = url.match(/m\.youtube\.com\/@([^\/\?]+)/);
    if (matches) return '@' + matches[1];
    
    // 处理youtube.com/@username格式 (不带www)
    matches = url.match(/youtube\.com\/@([^\/\?]+)/);
    if (matches) return '@' + matches[1];
    
    // 尝试从任何包含@的URL中提取用户名
    matches = url.match(/@([^\/\?\s]+)/);
    if (matches) return '@' + matches[1];
    
    return null;
}

// 添加示例视频数据（仅用于演示）
function addSampleVideos(channel) {
    // 检查是否已有该频道的视频数据，避免重复添加示例
    const hasExistingVideos = youtubeData.videos.some(v => v.channelId === channel.id);
    if (hasExistingVideos) return;
    
    // 首先确保频道名称不是"未知博主"
    if (channel.name.startsWith('未知博主')) {
        // 提取更友好的名称
        let friendlyName = '';
        if (channel.channelId.startsWith('@')) {
            // 如果是@格式，直接使用@后面的名称
            friendlyName = channel.channelId;
        } else {
            // 否则使用URL的最后一部分作为名称
            const urlParts = channel.url.split('/');
            friendlyName = urlParts[urlParts.length - 1];
            // 如果是空字符串，使用倒数第二部分
            if (!friendlyName && urlParts.length > 1) {
                friendlyName = urlParts[urlParts.length - 2];
            }
        }
        // 更新频道名称
        channel.name = friendlyName || `示例博主 ${channel.id.substring(0, 5)}`;
    }
    
    const sampleTitles = [
        "如何提高学习效率的10个技巧",
        "旅行VLOG: 探索美丽的山水风光",
        "2023年最值得买的科技产品推荐",
        "健身初学者必看：正确的锻炼方法",
        "美食制作: 简单易学的家常菜谱",
        "编程教程: JavaScript基础入门"
    ];
    
    const now = new Date();
    
    // 为这个频道生成5-10个示例视频
    const videoCount = 5 + Math.floor(Math.random() * 6);
    
    for (let i = 0; i < videoCount; i++) {
        const publishDate = new Date(now);
        publishDate.setDate(now.getDate() - i * 7 - Math.floor(Math.random() * 7));
        
        // 为确保有2025年4月的数据，为一部分视频设置为2025年4月
        if (i % 3 === 0) {
            publishDate.setFullYear(2025);
            publishDate.setMonth(3); // 4月，月份从0开始计数
            publishDate.setDate(1 + Math.floor(Math.random() * 28)); // 随机日期
            
            // 确保有4月17日的数据
            if (i === 0) {
                publishDate.setDate(17); // 设置为4月17日
            }
        }
        
        const viewCount = Math.floor(1000 + Math.random() * 100000);
        const likeCount = Math.floor(viewCount * (0.05 + Math.random() * 0.1));
        const commentCount = Math.floor(likeCount * (0.1 + Math.random() * 0.2));
        
        youtubeData.videos.push({
            id: generateId(),
            videoId: `sample-${generateId().substring(0, 8)}`,
            channelId: channel.id,
            title: `${sampleTitles[Math.floor(Math.random() * sampleTitles.length)]} ${i + 1}`,
            channelTitle: channel.name,
            publishedAt: publishDate.toISOString(),
            thumbnail: `https://picsum.photos/seed/${Math.random()}/${320}/${180}`,
            viewCount: viewCount,
            likeCount: likeCount,
            commentCount: commentCount
        });
    }
    
    // 保存更新后的数据
    saveToLocalStorage();
    renderChannelsList();
    
    // 更新年份筛选选项
    populateYearFilter();
}

// 批量添加单个频道，返回处理结果状态
function batchAddChannel(channelUrl) {
    channelUrl = channelUrl.trim();
    
    // 验证链接格式 - 更宽松的验证以适应移动端
    if (!isValidYouTubeChannelUrl(channelUrl)) {
        console.log('无效的YouTube链接:', channelUrl);
        return 'failed';
    }
    
    // 检查是否已添加
    if (youtubeData.channels.some(channel => channel.url === channelUrl)) {
        return 'duplicate';
    }
    
    // 提取频道ID或用户名
    const channelId = extractChannelIdentifier(channelUrl);
    if (!channelId) {
        console.log('无法提取频道标识符:', channelUrl);
        return 'failed';
    }
    
    // 从URL中提取更友好的名称
    let friendlyName = '';
    if (channelId.startsWith('@')) {
        // 如果是@格式，直接使用@后面的名称
        friendlyName = channelId;
    } else {
        // 尝试从URL中提取名称
        const urlParts = channelUrl.split('/').filter(part => part);
        friendlyName = urlParts[urlParts.length - 1];
    }
    
    // 添加频道
    const newChannel = {
        id: generateId(),
        url: channelUrl,
        channelId: channelId,
        name: friendlyName || `博主 ${channelId.substring(0, 10)}`, // 使用更友好的初始名称
        addedAt: new Date().toISOString()
    };
    
    youtubeData.channels.push(newChannel);
    saveToLocalStorage();
    
    // 如果有API密钥，尝试获取真实数据
    if (youtubeData.apiKey) {
        // 使用setTimeout避免在批量导入时阻塞UI
        setTimeout(() => {
            fetchChannelData(newChannel.id);
        }, 500);
    } else {
        // 使用模拟数据
        addSampleVideos(newChannel);
    }
    
    return 'success';
}

// 添加YouTube博主
function addChannel() {
    const channelUrl = elements.channelInput.value.trim();
    
    if (!channelUrl) {
        showMessage('请输入YouTube博主链接', 'warning');
        return;
    }
    
    // 验证链接格式
    if (!isValidYouTubeChannelUrl(channelUrl)) {
        showMessage('无效的YouTube博主链接，请使用正确的YouTube链接格式', 'warning');
        return;
    }
    
    // 检查是否已添加
    if (youtubeData.channels.some(channel => channel.url === channelUrl)) {
        showMessage('此博主已经添加过了', 'warning');
        return;
    }
    
    // 提取频道ID或用户名
    const channelId = extractChannelIdentifier(channelUrl);
    if (!channelId) {
        showMessage('无法识别频道标识符', 'warning');
        return;
    }
    
    // 从URL中提取更友好的名称
    let friendlyName = '';
    if (channelId.startsWith('@')) {
        // 如果是@格式，直接使用@后面的名称
        friendlyName = channelId;
    } else {
        // 尝试从URL中提取名称
        const urlParts = channelUrl.split('/').filter(part => part);
        friendlyName = urlParts[urlParts.length - 1];
    }
    
    // 添加频道
    const newChannel = {
        id: generateId(),
        url: channelUrl,
        channelId: channelId,
        name: friendlyName || `博主 ${channelId.substring(0, 10)}`, // 使用更友好的初始名称
        addedAt: new Date().toISOString()
    };
    
    youtubeData.channels.push(newChannel);
    saveToLocalStorage();
    renderChannelsList();
    
    // 清空输入框
    elements.channelInput.value = '';
    
    // 显示成功消息
    showMessage(`已添加博主: ${friendlyName || channelUrl}`, 'success');
    
    // 如果有API密钥，尝试获取真实数据
    if (youtubeData.apiKey) {
        fetchChannelData(newChannel.id);
    } else {
        showMessage('提示：设置YouTube API密钥后可获取真实数据', 'warning');
        // 使用模拟数据
        addSampleVideos(newChannel);
    }
    
    // 更新年份筛选器
    populateYearFilter();
}