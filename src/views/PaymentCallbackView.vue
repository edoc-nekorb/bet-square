<script setup>
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { payment } from '../services/api';

const route = useRoute();
const router = useRouter();
const status = ref('verifying'); // verifying, success, error
const errorMessage = ref('');

onMounted(async () => {
    const reference = route.query.reference || route.query.trxref;
    const planId = localStorage.getItem('pending_plan_id');

    if (!reference) {
        status.value = 'error';
        errorMessage.value = 'No transaction reference found.';
        return;
    }

    try {
        console.log('Verifying payment...', { reference, planId });
        
        if (planId) {
            // Subscription Payment
            await payment.verifySubscription(reference, planId);
            localStorage.removeItem('pending_plan_id'); // Clear it
            status.value = 'success';
            setTimeout(() => {
                router.push('/dashboard');
            }, 2000);
        } else {
            // General Funding (if applicable)
             status.value = 'error';
             errorMessage.value = 'Unknown payment type (no plan ID).';
        }

    } catch (err) {
        console.error(err);
        status.value = 'error';
        errorMessage.value = err.response?.data?.error || 'Payment verification failed.';
    }
});
</script>

<template>
    <div class="callback-page">
        <div class="card">
            <h2 v-if="status === 'verifying'">Verifying Payment...</h2>
            <div v-if="status === 'verifying'" class="spinner"></div>

            <h2 v-if="status === 'success'" class="green">Payment Successful!</h2>
            <p v-if="status === 'success'">Redirecting you to dashboard...</p>

            <h2 v-if="status === 'error'" class="red">Verification Failed</h2>
            <p v-if="status === 'error'">{{ errorMessage }}</p>
            <button v-if="status === 'error'" @click="router.push('/pricing')" class="btn">Return to Pricing</button>
        </div>
    </div>
</template>

<style scoped>
.callback-page {
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    color: white;
    padding: 2rem;
}
.card {
    background: #18181b;
    padding: 3rem;
    border-radius: 16px;
    text-align: center;
    max-width: 400px;
    width: 100%;
}
.spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #eee;
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 2rem auto;
}
@keyframes spin {
    to { transform: rotate(360deg); }
}
.green { color: #22c55e; }
.red { color: #ef4444; }
.btn {
    margin-top: 1rem;
    padding: 0.75rem 1.5rem;
    background: #27272a;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
}
</style>
