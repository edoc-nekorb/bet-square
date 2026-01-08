<script setup>
import { Bell, User, ChevronRight, LogOut, Link as LinkIcon, Building2, Palette, Clock, Trash2, Plus, ArrowLeft, ArrowRight, Copy, Banknote, Landmark, Lock } from 'lucide-vue-next';
import BottomNav from '../components/BottomNav.vue';
import AppButton from '../components/ui/AppButton.vue';
import AppModal from '../components/ui/AppModal.vue';
import { ref, onMounted, computed } from 'vue';
import { auth, payment } from '../services/api'; 
import { useAuth } from '../composables/useAuth';
import { useRouter } from 'vue-router';

const router = useRouter();
const { user: authUser, fetchUser, logout } = useAuth();

// Use computed to provide default values if authUser is null (e.g. before load)
const user = computed(() => authUser.value || {
    full_name: 'User',
    email: 'user@example.com',
    balance: '0.00',
    referral_code: ''
});

const referralStats = ref({ referredCount: 0, totalEarnings: 0 });
const showWithdrawModal = ref(false);
const withdrawForm = ref({ amount: '', bankName: '', accountNumber: '', accountName: '' });
const isWithdrawing = ref(false);

const isAddingFunds = ref(false);
const showFundModal = ref(false);
const fundAmount = ref(5000); // Default amount

const showPasswordModal = ref(false);
const passwordForm = ref({ current: '', new: '', confirm: '' });
const isChangingPassword = ref(false);

const transactions = ref([]);
const pagination = ref({ page: 1, totalPages: 1 });

const fetchProfile = async () => {
    await fetchUser();
};

const fetchTransactions = async (page = 1) => {
    try {
        const { data } = await payment.getHistory(page);
        transactions.value = data.data;
        pagination.value = data.pagination;
    } catch (e) {
        console.error('Failed to load transactions', e);
    }
};

const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.value.totalPages) {
        fetchTransactions(newPage);
    }
};

const openFundModal = () => {
    showFundModal.value = true;
};

const confirmAddFunds = async () => {
   const amount = parseFloat(fundAmount.value);
   if (isNaN(amount) || amount < 100) {
       alert("Minimum deposit is ₦100");
       return;
   }

   isAddingFunds.value = true;
   
   try {
       // 1. Initialize with backend
       const { data } = await payment.initialize(amount, user.value.email);
       
       // 2. Open Paystack
       const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
       if (!publicKey) {
           alert("Paystack Public Key not found in .env");
           isAddingFunds.value = false;
           return;
       }

       const handler = PaystackPop.setup({
           key: publicKey, 
           email: user.value.email,
           amount: amount * 100,
           ref: data.data.reference, 
           callback: function(transaction) {
               // 3. Verify on backend (using Promise syntax to be safe)
               payment.verify(transaction.reference)
                   .then(() => {
                       fetchProfile();
                       fetchTransactions(); // Refresh history
                       showFundModal.value = false;
                       alert('Payment Successful!');
                   })
                   .catch((e) => {
                       console.error("Verification error", e);
                       alert('Verification Failed');
                   });
           },
           onClose: function() {
               // alert('Payment Cancelled');
           }
       });
       handler.openIframe();
   } catch (e) {
       console.error('Payment Init Failed', e);
       alert('Failed to initialize payment');
   } finally {
       isAddingFunds.value = false;
   }
};

const handleLogout = () => {
    logout();
};

const fetchReferralStats = async () => {
    try {
        const { data } = await auth.getReferralStats();
        referralStats.value = data;
    } catch (e) { console.error(e); }
};

const copyReferralLink = async () => {
    // Determine origin (localhost or prod)
    const origin = window.location.origin;
    const link = `${origin}/signup?ref=${user.value.referral_code}`;
    try {
        await navigator.clipboard.writeText(link);
        alert('Referral link copied to clipboard!');
    } catch (e) {
        alert('Referral Link: ' + link);
    }
};

const openWithdrawModal = () => {
    withdrawForm.value = { amount: '', bankName: '', accountNumber: '', accountName: '' };
    showWithdrawModal.value = true;
};

