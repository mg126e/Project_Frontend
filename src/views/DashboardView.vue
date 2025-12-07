<template>
  <div v-if="profileStore.loading || !displayName" class="dashboard-spinner">
    <span class="spinner"></span>
  </div>
  <div v-else class="dashboard-home">
    <h1 class="fade-in">{{ greeting }}{{ displayName ? `, ${displayName}` : '' }}!</h1>
    <p v-if="welcomeMessageVisible" class="dashboard-welcome-msg fade-in">{{ stats.matches === 0 ? 'Ready to get started?' : 'Ready to continue your great work?' }}</p>
    <div class="dashboard-stats">
      <div class="stat-card" :class="{ 'card-visible': cardsVisible }" style="animation-delay: 0.1s">
        <div class="stat-label">Matches</div>
        <div class="stat-value">{{ animatedStats.matches }}</div>
        <div v-if="stats.matches === 0" class="stat-hint">
          <router-link to="/matches" class="stat-cta">Find a running partner</router-link>
      </div>
      </div>
      <div v-if="stats.matches > 0" class="stat-card" :class="{ 'card-visible': cardsVisible }" style="animation-delay: 0.2s">
        <div class="stat-label">Total Goals</div>
        <div class="stat-value">{{ animatedStats.goals }}</div>
        <div v-if="stats.goals === 0" class="stat-hint">
          <router-link to="/goals" class="stat-cta">Create your first goal</router-link>
        </div>
      </div>
    </div>

    <!-- Active Runs Section -->
    <div v-if="activeRuns.length > 0" class="active-runs-section" :class="{ 'section-visible': cardsVisible }">
      <h2 class="section-title">Active Runs</h2>
      <div class="runs-grid">
        <div v-for="run in activeRuns" :key="run._id" class="run-card-dashboard">
          <div class="run-card-content">
            <h3>Run with Partner</h3>
            <p class="run-card-subtitle">Scheduled run in progress</p>
          </div>
          <div class="run-card-actions">
            <router-link :to="`/run/${run._id}`" class="btn-view-run">View Details</router-link>
          </div>
        </div>
      </div>
      <div v-if="activeRuns.length > 0" class="view-all-runs">
        <router-link to="/find-buddy" class="view-all-link">View all runs and invites →</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useProfileStore } from '../stores/profile';
import { useSharedGoalsStore } from '../stores/sharedGoals';
import { useOneRunMatchingStore } from '../stores/oneRunMatching';
import { ApiService } from '../services/api';

const auth = useAuthStore();
const profileStore = useProfileStore();
const sharedGoalsStore = useSharedGoalsStore();
const oneRunStore = useOneRunMatchingStore();

const displayName = computed(() => {
  const profile = profileStore.profile;
  return profile?.displayname?.trim() || auth.user?.username || '';
});

const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
});

const stats = ref({
  goals: 0,
  matches: 0,
});

const animatedStats = ref({
  goals: 0,
  matches: 0,
});

const cardsVisible = ref(false);
const welcomeMessageVisible = ref(false);

function animateNumber(key: 'goals' | 'matches', target: number) {
  const duration = 1000;
  const steps = 30;
  const increment = target / steps;
  let current = 0;
  let step = 0;

  const interval = setInterval(() => {
    step++;
    current += increment;
    if (step >= steps) {
      animatedStats.value[key] = target;
      clearInterval(interval);
    } else {
      animatedStats.value[key] = Math.floor(current);
    }
  }, duration / steps);
}

async function fetchMatches() {
  if (!auth.user?.id) {
    stats.value.matches = 0;
    return;
  }

  try {
    const result = await ApiService.callConceptAction<any>(
      'OneRunMatching',
      '_getMatches',
      { user: auth.user.id }
    );
    
    // Handle different response formats
    let matches: Array<{ _id: string; userA: string; userB: string; completed: boolean }> = [];
    if (Array.isArray(result)) {
      matches = result;
    } else if (result && typeof result === 'object' && 'matches' in result && Array.isArray(result.matches)) {
      matches = result.matches;
    }
    
    // Filter to only active (non-completed) runs
    const activeMatches = matches.filter((run) => run && !run.completed);
    stats.value.matches = activeMatches.length;
  } catch (e: any) {
    console.warn('Failed to fetch matches from API:', e?.message || e);
    // Set to 0 if API call fails
    stats.value.matches = 0;
  }
}

