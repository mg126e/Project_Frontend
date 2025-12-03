<template>
  <div class="modal-overlay">
    <div class="modal-content email-modal">
      <h2>Email Verification Required</h2>
      <p class="desc">Please verify your email address to complete registration.</p>
      <button class="btn-primary" @click="sendVerification" :disabled="sending || !canResend">
        {{ sending ? 'Sending...' : sent ? 'Resend Verification Email' : 'Send Verification Email' }}
      </button>

      <div v-if="sent" class="code-entry">
        <label for="verification-code">Enter verification code</label>
        <input
          id="verification-code"
          v-model="code"
          type="text"
          placeholder="6-digit code"
          maxlength="12"
        />
        <button class="btn-primary" @click="verifyCode" :disabled="verifying || !code">
          {{ verifying ? 'Verifying...' : 'Verify Code' }}
        </button>
      </div>

      <p v-if="error" class="error-msg">{{ error }}</p>
      <p v-if="successMessage" class="success-msg">{{ successMessage }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">


import { computed, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { ApiService } from '@/services/api'
import { useRouter } from 'vue-router'

const props = defineProps({
  userId: { type: String, default: '' }, // real userId from backend
  username: { type: String, default: '' },
  email: { type: String, default: '' },
  initialVerificationRecordId: { type: [String, null], default: null }
})

const emit = defineEmits(['close', 'verified'])
const sending = ref(false)
const sent = ref(false)
const verifying = ref(false)
const error = ref('')
const successMessage = ref('')
const code = ref('')
const verificationRecordId = ref<string | null>(null)
const verificationCodeEcho = ref<string | null>(null)
const canResend = ref(true)

// When the modal opens, sent is false, so the code entry is hidden until the user clicks the button

const auth = useAuthStore()
const router = useRouter()

// Debug: Watch for changes to verificationRecordId
watch(verificationRecordId, (newVal, oldVal) => {
  console.debug('[EmailVerification] verificationRecordId changed:', { oldVal, newVal })
})

function ensureUserContext() {
  // Prefer Pinia user, then props.userId, then props.username
  const userId = auth.user?.id || props.userId || props.username
  const email = auth.user?.email || props.email
  if (!userId) {
    throw new Error('Missing user information. Please log in again.')
  }
  if (!email) {
    throw new Error('We need an email address to verify your account.')
  }
  return { userId, email }
}

async function sendVerification() {
  error.value = ''
  successMessage.value = ''
  try {
    const { userId, email } = ensureUserContext()
    sending.value = true
    canResend.value = false
    const response = await ApiService.callConceptAction<{
      verificationRecordId?: string
      verificationCode?: string
      error?: string
    }>('EmailVerification', 'requestVerification', {
      userId,
      email,
    })

    console.debug('[EmailVerification] Response:', response)
    
    // Check for error in response
    if (response.error) {
      error.value = response.error
      canResend.value = true
      return
    }
    
    // Check for verificationRecordId
    if (!response.verificationRecordId) {
      console.error('[EmailVerification] Missing verificationRecordId. Response:', response)
      error.value = 'Server error: Missing verification record ID. Please try again.'
      canResend.value = true
      return
    }
    
    verificationRecordId.value = response.verificationRecordId
    verificationCodeEcho.value = response.verificationCode || null
    
    if (verificationCodeEcho.value) {
      console.debug('[EmailVerification] Verification code echo:', verificationCodeEcho.value)
    }
    
    sent.value = true
    successMessage.value = 'Verification email sent. Enter the code below.'
    // Allow resend after 30 seconds
    setTimeout(() => { canResend.value = true }, 30000)
  } catch (err: any) {
    console.error('[EmailVerification] Send error:', err)
    // Provide more helpful error messages
    if (err?.response?.status === 404) {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '/api (default - not set)'
      const attemptedUrl = `${apiBase}/EmailVerification/requestVerification`
      console.error(`[EmailVerification] 404 - Attempted URL: ${attemptedUrl}`)
      console.error(`[EmailVerification] VITE_API_BASE_URL: ${import.meta.env.VITE_API_BASE_URL || 'NOT SET'}`)
      error.value = `API endpoint not found (404). Attempted: ${attemptedUrl}. Please set VITE_API_BASE_URL environment variable in Render to your backend URL (e.g., https://your-backend.onrender.com) and redeploy.`
    } else if (err?.response?.status === 504 || err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')) {
      error.value = 'The backend server is taking too long to respond. This often happens when the server is spinning up from sleep. Please wait a moment and try again.'
    } else {
      error.value = err?.response?.data?.error || err?.message || 'Failed to send verification email.'
    }
    canResend.value = true
  } finally {
    sending.value = false
  }
}

async function verifyCode() {
  error.value = ''
  successMessage.value = ''

  if (!verificationRecordId.value) {
    error.value = 'Please send a verification email first.'
    return
  }

  const trimmedCode = code.value.trim()
  if (!trimmedCode) {
    error.value = 'Enter the verification code.'
    return
  }

  try {
    verifying.value = true
    const response = await ApiService.callConceptAction<{
      session?: string
      user?: string
      email?: string
      error?: string
    }>('EmailVerification', 'verifyEmail', {
      verificationRecordId: verificationRecordId.value,
      verificationCode: trimmedCode,
    })
    if (response.error) {
      error.value = response.error
      return
    }
    // If backend returns session and user, update auth store and persist to localStorage
    if (response.session && response.user) {
      auth.session = response.session
      auth.user = { id: response.user, email: response.email || '', username: props.username || '' }
      // Persist to localStorage so user stays logged in
      try {
        const { setToStorage } = await import('@/utils')
        setToStorage('user', auth.user)
        setToStorage('session', response.session)
      } catch (e) {
        // ignore storage errors
      }
    }
    successMessage.value = 'Email verified!'
    // Emit both verificationRecordId and verificationCode for registration
    emit('verified', {
      ...response,
      verificationRecordId: verificationRecordId.value,
      verificationCode: trimmedCode,
    })
    emit('close')
    // Don't navigate here - let the parent handle navigation after registration
  } catch (err: any) {
    console.error('[EmailVerification] Verify error:', err)
    // Provide more helpful error messages
    if (err?.response?.status === 504 || err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')) {
      error.value = 'The backend server is taking too long to respond. This often happens when the server is spinning up from sleep. Please wait a moment and try again.'
    } else {
      error.value = err?.response?.data?.error || err?.message || 'Invalid verification code.'
    }
  } finally {
    verifying.value = false
  }
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
  background: #F9FAFB;
  position: relative;
  border: 1.5px solid var(--color-primary-border);
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
.code-entry {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}
.code-entry input {
  padding: 0.6em;
  border: 1.5px solid var(--color-primary);
  border-radius: 6px;
  font-size: 1rem;
  letter-spacing: 2px;
  text-align: center;
}
.error-msg {
  color: var(--color-error);
  margin-top: 0.7rem;
  text-align: center;
}
.success-msg {
  color: var(--color-success);
  margin-top: 0.7rem;
  text-align: center;
}
</style>
