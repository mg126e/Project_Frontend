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
        <li v-for="(goal, idx) in filteredGoals" :key="goal.id" class="goal-item">
          <router-link :to="`/goals/${goal.id}`" class="goal-link">
            {{ goal.description }}
          </router-link>
          <span v-if="!goal.isActive" class="inactive">(Closed)</span>
        </li>
      </ul>
      <div v-else class="no-goals">No shared goals found.</div>
      <button class="btn-primary" style="margin-top:2rem;" @click="showGoalModal = true">Add Goal</button>
      <GoalCreationModal v-if="showGoalModal" @close="showGoalModal = false" @goalCreated="onGoalCreated" />
    </div>
  </section>
</template>

<script setup>
import GoalCreationModal from '../components/GoalCreationModal.vue';

import { useSharedGoalsStore } from '../stores/sharedGoals';
import { useAuthStore } from '../stores/auth';
import { storeToRefs } from 'pinia';
import { ref, computed, onMounted } from 'vue';

const sharedGoalsStore = useSharedGoalsStore();
const { sharedGoals, loading, error } = storeToRefs(sharedGoalsStore);
const auth = useAuthStore();
const filter = ref('all'); // 'all' | 'active' | 'inactive'
const showGoalModal = ref(false);

const filteredGoals = computed(() => {
  if (filter.value === 'active') return sharedGoals.value.filter(g => g.isActive);
  if (filter.value === 'inactive') return sharedGoals.value.filter(g => !g.isActive);
  return sharedGoals.value;
});

onMounted(() => {
  sharedGoalsStore.fetchSharedGoals([auth.user._id, 'demo-user-2']);
});

function onGoalCreated() {
  showGoalModal.value = false;
  sharedGoalsStore.fetchSharedGoals([auth.user._id, 'demo-user-2']);
}
</script>

<style scoped>
/* Modal styles (from GoalCreationModal.vue, simplified) */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}
.modal-content {
  background: #f6fff7;
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  border: 1.5px solid #81c784;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 1.5rem 1rem 1.5rem;
  border-bottom: 1px solid #81c784;
  background: #e8f5e9;
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
}
.modal-header h2 {
  margin: 0;
  color: #256b28;
  font-size: 1.5rem;
  font-weight: 500;
  letter-spacing: 0.5px;
}
.close-button {
  background: none;
  border: none;
  font-size: 2rem;
  color: #256b28;
  cursor: pointer;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s;
}
.close-button:hover {
  background: #e0f2f1;
  color: #256b28;
}
.modal-body {
  padding: 1.5rem;
}
.modal-body label {
  color: #256b28;
  font-weight: 500;
  margin-bottom: 0.5rem;
  display: block;
}
.modal-body textarea,
.modal-body input {
  width: 100%;
  border-radius: 8px;
  border: 1.5px solid #81c784;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  font-size: 1rem;
  background: #f6fff7;
  color: #256b28;
  transition: border-color 0.2s;
}
.modal-body textarea:focus,
.modal-body input:focus {
  outline: none;
  border-color: #256b28;
}
.form-help {
  color: #256b28;
  margin-bottom: 1rem;
  font-size: 0.95rem;
  background: #e8f5e9;
  padding: 0.5rem 1rem;
  border-radius: 8px;
}
.choose-method {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}
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
.delete-step {
  background: #388e3c;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.25rem 0.75rem;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  transition: background 0.2s;
}
.delete-step:hover {
  background: #256b28;
}
.next-button,
.primary-button {
  background: #388e3c;
  color: #fff;
  border: none;
  padding: 0.85rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  font-weight: 500;
  box-shadow: none;
  transition: background 0.2s;
}
.next-button:disabled,
.primary-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.next-button:hover,
.primary-button:hover {
  background: #256b28;
}
.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #a5d6a7;
  border-top: 4px solid #388e3c;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 2rem auto;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.edit-step-input {
  border: 1.5px solid #81c784;
  border-radius: 6px;
  padding: 0.4em 0.7em;
  font-size: 1em;
  background: #f6fff7;
  color: #256b28;
  flex: 1;
  min-width: 0;
}
.edit-step-input:focus {
  outline: none;
  border-color: #256b28;
  background: #fff;
}
.error-message {
  color: #d32f2f;
  margin-top: 0.25em;
  background-color: #ffcdd2;
  border: 1px solid #d32f2f;
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
</style>