<template>
  <div class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <button class="close-btn" @click="close">&times;</button>
      <div class="profile-header">
        <img :src="profileImageUrl" class="profile-avatar" alt="Profile avatar" />
        <div>
          <h2 class="profile-name">{{ profile.displayname }}</h2>
          <p v-if="profile.username" class="profile-username">@{{ profile.username }}</p>
          <p class="profile-bio">{{ profile.bio || 'No bio available' }}</p>
        </div>
      </div>
      <div class="profile-details">
        <div class="profile-detail-row">
          <span class="detail-label">Location:</span>
          <span class="detail-value">{{ profile.location || 'Not specified' }}</span>
        </div>
        <div class="profile-detail-row">
          <span class="detail-label">Gender:</span>
          <span class="detail-value">{{ profile.tags?.gender || 'Not specified' }}</span>
        </div>
        <div class="profile-detail-row">
          <span class="detail-label">Age:</span>
          <span class="detail-value">{{ profile.tags?.age || 'Not specified' }}</span>
        </div>
        <div class="profile-detail-row">
          <span class="detail-label">Running Level:</span>
          <span class="detail-value">{{ profile.tags?.runningLevel || 'Not specified' }}</span>
        </div>
        <div class="profile-detail-row">
          <span class="detail-label">Running Pace:</span>
          <span class="detail-value">{{ profile.tags?.runningPace ? `${profile.tags.runningPace} min/mi` : 'Not specified' }}</span>
        </div>
        <div class="profile-detail-row">
          <span class="detail-label">Personality:</span>
          <span class="detail-value">{{ profile.tags?.personality || 'Not specified' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  profile: { type: Object, required: true },
  show: { type: Boolean, default: false },
});
const emit = defineEmits(['close']);

const profileImageUrl = computed(() => {
  return props.profile.profileImage || 
         props.profile.profileImageUrl || 
         'https://media.istockphoto.com/id/628317758/vector/fit-couple-running-a-marathon-together.jpg?s=612x612&w=0&k=20&c=q9adFDtuz7CkLSb-u9U_ykVQdD0aBuWEHbtoCvJ94rQ='
})

function close() {
  emit('close');
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  background: #F9FAFB;
  border-radius: 18px;
  min-width: 340px;
  max-width: 420px;
  padding: 2.2rem 2.5rem 1.5rem 2.5rem;
  position: relative;
}
.close-btn {
  position: absolute;
  top: 1.1rem;
  right: 1.1rem;
  background: none;
  border: none;
  font-size: 2rem;
  color: var(--color-primary);
  cursor: pointer;
}
.profile-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 1.2rem;
}
.profile-avatar {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--color-primary);
  background: #F9FAFB;
}
.profile-name {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--color-primary);
}
.profile-username {
  margin: 0.2rem 0 0 0;
  color: #888;
  font-size: 0.95rem;
  font-weight: 500;
}
.profile-bio {
  margin: 0.5rem 0 0 0;
  color: #555;
  font-size: 1.05rem;
  line-height: 1.5;
}
.profile-details {
  margin-top: 1.2rem;
  padding-top: 1.2rem;
  border-top: 1px solid var(--color-primary-border);
}
.profile-detail-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.8rem;
  gap: 1rem;
}
.detail-label {
  font-weight: 600;
  color: var(--color-primary);
  font-size: 0.95rem;
  min-width: 120px;
}
.detail-value {
  color: #555;
  font-size: 0.95rem;
  text-align: right;
  flex: 1;
}
</style>
