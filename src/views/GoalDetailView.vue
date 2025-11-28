<template>
  <div class="goal-detail-container">
    <div v-if="!goal && !loading" class="no-goal-state">
      <div class="no-goal-content">
        <div class="no-goal-icon">🚫</div>
        <h2 class="no-goal-title">Goal not found</h2>
        <p class="no-goal-desc">The goal you are looking for does not exist or could not be loaded.</p>
      </div>
    </div>

    <div v-else-if="goal" class="active-goal-section">
      <div class="goal-header">
        <div class="goal-info">
          <h2>{{ goal.description }}</h2>
          <div class="goal-meta">
            <span class="goal-status">{{ goal.isActive ? 'Active Goal' : 'Closed Goal' }}</span>
            <span class="step-count">{{ steps.length }} steps</span>
          </div>
          <div v-if="goal.createdAt" class="goal-start-date">
            Started at: {{ formatDate(goal.createdAt) }}
          </div>
          <div v-if="!goal.isActive && (goal.completedAt || goal.completed || goal.completed_at)" class="goal-completed-date">
            Completed at: {{ formatDate(goal.completedAt || goal.completed || goal.completed_at) }}
          </div>
        </div>
      </div>

      <div v-if="goal.isActive" class="progress-overview">
        <div class="progress-stats">
          <div class="stat-item">
            <div class="stat-number">{{ completedSteps }}</div>
            <div class="stat-label">Completed</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">{{ goalProgress }}%</div>
            <div class="stat-label">Progress</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">{{ remainingSteps }}</div>
            <div class="stat-label">Remaining</div>
          </div>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: goalProgress + '%' }"></div>
          </div>
        </div>
      </div>

      <div class="steps-section">
        <div class="steps-header">
          <h3>Your Steps</h3>
        </div>
        <div v-if="steps.length === 0" class="empty-state">
          <p>No steps have been created for this goal.</p>
        </div>
        <div v-else class="steps-list">
          <div v-for="(step, index) in steps" :key="step.id" class="step-item" :class="{ completed: step.isComplete, 'next-step': !step.isComplete && isNextStep(index) }">
            <div class="step-number">{{ index + 1 }}</div>
            <div class="step-content">
              <h4>{{ step.description }}</h4>
              <div class="step-meta">
                <span v-if="step.completion && goal.isActive" class="completion-date">Completed: {{ formatDate(step.completion) }}</span>
              </div>
            </div>
            <div class="step-actions" v-if="goal.isActive">
              <button v-if="!step.isComplete && step.id && goal.isActive" @click="completeStep(step.id)" class="complete-button">✓ Complete</button>
              <span v-else class="completed-icon">✅</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="goalProgress === 100" class="achievement-section">
        <div class="achievement-card">
          <div class="achievement-icon">🏆</div>
          <h3>Congratulations!</h3>
          <p>You've completed your goal: <strong>{{ goal.description }}</strong></p>
        </div>
      </div>

      <div v-if="goal && goal.isActive && goalProgress !== 100" class="close-goal-actions">
        <button @click="showAbandonModal = true" class="close-goal">
          <span>Abandon Goal</span>
        </button>
        <ConfirmActionModal
          v-if="showAbandonModal"
          title="Abandon Goal"
          message="Are you sure you want to abandon this goal? This cannot be undone."
          confirmText="Abandon"
          confirmClass="danger"
          @close="showAbandonModal = false"
          @confirm="handleAbandonGoal"
        />
      </div>
      <router-link to="/goals" class="back-link">Back to Goals</router-link>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading goal...</p>
    </div>
  </div>
</template>

<script setup>
import ConfirmActionModal from '../components/ConfirmActionModal.vue';
const showAbandonModal = ref(false);
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSharedGoalsStore } from '../stores/sharedGoals';
import { format } from 'date-fns';

const route = useRoute();
const router = useRouter();
const sharedGoalsStore = useSharedGoalsStore();

const goal = ref(null);
const steps = ref([]);
const loading = ref(true);

const completedSteps = computed(() => steps.value.filter(s => s.isComplete).length);
const remainingSteps = computed(() => steps.value.length - completedSteps.value);
const goalProgress = computed(() => steps.value.length ? Math.round((completedSteps.value / steps.value.length) * 100) : 0);

function formatDate(date) {
  if (!date) return '';
  return format(new Date(date), 'PPpp');
}

function isNextStep(index) {
  for (let i = 0; i < steps.value.length; i++) {
    if (!steps.value[i].isComplete) {
      return i === index;
    }
  }
  return false;
}

async function completeStep(stepId) {
  await sharedGoalsStore.completeStep(goal.value.id, stepId);
  await loadGoal();
}


async function handleAbandonGoal() {
  showAbandonModal.value = false;
  await sharedGoalsStore.abandonGoal(goal.value.id);
  router.push('/goals');
}


