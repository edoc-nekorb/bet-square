<script setup>
import { ref, onMounted } from 'vue';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-vue-next';
import AppButton from '../../components/ui/AppButton.vue';
import AppInput from '../../components/ui/AppInput.vue';
import AppImageUpload from '../../components/ui/AppImageUpload.vue';
import AppConfirmModal from '../../components/ui/AppConfirmModal.vue';
import { clubs } from '../../services/api';

const isEditing = ref(false);
const editingId = ref(null);
const isLoading = ref(false);
const clubsList = ref([]);
const searchQuery = ref('');

const showConfirmModal = ref(false);
const confirmCallback = ref(null);
const isDeleting = ref(false);

const clubForm = ref({ name: '', short_name: '', logo: '' });

const fetchClubs = async () => {
    isLoading.value = true;
    try {
        const { data } = await clubs.getAll(searchQuery.value);
        if (data) clubsList.value = data;
    } catch (e) {
        console.error("Fetch error", e);
    }
    isLoading.value = false;
};

onMounted(() => {
    fetchClubs();
});

const resetForm = () => {
    clubForm.value = { name: '', short_name: '', logo: '' };
    isEditing.value = false;
    editingId.value = null;
};

const openEditor = (club = null) => {
    resetForm();
    isEditing.value = true;
    if (club) {
        editingId.value = club.id;
        clubForm.value = { ...club };
    }
};

const saveClub = async () => {
    isLoading.value = true;
    try {
        if (editingId.value) {
            await clubs.update(editingId.value, clubForm.value);
        } else {
            await clubs.create(clubForm.value);
        }
        await fetchClubs();
        resetForm();
    } catch (e) {
        alert('Error saving: ' + (e.response?.data?.error || e.message));
    } finally {
        isLoading.value = false;
    }
};

const confirmDelete = (id) => {
    confirmCallback.value = async () => {
        isDeleting.value = true;
        try {
            await clubs.delete(id);
            await fetchClubs();
            showConfirmModal.value = false;
        } catch (error) {
            alert('Error deleting: ' + (error.response?.data?.error || error.message));
        } finally {
            isDeleting.value = false;
        }
    };
    showConfirmModal.value = true;
};

const handleConfirm = () => {
   if (confirmCallback.value) confirmCallback.value();
};
</script>

<template>
  <div class="page-container">
     <!-- Header & Actions -->
     <div class="header-actions" v-if="!isEditing">
        <div class="search-box">
           <input v-model="searchQuery" @input="fetchClubs" placeholder="Search clubs..." class="search-input" />
        </div>
        <AppButton variant="primary" @click="openEditor()">
           <Plus :size="18" style="margin-right:8px" /> Add Club
        </AppButton>
     </div>

     <!-- EDITOR MODE -->
     <div v-if="isEditing" class="editor-container">
        <div class="editor-header">
            <h3>{{ editingId ? 'Edit' : 'Create' }} Club</h3>
            <button class="btn-icon" @click="resetForm"><X :size="20" /></button>
        </div>
        
        <div class="editor-body">
            <div class="form-grid">
                <AppInput v-model="clubForm.name" label="Club Name" placeholder="e.g. Manchester City" id="club-name" />
                <AppInput v-model="clubForm.short_name" label="Short Name / Initials" placeholder="e.g. MCI" id="club-short" />
                <AppImageUpload v-model="clubForm.logo" label="Club Logo" :resize-width="56" :resize-height="56" />
            </div>
        </div>

        <div class="editor-footer">
            <AppButton variant="text" @click="resetForm">Cancel</AppButton>
            <AppButton variant="primary" @click="saveClub" :disabled="isLoading">
                <Save :size="18" style="margin-right:8px" /> {{ isLoading ? 'Saving...' : 'Save Club' }}
            </AppButton>
        </div>
     </div>

     <!-- LIST MODE -->
     <div v-else class="content-body">
        <div v-if="isLoading" class="loading-state">Loading clubs...</div>

        <div v-else-if="clubsList.length === 0" class="empty-state">No clubs found.</div>
        
        <div v-else class="clubs-grid">
           <div v-for="club in clubsList" :key="club.id" class="club-card">
              <div class="club-logo-container">
                 <img v-if="club.logo" :src="club.logo" class="club-logo-large" />
                 <div v-else class="club-logo-placeholder-large">{{ club.short_name || club.name?.charAt(0) }}</div>
              </div>
              <div class="club-info">
                 <h4 class="club-name">{{ club.name }}</h4>
                 <span class="club-short">{{ club.short_name }}</span>
              </div>
              <div class="club-actions">
                 <button class="btn-icon" @click="openEditor(club)"><Edit2 :size="18" /></button>
                 <button class="btn-icon delete" @click="confirmDelete(club.id)"><Trash2 :size="18" /></button>
              </div>
           </div>
        </div>
     </div>
  </div>

  <AppConfirmModal 
     :isOpen="showConfirmModal"
     title="Delete Club"
     message="Are you sure you want to delete this club? This may affect existing predictions."
     confirmText="Delete"
     :loading="isDeleting"
     @confirm="handleConfirm"
     @cancel="showConfirmModal = false"
  />
</template>

<style scoped>
.loading-state, .empty-state {
    color: var(--color-text-secondary);
    text-align: center;
    padding: 2rem;
}

.page-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.search-box {
  flex: 1;
  max-width: 400px;
}

.search-input {
  width: 100%;
  background-color: var(--color-card);
  border: 1px solid #27272a;
  border-radius: 12px;
  padding: 0.75rem 1rem;
  color: white;
  font-size: 0.9rem;
}

.search-input::placeholder {
  color: #52525b;
}

/* Editor Styles */
.editor-container {
    background-color: var(--color-card);
    border-radius: 12px;
    border: 1px solid #27272a;
    overflow: hidden;
}

.editor-header {
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #27272a;
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.editor-header h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: white;
}

.editor-body {
    padding: 1.5rem;
}

.form-grid {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.editor-footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid #27272a;
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    background-color: rgba(0,0,0,0.2);
}

.btn-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  background-color: #27272a;
  transition: all 0.2s;
}
.btn-icon:hover {
  background-color: #3f3f46;
  color: white;
}
.btn-icon.delete:hover {
  background-color: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

/* Clubs Grid */
.clubs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.club-card {
  background-color: var(--color-card);
  border: 1px solid #27272a;
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  transition: all 0.2s;
}

.club-card:hover {
  border-color: var(--color-primary);
}

.club-logo-container {
  width: 80px;
  height: 80px;
}

.club-logo-large {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  object-fit: cover;
}

.club-logo-placeholder-large {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  background-color: #3f3f46;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.5rem;
  color: var(--color-primary);
}

.club-info {
  text-align: center;
  flex: 1;
}

.club-name {
  font-size: 1rem;
  font-weight: 700;
  color: white;
  margin-bottom: 0.25rem;
}

.club-short {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  font-weight: 600;
}

.club-actions {
  display: flex;
  gap: 0.5rem;
}

@media (max-width: 768px) {
  .clubs-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
}
</style>
