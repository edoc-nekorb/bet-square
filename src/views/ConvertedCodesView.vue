<script setup>
import { ChevronLeft, Bell, ArrowRightLeft } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import { ref, onMounted } from 'vue';
import BottomNav from '../components/BottomNav.vue';
import { betting } from '../services/api';

const router = useRouter();
const goBack = () => router.back();

const historyItems = ref([]);

const fetchHistory = async () => {
    try {
        const { data } = await betting.getConvertedHistory();
        historyItems.value = data.map(item => ({
            id: item.ticket_id,
            label: item.bookmaker,
            date: new Date(item.created_at).toLocaleString(),
            desc: `${item.match_count} Matches Converted`,
            odds: item.total_odds + 'x',
            status: 'Done' 
        }));
    } catch (e) {
        console.error(e);
    }
};


onMounted(fetchHistory);

const getStatusColor = (status) => {
    return status === 'Win' ? '#22c55e' : '#fb923c'; 
}
</script>

<template>
  <div class="page-container">
    <!-- Header -->
    <header class="page-header">
       <button class="icon-btn" @click="goBack">
          <ChevronLeft :size="24" />
       </button>
       <h1>Converted Bet Codes</h1>
       <div class="header-actions">
          <button class="icon-btn"><Bell :size="24" /></button>
          <div class="avatar-sm">
             <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" />
          </div>
       </div>
    </header>

    <div class="content-scrollable">
       
       <!-- History List -->
       <div class="history-section">
          <div class="history-list">
             <div v-for="item in historyItems" :key="item.id" class="history-card">
                <div class="hc-header">
                   <span class="hc-id">{{ item.id }}</span>
                   <span class="hc-badge" :style="{ backgroundColor: item.label === 'BetMasters' ? '#fb923c' : '#f59e0b', color: 'black' }">{{ item.label }}</span>
                </div>
                <div class="hc-date">{{ item.date }}</div>
                <p class="hc-desc">{{ item.desc }}</p>
                <div class="hc-footer">
                   <span class="hc-label">Odds</span>
                   <span class="hc-odds" :style="{ color: getStatusColor(item.status) }">{{ item.odds }}</span>
                </div>
             </div>
          </div>
       </div>

    </div>

    <!-- Floating Action Button to Convert New Code -->
    <div class="fab-container">
        <button class="fab-btn" @click="router.push('/convert')">
            <ArrowRightLeft :size="24" />
            <span class="fab-text">New Conversion</span>
        </button>
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
  position: relative;
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.icon-btn {
  color: white;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-sm {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid #3f3f46;
}
.avatar-sm img { width: 100%; height: 100%; }

.content-scrollable {
  padding: 1rem 1.25rem 6rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* History Styles */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.history-card {
  background-color: #1c1c21; /* Very dark card bg */
  border: 1px solid #2d2d35;
  border-radius: 8px;
  padding: 1rem;
}

.hc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.hc-id {
  font-weight: 700;
  font-size: 1rem;
  color: white;
}

.hc-badge {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
}

.hc-date {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.75rem;
}

.hc-desc {
  font-size: 0.875rem;
  color: #e4e4e7;
  line-height: 1.4;
  margin-bottom: 1rem;
}

.hc-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.hc-label {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.hc-odds {
  font-size: 1rem;
  font-weight: 800;
}

/* FAB */
.fab-container {
    position: fixed;
    bottom: 5.5rem; /* Above bottom nav */
    right: 1.25rem;
    z-index: 20;
}

.fab-btn {
    background-color: var(--color-primary);
    color: black;
    border-radius: 2rem;
    padding: 0.75rem 1.25rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 700;
    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
    transition: transform 0.2s;
}

.fab-btn:active {
    transform: scale(0.95);
}
</style>
