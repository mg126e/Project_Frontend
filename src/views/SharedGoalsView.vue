<template>
  <section class="shared-goals">
    <h1>Shared Goals</h1>
    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="error" class="error-msg">{{ error }}</div>
    <div v-else>
      <form @submit.prevent="saveGoal" class="goal-form">
        <div class="form-group">
          <label for="goal-title">Goal Title</label>
          <input id="goal-title" v-model="goal.title" type="text" required />
        </div>
        <div class="form-group">
          <label for="goal-desc">Description</label>
          <textarea id="goal-desc" v-model="goal.description" rows="3" />
        </div>
        <button class="btn-primary" type="submit" :disabled="saving">Save</button>
        <span v-if="saveSuccess" class="success-msg">Saved!</span>
      </form>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

// In a real app, get this from route, store, or props
const sharedGoalId = 'demo-shared-goal-123'
const goal = ref({ title: '', description: '' })
const loading = ref(true)
const error = ref('')
const saving = ref(false)
const saveSuccess = ref(false)

async function fetchGoal() {
  loading.value = true
  try {
    const { data } = await axios.get(`/api/shared-goals/${sharedGoalId}`)
    goal.value = data
    error.value = ''
  } catch (e) {
    error.value = 'Failed to load shared goal.'
  }
  loading.value = false
}

async function saveGoal() {
  saving.value = true
  saveSuccess.value = false
  try {
    await axios.put(`/api/shared-goals/${sharedGoalId}`, goal.value)
    saveSuccess.value = true
    setTimeout(() => (saveSuccess.value = false), 1200)
    error.value = ''
  } catch (e) {
    error.value = 'Failed to save goal.'
  }
  saving.value = false
}

onMounted(fetchGoal)
</script>

<style scoped>
section.shared-goals {
  max-width: 500px;
  margin: 2.5rem auto;
  background: #fff;
  border-radius: 16px;
  padding: 2rem 2.5rem;
}
.shared-goals h1 {
  font-family: 'Monoton', cursive;
  color: var(--color-primary);
  font-size: 2rem;
  margin-bottom: 1.5rem;
  text-align: center;
}
.goal-form {
  margin-top: 1.2rem;
}
.form-group {
  margin-bottom: 1.2rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.form-group label {
  font-weight: 600;
  margin-bottom: 0.3rem;
}
.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.5em;
  border: 1.5px solid var(--color-primary);
  border-radius: 6px;
  font-size: 1rem;
  margin-bottom: 0.2rem;
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