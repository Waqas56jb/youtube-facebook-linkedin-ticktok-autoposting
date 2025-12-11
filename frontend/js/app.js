/**
 * Main application logic
 */

class VideoCaptionApp {
    constructor() {
        this.api = window.apiService;
        this.ui = window.uiUtils;
        this.currentVideos = [];
        this.currentResults = {};
        
        this.initializeApp();
    }

    async initializeApp() {
        try {
            // Check API health
            await this.api.healthCheck();
            this.ui.showToast('Connected to API successfully', 'success');
        } catch (error) {
            this.ui.showToast('Failed to connect to API. Make sure the backend is running.', 'error');
            console.error('API connection failed:', error);
        }

        this.setupEventListeners();
        this.loadInitialData();
    }

    setupEventListeners() {
        // Scan videos button
        document.getElementById('scan-btn').addEventListener('click', () => {
            this.scanVideos();
        });

        // Generate captions button
        document.getElementById('generate-btn').addEventListener('click', () => {
            this.generateAllCaptions();
        });

        // Refresh button
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.scanVideos();
        });

        // Cleanup button
        document.getElementById('cleanup-btn').addEventListener('click', () => {
            this.cleanupOrphaned();
        });

        // Close results button
        document.getElementById('close-results-btn').addEventListener('click', () => {
            document.getElementById('results-section').style.display = 'none';
        });

        // YouTube authentication button
        document.getElementById('youtube-auth-btn').addEventListener('click', () => {
            this.checkYouTubeAuth();
        });

        // YouTube uploads button
        document.getElementById('youtube-uploads-btn').addEventListener('click', () => {
            this.showYouTubeUploads();
        });

        // Close YouTube uploads button
        document.getElementById('close-youtube-btn').addEventListener('click', () => {
            document.getElementById('youtube-uploads-section').style.display = 'none';
        });

        // Enter key on directory input
        document.getElementById('directory-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.scanVideos();
            }
        });
    }

    async loadInitialData() {
        try {
            await this.scanVideos();
            await this.checkYouTubeAuth();
        } catch (error) {
            console.error('Failed to load initial data:', error);
        }
    }

    async scanVideos() {
        try {
            this.ui.showLoading('Scanning for videos...');
            const formData = this.ui.getFormData();
            
            const response = await this.api.getVideos(formData.directory);
            
            if (response.success) {
                this.currentVideos = response.videos;
                this.ui.renderVideoList(this.currentVideos);
                this.updateStatusFromVideos();
                this.ui.setButtonState('generate-btn', this.currentVideos.length > 0);
                
                this.ui.showToast(`Found ${response.count} videos`, 'success');
            } else {
                throw new Error(response.error || 'Failed to scan videos');
            }
        } catch (error) {
            this.ui.showToast(`Failed to scan videos: ${error.message}`, 'error');
            console.error('Scan videos error:', error);
        } finally {
            this.ui.hideLoading();
        }
    }

    async generateAllCaptions() {
        try {
            this.ui.showLoading('Generating captions...');
            const formData = this.ui.getFormData();
            
            const response = await this.api.generateCaptions(formData.directory, formData.template);
            
            if (response.success) {
                this.currentResults = response.results;
                this.ui.renderResults(this.currentResults);
                
                // Refresh video list to show updated status
                await this.scanVideos();
                
                this.ui.showToast(
                    `Generated ${response.generated_count} new captions`, 
                    'success'
                );
            } else {
                throw new Error(response.error || 'Failed to generate captions');
            }
        } catch (error) {
            this.ui.showToast(`Failed to generate captions: ${error.message}`, 'error');
            console.error('Generate captions error:', error);
        } finally {
            this.ui.hideLoading();
        }
    }

    async generateSingleCaption(videoTitle) {
        try {
            this.ui.showLoading(`Generating caption for "${videoTitle}"...`);
            const formData = this.ui.getFormData();
            
            const response = await this.api.generateCaptions(formData.directory, formData.template);
            
            if (response.success && response.results[videoTitle]) {
                this.currentResults[videoTitle] = response.results[videoTitle];
                this.ui.renderResults(this.currentResults);
                
                // Refresh video list
                await this.scanVideos();
                
                this.ui.showToast(`Generated caption for "${videoTitle}"`, 'success');
            } else {
                throw new Error('Failed to generate caption for this video');
            }
        } catch (error) {
            this.ui.showToast(`Failed to generate caption: ${error.message}`, 'error');
            console.error('Generate single caption error:', error);
        } finally {
            this.ui.hideLoading();
        }
    }

    async regenerateCaption(videoTitle) {
        try {
            this.ui.showLoading(`Regenerating caption for "${videoTitle}"...`);
            const formData = this.ui.getFormData();
            
            const response = await this.api.regenerateCaption(videoTitle, formData.template);
            
            if (response.success) {
                this.currentResults[videoTitle] = response.caption;
                this.ui.renderResults(this.currentResults);
                
                // Refresh video list
                await this.scanVideos();
                
                this.ui.showToast(`Regenerated caption for "${videoTitle}"`, 'success');
            } else {
                throw new Error(response.error || 'Failed to regenerate caption');
            }
        } catch (error) {
            this.ui.showToast(`Failed to regenerate caption: ${error.message}`, 'error');
            console.error('Regenerate caption error:', error);
        } finally {
            this.ui.hideLoading();
        }
    }

    async deleteCaption(videoTitle) {
        if (!confirm(`Are you sure you want to delete the caption for "${videoTitle}"?`)) {
            return;
        }

        try {
            this.ui.showLoading(`Deleting caption for "${videoTitle}"...`);
            
            const response = await this.api.deleteCaption(videoTitle);
            
            if (response.success) {
                // Remove from current results
                delete this.currentResults[videoTitle];
                this.ui.renderResults(this.currentResults);
                
                // Refresh video list
                await this.scanVideos();
                
                this.ui.showToast(`Deleted caption for "${videoTitle}"`, 'success');
            } else {
                throw new Error(response.error || 'Failed to delete caption');
            }
        } catch (error) {
            this.ui.showToast(`Failed to delete caption: ${error.message}`, 'error');
            console.error('Delete caption error:', error);
        } finally {
            this.ui.hideLoading();
        }
    }

    async cleanupOrphaned() {
        if (!confirm('Are you sure you want to clean up orphaned caption files?')) {
            return;
        }

        try {
            this.ui.showLoading('Cleaning up orphaned files...');
            const formData = this.ui.getFormData();
            
            const response = await this.api.cleanupOrphaned(formData.directory);
            
            if (response.success) {
                this.ui.showToast(
                    `Cleaned up ${response.removed_count} orphaned files`, 
                    'success'
                );
                
                // Refresh video list
                await this.scanVideos();
            } else {
                throw new Error(response.error || 'Failed to cleanup orphaned files');
            }
        } catch (error) {
            this.ui.showToast(`Failed to cleanup: ${error.message}`, 'error');
            console.error('Cleanup error:', error);
        } finally {
            this.ui.hideLoading();
        }
    }

    updateStatusFromVideos() {
        const stats = {
            total_videos: this.currentVideos.length,
            videos_with_captions: this.currentVideos.filter(v => v.has_caption).length,
            videos_without_captions: this.currentVideos.filter(v => !v.has_caption).length,
            completion_percentage: 0
        };

        if (stats.total_videos > 0) {
            stats.completion_percentage = Math.round(
                (stats.videos_with_captions / stats.total_videos) * 100
            );
        }

        this.ui.updateStatusCards(stats);
    }

    // YouTube methods
    async checkYouTubeAuth() {
        try {
            const response = await this.api.getYouTubeAuthStatus();
            
            if (response.success) {
                const status = response.status;
                const authBtn = document.getElementById('youtube-auth-btn');
                const authText = document.getElementById('youtube-auth-text');
                
                if (status.authenticated) {
                    authBtn.className = 'btn btn-success';
                    authText.textContent = 'YouTube Connected';
                    this.ui.showToast('YouTube authentication successful', 'success');
                } else {
                    authBtn.className = 'btn btn-youtube';
                    authText.textContent = 'Connect YouTube';
                    this.ui.showToast(status.message, 'warning');
                }
            }
        } catch (error) {
            this.ui.showToast('Failed to check YouTube authentication', 'error');
            console.error('YouTube auth check error:', error);
        }
    }

    async uploadToYouTube(videoTitle) {
        try {
            // Get caption for this video
            const caption = this.currentResults[videoTitle];
            if (!caption) {
                this.ui.showToast('Please generate a caption first', 'warning');
                return;
            }

            // Show authentication notice
            this.ui.showModal(
                'YouTube Authentication Required',
                `
                <div style="text-align: center; padding: 2rem;">
                    <i class="fab fa-youtube" style="font-size: 3rem; color: #ff0000; margin-bottom: 1rem;"></i>
                    <h3>YouTube Authentication</h3>
                    <p>To upload videos to YouTube, you need to authenticate with your Google account.</p>
                    <p style="margin: 1rem 0; color: #666;">
                        A browser window will open for you to sign in to Google and authorize the app.
                    </p>
                    <div style="margin-top: 2rem;">
                        <button class="btn btn-youtube" onclick="app.proceedWithUpload('${videoTitle}')">
                            <i class="fab fa-youtube"></i>
                            Continue with Upload
                        </button>
                        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                            Cancel
                        </button>
                    </div>
                </div>
                `
            );
        } catch (error) {
            this.ui.showToast(`Upload failed: ${error.message}`, 'error');
            console.error('YouTube upload error:', error);
        }
    }

    async proceedWithUpload(videoTitle) {
        try {
            // Close the modal
            document.querySelector('.modal-overlay')?.remove();
            
            // Get caption for this video
            const caption = this.currentResults[videoTitle];
            if (!caption) {
                this.ui.showToast('Please generate a caption first', 'warning');
                return;
            }

            this.ui.showLoading(`Uploading "${videoTitle}" to YouTube...`);
            
            const response = await this.api.uploadToYouTube(videoTitle, caption);
            
            if (response.success) {
                this.ui.showToast(
                    `Video uploaded successfully! ${response.video_url}`, 
                    'success'
                );
                
                // Show success modal with video URL
                this.ui.showModal(
                    'Upload Successful!',
                    `
                    <div style="text-align: center; padding: 2rem;">
                        <i class="fab fa-youtube" style="font-size: 3rem; color: #ff0000; margin-bottom: 1rem;"></i>
                        <h3>Video uploaded to YouTube!</h3>
                        <p><strong>Title:</strong> ${response.title}</p>
                        <p><strong>URL:</strong> <a href="${response.video_url}" target="_blank">${response.video_url}</a></p>
                        <p style="margin-top: 1rem; color: #666;">
                            The video has been uploaded as private. You can change the privacy settings in YouTube Studio.
                        </p>
                    </div>
                    `
                );
            } else {
                throw new Error(response.error || 'Upload failed');
            }
        } catch (error) {
            this.ui.showToast(`Upload failed: ${error.message}`, 'error');
            console.error('YouTube upload error:', error);
        } finally {
            this.ui.hideLoading();
        }
    }

    async showYouTubeUploads() {
        try {
            this.ui.showLoading('Loading upload history...');
            
            const response = await this.api.getYouTubeUploads();
            
            if (response.success) {
                this.renderYouTubeUploads(response.uploads);
            } else {
                throw new Error(response.error || 'Failed to load uploads');
            }
        } catch (error) {
            this.ui.showToast(`Failed to load uploads: ${error.message}`, 'error');
            console.error('YouTube uploads error:', error);
        } finally {
            this.ui.hideLoading();
        }
    }

    renderYouTubeUploads(uploads) {
        const container = document.getElementById('youtube-uploads-content');
        const section = document.getElementById('youtube-uploads-section');
        
        if (!uploads || uploads.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fab fa-youtube"></i>
                    <p>No videos uploaded to YouTube yet.</p>
                </div>
            `;
        } else {
            const uploadsHtml = uploads.map(upload => `
                <div class="result-item">
                    <div class="result-title">
                        <i class="fab fa-youtube"></i>
                        ${this.ui.escapeHtml(upload.title)}
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <p><strong>Original Video:</strong> ${this.ui.escapeHtml(upload.original_video)}</p>
                        <p><strong>Topic:</strong> ${this.ui.escapeHtml(upload.topic)}</p>
                        <p><strong>Uploaded:</strong> ${new Date(upload.uploaded_at).toLocaleString()}</p>
                    </div>
                    <div style="text-align: center;">
                        <a href="${upload.video_url}" target="_blank" class="btn btn-youtube">
                            <i class="fab fa-youtube"></i>
                            View on YouTube
                        </a>
                    </div>
                </div>
            `).join('');
            
            container.innerHTML = uploadsHtml;
        }
        
        section.style.display = 'block';
    }

    // Public methods for global access
    generateSingleCaption(videoTitle) {
        this.generateSingleCaption(videoTitle);
    }

    regenerateCaption(videoTitle) {
        this.regenerateCaption(videoTitle);
    }

    deleteCaption(videoTitle) {
        this.deleteCaption(videoTitle);
    }

    uploadToYouTube(videoTitle) {
        this.uploadToYouTube(videoTitle);
    }

    proceedWithUpload(videoTitle) {
        this.proceedWithUpload(videoTitle);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new VideoCaptionApp();
});
