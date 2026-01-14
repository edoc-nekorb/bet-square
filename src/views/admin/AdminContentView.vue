<script setup>
import { ref, onMounted } from 'vue';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-vue-next';
import AppButton from '../../components/ui/AppButton.vue';
import AppInput from '../../components/ui/AppInput.vue';
import AppImageUpload from '../../components/ui/AppImageUpload.vue';
import AppConfirmModal from '../../components/ui/AppConfirmModal.vue';
import AppAutocomplete from '../../components/ui/AppAutocomplete.vue';
import { content, clubs, leagues } from '../../services/api';

const activeTab = ref('News'); // News, Predictions, Insights
const isEditing = ref(false);
const editingId = ref(null);
const isLoading = ref(false);

const showConfirmModal = ref(false);
const confirmCallback = ref(null);
const isDeleting = ref(false);

// Data
const newsItems = ref([]);
const predictions = ref([]);
const insights = ref([]);
const clubsList = ref([]);
const leaguesList = ref([]);

// Form Data
const newsForm = ref({ title: '', source: '', status: 'Draft', image: '', body: '' });
const predForm = ref({ 
    home_club_id: null, 
    away_club_id: null, 
    league_id: null,
    outcome: '', 
    odds: '', 
    confidence: 'Medium', 
    status: 'Draft',
    match_date: new Date().toISOString().split('T')[0],
    match_time: '00:00',
    result_status: 'pending'
});
const insightForm = ref({ title: '', source: '', image: '', excerpt: '', home_club_id: null, away_club_id: null });

// Fetch Data
const fetchData = async () => {
    isLoading.value = true;
    try {
        const { data: newsData } = await content.getNews();
        if (newsData) newsItems.value = newsData;

        const { data: predData } = await content.getPredictions();
        if (predData) predictions.value = predData;

        const { data: insightData } = await content.getInsights();
        if (insightData) insights.value = insightData;
    } catch (e) {
        console.error("Fetch error", e);
    }
    isLoading.value = false;
};

const fetchClubs = async (search = '') => {
    try {
        const { data } = await clubs.getAll(search);
        if (data) clubsList.value = data;
    } catch (e) {
        console.error("Clubs fetch error", e);
    }
};

const fetchLeagues = async (search = '') => {
    try {
        const { data } = await leagues.getAll(search);
        if (data) leaguesList.value = data;
    } catch (e) {
        console.error("Leagues fetch error", e);
    }
};

onMounted(() => {
    fetchData();
    fetchClubs();
    fetchLeagues();
});

const resetForms = () => {
    newsForm.value = { title: '', source: '', status: 'Draft', image: '', body: '' };
    predForm.value = { 
        home_club_id: null, 
        away_club_id: null, 
        league_id: null,
        outcome: '', 
        odds: '', 
        confidence: 'Medium', 
        status: 'Draft',
        match_date: new Date().toISOString().split('T')[0],
        match_time: '00:00',
        result_status: 'pending'
    };
    insightForm.value = { title: '', source: '', image: '', excerpt: '', home_club_id: null, away_club_id: null };
    isEditing.value = false;
    editingId.value = null;
};

const openEditor = (item = null) => {
    resetForms();
    isEditing.value = true;
    if (item) {
        editingId.value = item.id;
        if (activeTab.value === 'News') {
            newsForm.value = { ...item };
        } else if (activeTab.value === 'Predictions') {
            predForm.value = { ...item };
        } else {
            insightForm.value = { ...item };
        }
    }
};

