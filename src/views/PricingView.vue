<script setup>
import { ref, onMounted } from 'vue';
import api, { payment } from '../services/api';
import { Check, ArrowLeft } from 'lucide-vue-next';
import { useRouter } from 'vue-router';

const router = useRouter();
const plans = ref([]);
const isLoading = ref(false);
const user = ref(JSON.parse(localStorage.getItem('user') || '{}'));

const features = [
    'Unlimited Smart Split Generation',
    'Full access to Daily Predictions',
    'Premium Expert Insights',
    'Ad-free experience',
    'Priority Support'
];

const fetchPlans = async () => {
    isLoading.value = true;
    try {
        // Fetch plans from payment endpoint which is accessible to authenticated users
        const { data } = await api.get('/payment/plans'); 
        plans.value = data;
    } catch (err) {
        console.error('Failed to fetch plans');
    } finally {
        isLoading.value = false;
    }
};

const subscribe = async (plan) => {
    try {
        isLoading.value = true;
        
        // Store plan ID for verification after redirect
        localStorage.setItem('pending_plan_id', plan.id);

        const { data: initData } = await payment.initialize(plan.price, user.value.email);
        
        if (initData && initData.data && initData.data.authorization_url) {
            window.location.href = initData.data.authorization_url;
        } else {
            throw new Error('No authorization URL returned');
        }
    } catch (err) {
        console.error(err);
        alert('Failed to initialize payment');
        isLoading.value = false;
    }
};

onMounted(fetchPlans);
</script>

<template>
    <div class="pricing-page">
        <button class="back-btn" @click="router.back()">
            <ArrowLeft :size="24" />
        </button>

        <div class="header">
            <h1>Upgrade Your Game</h1>
            <p>Access premium predictions and smart splitting tools.</p>
        </div>

        <div class="plans-grid">
            <div v-for="plan in plans" :key="plan.id" class="plan-card">
                <div class="plan-header">
                    <h3>{{ plan.name }}</h3>
                    <div class="price">
                        <span class="currency">₦</span>
                        <span class="amount">{{ parseFloat(plan.price).toLocaleString() }}</span>
                        <span class="period">/{{ plan.duration_days }}d</span>
                    </div>
                    <p class="desc">{{ plan.description }}</p>
                </div>
                
                <ul class="features">
                    <li v-for="feature in features" :key="feature">
                        <Check :size="16" class="check-icon" /> {{ feature }}
                    </li>
                </ul>

                <button @click="subscribe(plan)" class="subscribe-btn" :disabled="isLoading">
                    {{ isLoading ? 'Processing...' : 'Subscribe Now' }}
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.pricing-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    color: white;
    position: relative;
}

.back-btn {
    position: absolute;
    top: 2rem;
    left: 1rem;
    background: none;
    border: none;
    color: #a1a1aa;
    cursor: pointer;
    transition: color 0.2s;
    padding: 0.5rem;
}

.back-btn:hover {
    color: white;
}

.header {
    text-align: center;
    margin-bottom: 3rem;
}
.header h1 {
    font-size: 2.5rem;
    font-weight: 800;
    margin-bottom: 1rem;
    background: linear-gradient(to right, #4ade80, #22c55e);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}
.header p {
    color: #a1a1aa;
    font-size: 1.125rem;
}

.plans-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    justify-content: center;
}

.plan-card {
    background: #18181b;
    border: 1px solid #27272a;
    border-radius: 16px;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    transition: transform 0.2s, box-shadow 0.2s;
}
.plan-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 30px -10px rgba(34, 197, 94, 0.2);
    border-color: var(--color-primary);
}

.plan-header {
    text-align: center;
    margin-bottom: 2rem;
    padding-bottom: 2rem;
    border-bottom: 1px solid #27272a;
}
.plan-header h3 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 1rem;
}
.price {
    display: flex;
    align-items: baseline;
    justify-content: center;
    margin-bottom: 1rem;
}
.currency { font-size: 1.5rem; color: #a1a1aa; }
.amount { font-size: 3rem; font-weight: 800; color: white; }
.period { color: #a1a1aa; margin-left: 0.25rem; }
.desc { color: #a1a1aa; font-size: 0.875rem; }

.features {
    list-style: none;
    padding: 0;
    margin: 0 0 2rem 0;
    flex: 1;
}
.features li {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
    color: #e4e4e7;
}
.check-icon {
    color: var(--color-primary);
    flex-shrink: 0;
}

.subscribe-btn {
    width: 100%;
    padding: 1rem;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    transition: background 0.2s;
}
.subscribe-btn:hover {
    background: #16a34a;
}
.subscribe-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

@media (max-width: 768px) {
    .pricing-page {
        padding: 1rem;
    }
    .header h1 {
        font-size: 1.8rem;
        margin-top: 2rem; /* Make room for back button if needed */
    }
    .header p {
        font-size: 1rem;
    }
    .back-btn {
        top: 1rem;
        left: 0.5rem;
    }
    .plan-card {
        padding: 1.5rem;
    }
    .amount {
        font-size: 2.5rem;
    }
}
</style>
