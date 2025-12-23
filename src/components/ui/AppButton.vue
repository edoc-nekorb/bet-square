<script setup>
defineProps({
  variant: {
    type: String,
    default: 'primary', // primary, secondary, text
    validator: (value) => ['primary', 'secondary', 'text'].includes(value)
  },
  block: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  }
})
</script>

<template>
  <button 
    class="app-button" 
    :class="[`variant-${variant}`, { 'is-block': block }]"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>

<style scoped>
.app-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.875rem 1.5rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 1rem;
  transition: all var(--transition-fast);
  width: auto;
}

.is-block {
  width: 100%;
}

/* Primary: Green */
.variant-primary {
  background-color: var(--color-primary);
  color: #000;
}
.variant-primary:hover:not(:disabled) {
  background-color: var(--color-primary-hover);
}

/* Secondary: Outline/Transparent (if needed, mostly ghost in this design) */
.variant-secondary {
  background-color: transparent;
  color: var(--color-primary);
}

/* Text: Link style */
.variant-text {
  background: none;
  color: var(--color-text-secondary);
  padding: 0;
  font-weight: 500;
  font-size: 0.875rem;
}
.variant-text:hover:not(:disabled) {
  color: var(--color-text-primary);
}

:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
