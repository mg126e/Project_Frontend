<template>
  <section class="profile-edit">
    <h1>Edit Profile</h1>
    <form v-if="isEditMode" @submit.prevent="saveProfile" class="profile-form">
      <div class="form-group">
        <label for="displayname">Display Name <span class="required-star">*</span></label>
        <input id="displayname" v-model="profile.displayname" type="text" required />
      </div>
      <div class="profile-avatar-row">
        <div v-if="profile.profileImage" class="profile-preview-wrapper">
          <img :src="profile.profileImage" alt="Profile Preview" class="profile-preview" />
        </div>
        <div v-else class="profile-fallback-avatar">
          <span>{{ (auth.user?.username?.charAt(0) || '?').toUpperCase() }}</span>
        </div>
        <label for="profileImage" class="btn-upload">
          <input id="profileImage" type="file" @change="onImageChange" accept="image/*" class="profile-image-input" />
          <span>Choose Image</span>
        </label>
      </div>
      <div class="form-group">
        <label for="bio">Bio <span class="required-star">*</span></label>
        <textarea id="bio" v-model="profile.bio" rows="3" required />
      </div>
      <div class="form-group">
        <label for="location">Location <span class="required-star">*</span></label>
        <input id="location" v-model="profile.location" type="text" required placeholder="e.g. San Francisco, CA" />
        <span v-if="locationError" class="error-msg">Location must be in format: City, ST</span>
      </div>
      <div class="form-group">
        <label for="emergencyContact">Emergency Contact <span class="required-star">*</span></label>
        <input id="emergencyContact" v-model="profile.emergencyContact" type="text" required placeholder="Contact Name" style="margin-bottom:0.5em;" />
        <input id="emergencyContactPhone" v-model="profile.emergencyContactPhone" type="tel" required placeholder="Phone Number" @input="onEmergencyPhoneInput" />
        <span v-if="emergencyPhoneError" class="error-msg">Enter a valid phone number</span>
      </div>
      <div class="form-group">
        <label>Tags</label>
        <div class="tags-grid">
          <div>
            <label>Gender <span class="required-star">*</span></label>
            <select v-model="profile.tags.gender" required>
              <option value="">Select</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
            <input
              v-if="profile.tags.gender === 'other'"
              v-model="profile.tags.genderOther"
              type="text"
              placeholder="You may specify here"
              style="margin-top: 0.5em; width: 100%;"
              required
            />
          </div>
          <div>
            <label>Age <span class="required-star">*</span></label>
            <input v-model="profile.tags.age" type="number" min="0" required />
          </div>
          <div>
            <label>Running Level <span class="required-star">*</span></label>
            <select v-model="profile.tags.runningLevel" required>
              <option value="">Select</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div>
            <label>Running Pace (min/mile) <span class="required-star">*</span></label>
            <input v-model="profile.tags.runningPace" type="text" placeholder="e.g. 8:30" required @input="onPaceInput" />
            <span v-if="paceError" class="error-msg">Running pace must be in correct format (e.g. 8:30)</span>
          </div>
          <div>
            <label>Personality <span class="required-star">*</span></label>
            <select v-model="profile.tags.personality" required>
              <option value="">Select</option>
              <option value="introvert">Introvert</option>
              <option value="extrovert">Extrovert</option>
              <option value="ambivert">Ambivert</option>
            </select>
          </div>
        </div>
      </div>
      <button class="btn-primary" type="submit">Save Profile</button>
    </form>

    <div v-else class="profile-view-grid">
      <div class="profile-view-main">
        <div class="profile-view-tags">
          <div class="profile-tag-row"><span class="profile-label">Display Name</span><span class="profile-value">{{ profile.displayname }}</span></div>
          <div class="profile-tag-row"><span class="profile-label">Gender</span><span class="profile-value">{{ profile.tags.gender === 'other' ? profile.tags.genderOther : profile.tags.gender }}</span></div>
          <div class="profile-tag-row"><span class="profile-label">Age</span><span class="profile-value">{{ profile.tags.age }}</span></div>
          <div class="profile-tag-row"><span class="profile-label">Running Level</span><span class="profile-value">{{ profile.tags.runningLevel }}</span></div>
          <div class="profile-tag-row"><span class="profile-label">Running Pace</span><span class="profile-value">{{ profile.tags.runningPace }}</span></div>
          <div class="profile-tag-row"><span class="profile-label">Personality</span><span class="profile-value">{{ profile.tags.personality }}</span></div>
          <div class="profile-tag-row"><span class="profile-label">Location</span><span class="profile-value">{{ profile.location }}</span></div>
        </div>
        <div class="profile-view-avatar-large">
          <div v-if="profile.profileImage" class="profile-preview-wrapper">
            <img :src="profile.profileImage" alt="Profile Preview" class="profile-preview-large" />
          </div>
          <div v-else class="profile-fallback-avatar-large">
            <span>{{ (auth.user?.username?.charAt(0) || '?').toUpperCase() }}</span>
          </div>
        </div>
      </div>
      <div class="profile-view-bottom">
        <div class="profile-bottom-left">
          <span class="profile-label">Emergency Contact</span>
          <span class="profile-value">{{ profile.emergencyContact }}<br v-if="profile.emergencyContact && profile.emergencyContactPhone" />
            <span v-if="profile.emergencyContactPhone">📞 {{ profile.emergencyContactPhone }}</span>
          </span>
        </div>
        <div class="profile-bottom-right">
          <span class="profile-label">Bio</span>
          <span class="profile-value">{{ profile.bio }}</span>
        </div>
      </div>
      <button class="btn-primary" @click="isEditMode = true" style="margin-top:1.5rem;">Edit Profile</button>
    </div>

    <div v-if="isEditMode" class="change-password-trigger">
      <button class="btn-link" @click="showPasswordModal = true">Change Password</button>
      <button class="btn-link danger" @click="onDeleteUser">Delete Account</button>
    </div>

    <ChangePasswordModal
      v-if="showPasswordModal"
      :show="showPasswordModal"
      @close="showPasswordModal = false"
      @password-changed="onPasswordChanged"
    />
    <p v-if="passwordChangeMsg" class="success-msg">{{ passwordChangeMsg }}</p>
    <p v-if="deleteMsg" :class="{'error-msg': deleteMsgType==='error', 'success-msg': deleteMsgType==='success'}">{{ deleteMsg }}</p>
  </section>
