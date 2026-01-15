<script setup>
import { ref, onMounted, computed } from 'vue';
import { Pencil, Trash2, Search, X, Check } from 'lucide-vue-next';
import { admin } from '../../services/api';
import { useToast } from '@/composables/useToast';

const { success, error } = useToast();

const users = ref([]);
const availablePlans = ref([]);
const searchQuery = ref('');
const showModal = ref(false);
const editingUser = ref(null);
const isLoading = ref(false);

const userForm = ref({
    name: '',
    email: '',
    role: 'user',
    plan: 'free',
    status: 'Active',
    password: '' // Only for new users
});

const fetchUsers = async () => {
    try {
        const { data } = await admin.getUsers();
        users.value = data;
    } catch (err) {
        console.error('Failed to fetch users', err);
    }
};

const fetchPlans = async () => {
    try {
        const { data } = await admin.getPlans();
        availablePlans.value = data;
    } catch (err) {
        console.error('Failed to fetch plans', err);
    }
};

const openEditModal = (user) => {
    editingUser.value = user;
    userForm.value = { ...user, password: '' };
    showModal.value = true;
};

const openAddModal = () => {
    editingUser.value = null;
    userForm.value = {
        name: '',
        email: '',
        role: 'user',
        plan: 'free',
        status: 'Active',
        password: ''
    };
    showModal.value = true;
};

const saveUser = async () => {
    isLoading.value = true;
    try {
        if (editingUser.value) {
            await admin.updateUser(editingUser.value.id, userForm.value);
            success('User updated successfully');
        } else {
            await admin.createUser(userForm.value);
            success('User created successfully');
        }
        await fetchUsers();
        showModal.value = false;
    } catch (err) {
        error(err.response?.data?.error || 'Operation failed');
    } finally {
        isLoading.value = false;
    }
};

const confirmDelete = async (user) => {
    if (!confirm(`Are you sure you want to delete ${user.name}?`)) return;
    try {
        await admin.deleteUser(user.id);
        success('User deleted successfully');
        await fetchUsers();
    } catch (err) {
        error(err.response?.data?.error || 'Failed to delete user');
    }
};

const filteredUsers = computed(() => {
    if (!searchQuery.value) return users.value;
    const lower = searchQuery.value.toLowerCase();
    return users.value.filter(u => 
        u.name.toLowerCase().includes(lower) || 
        u.email.toLowerCase().includes(lower)
    );
});

const getStatusColor = (status) => {
   if (status === 'Active') return 'text-green-400 bg-green-400/10';
   if (status === 'Suspended') return 'text-red-400 bg-red-400/10';
   return 'text-gray-400 bg-gray-400/10';
};

onMounted(() => {
    fetchUsers();
    fetchPlans();
});
</script>

<template>
  <div class="page-container">
     <div class="actions-bar">
        <div class="search-input">
           <Search :size="18" class="search-icon" />
           <input type="text" v-model="searchQuery" placeholder="Search users..." />
        </div>
         <button class="btn-primary" @click="openAddModal">Add User</button>
     </div>

     <div class="table-container">
        <table class="data-table">
           <thead>
              <tr>
                 <th>User</th>
                 <th>Plan</th>
                 <th>Status</th>
                 <th>Joined</th>
                 <th>Actions</th>
              </tr>
           </thead>
           <tbody>
              <tr v-for="user in users" :key="user.id">
                 <td>
                    <div class="user-cell">
                       <div class="avatar-cell">{{ user.name.charAt(0) }}</div>
                       <div>
                          <div class="font-bold">{{ user.name }}</div>
                          <div class="text-sm text-gray-500">{{ user.email }}</div>
                       </div>
                    </div>
                 </td>
                 <td>{{ user.plan }}</td>
                 <td>
                    <span class="status-badge" :class="getStatusColor(user.status)">
                       {{ user.status }}
                    </span>
                 </td>
                 <td>{{ user.joined }}</td>
                 <td>
                    <div class="action-buttons">
                       <button class="btn-icon" @click="openEditModal(user)"><Pencil :size="16" /></button>
                       <button class="btn-icon delete" @click="confirmDelete(user)"><Trash2 :size="16" /></button>
                    </div>
                 </td>
              </tr>
           </tbody>
        </table>
     </div>
  </div>

  <!-- User Modal -->
  <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal-content">
          <div class="modal-header">
              <h3>{{ editingUser ? 'Edit User' : 'Add User' }}</h3>
              <button class="close-btn" @click="showModal = false"><X :size="20" /></button>
          </div>
          
          <div class="modal-body">
              <div class="form-group">
                  <label>Full Name</label>
                  <input v-model="userForm.name" type="text" placeholder="John Doe" />
              </div>
              <div class="form-group">
                  <label>Email</label>
                  <input v-model="userForm.email" type="email" placeholder="john@example.com" />
              </div>
               <div class="form-group" v-if="!editingUser">
                  <label>Password</label>
                  <input v-model="userForm.password" type="password" placeholder="******" />
              </div>
              <div class="row">
                  <div class="form-group">
                      <label>Role</label>
                      <select v-model="userForm.role">
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                      </select>
                  </div>
                  <div class="form-group">
                      <label>Plan</label>
                      <select v-model="userForm.plan">
                          <option value="free">Free</option>
                          <option v-for="plan in availablePlans" :key="plan.id" :value="plan.name">
                              {{ plan.name }} ({{ plan.duration_days }} days)
                          </option>
                      </select>
                  </div>
                   <div class="form-group">
                      <label>Status</label>
                      <select v-model="userForm.status">
                          <option value="Active">Active</option>
                          <option value="Suspended">Suspended</option>
                      </select>
                  </div>
              </div>
          </div>
          
          <div class="modal-footer">
              <button class="btn-secondary" @click="showModal = false">Cancel</button>
              <button class="btn-primary" @click="saveUser" :disabled="isLoading">
                  {{ isLoading ? 'Saving...' : 'Save User' }}
              </button>
          </div>
      </div>
  </div>
