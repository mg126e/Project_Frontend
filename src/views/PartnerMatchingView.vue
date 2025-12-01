<template>
  <section class="partner-matching-page">
    <h1>Find a Running Partner</h1>
    <div class="partner-filters">
  <div class="filter-group">
    <label for="location-filter" class="filter-label">Location:</label>
    <select id="location-filter" v-model="locationFilter" class="filter-dropdown">
      <option value="all">All</option>
      <option v-for="loc in locationOptions" :key="loc" :value="loc">{{ loc }}</option>
    </select>
  </div>
  <div class="filter-group">
    <label for="level-filter" class="filter-label">Level:</label>
    <select id="level-filter" v-model="levelFilter" class="filter-dropdown">
      <option value="all">All</option>
      <option v-for="lvl in levelOptions" :key="lvl" :value="lvl">{{ lvl.charAt(0).toUpperCase() + lvl.slice(1) }}</option>
    </select>
  </div>
  <div class="filter-group">
    <label for="gender-filter" class="filter-label">Gender:</label>
    <select id="gender-filter" v-model="genderFilter" class="filter-dropdown">
      <option value="all">All</option>
      <option v-for="g in genderOptions" :key="g" :value="g">{{ g.charAt(0).toUpperCase() + g.slice(1) }}</option>
    </select>
  </div>
</div>
<div class="profiles-list">
  <UserProfileCard
    v-for="p in filteredProfiles"
    :key="p._id"
    :profile="p"
    @send-invite="openInviteModal"
  />
</div>
<ConfirmActionModal
  v-if="showInviteModal"
  :title="'Send Invite'"
  :message="inviteModalMessage"
  confirmText="Send Invite"
  confirmClass="accent"
  @close="showInviteModal = false"
  @confirm="confirmSendInvite"
/>

<InviteSentModal
  v-if="showSentModal"
  :recipient="sentInviteProfile?.displayname || ''"
  @close="showSentModal = false"
/>
  </section>
</template>

<script setup>

import InviteSentModal from '../components/InviteSentModal.vue'
import ConfirmActionModal from '../components/ConfirmActionModal.vue'
import { ref, computed } from 'vue'
import UserProfileCard from '../components/UserProfileCard.vue'

// Invite modal state
const showInviteModal = ref(false)
const showSentModal = ref(false)
const selectedInviteProfile = ref(null)
const sentInviteProfile = ref(null)
const inviteModalMessage = computed(() =>
  selectedInviteProfile.value
    ? `Are you sure you want to send an invite to ${selectedInviteProfile.value.displayname}?`
    : ''
)

function openInviteModal(profile) {
  selectedInviteProfile.value = profile
  showInviteModal.value = true
}

function confirmSendInvite() {
  // Here you would send the invite (API call, etc)
  showInviteModal.value = false
  sentInviteProfile.value = selectedInviteProfile.value
  showSentModal.value = true
  selectedInviteProfile.value = null
}

// Demo profiles array for dynamic filtering (expandable)
const profiles = ref([
  {
    _id: 'test202',
    displayname: 'Best Runner In The World',
    profileImage: '019ad70c-2c9d-7e39-b015-4085b7bfb45b',
    bio: 'Trying out running!',
    location: 'Boston, MA',
    emergencyContact: { name: 'Sally', phone: '123-456-7891' },
    tags: {
      gender: 'woman',
      age: 21,
      runningLevel: 'beginner',
      runningPace: '8:30',
      personality: 'introvert'
    },
    isActive: true
  },
  // Add more profiles here for demo/testing
])

const locationFilter = ref('all')
const levelFilter = ref('all')
const genderFilter = ref('all')

// Dynamic filter options
const locationOptions = computed(() => {
  const set = new Set()
  profiles.value.forEach(p => p.location && set.add(p.location))
  return Array.from(set)
})
const levelOptions = computed(() => {
  const set = new Set()
  profiles.value.forEach(p => p.tags?.runningLevel && set.add(p.tags.runningLevel))
  return Array.from(set)
})
const genderOptions = computed(() => {
  const set = new Set()
  profiles.value.forEach(p => p.tags?.gender && set.add(p.tags.gender))
  const arr = Array.from(set)
  const hasOther = arr.some(g => g !== 'man' && g !== 'woman')
  let result = []
  if (arr.includes('woman')) result.push('woman')
  if (arr.includes('man')) result.push('man')
  if (hasOther) result.push('other')
  return result
})

// Filtered profiles
const filteredProfiles = computed(() => {
  return profiles.value.filter(p => {
    const locMatch = locationFilter.value === 'all' || p.location === locationFilter.value
    const levelMatch = levelFilter.value === 'all' || p.tags?.runningLevel === levelFilter.value
    let genderMatch = true
    if (genderFilter.value === 'woman' || genderFilter.value === 'man') {
      genderMatch = p.tags?.gender === genderFilter.value
    } else if (genderFilter.value === 'other') {
      genderMatch = p.tags?.gender !== 'woman' && p.tags?.gender !== 'man'
    }
    return locMatch && levelMatch && genderMatch
  })
})
</script>

<style scoped>
.partner-filters {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-bottom: 1.5rem;
  gap: 1.5rem;
  flex-wrap: wrap;
}
.filter-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.filter-label {
  font-weight: 600;
  color: var(--color-primary);
  font-size: 1rem;
  white-space: nowrap;
}
.filter-dropdown {
  background: #f7fafd;
  color: var(--color-primary);
  border: 1.5px solid var(--color-primary-border);
  border-radius: 6px;
  padding: 0.45em 1.2em 0.45em 0.8em;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: border 0.18s;
  outline: none;
  min-width: 140px;
}
.filter-dropdown:focus {
  border-color: #106cb8;
}
.partner-matching-page {
  min-width: 800px;
  background: #fff;
  border-radius: 24px;
  padding: 3.5rem 4.5rem 3.5rem 4.5rem;
}
.profiles-list {
  display: flex;
  flex-wrap: wrap;
  gap: 2.5rem;
  margin-top: 2.5rem;
}
.profile-card {
  display: flex;
  align-items: flex-start;
  background: #f7fafd;
  border-radius: 16px;
  padding: 2.2rem 2.5rem;
  min-width: 340px;
  max-width: 420px;
  gap: 2rem;
}
.profile-avatar {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--color-primary-border);
  margin-right: 1.5rem;
}
.profile-info {
  flex: 1;
}
.profile-name {
  margin: 0 0 0.5rem 0;
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--color-primary);
}
.profile-bio {
  margin: 0 0 1.1rem 0;
  color: #555;
  font-size: 1.05rem;
}
.profile-meta {
  color: #888;
  font-size: 0.98rem;
  margin-bottom: 1.2rem;
  display: flex;
  gap: 0.7rem;
}
.btn-primary {
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.7em 1.5em;
  font-weight: 600;
  font-size: 1.05rem;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-primary:hover {
  background: var(--color-primary-dark);
}
</style>