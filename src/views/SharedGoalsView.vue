<template>
  <section class="shared-goals">
    <h1>Shared Goals</h1>
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
      <ul v-if="filteredGoals.length">
        <li v-for="goal in filteredGoals" :key="goal.id" class="goal-item">
          <router-link :to="`/goal/${goal.id}`" class="goal-link">
            {{ goal.description }}
          </router-link>
          <span v-if="!goal.isActive" class="inactive">(Closed)</span>
        </li>
      </ul>
      <div v-else class="no-goals">No shared goals found.</div>
      <form @submit.prevent="addGoal" class="goal-form" style="margin-top:2rem;">
        <input v-model="description" placeholder="New goal description" required />
        <button class="btn-primary" type="submit">Add Goal</button>
      </form>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
import { useSharedGoalsStore } from '../stores/sharedGoals';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '../stores/auth';

const sharedGoalsStore = useSharedGoalsStore();
const { sharedGoals, loading, error } = storeToRefs(sharedGoalsStore);
const auth = useAuthStore();
const description = ref('');
const filter = ref('all'); // 'all' | 'active' | 'inactive'

const filteredGoals = computed(() => {
  if (filter.value === 'active') return sharedGoals.value.filter(g => g.isActive);
  if (filter.value === 'inactive') return sharedGoals.value.filter(g => !g.isActive);
  return sharedGoals.value;
});

onMounted(() => {
  sharedGoalsStore.fetchSharedGoals([auth.user._id, 'demo-user-2']);
});

async function addGoal() {
  await sharedGoalsStore.createSharedGoal({ users: [auth.user._id, 'demo-user-2'], description: description.value });
  description.value = '';
  await sharedGoalsStore.fetchSharedGoals([auth.user._id, 'demo-user-2']);
}
</script>

<style scoped>
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.7em 0;
  border-bottom: 1px solid #e3e8f0;
  font-size: 1.1rem;
}
.goal-link {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 600;
  font-size: 1.1rem;
  transition: color 0.18s, background 0.18s;
  border-radius: 6px;
  padding: 0.15em 0.5em;
}
.goal-link:hover {
  background: #e3f1fc;
  text-decoration: none;
}
.inactive {
  color: #aaa;
  font-size: 0.95em;
  margin-left: 0.7em;
}
.no-goals {
  text-align: center;
  color: #888;
  margin: 2rem 0;
}
.btn-primary {
  background: var(--color-primary);
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
  background: #106cb8;
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
</style>