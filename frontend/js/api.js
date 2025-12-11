/**
 * API service for Video Caption Generator
 */

class ApiService {
    constructor() {
        this.baseUrl = 'http://localhost:8000/api';
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Health check
    async healthCheck() {
        return this.request('/health');
    }

    // Video operations
    async getVideos(directory = '.') {
        return this.request(`/videos?directory=${encodeURIComponent(directory)}`);
    }

    async getVideoStatus(directory = '.') {
        return this.request(`/videos/status?directory=${encodeURIComponent(directory)}`);
    }

    // Caption operations
    async generateCaptions(directory = '.', template = 'ai_tech') {
        return this.request('/captions/generate', {
            method: 'POST',
            body: JSON.stringify({ directory, template })
        });
    }

    async regenerateCaption(videoTitle, template = 'ai_tech') {
        return this.request('/captions/regenerate', {
            method: 'POST',
            body: JSON.stringify({ video_title: videoTitle, template })
        });
    }

    async deleteCaption(videoTitle) {
        return this.request('/captions/delete', {
            method: 'DELETE',
            body: JSON.stringify({ video_title: videoTitle })
        });
    }

    async listCaptions() {
        return this.request('/captions/list');
    }

    // Utility operations
    async cleanupOrphaned(directory = '.') {
        return this.request('/cleanup', {
            method: 'POST',
            body: JSON.stringify({ directory })
        });
    }

    // YouTube operations
    async getYouTubeAuthStatus() {
        return this.request('/youtube/auth/status');
    }

    async uploadToYouTube(videoTitle, caption) {
        return this.request('/youtube/upload', {
            method: 'POST',
            body: JSON.stringify({ video_title: videoTitle, caption })
        });
    }

    async getYouTubeUploads() {
        return this.request('/youtube/uploads');
    }

    async revokeYouTubeAuth() {
        return this.request('/youtube/auth/revoke', {
            method: 'POST'
        });
    }
}

// Create global instance
window.apiService = new ApiService();
