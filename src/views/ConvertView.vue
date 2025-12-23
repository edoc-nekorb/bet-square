<script setup>
import { ChevronLeft, Bell, User, ArrowRightLeft, History } from 'lucide-vue-next';
import { betting, auth } from '../services/api';
import { onMounted, ref } from 'vue'; // Added ref
import { useRouter } from 'vue-router'; // Restore this
import AppButton from '../components/ui/AppButton.vue';
import BottomNav from '../components/BottomNav.vue';

const router = useRouter();

const goBack = () => router.back();

const bookingCode = ref('');
const sourceBookie = ref('');
const targetBookie = ref('');
const isConverting = ref(false);
const conversionResult = ref(null);
const errorMessage = ref('');
const historyItems = ref([]);
const userPlan = ref('free');

const fetchUser = async () => {
    try {
        const { data } = await auth.me();
        userPlan.value = data.plan;
    } catch (e) {
        console.error(e);
    }
};

const handleConvert = async () => {
    if (!bookingCode.value || !sourceBookie.value || !targetBookie.value) return;

    isConverting.value = true;
    errorMessage.value = '';
    conversionResult.value = null;

    try {
        const { data } = await betting.convert(bookingCode.value, sourceBookie.value, targetBookie.value, 'ng');
        conversionResult.value = data;
        // Refresh history
        // await fetchHistory(); 
    } catch (e) {
        console.error(e);
        const errData = e.response?.data;
        
        // If it's a 422 with stats, it means PARTIAL or FAILED conversion but with details to show
        if (e.response?.status === 422 && errData?.stats) {
            conversionResult.value = {
                status: 'partial', // Treat as partial for UI display
                data: errData // structure has stats, selections etc
            };
        } else {
            // Genuine errors
            errorMessage.value = errData?.error || 'Conversion failed. Please check the code.';
            if (errData?.details) {
                errorMessage.value += ` (${errData.details})`;
            }
        }
    } finally {
        isConverting.value = false;
    }
};

const fetchHistory = async () => {
    try {
        const { data } = await betting.getConvertedHistory();
        historyItems.value = data.map(item => ({
            id: item.ticket_id,
            label: item.bookmaker,
            date: new Date(item.created_at).toLocaleString(),
            desc: `${item.match_count} Matches Converted`,
            odds: item.total_odds + 'x',
            status: 'Done' // default
        }));
    } catch (e) {
        console.error(e);
    }
};


onMounted(() => {
    fetchUser();
    fetchHistory();
});

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
       <h1>Convert Bet Code</h1>
       <div class="header-actions">
          <button class="icon-btn"><Bell :size="24" /></button>
          <div class="avatar-sm">
             <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" />
          </div>
       </div>
    </header>

    <div class="content-scrollable">
       
       <!-- Conversion Form -->
       <div class="form-section">
          <div class="input-group">
             <label>Enter Booking Code</label>
             <input type="text" v-model="bookingCode" placeholder="Paste unique booking code here..." class="text-input" />
          </div>

          <div class="input-group">
             <label>Select Source Bookie</label>
             <div class="select-wrapper">
                <select v-model="sourceBookie" class="custom-select">
                   <option value="" disabled selected>Choose source bookmaker</option>
                   <option>SportyBet</option>
                   <!-- <option>Bet9ja</option> -->
                   <option>1xBet</option>
                </select>
             </div>
          </div>

          <div class="input-group">
             <label>Select Target Bookie</label>
             <div class="select-wrapper">
                <select v-model="targetBookie" class="custom-select">
                   <option value="" disabled selected>Choose target bookmaker</option>
                   <option>SportyBet</option>
                   <!-- <option>Bet9ja</option> -->
                   <option>1xBet</option>
                </select>
             </div>
          </div>

          <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>

          <div v-if="conversionResult" class="success-card" :class="{ 'partial-success': conversionResult.status === 'partial' }">
              <h3>{{ conversionResult.status === 'partial' ? 'Partial Conversion' : 'Conversion Successful!' }}</h3>
              
              <div class="result-row" v-if="conversionResult.data.converted_code">
                  <span>New {{ targetBookie }} Code:</span>
                  <strong class="code-display">{{ conversionResult.data.converted_code }}</strong>
              </div>

              <div class="stats-grid">
                  <div class="stat-item">
                      <span class="label">Total</span>
                      <span class="value">{{ conversionResult.data.stats.total }}</span>
                  </div>
                  <div class="stat-item success">
                      <span class="label">Converted</span>
                      <span class="value">{{ conversionResult.data.stats.converted }}</span>
                  </div>
                  <div class="stat-item fail">
                      <span class="label">Failed</span>
                      <span class="value">{{ conversionResult.data.stats.failed }}</span>
                  </div>
              </div>

              <div v-if="conversionResult.data.stats.failed > 0" class="failed-list">
                  <h4>Failed Selections</h4>
                  <ul>
                      <li v-for="(item, idx) in conversionResult.data.selections.filter(s => s.status !== 'mapped')" :key="idx">
                          <strong>{{ item.home }} vs {{ item.away }}</strong>
                          <span>{{ item.status === 'target_unsupported' ? 'Market not on Target' : 'Match not found' }}</span>
                      </li>
                  </ul>
              </div>
          </div>

          <AppButton 
            block 
            variant="primary" 
            class="convert-btn" 
            @click="handleConvert"
            :disabled="isConverting || !bookingCode || !sourceBookie || !targetBookie"
          >
             <ArrowRightLeft v-if="!isConverting" :size="18" style="margin-right: 8px" /> 
             <div v-else class="spinner-sm" style="margin-right: 8px"></div>
             {{ isConverting ? 'Converting...' : 'Convert Now' }}
          </AppButton>
       </div>

       <!-- History List -->
       <div class="history-section">
          <!-- <h2 class="section-title">Recent Conversions</h2> -->
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

