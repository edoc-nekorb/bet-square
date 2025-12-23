<script setup>
import { RouterLink } from 'vue-router';

// Expecting: title, description, icon component, iconBgColor (class or style), linkText
defineProps({
  title: String,
  description: String,
  to: {
    type: String,
    default: '#'
  },
  actionText: {
    type: String,
    default: 'Explore'
  }
})
</script>

<template>
  <div class="action-card">
    <div class="card-icon-slot">
      <slot name="icon" />
    </div>
    <div class="card-content">
      <h3>{{ title }}</h3>
      <p>{{ description }}</p>
    </div>
    <div class="card-footer">
      <RouterLink :to="to" class="explore-link">{{ actionText }}</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.action-card {
  background-color: var(--color-card);
  border-radius: 16px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
}

.card-icon-slot {
  margin-bottom: 0.25rem;
}

.card-content h3 {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: white;
}

.card-content p {
  color: var(--color-text-secondary);
  font-size: 0.8125rem;
  line-height: 1.5;
}

.card-footer {
  margin-top: auto;
  padding-top: 0.5rem;
}

.explore-link {
  color: var(--color-primary);
  font-size: 0.875rem;
  font-weight: 600;
}
</style>
