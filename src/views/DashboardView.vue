<template>
  <div v-if="profileStore.loading || !displayName" class="dashboard-spinner">
    <span class="spinner"></span>
  </div>
  <div v-else class="dashboard-home">
    <h1>Welcome{{ displayName ? `, ${displayName}` : '' }}!</h1>
    <p class="dashboard-welcome-msg">Check out your important stats!</p>
    <div class="dashboard-stats">
      <div class="stat-card">
        <div class="stat-label">Total Goals</div>
        <div class="stat-value">{{ stats.goals }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Milestones</div>
        <div class="stat-value">{{ stats.milestones }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Matches</div>
        <div class="stat-value">{{ stats.matches }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Messages</div>
        <div class="stat-value">{{ stats.messages }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useProfileStore } from '../stores/profile';

const auth = useAuthStore();
const profileStore = useProfileStore();

const displayName = computed(() => {
  const profile = profileStore.profile;
  return profile?.displayname?.trim() || auth.user?.username || '';
});

const stats = ref({
  goals: 0,
  milestones: 0,
  matches: 0,
  messages: 0,
});

onMounted(async () => {
// TODO: fetch states
  await profileStore.fetchProfile();
  const profile = profileStore.profile;
  stats.value.goals = profile?.goals?.length || 0;
  stats.value.milestones = profile?.milestones?.length || 0;
  stats.value.matches = profile?.matches?.length || 0;
  stats.value.messages = profile?.messages?.length || 0;
});
</script>

<style scoped>
.dashboard-home {
  max-width: 700px;
  margin: 2.5rem auto;
  background: #fff;
  border-radius: 16px;
  padding: 2.5rem 3.5rem 2.2rem 3.5rem;
  text-align: center;
}
.dashboard-home h1 {
  color: var(--color-primary);
  font-size: 2.2rem;
  margin-bottom: 1.2rem;
}
.dashboard-welcome-msg {
  color: #555;
  font-size: 1.15rem;
  margin-bottom: 2.2rem;
}
.dashboard-stats {
  display: flex;
  justify-content: center;
  gap: 2.2rem;
  margin-bottom: 2.5rem;
  flex-wrap: wrap;
}
.stat-card {
  background: #f7fafd;
  border-radius: 10px;
  padding: 1.2rem 2.2rem;
  min-width: 120px;
}
.stat-label {
  color: var(--color-primary);
  font-weight: 600;
  margin-bottom: 0.5em;
}
.stat-value {
  font-size: 1.7rem;
  font-weight: 700;
  color: #222;
}
/* Spinner styles */
.dashboard-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60vh;
}
.spinner {
  width: 48px;
  height: 48px;
  border: 6px solid #e3e8f0;
  border-top: 6px solid var(--color-primary, #106cb8);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  display: inline-block;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
