<template>
  <section class="shared-goals">
    <h1>Shared Goals</h1>
    <div v-if="savingGoal" class="saving-overlay">
      <div class="saving-spinner"></div>
      <p>Saving your goal...</p>
    </div>
    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="error" class="error-msg">{{ error }}</div>
    <div v-else>
      <div class="goal-filters">
        <label for="goal-filter" class="filter-label">Show:</label>
        <select id="goal-filter" v-model="filter" class="filter-dropdown">
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      <div v-for="user in userGroupsForCollapsible" :key="user.id" class="user-collapsible">
        <div class="user-header" @click="toggleUser(user.id)">
      <span class="user-name">{{ user.displayname}}</span>
      <span class="collapse-arrow">{{ openUsers[user.id] ? '▼' : '▶' }}</span>
      </div>
        <transition name="fade">
          <ul v-show="openUsers[user.id]" class="user-goal-list">
            <li v-for="goal in user.goals" :key="goal.id" class="goal-item">
              <div class="goal-content">
                <router-link :to="`/goals/${goal.id}`" class="goal-link">
                  {{ goal.description }}
                </router-link>
                <div class="goal-meta-info">
                  <span class="meta-steps">{{ getStepCount(goal) }} steps</span>
                  <span class="meta-date">Started: {{ formatDate(goal.createdAt) }}</span>
                  <template v-if="!goal.isActive && goal.closedAt">
                    <span class="meta-divider">|</span>
                    <span class="meta-date">Closed: {{ formatDate(goal.closedAt) }}</span>
                  </template>
                </div>
              </div>
            </li>
          </ul>
        </transition>
      </div>

      <div v-if="filteredGoals.length === 0" class="no-goals">No shared goals found.</div>
      <button class="btn-primary" style="margin-top:2rem;" @click="showGoalModal = true">Add Goal</button>
      <GoalCreationModal v-if="showGoalModal" @close="showGoalModal = false" />
    </div>

      </section>
    </template>


<script setup>
import GoalCreationModal from '../components/GoalCreationModal.vue';
import { useSharedGoalsStore } from '../stores/sharedGoals';
import { useAuthStore } from '../stores/auth';
import { storeToRefs } from 'pinia';
import { ref, computed, onMounted, nextTick } from 'vue';
import { format } from 'date-fns';

function formatDate(date) {
  if (!date) return '';
  return format(new Date(date), 'PP p');
}

function getStepCount(goal) {
  if (goal.steps && Array.isArray(goal.steps)) {
    return goal.steps.length;
  }
  // If steps not loaded yet, check stepsByGoal
  if (sharedGoalsStore.stepsByGoal && sharedGoalsStore.stepsByGoal[goal.id]) {
    return sharedGoalsStore.stepsByGoal[goal.id].length;
  }
  return 0;
}

const sharedGoalsStore = useSharedGoalsStore();
const { sharedGoals, loading, error } = storeToRefs(sharedGoalsStore);
const auth = useAuthStore();
const filter = ref('all'); // 'all' | 'active' | 'inactive'
const showGoalModal = ref(false);
const savingGoal = ref(false);

// Watch for unexpected changes to showGoalModal
watch(() => showGoalModal.value, (newVal, oldVal) => {
  console.log('[SharedGoalsView] showGoalModal changed from', oldVal, 'to', newVal);
  if (oldVal === true && newVal === false) {
    console.trace('[SharedGoalsView] Modal closed, stack trace:');
  }
});

const filteredGoals = computed(() => {
  if (filter.value === 'active') return sharedGoals.value.filter(g => g.isActive);
  if (filter.value === 'inactive') return sharedGoals.value.filter(g => !g.isActive);
  return sharedGoals.value;
});

// Group shared goals by each individual user (other than self)
const userGroupsForCollapsible = computed(() => {
  const userMap = {};
  filteredGoals.value.forEach(goal => {
    (goal.users || []).forEach(u => {
      const id = typeof u === 'object' ? u.id : u;
      // Always use the best available displayname (store guarantees fallback to id)
      const displayname = typeof u === 'object' ? u.displayname : u;
      if (id && id !== auth.user.id) {
        if (!userMap[id]) {
          userMap[id] = { id, displayname, goals: [] };
        }
        // Attach steps to the goal if not already present
        let goalWithSteps = goal;
        if (!goal.steps && sharedGoalsStore.stepsByGoal && sharedGoalsStore.stepsByGoal[goal.id]) {
          goalWithSteps = { ...goal, steps: sharedGoalsStore.stepsByGoal[goal.id] };
        }
        userMap[id].goals.push(goalWithSteps);
      }
    });
  });
  // Sort by name for consistent order
  return Object.values(userMap).sort((a, b) => a.displayname.localeCompare(b.displayname));
});

// Track which goals we've fetched steps for
const fetchedStepGoals = new Set();

// Fetch steps for all goals when component mounts and when goals change
async function fetchAllSteps() {
  const goalIds = sharedGoals.value.map(g => g.id);
  
  for (const goalId of goalIds) {
    if (!fetchedStepGoals.has(goalId) && !sharedGoalsStore.stepsByGoal[goalId]) {
      fetchedStepGoals.add(goalId);
      try {
        await sharedGoalsStore.fetchSharedSteps(goalId);
      } catch (err) {
        console.error('[SharedGoalsView] Error fetching steps for goal:', goalId, err);
      }
    }
  }
}

// Watch for new goals and fetch their steps
import { watch } from 'vue';
watch(sharedGoals, () => {
  fetchAllSteps();
}, { immediate: false });