const confirmWithdraw = async () => {
    const amt = parseFloat(withdrawForm.value.amount);
    if (!amt || amt < 1000) {
        alert('Minimum withdrawal is ₦1,000');
        return;
    }
    isWithdrawing.value = true;
    try {
        const { data } = await payment.withdraw({
            amount: amt,
            bankDetails: {
                bankName: withdrawForm.value.bankName,
                accountNumber: withdrawForm.value.accountNumber,
                accountName: withdrawForm.value.accountName
            }
        });
        alert(data.message);
        showWithdrawModal.value = false;
        fetchProfile(); // update balance
    } catch (e) {
        const msg = e.response?.data?.error || 'Withdrawal Failed';
        alert(msg);
    } finally {
        isWithdrawing.value = false;
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
    fetchTransactions();
    fetchReferralStats();
    
    // Load Paystack script dynamically if not present
    if (!window.PaystackPop) {
        const script = document.createElement('script');
        script.src = 'https://js.paystack.co/v1/inline.js';
        document.head.appendChild(script);
    }
});

const getStatusColor = (status) => {
    switch(status.toLowerCase()) {
        case 'success': return '#22c55e';
        case 'pending': return '#fb923c';
        case 'failed': return '#ef4444'; 
        default: return '#9ca3af';
    }
}

const isActivePlan = computed(() => {
    return user.value.plan && user.value.plan.toLowerCase() !== 'free';
});

const activePlanName = computed(() => {
    if (!user.value.plan || user.value.plan === 'free') return 'Free Plan';
    return user.value.plan.charAt(0).toUpperCase() + user.value.plan.slice(1);
});

const formattedExpiry = computed(() => {
    if (!user.value.plan_expires_at) return '';
    return new Date(user.value.plan_expires_at).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric'
    });
});
</script>

