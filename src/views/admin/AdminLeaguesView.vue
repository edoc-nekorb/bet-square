<script setup>
import { ref, onMounted } from 'vue';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-vue-next';
import AppButton from '../../components/ui/AppButton.vue';
import AppInput from '../../components/ui/AppInput.vue';
import AppImageUpload from '../../components/ui/AppImageUpload.vue';
import AppConfirmModal from '../../components/ui/AppConfirmModal.vue';
import { leagues } from '../../services/api';

const items = ref([]);
const isLoading = ref(false);
const isEditing = ref(false);
const editingId = ref(null);

const form = ref({ name: '', logo: '' });

const showConfirmModal = ref(false);
const deleteId = ref(null);
const isDeleting = ref(false);

const fetchData = async () => {
    isLoading.value = true;
    try {
        const { data } = await leagues.getAll();
        items.value = data;
    } catch (e) {
        console.error("Fetch error", e);
    }
    isLoading.value = false;
};

onMounted(() => {
    fetchData();
});

const resetForm = () => {
    form.value = { name: '', logo: '' };
    isEditing.value = false;
    editingId.value = null;
};

const openEditor = (item = null) => {
    resetForm();
    isEditing.value = true;
    if (item) {
        editingId.value = item.id;
        form.value = { ...item };
    }
};

const saveItem = async () => {
    isLoading.value = true;
    try {
        if (editingId.value) {
            await leagues.update(editingId.value, form.value);
        } else {
            await leagues.create(form.value);
        }
        await fetchData();
        resetForm();
    } catch (e) {
        alert('Error saving: ' + (e.response?.data?.error || e.message));
    } finally {
        isLoading.value = false;
    }
};

const confirmDelete = (id) => {
    deleteId.value = id;
    showConfirmModal.value = true;
};

const handleDelete = async () => {
    isDeleting.value = true;
    try {
        await leagues.delete(deleteId.value);
        await fetchData();
        showConfirmModal.value = false;
    } catch (error) {
        alert('Error deleting: ' + (error.response?.data?.error || error.message));
    } finally {
        isDeleting.value = false;
    }
};
</script>

<template>
  <div class="page-container">
     <div class="header-actions" v-if="!isEditing">
        <h2>Leagues Management</h2>
        <AppButton variant="primary" @click="openEditor()">
           <Plus :size="18" style="margin-right:8px" /> Add New League
        </AppButton>
     </div>

     <!-- EDITOR -->
     <div v-if="isEditing" class="editor-container">
        <div class="editor-header">
            <h3>{{ editingId ? 'Edit' : 'Create' }} League</h3>
            <button class="btn-icon" @click="resetForm"><X :size="20" /></button>
        </div>
        <div class="editor-body">
            <div class="form-grid">
                <AppInput v-model="form.name" label="League Name" placeholder="e.g. Premier League" id="l-name" />
                <AppImageUpload v-model="form.logo" label="League Logo" />
            </div>
        </div>
        <div class="editor-footer">
            <AppButton variant="text" @click="resetForm">Cancel</AppButton>
            <AppButton variant="primary" @click="saveItem" :disabled="isLoading">
                <Save :size="18" style="margin-right:8px" /> {{ isLoading ? 'Saving...' : 'Save League' }}
            </AppButton>
        </div>
     </div>

     <!-- LIST -->
     <div v-else class="list-container">
        <div v-if="isLoading" class="loading-state">Loading leagues...</div>
        <div v-else-if="items.length === 0" class="empty-state">No leagues found.</div>
        <div v-else v-for="item in items" :key="item.id" class="content-item">
           <div class="item-info">
              <div v-if="item.logo" class="item-logo"><img :src="item.logo" :alt="item.name"></div>
              <span class="item-title">{{ item.name }}</span>
           </div>
           <div class="item-actions">
              <button class="btn-icon" @click="openEditor(item)"><Edit2 :size="18" /></button>
              <button class="btn-icon delete" @click="confirmDelete(item.id)"><Trash2 :size="18" /></button>
           </div>
        </div>
     </div>
  </div>

  <AppConfirmModal 
     :isOpen="showConfirmModal"
     title="Delete League"
     message="Are you sure? This might affect predictions linked to this league."
     confirmText="Delete"
     :loading="isDeleting"
     @confirm="handleDelete"
     @cancel="showConfirmModal = false"
  />
</template>

<style scoped>
.page-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
h2 { color: white; margin: 0; font-size: 1.5rem; }

.list-container { display: flex; flex-direction: column; gap: 1rem; }
.content-item {
  background-color: var(--color-card);
  border: 1px solid #27272a;
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.item-info { display: flex; align-items: center; gap: 1rem; }
.item-logo {
    width: 40px; height: 40px; border-radius: 50%; overflow: hidden; background: #333;
    display: flex; justify-content: center; align-items: center;
}
.item-logo img { width: 100%; height: 100%; object-fit: contain; }
.item-title { color: white; font-weight: 600; font-size: 1.1rem; }

.item-actions { display: flex; gap: 0.5rem; }
.btn-icon {
  width: 36px; height: 36px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  color: var(--color-text-secondary); background-color: #27272a;
  transition: all 0.2s;
}
.btn-icon:hover { background-color: #3f3f46; color: white; }
.btn-icon.delete:hover { background-color: rgba(239, 68, 68, 0.2); color: #ef4444; }

/* Editor */
.editor-container {
    background-color: var(--color-card);
    border-radius: 12px;
    border: 1px solid #27272a;
    overflow: hidden;
}
.editor-header {
    padding: 1rem 1.5rem; border-bottom: 1px solid #27272a;
    display: flex; justify-content: space-between; align-items: center;
}
.editor-header h3 { color: white; margin: 0; }
.editor-body { padding: 1.5rem; }
.form-grid { display: flex; flex-direction: column; gap: 1.5rem; }
.editor-footer {
    padding: 1rem 1.5rem; border-top: 1px solid #27272a;
    display: flex; justify-content: flex-end; gap: 1rem;
    background-color: rgba(0,0,0,0.2);
}
.loading-state, .empty-state { color: var(--color-text-secondary); text-align: center; padding: 2rem; }
</style>
