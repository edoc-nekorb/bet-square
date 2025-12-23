<script setup>
import { Bell, Search, TrendingUp, Activity, Target, LogOut, User } from 'lucide-vue-next';
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { auth, content, betting, notifications } from '../services/api';
import BottomNav from '../components/BottomNav.vue';
import ActionCard from '../components/ActionCard.vue';
import TicketRow from '../components/TicketRow.vue';
import NewsModal from '../components/NewsModal.vue';
import { ArrowRightLeft, Grid2X2, BookOpen, Clock } from 'lucide-vue-next';

const searchQuery = ref('');
const activeTab = ref('Bet Square');
const showUserMenu = ref(false);
const showNewsModal = ref(false);
const selectedNews = ref(null);
const router = useRouter();

const handleLogout = () => {
  auth.logout();
  router.push('/login');
};

const openNewsModal = (newsItem) => {
  selectedNews.value = newsItem;
  showNewsModal.value = true;
};

const tabs = [
  { name: 'Bet Square', icon: null }, // Default view
  { name: 'Trends', icon: TrendingUp },
  { name: 'Expert Insight', icon: BookOpen },
  { name: 'Predictions', icon: Target }
];

const recentTickets = ref([]);
const isLoadingTickets = ref(false);

const fetchRecentTickets = async () => {
  isLoadingTickets.value = true;
  try {
    // Get all tickets (no type filter) to show both split and converted
    const { data } = await betting.getHistory();
    // Take only the first 5 and format for TicketRow component
    recentTickets.value = data.slice(0, 5).map(ticket => ({
      id: ticket.ticket_id,
      status: ticket.ticket_type === 'converted' ? 'Converted' : 'Split',
      bookmaker: ticket.bookmaker,
      matches: [], // We don't have match details in history
      totalOdds: ticket.total_odds,
      matchCount: ticket.match_count,
      createdAt: ticket.created_at
    }));
  } catch (error) {
    console.error('Failed to fetch recent tickets:', error);
  } finally {
    isLoadingTickets.value = false;
  }
};

// News Data from Backend
const trends = ref([]);
const isLoadingNews = ref(false);

const fetchNews = async () => {
  isLoadingNews.value = true;
  try {
    const { data } = await content.getNews();
    if (data) {
      trends.value = data.filter(item => item.status === 'Published');
      // Fetch reactions for all posts
      await fetchPostReactions(trends.value.map(t => t.id));
    }
  } catch (error) {
    console.error('Failed to fetch news:', error);
  } finally {
    isLoadingNews.value = false;
  }
};

// Reactions
const reactionTypes = [
  { type: 'fire', emoji: '🔥' },
  { type: 'sad', emoji: '😢' },
  { type: 'laugh', emoji: '😂' },
  { type: 'angry', emoji: '😠' }
];

const postReactions = ref({});
const userReactions = ref({});

const fetchPostReactions = async (postIds) => {
  if (!postIds || postIds.length === 0) return;
  try {
    const { data } = await content.getBatchReactions(postIds, 'news');
    postReactions.value = { ...postReactions.value, ...data };
  } catch (error) {
    console.error('Failed to fetch reactions:', error);
  }
};

const toggleReaction = async (postId, postType, reactionType) => {
  const currentReaction = userReactions.value[postId];
  
  try {
    if (currentReaction === reactionType) {
      // Remove reaction
      await content.removeReaction(postId, postType);
      userReactions.value[postId] = null;
      // Decrement count
      if (postReactions.value[postId]?.[reactionType]) {
        postReactions.value[postId][reactionType]--;
      }
    } else {
      // Add/change reaction
      await content.addReaction(postId, postType, reactionType);
      
      // Update counts
      if (currentReaction && postReactions.value[postId]?.[currentReaction]) {
        postReactions.value[postId][currentReaction]--;
      }
      if (!postReactions.value[postId]) {
        postReactions.value[postId] = { fire: 0, sad: 0, laugh: 0, angry: 0 };
      }
      postReactions.value[postId][reactionType]++;
      
      userReactions.value[postId] = reactionType;
    }
  } catch (error) {
    console.error('Failed to toggle reaction:', error);
  }
};


const insights = ref([]);
const isLoadingInsights = ref(false);

