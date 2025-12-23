<script setup>
import { ref, watch, computed } from 'vue';
import { ChevronDown, X } from 'lucide-vue-next';

const props = defineProps({
  modelValue: [Number, String],
  items: { type: Array, default: () => [] },
  label: String,
  placeholder: { type: String, default: 'Search...' },
  displayKey: { type: String, default: 'name' },
  valueKey: { type: String, default: 'id' },
  imageKey: String,
  disabled: Boolean
});

const emit = defineEmits(['update:modelValue', 'search']);

const searchQuery = ref('');
const isOpen = ref(false);
const selectedItem = ref(null);

const filteredItems = computed(() => {
  if (!searchQuery.value) return props.items;
  const query = searchQuery.value.toLowerCase();
  return props.items.filter(item => {
    const name = item[props.displayKey]?.toLowerCase() || '';
    const shortName = item.short_name?.toLowerCase() || '';
    return name.includes(query) || shortName.includes(query);
  });
});

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    selectedItem.value = props.items.find(item => item[props.valueKey] === newVal);
    if (selectedItem.value) {
      searchQuery.value = selectedItem.value[props.displayKey];
    }
  } else {
    selectedItem.value = null;
    searchQuery.value = '';
  }
}, { immediate: true });

watch(searchQuery, (val) => {
  emit('search', val);
});

const selectItem = (item) => {
  selectedItem.value = item;
  searchQuery.value = item[props.displayKey];
  emit('update:modelValue', item[props.valueKey]);
  isOpen.value = false;
};

const clear = () => {
  selectedItem.value = null;
  searchQuery.value = '';
  emit('update:modelValue', null);
  isOpen.value = false;
};

const handleFocus = () => {
  isOpen.value = true;
  if (selectedItem.value) {
    searchQuery.value = '';
  }
};

const handleBlur = () => {
  setTimeout(() => {
    isOpen.value = false;
    if (selectedItem.value) {
      searchQuery.value = selectedItem.value[props.displayKey];
    }
  }, 200);
};
</script>

<template>
  <div class="autocomplete-container">
    <label v-if="label" class="label">{{ label }}</label>
    <div class="input-wrapper">
      <input
        v-model="searchQuery"
        type="text"
        class="input-field"
        :placeholder="placeholder"
        :disabled="disabled"
        @focus="handleFocus"
        @blur="handleBlur"
      />
      <button v-if="selectedItem" type="button" class="clear-btn" @click="clear">
        <X :size="16" />
      </button>
      <ChevronDown v-else :size="20" class="chevron-icon" />
      
      <div v-if="isOpen && filteredItems.length > 0" class="dropdown">
        <div
          v-for="item in filteredItems"
          :key="item[valueKey]"
          class="dropdown-item"
          @click="selectItem(item)"
        >
          <img v-if="imageKey && item[imageKey]" :src="item[imageKey]" class="item-image" />
          <div v-else-if="imageKey" class="item-image-placeholder">
            {{ item.short_name || item[displayKey]?.charAt(0) }}
          </div>
          <div class="item-text">
            <span class="item-name">{{ item[displayKey] }}</span>
            <span v-if="item.short_name" class="item-short">{{ item.short_name }}</span>
          </div>
        </div>
      </div>
      
      <div v-else-if="isOpen && searchQuery && filteredItems.length === 0" class="dropdown">
        <div class="dropdown-empty">No results found</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.autocomplete-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
  position: relative;
}

.label {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
}

.input-wrapper {
  position: relative;
}

.input-field {
  width: 100%;
  padding: 1rem;
  padding-right: 2.5rem;
  background-color: var(--color-card);
  border: 1px solid transparent;
  border-radius: 12px;
  color: var(--color-text-primary);
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s;
}

.input-field:focus {
  border-color: var(--color-primary);
}

.input-field::placeholder {
  color: #52525b;
}

.input-field:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.clear-btn {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s;
}

.clear-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
}

.chevron-icon {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-secondary);
  pointer-events: none;
}

.dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 0;
  right: 0;
  background-color: var(--color-card);
  border: 1px solid #27272a;
  border-radius: 12px;
  max-height: 250px;
  overflow-y: auto;
  z-index: 50;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
}

.dropdown-item {
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: white;
}

.dropdown-item:hover {
  background-color: #27272a;
}

.item-image {
  width: 30px;
  height: 30px;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
}

.item-image-placeholder {
  width: 30px;
  height: 30px;
  border-radius: 4px;
  background-color: #3f3f46;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: var(--color-primary);
  flex-shrink: 0;
  font-size: 0.7rem;
}

.dropdown-empty {
  padding: 1rem;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.item-text {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.item-name {
  font-weight: 500;
  color: white;
}

.item-short {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  font-weight: 600;
}
</style>