<template>
  <div class="page-container">
    <!-- Header -->
    <header class="profile-header">
       <h1>Profile & Settings</h1>
       <div class="user-card">
          <div class="avatar-wrap">
             <img :src="`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.full_name}`" alt="User" />
          </div>
          <div class="user-info">
             <h2>{{ user.full_name }}</h2>
             <p>{{ user.email }}</p>
          </div>
       </div>
    </header>

    <div class="content-scrollable">
       
       <!-- Subscription Status -->
       <section class="settings-group">
          <h3 class="group-title">Subscription</h3>
          <div class="setting-item">
             <div class="item-left">
                <Clock :size="20" class="item-icon green-text" />
                <div class="flex-col">
                    <span class="item-label">{{ activePlanName }}</span>
                    <span v-if="isActivePlan && user.plan_expires_at" class="expiry-text">
                        Expires: {{ formattedExpiry }}
                    </span>
                </div>
             </div>
             
             <div class="item-right">
                 <button v-if="!isActivePlan" @click="router.push('/pricing')" class="add-funds-btn">
                    Subscribe
                 </button>
                 <span v-else class="status-badge active-plan">Active</span>
             </div>
          </div>
       </section>

       <!-- Bonus / Referrals -->
       <section class="settings-group">
          <h3 class="group-title">Referrals & Bonus</h3>
          
          <div class="referral-card">
              <div class="ref-header">
                  <p class="ref-desc">Invite friends and earn <strong>5%</strong> of their subscription payments forever.</p>
                  <button class="copy-btn" @click="copyReferralLink">
                     <Copy :size="14" /> Copy Link
                  </button>
              </div>

              <div class="ref-stats-grid">
                  <div class="stat-box">
                      <span class="stat-label">Referred</span>
                      <span class="stat-val">{{ referralStats.referredCount }}</span>
                  </div>
                  <div class="stat-box">
                      <span class="stat-label">Total Earned</span>
                      <span class="stat-val">₦{{ referralStats.totalEarnings.toLocaleString() }}</span>
                  </div>
                  <div class="stat-box highlight">
                      <span class="stat-label">Wallet Balance</span>
                      <span class="stat-val">₦{{ parseFloat(user.balance).toLocaleString() }}</span>
                  </div>
              </div>

              <button class="withdraw-btn" @click="openWithdrawModal">
                  <Banknote :size="16" /> Request Withdrawal
              </button>
          </div>

          <!-- Existing Settings -->
          <div class="setting-item" style="margin-top: 1.5rem;">
             <div class="item-left">
                <Building2 :size="20" class="item-icon green-text" />
                <span class="item-label">Default Bookmaker</span>
             </div>
             <div class="item-right">
                <span class="value-text">SportyBet</span>
                <ChevronRight :size="16" class="chevron" />
             </div>
          </div>

          <div class="setting-item">
             <div class="item-left">
                <Palette :size="20" class="item-icon green-text" />
                <span class="item-label">Theme</span>
             </div>
             <div class="item-right">
                <span class="value-text">Dark</span>
                <div class="theme-toggle active">
                   <div class="thumb"></div>
                </div>
             </div>
          </div>
       </section>
       
       <!-- Security -->
       <section class="settings-group">
          <h3 class="group-title">Security</h3>
          <div class="setting-item" @click="openPasswordModal">
             <div class="item-left">
                <Lock :size="20" class="item-icon green-text" />
                <span class="item-label">Change Password</span>
             </div>
             <div class="item-right">
                <ChevronRight :size="16" class="chevron" />
             </div>
          </div>
       </section>
       
       <!-- Transaction History -->
       <section class="settings-group">
          <h3 class="group-title">Transaction History</h3>
          <div v-if="transactions.length === 0" class="no-history">
              <p>No transactions yet.</p>
          </div>
          <div v-else class="history-list">
             <div v-for="item in transactions" :key="item.id" class="history-card">
                <div class="h-header">
                   <h4 class="h-title">{{ item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : 'Transaction' }}</h4>
                   <span class="status-badge" :style="{ backgroundColor: getStatusColor(item.status) + '20', color: getStatusColor(item.status) }">
                      {{ item.status }}
                   </span>
                </div>
                <div class="h-meta">
                   {{ new Date(item.created_at).toLocaleString() }}
                </div>
                <div class="h-footer">
                   <span class="label">Amount:</span>
                   <span class="odds-val">₦{{ parseFloat(item.amount).toLocaleString() }}</span>
                </div>
             </div>
          </div>
          
          <!-- Pagination -->
           <div v-if="pagination.totalPages > 1" class="pagination-controls">
               <button 
                  class="page-btn" 
                  :disabled="pagination.page === 1"
                  @click="handlePageChange(pagination.page - 1)"
               >
                  <ArrowLeft :size="16" />
               </button>
               <span class="page-info">{{ pagination.page }} / {{ pagination.totalPages }}</span>
               <button 
                  class="page-btn" 
                  :disabled="pagination.page === pagination.totalPages"
                  @click="handlePageChange(pagination.page + 1)"
               >
                   <ArrowRight :size="16" />
               </button>
           </div>
       </section>

       <section class="settings-group">
           <AppButton variant="secondary" block @click="handleLogout">
              <LogOut :size="18" style="margin-right: 8px"/> Logout
           </AppButton>
       </section>

        <!-- Danger Zone -->
       <section class="danger-zone">
          <h3 class="danger-title">Danger Zone</h3>
          <p class="danger-desc">Deleting your account is a permanent action and cannot be undone.</p>
          <button class="delete-btn">
             <Trash2 :size="16" /> Delete account
          </button>
       </section>

    </div>

    <!-- Fund Modal -->
    <AppModal :isOpen="showFundModal" title="Add Funds" @close="showFundModal = false">
        <div class="fund-form">
            <label>Amount (₦)</label>
            <input 
                type="number" 
                v-model="fundAmount" 
                placeholder="Ex. 5000"
                class="fund-input"
                min="100"
            />
            <div class="quick-amounts">
                <button @click="fundAmount = 1000">₦1k</button>
                <button @click="fundAmount = 5000">₦5k</button>
                <button @click="fundAmount = 10000">₦10k</button>
            </div>
            
            <AppButton block variant="primary" @click="confirmAddFunds" :disabled="isAddingFunds">
                {{ isAddingFunds ? 'Processing...' : 'Fund Wallet' }}
            </AppButton>
        </div>
    </AppModal>

    <!-- Withdraw Modal -->
    <AppModal :isOpen="showWithdrawModal" title="Request Withdrawal" @close="showWithdrawModal = false">
        <div class="fund-form">
            <p style="font-size: 0.85rem; color: #a1a1aa; margin-bottom: 1rem;">
                Withdrawals are processed manually. Funds will be sent to the account provided below.
            </p>
            
            <div class="flex-col" style="gap: 0.5rem;">
                <label>Amount (₦)</label>
                <input type="number" v-model="withdrawForm.amount" class="fund-input" placeholder="Min 1000" />
            </div>

             <div class="flex-col" style="gap: 0.5rem;">
                <label>Bank Name</label>
                <input type="text" v-model="withdrawForm.bankName" class="fund-input" placeholder="e.g. GTBank" />
            </div>

             <div class="flex-col" style="gap: 0.5rem;">
                <label>Account Number</label>
                <input type="text" v-model="withdrawForm.accountNumber" class="fund-input" placeholder="0123456789" />
            </div>

             <div class="flex-col" style="gap: 0.5rem;">
                <label>Account Name</label>
                <input type="text" v-model="withdrawForm.accountName" class="fund-input" placeholder="John Doe" />
            </div>
            
            <AppButton block variant="primary" @click="confirmWithdraw" :disabled="isWithdrawing" style="margin-top: 1rem;">
                {{ isWithdrawing ? 'Processing...' : 'Submit Request' }}
            </AppButton>
        </div>
    </AppModal>

    <!-- Change Password Modal -->
    <AppModal :isOpen="showPasswordModal" title="Change Password" @close="showPasswordModal = false">
        <div class="fund-form">
             <div class="flex-col" style="gap: 0.5rem;">
                <label>Current Password</label>
                <input type="password" v-model="passwordForm.current" class="fund-input" placeholder="Current Password" />
            </div>

             <div class="flex-col" style="gap: 0.5rem;">
                <label>New Password</label>
                <input type="password" v-model="passwordForm.new" class="fund-input" placeholder="New Password (min 6 chars)" />
            </div>

             <div class="flex-col" style="gap: 0.5rem;">
                <label>Confirm Password</label>
                <input type="password" v-model="passwordForm.confirm" class="fund-input" placeholder="Confirm New Password" />
            </div>
            
            <AppButton block variant="primary" @click="handleChangePassword" :disabled="isChangingPassword" style="margin-top: 1rem;">
                {{ isChangingPassword ? 'Updating...' : 'Update Password' }}
            </AppButton>
        </div>
    </AppModal>

    <BottomNav />
  </div>