const fetchInsights = async () => {
  isLoadingInsights.value = true;
  try {
    const { data } = await content.getInsights();
    if (data) {
      insights.value = data;
    }
  } catch (error) {
    console.error('Failed to fetch insights:', error);
  } finally {
    isLoadingInsights.value = false;
  }
};

// Notification badge
const unreadCount = ref(0);

const fetchUnreadCount = async () => {
  try {
    const { data } = await notifications.getUnreadCount();
    unreadCount.value = data.count;
  } catch (error) {
    console.error('Failed to fetch unread count:', error);
  }
};
import { usePushNotifications } from '../composables/usePushNotifications';

const { checkSupport, checkSubscription, subscribeToPush, isSubscribed, permission } = usePushNotifications();
const showPushPrompt = ref(false);

const checkPushStatus = async () => {
  if (checkSupport() && !localStorage.getItem('pushDismissed')) {
    const subscribed = await checkSubscription();
    if (!subscribed && Notification.permission === 'default') {
      // Show prompt after a short delay
      setTimeout(() => {
        showPushPrompt.value = true;
      }, 3000);
    }
  }
};

const enablePushNotifications = async () => {
  const success = await subscribeToPush();
  if (success) {
    showPushPrompt.value = false;
  }
};

const dismissPushPrompt = () => {
  showPushPrompt.value = false;
  localStorage.setItem('pushDismissed', 'true');
};

onMounted(() => {
  fetchNews();
  fetchPredictions();
  fetchInsights();
  fetchRecentTickets();
  fetchUnreadCount();
  checkPushStatus();
});

// Live scores removed in favor of Expert Insight
const liveScores = ref([]);

// Predictions from API
const predictions = ref([]);
const isLoadingPredictions = ref(false);
const predictionsOffset = ref(0);
const hasMorePredictions = ref(true);
const selectedDate = ref(new Date().toISOString().split('T')[0]);

const fetchPredictions = async (loadMore = false) => {
  isLoadingPredictions.value = true;
  try {
    const params = { limit: 10, offset: loadMore ? predictionsOffset.value : 0 };
    if (selectedDate.value) params.date = selectedDate.value;
    
    const { data } = await content.getPredictions(params);
    if (data) {
      if (loadMore) {
        predictions.value = [...predictions.value, ...data];
      } else {
        predictions.value = data;
        predictionsOffset.value = 0;
      }
      hasMorePredictions.value = data.length === 10;
      if (loadMore) predictionsOffset.value += data.length;
    }
  } catch (error) {
    console.error('Failed to fetch predictions:', error);
  } finally {
    isLoadingPredictions.value = false;
  }
};

const loadMorePredictions = () => {
  fetchPredictions(true);
};

const filterByDate = () => {
  predictionsOffset.value = 0;
  hasMorePredictions.value = true;
  fetchPredictions(false);
};
</script>