</template>

<script setup>
import { useAuthStore } from '../stores/auth';
import { ref, computed, onMounted } from 'vue';
import ChangePasswordModal from '../components/ChangePasswordModal.vue';

const auth = useAuthStore();

const showPasswordModal = ref(false);
const deleteMsg = ref('');
const deleteMsgType = ref('');

// TODO: Replace with actual user/profile fetch from backend or Pinia store
const profile = ref({
  displayname: '',
  profileImage: '',
  bio: '',
  location: '',
  emergencyContact: '',
  emergencyContactPhone: '',
  tags: {
    gender: '',
    genderOther: '',
    age: '',
    runningLevel: '',
    runningPace: '',
    personality: '',
  },
});
const emergencyPhoneError = ref(false);
const passwordChangeMsg = ref('');
function validatePhone(phone) {
  // Accepts (123) 456-7890, 123-456-7890, 1234567890, 123.456.7890, 123 456 7890
  return /^(\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}$/.test(phone);
}

function onEmergencyPhoneInput() {
  emergencyPhoneError.value = !validatePhone(profile.value.emergencyContactPhone);
}



const isEditMode = ref(false);
const locationError = ref(false);
const paceError = ref(false);
const isProfileEmpty = computed(() => {
  const p = profile.value;
  return !p.displayname || !p.bio || !p.location || !p.emergencyContact || !p.emergencyContactPhone || !p.tags.gender || !p.tags.age || !p.tags.runningLevel || !p.tags.runningPace || !p.tags.personality;
});
function validatePaceFormat(pace) {
  // Accepts #:## or ##:##, minutes:seconds, 1 or 2 digits for minutes, always 2 digits for seconds
  return /^\d{1,2}:[0-5]\d$/.test(pace);
}

function onPaceInput() {
  paceError.value = !validatePaceFormat(profile.value.tags.runningPace);
}

onMounted(() => {
  if (isProfileEmpty.value) {
    isEditMode.value = true;
  }
});

function onImageChange(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      profile.value.profileImage = event.target.result;
    };
    reader.readAsDataURL(file);
  }
}

function validateLocationFormat(location) {
  // Accepts: City, ST (2 uppercase letters, optional spaces)
  return /^\s*[^,]+,\s*[A-Z]{2}\s*$/.test(location);
}

function saveProfile() {
  locationError.value = false;
  paceError.value = false;
  emergencyPhoneError.value = false;
  if (!validateLocationFormat(profile.value.location)) {
    locationError.value = true;
    return;
  }
  if (!validatePaceFormat(profile.value.tags.runningPace)) {
    paceError.value = true;
    return;
  }
  if (!validatePhone(profile.value.emergencyContactPhone)) {
    emergencyPhoneError.value = true;
    return;
  }
  // TODO: Connect to backend/Pinia store for saving
  isEditMode.value = false;
  alert('Profile saved! (Connect this to your backend)');
}

async function onDeleteUser() {
  if (confirm('Are you sure you want to delete your account? This cannot be undone.')) {
    const result = await auth.deleteUser();
    if (result === true) {
      deleteMsg.value = 'Account deleted. You have been logged out.';
      deleteMsgType.value = 'success';
    } else {
      deleteMsg.value = result || 'Failed to delete account.';
      deleteMsgType.value = 'error';
    }
  }
}

function onPasswordChanged(msg) {
  showPasswordModal.value = false;
  passwordChangeMsg.value = msg;
  setTimeout(() => { passwordChangeMsg.value = ''; }, 4000);
}
</script>