const activeRuns = computed(() => oneRunStore.activeRuns);

onMounted(async () => {
  await profileStore.fetchProfile();
  await sharedGoalsStore.fetchAllSharedGoalsForUser();
  await fetchMatches();
  // Fetch runs to populate active runs
  await oneRunStore.fetchMatches();
  
  stats.value.goals = sharedGoalsStore.sharedGoals.length;

  // Trigger animations after data is loaded
  setTimeout(() => {
    welcomeMessageVisible.value = true;
    cardsVisible.value = true;
    animateNumber('goals', stats.value.goals);
    animateNumber('matches', stats.value.matches);
  }, 100);
});
</script>

<style scoped>
.dashboard-home {
  max-width: 1000px;
  margin: 2.5rem auto;
  background: #F9FAFB;
  border-radius: 16px;
  padding: 3rem 4.5rem 3rem 4.5rem;
  text-align: center;
}
.dashboard-home h1 {
  color: var(--color-primary);
  font-size: 2.4rem;
  margin-bottom: 1.5rem;
}
.dashboard-welcome-msg {
  color: #555;
  font-size: 1.35rem;
  margin-bottom: 2.5rem;
}

.fade-in {
  animation: fadeIn 0.8s ease-out forwards;
}

@keyframes fadeIn {
  from {
    transform: translateY(-10px);
  }
  to {
    transform: translateY(0);
  }
}
.dashboard-stats {
  display: flex;
  justify-content: center;
  gap: 2.8rem;
  margin-bottom: 3rem;
  flex-wrap: wrap;
}
.stat-card {
  background: var(--color-primary-light);
  border-radius: 12px;
  padding: 1.4rem 3rem;
  min-width: 160px;
  opacity: 0;
  transform: translateY(20px) scale(0.95);
  transition: all 0.3s ease;
  cursor: default;
}

.stat-card.card-visible {
  animation: slideUp 0.6s ease-out forwards;
}

@keyframes slideUp {
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.stat-card:hover {
  transform: translateY(-8px) scale(1.05);
}

.stat-label {
  color: var(--color-primary);
  font-weight: 600;
  font-size: 1.1rem;
  margin-bottom: 0.6em;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.stat-value {
  font-size: 2.5rem;
  font-weight: 700;
  color: #000000;
  background: var(--color-accent);
  background-clip: text;
}
.stat-hint {
  margin-top: 1rem;
  font-size: 0.95rem;
  color: #000000;
  font-style: italic;
}
.stat-cta {
  color: var(--color-accent);
  text-decoration: none;
  font-weight: 600;
  border-radius: 6px;
  transition: color 0.2s, background 0.2s;
}
.stat-cta:hover {
  background: #fff1e2;
}

.dashboard-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60vh;
}
.spinner {
  width: 48px;
  height: 48px;
  border: 6px solid var(--color-primary-border);
  border-top: 6px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  display: inline-block;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Active Runs Section */
.active-runs-section {
  margin-top: 3rem;
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.6s ease-out;
}

.active-runs-section.section-visible {
  opacity: 1;
  transform: translateY(0);
}

.section-title {
  color: var(--color-primary);
  font-size: 1.8rem;
  margin-bottom: 1.5rem;
  text-align: left;
  font-weight: 600;
}

.runs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.run-card-dashboard {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 120px;
}

.run-card-dashboard:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.run-card-content h3 {
  color: var(--color-primary);
  font-size: 1.2rem;
  margin: 0 0 0.5rem 0;
  font-weight: 600;
}

.run-card-subtitle {
  color: #666;
  font-size: 0.95rem;
  margin: 0;
}

.run-card-actions {
  margin-top: 1rem;
}

.btn-view-run {
  display: inline-block;
  padding: 0.6rem 1.2rem;
  background: var(--color-primary);
  color: white;
  text-decoration: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  transition: background 0.2s, transform 0.2s;
  text-align: center;
}

.btn-view-run:hover {
  background: var(--color-primary-dark, #1a5f3f);
  transform: scale(1.05);
}

.view-all-runs {
  text-align: center;
  margin-top: 1.5rem;
}

.view-all-link {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 500;
  font-size: 1rem;
  transition: color 0.2s;
}

.view-all-link:hover {
  color: var(--color-primary-dark, #1a5f3f);
  text-decoration: underline;
}
</style>
