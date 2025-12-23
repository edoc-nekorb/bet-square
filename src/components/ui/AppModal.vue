<script setup>
import { X } from 'lucide-vue-next';

defineProps({
  isOpen: Boolean,
  title: { type: String, default: 'Modal Title' },
  width: { type: String, default: '400px' }
});

const emit = defineEmits(['close']);
</script>

<template>
  <div v-if="isOpen" class="modal-backdrop" @click="$emit('close')">
    <div class="modal-content" :style="{ maxWidth: width }" @click.stop>
      <div class="modal-header">
         <h3>{{ title }}</h3>
         <button class="close-btn" @click="$emit('close')"><X :size="20" /></button>
      </div>
      
      <div class="modal-body">
         <slot></slot>
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
  z-index: 1000;
}

.modal-content {
  background-color: #18181b; 
  border: 1px solid #27272a;
  border-radius: 16px;
  width: 90%;
  padding: 1.5rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  animation: modal-in 0.2s ease-out;
}

@keyframes modal-in {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.modal-header h3 {
  font-size: 1.125rem;
  font-weight: 700;
  color: white;
  margin: 0;
}

.close-btn {
  color: var(--color-text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  transition: color 0.2s;
  display: flex;
  align-items: center;
}
.close-btn:hover { color: white; }

.modal-body {
    color: var(--color-text-primary);
}
</style>