</template>

<style scoped>
.page-container {
  min-height: 100vh;
  background-color: var(--color-background);
  color: var(--color-text-primary);
  display: flex;
  flex-direction: column;
}

.profile-header {
  background-color: #17171e; /* Slightly lighter header */
  padding: 2rem 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.profile-header h1 {
  font-size: 1rem;
  font-weight: 600;
  width: 100%;
  text-align: center;
}

.user-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  background-color: #23232a;
  padding: 1.5rem;
  border-radius: 20px;
  width: 100%;
  text-align: center;
}

.avatar-wrap {
  position: relative;
  width: 64px;
  height: 64px;
}
.avatar-wrap img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background-color: #333;
}
.edit-badge {
  position: absolute;
  bottom: 0px;
  right: 0px;
  background-color: var(--color-primary);
  color: black;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #23232a;
}

.user-info h2 {
  font-size: 1.125rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}
.user-info p {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.content-scrollable {
  padding: 1.5rem 1.25rem 6rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.group-title {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.setting-item {
  background-color: var(--color-card);
  padding: 1rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  cursor: pointer;
}

.item-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.green-text { color: var(--color-primary); }

.item-label {
  font-weight: 600;
  font-size: 0.9375rem;
}

.chevron { color: var(--color-text-secondary); }

.item-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.value-text {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.theme-toggle {
  width: 40px;
  height: 22px;
  background-color: #3f3f46;
  border-radius: 11px;
  position: relative;
}
.theme-toggle.active {
  background-color: var(--color-primary);
}
.thumb {
  width: 18px;
  height: 18px;
  background-color: white;
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: transform 0.2s;
}
.theme-toggle.active .thumb {
  transform: translateX(18px);
}

/* History */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.history-card {
  background-color: var(--color-card);
  padding: 1rem;
  border-radius: 12px;
}

.h-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.h-title {
  font-size: 0.9375rem;
  font-weight: 600;
}

.status-badge {
  font-size: 0.7rem;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  font-weight: 600;
}

.h-meta {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.75rem;
}

.h-footer {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  border-top: 1px solid #2d2d35;
  padding-top: 0.5rem;
}

.odds-val {
  font-weight: 700;
  color: white;
}

/* Pagination */
.pagination-controls {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    margin-top: 1rem;
}
.page-btn {
    background-color: var(--color-card);
    border: none;
    color: white;
    padding: 0.5rem;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
}
.page-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
.page-info {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
}

.no-history {
    text-align: center;
    color: var(--color-text-secondary);
    padding: 1rem;
    font-size: 0.9rem;
}

/* Danger Zone */
.danger-zone {
  border: 1px solid #ef4444;
  border-radius: 16px;
  padding: 1.25rem;
  background-color: rgba(239, 68, 68, 0.05); /* faint red bg */
}

.danger-title {
  color: #ef4444;
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.danger-desc {
  color: #e4e4e7;
  font-size: 0.875rem;
  margin-bottom: 1rem;
  line-height: 1.4;
}

.delete-btn {
  width: 100%;
  background-color: #ef4444;
  color: white;
  padding: 0.75rem;
  border-radius: 8px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

/* Balance Styles */
.currency-symbol {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-primary);
}

.balance-amount {
  font-size: 1.25rem;
  font-weight: 700;
  color: white;
}

.add-funds-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background-color: var(--color-primary);
  color: black;
  font-weight: 600;
  font-size: 0.75rem;
  padding: 0.4rem 0.75rem;
  border-radius: 20px;
}

.balance-ok {
  background-color: rgba(34, 197, 94, 0.1);
  padding: 0.25rem 0.6rem;
  border-radius: 4px;
}


.ok-text {
  font-size: 0.75rem;
  color: #22c55e;
  font-weight: 600;
}

/* Fund Modal */
.fund-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}
.fund-form label {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    font-weight: 600;
}
.fund-input {
    background-color: #23232a;
    border: 1px solid #3f3f46;
    color: white;
    padding: 0.75rem;
    border-radius: 8px;
    font-size: 1.125rem;
    width: 100%;
}
.fund-input:focus {
    outline: none;
    border-color: var(--color-primary);
}
.quick-amounts {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
}
.quick-amounts button {
    background-color: #27272a;
    color: var(--color-text-secondary);
    border: 1px solid #3f3f46;
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s;
}
.quick-amounts button:hover {
    background-color: #3f3f46;
    color: white;
}
.quick-amounts button:hover {
    background-color: #3f3f46;
    color: white;
}

.flex-col {
    display: flex;
    flex-direction: column;
}
.expiry-text {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
}
.active-plan {
    font-size: 0.75rem;
    padding: 0.3rem 0.8rem;
    border-radius: 999px;
    font-weight: 600;
}


/* Referral Card Styles */
.referral-card {
    background-color: #23232a;
    border: 1px solid #3f3f46;
    border-radius: 12px;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}
.ref-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
}
.ref-desc {
    font-size: 0.85rem;
    color: #e4e4e7;
    line-height: 1.4;
    flex: 1;
}
.ref-desc strong { color: var(--color-primary); }
.copy-btn {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    background-color: #27272a;
    border: 1px solid #3f3f46;
    color: white;
    padding: 0.4rem 0.75rem;
    border-radius: 6px;
    font-size: 0.75rem;
    cursor: pointer;
    white-space: nowrap;
}
.copy-btn:hover { background-color: #3f3f46; }

.ref-stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
    background-color: #18181b;
    padding: 1rem;
    border-radius: 8px;
}
.stat-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
}
.stat-label {
    font-size: 0.7rem;
    color: #a1a1aa;
    text-transform: uppercase;
    margin-bottom: 0.25rem;
}
.stat-val {
    font-size: 1rem;
    font-weight: 700;
    color: white;
}
.stat-box.highlight .stat-val { color: var(--color-primary); }

.withdraw-btn {
    width: 100%;
    background-color: var(--color-primary);
    color: black;
    border: none;
    padding: 0.75rem;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    cursor: pointer;
}
.withdraw-btn:hover { opacity: 0.9; }
</style>
