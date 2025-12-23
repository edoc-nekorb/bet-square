<script setup>
import { ref, onMounted } from 'vue';
import { Bell, Send, Trash2, Megaphone, TrendingUp, Newspaper, Settings } from 'lucide-vue-next';
import { notifications } from '../../services/api';

// Form state
const title = ref('');
const message = ref('');
const type = ref('announcement');
const isSubmitting = ref(false);
const successMsg = ref('');
const errorMsg = ref('');

// History
const notificationHistory = ref([]);
const isLoading = ref(false);

const notificationTypes = [
    { value: 'announcement', label: 'Announcement', icon: Megaphone },
    { value: 'prediction', label: 'Prediction Update', icon: TrendingUp },
    { value: 'news', label: 'News Update', icon: Newspaper },
    { value: 'system', label: 'System Message', icon: Settings }
];

const sendNotification = async () => {
    if (!title.value.trim() || !message.value.trim()) {
        errorMsg.value = 'Title and message are required';
        return;
    }
    
    isSubmitting.value = true;
    errorMsg.value = '';
    successMsg.value = '';
    
    try {
        await notifications.broadcast(title.value, message.value, type.value);
        successMsg.value = 'Notification sent to all users!';
        title.value = '';
        message.value = '';
        type.value = 'announcement';
        fetchHistory();
    } catch (error) {
        errorMsg.value = error.response?.data?.error || 'Failed to send notification';
    } finally {
        isSubmitting.value = false;
    }
};

const fetchHistory = async () => {
    isLoading.value = true;
    try {
        const { data } = await notifications.adminGetAll({ limit: 50 });
        notificationHistory.value = data;
    } catch (error) {
        console.error('Failed to fetch history:', error);
    } finally {
        isLoading.value = false;
    }
};

const deleteNotification = async (id) => {
    if (!confirm('Delete this notification?')) return;
    
    try {
        await notifications.delete(id);
        notificationHistory.value = notificationHistory.value.filter(n => n.id !== id);
    } catch (error) {
        console.error('Failed to delete:', error);
    }
};

const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString();
};

const getTypeIcon = (t) => {
    const found = notificationTypes.find(nt => nt.value === t);
    return found?.icon || Bell;
};

onMounted(() => {
    fetchHistory();
});
</script>

<template>
  <div class="admin-notifications">
    <header class="page-header">
      <h1><Bell :size="24" /> Notifications</h1>
      <p class="subtitle">Broadcast notifications to all users</p>
    </header>

    <!-- Send Notification Form -->
    <div class="card send-card">
      <h2 class="card-title"><Send :size="18" /> Send Broadcast</h2>
      
      <div class="form-group">
        <label>Notification Type</label>
        <div class="type-selector">
          <button 
            v-for="nt in notificationTypes" 
            :key="nt.value"
            class="type-btn"
            :class="{ active: type === nt.value }"
            @click="type = nt.value"
          >
            <component :is="nt.icon" :size="16" />
            {{ nt.label }}
          </button>
        </div>
      </div>
      
      <div class="form-group">
        <label>Title</label>
        <input 
          v-model="title" 
          type="text" 
          placeholder="Notification title..."
          class="form-input"
        />
      </div>
      
      <div class="form-group">
        <label>Message</label>
        <textarea 
          v-model="message" 
          placeholder="Write your message here..."
          rows="4"
          class="form-input"
        ></textarea>
      </div>
      
      <div v-if="errorMsg" class="alert alert-error">{{ errorMsg }}</div>
      <div v-if="successMsg" class="alert alert-success">{{ successMsg }}</div>
      
      <button 
        class="btn btn-primary" 
        @click="sendNotification"
        :disabled="isSubmitting"
      >
        <Send :size="16" />
        {{ isSubmitting ? 'Sending...' : 'Send to All Users' }}
      </button>
    </div>

    <!-- Notification History -->
    <div class="card history-card">
      <h2 class="card-title"><Bell :size="18" /> Notification History</h2>
      
      <div v-if="isLoading" class="loading">Loading...</div>
      <div v-else-if="notificationHistory.length === 0" class="empty">
        No notifications sent yet
      </div>
      
      <div v-else class="notification-list">
        <div 
          v-for="n in notificationHistory" 
          :key="n.id" 
          class="notification-item"
        >
          <div class="notif-icon">
            <component :is="getTypeIcon(n.type)" :size="18" />
          </div>
          <div class="notif-content">
            <h4>{{ n.title }}</h4>
            <p>{{ n.message }}</p>
            <span class="meta">
              {{ n.user_email || 'All Users' }} • {{ formatDate(n.created_at) }}
            </span>
          </div>
          <button class="delete-btn" @click="deleteNotification(n.id)">
            <Trash2 :size="16" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-notifications {
  padding: 2rem;
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 2rem;
}

.page-header h1 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
}

.subtitle {
  color: var(--color-text-secondary);
  margin-top: 0.25rem;
}

.card {
  background: var(--color-card);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: white;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: 0.5rem;
}

.form-input {
  width: 100%;
  background: #27272a;
  border: 1px solid #3f3f46;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  color: white;
  font-size: 0.9375rem;
  outline: none;
}

.form-input:focus {
  border-color: var(--color-primary);
}

textarea.form-input {
  resize: vertical;
  min-height: 100px;
}

.type-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.type-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  background: #27272a;
  border: 1px solid #3f3f46;
  border-radius: 8px;
  color: var(--color-text-secondary);
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.2s;
}

.type-btn:hover {
  background: #3f3f46;
}

.type-btn.active {
  background: var(--color-primary);
  color: black;
  border-color: var(--color-primary);
}

.alert {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.alert-error {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.alert-success {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--color-primary);
  color: black;
  border: none;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading, .empty {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-secondary);
}

.notification-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: #27272a;
  border-radius: 8px;
}

.notif-icon {
  width: 36px;
  height: 36px;
  background: rgba(34, 197, 94, 0.1);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
  flex-shrink: 0;
}

.notif-content {
  flex: 1;
  min-width: 0;
}

.notif-content h4 {
  font-size: 0.9375rem;
  font-weight: 600;
  color: white;
  margin-bottom: 0.25rem;
}

.notif-content p {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.5rem;
}

.notif-content .meta {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  opacity: 0.7;
}

.delete-btn {
  background: transparent;
  border: none;
  color: #ef4444;
  cursor: pointer;
  padding: 0.5rem;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.delete-btn:hover {
  opacity: 1;
}
</style>
