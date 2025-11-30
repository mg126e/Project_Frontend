<template>
  <section class="auth-form">
    <h1>Register</h1>
    <form @submit.prevent="onRegister" class="register-form">
      <div class="form-group">
        <label for="register-username">Username</label>
        <input id="register-username" v-model="username" type="text" required />
      </div>
      <div class="form-group">
        <label for="register-email">Student Email (.edu)</label>
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
      :username="username"
      :email="email"
      :initialVerificationRecordId="verificationRecordId"
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
const verificationRecordId = ref(null)
const auth = useAuthStore()
const router = useRouter()

function isEduEmail(val) {
  return typeof val === 'string' && val.trim().toLowerCase().endsWith('.edu');
}

// Step 1: Request email verification
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
    // Do NOT send the verification email yet; just open the modal
    verificationRecordId.value = null
    showVerifyModal.value = true
    loading.value = false
  } catch (e) {
    loading.value = false
    error.value = e?.message || 'Failed to open verification modal.'
  }
}

// Step 2: After code is verified, register the user
async function handleVerified({ verificationCode }) {
  // Call the registration endpoint after successful verification
  loading.value = true
  try {
    const regResponse = await authRegisterAfterVerification(username.value, password.value, email.value, verificationRecordId.value, verificationCode)
    console.log('Registration response:', regResponse)
    if (regResponse.error) {
      error.value = regResponse.error
      loading.value = false
      return
    }
    // Store the session and user data if returned
    if (regResponse.session && regResponse.user) {
      const { setToStorage } = await import('../utils')
      const userData = {
        id: regResponse.user,
        username: username.value,
        email: email.value,
      }
      auth.user = userData
      auth.session = regResponse.session
      setToStorage('user', userData)
      setToStorage('session', regResponse.session)
      // Fetch the profile that was created after verification
      try {
        const { useProfileStore } = await import('@/stores/profile')
        const profileStore = useProfileStore()
        await profileStore.fetchProfile()
      } catch (e) {
        console.error('Failed to fetch profile after verification:', e)
      }
      showVerifyModal.value = false
      loading.value = false
      router.push('/dashboard')
    } else {
      error.value = 'Registration succeeded but user/session missing. Please log in.'
      loading.value = false
      showVerifyModal.value = false
    }
  } catch (e) {
    loading.value = false
    error.value = e?.message || 'Registration failed after verification.'
  }
}

// Helper: Call email verification endpoint
async function authRequestVerification(username, email) {
  try {
    const { ApiService } = await import('@/services/api')
    return await ApiService.post('/EmailVerification/requestVerification', { userId: username, email })
  } catch (e) {
    return { error: e?.message || 'Failed to request verification.' }
  }
}

// Helper: Call registration endpoint after verification
async function authRegisterAfterVerification(username, password, email, verificationRecordId, verificationCode) {
  try {
    const { ApiService } = await import('@/services/api')
    // This endpoint should check verification and create the user
    return await ApiService.post('/PasswordAuthentication/register', {
      username,
      password,
      email,
      verificationRecordId,
      verificationCode
    })
  } catch (e) {
    return { error: e?.message || 'Failed to register after verification.' }
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
  color: var(--color-error);
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
  background: var(--color-primary-light);
  text-decoration: none;
}
</style>