<template>
  <div class="modal-overlay" @click="(step === 1 || generationError) ? handleClose() : null">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>Create New Goal</h2>
        <button v-if="step === 1 || generationError" @click="handleClose" class="close-button">&times;</button>
      </div>
      <div class="modal-body">
        <div v-if="step === 1" class="step-content">
          <label for="userSelect">Select User to Create Goal With</label>
          <select id="userSelect" v-model="selectedUserId" class="user-select">
            <option v-for="user in userList" :key="user.id" :value="user.id">{{ user.name }}</option>
          </select>
          <label for="goalDescription">Goal Description</label>
          <textarea id="goalDescription" v-model="goalDescription" placeholder="Describe your goal..." rows="4" required></textarea>
          <div class="form-help">Be specific! E.g. "Run a 5K with my buddy"</div>
          <div v-if="generationError" class="error-message" style="margin-top:1rem">{{ generationError }}</div>
          <div class="choose-method">
            <button type="button" @click.prevent.stop="chooseMethod('generate')" :disabled="!goalDescription.trim() || generating || !selectedUserId" class="next-button">
              <span v-if="generating && method === 'generate'" class="button-spinner"></span>
              <span v-else>Generate Steps</span>
            </button>
            <button type="button" @click.prevent.stop="chooseMethod('manual')" :disabled="!goalDescription.trim() || generating || !selectedUserId" class="next-button">
              <span v-if="generating && method === 'manual'" class="button-spinner"></span>
              <span v-else>Enter Steps Manually</span>
            </button>
          </div>
        </div>
        <div v-else-if="step === 2 && method === 'generate'" class="step-content">
          <div v-if="generating" class="generating-steps"><div class="loading-spinner"></div><h3>{{ generationError ? 'Regenerating' : 'Generating' }} Steps...</h3></div>
          <div v-else>
            <h3>Review & Approve Steps</h3>
            
            <div v-if="generationError" class="error-banner">
              <strong>An error has occurred while generating steps. Try again or manually add steps.</strong>
            </div>
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
            <div class="action-row">
              <button type="button" @click="saveGoal" :disabled="steps.length === 0 || !goalDescription.trim() || saving" class="primary-button">
                <span v-if="saving" class="button-spinner"></span>
                <span v-else>Save Goal & Steps</span>
              </button>
              <button type="button" @click="regenerateSteps" :disabled="generating" class="next-button">
                <span v-if="generating" class="button-spinner"></span>
                <span v-else>Regenerate Steps</span>
              </button>
            </div>
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
          <button type="button" @click="saveGoal" :disabled="steps.length === 0 || !goalDescription.trim() || saving" class="primary-button">
            <span v-if="saving" class="button-spinner"></span>
            <span v-else>Save Goal & Steps</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>

import { ref } from 'vue';
import { useSharedGoalsStore } from '../stores/sharedGoals';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';
import draggable from 'vuedraggable';

