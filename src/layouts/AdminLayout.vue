<script setup>
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  CreditCard, 
  LogOut,
  Settings,
  Menu,
  X,
  Shield,
  Crown,
  Bell
} from 'lucide-vue-next';
import { ref } from 'vue';
import { RouterView, RouterLink, useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const isSidebarOpen = ref(false);

const navItems = [
  { name: 'Dashboard', path: '/admin', icon: LayoutDashboard, exact: true },
  { name: 'Users', path: '/admin/users', icon: Users, exact: false },
  { name: 'Content', path: '/admin/content', icon: FileText, exact: false },
  { name: 'Clubs', path: '/admin/clubs', icon: Shield, exact: false },
  { name: 'Leagues', path: '/admin/leagues', icon: Crown, exact: false },
  { name: 'Transactions / Withdrawals', path: '/admin/transactions', icon: CreditCard, exact: false },
  { name: 'Plans', path: '/admin/plans', icon: Crown, exact: false },
  { name: 'Notifications', path: '/admin/notifications', icon: Bell, exact: false },
];

import { auth } from '@/services/api';

const handleLogout = () => {
    auth.logout();
    window.location.href = '/login';
};

const isActive = (item) => {
    if (item.exact) {
        return route.path === item.path;
    }
    return route.path.startsWith(item.path);
};

const toggleSidebar = () => {
    isSidebarOpen.value = !isSidebarOpen.value;
};

const closeSidebar = () => {
    isSidebarOpen.value = false;
};
</script>

<template>
  <div class="admin-layout">
    <!-- Mobile Header -->
    <header class="mobile-header">
       <button @click="toggleSidebar" class="menu-btn">
          <Menu :size="24" color="white" />
       </button>
       <span class="mobile-title">Admin Panel</span>
       <div class="avatar-sm">AD</div>
    </header>

    <!-- Sidebar Overlay -->
    <div class="sidebar-overlay" :class="{ open: isSidebarOpen }" @click="closeSidebar"></div>

    <!-- Sidebar -->
    <aside class="sidebar" :class="{ open: isSidebarOpen }">
      <div class="sidebar-header">
         <div class="logo-row">
            <svg width="24" height="24" viewBox="0 0 100 100" fill="none">
               <rect width="100" height="100" rx="30" fill="#22C55E"/>
               <rect x="35" y="35" width="30" height="30" rx="6" stroke="black" stroke-width="8"/>
            </svg>
            <span class="logo-text">Admin Panel</span>
         </div>
         <button class="close-btn" @click="closeSidebar">
            <X :size="24" />
         </button>
      </div>

      <nav class="sidebar-nav">
        <RouterLink 
          v-for="item in navItems" 
          :key="item.path" 
          :to="item.path"
          class="nav-item"
          :class="{ active: isActive(item) }"
          @click="closeSidebar"
        >
          <component :is="item.icon" :size="20" />
          <span>{{ item.name }}</span>
        </RouterLink>
      </nav>

      <div class="sidebar-footer">
        <button class="nav-item logout-btn" @click="handleLogout">
          <LogOut :size="20" />
          <span>Logout</span>
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
       <header class="top-bar">
          <h2 class="page-title">{{ route.meta.title || 'Dashboard' }}</h2>
          <div class="admin-profile" @click="router.push('/admin/profile')" style="cursor: pointer;">
             <div class="admin-info">
                <span class="admin-name">Administrator</span>
                <span class="admin-role">Super User</span>
             </div>
             <div class="avatar">AD</div>
          </div>
       </header>
       
       <div class="page-body">
          <RouterView />
       </div>
    </main>
  </div>
</template>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100dvh;
  background-color: #18181b;
  color: #e4e4e7;
}

/* Mobile Header */
.mobile-header {
    display: none;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    background-color: var(--color-background);
    border-bottom: 1px solid #27272a;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 40;
}
.mobile-title {
    font-weight: 700;
    color: white;
    font-size: 1.125rem;
}
.menu-btn {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: white;
}
.avatar-sm {
    width: 32px;
    height: 32px;
    background-color: #27272a;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 700;
    color: white;
    border: 1px solid #3f3f46;
}

/* Sidebar */
.sidebar {
  width: 260px;
  background-color: var(--color-background);
  border-right: 1px solid #27272a;
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100dvh;
  z-index: 50;
  transition: transform 0.3s ease;
}

.sidebar-header {
  padding: 1.5rem;
  border-bottom: 1px solid #27272a;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.close-btn {
    display: none;
    background: none;
    border: none;
    color: var(--color-text-secondary);
    cursor: pointer;
}

.logo-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-text {
  font-weight: 700;
  font-size: 1.125rem;
  color: white;
}

.sidebar-nav {
  padding: 1rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  color: var(--color-text-secondary);
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s;
  border: none;
  background: none;
  width: 100%;
  cursor: pointer;
  font-size: 0.9375rem;
}

.nav-item:hover {
  background-color: #27272a;
  color: white;
}

.nav-item.active {
  background-color: rgba(34, 197, 94, 0.1);
  color: var(--color-primary);
}

.sidebar-footer {
  padding: 1rem;
  border-top: 1px solid #27272a;
}

.logout-btn {
  color: #ef4444;
}
.logout-btn:hover {
  background-color: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

/* Overlay */
.sidebar-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background-color: rgba(0,0,0,0.5);
    z-index: 45;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
}

/* Main Content */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%; /* Ensure it doesn't overflow parent */
  min-width: 0; /* Content truncation fix */
}

.top-bar {
  height: 4rem;
  background-color: var(--color-background);
  border-bottom: 1px solid #27272a;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
}

.page-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: white;
}

.admin-profile {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.admin-info {
  text-align: right;
  display: flex;
  flex-direction: column;
}

.admin-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: white;
}

.admin-role {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.avatar {
  width: 40px;
  height: 40px;
  background-color: #27272a;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: white;
  border: 1px solid #3f3f46;
}

.page-body {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
}

/* Mobile Responsive */
@media (max-width: 768px) {
    .sidebar {
        position: fixed;
        left: 0;
        top: 0;
        bottom: 0;
        transform: translateX(-100%);
        width: 280px;
    }
    .sidebar.open {
        transform: translateX(0);
        box-shadow: 10px 0 25px -5px rgba(0, 0, 0, 0.5);
    }

    .sidebar-overlay {
        display: block;
    }
    .sidebar-overlay.open {
        opacity: 1;
        pointer-events: auto;
    }

    .close-btn {
        display: block;
    }

    .mobile-header {
        display: flex;
    }

    .top-bar {
        display: none; /* Hide Desktop Top Bar */
    }

    .main-content {
        padding-top: 60px; /* Space for mobile header */
    }

    .page-body {
        padding: 1rem;
    }
}
</style>
