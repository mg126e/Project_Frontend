<template>
  <section class="partner-matching-page">
    <h1>Find a Running Partner</h1>
    
    <div v-if="error" class="error-banner">
      {{ error }}
    </div>
    
    <div v-if="loading && profiles.length === 0" class="loading-state">
      <div class="spinner"></div>
      <p>Loading users in your area...</p>
    </div>
    
    <template v-else>
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
      
      <div v-if="filteredProfiles.length === 0 && !loading" class="empty-state">
        <p>No users found in your area. Try adjusting your filters or check back later!</p>
      </div>
      
      <div v-else class="profiles-list">
        <UserProfileCard
          v-for="p in filteredProfiles"
          :key="p._id || p.userId"
          :profile="p"
          @send-invite="openInviteModal"
        />
      </div>
    </template>
    
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

<script setup lang="ts">
import InviteSentModal from '../components/InviteSentModal.vue'
import ConfirmActionModal from '../components/ConfirmActionModal.vue'
import { ref, computed, onMounted } from 'vue'
import UserProfileCard from '../components/UserProfileCard.vue'
import { ApiService } from '../services/api'
import { useProfileStore } from '../stores/profile'
import { useAuthStore } from '../stores/auth'

const profileStore = useProfileStore()
const authStore = useAuthStore()

// Loading and error states
const loading = ref(false)
const error = ref('')

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

// Profiles array - will be populated from API
const profiles = ref([])

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

// Filtered profiles (excluding current user)
const filteredProfiles = computed(() => {
  const currentUserId = authStore.user?.id
  return profiles.value.filter(p => {
    // Exclude current user
    if (p._id === currentUserId || p.userId === currentUserId) {
      return false
    }
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

// Helper function to resolve profile image URL
async function resolveProfileImage(profileImage: string | undefined): Promise<string> {
  if (!profileImage) {
    return 'https://media.istockphoto.com/id/628317758/vector/fit-couple-running-a-marathon-together.jpg?s=612x612&w=0&k=20&c=q9adFDtuz7CkLSb-u9U_ykVQdD0aBuWEHbtoCvJ94rQ='
  }
  
  try {
    const res = await ApiService.getDownloadURL(profileImage)
    const responseData = Array.isArray(res) ? res[0] : res
    
    if (responseData && 'downloadURL' in responseData) {
      let downloadURL = responseData.downloadURL
      if (downloadURL.startsWith('/api/')) {
        const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
        downloadURL = baseURL.replace(/\/api$/, '') + downloadURL
      }
      return downloadURL + '?t=' + Date.now()
    }
  } catch (err) {
    console.warn('Failed to resolve profile image:', err)
  }
  
  return 'https://media.istockphoto.com/id/628317758/vector/fit-couple-running-a-marathon-together.jpg?s=612x612&w=0&k=20&c=q9adFDtuz7CkLSb-u9U_ykVQdD0aBuWEHbtoCvJ94rQ='
}

// Fetch all users in the area
async function fetchUsersInArea() {
  loading.value = true
  error.value = ''
  
  try {
    // First, ensure we have the current user's profile to get their location
    if (!profileStore.profile.location) {
      await profileStore.fetchProfile()
    }
    
    const currentUserLocation = profileStore.profile.location
    const currentUserId = authStore.user?.id
    
    if (!currentUserLocation) {
      error.value = 'Please set your location in your profile to find users in your area.'
      return
    }
    
    // Extract region from location (e.g., "San Francisco, CA" -> "CA" or use full location)
    const locationParts = currentUserLocation.split(',')
    const region = locationParts.length > 1 ? locationParts[locationParts.length - 1].trim() : currentUserLocation.trim()
    
    let allProfiles = []
    
    // Try to fetch profiles by location first
    try {
      const result = await ApiService.callConceptAction<any>(
        'UserProfile',
        '_getProfilesByLocation',
        { location: currentUserLocation, region: region }
      )
      
      // Handle different response formats
      if (Array.isArray(result)) {
        allProfiles = result
      } else if (result && Array.isArray(result.profiles)) {
        allProfiles = result.profiles
      } else if (result && result.profiles && typeof result.profiles === 'object') {
        // If it's an object with profile data
        allProfiles = [result.profiles]
      }
    } catch (e) {
      // If _getProfilesByLocation doesn't exist, try _getAllProfiles
      try {
        const result = await ApiService.callConceptAction<any>(
          'UserProfile',
          '_getAllProfiles',
          {}
        )
        
        if (Array.isArray(result)) {
          allProfiles = result
        } else if (result && Array.isArray(result.profiles)) {
          allProfiles = result.profiles
        }
      } catch (e2) {
        console.warn('Could not fetch profiles by location or all profiles:', e2)
        error.value = 'Unable to fetch user profiles. Please try again later.'
        return
      }
    }
    
    // Filter profiles by location/region and exclude current user
    const profilesInArea = allProfiles.filter((profile: any) => {
      // Exclude current user
      if (profile._id === currentUserId || profile.userId === currentUserId) {
        return false
      }
      
      // Only include active profiles
      if (profile.isActive === false) {
        return false
      }
      
      // Filter by location/region
      if (!profile.location) {
        return false
      }
      
      // Match if location contains the region or matches the full location
      const profileLocation = profile.location.toLowerCase()
      const searchLocation = currentUserLocation.toLowerCase()
      const searchRegion = region.toLowerCase()
      
      return profileLocation.includes(searchRegion) || 
             profileLocation.includes(searchLocation) ||
             searchLocation.includes(profileLocation.split(',')[0]?.toLowerCase() || '')
    })
    
    // Resolve profile images for all profiles and normalize structure
    const profilesWithImages = await Promise.all(
      profilesInArea.map(async (profile: any) => {
        const imageUrl = await resolveProfileImage(profile.profileImage || profile.profileImageFileId)
        return {
          ...profile,
          _id: profile._id || profile.userId || profile.user,
          displayname: profile.displayname || profile.name || 'Unknown User',
          bio: profile.bio || '',
          location: profile.location || '',
          tags: profile.tags || {},
          profileImage: imageUrl,
          profileImageUrl: imageUrl
        }
      })
    )
    
    // Filter out profiles without required fields
    profiles.value = profilesWithImages.filter((p: any) => {
      return p.displayname && p.displayname !== 'Unknown User' && p.isActive !== false
    })
  } catch (e) {
    console.error('Error fetching users in area:', e)
    error.value = e instanceof Error ? e.message : 'Failed to fetch users in your area.'
  } finally {
    loading.value = false
  }
}

// Load users when component mounts
onMounted(() => {
  fetchUsersInArea()
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
  border-color: var(--color-primary-dark);
}
.partner-matching-page {
  min-width: 800px;
  background: #F9FAFB;
  border-radius: 24px;
  padding: 3.5rem 4.5rem 3.5rem 4.5rem;
}
.profiles-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2.5rem;
  margin-top: 2.5rem;
}
.loading-state {
  text-align: center;
  padding: 3rem;
}
.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--color-primary-border);
  border-top: 4px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.error-banner {
  background: #fee;
  color: #c33;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  border: 1px solid #fcc;
}
.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--color-secondary);
  font-size: 1.1rem;
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

