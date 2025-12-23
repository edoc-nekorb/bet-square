<script setup>
import { AlertTriangle, X } from 'lucide-vue-next';
import AppButton from './AppButton.vue';

defineProps({
  isOpen: Boolean,
  title: { type: String, default: 'Confirm Action' },
  message: { type: String, default: 'Are you sure you want to proceed?' },
  confirmText: { type: String, default: 'Confirm' },
  cancelText: { type: String, default: 'Cancel' },
  type: { type: String, default: 'danger' }, // danger, warning, info
  loading: Boolean
});

const emit = defineEmits(['confirm', 'cancel']);
</script>

<template>
  <div v-if="isOpen" class="modal-backdrop" @click="$emit('cancel')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
         <div class="icon-wrap" :class="type">
            <AlertTriangle v-if="type === 'danger' || type === 'warning'" :size="24" />
            <span v-else>i</span>
         </div>
         <button class="close-btn" @click="$emit('cancel')"><X :size="20" /></button>
      </div>
      
      <div class="modal-body">
         <h3>{{ title }}</h3>
         <p>{{ message }}</p>
      </div>
      
      <div class="modal-footer">
         <AppButton variant="text" @click="$emit('cancel')" :disabled="loading">{{ cancelText }}</AppButton>
         <AppButton 
            variant="primary" 
            :class="{ 'bg-red': type === 'danger' }"
            @click="$emit('confirm')" 
            :disabled="loading"
         >
            {{ loading ? 'Processing...' : confirmText }}
         </AppButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-content {
  background-color: var(--color-card); /* Ensure this var exists or use fallback */
  background: #18181b; 
  border: 1px solid #27272a;
  border-radius: 16px;
  width: 90%;
  max-width: 400px;
  padding: 1.5rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.icon-wrap.danger {
  background-color: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}
.icon-wrap.warning {
  background-color: rgba(251, 146, 60, 0.1);
  color: #fb923c;
}

.close-btn {
  color: var(--color-text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  transition: color 0.2s;
}
.close-btn:hover { color: white; }

.modal-body h3 {
  font-size: 1.125rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: white;
}
.modal-body p {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  line-height: 1.5;
  margin-bottom: 1.5rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.bg-red {
    background-color: #ef4444 !important;
    color: white !important;
}
.bg-red:hover {
    background-color: #dc2626 !important;
}
</style>
