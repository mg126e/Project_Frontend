<template>
  <section class="auth-form">
    <h1>Login</h1>
    <form @submit.prevent="onLogin">
      <div class="form-group">
        <label for="login-username">Username</label>
        <input id="login-username" v-model="username" type="text" required />
      </div>
      <div class="form-group">
        <label for="login-password">Password</label>
        <input id="login-password" v-model="password" type="password" required />
      </div>
      <button class="btn-primary" type="submit" :disabled="loading">Login</button>
      <p v-if="error" class="error-msg">{{ error }}</p>
    </form>
    <p class="switch-link">Don't have an account? <router-link to="/register">Register</router-link></p>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const router = useRouter()
const auth = useAuthStore()

async function onLogin() {
  error.value = ''
  loading.value = true
  const success = await auth.login(username.value, password.value)
  loading.value = false
  if (success) {
    router.push({ name: 'home' })
  } else {
    error.value = 'Invalid username or password.'
  }
}
</script>

<style scoped>
.auth-form {
  max-width: 400px;
  margin: 2rem auto;
  background: #fff;
  border-radius: 16px;
  padding: 2rem 2.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
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
  text-decoration: underline;
}
</style>