<style scoped>
.required-star {
  color: #d32f2f;
  font-size: 1.1em;
  margin-left: 0.15em;
  vertical-align: middle;
}
.profile-edit {
  max-width: 900px;
  margin: 3.5rem auto 0 auto;
  background: #fff;
  border-radius: 16px;
  border: 1.5px solid #e3e8f0;
  padding: 2.5rem 3.5rem 2.2rem 3.5rem;
  position: relative;
}
.profile-edit h1 {
  font-family: 'Monoton', cursive;
  color: var(--color-primary);
  font-size: 2.1rem;
  margin-bottom: 2.1rem;
  text-align: center;
  letter-spacing: 0.5px;
}
.profile-form {
  margin-bottom: 2.2rem;
}
.profile-view-grid {
  margin-bottom: 2.2rem;
  background: linear-gradient(120deg, #f7fafd 60%, #e3e8f0 100%);
  border-radius: 16px;
  padding: 2.2rem 3.5rem 1.5rem 3.5rem;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  border: 1.5px solid #e3e8f0;
  min-width: 600px;
  max-width: 900px;
}
.profile-view-main {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2.5rem;
}
.profile-view-tags {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  flex: 1;
  min-width: 180px;
}
.profile-tag-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  border-radius: 8px;
  padding: 0.5em 1em;
  font-size: 1.05rem;
  color: #333;
}
.profile-view-avatar-large {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  min-width: 140px;
}
.profile-preview-large {
  width: 130px;
  height: 130px;
  border-radius: 50%;
  object-fit: cover;
  background: #fff;
  border: 2.5px solid var(--color-primary);
}
.profile-fallback-avatar-large {
  width: 130px;
  height: 130px;
  border-radius: 50%;
  background: var(--color-accent, orange);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  font-weight: 700;
  color: #fff;
  user-select: none;
  border: 2.5px solid var(--color-primary);
}
.profile-view-bottom {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  margin-top: 2.2rem;
  gap: 2.5rem;
}
.profile-bottom-left, .profile-bottom-right {
  background: #fff;
  border-radius: 8px;
  padding: 1em 1.2em;
  font-size: 1.08rem;
  color: #333;
  flex: 1;
  min-width: 160px;
  max-width: 50%;
  display: flex;
  flex-direction: column;
  gap: 0.5em;
}
.profile-bottom-left .profile-label,
.profile-bottom-right .profile-label {
  font-weight: 600;
  color: var(--color-primary);
  margin-bottom: 0.2em;
}
.profile-bottom-left .profile-value,
.profile-bottom-right .profile-value {
  font-weight: 400;
  color: #222;
}
.form-group {
  margin-bottom: 1.3rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
}
.form-group label {
  font-weight: 500;
  margin-bottom: 0.4em;
  color: #222;
}
.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 0.6em 1em;
  border: 1.2px solid #e3e8f0;
  border-radius: 7px;
  font-size: 1rem;
  background: #f7fafd;
  color: #222;
  transition: border 0.2s;
}
.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  border: 1.5px solid var(--color-primary);
  outline: none;
}
.profile-avatar-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 2.1rem;
  gap: 0.7rem;
}
.profile-preview-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
}
.profile-preview {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  object-fit: cover;
  background: #fff;
  border: 2.5px solid var(--color-primary);
}
.profile-fallback-avatar {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  background: var(--color-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  font-weight: 700;
  color: #fff;
  user-select: none;
  border: 2.5px solid var(--color-primary);
}
.profile-image-input {
  display: none;
}
.btn-upload {
  display: inline-block;
  margin-top: 0.7rem;
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: 7px;
  padding: 0.6em 1.5em;
  font-weight: 600;
  font-size: 1.05rem;
  cursor: pointer;
  transition: background 0.2s;
  text-align: center;
  position: relative;
}
.btn-upload:hover {
  background: #106cb8;
}
.btn-upload span {
  pointer-events: none;
}
.tags-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.3rem 2.2rem;
  margin-top: 0.5rem;
  width: 100%;
}
.tags-grid > div {
  min-width: 120px;
  display: flex;
  flex-direction: column;
  gap: 0.3em;
}
.btn-primary {
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: 7px;
  padding: 0.7em 2em;
  font-weight: 600;
  font-size: 1.13rem;
  cursor: pointer;
  margin-top: 1.1rem;
  transition: background 0.2s;
}
.btn-primary:hover {
  background: #106cb8;
}
.change-password-trigger {
  display: flex;
  justify-content: flex-end;
  margin: 2.7rem 0 0 0;
  gap: 1.2rem;
}
.btn-link {
  background: none;
  color: var(--color-primary);
  border: none;
  padding: 0.5em 1em;
  font-size: 1rem;
  cursor: pointer;
  text-decoration: none;
  border-radius: 6px;
  transition: color 0.2s, background 0.2s;
}
.btn-link.danger {
  color: #d32f2f;
}
.btn-link:hover {
  color: #106cb8;
  background: #e3f1fc;
}
.btn-link.danger:hover {
  color: #b71c1c;
  background: #fdeaea;
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