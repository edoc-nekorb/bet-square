<script setup>
import { ref, computed, onMounted } from 'vue';
import { Search, Download, Trash2, CheckCircle, XCircle, Clock } from 'lucide-vue-next';
import { admin } from '../../services/api';

const searchQuery = ref('');
const statusFilter = ref('All');
const dateFilter = ref('All');

const transactions = ref([]);
const isLoading = ref(false);
import { useToast } from '@/composables/useToast';

const { error } = useToast();

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

onMounted(fetchTransactions);

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
  });
});
</script>

<template>
  <div class="page-container">
     <div class="header">
        <h3 class="section-title">Latest Transactions</h3>
        <button class="export-btn">
           <Download :size="16" /> Export
        </button>
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
              </tr>
           </tbody>
        </table>
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
</style>