// Initialize open state for the first group and reset on group changes
import { reactive } from 'vue';
const openUsers = reactive({});
let prevIds = [];
watch(userGroupsForCollapsible, (groups) => {
  const ids = groups.map(g => g.id);
  // Only reset if the user ids actually changed
  if (ids.join('|') !== prevIds.join('|')) {
    // Remove all keys from openUsers
    Object.keys(openUsers).forEach(k => delete openUsers[k]);
    if (groups.length > 0) {
      openUsers[groups[0].id] = true;
    }
    prevIds = ids;
  }
});

function toggleUser(userId) {
  openUsers[userId] = !openUsers[userId];
}


onMounted(async () => {
  await sharedGoalsStore.fetchAllSharedGoalsForUser(auth.user.id);
  // Fetch steps for all goals after goals are loaded
  await fetchAllSteps();
});

import { useRouter } from 'vue-router';
const router = useRouter();

async function onGoalCreated(goalId) {
  console.log('[SharedGoalsView] onGoalCreated called with goalId:', goalId);
  console.log('[SharedGoalsView] showGoalModal before:', showGoalModal.value);
  
  // Close modal immediately to prevent any re-rendering
  showGoalModal.value = false;
  
  // Wait for next tick to ensure modal is destroyed
  await nextTick();
  console.log('[SharedGoalsView] Modal destroyed, starting save flow');
  
  savingGoal.value = true;
  try {
    await sharedGoalsStore.fetchAllSharedGoalsForUser(auth.user.id);
    console.log('[SharedGoalsView] Goals fetched, about to redirect');
    // Redirect to the newly created goal's detail page
    if (goalId) {
      router.push(`/goals/${goalId}`);
    }
  } finally {
    savingGoal.value = false;
    console.log('[SharedGoalsView] savingGoal set to false');
  }
}
</script>

<style scoped>
.steps-list {
  list-style: none;
  padding: 0;
  margin: 1rem 0;
}
.steps-list li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  background: #f6fff7;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  border: 1px solid #e0f2f1;
  box-shadow: none;
}

.error-message {
  color: #d32f2f;
  margin-top: 0.25em;
  background-color: #ffcdd2;
  border-radius: 8px;
  padding: 1rem;
  font-weight: 500;
}
.goal-filters {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-bottom: 1.5rem;
  gap: 0.7rem;
}
.filter-label {
  font-weight: 600;
  color: var(--color-primary);
  font-size: 1rem;
}
.filter-dropdown {
  background: #f7fafd;
  color: var(--color-primary);
  border: 1.5px solid #e3e8f0;
  border-radius: 6px;
  padding: 0.45em 1.2em 0.45em 0.8em;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: border 0.18s;
  outline: none;
}
.filter-dropdown:focus {
  border-color: #106cb8;
}
section.shared-goals {
  min-width: 800px;
  background: #fff;
  border-radius: 24px;
  padding: 3.5rem 4.5rem 3.5rem 4.5rem;
}
.shared-goals h1 {
  font-family: 'Monoton', cursive;
  color: var(--color-primary);
  font-size: 2rem;
  margin-bottom: 1.5rem;
  text-align: center;
}
.goal-form {
  display: flex;
  gap: 0.7rem;
  justify-content: center;
}
.goal-item {
  padding: 1rem 0;
  border-bottom: 1px solid #e3e8f0;
}
.goal-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.goal-main {
  display: flex;
  align-items: center;
}
.goal-link {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 600;
  font-size: 1.1rem;
  transition: color 0.18s, background 0.18s;
  border-radius: 6px;
  padding: 0.15em 0.5em;
  display: inline-block;
}
.goal-link:hover {
  background: #e3f1fc;
  text-decoration: none;
}
.goal-meta-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--color-secondary);
  margin-left: 0.5em;
}
.meta-steps {
  font-weight: 500;
}
.meta-date {
  color: var(--color-secondary);
}
.inactive {
  color: #aaa;
  font-size: 0.95em;
  margin-left: 0.5em;
}
.no-goals {
  text-align: center;
  color: #888;
  margin: 2rem 0;
}
.btn-primary {
  background: var(--color-accent);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.7em 2em;
  font-weight: 600;
  font-size: 1.1rem;
  cursor: pointer;
  margin-top: 1rem;
  transition: background 0.2s;
}
.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.btn-primary:hover:not(:disabled) {
  background: #d84315;
}
.loading {
  text-align: center;
  color: #888;
  margin: 2rem 0;
}

.error-msg {
  color: #d32f2f;
  margin-top: 0.7rem;
  text-align: center;
}

.success-msg {
  color: #388e3c;
  margin-left: 1.2rem;
  font-size: 1rem;
}

.user-collapsible {
  margin-bottom: 1.2rem;
  background: #f9fafb;
}
.user-header {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 1.1rem 1.2rem 1.1rem 1.2rem;
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--color-primary);
  background: #e3f1fc;
  transition: background 0.18s;
}
.user-header:hover {
  background: #d0e4f0;
}
.user-name {
  flex: 1;
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--color-primary);
}
.collapse-arrow {
  font-size: 1.2rem;
  margin-left: 0.7rem;
  color: var(--color-primary);
  font-weight: 700;
}

.saving-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  gap: 1.5rem;
}

.saving-overlay p {
  color: var(--color-primary);
  font-size: 1.3rem;
  font-weight: 600;
  margin: 0;
}

.saving-spinner {
  width: 60px;
  height: 60px;
  border: 5px solid #e3f1fc;
  border-top: 5px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>