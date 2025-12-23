<script setup>
import { House, ArrowRightLeft, Grid2X2, BookOpen, User } from 'lucide-vue-next'
import { computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'

const route = useRoute()

const navItems = [
  { name: 'Home', path: '/dashboard', icon: House },
  { name: 'Convert', path: '/convert', icon: ArrowRightLeft },
  { name: 'Split', path: '/split', icon: Grid2X2 },
  { name: 'Insight', path: '/book', icon: BookOpen },
  { name: 'Profile', path: '/profile', icon: User },
]

const isActive = (path) => {
    return route.path === path;
}
</script>

<template>
  <nav class="bottom-nav">
    <RouterLink 
      v-for="item in navItems" 
      :key="item.name" 
      :to="item.path"
      class="nav-item"
      :class="{ 'active': isActive(item.path) }"
    >
      <component :is="item.icon" :size="24" />
      <span class="nav-label">{{ item.name }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  background-color: #000000;
  display: flex;
  justify-content: space-around;
  padding: 1rem 0.5rem;
  border-top: 1px solid var(--color-border);
  z-index: 50;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  color: #71717a; /* Zinc 500 */
  font-size: 0.75rem;
  width: 100%;
  text-decoration: none;
  transition: color var(--transition-fast);
}

.nav-item.active {
  color: var(--color-primary);
}

.nav-label {
  font-weight: 500;
}
</style>
