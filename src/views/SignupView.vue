<script setup>
import { ref } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import AppButton from '../components/ui/AppButton.vue';
import AppInput from '../components/ui/AppInput.vue';
import { auth } from '../services/api';

const router = useRouter();
const firstName = ref('');
const lastName = ref('');
const username = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const errorMsg = ref('');
const isLoading = ref(false);

// OTP Modal state
const showOtpModal = ref(false);
const otpCode = ref('');
const otpError = ref('');
const isVerifying = ref(false);
const isResending = ref(false);
const pendingEmail = ref('');

const handleSignup = async () => {
  errorMsg.value = '';
  
  // Validate passwords match
  if (password.value !== confirmPassword.value) {
    errorMsg.value = 'Passwords do not match';
    return;
  }
  
  // Validate password length
  if (password.value.length < 6) {
    errorMsg.value = 'Password must be at least 6 characters';
    return;
  }
  
  isLoading.value = true;

  try {
    const response = await auth.signup({
      email: email.value,
      password: password.value,
      firstName: firstName.value,
      lastName: lastName.value,
      username: username.value
    });
    
    // Show OTP modal if verification required
    if (response.data.requiresVerification) {
      pendingEmail.value = response.data.email;
      showOtpModal.value = true;
    } else {
      router.push('/login');
    }
  } catch (error) {
    errorMsg.value = error.response?.data?.error || 'Signup failed';
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
    router.push('/login');
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
      <h1>Create Your Account</h1>
      <p class="subtitle">Join the community and smart-build your tickets.</p>
    </div>

    <form @submit.prevent="handleSignup" class="auth-form">
      <AppInput 
        v-model="email" 
        label="Email Address" 
        placeholder="Enter your email"
        id="email"
        type="email"
      />
      
      <AppInput 
        v-model="username" 
        label="Username" 
        placeholder="Choose a unique username"
        id="username"
      />
      <p class="field-hint">4-20 characters, letters, numbers, underscore only</p>
      
      <div class="name-row">
        <AppInput 
          v-model="firstName" 
          label="First Name" 
          placeholder="First name"
          id="first-name"
        />
        <AppInput 
          v-model="lastName" 
          label="Last Name" 
          placeholder="Last name"
          id="last-name"
        />
      </div>

      <AppInput 
        v-model="password" 
        label="Password" 
        type="password"
        placeholder="Create a password (min 6 chars)"
        id="password"
      />
      
      <AppInput 
        v-model="confirmPassword" 
        label="Confirm Password" 
        type="password"
        placeholder="Confirm your password"
        id="confirm-password"
      />

      <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

      <div class="form-actions">
        <AppButton variant="primary" block type="submit" :disabled="isLoading">
          {{ isLoading ? 'Creating Account...' : 'Sign Up' }}
        </AppButton>
      </div>
    </form>

    <div class="auth-footer">
      <p>Already have an account? <RouterLink to="/login" class="link-highlight">Sign In</RouterLink></p>
    </div>
  </div>

  <!-- OTP Verification Modal -->
  <div v-if="showOtpModal" class="modal-overlay">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Verify Your Email</h2>
        <p>We sent a 6-digit code to <strong>{{ pendingEmail }}</strong></p>
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
          {{ isVerifying ? 'Verifying...' : 'Verify Email' }}
        </AppButton>
        
        <button 
          type="button" 
          class="resend-btn" 
          @click="handleResendOTP"
          :disabled="isResending"
        >
          {{ isResending ? 'Sending...' : "Didn't receive code? Resend" }}
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
  margin-top: 1rem;
  text-align: center;
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.logo-box {
  width: 48px;
  height: 48px;
  background: rgba(34, 197, 94, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  border: 1px solid var(--color-primary);
}

h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  max-width: 280px;
  line-height: 1.4;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.name-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.field-hint {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-top: -0.5rem;
  margin-bottom: 0.5rem;
  padding-left: 0.25rem;
}

.error-msg {
  color: #ef4444;
  font-size: 0.875rem;
  text-align: center;
  margin-top: 0.5rem;
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
  gap: 1rem;
}

.resend-btn {
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: color 0.2s;
}

.resend-btn:hover:not(:disabled) {
  color: var(--color-primary);
}

.resend-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
