<template>
  <section class="goal-detail">
    <h1>Goal Details</h1>
    <div v-if="!goal">
      <div class="loading">Loading...</div>
    </div>
    <div v-else>
      <div class="goal-info">
        <div class="goal-label">Description:</div>
        <div class="goal-value">{{ goal.description }}</div>
        <div class="goal-label">Status:</div>
        <div class="goal-value">
          <span :class="goal.isActive ? 'active' : 'inactive'">
            {{ goal.isActive ? 'Active' : 'Closed' }}
          </span>
        </div>
      </div>
      <router-link to="/goals" class="back-link">&larr; Back to Shared Goals</router-link>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useSharedGoalsStore } from '../stores/sharedGoals';
import { storeToRefs } from 'pinia';

const route = useRoute();
const sharedGoalsStore = useSharedGoalsStore();
const { sharedGoals } = storeToRefs(sharedGoalsStore);

const goal = computed(() => sharedGoals.value.find(g => g.id === route.params.id));
</script>

<style scoped>
.goal-detail {
  max-width: 700px;
  margin: 3.5rem auto;
  background: #fff;
  border-radius: 20px;
  padding: 3rem 3.5rem;
  box-shadow: 0 4px 32px 0 rgba(0,0,0,0.07);
}
.goal-detail h1 {
  color: var(--color-primary);
  font-size: 2rem;
  margin-bottom: 2rem;
  text-align: center;
}
.goal-info {
  margin-bottom: 2.5rem;
}
.goal-label {
  font-weight: 600;
  color: #333;
  margin-top: 1.2rem;
}
.goal-value {
  font-size: 1.15rem;
  color: #222;
  margin-top: 0.2rem;
}
.active {
  color: #388e3c;
  font-weight: 700;
}
.inactive {
  color: #d32f2f;
  font-weight: 700;
}
.back-link {
  display: inline-block;
  margin-top: 2.2rem;
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 600;
  font-size: 1.05rem;
  transition: color 0.18s;
}
.back-link:hover {
  color: #106cb8;
  text-decoration: underline;
}
.loading {
  text-align: center;
  color: #888;
  font-size: 1.1rem;
  margin: 2.5rem 0 2.5rem 0;
}
</style>