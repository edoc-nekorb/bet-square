<script setup>
import { ref } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import AppButton from '../components/ui/AppButton.vue';
import AppInput from '../components/ui/AppInput.vue';
import { auth } from '../services/api';

const router = useRouter();
const email = ref('');
const password = ref('');
const errorMsg = ref('');
const isLoading = ref(false);

// OTP Modal state
const showOtpModal = ref(false);
const otpCode = ref('');
const otpError = ref('');
const isVerifying = ref(false);
const isResending = ref(false);
const pendingEmail = ref('');

const handleLogin = async () => {
  isLoading.value = true;
  errorMsg.value = '';
  
  try {
    const { data } = await auth.login(email.value, password.value);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    router.push('/dashboard');
  } catch (error) {
    const errData = error.response?.data;
    
    // Check if email verification is required
    if (errData?.requiresVerification) {
      pendingEmail.value = errData.email;
      showOtpModal.value = true;
    } else {
      errorMsg.value = errData?.error || 'Login failed';
    }
  } finally {
    isLoading.value = false;
  }
};

const handleVerifyOTP = async () => {
  otpError.value = '';
  isVerifying.value = true;
  
  try {
    await auth.verifyOTP(pendingEmail.value, otpCode.value);
    showOtpModal.value = false;
    // Try login again after verification
    await handleLogin();
  } catch (error) {
    otpError.value = error.response?.data?.error || 'Verification failed';
  } finally {
    isVerifying.value = false;
  }
};

const handleResendOTP = async () => {
  isResending.value = true;
  otpError.value = '';
  
  try {
    await auth.resendOTP(pendingEmail.value);
    otpError.value = '✓ New code sent to your email';
  } catch (error) {
    otpError.value = error.response?.data?.error || 'Failed to resend';
  } finally {
    isResending.value = false;
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
      <h1>Welcome Back!</h1>
      <p class="subtitle">Enter your credentials to continue.</p>
    </div>

    <form @submit.prevent="handleLogin" class="auth-form">
      <AppInput 
        v-model="email" 
        label="Email" 
        placeholder="Enter your email"
        id="email"
        type="email"
      />
      
      <AppInput 
        v-model="password" 
        label="Password" 
        type="password"
        placeholder="Enter your password"
        id="password"
      />

      <div v-if="errorMsg" class="error-text">{{ errorMsg }}</div>

      <div class="form-actions">
        <AppButton variant="primary" block type="submit" :disabled="isLoading">
          {{ isLoading ? 'Signing In...' : 'Sign In' }}
        </AppButton>
        
        <RouterLink to="/forgot-password" class="forgot-link">
          Forgot password?
        </RouterLink>
      </div>
    </form>

    <div class="auth-footer">
      <p>Don't have an account? <RouterLink to="/signup" class="link-highlight">Sign Up</RouterLink></p>
    </div>
  </div>

  <!-- OTP Verification Modal -->
  <div v-if="showOtpModal" class="modal-overlay">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Verify Your Email</h2>
        <p>Your email hasn't been verified yet. We sent a code to <strong>{{ pendingEmail }}</strong></p>
      </div>
      
      <div class="otp-input-wrapper">
        <input 
          v-model="otpCode" 
          type="text" 
          maxlength="6" 
          placeholder="000000"
          class="otp-input"
          @keyup.enter="handleVerifyOTP"
        />
      </div>
      
      <p v-if="otpError" :class="['otp-message', otpError.startsWith('✓') ? 'success' : 'error']">
        {{ otpError }}
      </p>
      
      <div class="modal-actions">
        <AppButton 
          variant="primary" 
          block 
          @click="handleVerifyOTP"
          :disabled="isVerifying || otpCode.length !== 6"
        >
          {{ isVerifying ? 'Verifying...' : 'Verify & Login' }}
        </AppButton>
        
        <button 
          type="button" 
          class="resend-btn" 
          @click="handleResendOTP"
          :disabled="isResending"
        >
          {{ isResending ? 'Sending...' : "Didn't receive code? Resend" }}
        </button>

        <button type="button" class="cancel-btn" @click="showOtpModal = false">
          Cancel
        </button>
      </div>
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
  gap: 1rem;
}

.form-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 0.5rem;
  align-items: center;
}

.forgot-link {
  color: #fb923c;
  font-size: 0.875rem;
  font-weight: 500;
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

.error-text {
  color: #ef4444;
  font-size: 0.875rem;
  text-align: center;
  margin-top: 0.5rem;
}

/* OTP Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}

.modal-content {
  background: var(--color-card);
  border-radius: 16px;
  padding: 2rem;
  max-width: 400px;
  width: 100%;
  text-align: center;
}

.modal-header h2 {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.modal-header p {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-bottom: 1.5rem;
}

.modal-header strong {
  color: white;
}

.otp-input-wrapper {
  margin-bottom: 1rem;
}

.otp-input {
  width: 100%;
  background: #27272a;
  border: 2px solid #3f3f46;
  border-radius: 12px;
  padding: 1rem;
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: 0.5rem;
  text-align: center;
  color: var(--color-primary);
  outline: none;
  transition: border-color 0.2s;
}

.otp-input:focus {
  border-color: var(--color-primary);
}

.otp-message {
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.otp-message.error {
  color: #ef4444;
}

.otp-message.success {
  color: #22c55e;
}

.modal-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.resend-btn, .cancel-btn {
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: color 0.2s;
}

.resend-btn:hover:not(:disabled), .cancel-btn:hover {
  color: var(--color-primary);
}

.resend-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cancel-btn {
  color: #ef4444;
}
</style>