<template>
  <div class="dashboard-container">
    <!-- Push Notification Prompt -->
    <div v-if="showPushPrompt" class="push-prompt">
      <div class="push-prompt-content">
        <span class="push-icon">🔔</span>
        <div class="push-text">
          <strong>Stay Updated!</strong>
          <span>Get notified about predictions & news</span>
        </div>
      </div>
      <div class="push-actions">
        <button class="push-btn enable" @click="enablePushNotifications">Enable</button>
        <button class="push-btn dismiss" @click="dismissPushPrompt">Later</button>
      </div>
    </div>
    
    <!-- Header -->
    <header class="dashboard-header">
      <div class="header-top">
        <div class="avatar-container" @click="showUserMenu = !showUserMenu">
           <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" />
           
             <div v-if="showUserMenu" class="user-menu">
               <button @click.stop="router.push('/pricing')" class="menu-item text-gold">
                  <Target :size="16" /> Upgrade Plan
               </button>
               <button @click.stop="router.push('/profile')" class="menu-item">
                 <User :size="16" /> Profile
               </button>
               <button @click.stop="handleLogout" class="menu-item text-red">
                 <LogOut :size="16" /> Logout
               </button>
             </div>
        </div>
        <h1>Dashboard</h1>
        <button class="icon-btn notification-btn" @click="$router.push('/notifications')">
          <Bell :size="24" />
          <span v-if="unreadCount > 0" class="notification-badge">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
        </button>
      </div>
      
      <div class="search-bar">
        <Search :size="20" class="search-icon" />
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="Search tickets or codes..." 
        />
      </div>
    </header>

    <div class="content-scrollable">
      <!-- Tabs Navigation -->
      <div class="tabs-scroll-container">
        <button 
          v-for="tab in tabs" 
          :key="tab.name"
          class="tab-btn"
          :class="{ active: activeTab === tab.name }"
          @click="activeTab = tab.name"
        >
          <component :is="tab.icon" v-if="tab.icon" :size="14" />
          <svg v-if="tab.name === 'Bet Square'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="tab-icon"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
          {{ tab.name }}
        </button>
      </div>

      <!-- BET SQUARE TAB -->
      <div v-if="activeTab === 'Bet Square'">
        <!-- Quick Actions Grid -->
        <section class="section">
          <h2 class="section-title">Quick Actions</h2>
          <div class="grid-2">
          <RouterLink to="/converted-codes" class="action-card-link">
            <ActionCard
              title="Converted Bet Code"
              description="View your converted bet codes between different bookmakers"
              icon-bg="bg-green-soft"
              icon-color="text-primary"
            >
              <template #icon>
                <div class="icon-circle yellow-bg">
                  <ArrowRightLeft :size="24" color="yellow"/>
                </div>
              </template>
            </ActionCard>
          </RouterLink>

            <ActionCard 
              title="Smart Split" 
              description="Use our smart split feature to generate multiple tickets from one code."
              actionText="Explore"
              @click="$router.push('/split')"
            >
              <template #icon>
                <div class="icon-circle orange-bg">
                  <Grid2X2 :size="24" color="#fb923c" />
                </div>
              </template>
            </ActionCard>
          </div>
        </section>

        <!-- Secondary Actions -->
        <section class="section">
          <div class="grid-2">
            <ActionCard 
              title="Daily Insights" 
              description="View our daily insights and tips to make better predictions."
              actionText="Explore"
              @click="$router.push('/book')"
            >
              <template #icon>
                <div class="icon-circle green-bg">
                   <BookOpen :size="24" color="green" />
                </div>
              </template>
            </ActionCard>
            
             <ActionCard 
              title="Ticket History" 
              description="View what others are betting on past and active bets."
              actionText="Explore"
              @click="$router.push('/community-tickets')"
            >
              <template #icon>
                <div class="icon-circle red-bg">
                   <Clock :size="24" color="red" />
                </div>
              </template>
            </ActionCard>

          </div>
        </section>

        <!-- Recent Tickets -->
        <section class="section last-section">
          <h2 class="section-title">Recent Tickets</h2>
          <div class="tickets-list">
            <TicketRow 
              v-for="ticket in recentTickets" 
              :key="ticket.id" 
              :ticket="ticket" 
            />
          </div>
        </section>
      </div>

      <!-- TRENDS TAB -->
      <div v-if="activeTab === 'Trends'" class="tab-content">
         <div v-if="isLoadingNews" class="loading-state">Loading news...</div>
         <div v-else-if="trends.length === 0" class="empty-state">No news available</div>
         <div v-else v-for="item in trends" :key="item.id" class="trend-card">
            <div class="trend-clickable" @click="openNewsModal(item)">
               <img v-if="item.image" :src="item.image" class="trend-img" />
               <div class="trend-info">
                  <div class="trend-meta">
                     <span class="t-source">{{ item.source }}</span> • <span>{{ new Date(item.created_at).toLocaleDateString() }}</span>
                  </div>
                  <h3 class="trend-title">{{ item.title }}</h3>
                  <p class="trend-excerpt">{{ item.body || item.excerpt }}</p>
               </div>
            </div>
            <!-- Reactions Bar -->
            <div class="reactions-bar" @click.stop>
               <button 
                  v-for="r in reactionTypes" 
                  :key="r.type"
                  class="reaction-btn"
                  :class="{ active: userReactions[item.id] === r.type }"
                  @click="toggleReaction(item.id, 'news', r.type)"
               >
                  <span class="emoji">{{ r.emoji }}</span>
                  <span class="count">{{ postReactions[item.id]?.[r.type] || 0 }}</span>
               </button>
            </div>
         </div>
      </div>


      <!-- EXPERT INSIGHT TAB -->
      <div v-if="activeTab === 'Expert Insight'" class="tab-content">
         <div v-if="isLoadingInsights" class="loading-state">Loading insights...</div>
         <div v-else-if="insights.length === 0" class="empty-state">No insights available</div>
         <div v-else v-for="item in insights" :key="item.id" class="trend-card" @click="openNewsModal(item)">
            <img v-if="item.image" :src="item.image" class="trend-img" />
            <div class="trend-info">
               <div class="trend-meta">
                  <span class="t-source">{{ item.source }}</span> • <span>{{ new Date(item.created_at).toLocaleDateString() }}</span>
               </div>
               <h3 class="trend-title">{{ item.title }}</h3>
               <p class="trend-excerpt">{{ item.body || item.excerpt }}</p>
            </div>
         </div>
      </div>

      <!-- PREDICTIONS TAB -->
      <div v-if="activeTab === 'Predictions'" class="tab-content">
         <div class="date-filter-wrapper">
            <div class="date-filter-label">Filter by Date</div>
            <div class="date-filter-input-group">
               <input type="date" v-model="selectedDate" @change="filterByDate" class="filter-date-input" />
               <button v-if="selectedDate" @click="selectedDate = ''; filterByDate()" class="clear-date-btn">
                  {{ selectedDate === new Date().toISOString().split('T')[0] ? 'Show All' : 'Clear' }}
               </button>
            </div>
         </div>
         
         <div v-if="isLoadingPredictions && predictions.length === 0" class="loading-state">Loading predictions...</div>
         <div v-else-if="predictions.length === 0" class="empty-state">
            <div class="empty-icon">📅</div>
            <div class="empty-title">No predictions available</div>
            <div class="empty-subtitle" v-if="selectedDate">No predictions found for {{ new Date(selectedDate).toLocaleDateString() }}</div>
            <div class="empty-subtitle" v-else>Check back later for new predictions</div>
         </div>
         <div v-else v-for="item in predictions" :key="item.id" class="prediction-card">
            <!-- Match Header -->
            <div class="match-header">
               <div class="team-section">
                  <div class="team-logo-wrapper">
                     <img v-if="item.home_club_logo" :src="item.home_club_logo" class="team-logo" />
                     <div v-else class="team-logo-placeholder">{{ item.home_club_short || 'H' }}</div>
                  </div>
                  <span class="team-name">{{ item.home_club_name || 'Home' }}</span>
               </div>
               
               <div class="vs-section">
                  <span class="vs-text">VS</span>
               </div>
               
               <div class="team-section">
                  <div class="team-logo-wrapper">
                     <img v-if="item.away_club_logo" :src="item.away_club_logo" class="team-logo" />
                     <div v-else class="team-logo-placeholder">{{ item.away_club_short || 'A' }}</div>
                  </div>
                  <span class="team-name">{{ item.away_club_name || 'Away' }}</span>
               </div>
            </div>

            <!-- Status Badge -->
            <div class="status-row">
               <span 
                  class="status-badge" 
                  :class="{
                     'status-won': item.result_status === 'won',
                     'status-lost': item.result_status === 'lost',
                     'status-pending': item.result_status === 'pending'
                  }"
               >
                  {{ item.result_status === 'won' ? 'Won' : item.result_status === 'lost' ? 'Lost' : 'Pending' }}
               </span>
            </div>

            <!-- Prediction Details -->
            <div class="prediction-details">
               <div v-if="item.isLocked" class="locked-overlay" @click="$router.push('/pricing')" style="cursor: pointer;">
                  <span class="lock-icon">🔒</span>
                  <span class="lock-text">Premium Only - Tap to subscribe</span>
               </div>
               <template v-else>
                   <div class="detail-item">
                      <span class="detail-label">Prediction</span>
                      <span class="detail-value">{{ item.outcome }}</span>
                   </div>
                   <div class="detail-item">
                      <span class="detail-label">Odds</span>
                      <span class="detail-odds">{{ item.odds }}</span>
                   </div>
                   <div v-if="item.match_time" class="detail-item">
                      <span class="detail-label">Time</span>
                      <span class="detail-value">{{ item.match_time.substring(0, 5) }}</span>
                   </div>
               </template>
            </div>

            <!-- Confidence Bar -->
            <div class="confidence-wrapper">
               <div class="confidence-bar">
                  <div 
                     class="confidence-fill" 
                     :style="{ 
                        width: item.isLocked ? '0%' : (item.confidence === 'High' ? '90%' : item.confidence === 'Medium' ? '60%' : '30%'),
                        backgroundColor: item.confidence === 'High' ? '#22c55e' : item.confidence === 'Medium' ? '#fbbf24' : '#ef4444'
                     }"
                  ></div>
               </div>
               <span 
                  class="confidence-label"
                  :style="{ 
                     color: item.isLocked ? '#71717a' : (item.confidence === 'High' ? '#22c55e' : item.confidence === 'Medium' ? '#fbbf24' : '#ef4444') 
                  }"
               >
                  {{ item.isLocked ? 'UNK' : item.confidence }}
               </span>
            </div>
         </div>
         
         <button v-if="hasMorePredictions && !isLoadingPredictions" @click="loadMorePredictions" class="load-more-btn">
            Load More
         </button>
         <div v-if="isLoadingPredictions && predictions.length > 0" class="loading-state">Loading more...</div>
      </div>

    </div>

    <BottomNav />
  </div>

  <NewsModal 
    :isOpen="showNewsModal" 
    :news="selectedNews || {}" 
    @close="showNewsModal = false" 
  />
