<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { Search, Download, Trash2, CheckCircle, XCircle, Clock } from 'lucide-vue-next';
import { admin } from '../../services/api';
import { useRoute } from 'vue-router';

const searchQuery = ref('');
const statusFilter = ref('All');
const dateFilter = ref('All');

const transactions = ref([]);
const isLoading = ref(false);
import { useToast } from '@/composables/useToast';

const { error } = useToast();
const route = useRoute();

onMounted(() => {
    if (route.query.status) {
        // Map 'pending' query to 'Pending' filter
        statusFilter.value = route.query.status.charAt(0).toUpperCase() + route.query.status.slice(1);
    }
    fetchTransactions();
});

const fetchTransactions = async () => {
    isLoading.value = true;
    try {
        const { data } = await admin.getTransactions();
        transactions.value = data;
    } catch (err) {
        console.error('Failed to fetch transactions', err);
        error('Failed to fetch transactions');
    } finally {
        isLoading.value = false;
    }
};



const filteredTransactions = computed(() => {
  return transactions.value.filter(tx => {
    const matchesSearch = 
      tx.user_name?.toLowerCase().includes(searchQuery.value.toLowerCase()) || 
      tx.reference?.toLowerCase().includes(searchQuery.value.toLowerCase());
    
    const matchesStatus = statusFilter.value === 'All' || tx.status === statusFilter.value.toLowerCase();
    
    // Simple date filter (can be improved)
    let matchesDate = true;
    if (dateFilter.value === 'This Week') {
        const date = new Date(tx.created_at);
        const now = new Date();
        const diff = now - date;
        matchesDate = diff < 7 * 24 * 60 * 60 * 1000;
    }

    return matchesSearch && matchesStatus && matchesDate;
    return matchesSearch && matchesStatus && matchesDate;
  });
});

// Modal Logic
const showReviewModal = ref(false);
const selectedTx = ref(null);
const isProcessing = ref(false);

const openReview = (tx) => {
    selectedTx.value = tx;
    showReviewModal.value = true;
};

const closeReview = () => {
    showReviewModal.value = false;
    selectedTx.value = null;
};

const parseBankDetails = (json) => {
    try {
        const details = typeof json === 'string' ? JSON.parse(json) : json;
        return `${details.bankName} - ${details.accountNumber} (${details.accountName})`;
    } catch (e) {
        return json || 'N/A';
    }
};

const handleApprove = async (id) => {
    if (!confirm('Approve this withdrawal? funds are already deducted.')) return;
    isProcessing.value = true;
    try {
        await admin.approveTransaction(id); // Need to add to api service
        // Manually update list
        const tx = transactions.value.find(t => t.id === id);
        if (tx) tx.status = 'success';
        closeReview();
        // success('Withdrawal Approved');
    } catch (e) {
        alert('Error: ' + e.message);
    } finally {
        isProcessing.value = false;
    }
};

const handleReject = async (id) => {
    if (!confirm('Reject withdrawal and refund user?')) return;
    isProcessing.value = true;
    try {
        await admin.rejectTransaction(id); // Need to add to api service
        const tx = transactions.value.find(t => t.id === id);
        if (tx) tx.status = 'failed';
        closeReview();
    } catch (e) {
        alert('Error: ' + e.message);
    } finally {
        isProcessing.value = false;
    }
};
</script>

