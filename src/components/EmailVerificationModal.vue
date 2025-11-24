<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content email-modal">
      <h2>Email Verification Required</h2>
      <p class="desc">Please verify your email address to complete registration.</p>
      <button class="btn-primary" @click="sendVerification" :disabled="sending">
        {{ sent ? 'Verification Email Sent!' : sending ? 'Sending...' : 'Send Verification Email' }}
      </button>
      <button class="btn-link" @click="$emit('close')">Close</button>
      <p v-if="error" class="error-msg">{{ error }}</p>
      <p v-if="sent" class="success-msg">Check your inbox for a verification link.</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const emit = defineEmits(['close'])
const sending = ref(false)
const sent = ref(false)
const error = ref('')

function sendVerification() {
  error.value = ''
  sending.value = true
  setTimeout(() => {
    // Simulate API call
    sending.value = false
    sent.value = true
  }, 1200)
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
.modal-content.email-modal {
  min-width: 320px;
  max-width: 95vw;
  padding: 2.2rem 2.2rem 1.5rem 2.2rem;
  border-radius: 16px;
  background: #fff;
  position: relative;
  border: 1.5px solid #e3e8f0;
  text-align: center;
}
.email-modal h2 {
  font-size: 1.18rem;
  color: var(--color-primary);
  margin-bottom: 1.1rem;
  letter-spacing: 0.1px;
}
.email-modal .desc {
  margin-bottom: 1.2rem;
  color: #444;
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
  margin-bottom: 1rem;
}
.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.btn-primary:hover:not(:disabled) {
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