</template>

<style scoped>
.dashboard-container {
  min-height: 100vh;
  background-color: var(--color-background);
  color: var(--color-text-primary);
  display: flex;
  flex-direction: column;
}

/* Push Notification Prompt */
.push-prompt {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(59, 130, 246, 0.15));
  border-bottom: 1px solid rgba(34, 197, 94, 0.3);
}

.push-prompt-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.push-icon {
  font-size: 1.25rem;
}

.push-text {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.push-text strong {
  font-size: 0.875rem;
  color: white;
}

.push-text span {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.push-actions {
  display: flex;
  gap: 0.5rem;
}

.push-btn {
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.push-btn.enable {
  background: var(--color-primary);
  color: black;
  border: none;
}

.push-btn.enable:hover {
  opacity: 0.9;
}

.push-btn.dismiss {
  background: transparent;
  color: var(--color-text-secondary);
  border: 1px solid #3f3f46;
}

.push-btn.dismiss:hover {
  border-color: var(--color-text-secondary);
}

.dashboard-header {
  padding: 1rem 1.25rem;
  background-color: var(--color-background);
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1px solid transparent; 
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.header-top h1 {
  font-size: 1.125rem;
  font-weight: 700;
}

.avatar-container {
  position: relative;
  cursor: pointer;
}

.avatar-container img {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: #eee;
  display: block;
}

.user-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 0.5rem;
  background-color: var(--color-card);
  border: 1px solid #3f3f46;
  border-radius: 12px;
  padding: 0.5rem;
  min-width: 140px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
  text-align: left;
}

.menu-item:hover {
  background-color: #27272a;
  color: white;
}

.menu-item.text-red {
  color: #ef4444;
}

.menu-item.text-red:hover {
  background-color: rgba(239, 68, 68, 0.1);
}

.icon-btn {
  color: white;
}

.notification-btn {
  position: relative;
}

.notification-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #ef4444;
  color: white;
  font-size: 0.65rem;
  font-weight: 700;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

.search-bar {
  background-color: var(--color-card);
  border-radius: 12px;
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.search-icon {
  color: var(--color-text-secondary);
}

.search-bar input {
  background: transparent;
  border: none;
  color: white;
  width: 100%;
  outline: none;
  font-size: 0.9375rem;
}

.search-bar input::placeholder {
  color: var(--color-text-secondary);
}

.content-scrollable {
  padding: 1rem 1.25rem 6rem; /* Bottom padding for nav */
  flex: 1;
}

/* Tabs */
.tabs-scroll-container {
  display: flex;
  gap: 0.75rem;
  overflow-x: auto;
  padding-bottom: 1.5rem; /* Space for scrollbar if needed, but hidden usually */
  scrollbar-width: none;
}
.tabs-scroll-container::-webkit-scrollbar {
  display: none;
}

.tab-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: var(--color-card);
  padding: 0.6rem 1rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  border: 1px solid transparent;
  transition: all 0.2s;
}

.tab-btn.active {
  background-color: #27272a; /* Slightly lighter card bg or active state */
  color: white;
  border-color: var(--color-primary);
}

.tab-btn svg {
  stroke-width: 2.5px;
}

.tab-content {
  margin-bottom: 2rem;
}

.tab-content {
  margin-bottom: 2rem;
}

.section {
  margin-bottom: 2rem;
}

@media (max-width: 768px) {
  .section-title {
    font-size: 1.125rem;
  }
  .action-grid {
    grid-template-columns: 1fr;
  }
}

/* Predictions Tab - Modern Design */
.date-filter-wrapper {
  margin-bottom: 1.5rem;
  background-color: var(--color-card);
  padding: 1rem;
  border-radius: 12px;
  border: 1px solid #27272a;
}

.date-filter-label {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  font-weight: 600;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.date-filter-input-group {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.filter-date-input {
  flex: 1;
  background-color: #27272a;
  border: 1px solid #3f3f46;
  border-radius: 8px;
  padding: 0.75rem;
  color: white;
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.2s;
}

.filter-date-input:focus {
  border-color: var(--color-primary);
}

.clear-date-btn {
  padding: 0.75rem 1rem;
  background-color: #27272a;
  border: 1px solid #3f3f46;
  border-radius: 8px;
  color: var(--color-text-secondary);
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-date-btn:hover {
  background-color: #3f3f46;
  color: white;
}

.empty-state {
  text-align: center;
  padding: 3rem 1.5rem;
  color: var(--color-text-secondary);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-title {
  font-size: 1rem;
  font-weight: 600;
  color: white;
  margin-bottom: 0.5rem;
}

.empty-subtitle {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.prediction-card {
  background-color: var(--color-card);
  border-radius: 12px;
  padding: 0.875rem;
  margin-bottom: 1rem;
  border: 1px solid #27272a;
}

/* Match Header - Vertical Centered Layout */
.match-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.team-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.team-logo-wrapper {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.team-logo {
  width: 32px;
  height: 32px;
  object-fit: cover;
}

.team-logo-placeholder {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.8125rem;
  color: var(--color-primary);
  background-color: #3f3f46;
}

.team-name {
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
  text-align: center;
  line-height: 1.2;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vs-section {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.vs-text {
  font-size: 0.625rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  background-color: #27272a;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

/* Status Row */
.status-row {
  display: flex;
  justify-content: center;
  margin-bottom: 0.75rem;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-won {
  background-color: rgba(34, 197, 94, 0.15);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.status-lost {
  background-color: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.status-pending {
  background-color: rgba(251, 191, 36, 0.15);
  color: #fbbf24;
  border: 1px solid rgba(251, 191, 36, 0.3);
}

/* Prediction Details */
.prediction-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  padding: 0.75rem;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-label {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.detail-value {
  font-size: 0.75rem;
  color: white;
  font-weight: 600;
  text-align: right;
}

.detail-odds {
  font-size: 0.75rem;
  color: var(--color-primary);
  font-weight: 700;
}

/* Confidence Wrapper */
.confidence-wrapper {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.confidence-bar {
  flex: 1;
  height: 6px;
  background-color: #27272a;
  border-radius: 3px;
  overflow: hidden;
}

.confidence-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.confidence-label {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  font-weight: 700;
  text-transform: uppercase;
  min-width: 60px;
  text-align: right;
}

/* Mobile Optimization */
@media (max-width: 400px) {
  .prediction-card {
    padding: 1rem;
  }

  .match-header {
    gap: 0.75rem;
  }

  .team-logo-wrapper {
    width: 40px;
    height: 40px;
  }

  .team-logo-placeholder {
    font-size: 0.875rem;
  }

  .team-name {
    font-size: 0.8125rem;
  }

  .vs-text {
    font-size: 0.6875rem;
    padding: 0.3rem 0.6rem;
  }

  .prediction-details {
    padding: 0.875rem;
    gap: 0.625rem;
  }

  .detail-label {
    font-size: 0.75rem;
  }

  .detail-value {
    font-size: 0.8125rem;
  }

  .detail-odds {
    font-size: 0.9375rem;
  }
}

.load-more-btn {
  width: 100%;
  padding: 0.875rem;
  background-color: var(--color-card);
  border: 1px solid #27272a;
  border-radius: 12px;
  color: white;
  font-weight: 600;
  margin-top: 1rem;
  transition: all 0.2s;
}

.load-more-btn:hover {
  background-color: #27272a;
  border-color: var(--color-primary);
}

.loading-state, .empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-secondary);
}

.section-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.icon-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid #3f3f46;
  display: flex;
  align-items: center;
  justify-content: center;
}
.icon-circle.green-bg {
  border-color: rgba(34, 197, 94, 0.3);
  background: rgba(34, 197, 94, 0.1);
}
.icon-circle.orange-bg {
  border-color: rgba(251, 146, 60, 0.3);
  background: rgba(251, 146, 60, 0.1);
}

.last-section {
  margin-bottom: 0;
}

/* Trends Styles */
.tab-content {
   display: flex;
   flex-direction: column;
   gap: 1rem;
}

.trend-card {
  background-color: var(--color-card);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  cursor: default;
  transition: all 0.2s;
}
.trend-clickable {
  display: flex;
  flex-direction: row;
  padding: 0.75rem;
  gap: 0.75rem;
  cursor: pointer;
}
.trend-clickable:hover {
  background-color: #27272a;
}
.trend-card:active {
  transform: translateY(0);
}

/* Reactions Bar */
.reactions-bar {
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-top: 1px solid #27272a;
  background: rgba(0, 0, 0, 0.2);
}

.reaction-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.35rem 0.6rem;
  background: #27272a;
  border: 1px solid #3f3f46;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.reaction-btn:hover {
  background: #3f3f46;
  transform: scale(1.05);
}

.reaction-btn.active {
  background: rgba(34, 197, 94, 0.2);
  border-color: var(--color-primary);
}

.reaction-btn .emoji {
  font-size: 1rem;
}

.reaction-btn .count {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  font-weight: 600;
}

.reaction-btn.active .count {
  color: var(--color-primary);
}

.trend-img {
   width: 80px;
   height: 80px;
   border-radius: 8px;
   object-fit: cover;
}
.trend-info {
   display: flex;
   flex-direction: column;
   justify-content: center;
}
.trend-meta {
   font-size: 0.7rem;
   color: var(--color-text-secondary);
   margin-bottom: 0.25rem;
}
.trend-title {
   font-size: 0.9rem;
   font-weight: 700;
   margin-bottom: 0.25rem;
   line-height: 1.3;
}
.trend-excerpt {
   font-size: 0.75rem;
   color: #a1a1aa;
   display: -webkit-box;
   -webkit-line-clamp: 2;
   -webkit-box-orient: vertical;
   overflow: hidden;
}

/* Live Mock Styles */
.score-card {
   background-color: var(--color-card);
   padding: 1rem;
   border-radius: 12px;
}
.score-header {
   display: flex;
   justify-content: space-between;
   font-size: 0.75rem;
   color: var(--color-text-secondary);
   margin-bottom: 0.75rem;
   font-weight: 600;
}
.score-time {
   color: var(--color-primary);
}
.score-body {
   display: flex;
   justify-content: space-between;
   align-items: center;
   font-weight: 700;
   font-size: 1rem;
}
.score-display {
   background-color: #27272a;
   padding: 0.25rem 0.75rem;
   border-radius: 6px;
}

/* Predictions Styles */
.pred-card {
   background-color: var(--color-card);
   padding: 1rem;
   border-radius: 12px;
}
.pred-match {
   font-weight: 700;
   margin-bottom: 0.75rem;
}
.pred-badge-row {
   display: flex;
   gap: 0.5rem;
   margin-bottom: 1rem;
}
.pred-pill {
   background-color: rgba(34, 197, 94, 0.1);
   color: var(--color-primary);
   font-size: 0.75rem;
   padding: 0.25rem 0.5rem;
   border-radius: 4px;
   font-weight: 600;
}
.odds-pill {
   background-color: #27272a;
   font-size: 0.75rem;
   padding: 0.25rem 0.5rem;
   border-radius: 4px;
   font-weight: 600;
}
.confidence-bar {
   width: 100%;
   height: 4px;
   background-color: #27272a;
   border-radius: 2px;
   margin-bottom: 0.5rem;
   overflow: hidden;
}
.fill {
   height: 100%;
   background-color: var(--color-primary);
}
.conf-text {
   font-size: 0.7rem;
   color: var(--color-text-secondary);
}
</style>