/* Form Styles */
.input-group {
  margin-bottom: 1.25rem;
}

.input-group label {
  display: block;
  font-size: 0.9375rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: white;
}

.text-input, .custom-select {
  width: 100%;
  background-color: #3f3f46; /* Lighter than card bg usually, based on image looks like distinct input bg */
  border: none;
  border-radius: 12px; /* Smooth rounded corners from image */
  padding: 1rem;
  color: white;
  font-size: 0.9375rem;
  outline: none;
  /* Specific styling based on image 1 */
  background-color: #2e2e36; 
}

.convert-btn {
  margin-top: 1rem;
  height: 3.5rem;
  font-size: 1rem;
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

.error-message {
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid #ef4444;
  color: #ef4444;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  text-align: center;
}

.success-card {
  background-color: rgba(34, 197, 94, 0.1);
  border: 1px solid #22c55e;
  padding: 1rem;
  border-radius: 12px;
  margin-bottom: 1rem;
  text-align: center;
}

.success-card h3 {
  color: #22c55e;
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.result-row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.code-display {
  font-size: 1.5rem;
  letter-spacing: 2px;
  color: white;
  background: #18181b;
  padding: 0.5rem;
  border-radius: 8px;
  display: block;
}

.partial-success {
    background-color: rgba(251, 146, 60, 0.1);
    border-color: #fb923c;
}

.partial-success h3 {
    color: #fb923c;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-top: 1rem;
    background: #18181b;
    padding: 1rem;
    border-radius: 8px;
}

.stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.stat-item .label {
    font-size: 0.75rem;
    color: #a1a1aa;
    text-transform: uppercase;
}

.stat-item .value {
    font-size: 1.25rem;
    font-weight: 800;
    color: white;
}

.stat-item.success .value { color: #22c55e; }
.stat-item.fail .value { color: #ef4444; }

.failed-list {
    margin-top: 1rem;
    text-align: left;
    background: #18181b;
    padding: 1rem;
    border-radius: 8px;
}

.failed-list h4 {
    font-size: 0.9rem;
    color: #ef4444;
    margin-bottom: 0.5rem;
}

.failed-list ul {
    list-style: none;
    padding: 0;
    margin: 0;
}

.failed-list li {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    margin-bottom: 0.5rem;
    border-bottom: 1px solid #27272a;
    padding-bottom: 0.25rem;
}

.failed-list li strong {
    color: #e4e4e7;
}

.failed-list li span {
    color: #a1a1aa;
}
</style>
