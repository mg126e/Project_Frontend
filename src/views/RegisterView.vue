<template>
  <section class="auth-form">
    <h1>Register</h1>
    <form @submit.prevent="onRegister" class="register-form">
      <div class="form-group">
        <label for="register-username">Username</label>
        <input id="register-username" v-model="username" type="text" required />
      </div>
      <div class="form-group">
        <label for="register-email">Email</label>
        <input id="register-email" v-model="email" type="email" required @input="onEmailInput" />
        <span v-if="email && email.length > 0 && !isEduEmail(email)" class="error-msg">Email must end with .edu</span>
      </div>
      <div class="form-group">
        <label for="register-password">Password</label>
        <input id="register-password" v-model="password" type="password" required minlength="8" @input="onPasswordInput" />
        <span v-if="password && password.length > 0 && password.length < 8" class="error-msg">Password must be at least 8 characters.</span>
      </div>
      <button class="btn-primary" type="submit" :disabled="loading || password.length < 8 || !isEduEmail(email)">Register</button>
      <p v-if="error" class="error-msg">{{ error }}</p>
    </form>
    <p class="switch-link">Already have an account? <router-link to="/login">Login</router-link></p>
    <p class="switch-link"><router-link to="/">Back to Home</router-link></p>
    <EmailVerificationModal
      v-if="showVerifyModal"
      @close="showVerifyModal = false"
      @verified="handleVerified"
    />
  </section>
</template>

<script setup>

import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import EmailVerificationModal from '../components/EmailVerificationModal.vue'


const username = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const showVerifyModal = ref(false)
const auth = useAuthStore()
const router = useRouter()


function isEduEmail(val) {
  return typeof val === 'string' && val.trim().toLowerCase().endsWith('.edu');
}

async function onRegister() {
  error.value = ''
  if (password.value.length < 8) {
    error.value = 'Password must be at least 8 characters.';
    return;
  }
  if (!isEduEmail(email.value)) {
    error.value = 'Email must end with .edu';
    return;
  }
  loading.value = true
  try {
    await auth.register(username.value, password.value, email.value)
    loading.value = false
    showVerifyModal.value = true
  } catch (e) {
    loading.value = false
    error.value = e?.message || 'Registration failed.'
  }
}

function handleVerified() {
  showVerifyModal.value = false
  router.push('/dashboard')
}
</script>

<style scoped>
.auth-form {
  max-width: 400px;
  margin: 2rem auto;
  background: #fff;
  border-radius: 16px;
  padding: 2rem 2.5rem;
}
.auth-form h1 {
  font-family: 'Monoton', cursive;
  color: var(--color-primary);
  font-size: 2rem;
  margin-bottom: 1.5rem;
  text-align: center;
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
.form-group input {
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
.error-msg {
  color: #d32f2f;
  margin-top: 0.7rem;
  text-align: center;
}
.switch-link {
  margin-top: 1.5rem;
  text-align: center;
}
.switch-link a {
  color: var(--color-primary);
  text-decoration: none;
  border-radius: 6px;
  padding: 0.1em 0.4em;
  transition: color 0.2s, background 0.2s;
}
.switch-link a:hover {
  color: #106cb8;
  background: #e3f1fc;
  text-decoration: none;
}
</style>