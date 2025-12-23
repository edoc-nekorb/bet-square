
<script setup>
import { Bell, Upload, Sparkles, Tag, Check, Copy } from 'lucide-vue-next';
import { ref, computed, onMounted } from 'vue';
import BottomNav from '../components/BottomNav.vue';
import AppButton from '../components/ui/AppButton.vue';
import { betting, auth, payment } from '../services/api';

const bookingCodes = ref('');
const sourceBookie = ref('');
const ticketCount = ref(4);
const matchesPerTicket = ref(10);
const avoidDuplicates = ref(true);
const balanceOdds = ref(true);

const isExtracting = ref(false);
const isGenerating = ref(false);
const extractedMatches = ref([]);
const generatedTickets = ref([]);
const history = ref([]);
const copiedId = ref(null);
const errorMessage = ref('');
const userBalance = ref(0);

const fetchHistory = async () => {
    try {
        const { data } = await betting.getSplitHistory();
        history.value = data;
    } catch (e) {
        console.error('Failed to fetch history', e);
    }
};

const userPlan = ref('free');
const showUpgradeModal = ref(false);

const fetchUser = async () => {
    try {
        const { data } = await auth.me();
        userBalance.value = parseFloat(data.balance);
        userPlan.value = data.plan;
    } catch (e) {
         console.error('Failed to fetch user', e);
    }
};

onMounted(() => {
    fetchHistory();
    fetchUser();
});

const handleExtract = async () => {
    if (!bookingCodes.value || !sourceBookie.value) return;
    
    // Quick validation for SportyBet code format roughly (just length)
    if (sourceBookie.value === 'SportyBet' && bookingCodes.value.length < 4) return;

    isExtracting.value = true;
    errorMessage.value = '';
    extractedMatches.value = [];

    try {
        const { data } = await betting.extract(bookingCodes.value, sourceBookie.value, 'ng'); // Default to NG for now
        extractedMatches.value = data;
    } catch (e) {
        console.error("Extraction Failed:", e);
        errorMessage.value = e.response?.data?.error || 'Failed to load booking code. Please check and try again.';
    } finally {
        isExtracting.value = false;
    }
};

