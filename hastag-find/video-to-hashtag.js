document.addEventListener('DOMContentLoaded', function() {
    // --- Reusable components from original file ---
    // (Mobile menu, smooth scroll, FAQ toggle, toast notifications etc.)

    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
            // Basic mobile menu display logic
             if (navMenu.style.display === 'flex') {
                    navMenu.style.display = 'none';
                } else {
                    navMenu.style.display = 'flex';
                    navMenu.style.position = 'absolute';
                    navMenu.style.top = '70px'; // Adjust based on header height
                    navMenu.style.left = '0';
                    navMenu.style.width = '100%';
                    navMenu.style.background = 'white';
                    navMenu.style.flexDirection = 'column';
                    navMenu.style.padding = '1rem';
                    navMenu.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                }
        });
    }

    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        question.addEventListener('click', () => {
            const answer = item.querySelector('.faq-answer');
            const wasActive = item.classList.contains('active');

            faqItems.forEach(i => {
                i.classList.remove('active');
                i.querySelector('.faq-answer').style.maxHeight = null;
            });

            if (!wasActive) {
                item.classList.add('active');
                answer.style.maxHeight = answer.scrollHeight + "px";
            }
        });
    });
    
    // --- YouTube API Manager (copied and simplified) ---
    const youtubeApiManager = {
        apiKeys: JSON.parse(localStorage.getItem('youtubeApiKeys')) || [],
        currentKeyIndex: 0,
        initialize: function() {
            this.updateApiKeyCount();
        },
        addApiKey: function(key) {
            if (key && !this.apiKeys.includes(key)) {
                this.apiKeys.push(key);
                this.saveKeys();
                return true;
            }
            return false;
        },
        removeApiKey: function(index) {
            if (index >= 0 && index < this.apiKeys.length) {
                this.apiKeys.splice(index, 1);
                this.saveKeys();
                return true;
            }
            return false;
        },
        saveKeys: function() {
            localStorage.setItem('youtubeApiKeys', JSON.stringify(this.apiKeys));
            this.updateApiKeyCount();
        },
        getCurrentKey: function() {
            if (this.apiKeys.length === 0) return null;
            return this.apiKeys[this.currentKeyIndex];
        },
        rotateKey: function() {
            if (this.apiKeys.length > 1) {
                this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
                console.log('Rotated to new API key.');
                return this.getCurrentKey();
            }
            return null; // No other keys to rotate to
        },
        updateApiKeyCount: function() {
            const apiKeyCountEl = document.getElementById('api-key-count');
            if (apiKeyCountEl) {
                apiKeyCountEl.textContent = this.apiKeys.length;
            }
        }
    };
    youtubeApiManager.initialize();


    // --- Core Application Logic ---
    const extractBtn = document.getElementById('extract-hashtags-btn');
    const videoLinksInput = document.getElementById('video-links-input');
    const statusEl = document.querySelector('.search-status');
    const resultsEl = document.querySelector('.search-results');
    let analysisResults = []; // To store {tag, count} objects

    extractBtn.addEventListener('click', performAnalysis);

    async function performAnalysis() {
        const linksText = videoLinksInput.value.trim();
        if (!linksText) {
            showToast('请输入至少一个YouTube视频链接', 'error');
            return;
        }

        if (youtubeApiManager.apiKeys.length === 0) {
            showToast('请先添加YouTube API密钥', 'error');
            openApiKeyModal(); // Assuming this function exists or is added
            return;
        }

        const urls = linksText.split('\n').filter(link => link.trim() !== '');
        const videoIds = urls.map(extractVideoId).filter(id => id);

        if (videoIds.length === 0) {
            showToast('未找到有效的YouTube视频链接', 'error');
            return;
        }

        // UI updates
        statusEl.style.display = 'block';
        resultsEl.style.display = 'none';
        extractBtn.disabled = true;

        let allHashtags = [];
        let processedCount = 0;
        
        try {
            for (const videoId of videoIds) {
                updateProgress(processedCount / videoIds.length * 100, `正在分析视频 ${processedCount + 1}/${videoIds.length}`);
                
                try {
                    const videoDetails = await getVideoDetails(videoId);
                    if (videoDetails) {
                        const { title, description } = videoDetails.snippet;
                        const titleHashtags = (title.match(/#\w+/g) || []);
                        const descHashtags = (description.match(/#\w+/g) || []);
                        allHashtags.push(...titleHashtags, ...descHashtags);
                    }
                } catch (error) {
                    console.error(`分析视频 ${videoId} 失败:`, error);
                    if (error.message.includes('quota')) {
                        showToast('API配额用尽，尝试切换密钥...', 'warning');
                        if (!youtubeApiManager.rotateKey()) {
                            showToast('所有API密钥配额均已用尽', 'error');
                            throw new Error('All API key quotas exceeded.');
                        }
                    } else {
                        showToast(`分析视频 ${videoId} 失败`, 'error');
                    }
                }
                processedCount++;
            }

            updateProgress(100, '分析完成！正在统计结果...');
            analysisResults = countHashtagFrequency(allHashtags);
            displayResults(analysisResults, processedCount, allHashtags.length);
            
            statusEl.style.display = 'none';
            resultsEl.style.display = 'block';
            showToast('分析成功！', 'success');

        } catch (error) {
            statusEl.style.display = 'none';
            showToast(`分析过程中断: ${error.message}`, 'error');
        } finally {
            extractBtn.disabled = false;
        }
    }

    function extractVideoId(url) {
        let videoId = null;
        const patterns = [
            /(?:v=|\/v\/|embed\/|watch\?v=|\/e\/|youtu\.be\/)([^#\&\?]{11})/,
        ];
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                videoId = match[1];
                break;
            }
        }
        return videoId;
    }

    async function getVideoDetails(videoId) {
        const apiKey = youtubeApiManager.getCurrentKey();
        if (!apiKey) throw new Error('没有可用的API密钥');

        const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            if (data.error.errors[0].reason === 'quotaExceeded') {
                throw new Error('quota');
            }
            throw new Error(data.error.message);
        }
        return data.items && data.items.length > 0 ? data.items[0] : null;
    }

    function countHashtagFrequency(hashtags) {
        const frequencyMap = new Map();
        hashtags.forEach(tag => {
            const lowerCaseTag = tag.toLowerCase();
            frequencyMap.set(lowerCaseTag, (frequencyMap.get(lowerCaseTag) || 0) + 1);
        });
        return Array.from(frequencyMap.entries())
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count);
    }
    
    function updateProgress(percent, message) {
        const progressBar = document.querySelector('.progress-bar');
        const progressText = document.querySelector('.progress-text');
        if (progressBar) progressBar.style.width = `${percent}%`;
        if (progressText) progressText.textContent = message;
    }

    function displayResults(hashtagData, videoCount, totalHashtagCount) {
        // Update stats
        document.getElementById('video-count').textContent = videoCount;
        document.getElementById('unique-hashtag-count').textContent = hashtagData.length;
        document.getElementById('total-hashtag-count').textContent = totalHashtagCount;

        // Populate table
        const tableContainer = document.querySelector('.hashtags-table');
        tableContainer.innerHTML = ''; // Clear previous results

        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Hashtag</th>
                    <th>出现频率</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        `;
        const tbody = table.querySelector('tbody');
        
        if (hashtagData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2">未找到任何Hashtag。</td></tr>';
        } else {
            hashtagData.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.tag}</td>
                    <td>${item.count}</td>
                `;
                tbody.appendChild(row);
            });
        }
        tableContainer.appendChild(table);
    }

    // --- Export Functions ---
    document.getElementById('export-csv').addEventListener('click', downloadCSV);
    document.getElementById('export-pdf').addEventListener('click', downloadPDF);

    function downloadCSV() {
        if (analysisResults.length === 0) {
            showToast('没有数据可导出', 'warning');
            return;
        }
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // Add BOM for Excel
        csvContent += "Hashtag,Frequency\n";
        analysisResults.forEach(item => {
            csvContent += `${item.tag},${item.count}\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "youtube_hashtag_analysis.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function downloadPDF() {
        if (analysisResults.length === 0) {
            showToast('没有数据可导出', 'warning');
            return;
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text("YouTube Hashtag Analysis", 14, 22);
        
        const tableData = analysisResults.map(item => [item.tag, item.count]);

        doc.autoTable({
            head: [['Hashtag', 'Frequency']],
            body: tableData,
            startY: 30,
        });

        doc.save('youtube_hashtag_analysis.pdf');
    }

    // --- Toast Notification ---
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type} show`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => document.body.removeChild(toast), 500);
        }, 3000);
    }

    // --- API Key Modal (A simplified version) ---
    function openApiKeyModal() {
        // You would have a full-featured modal here. For now, a placeholder.
        // This should be replaced with the modal creation logic from your other JS files.
        const key = prompt("您尚未配置API密钥。请输入您的YouTube Data API v3密钥：");
        if (key) {
            if (youtubeApiManager.addApiKey(key)) {
                showToast('API密钥已添加', 'success');
            } else {
                showToast('此API密钥已存在', 'info');
            }
        }
    }
    
    document.getElementById('manage-api-keys').addEventListener('click', openApiKeyModal);

});