import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3005/api'
});

// Request interceptor to add token
api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor to handle auth errors
api.interceptors.response.use(
    response => response,
    error => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export const auth = {
    login: (email, password) => api.post('/auth/login', { email, password }),
    signup: (userData) => api.post('/auth/signup', userData),
    verifyOTP: (email, otp) => api.post('/auth/verify-otp', { email, otp }),
    resendOTP: (email) => api.post('/auth/resend-otp', { email }),
    me: () => api.get('/auth/me'),
    changePassword: (currentPassword, newPassword) => api.post('/auth/change-password', { currentPassword, newPassword }),
    getReferralStats: () => api.get('/auth/referral-stats'),
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }
};


export const content = {
    getNews: () => api.get('/content/news'),
    createNews: (data) => api.post('/content/news', data),
    updateNews: (id, data) => api.put(`/content/news/${id}`, data),
    deleteNews: (id) => api.delete(`/content/news/${id}`),

    getPredictions: (params) => api.get('/content/predictions', { params }),
    createPrediction: (data) => api.post('/content/predictions', data),
    updatePrediction: (id, data) => api.put(`/content/predictions/${id}`, data),
    deletePrediction: (id) => api.delete(`/content/predictions/${id}`),

    getInsights: () => api.get('/content/insights'),
    createInsight: (data) => api.post('/content/insights', data),
    updateInsight: (id, data) => api.put(`/content/insights/${id}`, data),
    deleteInsight: (id) => api.delete(`/content/insights/${id}`),

    // Reactions
    addReaction: (postId, postType, reaction) => api.post('/content/reactions', { postId, postType, reaction }),
    removeReaction: (postId, postType) => api.delete(`/content/reactions/${postId}?postType=${postType}`),
    getReactions: (postId, postType) => api.get(`/content/reactions/${postId}?postType=${postType}`),
    getUserReaction: (postId, postType) => api.get(`/content/reactions/${postId}/user?postType=${postType}`),
    getBatchReactions: (postIds, postType) => api.post('/content/reactions/batch', { postIds, postType })
};


export const upload = {
    uploadImage: (formData, params = {}) => api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        params
    })
};

export const clubs = {
    getAll: (search = '') => api.get(`/clubs${search ? `?search=${search}` : ''}`),
    create: (data) => api.post('/clubs', data),
    update: (id, data) => api.put(`/clubs/${id}`, data),
    delete: (id) => api.delete(`/clubs/${id}`)
};

export const betting = {
    extract: (code, source, region) => api.post('/betting/extract', { code, source, region }),
    book: (matches, source, region) => api.post('/betting/book', { matches, source, region }),
    convert: (code, source, target, region) => api.post('/betting/convert', { code, source, target, region }),
    save: (ticketData) => api.post('/betting/save', ticketData),
    getHistory: (type) => api.get('/betting/history', { params: type ? { type } : {} }),
    getSplitHistory: () => api.get('/betting/history', { params: { type: 'split' } }),
    getConvertedHistory: () => api.get('/betting/history', { params: { type: 'converted' } }),
    getCommunityFeed: () => api.get('/betting/community')
};



export const leagues = {
    getAll: (search) => api.get('/leagues', { params: { search } }),
    create: (data) => api.post('/leagues', data),
    update: (id, data) => api.put(`/leagues/${id}`, data),
    delete: (id) => api.delete(`/leagues/${id}`)
};

export const admin = {
    getStats: () => api.get('/admin/stats'),
    getTransactions: () => api.get('/admin/transactions'),
    getUsers: () => api.get('/admin/users'),
    createUser: (data) => api.post('/admin/users', data),
    updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
    deleteUser: (id) => api.delete(`/admin/users/${id}`),

    getPlans: () => api.get('/admin/plans'),
    createPlan: (data) => api.post('/admin/plans', data),
    updatePlan: (id, data) => api.put(`/admin/plans/${id}`, data),
    deletePlan: (id) => api.delete(`/admin/plans/${id}`),

    approveTransaction: (id) => api.post(`/admin/transactions/${id}/approve`),
    rejectTransaction: (id) => api.post(`/admin/transactions/${id}/reject`)
};

export const payment = {
    initialize: (amount, email) => api.post('/payment/initialize', { amount, email }),
    verify: (reference) => api.post('/payment/verify', { reference }),
    verifySubscription: (reference, planId) => api.post('/payment/verify-subscription', { reference, planId }),
    getHistory: (page = 1) => api.get('/payment/history', { params: { page } }),
    charge: (amount, description) => api.post('/payment/charge', { amount, description }),
    withdraw: (data) => api.post('/payment/withdraw', data)
};

export const notifications = {
    getAll: (params) => api.get('/notifications', { params }),
    getUnreadCount: () => api.get('/notifications/unread-count'),
    markAsRead: (id) => api.patch(`/notifications/${id}/read`),
    markAllAsRead: () => api.patch('/notifications/read-all'),
    // Admin
    broadcast: (title, message, type, link) => api.post('/notifications/broadcast', { title, message, type, link }),
    send: (userId, title, message, type, link) => api.post('/notifications/send', { userId, title, message, type, link }),
    adminGetAll: (params) => api.get('/notifications/all', { params }),
    delete: (id) => api.delete(`/notifications/${id}`)
};

export const isAdmin = async () => {
    try {
        const { data } = await auth.me();
        return data.role === 'admin';
    } catch {
        return false;
    }
};

export const push = {
    getVapidKey: () => api.get('/push/vapid-key'),
    subscribe: (subscription) => api.post('/push/subscribe', { subscription }),
    unsubscribe: (endpoint) => api.post('/push/unsubscribe', { endpoint })
};

export default api;

