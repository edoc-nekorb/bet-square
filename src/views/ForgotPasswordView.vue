<script setup>
import { ref } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import AppButton from '../components/ui/AppButton.vue';
import AppInput from '../components/ui/AppInput.vue';
import { ChevronLeft } from 'lucide-vue-next';

const router = useRouter();
const email = ref('');
const isSubmitted = ref(false);

const handleReset = () => {
  // Mock reset logic
  isSubmitted.value = true;
  setTimeout(() => {
     // Optional: Redirect back to login after success message
     // router.push('/login'); 
  }, 3000);
};
</script>

<template>
  <div class="auth-container">
    <div class="auth-header">
       <RouterLink to="/login" class="back-link">
          <ChevronLeft :size="20" /> Back
       </RouterLink>
      <div class="logo-box">
        <svg width="40" height="40" viewBox="0 0 100 100" fill="none">
           <rect width="100" height="100" rx="30" fill="#22C55E"/>
           <rect x="35" y="35" width="30" height="30" rx="6" stroke="black" stroke-width="8"/>
        </svg>
      </div>
      <h1>Forgot Password?</h1>
      <p class="subtitle">No worries! Enter your email and we'll send you reset instructions.</p>
    </div>

    <form @submit.prevent="handleReset" class="auth-form" v-if="!isSubmitted">
      <AppInput 
        v-model="email" 
        label="Email Address" 
        placeholder="Enter your registered email"
        id="email"
        type="email"
      />
      
      <div class="form-actions">
        <AppButton variant="primary" block type="submit">Send Reset Link</AppButton>
      </div>
    </form>

    <div v-else class="success-message">
       <div class="success-icon">✓</div>
       <h3>Check your email</h3>
       <p>We have sent a password reset link to <strong>{{ email }}</strong>.</p>
       <AppButton variant="secondary" block @click="$router.push('/login')">Back to Login</AppButton>
    </div>

    <div class="auth-footer" v-if="!isSubmitted">
      <p>Remember your password? <RouterLink to="/login" class="link-highlight">Log In</RouterLink></p>
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
  margin-top: 1rem;
  text-align: center;
  margin-bottom: 2.5rem;
  position: relative;
}

.back-link {
   position: absolute;
   left: 0;
   top: 0;
   display: flex;
   align-items: center;
   color: var(--color-text-secondary);
   font-size: 0.875rem;
   text-decoration: none;
}

.logo-box {
  background-color: var(--color-card);
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 2rem auto 1.5rem; /* Added top margin to clear back link */
}

h1 {
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  line-height: 1.5;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-actions {
  margin-top: 1rem;
}

.auth-footer {
  margin-top: auto;
  text-align: center;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  padding-bottom: 1rem;
}

.link-highlight {
  color: var(--color-primary);
  font-weight: 600;
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