<template>
  <div class="page-container">
     <div class="header">
        <h3 class="section-title">Latest Transactions</h3>
        <div class="header-actions">
           <select v-model="statusFilter" class="filter-select">
               <option>All</option>
               <option>Success</option>
               <option>Pending</option>
               <option>Failed</option>
           </select>
            <button class="export-btn">
               <Download :size="16" /> Export
            </button>
        </div>
     </div>

     <div class="table-container">
        <table class="data-table">
           <thead>
              <tr>
                 <th>Transaction ID</th>
                 <th>User</th>
                 <th>Type</th>
                 <th>Amount</th>
               <th>Status</th>
                 <th>Date</th>
                 <th>Actions</th>
              </tr>
           </thead>
           <tbody>
              <tr v-for="tx in filteredTransactions" :key="tx.id">
                <td>{{ tx.reference }}</td>
                <td>{{ tx.user_name }}</td>
                <td class="amount-cell">₦{{ parseFloat(tx.amount).toLocaleString() }}</td>
                <td>
                    <span class="type-badge">{{ tx.type }}</span>
                </td>
                <td>
                  <span class="status-badge" :class="tx.status">
                    <CheckCircle v-if="tx.status === 'success' || tx.status === 'completed'" :size="14" />
                    <Clock v-else-if="tx.status === 'pending'" :size="14" />
                    <XCircle v-else :size="14" />
                    {{ tx.status }}
                  </span>
                </td>
                <td>{{ new Date(tx.created_at).toLocaleDateString() }}</td>
                <td>
                    <button v-if="tx.status === 'pending' && tx.type === 'withdrawal'" class="action-btn" @click="openReview(tx)">Review</button>
                </td>
              </tr>
           </tbody>
        </table>
     </div>

     <!-- Review Modal -->
     <div v-if="showReviewModal" class="modal-overlay">
         <div class="modal-card">
             <h3>Review Withdrawal</h3>
             <div class="review-details">
                 <div class="detail-row">
                     <span>User:</span> <strong>{{ selectedTx?.user_name }}</strong>
                 </div>
                 <div class="detail-row">
                     <span>Amount:</span> <strong>₦{{ parseFloat(selectedTx?.amount || 0).toLocaleString() }}</strong>
                 </div>
                 <div class="detail-row" v-if="selectedTx?.bank_details">
                     <span>Bank:</span> 
                     <div class="bank-info">
                        {{ parseBankDetails(selectedTx.bank_details) }}
                     </div>
                 </div>
             </div>
             <div class="modal-actions">
                 <button class="btn-cancel" @click="closeReview">Close</button>
                 <button class="btn-reject" @click="handleReject(selectedTx.id)" :disabled="isProcessing">Reject</button>
                 <button class="btn-approve" @click="handleApprove(selectedTx.id)" :disabled="isProcessing">Approve</button>
             </div>
         </div>
     </div>

  </div>
</template>

<style scoped>
.page-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.export-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: var(--color-card);
  color: var(--color-text-secondary);
  border: 1px solid #27272a;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
}
.export-btn:hover {
   color: white;
   background-color: #27272a;
}

.table-container {
   background-color: var(--color-card);
   border-radius: 12px;
   overflow: hidden;
   border: 1px solid #27272a;
   overflow-x: auto; /* Enable horizontal scroll */
}

.data-table {
   width: 100%;
   border-collapse: collapse;
   text-align: left;
}

.data-table th, .data-table td {
   padding: 1rem 1.5rem;
}

.data-table th {
   background-color: rgba(255, 255, 255, 0.02);
   color: var(--color-text-secondary);
   font-weight: 600;
   font-size: 0.875rem;
   border-bottom: 1px solid #27272a;
}

.data-table td {
   border-bottom: 1px solid #27272a;
   color: #e4e4e7;
   font-size: 0.9375rem;
}
.data-table tr:last-child td { border-bottom: none; }

.font-mono { font-family: monospace; color: var(--color-text-secondary); }
.font-bold { font-weight: 700; color: white; }
.text-gray { color: #a1a1aa; font-size: 0.85rem; }

.status-badge {
   font-size: 0.75rem;
   padding: 0.15rem 0.5rem;
   border-radius: 4px;
   font-weight: 600;
}
.status-badge.green { color: #4ade80; background-color: rgba(74, 222, 128, 0.1); }
.status-badge.red { color: #f87171; background-color: rgba(248, 113, 113, 0.1); }
.status-badge.pending { color: #fbbf24; background-color: rgba(251, 191, 36, 0.1); }
.status-badge.failed { color: #f87171; background-color: rgba(248, 113, 113, 0.1); }

.header-actions {
    display: flex;
    gap: 1rem;
    align-items: center;
}
.filter-select {
    background: #27272a;
    color: white;
    border: none;
    padding: 0.5rem;
    border-radius: 8px;
}
.action-btn {
    padding: 4px 12px;
    background: #3b82f6;
    color: white;
    border-radius: 4px;
    font-size: 0.8rem;
}
.modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}
.modal-card {
    background: #18181b;
    border: 1px solid #27272a;
    border-radius: 12px;
    padding: 1.5rem;
    width: 90%;
    max-width: 400px;
}
.review-details {
    margin: 1.5rem 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}
.detail-row {
    display: flex;
    justify-content: space-between;
    border-bottom: 1px solid #27272a;
    padding-bottom: 0.5rem;
}
.bank-info {
    text-align: right;
    font-family: monospace;
    max-width: 60%;
}
.modal-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
}
.btn-cancel { padding: 8px 16px; color: #a1a1aa; }
.btn-reject { padding: 8px 16px; background: #ef4444; color: white; border-radius: 6px; }
.btn-approve { padding: 8px 16px; background: #22c55e; color: white; border-radius: 6px; }
</style>
