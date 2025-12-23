<script setup>
import { ChevronLeft, Bell, User, Copy, Check } from 'lucide-vue-next';
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { betting } from '../services/api';
import BottomNav from '../components/BottomNav.vue';

const router = useRouter();
const goBack = () => router.back();

const tickets = ref([]);
const isLoading = ref(false);
const copiedId = ref(null);

// Split tickets into two columns for the carousel
const leftColumn = ref([]);
const rightColumn = ref([]);

const fetchCommunityFeed = async () => {
    isLoading.value = true;
    try {
        const { data } = await betting.getCommunityFeed();
        tickets.value = data;
        
        // Split into two columns alternately
        leftColumn.value = data.filter((_, i) => i % 2 === 0);
        rightColumn.value = data.filter((_, i) => i % 2 === 1);
    } catch (error) {
        console.error('Failed to fetch community feed:', error);
    } finally {
        isLoading.value = false;
    }
};

const copyCode = (code, id) => {
    navigator.clipboard.writeText(code);
    copiedId.value = id;
    setTimeout(() => { copiedId.value = null; }, 2000);
};

const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const getTypeColor = (type) => {
    return type === 'converted' ? '#22c55e' : '#3b82f6';
};

const getTypeBg = (type) => {
    return type === 'converted' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(59, 130, 246, 0.15)';
};

onMounted(() => {
    fetchCommunityFeed();
});
</script>

