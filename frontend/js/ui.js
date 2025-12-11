/**
 * UI utilities and components
 */

class UIUtils {
    constructor() {
        this.toastContainer = document.getElementById('toast-container');
        this.loadingOverlay = document.getElementById('loading-overlay');
    }

    // Toast notifications
    showToast(message, type = 'info', duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icon = this.getToastIcon(type);
        toast.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        `;

        this.toastContainer.appendChild(toast);

        // Auto remove
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, duration);

        return toast;
    }

    getToastIcon(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    // Loading overlay
    showLoading(text = 'Processing...') {
        const loadingText = document.getElementById('loading-text');
        if (loadingText) {
            loadingText.textContent = text;
        }
        this.loadingOverlay.style.display = 'flex';
    }

    hideLoading() {
        this.loadingOverlay.style.display = 'none';
    }

    // Video list rendering
    renderVideoList(videos) {
        const container = document.getElementById('videos-list');
        
        if (!videos || videos.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-video-slash"></i>
                    <p>No videos found. Click "Scan Videos" to get started.</p>
                </div>
            `;
            return;
        }

        const videosHtml = videos.map(video => this.createVideoItem(video)).join('');
        container.innerHTML = videosHtml;
    }

    createVideoItem(video) {
        const statusClass = video.has_caption ? 'status-complete' : 'status-pending';
        const statusText = video.has_caption ? '✅ Complete' : '⏳ Needs Caption';
        const statusIcon = video.has_caption ? 'fa-check-circle' : 'fa-clock';

        return `
            <div class="video-item">
                <div class="video-info">
                    <div class="video-title">${this.escapeHtml(video.title)}</div>
                    <div class="video-details">
                        <span><i class="fas fa-tag"></i> ${this.escapeHtml(video.topic)}</span>
                        ${video.size ? `<span><i class="fas fa-file"></i> ${this.formatFileSize(video.size)}</span>` : ''}
                        <span class="video-status ${statusClass}">
                            <i class="fas ${statusIcon}"></i>
                            ${statusText}
                        </span>
                    </div>
                </div>
                <div class="video-actions">
                    ${!video.has_caption ? `
                        <button class="btn btn-primary btn-small" onclick="app.generateSingleCaption('${this.escapeHtml(video.title)}')">
                            <i class="fas fa-magic"></i>
                            Generate
                        </button>
                    ` : `
                        <button class="btn btn-secondary btn-small" onclick="app.regenerateCaption('${this.escapeHtml(video.title)}')">
                            <i class="fas fa-redo"></i>
                            Regenerate
                        </button>
                        <button class="btn btn-warning btn-small" onclick="app.deleteCaption('${this.escapeHtml(video.title)}')">
                            <i class="fas fa-trash"></i>
                            Delete
                        </button>
                        <button class="btn btn-youtube btn-small" onclick="app.uploadToYouTube('${this.escapeHtml(video.title)}')">
                            <i class="fab fa-youtube"></i>
                            Upload
                        </button>
                    `}
                </div>
            </div>
        `;
    }

    // Results rendering
    renderResults(results) {
        const container = document.getElementById('results-content');
        const section = document.getElementById('results-section');
        
        if (!results || Object.keys(results).length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-magic"></i>
                    <p>No captions generated yet.</p>
                </div>
            `;
        } else {
            const resultsHtml = Object.entries(results).map(([title, caption]) => `
                <div class="result-item">
                    <div class="result-title">
                        <i class="fas fa-video"></i>
                        ${this.escapeHtml(title)}
                    </div>
                    <div class="result-caption">${this.escapeHtml(caption)}</div>
                </div>
            `).join('');
            
            container.innerHTML = resultsHtml;
        }
        
        section.style.display = 'block';
    }

    // Status cards update
    updateStatusCards(stats) {
        document.getElementById('total-videos').textContent = stats.total_videos || 0;
        document.getElementById('captioned-videos').textContent = stats.videos_with_captions || 0;
        document.getElementById('pending-videos').textContent = stats.videos_without_captions || 0;
        document.getElementById('completion-rate').textContent = `${stats.completion_percentage || 0}%`;
    }

    // Utility functions
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Button states
    setButtonState(buttonId, enabled, text = null) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.disabled = !enabled;
            if (text) {
                button.innerHTML = text;
            }
        }
    }

    // Form helpers
    getFormData() {
        return {
            directory: document.getElementById('directory-input').value || '.',
            template: document.getElementById('template-select').value
        };
    }

    // Modal helpers
    showModal(title, content) {
        // Simple modal implementation
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-content">
                    ${content}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        return modal;
    }
}

// Create global instance
window.uiUtils = new UIUtils();