const savePost = async () => {
    isLoading.value = true;
    try {
        if (activeTab.value === 'News') {
            if (editingId.value) await content.updateNews(editingId.value, newsForm.value);
            else await content.createNews(newsForm.value);
        } else if (activeTab.value === 'Predictions') {
            if (editingId.value) await content.updatePrediction(editingId.value, predForm.value);
            else await content.createPrediction(predForm.value);
        } else {
            if (editingId.value) await content.updateInsight(editingId.value, insightForm.value);
            else await content.createInsight(insightForm.value);
        }
        await fetchData();
        resetForms();
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
            if (activeTab.value === 'News') await content.deleteNews(id);
            else if (activeTab.value === 'Predictions') await content.deletePrediction(id);
            else await content.deleteInsight(id);
            await fetchData();
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
        <div class="tabs">
           <button class="tab-btn" :class="{ active: activeTab === 'News' }" @click="activeTab = 'News'">News</button>
           <button class="tab-btn" :class="{ active: activeTab === 'Predictions' }" @click="activeTab = 'Predictions'">Predictions</button>
           <button class="tab-btn" :class="{ active: activeTab === 'Insights' }" @click="activeTab = 'Insights'">Match Insights</button>
        </div>
        <AppButton variant="primary" @click="openEditor()">
           <Plus :size="18" style="margin-right:8px" /> Add New
        </AppButton>
     </div>

     <!-- EDITOR MODE -->
     <div v-if="isEditing" class="editor-container">
        <div class="editor-header">
            <h3>{{ editingId ? 'Edit' : 'Create' }} {{ activeTab === 'News' ? 'News Article' : (activeTab === 'Predictions' ? 'Prediction' : 'Match Insight') }}</h3>
            <button class="btn-icon" @click="resetForms"><X :size="20" /></button>
        </div>
        
        <div class="editor-body">
            <!-- NEWS FORM -->
            <div v-if="activeTab === 'News'" class="form-grid">
                <AppInput v-model="newsForm.title" label="Article Title" placeholder="Enter headline" id="n-title" />
                <div class="row-2">
                    <AppInput v-model="newsForm.source" label="Source" placeholder="e.g. BBC Sport" id="n-source" />
                    <div class="select-group">
                        <label>Status</label>
                        <select v-model="newsForm.status" class="custom-select">
                            <option>Draft</option>
                            <option>Published</option>
                        </select>
                    </div>
                </div>
                <AppImageUpload v-model="newsForm.image" label="Article Image" />
                <div class="input-group">
                    <label>Content Body</label>
                    <textarea v-model="newsForm.body" class="text-area" rows="5" placeholder="Write article content..."></textarea>
                </div>
            </div>

            <!-- PREDICTION FORM -->
            <div v-if="activeTab === 'Predictions'" class="form-grid">
                <div class="row-2">
                    <AppAutocomplete 
                        v-model="predForm.home_club_id" 
                        :items="clubsList"
                        label="Home Club"
                        placeholder="Search club..."
                        displayKey="name"
                        valueKey="id"
                        imageKey="logo"
                        @search="fetchClubs"
                    />
                    <AppAutocomplete 
                        v-model="predForm.away_club_id" 
                        :items="clubsList"
                        label="Away Club"
                        placeholder="Search club..."
                        displayKey="name"
                        valueKey="id"
                        imageKey="logo"
                        @search="fetchClubs"
                    />
                </div>
                 <div class="row-1" style="margin-bottom: 1rem;">
                    <AppAutocomplete 
                        v-model="predForm.league_id" 
                        :items="leaguesList"
                        label="League / Tournament"
                        placeholder="Search league..."
                        displayKey="name"
                        valueKey="id"
                        imageKey="logo"
                        @search="fetchLeagues"
                    />
                </div>
                <div class="row-2">
                    <AppInput v-model="predForm.outcome" label="Predicted Outcome" placeholder="e.g. Home Win, Over 2.5" id="p-outcome" />
                    <AppInput v-model="predForm.odds" label="Odds" placeholder="e.g. 1.85" id="p-odds" />
                </div>
                <div class="row-2">
                    <div class="input-group">
                        <label>Match Date</label>
                        <input type="date" v-model="predForm.match_date" class="date-input" />
                    </div>
                    <div class="input-group">
                        <label>Match Time</label>
                        <input type="time" v-model="predForm.match_time" class="date-input" />
                    </div>
                </div>
                <div class="row-3">
                    <div class="select-group">
                        <label>Confidence</label>
                        <select v-model="predForm.confidence" class="custom-select">
                            <option>Low</option>
                            <option>Medium</option>
                            <option>High</option>
                        </select>
                    </div>
                    <div class="select-group">
                        <label>Result Status</label>
                        <select v-model="predForm.result_status" class="custom-select">
                            <option value="pending">Pending</option>
                            <option value="won">Won</option>
                            <option value="lost">Lost</option>
                        </select>
                    </div>
                    <div class="select-group">
                        <label>Publish Status</label>
                        <select v-model="predForm.status" class="custom-select">
                            <option>Draft</option>
                            <option>Published</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- INSIGHTS FORM -->
            <div v-if="activeTab === 'Insights'" class="form-grid">
                <div class="row-2">
                    <AppAutocomplete 
                        v-model="insightForm.home_club_id" 
                        :items="clubsList"
                        label="Home Team"
                        placeholder="Search club..."
                        displayKey="name"
                        valueKey="id"
                        imageKey="logo"
                        @search="fetchClubs"
                    />
                    <AppAutocomplete 
                        v-model="insightForm.away_club_id" 
                        :items="clubsList"
                        label="Away Team"
                        placeholder="Search club..."
                        displayKey="name"
                        valueKey="id"
                        imageKey="logo"
                        @search="fetchClubs"
                    />
                </div>
                <AppInput v-model="insightForm.title" label="Insight Title (Headline)" placeholder="e.g. Manchester United resurgence stops here?" id="i-title" />
                <AppInput v-model="insightForm.source" label="Source" placeholder="e.g. Analyst Desk" id="i-source" />
                <AppImageUpload v-model="insightForm.image" label="Insight Image" />
                <div class="input-group">
                    <label>Excerpt / Summary</label>
                    <textarea v-model="insightForm.excerpt" class="text-area" rows="4" placeholder="Brief summary of the insight..."></textarea>
                </div>
            </div>
        </div>

        <div class="editor-footer">
            <AppButton variant="text" @click="resetForms">Cancel</AppButton>
            <AppButton variant="primary" @click="savePost" :disabled="isLoading">
                <Save :size="18" style="margin-right:8px" /> {{ isLoading ? 'Saving...' : 'Save Changes' }}
            </AppButton>
        </div>
     </div>

     <!-- LIST MODE -->
     <div v-else class="content-body">
        <div v-if="isLoading" class="loading-state">Loading content...</div>

        <!-- News List -->
        <div v-if="activeTab === 'News' && !isLoading" class="list-container">
           <div v-if="newsItems.length === 0" class="empty-state">No news articles found.</div>
           <div v-for="item in newsItems" :key="item.id" class="content-item">
              <div class="item-info">
                 <span class="item-title">{{ item.title }}</span>
                 <div class="item-meta">
                    <span class="status-pill" :class="item.status === 'Published' ? 'green' : 'gray'">{{ item.status }}</span> • {{ item.date || item.created_at.split('T')[0] }} • {{ item.source }}
                 </div>
              </div>
              <div class="item-actions">
                 <button class="btn-icon" @click="openEditor(item)"><Edit2 :size="18" /></button>
                 <button class="btn-icon delete" @click="confirmDelete(item.id)"><Trash2 :size="18" /></button>
              </div>
           </div>
        </div>

        <!-- Predictions List -->
        <div v-if="activeTab === 'Predictions' && !isLoading" class="list-container">
           <div v-if="predictions.length === 0" class="empty-state">No predictions found.</div>
           <div v-for="item in predictions" :key="item.id" class="content-item">
              <div class="item-info">
                 <span class="item-title">{{ item.match }}</span>
                 <div class="item-meta">
                    Outcome: <strong style="color:white">{{ item.outcome }}</strong> ({{ item.odds }}) • <span class="status-pill" :class="item.status === 'Published' ? 'green' : 'gray'">{{ item.status }}</span>
                 </div>
              </div>
              <div class="item-actions">
                 <button class="btn-icon" @click="openEditor(item)"><Edit2 :size="18" /></button>
                 <button class="btn-icon delete" @click="confirmDelete(item.id)"><Trash2 :size="18" /></button>
              </div>
           </div>
        </div>

        <!-- Insights List -->
        <div v-if="activeTab === 'Insights' && !isLoading" class="list-container">
           <div v-if="insights.length === 0" class="empty-state">No insights found.</div>
           <div v-for="item in insights" :key="item.id" class="content-item">
              <div class="item-info">
                 <span class="item-title">{{ item.title }}</span>
                 <div class="item-meta">
                    Source: {{ item.source }}
                 </div>
              </div>
              <div class="item-actions">
                 <button class="btn-icon" @click="openEditor(item)"><Edit2 :size="18" /></button>
                 <button class="btn-icon delete" @click="confirmDelete(item.id)"><Trash2 :size="18" /></button>
              </div>
           </div>
        </div>
     </div>
  </div>

  <AppConfirmModal 
     :isOpen="showConfirmModal"
     title="Delete Content"
     message="Are you sure you want to delete this item? This action cannot be undone."
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
}

.tabs {
  display: flex;
  gap: 0.5rem;
  background-color: var(--color-card);
  padding: 0.25rem;
  border-radius: 8px;
  border: 1px solid #27272a;
}
.tab-btn {
  padding: 0.5rem 1.25rem;
  border-radius: 6px;
  font-weight: 500;
  color: var(--color-text-secondary);
  transition: all 0.2s;
  font-size: 0.9rem;
}
.tab-btn.active {
  background-color: #27272a;
  color: white;
}
.tab-btn:hover:not(.active) {
  color: white;
}

/* List Styles */
.list-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.content-item {
  background-color: var(--color-card);
  border: 1px solid #27272a;
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-title {
  font-weight: 700;
  font-size: 1rem;
  color: white;
  margin-bottom: 0.5rem;
  display: block;
}

.item-meta {
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-pill {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
}
.status-pill.green { background-color: rgba(74, 222, 128, 0.1); color: #4ade80; }
.status-pill.gray { background-color: rgba(161, 161, 170, 0.1); color: #a1a1aa; }

.item-actions {
  display: flex;
  gap: 0.5rem;
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
    gap: 1.5rem; /* Increased gap for better spacing */
}

.row-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

.row-3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 1rem;
}

.select-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}
.select-group label {
    color: var(--color-text-secondary);
    font-size: 0.875rem;
    font-weight: 500;
}
.custom-select {
    width: 100%;
    background-color: #27272a; /* Lighter background for inputs */
    border: 1px solid transparent; /* Match AppInput style basically */
    border-radius: 12px;
    padding: 1rem;
    color: white;
    font-size: 1rem;
    appearance: none;
    outline: none;
}
.custom-select:focus {
    border-color: var(--color-primary);
}

.input-group {
   display: flex;
   flex-direction: column;
   gap: 0.5rem;
}
.input-group label {
   color: var(--color-text-secondary);
   font-size: 0.875rem;
   font-weight: 500;
}

.text-area {
    width: 100%;
    background-color: #27272a;
    border: 1px solid transparent;
    border-radius: 12px;
    padding: 1rem;
    color: white;
    font-size: 1rem;
    outline: none;
    resize: vertical;
    font-family: inherit;
}
.text-area:focus {
    border-color: var(--color-primary);
}

.date-input {
    width: 100%;
    background-color: #27272a;
    border: 1px solid transparent;
    border-radius: 12px;
    padding: 1rem;
    color: white;
    font-size: 1rem;
    outline: none;
}
.date-input:focus {
    border-color: var(--color-primary);
}

.editor-footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid #27272a;
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    background-color: rgba(0,0,0,0.2);
}

@media (max-width: 768px) {
    .row-2 {
        grid-template-columns: 1fr;
    }
}
</style>