<template>
  <div class="page-container">
    <!-- Header -->
    <header class="page-header">
       <button class="icon-btn" @click="goBack">
          <ChevronLeft :size="24" />
       </button>
       <h1>Community Tickets</h1>
       <button class="icon-btn"><Bell :size="24" /></button>
    </header>

    <div class="content-scrollable">
       <!-- Loading State -->
       <div v-if="isLoading" class="loading-state">
          <div class="spinner"></div>
          <p>Loading community tickets...</p>
       </div>

       <!-- Empty State -->
       <div v-else-if="tickets.length === 0" class="empty-state">
          <div class="empty-icon">🎫</div>
          <p>No tickets yet. Be the first to create one!</p>
       </div>

       <!-- Two Column Carousel -->
       <div v-else class="carousel-container">
          <!-- Left Column (scrolls up) -->
          <div class="carousel-column left-column">
             <div class="scroll-content scroll-up">
                <div v-for="ticket in leftColumn" :key="ticket.ticket_id + '-1'" class="ticket-card">
                   <div class="card-header">
                      <div class="user-info">
                         <div class="user-avatar">
                            <User :size="14" />
                         </div>
                         <span class="username">{{ ticket.username }}</span>
                      </div>
                      <span class="type-badge" :style="{ backgroundColor: getTypeBg(ticket.ticket_type), color: getTypeColor(ticket.ticket_type) }">
                         {{ ticket.ticket_type }}
                      </span>
                   </div>
                   
                   <div class="card-body">
                      <div class="info-row">
                         <span class="label">Bookmaker</span>
                         <span class="value bookmaker">{{ ticket.bookmaker }}</span>
                      </div>
                      <div class="info-row">
                         <span class="label">Code</span>
                         <div class="code-wrapper">
                            <span class="value code">{{ ticket.booking_code || ticket.ticket_id }}</span>
                            <button class="copy-btn" @click="copyCode(ticket.booking_code || ticket.ticket_id, ticket.ticket_id)">
                               <component :is="copiedId === ticket.ticket_id ? Check : Copy" :size="12" />
                            </button>
                         </div>
                      </div>
                      <div class="info-row">
                         <span class="label">Total Odds</span>
                         <span class="value odds">{{ ticket.total_odds }}x</span>
                      </div>
                   </div>
                   
                   <div class="card-footer">
                      <span class="date">{{ formatDate(ticket.created_at) }}</span>
                      <span class="matches">{{ ticket.match_count }} games</span>
                   </div>
                </div>
                <!-- Duplicate for infinite scroll effect -->
                <div v-for="ticket in leftColumn" :key="ticket.ticket_id + '-2'" class="ticket-card">
                   <div class="card-header">
                      <div class="user-info">
                         <div class="user-avatar">
                            <User :size="14" />
                         </div>
                         <span class="username">{{ ticket.username }}</span>
                      </div>
                      <span class="type-badge" :style="{ backgroundColor: getTypeBg(ticket.ticket_type), color: getTypeColor(ticket.ticket_type) }">
                         {{ ticket.ticket_type }}
                      </span>
                   </div>
                   
                   <div class="card-body">
                      <div class="info-row">
                         <span class="label">Bookmaker</span>
                         <span class="value bookmaker">{{ ticket.bookmaker }}</span>
                      </div>
                      <div class="info-row">
                         <span class="label">Code</span>
                         <div class="code-wrapper">
                            <span class="value code">{{ ticket.booking_code || ticket.ticket_id }}</span>
                            <button class="copy-btn" @click="copyCode(ticket.booking_code || ticket.ticket_id, ticket.ticket_id + '-dup')">
                               <component :is="copiedId === (ticket.ticket_id + '-dup') ? Check : Copy" :size="12" />
                            </button>
                         </div>
                      </div>
                      <div class="info-row">
                         <span class="label">Total Odds</span>
                         <span class="value odds">{{ ticket.total_odds }}x</span>
                      </div>
                   </div>
                   
                   <div class="card-footer">
                      <span class="date">{{ formatDate(ticket.created_at) }}</span>
                      <span class="matches">{{ ticket.match_count }} games</span>
                   </div>
                </div>
             </div>
          </div>

          <!-- Right Column (scrolls down) -->
          <div class="carousel-column right-column">
             <div class="scroll-content scroll-down">
                <div v-for="ticket in rightColumn" :key="ticket.ticket_id + '-3'" class="ticket-card">
                   <div class="card-header">
                      <div class="user-info">
                         <div class="user-avatar">
                            <User :size="14" />
                         </div>
                         <span class="username">{{ ticket.username }}</span>
                      </div>
                      <span class="type-badge" :style="{ backgroundColor: getTypeBg(ticket.ticket_type), color: getTypeColor(ticket.ticket_type) }">
                         {{ ticket.ticket_type }}
                      </span>
                   </div>
                   
                   <div class="card-body">
                      <div class="info-row">
                         <span class="label">Bookmaker</span>
                         <span class="value bookmaker">{{ ticket.bookmaker }}</span>
                      </div>
                      <div class="info-row">
                         <span class="label">Code</span>
                         <div class="code-wrapper">
                            <span class="value code">{{ ticket.booking_code || ticket.ticket_id }}</span>
                            <button class="copy-btn" @click="copyCode(ticket.booking_code || ticket.ticket_id, ticket.ticket_id + '-r')">
                               <component :is="copiedId === (ticket.ticket_id + '-r') ? Check : Copy" :size="12" />
                            </button>
                         </div>
                      </div>
                      <div class="info-row">
                         <span class="label">Total Odds</span>
                         <span class="value odds">{{ ticket.total_odds }}x</span>
                      </div>
                   </div>
                   
                   <div class="card-footer">
                      <span class="date">{{ formatDate(ticket.created_at) }}</span>
                      <span class="matches">{{ ticket.match_count }} games</span>
                   </div>
                </div>
                <!-- Duplicate for infinite scroll effect -->
                <div v-for="ticket in rightColumn" :key="ticket.ticket_id + '-4'" class="ticket-card">
                   <div class="card-header">
                      <div class="user-info">
                         <div class="user-avatar">
                            <User :size="14" />
                         </div>
                         <span class="username">{{ ticket.username }}</span>
                      </div>
                      <span class="type-badge" :style="{ backgroundColor: getTypeBg(ticket.ticket_type), color: getTypeColor(ticket.ticket_type) }">
                         {{ ticket.ticket_type }}
                      </span>
                   </div>
                   
                   <div class="card-body">
                      <div class="info-row">
                         <span class="label">Bookmaker</span>
                         <span class="value bookmaker">{{ ticket.bookmaker }}</span>
                      </div>
                      <div class="info-row">
                         <span class="label">Code</span>
                         <div class="code-wrapper">
                            <span class="value code">{{ ticket.booking_code || ticket.ticket_id }}</span>
                            <button class="copy-btn" @click="copyCode(ticket.booking_code || ticket.ticket_id, ticket.ticket_id + '-r-dup')">
                               <component :is="copiedId === (ticket.ticket_id + '-r-dup') ? Check : Copy" :size="12" />
                            </button>
                         </div>
                      </div>
                      <div class="info-row">
                         <span class="label">Total Odds</span>
                         <span class="value odds">{{ ticket.total_odds }}x</span>
                      </div>
                   </div>
                   
                   <div class="card-footer">
                      <span class="date">{{ formatDate(ticket.created_at) }}</span>
                      <span class="matches">{{ ticket.match_count }} games</span>
                   </div>
                </div>
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
  overflow: hidden;
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

