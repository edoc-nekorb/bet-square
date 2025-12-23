<script setup>
import { X } from 'lucide-vue-next';

const props = defineProps({
  isOpen: Boolean,
  news: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['close']);

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};
</script>

<template>
  <div v-if="isOpen" class="modal-backdrop" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <button class="close-btn" @click="$emit('close')">
          <X :size="24" />
        </button>
      </div>

      <div v-if="news.image" class="modal-image">
        <img :src="news.image" :alt="news.title" />
      </div>

      <div class="modal-body">
        <div class="meta-info">
          <span class="source">{{ news.source }}</span>
          <span class="date">{{ formatDate(news.created_at) }}</span>
        </div>
        
        <h2 class="news-title">{{ news.title }}</h2>
        
        <div class="news-body">
          {{ news.body || news.excerpt }}
        </div>
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
  background-color: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
  overflow-y: auto;
}

.modal-content {
  background-color: #18181b;
  border: 1px solid #27272a;
  border-radius: 16px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: flex-end;
  position: sticky;
  top: 0;
  background-color: #18181b;
  z-index: 10;
}

.close-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  border: none;
  cursor: pointer;
}

.close-btn:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.modal-image {
  width: 100%;
  height: 250px;
  overflow: hidden;
  border-radius: 12px;
  margin: 0 1.5rem 1.5rem;
  max-width: calc(100% - 3rem);
}

.modal-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.modal-body {
  padding: 0 1.5rem 2rem;
}

.meta-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.source {
  font-weight: 600;
  color: var(--color-primary);
}

.date {
  color: #a1a1aa;
}

.news-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  margin-bottom: 1.5rem;
  line-height: 1.3;
}

.news-body {
  font-size: 1rem;
  line-height: 1.7;
  color: #e4e4e7;
  white-space: pre-wrap;
}

@media (max-width: 640px) {
  .modal-content {
    max-height: 95vh;
    border-radius: 16px 16px 0 0;
    margin-top: auto;
  }

  .modal-image {
    height: 200px;
  }

  .news-title {
    font-size: 1.25rem;
  }

  .news-body {
    font-size: 0.9375rem;
  }
}
</style>
