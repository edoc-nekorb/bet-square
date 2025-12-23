<script setup>
import { ref, onMounted } from 'vue';
import { admin } from '../../services/api';
import { Plus, Pencil, Trash2, X } from 'lucide-vue-next';
import AppInput from '@/components/ui/AppInput.vue';
import { useToast } from '@/composables/useToast';

const { success, error } = useToast();

const plans = ref([]);
const showModal = ref(false);
const editingPlan = ref(null);
const isLoading = ref(false);

const planForm = ref({
    name: '',
    price: '',
    duration_days: '',
    description: ''
});

const fetchPlans = async () => {
    isLoading.value = true;
    try {
        const { data } = await admin.getPlans();
        plans.value = data;
    } catch (err) {
        console.error(err);
    } finally {
        isLoading.value = false;
    }
};

const openModal = (plan = null) => {
    if (plan) {
        editingPlan.value = plan;
        planForm.value = { ...plan };
    } else {
        editingPlan.value = null;
        planForm.value = { name: '', price: '', duration_days: '', description: '' };
    }
    showModal.value = true;
};

const savePlan = async () => {
    try {
        if (editingPlan.value) {
            await admin.updatePlan(editingPlan.value.id, planForm.value);
            success('Plan updated successfully');
        } else {
            await admin.createPlan(planForm.value);
            success('Plan created successfully');
        }
        await fetchPlans();
        showModal.value = false;
    } catch (err) {
        error(err.response?.data?.error || 'Failed to save plan');
    }
};

const deletePlan = async (id) => {
    if (!confirm('Are you sure?')) return;
    try {
        await admin.deletePlan(id);
        success('Plan deleted successfully');
        await fetchPlans();
    } catch (err) {
        error('Failed to delete plan');
    }
};

onMounted(fetchPlans);
</script>

<template>
    <div class="page-container">
        <div class="header">
            <h3>Subscription Plans</h3>
            <button @click="openModal()" class="btn-primary">
                <Plus :size="18" /> Add Plan
            </button>
        </div>

        <div class="grid">
            <div v-for="plan in plans" :key="plan.id" class="card">
                <div class="card-header">
                    <h4>{{ plan.name }}</h4>
                    <span class="price">₦{{ parseFloat(plan.price).toLocaleString() }}</span>
                </div>
                <div class="card-body">
                    <p class="duration">{{ plan.duration_days }} Days</p>
                    <p class="desc">{{ plan.description }}</p>
                </div>
                <div class="card-actions">
                    <button @click="openModal(plan)" class="btn-icon"><Pencil :size="16" /></button>
                    <button @click="deletePlan(plan.id)" class="btn-icon delete"><Trash2 :size="16" /></button>
                </div>
            </div>
        </div>

        <!-- Modal -->
        <div v-if="showModal" class="modal-overlay">
            <div class="modal">
                <div class="modal-header">
                    <h3>{{ editingPlan ? 'Edit Plan' : 'New Plan' }}</h3>
                    <button @click="showModal = false"><X :size="20" /></button>
                </div>
                <div class="modal-body">
                    <AppInput v-model="planForm.name" label="Plan Name" placeholder="e.g. Monthly" />
                    <AppInput v-model="planForm.price" label="Price (₦)" type="number" />
                    <AppInput v-model="planForm.duration_days" label="Duration (Days)" type="number" />
                    <div class="form-group">
                        <label>Description</label>
                        <textarea v-model="planForm.description" rows="3"></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button @click="showModal = false" class="btn-secondary">Cancel</button>
                    <button @click="savePlan" class="btn-primary">Save</button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.page-container {
    padding: 1rem;
}
.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
}
.grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
}
.card {
    background: var(--color-card);
    border: 1px solid #27272a;
    border-radius: 12px;
    padding: 1.5rem;
}
.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}
.price {
    font-weight: bold;
    color: var(--color-primary);
    font-size: 1.25rem;
}
.duration {
    color: #a1a1aa;
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
}
.desc {
    color: #e4e4e7;
    margin-bottom: 1.5rem;
}
.card-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
}
.btn-primary {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    background: var(--color-primary);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-weight: 500;
}
.btn-icon {
    background: #27272a;
    color: white;
    padding: 0.5rem;
    border-radius: 6px;
}
.btn-icon.delete:hover {
    background: #ef4444;
}

/* Modal Styles */
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
}
.modal {
    background: #18181b;
    border: 1px solid #27272a;
    border-radius: 12px;
    width: 100%;
    max-width: 500px;
    padding: 1.5rem;
}
.modal-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 1.5rem;
}
.modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 1.5rem;
}
.btn-secondary {
    background: transparent;
    border: 1px solid #27272a;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 6px;
}
textarea {
    width: 100%;
    background: #27272a;
    border: 1px solid #3f3f46;
    border-radius: 6px;
    color: white;
    padding: 0.75rem;
    resize: vertical;
}
.form-group label {
    display: block;
    margin-bottom: 0.5rem;
    color: #a1a1aa;
    font-size: 0.875rem;
}
</style>
