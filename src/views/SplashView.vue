<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

onMounted(() => {
  setTimeout(() => {
    router.push('/login');
  }, 2500); // Redirect after 2.5 seconds
});
</script>

<template>
  <div class="splash-container">
    <div class="logo-wrapper">
      <!-- Simple Green Square Logo using CSS/SVG -->
      <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="30" fill="#22C55E"/>
        <rect x="35" y="35" width="30" height="30" rx="6" stroke="black" stroke-width="4"/>
        <circle cx="50" cy="50" r="3" fill="black"/>
      </svg>
      <h1 class="brand-name">Bet Square</h1>
    </div>
  </div>
</template>

<style scoped>
.splash-container {
  height: 100vh;
  width: 100%;
  background-color: #000000;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}

.logo-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  animation: pulse-entry 1s ease-out;
}

.brand-name {
  color: white;
  font-size: 1.5rem;
  font-weight: 700;
}

@keyframes pulse-entry {
  0% {
    opacity: 0;
    transform: scale(0.8);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