async function loadGoal() {
  loading.value = true;
  const goalId = route.params.id;
  goal.value = await sharedGoalsStore.getGoalById(goalId);
  let loadedSteps = goal.value?.steps || [];
  // Inject fake steps for UI testing if no steps exist
  if (!loadedSteps.length) {
    loadedSteps = [
      { id: 1, description: 'Buy new running shoes', isComplete: false },
      { id: 2, description: 'Run 1 mile as a warmup', isComplete: true, completion: new Date() },
      { id: 3, description: 'Stretch for 10 minutes', isComplete: false },
      { id: 4, description: 'Run 5K with buddy', isComplete: false }
    ];
  }
  steps.value = loadedSteps;
  loading.value = false;
}

onMounted(loadGoal);
</script>

<style scoped>
.no-goal-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}
.no-goal-content {
  background: #e3f1fc;
  padding: 3rem 2.5rem;
  text-align: center;
}
.no-goal-icon {
  font-size: 3.5rem;
  margin-bottom: 1.2rem;
}
.no-goal-title {
  color: var(--color-primary);
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.7rem;
}
.no-goal-desc {
  color: var(--color-secondary);
  font-size: 1.15rem;
  margin-bottom: 0;
}

.active-goal-section {
  background: #ffffff;
  border-radius: 24px;
  padding: 2rem;
  margin-bottom: 2rem;
  color: var(--color-primary);
}
.goal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 2rem;
}
.goal-info h2 {
  margin: 0 0 0.5rem 0;
  color: var(--color-primary);
  font-size: 1.5rem;
  font-weight: 700;
}
.goal-meta {
  display: flex;
  gap: 1rem;
  align-items: center;
}
.goal-status {
  background: var(--color-accent);
  color: #fff;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}
.step-count {
  color: var(--color-secondary);
  font-size: 0.9rem;
}
.progress-overview {
  background: #e3f1fc;
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
}
.progress-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}
.stat-item {
  text-align: center;
}
.stat-number {
  font-size: 2rem;
  font-weight: bold;
  color: var(--color-primary);
  margin-bottom: 0.25rem;
}
.stat-label {
  color: var(--color-secondary);
  font-size: 0.9rem;
  font-weight: 500;
}
.progress-bar-container {
  margin-top: 1rem;
}
.progress-bar {
  height: 12px;
  background: rgb(255, 255, 255);
  border-radius: 6px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ffc5b3, var(--color-accent));
  border-radius: 6px;
  transition: width 0.3s ease;
}
.steps-section {
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
  background: #e3f1fc;
}
.steps-header h3 {
  margin: 0;
  color: var(--color-primary);
  font-size: 1.3rem;
  margin-bottom: 2rem;
}
.steps-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.step-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  border-radius: 8px;
  background: #fff;
  transition: border-color 0.2s, background 0.2s;
}
.step-item.completed {
  border-color: var(--color-primary);
  background: #e3f1fc;
}
.step-item.next-step {
  border-color: var(--color-accent);
  background: #f7fafd;
}
.step-number {
  width: 40px;
  height: 40px;
  background: var(--color-primary);
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
}
.step-item.completed .step-number {
  background: var(--color-accent);
}
.step-content {
  flex: 1;
}
.step-content h4 {
  margin: 0 0 0.5rem 0;
  color: var(--color-secondary);
  font-size: 1.1rem;
}
.step-meta {
  color: var(--color-secondary);
  font-size: 0.9rem;
}
.step-actions {
  flex-shrink: 0;
}
.complete-button {
  background: var(--color-accent);
  color: #fff;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1rem;
  transition: background-color 0.2s;
}
.complete-button:hover {
  background: #d84315;
}
.completed-icon {
  font-size: 1.5rem;
}
.achievement-section {
  margin-top: 2rem;
}
.achievement-card {
  background: #fff8e1;
  border-radius: 16px;
  padding: 3rem 2rem;
  text-align: center;
}
.achievement-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}
.achievement-card h3 {
  color: var(--color-primary);
  margin: 0 0 1rem 0;
  font-size: 1.8rem;
}
.achievement-card p {
  color: var(--color-secondary);
  margin-bottom: 2rem;
  line-height: 1.6;
}
.close-goal {
  background: var(--color-accent);
  color: #fff;
  border: none;
  border-radius: 30px;
  padding: 0.5rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
}
.close-goal:hover {
  background: #d84315;
}
.loading-state {
  text-align: center;
  padding: 4rem 2rem;
}
.loading-state .loading-spinner {
  margin-bottom: 1rem;
}
.loading-state p {
  color: var(--color-secondary);
  font-size: 1.1rem;
}
.back-link {
  display: inline-block;
  margin-top: 2.2rem;
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 600;
  font-size: 1.05rem;
  transition: color 0.18s, background 0.18s;
  border-radius: 6px;
  padding: 0.15em 0.5em;
}
.back-link:hover {
  background: #e3f1fc;
  color: var(--color-primary);
}
</style>