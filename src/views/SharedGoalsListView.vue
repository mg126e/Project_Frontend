<template>
  <section class="shared-goals-list">
    <h1>Shared Goals</h1>
    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="error" class="error-msg">{{ error }}</div>
    <div v-else>
      <ul v-if="sharedGoals.length">
        <li v-for="goal in sharedGoals" :key="goal.id" class="goal-item">
          <span>{{ goal.description }}</span>
          <span v-if="!goal.isActive" class="inactive">(Closed)</span>
        </li>
      </ul>
      <div v-else class="no-goals">No shared goals found.</div>
    </div>
  </section>
</template>

<script setup>
import { onMounted } from 'vue';
import { useSharedGoalsStore } from '../stores/sharedGoals';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '../stores/auth';

const sharedGoalsStore = useSharedGoalsStore();
const { sharedGoals, loading, error } = storeToRefs(sharedGoalsStore);
const auth = useAuthStore();

onMounted(() => {
  // For demo, use current user only. In real app, use group of users.
  sharedGoalsStore.fetchSharedGoals([auth.user._id]);
});
</script>

<style scoped>
.shared-goals-list {
  max-width: 500px;
  margin: 2.5rem auto;
  background: #fff;
  border-radius: 16px;
  padding: 2rem 2.5rem;
}
.shared-goals-list h1 {
  color: var(--color-primary);
  font-size: 2rem;
  margin-bottom: 1.5rem;
  text-align: center;
}
.goal-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.7em 0;
  border-bottom: 1px solid #e3e8f0;
  font-size: 1.1rem;
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
</style>
