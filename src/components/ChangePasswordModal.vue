<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content small-modal">
      <form class="change-password-form" @submit.prevent="onSubmit">
        <h2>Change Password</h2>
        <div class="form-group">
          <label for="currentPassword">Current Password</label>
          <input id="currentPassword" v-model="form.current" type="password" required />
        </div>
        <div class="form-group">
          <label for="newPassword">New Password</label>
          <input id="newPassword" v-model="form.new" type="password" required />
        </div>
        <div class="form-group">
          <label for="confirmPassword">Confirm New Password</label>
          <input id="confirmPassword" v-model="form.confirm" type="password" required />
        </div>
        <div class="modal-actions">
          <button class="btn-primary" type="submit">Change</button>
          <button class="btn-link" type="button" @click="$emit('close')">Cancel</button>
        </div>
        <p v-if="error" class="error-msg">{{ error }}</p>
        <p v-if="success" class="success-msg">{{ success }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const emit = defineEmits(['close'])
const props = defineProps({
  show: Boolean
})
const form = ref({ current: '', new: '', confirm: '' })
const error = ref('')
const success = ref('')

watch(() => props.show, (val) => {
  if (!val) {
    form.value = { current: '', new: '', confirm: '' }
    error.value = ''
    success.value = ''
  }
})

function onSubmit() {
  error.value = ''
  success.value = ''
  if (form.value.new !== form.value.confirm) {
    error.value = 'New passwords do not match.'
    return
  }
  if (!form.value.new || !form.value.current) {
    error.value = 'Please fill in all fields.'
    return
  }
  // TODO: Call backend or store action to change password
  // Simulate success for now
  success.value = 'Password changed successfully! (Connect this to your backend)'
  form.value.current = ''
  form.value.new = ''
  form.value.confirm = ''
}
</script>

<style scoped>

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0,0,0,0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  min-width: 340px;
  max-width: 95vw;
  padding: 2.2rem 2.2rem 1.5rem 2.2rem;
  border-radius: 16px;
  background: #fff;
  position: relative;
  border: 1.5px solid #e3e8f0;
}
.change-password-form h2 {
  font-size: 1.18rem;
  color: var(--color-primary);
  margin-bottom: 1.2rem;
  text-align: center;
  letter-spacing: 0.1px;
}
.form-group {
  margin-bottom: 1.15rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.form-group label {
  font-weight: 600;
  margin-bottom: 0.3rem;
  letter-spacing: 0.1px;
}
.form-group input {
  width: 100%;
  padding: 0.5em;
  border: 1.5px solid var(--color-primary);
  border-radius: 7px;
  font-size: 1.04rem;
  background: #f9fafd;
  transition: border 0.2s;
}
.form-group input:focus {
  border: 1.5px solid #106cb8;
  outline: none;
}
.modal-actions {
  display: flex;
  gap: 1.1rem;
  justify-content: flex-end;
  margin-top: 1.2rem;
}
.btn-primary {
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: 7px;
  padding: 0.6em 1.7em;
  font-weight: 600;
  font-size: 1.05rem;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-primary:hover {
  background: #106cb8;
}
.btn-link {
  background: none;
  color: var(--color-primary);
  border: none;
  padding: 0.5em 1em;
  font-size: 1rem;
  cursor: pointer;
  text-decoration: underline;
  transition: color 0.2s;
}
.btn-link:hover {
  color: #106cb8;
}
.error-msg {
  color: #d32f2f;
  margin-top: 0.7rem;
  text-align: center;
}
.success-msg {
  color: #388e3c;
  margin-top: 0.7rem;
  text-align: center;
}
</style>
