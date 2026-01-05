<script setup>
import { ref, onMounted } from 'vue';
import { auth } from '@/services/api';
import AppButton from '@/components/ui/AppButton.vue';
import AppModal from '@/components/ui/AppModal.vue';
import { User, Lock, ChevronRight } from 'lucide-vue-next';

const admin = ref({
    full_name: 'Administrator',
    email: '',
    role: ''
});

const showPasswordModal = ref(false);
const passwordForm = ref({ current: '', new: '', confirm: '' });
const isChangingPassword = ref(false);

const fetchProfile = async () => {
    try {
        const { data } = await auth.me();
        admin.value = data;
    } catch (e) {
        console.error(e);
    }
};

const openPasswordModal = () => {
    passwordForm.value = { current: '', new: '', confirm: '' };
    showPasswordModal.value = true;
};

const handleChangePassword = async () => {
    if (passwordForm.value.new !== passwordForm.value.confirm) {
        alert("New passwords do not match");
        return;
    }
    if (passwordForm.value.new.length < 6) {
        alert("Password must be at least 6 characters");
        return;
    }
    
    isChangingPassword.value = true;
    try {
        const { data } = await auth.changePassword(passwordForm.value.current, passwordForm.value.new);
        alert(data.message);
        showPasswordModal.value = false;
    } catch (e) {
        alert(e.response?.data?.error || 'Failed to change password');
    } finally {
        isChangingPassword.value = false;
    }
};

onMounted(() => {
    fetchProfile();
});
</script>

<template>
  <div class="admin-profile-view">
    <div class="profile-card">
        <div class="avatar">
            <User :size="32" color="#fff" />
        </div>
        <div class="info">
            <h2>{{ admin.full_name }}</h2>
            <p>{{ admin.email }}</p>
            <span class="badg">{{ admin.role }}</span>
        </div>
    </div>

    <div class="settings-list">
        <div class="setting-item" @click="openPasswordModal">
             <div class="item-left">
                <Lock :size="20" class="item-icon green-text" />
                <span class="item-label">Change Password</span>
             </div>
             <div class="item-right">
                <ChevronRight :size="16" class="chevron" />
             </div>
        </div>
    </div>

    <!-- Change Password Modal -->
    <AppModal :isOpen="showPasswordModal" title="Change Password" @close="showPasswordModal = false">
        <div class="fund-form">
             <div class="flex-col">
                <label>Current Password</label>
                <input type="password" v-model="passwordForm.current" class="input-field" placeholder="Current Password" />
            </div>

             <div class="flex-col">
                <label>New Password</label>
                <input type="password" v-model="passwordForm.new" class="input-field" placeholder="New Password (min 6 chars)" />
            </div>

             <div class="flex-col">
                <label>Confirm Password</label>
                <input type="password" v-model="passwordForm.confirm" class="input-field" placeholder="Confirm New Password" />
            </div>
            
            <AppButton block variant="primary" @click="handleChangePassword" :disabled="isChangingPassword" style="margin-top: 1rem;">
                {{ isChangingPassword ? 'Updating...' : 'Update Password' }}
            </AppButton>
        </div>
    </AppModal>
  </div>
</template>

<style scoped>
.admin-profile-view {
    max-width: 600px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 2rem;
}

.profile-card {
    background-color: var(--color-card);
    padding: 2rem;
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 1rem;
    border: 1px solid #27272a;
}

.avatar {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background-color: #27272a;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #3f3f46;
}

.info h2 {
    font-size: 1.25rem;
    font-weight: 700;
    color: white;
}
.info p {
    color: var(--color-text-secondary);
    margin-bottom: 0.5rem;
}
.badg {
    background-color: rgba(34, 197, 94, 0.1);
    color: #22c55e;
    padding: 0.25rem 0.75rem;
    border-radius: 99px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
}

.settings-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.setting-item {
  background-color: var(--color-card);
  padding: 1rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  border: 1px solid #27272a;
  transition: border-color 0.2s;
}

.setting-item:hover {
    border-color: #3f3f46;
}

.item-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.green-text { color: var(--color-primary); }

.item-label {
  font-weight: 600;
  color: #e4e4e7;
}

.chevron { color: var(--color-text-secondary); }

.flex-col {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
}

.fund-form label {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    font-weight: 600;
}

.input-field {
    background-color: #23232a;
    border: 1px solid #3f3f46;
    color: white;
    padding: 0.75rem;
    border-radius: 8px;
    font-size: 1rem;
    width: 100%;
}
.input-field:focus {
    outline: none;
    border-color: var(--color-primary);
}
</style>
