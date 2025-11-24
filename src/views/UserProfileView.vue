<template>
  <section class="profile-edit">
    <h1>Edit Profile</h1>
    <form @submit.prevent="saveProfile">
      <div class="form-group">
        <label for="displayname">Display Name</label>
        <input id="displayname" v-model="profile.displayname" type="text" required />
      </div>
      <div class="form-group">
        <label for="profileImage">Profile Image</label>
        <input id="profileImage" type="file" @change="onImageChange" accept="image/*" />
        <img v-if="profile.profileImage" :src="profile.profileImage" alt="Profile Preview" class="profile-preview" />
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
            </select>
          </div>
        </div>
      </div>
      <button class="btn-primary" type="submit">Save Profile</button>
    </form>
  </section>
</template>

<script setup>
import { ref } from 'vue';
// TODO: Replace with actual user/profile fetch from backend or Pinia store
const profile = ref({
  displayname: '',
  profileImage: '',
  bio: '',
  location: '',
  emergencyContact: '',
  tags: {
    gender: '',
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
</script>

<style scoped>
.profile-edit {
  max-width: 500px;
  margin: 2rem auto;
  background: #fff;
  border-radius: 16px;
  padding: 2rem 2.5rem;
}
.profile-edit h1 {
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
.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 0.5em;
  border: 1.5px solid var(--color-primary);
  border-radius: 6px;
  font-size: 1rem;
  margin-bottom: 0.2rem;
}
.profile-preview {
  margin-top: 0.5rem;
  max-width: 120px;
  border-radius: 50%;
}
.tags-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1.2rem;
  margin-top: 0.5rem;
}
.tags-grid > div {
  flex: 1 1 180px;
  min-width: 120px;
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
.btn-primary:hover {
  background: #106cb8;
}
</style>