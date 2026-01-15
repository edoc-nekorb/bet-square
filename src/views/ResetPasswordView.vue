<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppButton from '../components/ui/AppButton.vue';
import AppInput from '../components/ui/AppInput.vue';
import { auth } from '../services/api';
import { useToast } from '../composables/useToast';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const password = ref('');
const confirmPassword = ref('');
const token = ref('');
const isLoading = ref(false);
const isSubmitted = ref(false);

onMounted(() => {
    token.value = route.query.token;
    if (!token.value) {
        toast.error('Invalid reset link');
        router.push('/login');
    }
});

const handleReset = async () => {
    if (password.value !== confirmPassword.value) {
        toast.error('Passwords do not match');
        return;
    }
    if (password.value.length < 6) {
        toast.error('Password must be at least 6 characters');
        return;
    }

    try {
        isLoading.value = true;
        await auth.resetPassword(token.value, password.value);
        toast.success('Password reset successfully!');
        isSubmitted.value = true;
        setTimeout(() => {
            router.push('/login');
        }, 2000);
    } catch (err) {
        toast.error(err.response?.data?.error || 'Failed to reset password');
    } finally {
        isLoading.value = false;
    }
};
</script>

<template>
  <div class="auth-container">
    <div class="auth-header">
       <div class="logo-box">
        <svg width="40" height="40" viewBox="0 0 100 100" fill="none">
           <rect width="100" height="100" rx="30" fill="#22C55E"/>
           <rect x="35" y="35" width="30" height="30" rx="6" stroke="black" stroke-width="8"/>
        </svg>
      </div>
      <h1>Reset Password</h1>
      <p class="subtitle">Enter your new password below.</p>
    </div>

    <form @submit.prevent="handleReset" class="auth-form" v-if="!isSubmitted">
      <AppInput 
        v-model="password" 
        label="New Password" 
        placeholder="Min 6 characters"
        id="password"
        type="password"
      />

       <AppInput 
        v-model="confirmPassword" 
        label="Confirm Password" 
        placeholder="Re-enter password"
        id="confirm-password"
        type="password"
      />
      
      <div class="form-actions">
        <AppButton variant="primary" block type="submit" :disabled="isLoading">
             {{ isLoading ? 'Resetting...' : 'Reset Password' }}
        </AppButton>
      </div>
    </form>

    <div v-else class="success-message">
       <div class="success-icon">✓</div>
       <h3>Success!</h3>
       <p>Your password has been reset. Redirecting to login...</p>
    </div>

  </div>
</template>

<style scoped>
.auth-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 2rem 1.5rem;
  background-color: var(--color-background);
  color: white;
  max-width: 480px;
  margin: 0 auto;
}

.auth-header {
  margin-top: 2rem;
  text-align: center;
  margin-bottom: 2.5rem;
}

.logo-box {
  background-color: var(--color-card);
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
}

h1 {
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-actions {
  margin-top: 1rem;
}

/* Success State */
.success-message {
   text-align: center;
   padding: 2rem 0;
   display: flex;
   flex-direction: column;
   align-items: center;
   gap: 1rem;
}
.success-icon {
   width: 60px; 
   height: 60px;
   background-color: rgba(34, 197, 94, 0.2);
   color: var(--color-primary);
   border-radius: 50%;
   display: flex;
   align-items: center;
   justify-content: center;
   font-size: 2rem;
   font-weight: bold;
   margin-bottom: 1rem;
}
</style>
