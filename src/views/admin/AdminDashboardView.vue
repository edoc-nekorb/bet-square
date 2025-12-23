<script setup>
import { ref, onMounted } from 'vue';
import { Users, CreditCard, FileText, Activity, Ticket } from 'lucide-vue-next';
import { useToast } from '@/composables/useToast';
import { admin } from '../../services/api';

const { error } = useToast();

const stats = ref([
  { label: 'Total Users', value: '...', change: '', icon: Users, color: 'text-blue-400', bg: 'bg-blue-900/20' },
  { label: 'Revenue', value: '...', change: '', icon: CreditCard, color: 'text-green-400', bg: 'bg-green-900/20' },
  { label: 'Active Posts', value: '...', change: '', icon: FileText, color: 'text-purple-400', bg: 'bg-purple-900/20' },
  { label: 'Split Tickets', value: '...', change: '', icon: Ticket, color: 'text-orange-400', bg: 'bg-orange-900/20' },
]);

const recentActivity = ref([]);

const fetchStats = async () => {
    try {
        const { data } = await admin.getStats();
        
        stats.value[0].value = data.totalUsers.toLocaleString();
        stats.value[1].value = `₦${data.revenue.toLocaleString()}`;
        stats.value[2].value = data.activePosts.toLocaleString();
        stats.value[3].value = data.splitTickets.toLocaleString();

        recentActivity.value = data.recentActivity;
    } catch (err) {
        console.error('Failed to fetch stats', err);
        error('Failed to load dashboard stats');
    }
};

onMounted(fetchStats);
</script>

<template>
  <div class="dashboard-overview">
     <!-- Stats Grid -->
     <div class="stats-grid">
        <div v-for="stat in stats" :key="stat.label" class="stat-card">
           <div class="stat-icon" :class="[stat.color, stat.bg]">
              <component :is="stat.icon" :size="24" />
           </div>
           <div class="stat-info">
              <span class="stat-label">{{ stat.label }}</span>
              <div class="stat-value-row">
                 <span class="stat-value">{{ stat.value }}</span>
                 <span class="stat-change">{{ stat.change }}</span>
              </div>
           </div>
        </div>
     </div>

     <!-- Recent Activity -->
     <div class="content-row">
        <div class="card activity-card">
           <h3>Recent Activity</h3>
           <div class="activity-list">
              <div v-for="item in recentActivity" :key="item.id" class="activity-item">
                 <div class="dot"></div>
                 <p>
                    <span class="user-highlight">{{ item.user }}</span> 
                    {{ item.action }}
                 </p>
                 <span class="activity-time">{{ new Date(item.time).toLocaleDateString() }}</span>
              </div>
           </div>
        </div>
     </div>
  </div>
</template>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background-color: var(--color-card);
  padding: 1.5rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 1rem;
  border: 1px solid #27272a;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-info {
  flex: 1;
}

.stat-label {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  display: block;
  margin-bottom: 0.25rem;
}

.stat-value-row {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
}

.stat-change {
  font-size: 0.875rem;
  color: #4ade80; /* green-400 */
}

/* Utilities for colors */
.text-blue-400 { color: #60a5fa; }
.bg-blue-900\/20 { background-color: rgba(30, 58, 138, 0.2); }

.text-green-400 { color: #4ade80; }
.bg-green-900\/20 { background-color: rgba(20, 83, 45, 0.2); }

.text-purple-400 { color: #c084fc; }
.bg-purple-900\/20 { background-color: rgba(88, 28, 135, 0.2); }

.text-orange-400 { color: #fb923c; }
.bg-orange-900\/20 { background-color: rgba(124, 45, 18, 0.2); }


.card {
  background-color: var(--color-card);
  border-radius: 12px;
  border: 1px solid #27272a;
  padding: 1.5rem;
}

.card h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: white;
  margin-bottom: 1rem;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.9375rem;
  color: #d4d4d8;
  padding-bottom: 1rem;
  border-bottom: 1px solid #27272a;
}
.activity-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--color-primary);
}

.user-highlight {
  color: white;
  font-weight: 600;
}

.activity-time {
  margin-left: auto;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}
</style>
