<template>
  <div class="modal-overlay" @click="handleClose">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>Create New Goal</h2>
        <button @click="handleClose" class="close-button">&times;</button>
      </div>
      <div class="modal-body">
        <div v-if="step === 1" class="step-content">
          <label for="goalDescription">Goal Description</label>
          <textarea id="goalDescription" v-model="goalDescription" placeholder="Describe your goal..." rows="4" required></textarea>
          <div class="form-help">Be specific! E.g. "Run a 5K with my buddy"</div>
          <div v-if="generationError" class="error-message" style="margin-top:1rem">{{ generationError }}</div>
          <div class="choose-method">
            <button @click="chooseMethod('generate')" :disabled="!goalDescription.trim() || generating" class="next-button">
              <span v-if="generating && method === 'generate'" class="button-spinner"></span>
              <span v-else>Generate Steps</span>
            </button>
            <button @click="chooseMethod('manual')" :disabled="!goalDescription.trim() || generating" class="next-button">
              <span v-if="generating && method === 'manual'" class="button-spinner"></span>
              <span v-else>Enter Steps Manually</span>
            </button>
          </div>
        </div>
        <div v-else-if="step === 2 && method === 'generate'" class="step-content">
          <div v-if="generating" class="generating-steps"><div class="loading-spinner"></div><h3>Generating Steps...</h3></div>
          <div v-else>
            <h3>Review & Approve Steps</h3>
            <div v-if="generationError" class="error-message" style="margin-bottom: 1rem">{{ generationError }}</div>
            <draggable v-model="steps" class="steps-list" item-key="id" :animation="200" handle=".drag-handle">
              <template #item="{ element: stepObj, index: idx }">
                <li>
                  <span class="drag-handle" title="Drag to reorder" style="cursor: grab; margin-right: 0.5em">☰</span>
                  <input v-model="stepObj.description" class="edit-step-input" :placeholder="`Step ${idx + 1}`" />
                  <button @click="removeStep(idx)" class="delete-step">Delete</button>
                </li>
              </template>
            </draggable>
            <div class="form-actions">
              <label for="manualStepGen" class="form-label">Add Step</label>
              <textarea id="manualStepGen" v-model="manualStepInput" class="form-textarea" placeholder="Describe what needs to be done for this step..." rows="3"></textarea>
              <span v-if="validationError" class="error-message">{{ validationError }}</span>
              <button type="button" @click="handleAddStep" :disabled="generating || !manualStepInput.trim()" class="next-button">Add Manual Step</button>
            </div>
            <button @click="saveGoal" :disabled="steps.length === 0 || !goalDescription.trim()" class="primary-button">Save Goal & Steps</button>
          </div>
        </div>
        <div v-else-if="step === 2 && method === 'manual'" class="step-content">
          <h3>Enter Steps Manually</h3>
          <div class="form-group">
            <label for="manualStep" class="form-label">Step Description</label>
            <textarea id="manualStep" v-model="manualStepInput" class="form-textarea" placeholder="Describe what needs to be done for this step..." rows="3" required></textarea>
            <span v-if="validationError" class="error-message">{{ validationError }}</span>
          </div>
          <draggable v-model="steps" class="steps-list" item-key="id" :animation="200" handle=".drag-handle">
            <template #item="{ element: stepObj, index: idx }">
              <li>
                <span class="drag-handle" title="Drag to reorder" style="cursor: grab; margin-right: 0.5em">☰</span>
                {{ stepObj.description }}
                <button @click="removeStep(idx)" class="delete-step">Delete</button>
              </li>
            </template>
          </draggable>
          <button type="button" @click="handleAddStep" :disabled="!!validationError" class="next-button">Add Manual Step</button>
          <button @click="saveGoal" :disabled="steps.length === 0 || !goalDescription.trim()" class="primary-button">Save Goal & Steps</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios';
import { useSharedGoalsStore } from '../stores/sharedGoals';
import { useAuthStore } from '../stores/auth';
import draggable from 'vuedraggable';

const emit = defineEmits(['close', 'goalCreated']);
const sharedGoalsStore = useSharedGoalsStore();
const auth = useAuthStore();

const step = ref(1);
const method = ref(null); // 'generate' | 'manual'
const goalDescription = ref('');
const steps = ref([]);
const manualStepInput = ref('');
const validationError = ref('');
const generationError = ref('');
const generating = ref(false);
const saving = ref(false);