</template>

<style scoped>
.page-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.actions-bar {
   display: flex;
   justify-content: space-between;
}

.search-input {
   background-color: var(--color-card);
   border: 1px solid #27272a;
   border-radius: 8px;
   padding: 0.6rem 1rem;
   display: flex;
   align-items: center;
   gap: 0.75rem;
   width: 300px;
}
.search-input input {
   background: transparent;
   border: none;
   color: white;
   width: 100%;
   outline: none;
}
.search-icon { color: var(--color-text-secondary); }

.table-container {
   background-color: var(--color-card);
   border-radius: 12px;
   overflow: hidden;
   border: 1px solid #27272a;
   overflow-x: auto; /* Enable horizontal scroll */
}

.data-table {
   width: 100%;
   border-collapse: collapse;
   text-align: left;
}

.data-table th, .data-table td {
   padding: 1rem 1.5rem;
}

.data-table th {
   background-color: rgba(255, 255, 255, 0.02);
   color: var(--color-text-secondary);
   font-weight: 600;
   font-size: 0.875rem;
   border-bottom: 1px solid #27272a;
}

.data-table td {
   border-bottom: 1px solid #27272a;
   color: #e4e4e7;
   font-size: 0.9375rem;
}
.data-table tr:last-child td { border-bottom: none; }

.user-cell {
   display: flex;
   align-items: center;
   gap: 1rem;
}
.avatar-cell {
   width: 32px;
   height: 32px;
   background-color: #27272a;
   border-radius: 50%;
   display: flex;
   align-items: center;
   justify-content: center;
   font-weight: 700;
   color: white;
}
.text-sm { font-size: 0.8rem; }
.text-gray-500 { color: #a1a1aa; }

.status-badge {
   font-size: 0.75rem;
   padding: 0.25rem 0.75rem;
   border-radius: 9999px;
   font-weight: 600;
}
.bg-green-400\/10 { background-color: rgba(74, 222, 128, 0.1); }
.text-green-400 { color: #4ade80; }
.bg-red-400\/10 { background-color: rgba(248, 113, 113, 0.1); }
.text-red-400 { color: #f87171; }
.bg-gray-400\/10 { background-color: rgba(156, 163, 175, 0.1); }
.text-gray-400 { color: #9ca3af; }

.action-buttons {
   display: flex;
   gap: 0.5rem;
}
.btn-icon {
   width: 32px;
   height: 32px;
   border-radius: 6px;
   display: flex;
   align-items: center;
   justify-content: center;
   color: var(--color-text-secondary);
   transition: all 0.2s;
}
.btn-icon:hover {
   background-color: #27272a;
   color: white;
}
.btn-icon.delete:hover {
   background-color: rgba(239, 68, 68, 0.1);
   color: #ef4444;
}

/* Modal Styles */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    backdrop-filter: blur(4px);
}
.modal-content {
    background: var(--color-card);
    width: 100%;
    max-width: 500px;
    border-radius: 12px;
    border: 1px solid #27272a;
    overflow: hidden;
}
.modal-header {
    padding: 1.25rem;
    border-bottom: 1px solid #27272a;
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.modal-header h3 { font-size: 1.1rem; font-weight: 600; }
.close-btn { background: none; border: none; color: #a1a1aa; cursor: pointer; }
.close-btn:hover { color: white; }

.modal-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }

.form-group { display: flex; flex-direction: column; gap: 0.5rem; }
.form-group label { font-size: 0.85rem; color: #a1a1aa; }
.form-group input, .form-group select {
    background: #18181b;
    border: 1px solid #27272a;
    padding: 0.75rem;
    border-radius: 8px;
    color: white;
    outline: none;
}
.form-group input:focus, .form-group select:focus { border-color: var(--color-primary); }

.row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; }

.modal-footer {
    padding: 1.25rem;
    border-top: 1px solid #27272a;
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
}
.btn-primary {
    background: var(--color-primary);
    color: black;
    padding: 0.6rem 1.2rem;
    border-radius: 8px;
    font-weight: 600;
}
.btn-secondary {
    background: transparent;
    color: #a1a1aa;
    padding: 0.6rem 1.2rem;
    border-radius: 8px;
}
.btn-secondary:hover { color: white; }
</style>
