<script setup>
import { computed } from 'vue';

const props = defineProps({
  ticket: {
    type: Object,
    required: true
  }
})

// Ticket shape example:
// { id: 'SPB-12345', status: 'Booked', matches: [...], totalOdds: '3.88' }

const statusColor = computed(() => {
  switch (props.ticket.status.toLowerCase()) {
    case 'booked': return '#ffffff'; // White text for label, maybe specific styling
    case 'pending': return '#fb923c'; // Orange
    case 'converted': return '#22c55e'; // Green
    default: return '#9ca3af';
  }
})

const statusBadgeStyle = computed(() => {
    if (props.ticket.status === 'Converted') {
        return { backgroundColor: '#22c55e', color: '#000' }
    }
    if (props.ticket.status === 'Split') {
        return { backgroundColor: '#3b82f6', color: '#fff' } // Blue for split
    }
    if (props.ticket.status === 'Pending') {
        return { backgroundColor: '#fb923c', color: '#000' }
    }
     // Default 'Booked' styling based on image - clean text or subtle bg
    return { color: 'white', fontWeight: '600' }
})


</script>

<template>
  <div class="ticket-row">
    <div class="ticket-header">
      <span class="ticket-id">Code: <span class="white-text">{{ ticket.id }}</span></span>
      <span class="status-badge" :style="statusBadgeStyle">{{ ticket.status }}</span>
    </div>
    
    <!-- Show matches if available, otherwise show summary -->
    <div v-if="ticket.matches && ticket.matches.length > 0" class="ticket-matches">
      <div v-for="(match, idx) in ticket.matches" :key="idx" class="match-row">
        <span class="teams">{{ match.home }} vs {{ match.away }}</span>
        <span class="odds">{{ match.odds }}</span>
      </div>
    </div>
    <div v-else class="ticket-summary">
      <div class="summary-row">
        <span class="summary-label">Bookmaker</span>
        <span class="summary-value">{{ ticket.bookmaker }}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Matches</span>
        <span class="summary-value">{{ ticket.matchCount }} games</span>
      </div>
    </div>
    
    <div class="ticket-footer">
      <span class="label">Total Odds:</span>
      <span class="total-odds">{{ ticket.totalOdds }}x</span>
    </div>
  </div>
</template>


<style scoped>
.ticket-row {
  background-color: var(--color-card);
  border-radius: 16px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1rem;
  border: 1px solid #2d2d35;
}

.ticket-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

.ticket-id {
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  font-weight: 500;
}
.white-text { color: white; font-weight: 600; }

.status-badge {
  font-size: 0.7rem;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  text-transform: capitalize;
}

.ticket-matches {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.match-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}

.teams {
  color: white;
  font-weight: 500;
}

.odds {
  color: white;
  font-weight: 700;
}

.ticket-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.5rem;
}

.label {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.total-odds {
  color: white;
  font-size: 1.125rem;
  font-weight: 800;
}

.ticket-summary {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}

.summary-label {
  color: var(--color-text-secondary);
}

.summary-value {
  color: white;
  font-weight: 600;
}
</style>

