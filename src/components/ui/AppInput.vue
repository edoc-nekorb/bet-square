<script setup>
import { Eye, EyeOff } from 'lucide-vue-next'
import { ref } from 'vue'

const props = defineProps({
  modelValue: String,
  label: String,
  type: {
    type: String,
    default: 'text'
  },
  placeholder: String,
  id: String
})

const emit = defineEmits(['update:modelValue'])

const showPassword = ref(false)
const inputType = ref(props.type)

const togglePassword = () => {
  showPassword.value = !showPassword.value
  inputType.value = showPassword.value ? 'text' : 'password'
}
</script>

<template>
  <div class="input-group">
    <label v-if="label" :for="id" class="label">{{ label }}</label>
    <div class="input-wrapper">
      <input
        :id="id"
        :type="inputType === 'password' && props.type === 'password' ? inputType : props.type"
        :value="modelValue"
        @input="$emit('update:modelValue', $event.target.value)"
        :placeholder="placeholder"
        class="input-field"
      />
      
      <button 
        v-if="props.type === 'password'" 
        type="button" 
        class="icon-btn"
        @click="togglePassword"
      >
        <Eye v-if="!showPassword" :size="20" />
        <EyeOff v-else :size="20" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
  width: 100%;
}

.label {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-field {
  width: 100%;
  padding: 1rem;
  padding-right: 2.5rem; /* Space for icon */
  background-color: var(--color-card);
  border: 1px solid transparent;
  border-radius: 12px;
  color: var(--color-text-primary);
  font-size: 1rem;
  outline: none;
  transition: border-color var(--transition-fast);
}

.input-field:focus {
  border-color: var(--color-primary);
}

.input-field::placeholder {
  color: #52525b;
}

.icon-btn {
  position: absolute;
  right: 1rem;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}
.icon-btn:hover {
  color: var(--color-text-primary);
}
</style>
