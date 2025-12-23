<script setup>
import { ChevronLeft, Check, CheckCheck, Megaphone, TrendingUp, Newspaper, Settings } from 'lucide-vue-next';
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { notifications } from '../services/api';
import BottomNav from '../components/BottomNav.vue';

const router = useRouter();
const goBack = () => router.back();

const notificationsList = ref([]);
const isLoading = ref(false);

const fetchNotifications = async () => {
    isLoading.value = true;
    try {
        const { data } = await notifications.getAll({ limit: 50 });
        notificationsList.value = data;
    } catch (error) {
        console.error('Failed to fetch notifications:', error);
    } finally {
        isLoading.value = false;
    }
};

const markAsRead = async (notification) => {
    if (notification.is_read) return;
    
    try {
        await notifications.markAsRead(notification.id);
        notification.is_read = true;
    } catch (error) {
        console.error('Failed to mark as read:', error);
    }
};

const markAllAsRead = async () => {
    try {
        await notifications.markAllAsRead();
        notificationsList.value.forEach(n => n.is_read = true);
    } catch (error) {
        console.error('Failed to mark all as read:', error);
    }
};

const getIcon = (type) => {
    switch (type) {
        case 'announcement': return Megaphone;
        case 'prediction': return TrendingUp;
        case 'news': return Newspaper;
        default: return Settings;
    }
};

const getIconColor = (type) => {
    switch (type) {
        case 'announcement': return '#f59e0b';
        case 'prediction': return '#22c55e';
        case 'news': return '#3b82f6';
        default: return '#9ca3af';
    }
};

const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return date.toLocaleDateString();
};

onMounted(() => {
    fetchNotifications();
});
</script>

<template>
  <div class="page-container">
    <!-- Header -->
    <header class="page-header">
       <button class="icon-btn" @click="goBack">
          <ChevronLeft :size="24" />
       </button>
       <h1>Notifications</h1>
       <button class="mark-all-btn" @click="markAllAsRead">
          <CheckCheck :size="18" />
          <span>Read All</span>
       </button>
    </header>

    <div class="content-scrollable">
       <!-- Loading State -->
       <div v-if="isLoading" class="loading-state">
          <div class="spinner"></div>
          <p>Loading notifications...</p>
       </div>

       <!-- Empty State -->
       <div v-else-if="notificationsList.length === 0" class="empty-state">
          <div class="empty-icon">🔔</div>
          <p>No notifications yet</p>
          <span class="empty-sub">You'll see new announcements and updates here</span>
       </div>

       <!-- Notifications List -->
       <div v-else class="notifications-list">
          <div 
             v-for="notification in notificationsList" 
             :key="notification.id" 
             class="notification-item"
             :class="{ unread: !notification.is_read }"
             @click="markAsRead(notification)"
          >
             <div class="notif-icon" :style="{ backgroundColor: getIconColor(notification.type) + '20' }">
                <component :is="getIcon(notification.type)" :size="20" :color="getIconColor(notification.type)" />
             </div>
             
             <div class="notif-content">
                <h3 class="notif-title">{{ notification.title }}</h3>
                <p class="notif-message">{{ notification.message }}</p>
                <span class="notif-time">{{ formatTime(notification.created_at) }}</span>
             </div>
             
             <div v-if="!notification.is_read" class="unread-dot"></div>
          </div>
       </div>
    </div>

    <BottomNav />
  </div>
</template>

<style scoped>
.page-container {
  min-height: 100vh;
  background-color: var(--color-background);
  color: var(--color-text-primary);
  display: flex;
  flex-direction: column;
}

.page-header {
  padding: 1rem 1.25rem;
  background-color: var(--color-background);
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 10;
}

.page-header h1 {
  font-size: 1.1rem;
  font-weight: 700;
}

.icon-btn {
  color: white;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mark-all-btn {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.75rem;
  background: var(--color-card);
  border: 1px solid #3f3f46;
  border-radius: 8px;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.mark-all-btn:hover {
  background: var(--color-primary);
  color: black;
  border-color: var(--color-primary);
}

.content-scrollable {
  flex: 1;
  overflow-y: auto;
  padding: 0 1rem 5rem;
}

/* Loading and Empty States */
.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60vh;
  gap: 1rem;
  color: var(--color-text-secondary);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 3rem;
  opacity: 0.5;
}

.empty-sub {
  font-size: 0.875rem;
  opacity: 0.7;
}

/* Notifications List */
.notifications-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--color-card);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.notification-item.unread {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), var(--color-card));
  border-left: 3px solid var(--color-primary);
}

.notification-item:hover {
  background: #27272a;
}

.notif-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.notif-content {
  flex: 1;
  min-width: 0;
}

.notif-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: white;
  margin-bottom: 0.25rem;
}

.notif-message {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  line-height: 1.4;
  margin-bottom: 0.5rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notif-time {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  opacity: 0.7;
}

.unread-dot {
  width: 8px;
  height: 8px;
  background: var(--color-primary);
  border-radius: 50%;
  position: absolute;
  top: 1rem;
  right: 1rem;
}
</style>