// Catch any unhandled errors that might cause reload
window.addEventListener('error', (e) => {
  console.error('[Window Error Event]:', e.error, e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[Unhandled Promise Rejection]:', e.reason);
});

const emit = defineEmits(['close', 'goalCreated']);
const sharedGoalsStore = useSharedGoalsStore();
const auth = useAuthStore();
const router = useRouter();

const step = ref(1);
const method = ref(null); // 'generate' | 'manual'
const goalDescription = ref('');
const steps = ref([]);
const manualStepInput = ref('');
const validationError = ref('');
const generationError = ref('');
const generating = ref(false);
const saving = ref(false);
const goalIdRef = ref(null); // Store created goalId for later use
const originalStepIds = ref([]); // Track original backend step IDs to detect deletions

// User selection logic
const userList = ref([]);
const selectedUserId = ref('');

// Build collaborators list ONCE when modal opens (don't react to store changes during operation)
import { onMounted } from 'vue';
onMounted(() => {
  const userMap = {};
  const currentGoals = sharedGoalsStore.sharedGoals || [];
  currentGoals.forEach(goal => {
    (goal.users || []).forEach(u => {
      const id = typeof u === 'object' ? u.id : u;
      const displayname = typeof u === 'object' ? u.displayname : u;
      if (id && id !== auth.user.id) {
        userMap[id] = { id, name: displayname };
      }
    });
  });
  userList.value = Object.values(userMap).sort((a, b) => a.name.localeCompare(b.name));
  if (userList.value.length > 0) {
    selectedUserId.value = userList.value[0].id;
  }
});

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
  goalIdRef.value = null;
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
async function regenerateSteps() {
  const goalId = goalIdRef.value;
  if (!goalId) {
    generationError.value = 'Goal ID is missing. Cannot regenerate steps.';
    return;
  }
  generationError.value = '';
  generating.value = true;
  steps.value = [];
  try {
    const genResult = await sharedGoalsStore.regenerateSharedSteps({ sharedGoal: goalId, user: auth.user.id });
    
    // Check for errors first
    if (genResult && genResult.error) {
      generationError.value = genResult.error;
      generating.value = false;
      return;
    }
    
    // Extract steps array from response
    const generatedSteps = genResult?.steps || [];
    
    if (generatedSteps.length > 0) {
      steps.value = generatedSteps.map((s) => ({ id: s._id, description: s.description }));
      // Track original step IDs to detect deletions later
      originalStepIds.value = generatedSteps.map((s) => s._id);
      generationError.value = ''; // Clear any previous errors
    } else {
      generationError.value = 'No steps were generated. Try regenerating or add steps manually.';
    }
  } catch (e) {
    generationError.value = 'Failed to regenerate steps.';
  } finally {
    generating.value = false;
  }
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
      // 1. Create the goal (if not already created)
      const users = [auth.user.id, selectedUserId.value];
      let goalId = goalIdRef.value;
      if (!goalId) {
        const goalResult = await sharedGoalsStore.createSharedGoal({ users, description: goalDescription.value });
        goalId = goalResult?.sharedGoalId || goalResult?.goalId || goalResult?.id || goalResult;
        goalIdRef.value = goalId;
      }
      // 2. Generate steps using backend - returns { steps: [...], error: '...' }
      const genResult = await sharedGoalsStore.generateSharedSteps({ sharedGoal: goalId, user: auth.user.id });
      
      // Check for errors first
      if (genResult && genResult.error) {
        generationError.value = genResult.error;
        generating.value = false;
        step.value = 2; // Still go to step 2 so user can see error and regenerate
        return;
      }
      
      // 3. Extract steps array from response
      const generatedSteps = genResult?.steps || [];
      
      if (generatedSteps.length > 0) {
        steps.value = generatedSteps.map((s) => ({ id: s._id, description: s.description }));
        // Track original step IDs to detect deletions later
        originalStepIds.value = generatedSteps.map((s) => s._id);
        generationError.value = ''; // Clear any previous errors
      } else {
        console.warn('[GoalCreationModal] No steps generated')
        generationError.value = 'No steps were generated. Try regenerating or add steps manually.';
      }
      step.value = 2;
    } catch (e) {
      generationError.value = 'Failed to generate steps.';
      step.value = 2; // Still advance to step 2 so user can add manually
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
  if (!auth.user || !auth.user.id || typeof auth.user.id !== 'string') {
    generationError.value = 'User ID is missing or invalid. Please log in again.';
    return;
  }
  saving.value = true;
  
  let goalId = goalIdRef.value;
  
  try {
    // If goal not created (shouldn't happen, but fallback)
    if (!goalId) {
      const users = [auth.user.id, selectedUserId.value];
      const goalResult = await sharedGoalsStore.createSharedGoal({ users, description: goalDescription.value });
      goalId = goalResult?.sharedGoalId || goalResult?.goalId || goalResult?.id || goalResult;
      goalIdRef.value = goalId;
    }
    
    // Handle step deletions: remove any original steps that are no longer in the list
    const currentStepIds = steps.value.map(s => s.id).filter(id => typeof id === 'string');
    const deletedStepIds = originalStepIds.value.filter(id => !currentStepIds.includes(id));
    
    for (const stepId of deletedStepIds) {
      await sharedGoalsStore.removeSharedStep({ step: stepId, user: auth.user.id, sharedGoal: goalId });
    }
    
    // Delete all remaining original steps (they'll be re-added in correct order)
    const remainingOriginalIds = originalStepIds.value.filter(id => currentStepIds.includes(id));
    for (const stepId of remainingOriginalIds) {
      await sharedGoalsStore.removeSharedStep({ step: stepId, user: auth.user.id, sharedGoal: goalId });
    }
    
    // Add all steps in the current order (both edited originals and new manual steps)
    for (const stepObj of steps.value) {
      await sharedGoalsStore.addSharedStep({ sharedGoal: goalId, description: stepObj.description, user: auth.user.id });
    }

  } catch (e) {
    generationError.value = 'Failed to save goal.';
    saving.value = false;
    return;
  }
  
  saving.value = false;
  
  // Close modal immediately
  emit('close');
  
  // Then redirect to the new goal detail page
  router.push(`/goals/${goalId}`);
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
  background: var(--color-primary-light);
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
  border: 1.5px solid var(--color-primary-border);
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  font-size: 1rem;
  background: #f7fafd;
  color: var(--color-primary);
  transition: border-color 0.2s;
}

#goalDescription {
  background: #f7fafd;
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
  background: var(--color-primary-light);
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
  background: var(--color-accent-dark);
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
  background: #fae8d3;
  color: #fff;
  opacity: 0.6;
  cursor: not-allowed;
}
.next-button:hover:not(:disabled),
.primary-button:hover:not(:disabled) {
  background: var(--color-accent-dark);
}
.drag-handle {
  color: var(--color-secondary);
  font-size: 1.2em;
  user-select: none;
}
.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--color-primary-light);
  border-top: 4px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 2rem auto;
}

.button-spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
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
  background: #F9FAFB;
}
.error-message {
  color: var(--color-error);
  margin-top: 0.25em;
  background-color: var(--color-error-bg);
  border-radius: 8px;
  padding: 1rem;
  font-weight: 500;
}

.user-select {
  margin-bottom: 1rem;
  width: 100%;
  padding: 0.5rem;
  border-radius: 8px;
  border: 1.5px solid var(--color-primary-border);
  font-size: 1rem;
  background: #f7fafd;
  color: var(--color-primary);
  transition: border-color 0.2s;
}
.user-select:focus {
  outline: none;
  border-color: var(--color-primary);
}
.action-row {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

.error-banner {
  background: #ffebee;
  margin-top: 15px;
  border-radius: 8px;
  padding: 1rem 1.2rem;
  margin-bottom: 1.5rem;
  color: #c62828;
  font-size: 1rem;
}

.error-banner strong {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 1.05rem;
}
</style>
