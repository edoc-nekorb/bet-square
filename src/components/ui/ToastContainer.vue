<script setup>
import { useToast } from '../../composables/useToast';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-vue-next';

const { toasts, removeToast } = useToast();

const getIcon = (type) => {
    switch (type) {
        case 'success': return CheckCircle;
        case 'error': return AlertCircle;
        case 'warning': return AlertTriangle;
        default: return Info;
    }
};
</script>

<template>
  <div class="toast-container">
    <TransitionGroup name="toast">
      <div 
        v-for="toast in toasts" 
        :key="toast.id" 
        class="toast-item"
        :class="toast.type"
      >
        <component :is="getIcon(toast.type)" :size="20" class="toast-icon" />
        <span class="toast-message">{{ toast.message }}</span>
        <button @click="removeToast(toast.id)" class="close-btn">
          <X :size="16" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 320px;
  width: 100%;
}

.toast-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 8px;
  background-color: #18181b;
  border: 1px solid #27272a;
  color: white;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.toast-item.success { border-color: #22c55e; background-color: rgba(34, 197, 94, 0.1); }
.toast-item.error { border-color: #ef4444; background-color: rgba(239, 68, 68, 0.1); }
.toast-item.warning { border-color: #f59e0b; background-color: rgba(245, 158, 11, 0.1); }
.toast-item.info { border-color: #3b82f6; background-color: rgba(59, 130, 246, 0.1); }

.toast-icon { flex-shrink: 0; }
.toast-item.success .toast-icon { color: #22c55e; }
.toast-item.error .toast-icon { color: #ef4444; }
.toast-item.warning .toast-icon { color: #f59e0b; }
.toast-item.info .toast-icon { color: #3b82f6; }

.toast-message {
  flex: 1;
  font-size: 0.875rem;
  line-height: 1.4;
}

.close-btn {
  background: transparent;
  border: none;
  color: #a1a1aa;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
}
.close-btn:hover { color: white; }

/* Transitions */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(30px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