const generateTickets = async () => {
    if (userPlan.value === 'free') {
        showUpgradeModal.value = true;
        return;
    }

    if (extractedMatches.value.length === 0) return;
    if (extractedMatches.value.length === 0) return;
    
    isGenerating.value = true;
    errorMessage.value = '';
    generatedTickets.value = [];

    try {
        // 1. Fee Removed
        
        // 2. Split Games locally
        const splitResults = splitAlgorithm(
            extractedMatches.value, 
            ticketCount.value, 
            matchesPerTicket.value, 
            avoidDuplicates.value
        );

        // 3. Re-book each ticket via API
        const promises = splitResults.map(async (ticketMatches) => {
            try {
                const totalOdds = ticketMatches.reduce((acc, m) => acc * m.selection.odds, 1).toFixed(2);
                
                // Call API to get real booking code
                const { data } = await betting.book(ticketMatches, sourceBookie.value, 'ng');
                
                const ticketId = data.bizCode || `TKT-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

                // Save to Database
                await betting.save({
                   ticketId: ticketId,
                   bookmaker: sourceBookie.value,
                   bookingCode: data.shareCode,
                   totalOdds: totalOdds,
                   matchCount: ticketMatches.length,
                   type: 'split'
                });

                return {
                    id: ticketId,
                    matches: ticketMatches.length,
                    odd: totalOdds,
                    bookingCode: data.shareCode,
                    matchList: ticketMatches,
                    bookmaker: sourceBookie.value
                };
            } catch (e) {
                console.error("Booking Failed for ticket", e);
                return null; // Skip failed ones
            }
        });

        const results = await Promise.all(promises);
        generatedTickets.value = results.filter(t => t !== null);
        
        // Refresh history
        await fetchHistory();
    } catch (e) {
        console.error("Generation/Charge Error", e);
        errorMessage.value = e.response?.data?.error || "Failed to generate tickets.";
        // If charge failed, we stopped. If charge succeeded but generation failed... 
        // Ideally we should refund or transaction helps. For now simplistic.
        if (e.response?.data?.error === 'Insufficient balance') {
             // Handle specifically
        }
    } finally {
        isGenerating.value = false;
    }
};

const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

const splitAlgorithm = (matches, count, perTicket, unique) => {
    const result = [];
    // Shuffle the initial pool to ensure random distribution
    let pool = shuffleArray([...matches]);

    for (let i = 0; i < count; i++) {
        let selected = [];
        
        if (unique) {
            if (pool.length < perTicket) {
                // If we ran out of unique matches, refill and reshuffle
                // But exclude matches already used in THIS ticket (which is none yet)
                // Actually, if we want "avoid duplicates" across ALL tickets, we can't refill.
                // But typically users mean "no duplicates within a ticket" OR "use all matches then repeat".
                // The current logic seems to imply "exhaust uniques then recycle".
                
                // Refill pool if it's too small for a full ticket
                 pool = shuffleArray([...matches]);
            }
            selected = pool.splice(0, perTicket);
        } else {
             // If uniqueness is not strictly required across tickets (just random picks)
             if (pool.length === 0) pool = shuffleArray([...matches]);
             
             // Pick random set
             selected = pool.splice(0, perTicket);
             
             // If we want completely random with replacement (duplicates possible across tickets), 
             // we should likely not splice effectively or just refill immediately.
             // But let's stick to the behavior: "Take random chunk".
             // If we just spliced, we removed them. 
             // Regardles, we need to ensure the POOL is shuffled.
        }
        
        // Final fallback just in case
        if (selected.length < perTicket) {
             const needed = perTicket - selected.length;
             const freshPool = shuffleArray([...matches]).filter(m => !selected.includes(m));
             selected = [...selected, ...freshPool.slice(0, needed)];
        }

        if (selected.length > 0) result.push(selected);
    }
    return result;
};

const copyCode = (code, id) => {
    navigator.clipboard.writeText(code);
    copiedId.value = id;
    setTimeout(() => { copiedId.value = null; }, 2000);
};

</script>

<template>
  <div class="page-container">
    <header class="page-header">
      <h1>Smart Split / Bet Selector</h1>
      <button class="icon-btn">
        <Bell :size="24" />
      </button>
    </header>

    <div class="content-scrollable">
      
      <!-- Input Section -->
      <section class="card-section">
        <h2 class="section-title">Input Booking Codes</h2>
        <p class="section-desc">Select bookmaker and paste code to extract available games.</p>
        
        <div class="input-form">
          <div class="select-wrapper">
             <select v-model="sourceBookie" class="custom-select" @change="handleExtract">
               <option value="" disabled>Choose source bookmaker</option>
               <option>SportyBet</option>
               <option>Bet9ja</option>
               <option>1xBet</option>
             </select>
          </div>

          <textarea 
            v-model="bookingCodes" 
            placeholder="Paste your booking code (e.g. SB-123)"
            class="text-area"
            @input="handleExtract"
          ></textarea>
        </div>
      </section>

      <!-- Extracted Matches -->
      <section class="card-section">
         <div class="section-header">
            <h2 class="section-title">Extracted Matches</h2>
            <span v-if="extractedMatches.length" class="match-count">{{ extractedMatches.length }} Games</span>
         </div>
         
         <div v-if="errorMessage" class="error-message">
            <span>{{ errorMessage }}</span>
         </div>
         
         <div v-if="isExtracting" class="loading-state-inline">
            <div class="spinner"></div>
            <span>Extracting games...</span>
         </div>
         <div v-else-if="extractedMatches.length === 0" class="empty-state-card">
            <Upload :size="32" class="empty-icon" />
            <p>Enter booking code above to see games</p>
         </div>
         <div v-else class="matches-list">
            <div v-for="(match, idx) in extractedMatches" :key="idx" class="extracted-match">
               <h3 class="match-title">{{ match.home }} vs. {{ match.away }}</h3>
               <div class="match-meta">
                 <span class="meta-item"><Tag :size="12" /> {{ match.market.name }}</span>
                 <span class="meta-item">{{ match.selection.name }}</span>
                 <span class="meta-item odds-pill">{{ match.selection.odds }}</span>
               </div>
            </div>
         </div>
      </section>

      <!-- Generation Settings -->
      <section class="card-section">
         <h2 class="section-title">Generation Settings</h2>
         
         <div class="setting-row">
            <label>Number of Tickets</label>
            <input type="number" v-model="ticketCount" class="setting-input" max="4" />
         </div>

         <div class="setting-row">
            <label>Matches per Ticket</label>
            <input type="number" v-model="matchesPerTicket" class="setting-input" max="10" />
         </div>

         <div class="setting-toggle">
            <label>Avoid Duplicates</label>
            <div class="toggle-switch" :class="{ active: avoidDuplicates }" @click="avoidDuplicates = !avoidDuplicates">
               <div class="toggle-thumb"></div>
            </div>
         </div>

         <div class="setting-toggle">
            <label>Balance Odds</label>
            <div class="toggle-switch" :class="{ active: balanceOdds }" @click="balanceOdds = !balanceOdds">
               <div class="toggle-thumb"></div>
            </div>
         </div>

         <AppButton 
            block 
            variant="primary" 
            class="generate-btn" 
            @click="generateTickets"
            :disabled="extractedMatches.length === 0 || isGenerating"
         >
            <Sparkles v-if="!isGenerating" :size="18" style="margin-right: 8px"/>
            <div v-else class="spinner-sm" style="margin-right: 8px"></div>
            {{ isGenerating ? 'Generating...' : 'Generate Tickets' }}
         </AppButton>
      </section>

      <!-- Generated Tickets -->
      <section v-if="generatedTickets.length || isGenerating" class="card-section">
         <h2 class="section-title">New Tickets</h2>
         
         <div v-if="isGenerating" class="loading-state-inline">
            <span>Building optimal combinations...</span>
         </div>
         
         <div v-else class="tickets-grid">
            <div v-for="ticket in generatedTickets" :key="ticket.id" class="gen-ticket-card">
               <div class="gt-header">
                  <div class="gt-info">
                     <span class="gt-label">Ticket ID</span>
                     <span class="book-badge" v-if="ticket.bookmaker">{{ ticket.bookmaker }}</span>
                  </div>
               </div>
               
               <div class="gt-stats">
                  <div class="stat">
                     <span class="stat-icon match-icon">⚄</span> {{ ticket.matches }} Matches
                  </div>
                   <div class="stat">
                     <span class="stat-icon odd-icon">⚡</span> <span class="odd-val">{{ ticket.odd }}</span>
                  </div>
               </div>

               <button @click="copyCode(ticket.bookingCode, ticket.id)" class="book-now-btn" :class="{ 'copied': copiedId === ticket.id }">
                  <component :is="copiedId === ticket.id ? Check : Copy" :size="14" style="margin-right: 4px" />
                  {{ copiedId === ticket.id ? 'Copied' : 'Copy ' + ticket.bookingCode }}
               </button>
            </div>
         </div>
      </section>

      <!-- History Section -->
      <section v-if="history.length > 0" class="card-section">
         <h2 class="section-title">History</h2>
         <div class="tickets-grid">
            <div v-for="ticket in history" :key="ticket.id" class="gen-ticket-card history-card">
               <div class="gt-header">
                  <div class="gt-info">
                     <span class="gt-label">{{ new Date(ticket.created_at).toLocaleDateString() }}</span>
                     <span class="book-badge">{{ ticket.bookmaker }}</span>
                  </div>
               </div>
               
               <div class="gt-stats">
                  <div class="stat">
                     <span class="stat-icon match-icon">⚄</span> {{ ticket.match_count }} Matches
                  </div>
                   <div class="stat">
                     <span class="stat-icon odd-icon">⚡</span> <span class="odd-val">{{ ticket.total_odds }}</span>
                  </div>
               </div>

               <button @click="copyCode(ticket.booking_code, ticket.ticket_id)" class="book-now-btn" :class="{ 'copied': copiedId === ticket.ticket_id }">
                  <component :is="copiedId === ticket.ticket_id ? Check : Copy" :size="14" style="margin-right: 4px" />
                  {{ copiedId === ticket.ticket_id ? 'Copied' : 'Copy ' + ticket.booking_code }}
               </button>
            </div>
         </div>
      </section>

    </div>

    <BottomNav />

    <!-- Upgrade Modal -->
    <div v-if="showUpgradeModal" class="modal-overlay">
        <div class="modal">
            <div class="modal-icon">🔒</div>
            <h3>Premium Feature</h3>
            <p>Smart Split is available for Premium users only. Upgrade now to generate unlimited tickets.</p>
            <div class="modal-actions">
                <button @click="showUpgradeModal = false" class="btn-cancel">Cancel</button>
                <button @click="$router.push('/pricing')" class="btn-upgrade">Upgrade Now</button>
            </div>
        </div>
    </div>
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

.icon-btn {
  color: white;
}

.content-scrollable {
  padding: 0 1.25rem 6rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.card-section {
  background-color: var(--color-card);
  border-radius: 16px;
  padding: 1.25rem;
}

.section-title {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.section-desc {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  margin-bottom: 1rem;
  line-height: 1.4;
}

/* Section Header */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
.match-count {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.1);
  padding: 0.25rem 0.6rem;
  border-radius: 20px;
}

/* Empty State Card */
.empty-state-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  color: #52525b; /* Zinc 400 */
  text-align: center;
}
.empty-icon {
  margin-bottom: 0.75rem;
  opacity: 0.2;
}
.empty-state-card p {
  font-size: 0.8125rem;
  font-weight: 500;
}

/* Loading States */
.loading-state-inline {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1.5rem;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner-sm {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Form Styles */
.custom-select, .text-area {
  width: 100%;
  background-color: #27272a; /* Zinc 800 */
  border: none;
  border-radius: 8px;
  padding: 0.75rem;
  color: white;
  font-family: inherit;
  font-size: 0.875rem;
  outline: none;
}

.select-wrapper {
  margin-bottom: 0.75rem;
}

.text-area {
  min-height: 80px;
  resize: none;
}

.divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 1rem 0;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
}
.divider::before, .divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid #3f3f46;
}
.divider span {
  padding: 0 0.5rem;
}

.upload-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 1px solid #3f3f46;
  border-radius: 8px;
  background: transparent;
  color: white;
  font-size: 0.875rem;
  font-weight: 500;
}

/* Matches List */
.matches-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.extracted-match {
  background-color: #27272a;
  padding: 0.75rem;
  border-radius: 8px;
}

.match-title {
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.match-meta {
  display: flex;
  gap: 1rem;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

/* Settings */
.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.setting-row label, .setting-toggle label {
  font-size: 0.875rem;
  font-weight: 500;
}

.setting-input {
  width: 60px;
  background-color: #27272a;
  border: none;
  border-radius: 6px;
  padding: 0.5rem;
  color: white;
  text-align: center;
}

.setting-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.toggle-switch {
  width: 44px;
  height: 24px;
  background-color: #3f3f46;
  border-radius: 12px;
  position: relative;
  cursor: pointer;
  transition: background-color 0.2s;
}

.toggle-switch.active {
  background-color: var(--color-primary);
}

.toggle-thumb {
  width: 20px;
  height: 20px;
  background-color: white;
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: transform 0.2s;
}

.toggle-switch.active .toggle-thumb {
  transform: translateX(20px);
}

.generate-btn {
  margin-top: 1rem;
}

/* Generated Tickets Grid */
.tickets-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.gen-ticket-card {
  background-color: #27272a;
  padding: 0.75rem;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.gt-header {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
.gt-info {
  display: flex;
  flex-direction: column;
}
.gt-label { font-size: 0.65rem; color: var(--color-text-secondary); }
.gt-id { font-size: 0.8rem; font-weight: 600; color: white; }

.gt-stats {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.match-icon { color: var(--color-primary); margin-right: 4px;}
.odd-icon { color: #eab308; margin-right: 4px; } /* Yellow */
.odd-val { color: #eab308; font-weight: 700; }

.meta-item.odds-pill {
  background-color: rgba(234, 179, 8, 0.1);
  color: #eab308;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-weight: 700;
}

.book-now-btn {
  background-color: #3f3f46;
  color: white;
  font-size: 0.8rem;
  padding: 0.6rem;
  border-radius: 8px;
  font-weight: 600;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.book-now-btn.copied {
  background-color: var(--color-primary);
  color: white;
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

.book-badge {
  font-size: 0.65rem;
  background-color: rgba(34, 197, 94, 0.1); /* Green tint */
  color: #22c55e;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-weight: 600;
  margin-left: auto;
  align-self: flex-start;
}

.history-card {
    border: 1px solid #3f3f46;
}


/* Modal */
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
}
.modal {
    background: #18181b;
    border: 1px solid #27272a;
    padding: 2rem;
    border-radius: 16px;
    width: 90%;
    max-width: 400px;
    text-align: center;
}
.modal-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
}
.modal h3 {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
    color: white;
}
.modal p {
    color: #a1a1aa;
    margin-bottom: 1.5rem;
    line-height: 1.5;
}
.modal-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
}
.btn-cancel {
    background: transparent;
    color: #a1a1aa;
    border: 1px solid #3f3f46;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
}
.btn-upgrade {
    background: var(--color-primary);
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
}
</style>
