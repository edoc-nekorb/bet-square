<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import AppButton from '../../components/ui/AppButton.vue';
import AppInput from '../../components/ui/AppInput.vue';

import { auth } from '../../services/api';

const router = useRouter();
const email = ref('');
const password = ref('');
const isLoading = ref(false);
const errorMsg = ref('');

const handleLogin = async () => {
  isLoading.value = true;
  errorMsg.value = '';

  try {
     const { data } = await auth.login(email.value, password.value);
     if (data.user.role !== 'admin') {
         throw new Error('Unauthorized access');
     }
     localStorage.setItem('token', data.token);
     localStorage.setItem('user', JSON.stringify(data.user));
     router.push('/admin');
  } catch (error) {
     errorMsg.value = error.response?.data?.error || error.message || 'Login failed';
  } finally {
     isLoading.value = false;
  }
};
</script>

<template>
  <div class="admin-auth-container">
    <div class="auth-box">
      <div class="auth-header">
        <div class="logo-box">
          <svg width="40" height="40" viewBox="0 0 100 100" fill="none">
             <rect width="100" height="100" rx="30" fill="#22C55E"/>
             <rect x="35" y="35" width="30" height="30" rx="6" stroke="black" stroke-width="8"/>
          </svg>
        </div>
        <h1>Admin Portal</h1>
        <p class="subtitle">Secure access for administrators only.</p>
      </div>

      <form @submit.prevent="handleLogin" class="auth-form">
        <AppInput 
          v-model="email" 
          label="Admin Email" 
          placeholder="admin@betsquare.com"
          id="email"
        />
        
        <AppInput 
          v-model="password" 
          label="Password" 
          type="password"
          placeholder="Enter admin key"
          id="password"
        />

        <div v-if="errorMsg" class="error-text">{{ errorMsg }}</div>

        <div class="form-actions">
          <AppButton variant="primary" block type="submit" :disabled="isLoading">
            {{ isLoading ? 'Authenticating...' : 'Access Dashboard' }}
          </AppButton>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.admin-auth-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #18181b; /* Darker background */
  padding: 1.5rem;
  color: white;
}

.auth-box {
  width: 100%;
  max-width: 400px;
  background-color: var(--color-background);
  padding: 2.5rem;
  border-radius: 16px;
  border: 1px solid #27272a;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.auth-header {
  text-align: center;
  margin-bottom: 2rem;
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
  font-size: 1.5rem;
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
  gap: 1rem;
}

.form-actions {
  margin-top: 1rem;
}

.error-text {
  color: #ef4444;
  font-size: 0.875rem;
  text-align: center;
  margin-top: 0.5rem;
}
</style>
