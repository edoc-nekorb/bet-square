
<script setup>
import BottomNav from '../components/BottomNav.vue';
import { Bell } from 'lucide-vue-next';
import { ref, onMounted, computed } from 'vue';
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
         originalDate: item.created_at, // Store raw date for filtering
         timeAgo: new Date(item.created_at).toLocaleDateString(),
         title: item.title,
         excerpt: item.excerpt,
         image: item.image,
         homeLogo: item.home_club_logo,
         awayLogo: item.away_club_logo,
         homeName: item.home_club_name,
         awayName: item.away_club_name
      }));
    }
  } catch (e) {
    console.error("Failed to load insights", e);
  }
  isLoading.value = false;
};

const selectedDate = ref(new Date().toISOString().split('T')[0]);

const filteredItems = computed(() => {
    return newsItems.value.filter(item => {
        const itemDate = new Date(item.originalDate).toISOString().split('T')[0];
        return itemDate === selectedDate.value;
    });
});

onMounted(() => {
  fetchInsights();
});
</script>

<template>
  <div class="page-container">
    <header class="page-header">
      <div class="header-top">
          <h1>Daily Insights</h1>
          <button class="icon-btn">
            <Bell :size="24" />
            <span class="notification-dot"></span>
          </button>
      </div>
      <div class="date-selector">
          <input type="date" v-model="selectedDate" class="date-input" />
      </div>
    </header>

    <div class="content-scrollable">
      <div v-if="filteredItems.length === 0" class="empty-state">
          No insight available for this date.
      </div>
      <div v-for="item in filteredItems" :key="item.id" class="insight-card">
        <!-- Team Row -->
        <div class="teams-row">
            <div class="team-side">
                <img :src="item.homeLogo" class="team-logo" v-if="item.homeLogo" />
                <div v-else class="logo-placeholder">{{ item.homeName ? item.homeName[0] : 'H' }}</div>
            </div>
            
            <h2 class="card-title">{{ item.title }}</h2>

            <div class="team-side">
                <img :src="item.awayLogo" class="team-logo" v-if="item.awayLogo" />
                <div v-else class="logo-placeholder">{{ item.awayName ? item.awayName[0] : 'A' }}</div>
            </div>
        </div>

        <!-- Footer -->
        <div class="card-footer">
            <div class="meta-line">
                <span class="source-label">{{ item.source }}</span>
            </div>
            <p class="summary-text">{{ item.excerpt }}</p>
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
  flex-direction: column;
  gap: 1rem;
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1px solid #27272a;
}

.header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
}

.date-selector {
    width: 100%;
}
.date-input {
    width: 100%;
    background-color: #27272a;
    border: 1px solid #3f3f46;
    color: white;
    padding: 0.75rem;
    border-radius: 8px;
    font-size: 1rem;
    outline: none;
    color-scheme: dark;
}

.page-header h1 {
  font-size: 1.25rem;
  font-weight: 700;
}

.icon-btn {
  position: relative;
  color: white;
  background: none;
  border: none;
}

.notification-dot {
  position: absolute;
  top: -2px;
    right: -2px;
  width: 8px;
  height: 8px;
  background-color: var(--color-primary);
  border-radius: 50%;
}

.content-scrollable {
  padding: 1.25rem;
  padding-bottom: 6rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.empty-state {
    text-align: center;
    color: #a1a1aa;
    padding: 2rem;
    font-style: italic;
    background: var(--color-card);
    border-radius: 12px;
}

.insight-card {
  background-color: var(--color-card);
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #27272a;
  display: flex;
  flex-direction: column;
}

.teams-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem;
    gap: 1rem;
    border-bottom: 1px solid #27272a;
    background: linear-gradient(to bottom, #27272a, var(--color-card));
}

.team-side {
    flex-shrink: 0;
}

.team-logo {
    width: 56px;
    height: 56px;
    object-fit: contain;
}

.logo-placeholder {
    width: 56px;
    height: 56px;
    background-color: #3f3f46;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 1.2rem;
    color: #a1a1aa;
}

.card-title {
    flex: 1;
    text-align: center;
    font-size: 1.1rem;
    font-weight: 700;
    color: white;
    line-height: 1.3;
}

.card-footer {
    padding: 1rem 1.5rem;
}

.meta-line {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    margin-bottom: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
}

.source-label {
    color: var(--color-primary);
}

.summary-text {
    font-size: 0.9rem;
    color: #d4d4d8;
    line-height: 1.6;
}
</style>
