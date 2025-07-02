/**
 * YouTube频道标签提取工具
 * 用于从YouTube频道中提取常用标签和关键词
 */

document.addEventListener('DOMContentLoaded', function() {
    // 引用YouTube API管理器
    const apiManager = window.YouTubeApiManager ? window.YouTubeApiManager.manager : youtubeApiManager;
    const showToast = window.YouTubeApiManager ? window.YouTubeApiManager.showToast : showToast;
    const openApiKeyModal = window.YouTubeApiManager ? window.YouTubeApiManager.openApiKeyModal : openApiKeyModal;
    
    // 初始化DOM元素
    const startExtractionBtn = document.getElementById('start-extraction-btn');
    const channelUrlInput = document.getElementById('channel-url-input');
    const progressArea = document.querySelector('.progress-area');
    const progressBar = document.querySelector('.progress-bar');
    const progressMessage = document.getElementById('progress-message');
    const resultsArea = document.querySelector('.results-area');
    const hashtagsTable = document.getElementById('hashtags-table');
    const resultsSummary = document.querySelector('.results-summary');
    const manageApiKeysBtn = document.getElementById('manage-api-keys');
    
    // 初始化状态
    let isExtracting = false;
    let extractionResults = {
        channelInfo: null,
        videos: [],
        hashtags: [],
        keywords: []
    };
    
    // 添加事件监听器
    if (startExtractionBtn) {
        startExtractionBtn.addEventListener('click', startExtraction);
    }
    
    if (manageApiKeysBtn) {
        manageApiKeysBtn.addEventListener('click', function() {
            openApiKeyModal();
        });
    }
    
    // 更新API密钥计数
    updateApiKeyCount();
    
    // 监听API密钥管理完成事件
    document.addEventListener('apikeycontinue', function() {
        updateApiKeyCount();
    });
    
    // 导出CSV按钮
    const exportCsvBtn = document.getElementById('export-csv');
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', exportToCSV);
    }
    
    // 导出Excel按钮
    const exportExcelBtn = document.getElementById('export-excel');
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', function() {
            loadJSZip(function() {
                exportToExcel();
            });
        });
    }
    
    /**
     * 开始提取频道标签
     */
    async function startExtraction() {
        const channelUrl = channelUrlInput.value.trim();
        
        // 验证输入
        if (!validateYouTubeChannel(channelUrl)) {
            showToast('请输入有效的YouTube频道链接或ID', 'error');
            return;
        }
        
        // 检查API密钥
        if (apiManager.apiKeys.length === 0) {
            showToast('请先添加YouTube API密钥', 'error');
            openApiKeyModal();
            return;
        }
        
        // 防止重复点击
        if (isExtracting) return;
        isExtracting = true;
        
        // 重置结果
        extractionResults = {
            channelInfo: null,
            videos: [],
            hashtags: [],
            keywords: []
        };
        
        // 显示进度区域，隐藏结果区域
        progressArea.style.display = 'block';
        resultsArea.style.display = 'none';
        startExtractionBtn.disabled = true;
        startExtractionBtn.textContent = '提取中...';
        
        try {
            // 步骤1: 获取频道信息
            updateProgress(10, '步骤 1/4: 获取频道信息');
            const channelId = extractChannelId(channelUrl);
            const channelInfo = await getChannelInfo(channelId);
            extractionResults.channelInfo = channelInfo;
            
            // 步骤2: 获取频道视频
            updateProgress(30, '步骤 2/4: 获取频道视频');
            const videos = await getChannelVideos(channelInfo.id, 50);
            extractionResults.videos = videos;
            
            // 步骤3: 提取标签和关键词
            updateProgress(60, '步骤 3/4: 提取标签和关键词');
            const { hashtags, keywords } = extractTagsAndKeywords(videos);
            extractionResults.hashtags = hashtags;
            extractionResults.keywords = keywords;
            
            // 步骤4: 分析和整理结果
            updateProgress(90, '步骤 4/4: 分析结果');
            await new Promise(resolve => setTimeout(resolve, 500)); // 给用户一个视觉反馈
            
            // 完成
            updateProgress(100, '提取完成!');
            
            // 显示结果
            displayResults(extractionResults);
            
            // 重置状态
            isExtracting = false;
            startExtractionBtn.disabled = false;
            startExtractionBtn.textContent = '开始提取';
            
            showToast('标签提取完成!', 'success');
            
        } catch (error) {
            console.error('提取过程中出错:', error);
            showToast('提取失败: ' + error.message, 'error');
            
            // 重置状态
            isExtracting = false;
            startExtractionBtn.disabled = false;
            startExtractionBtn.textContent = '开始提取';
        }
    }
    
    /**
     * 更新进度条和消息
     */
    function updateProgress(percent, message) {
        if (progressBar) progressBar.style.width = `${percent}%`;
        if (progressMessage) progressMessage.textContent = message;
    }
    
    /**
     * 获取频道信息
     */
    async function getChannelInfo(channelId) {
        const apiKey = apiManager.getCurrentKey();
        if (!apiKey) throw new Error('没有可用的API密钥');
        
        // 构建API请求URL
        let searchUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&id=${channelId}&key=${apiKey}`;
        
        // 如果不是频道ID而是用户名/自定义URL
        if (!channelId.startsWith('UC')) {
            // 处理@格式的频道链接
            if (channelId.startsWith('@')) {
                // 使用search API查找频道
                searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(channelId)}&type=channel&key=${apiKey}`;
                
                const searchResponse = await fetch(searchUrl);
                const searchData = await searchResponse.json();
                
                if (searchData.error) {
                    if (searchData.error.errors[0].reason === 'quotaExceeded') {
                        apiManager.rotateKey();
                        return getChannelInfo(channelId); // 尝试使用新的API密钥
                    }
                    throw new Error(searchData.error.message);
                }
                
                if (!searchData.items || searchData.items.length === 0) {
                    throw new Error(`未找到频道: ${channelId}`);
                }
                
                // 获取频道ID
                const foundChannelId = searchData.items[0].snippet.channelId;
                
                // 使用找到的频道ID重新获取完整信息
                return getChannelInfo(foundChannelId);
            } else {
                // 尝试作为用户名查询
                searchUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&forUsername=${channelId}&key=${apiKey}`;
            }
        }
        
        const response = await fetch(searchUrl);
        const data = await response.json();
        
        if (data.error) {
            if (data.error.errors[0].reason === 'quotaExceeded') {
                apiManager.rotateKey();
                return getChannelInfo(channelId); // 尝试使用新的API密钥
            }
            throw new Error(data.error.message);
        }
        
        if (!data.items || data.items.length === 0) {
            throw new Error(`未找到频道: ${channelId}`);
        }
        
        const channel = data.items[0];
        
        return {
            id: channel.id,
            title: channel.snippet.title,
            description: channel.snippet.description,
            customUrl: channel.snippet.customUrl,
            publishedAt: channel.snippet.publishedAt,
            thumbnails: channel.snippet.thumbnails,
            subscriberCount: parseInt(channel.statistics.subscriberCount || 0),
            videoCount: parseInt(channel.statistics.videoCount || 0),
            viewCount: parseInt(channel.statistics.viewCount || 0),
            keywords: channel.brandingSettings?.channel?.keywords || '',
            country: channel.snippet.country || '未知'
        };
    }
    
    /**
     * 获取频道视频列表
     */
    async function getChannelVideos(channelId, maxResults = 50) {
        const apiKey = apiManager.getCurrentKey();
        if (!apiKey) throw new Error('没有可用的API密钥');
        
        // 首先获取频道的上传播放列表ID
        const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`;
        const channelResponse = await fetch(channelUrl);
        const channelData = await channelResponse.json();
        
        if (channelData.error) {
            if (channelData.error.errors[0].reason === 'quotaExceeded') {
                apiManager.rotateKey();
                return getChannelVideos(channelId, maxResults); // 尝试使用新的API密钥
            }
            throw new Error(channelData.error.message);
        }
        
        if (!channelData.items || channelData.items.length === 0) {
            throw new Error(`未找到频道: ${channelId}`);
        }
        
        const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;
        
        // 获取播放列表中的视频
        const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=${maxResults}&playlistId=${uploadsPlaylistId}&key=${apiKey}`;
        const playlistResponse = await fetch(playlistUrl);
        const playlistData = await playlistResponse.json();
        
        if (playlistData.error) {
            if (playlistData.error.errors[0].reason === 'quotaExceeded') {
                apiManager.rotateKey();
                return getChannelVideos(channelId, maxResults); // 尝试使用新的API密钥
            }
            throw new Error(playlistData.error.message);
        }
        
        // 提取视频ID
        const videoIds = playlistData.items.map(item => item.snippet.resourceId.videoId);
        
        if (videoIds.length === 0) {
            return [];
        }
        
        // 获取视频详情和统计数据
        const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,topicDetails&id=${videoIds.join(',')}&key=${apiKey}`;
        const videosResponse = await fetch(videosUrl);
        const videosData = await videosResponse.json();
        
        if (videosData.error) {
            if (videosData.error.errors[0].reason === 'quotaExceeded') {
                apiManager.rotateKey();
                return getChannelVideos(channelId, maxResults); // 尝试使用新的API密钥
            }
            throw new Error(videosData.error.message);
        }
        
        // 处理视频数据
        return videosData.items.map(video => ({
            id: video.id,
            title: video.snippet.title,
            description: video.snippet.description,
            publishedAt: video.snippet.publishedAt,
            tags: video.snippet.tags || [],
            viewCount: parseInt(video.statistics.viewCount || 0),
            likeCount: parseInt(video.statistics.likeCount || 0),
            commentCount: parseInt(video.statistics.commentCount || 0),
            topics: video.topicDetails?.topicCategories || []
        }));
    }
    
    /**
     * 从视频中提取标签和关键词
     */
    function extractTagsAndKeywords(videos) {
        const hashtagMap = new Map();
        const keywordMap = new Map();
        
        videos.forEach(video => {
            // 从标题和描述中提取hashtags
            const titleHashtags = (video.title.match(/#\w+/g) || []).map(tag => tag.toLowerCase());
            const descHashtags = (video.description.match(/#[\w\u4e00-\u9fa5]+/g) || []).map(tag => tag.toLowerCase());
            
            // 合并并计算hashtag出现次数
            const allHashtags = [...titleHashtags, ...descHashtags];
            allHashtags.forEach(tag => {
                hashtagMap.set(tag, (hashtagMap.get(tag) || 0) + 1);
            });
            
            // 处理视频标签
            if (video.tags && video.tags.length > 0) {
                video.tags.forEach(tag => {
                    keywordMap.set(tag.toLowerCase(), (keywordMap.get(tag.toLowerCase()) || 0) + 1);
                });
            }
            
            // 从标题中提取关键词 (简单实现，实际可能需要NLP)
            const titleWords = video.title
                .toLowerCase()
                .replace(/[^\w\s\u4e00-\u9fa5]/g, ' ') // 保留中文字符
                .split(/\s+/)
                .filter(word => word.length > 2 && !['the', 'and', 'for', 'with', 'this', 'that'].includes(word));
            
            titleWords.forEach(word => {
                keywordMap.set(word, (keywordMap.get(word) || 0) + 1);
            });
        });
        
        // 转换为数组并排序
        const hashtags = Array.from(hashtagMap.entries())
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count);
        
        const keywords = Array.from(keywordMap.entries())
            .map(([keyword, count]) => ({ keyword, count }))
            .sort((a, b) => b.count - a.count)
            .filter(item => item.count > 1); // 过滤掉只出现一次的关键词
        
        return { hashtags, keywords };
    }
    
    /**
     * 显示提取结果
     */
    function displayResults(results) {
        // 显示结果区域
        resultsArea.style.display = 'block';
        
        // 更新结果摘要
        resultsSummary.innerHTML = `
            <p><strong>${results.channelInfo.title}</strong> 频道分析结果</p>
            <p>订阅数: ${results.channelInfo.subscriberCount.toLocaleString()}</p>
            <p>总视频数: ${results.channelInfo.videoCount.toLocaleString()}</p>
            <p>总观看量: ${results.channelInfo.viewCount.toLocaleString()}</p>
            <p>分析了 ${results.videos.length} 个视频</p>
            <p>提取了 ${results.hashtags.length} 个hashtags和 ${results.keywords.length} 个关键词</p>
        `;
        
        // 清空表格
        if (hashtagsTable) {
            const tbody = hashtagsTable.querySelector('tbody');
            tbody.innerHTML = '';
            
            // 添加hashtags
            results.hashtags.slice(0, 50).forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.tag}</td>
                    <td>${item.count}</td>
                    <td>Hashtag</td>
                `;
                tbody.appendChild(row);
            });
            
            // 添加关键词
            results.keywords.slice(0, 50).forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.keyword}</td>
                    <td>${item.count}</td>
                    <td>关键词</td>
                `;
                tbody.appendChild(row);
            });
        }
    }
    
    /**
     * 导出结果为CSV
     */
    function exportToCSV() {
        if (!extractionResults.channelInfo) {
            showToast('没有可导出的数据', 'error');
            return;
        }
        
        const channelName = extractionResults.channelInfo.title;
        const filename = `${channelName}-标签分析.csv`;
        
        // 创建CSV内容
        const headers = ['标签/关键词', '出现次数', '类型'];
        const rows = [
            headers,
            ...extractionResults.hashtags.map(item => [item.tag, item.count, 'Hashtag']),
            ...extractionResults.keywords.map(item => [item.keyword, item.count, '关键词'])
        ];
        
        // 生成CSV
        const csvContent = generateCSV(rows);
        
        // 下载CSV
        downloadCSV(csvContent, filename);
        
        showToast('CSV导出成功', 'success');
    }
    
    /**
     * 导出结果为Excel
     */
    function exportToExcel() {
        if (!extractionResults.channelInfo) {
            showToast('没有可导出的数据', 'error');
            return;
        }
        
        showToast('正在准备Excel文件...', 'info');
        
        try {
            const channelName = extractionResults.channelInfo.title;
            
            // 创建包含多个工作表的ZIP文件
            const zip = new JSZip();
            
            // 标签和关键词工作表
            const tagsCSV = generateCSV([
                ['标签/关键词', '出现次数', '类型'],
                ...extractionResults.hashtags.map(item => [item.tag, item.count, 'Hashtag']),
                ...extractionResults.keywords.map(item => [item.keyword, item.count, '关键词'])
            ]);
            
            // 频道信息工作表
            const channelCSV = generateCSV([
                ['频道名称', extractionResults.channelInfo.title],
                ['频道ID', extractionResults.channelInfo.id],
                ['订阅数', extractionResults.channelInfo.subscriberCount],
                ['视频数', extractionResults.channelInfo.videoCount],
                ['总观看量', extractionResults.channelInfo.viewCount],
                ['国家/地区', extractionResults.channelInfo.country],
                ['创建日期', new Date(extractionResults.channelInfo.publishedAt).toLocaleDateString()],
                ['频道关键词', extractionResults.channelInfo.keywords]
            ]);
            
            // 视频列表工作表
            const videosCSV = generateCSV([
                ['视频标题', '发布日期', '观看量', '点赞数', '评论数', '视频链接'],
                ...extractionResults.videos.map(video => [
                    video.title,
                    new Date(video.publishedAt).toLocaleDateString(),
                    video.viewCount,
                    video.likeCount,
                    video.commentCount,
                    `https://youtube.com/watch?v=${video.id}`
                ])
            ]);
            
            // 添加到ZIP文件
            zip.file("标签和关键词.csv", tagsCSV);
            zip.file("频道信息.csv", channelCSV);
            zip.file("视频列表.csv", videosCSV);
            
            // 生成并下载ZIP文件
            zip.generateAsync({type: "blob"}).then(function(content) {
                const url = URL.createObjectURL(content);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${channelName}-标签分析.zip`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                
                showToast('Excel导出成功', 'success');
            });
        } catch (error) {
            console.error('导出Excel错误:', error);
            
            // 如果出错，尝试导出单个CSV文件
            exportToCSV();
        }
    }
    
    /**
     * 生成CSV内容
     */
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
    
    /**
     * 下载CSV文件
     */
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
    
    /**
     * 加载JSZip库
     */
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
    
    /**
     * 更新API密钥计数
     */
    function updateApiKeyCount() {
        const apiKeyCount = document.getElementById('api-key-count');
        if (apiKeyCount) {
            apiKeyCount.textContent = apiManager.apiKeys.length;
        }
    }
    
    /**
     * 验证YouTube频道输入
     */
    function validateYouTubeChannel(channelInput) {
        if (!channelInput || channelInput.trim() === '') return false;
        
        // 提取频道ID（如果是URL）
        let channelId = channelInput.trim();
        
        // 检查是否是YouTube URL
        if (channelId.includes('youtube.com/')) {
            // 尝试提取频道ID
            const urlPattern = /youtube\.com\/(channel|c|user|@)\/([^\/\?]+)/;
            const match = channelId.match(urlPattern);
            
            if (match && match[2]) {
                channelId = match[2];
            } else {
                // 尝试匹配新的@格式
                const atPattern = /youtube\.com\/@([^\/\?]+)/;
                const atMatch = channelId.match(atPattern);
                if (atMatch && atMatch[1]) {
                    channelId = '@' + atMatch[1];
                } else {
                    return false; // 无效的YouTube URL格式
                }
            }
        }
        
        return true;
    }
    
    /**
     * 从不同的YouTube URL格式中提取频道ID
     */
    function extractChannelId(channelInput) {
        let channelId = channelInput.trim();
        
        // 如果已经是频道ID（以UC开头）
        if (/^UC[\w-]{21,24}$/.test(channelId)) {
            return channelId;
        }
        
        // 从YouTube URL格式中提取
        if (channelId.includes('youtube.com/')) {
            // 频道格式: youtube.com/channel/UC...
            if (channelId.includes('/channel/')) {
                const match = channelId.match(/youtube\.com\/channel\/(UC[\w-]{21,24})/);
                if (match && match[1]) return match[1];
            }
            
            // 自定义URL格式: youtube.com/c/ChannelName
            if (channelId.includes('/c/')) {
                const match = channelId.match(/youtube\.com\/c\/([^\/\?]+)/);
                if (match && match[1]) return match[1];
            }
            
            // 用户名格式: youtube.com/user/UserName
            if (channelId.includes('/user/')) {
                const match = channelId.match(/youtube\.com\/user\/([^\/\?]+)/);
                if (match && match[1]) return match[1];
            }
            
            // @格式: youtube.com/@ChannelName
            if (channelId.includes('/@')) {
                const match = channelId.match(/youtube\.com\/@([^\/\?]+)/);
                if (match && match[1]) return '@' + match[1];
            }
        }
        
        // 如果是直接的@格式
        if (channelId.startsWith('@')) {
            return channelId;
        }
        
        // 如果无法解析，则按原样返回
        return channelId;
    }
});