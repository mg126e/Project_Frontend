<template>
  <div class="profile-card">
    <img
      class="profile-avatar"
      :src="profileImageUrl"
      alt="User avatar"
    />
    <div class="profile-info">
      <div class="profile-header-row">
        <h2 class="profile-name">{{ profile.displayname }}</h2>
      </div>
      <p class="profile-bio">{{ profile.bio }}</p>
      <div class="profile-meta">
        <span class="meta-label">Location:</span> <span>{{ profile.location }}</span>
      </div>
      <div class="profile-tags">
        <span class="tag">{{ profile.tags.gender }}</span>
        <span class="tag">{{ profile.tags.age }}</span>
        <span class="tag">{{ profile.tags.runningLevel }}</span>
        <span class="tag">{{ profile.tags.runningPace }} min/mi</span>
        <span class="tag">{{ profile.tags.personality }}</span>
      </div>
      <button class="btn-primary" @click="$emit('send-invite', profile)">Send Invite</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  profile: { type: Object, required: true },
})

const profileImageUrl = computed(() => {
  return props.profile.profileImage || 
         props.profile.profileImageUrl || 
         'https://media.istockphoto.com/id/628317758/vector/fit-couple-running-a-marathon-together.jpg?s=612x612&w=0&k=20&c=q9adFDtuz7CkLSb-u9U_ykVQdD0aBuWEHbtoCvJ94rQ='
})
</script>

<style scoped>
.profile-card {
  display: flex;
  align-items: flex-start;
  background: #f7fafd;
  border-radius: 20px;
  padding: 2.5rem 2.7rem;
  min-width: 340px;
  max-width: 440px;
  gap: 2.2rem;
  border: 1.5px solid var(--color-primary-border);
}
.profile-card:hover {
  border: 1.5px solid var(--color-primary);
}
.profile-avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--color-primary);
  margin-right: 1.7rem;
  background: #F9FAFB;
}
.profile-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}
.profile-meta {
  color: #888;
  font-size: 1rem;
  margin-bottom: 0.2rem;
  display: flex;
  gap: 0.5rem;
}
.meta-label {
  font-weight: 600;
  color: var(--color-primary);
}
.profile-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-bottom: 0.7rem;
}
.tag {
  background: var(--color-primary-light);
  color: var(--color-primary);
  border-radius: 6px;
  padding: 0.22em 0.9em;
  font-size: 0.98rem;
  font-weight: 600;
}
.profile-emergency {
  color: #b23b3b;
  font-size: 0.97rem;
  margin-bottom: 1.1rem;
  margin-top: 0.2rem;
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
.emergency-label {
  font-weight: 600;
  color: #b23b3b;
}
.btn-primary {
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: var(--color-primary);
  border: none;
  border-radius: 6px;
  padding: 0.7em 1.5em;
  font-weight: 600;
  font-size: 1.05rem;
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s;
  align-self: flex-start;
  margin-top: 0.7rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.3);
  font-family: 'Open Sans', Arial, sans-serif;
}

.btn-primary:hover {
  background: rgba(255, 255, 255, 0.3);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.4);
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
</style>
