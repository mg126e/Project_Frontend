<template>
  <section class="profile-edit">
    <h1>Edit Profile</h1>
    <form @submit.prevent="saveProfile" class="profile-form">
      <div class="form-group">
        <label for="displayname">Display Name</label>
        <input id="displayname" v-model="profile.displayname" type="text" required />
      </div>
      <div class="profile-avatar-row">
        <div v-if="profile.profileImage" class="profile-preview-wrapper">
          <img :src="profile.profileImage" alt="Profile Preview" class="profile-preview" />
        </div>
        <div v-else class="profile-fallback-avatar">
          <span>{{ (auth.user?.username?.charAt(0) || '?').toUpperCase() }}</span>
        </div>
        <input id="profileImage" type="file" @change="onImageChange" accept="image/*" class="profile-image-input" />
      </div>
      <div class="form-group">
        <label for="bio">Bio</label>
        <textarea id="bio" v-model="profile.bio" rows="3" />
      </div>
      <div class="form-group">
        <label for="location">Location</label>
        <input id="location" v-model="profile.location" type="text" />
      </div>
      <div class="form-group">
        <label for="emergencyContact">Emergency Contact</label>
        <input id="emergencyContact" v-model="profile.emergencyContact" type="text" />
      </div>
      <div class="form-group">
        <label>Tags</label>
        <div class="tags-grid">
          <div>
            <label>Gender</label>
            <select v-model="profile.tags.gender">
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
            />
          </div>
          <div>
            <label>Age</label>
            <input v-model="profile.tags.age" type="number" min="0" />
          </div>
          <div>
            <label>Running Level</label>
            <select v-model="profile.tags.runningLevel">
              <option value="">Select</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div>
            <label>Running Pace (min/mile)</label>
            <input v-model="profile.tags.runningPace" type="text" placeholder="e.g. 8:30" />
          </div>
          <div>
            <label>Personality</label>
            <select v-model="profile.tags.personality">
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

    <div class="change-password-trigger">
      <button class="btn-link" @click="showPasswordModal = true">Change Password</button>
      <button class="btn-link danger" @click="onDeleteUser">Delete Account</button>
    </div>

    <ChangePasswordModal
      v-if="showPasswordModal"
      :show="showPasswordModal"
      @close="showPasswordModal = false"
      @password-changed="onPasswordChanged"
    />
    <p v-if="deleteMsg" :class="{'error-msg': deleteMsgType==='error', 'success-msg': deleteMsgType==='success'}">{{ deleteMsg }}</p>
  </section>
</template>

<script setup>

import { useAuthStore } from '../stores/auth';
import { ref } from 'vue';
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
  tags: {
    gender: '',
    genderOther: '',
    age: '',
    runningLevel: '',
    runningPace: '',
    personality: '',
  },
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

function saveProfile() {
  // TODO: Connect to backend or Pinia store for saving
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
  // Optionally show a message
}
</script>

<style scoped>

.profile-edit {
  max-width: 480px;
  margin: 3.5rem auto 0 auto;
  background: #fff;
  border-radius: 18px;
  padding: 2.5rem 2.7rem 2.2rem 2.7rem;
  box-shadow: 0 4px 24px 0 rgba(0,0,0,0.07);
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
.profile-avatar-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 2.1rem;
  gap: 0.7rem;
}
.profile-image-input {
  margin-top: 0.7rem;
  font-size: 0.98rem;
  color: #444;
  background: #f7fafd;
  border: 1.2px solid #e3e8f0;
  border-radius: 7px;
  padding: 0.4em 0.8em;
  width: 80%;
  max-width: 260px;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  border: 1.5px solid #106cb8;
  outline: none;
}
.profile-preview {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  object-fit: cover;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.07);
}
.profile-preview-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
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
}
.profile-edit {
  max-width: 480px;
  margin: 3.5rem auto 0 auto;
  background: #fff;
  border-radius: 18px;
  padding: 2.5rem 2.7rem 2.2rem 2.7rem;
  position: relative;
}

.profile-form {
  margin-bottom: 2.2rem;
}
.profile-avatar-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 2.1rem;
  gap: 0.7rem;
}
.profile-image-input {
  margin-top: 0.7rem;
  font-size: 0.98rem;
  color: #444;
  background: #f7fafd;
  border: 1.2px solid #e3e8f0;
  border-radius: 7px;
  padding: 0.4em 0.8em;
  width: 80%;
  max-width: 260px;
}

.tags-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1.3rem;
  margin-top: 0.5rem;
.profile-preview {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  object-fit: cover;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.07);
}
}
.tags-grid > div {
  flex: 1 1 180px;
  min-width: 120px;
}
.profile-preview-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
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
.profile-fallback-avatar {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  background: orange;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  font-weight: 700;
  color: #fff;
  user-select: none;
  box-shadow: 0 2px 8px rgba(0,0,0,0.07);
}
}
.change-password-trigger {
  display: flex;
  justify-content: flex-end;
  margin: 2.7rem 0 0 0;
}
.form-group {
  margin-bottom: 1.3rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
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

.change-password-trigger {
  display: flex;
  justify-content: flex-end;
  margin: 2.5rem 0 0 0;
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

.change-password-form {
  margin: 0;
  background: none;
  box-shadow: none;
  padding: 0;
}
.change-password-form h2 {
  font-size: 1.3rem;
  color: var(--color-primary);
  margin-bottom: 1.2rem;
  text-align: center;
}
.modal-actions {
  display: flex;
  gap: 1.2rem;
  justify-content: flex-end;
  margin-top: 1.2rem;
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