.content-scrollable {
  flex: 1;
  overflow: hidden;
  padding-bottom: 5rem;
}

/* Loading and Empty States */
.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
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

/* Carousel Container */
.carousel-container {
  display: flex;
  gap: 0.75rem;
  padding: 0 1rem;
  height: calc(100vh - 8rem);
  overflow: hidden;
}

.carousel-column {
  flex: 1;
  overflow: hidden;
  position: relative;
}

/* Gradient Fade at Top and Bottom */
.carousel-column::before,
.carousel-column::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 60px;
  pointer-events: none;
  z-index: 5;
}

.carousel-column::before {
  top: 0;
  background: linear-gradient(to bottom, var(--color-background), transparent);
}

.carousel-column::after {
  bottom: 0;
  background: linear-gradient(to top, var(--color-background), transparent);
}

/* Scrolling Animation */
.scroll-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.scroll-up {
  animation: scrollUp 40s linear infinite;
}

.scroll-down {
  animation: scrollDown 40s linear infinite;
}

@keyframes scrollUp {
  0% { transform: translateY(0); }
  100% { transform: translateY(-50%); }
}

@keyframes scrollDown {
  0% { transform: translateY(-50%); }
  100% { transform: translateY(0); }
}

/* Pause animation on hover */
.carousel-column:hover .scroll-content {
  animation-play-state: paused;
}

/* Ticket Card */
.ticket-card {
  background: linear-gradient(145deg, #1f1f24 0%, #18181b 100%);
  border: 1px solid #2d2d35;
  border-radius: 12px;
  padding: 0.875rem;
  transition: all 0.3s ease;
}

.ticket-card:hover {
  transform: scale(1.02);
  border-color: var(--color-primary);
  box-shadow: 0 4px 20px rgba(34, 197, 94, 0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #27272a;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.user-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.username {
  font-size: 0.8125rem;
  font-weight: 600;
  color: white;
}

.type-badge {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  letter-spacing: 0.5px;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.value {
  font-size: 0.8125rem;
  font-weight: 600;
  color: white;
}

.value.bookmaker {
  color: #fbbf24;
}

.value.odds {
  color: #22c55e;
  font-weight: 800;
}

.code-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.value.code {
  font-family: 'SF Mono', monospace;
  font-size: 0.75rem;
  background: #27272a;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.copy-btn {
  background: #27272a;
  border: none;
  border-radius: 4px;
  padding: 0.25rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.copy-btn:hover {
  background: var(--color-primary);
  color: black;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px solid #27272a;
}

.date {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
}

.matches {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
  background: #27272a;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
}
</style>
