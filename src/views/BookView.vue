
<script setup>
import BottomNav from '../components/BottomNav.vue';
import { Bell } from 'lucide-vue-next';
import { ref, onMounted } from 'vue';
import { content } from '../services/api';

const newsItems = ref([]);
const isLoading = ref(true);

const fetchInsights = async () => {
  isLoading.value = true;
  try {
    const { data } = await content.getInsights();
    if (data) {
      newsItems.value = data.map(item => ({
         id: item.id,
         source: item.source,
         timeAgo: new Date(item.created_at).toLocaleDateString(),
         title: item.title,
         excerpt: item.excerpt,
         image: item.image
      }));
    }
  } catch (e) {
    console.error("Failed to load insights", e);
  }
  isLoading.value = false;
};

onMounted(() => {
  fetchInsights();
});
</script>

<template>
  <div class="page-container">
    <header class="page-header">
      <h1>Daily Insights & Ticket Builder</h1>
      <button class="icon-btn">
        <Bell :size="24" />
        <span class="notification-dot"></span>
      </button>
    </header>

    <div class="content-scrollable">
      <div v-for="item in newsItems" :key="item.id" class="news-card">
        <div class="card-header">
           <div class="source-info">
             <div class="source-icon">
               <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="2" y="2" width="9" height="9" rx="1"/>
                  <rect x="13" y="2" width="9" height="9" rx="1"/>
                  <rect x="2" y="13" width="9" height="9" rx="1"/>
                  <circle cx="17.5" cy="17.5" r="4.5"/>
               </svg>
             </div>
             <span class="source-name">{{ item.source }}</span>
           </div>
           <span class="time-ago">{{ item.timeAgo }}</span>
        </div>

        <div class="card-body">
          <div class="text-content">
            <h2 class="news-title">{{ item.title }}</h2>
            <p class="news-excerpt">{{ item.excerpt }}</p>
          </div>
          <div class="image-wrapper">
            <img :src="item.image" :alt="item.title" />
          </div>
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
  font-size: 1rem;
  font-weight: 700;
  max-width: 80%;
  line-height: 1.4;
}

.icon-btn {
  position: relative;
  color: white;
}

.notification-dot {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 8px;
  height: 8px;
  background-color: var(--color-primary);
  border-radius: 50%;
  border: 1px solid var(--color-background);
}

.content-scrollable {
  padding: 0 1.25rem 6rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.news-card {
  background-color: var(--color-card);
  border-radius: 16px;
  padding: 1rem;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.source-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.source-icon {
  color: #9ca3af;
}

.source-name {
  font-size: 0.75rem;
  font-weight: 600;
  color: #e4e4e7;
}

.time-ago {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.card-body {
  display: flex;
  gap: 1rem;
}

.text-content {
  flex: 1;
}

.news-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: 0.5rem;
  line-height: 1.3;
}

.news-excerpt {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.image-wrapper {
  width: 80px;
  height: 80px;
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
  background-color: #2d2d35;
}

.image-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