function resetModalState() {
  step.value = 1;
  method.value = null;
  goalDescription.value = '';
  steps.value = [];
  manualStepInput.value = '';
  validationError.value = '';
  generationError.value = '';
  generating.value = false;
  saving.value = false;
}
function handleClose() {
  resetModalState();
  emit('close');
}
function validateManualStep() {
  validationError.value = '';
  if (!manualStepInput.value.trim()) {
    validationError.value = 'Step description is required';
    return false;
  }
  if (manualStepInput.value.trim().length < 10) {
    validationError.value = 'Step description should be at least 10 characters';
    return false;
  }
  return true;
}
function handleAddStep() {
  if (!validateManualStep()) return;
  const stepText = manualStepInput.value.trim();
  if (steps.value.some(s => s.description.trim() === stepText)) {
    validationError.value = 'This step already exists.';
    return;
  }
  steps.value.push({ id: Date.now(), description: stepText });
  manualStepInput.value = '';
  validationError.value = '';
}
function removeStep(idx) {
  steps.value.splice(idx, 1);
}
async function chooseMethod(selected) {
  if (!goalDescription.value.trim()) {
    validationError.value = 'Goal description is required.';
    return;
  }
  validationError.value = '';
  generationError.value = '';
  method.value = selected;
  generating.value = true;
  steps.value = [];
  if (selected === 'generate') {
    try {
      // Simulate LLM API call
      const { data } = await axios.post('/api/llm/generate-goal-steps', { description: goalDescription.value });
      if (data && Array.isArray(data.steps)) {
        steps.value = data.steps.map((desc, idx) => ({ id: idx, description: desc }));
        step.value = 2;
      } else {
        generationError.value = 'Could not generate steps.';
      }
    } catch (e) {
      generationError.value = 'Failed to generate steps.';
    } finally {
      generating.value = false;
    }
  } else if (selected === 'manual') {
    step.value = 2;
    generating.value = false;
  }
}
async function saveGoal() {
  if (saving.value) return;
  saving.value = true;
  try {
    // Save goal and steps (mock: just save goal description)
    await sharedGoalsStore.createSharedGoal({ users: [auth.user._id, 'demo-user-2'], description: goalDescription.value });
    emit('goalCreated');
    resetModalState();
  } catch (e) {
    generationError.value = 'Failed to save goal.';
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>

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
  background: #f7fafd;
  border-radius: 24px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  color: var(--color-primary);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 1.5rem 1rem 1.5rem;
  background: #f7fafd;
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
}
.modal-header h2 {
  margin: 0;
  color: var(--color-primary);
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 0.5px;
}
.close-button {
  background: none;
  border: none;
  font-size: 2rem;
  color: var(--color-primary);
  cursor: pointer;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s, color 0.2s;
}
.close-button:hover {
  background: #e3f1fc;
  color: var(--color-primary);
}
.modal-body {
  padding: 1.5rem;
}
.modal-body label {
  color: var(--color-primary);
  font-weight: 500;
  margin-bottom: 0.5rem;
  display: block;
}
.modal-body textarea,
.modal-body input {
  width: 100%;
  border-radius: 8px;
  border: 1.5px solid #e3e8f0;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  font-size: 1rem;
  background: #f7fafd;
  color: var(--color-primary);
  transition: border-color 0.2s;
}

.modal-body textarea:focus,
.modal-body input:focus {
  outline: none;
  border-color: var(--color-primary);
}
.form-help {
  color: var(--color-primary);
  margin-bottom: 1rem;
  font-size: 0.95rem;
  background: #e3f1fc;
  padding: 0.5rem 1rem;
  border-radius: 8px;
}
.choose-method {
  display: flex;
  gap: 2rem;
  margin-top: 1.5rem;
  margin-bottom: 2.5rem;
  flex-wrap: wrap;
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
  background: #f7fafd;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  box-shadow: none;
}
.delete-step {
  background: var(--color-accent);
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
  background: #d84315;
}
.form-actions {
  margin-top: 1.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem 1rem;
  align-items: center;
  row-gap: 1.5rem;
  column-gap: 2rem;
}
.next-button,
.primary-button {
  background: var(--color-accent);
  color: #fff;
  border: none;
  padding: 0.85rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  font-weight: 600;
  box-shadow: none;
  transition: background 0.2s;
  letter-spacing: 0.02em;
  margin-right: 1.2rem;
  margin-bottom: 0.7rem;
  opacity: 1;
}
.next-button:disabled,
.primary-button:disabled {
  background: #ffd6c2;
  color: #fff;
  opacity: 0.6;
  cursor: not-allowed;
}
.next-button:hover:not(:disabled),
.primary-button:hover:not(:disabled) {
  background: #d84315;
}

.drag-handle {
  color: var(--color-secondary);
  font-size: 1.2em;
  user-select: none;
}
.loading-spinner {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 2rem auto;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.edit-step-input {
  border: 1.5px solid var(--color-primary);
  border-radius: 6px;
  padding: 0.4em 0.7em;
  font-size: 1em;
  background: #f7fafd;
  color: var(--color-primary);
  flex: 1;
  min-width: 0;
}
.edit-step-input:focus {
  outline: none;
  border-color: var(--color-primary);
  background: #fff;
}
.error-message {
  color: #d32f2f;
  margin-top: 0.25em;
  background-color: #ffcdd2;
  border-radius: 8px;
  padding: 1rem;
  font-weight: 500;
}
</style>
