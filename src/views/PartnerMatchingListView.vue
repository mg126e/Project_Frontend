<template>
  <section class="partner-matching-page">
    <h1>Find a Running Partner</h1>
    <p class="page-description">Send a request and if you match you can message and set up runs together!</p>
    
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
          <label for="level-filter" class="filter-label">Running Level:</label>
          <select id="level-filter" v-model="levelFilter" class="filter-dropdown">
            <option value="all">All</option>
            <option v-for="level in levelOptions" :key="level" :value="level">{{ level.charAt(0).toUpperCase() + level.slice(1) }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label for="location-filter" class="filter-label">Location:</label>
          <select id="location-filter" v-model="locationFilter" class="filter-dropdown">
            <option value="all">All</option>
            <option v-for="loc in locationOptions" :key="loc" :value="loc">{{ loc }}</option>
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
        <p v-if="!profileStore.profile.tags?.runningLevel || !profileStore.profile.tags?.runningPace">
          Please complete your profile with running level and pace to see matching partners.
        </p>
        <p v-else>
          No users found matching your criteria (pace: {{ profileStore.profile.tags.runningPace }}). Try adjusting your filters or check back later!
        </p>
      </div>
      
      <div v-else class="profiles-list">
        <UserProfileCard
          v-for="p in filteredProfiles"
          :key="p._id || p.userId"
          :profile="p"
          :has-thumbs-up="thumbsUpsSent.has(p._id || p.userId)"
          :has-mutual-match="getMutualMatchForProfile(p)"
          @send-invite="handleThumbsUp"
          @chat="navigateToChat"
          @show-profile="handleShowProfile"
          @unmatch="handleUnmatch"
        />
      </div>
    </template>
    
    <ConfirmActionModal
      v-if="showInviteModal"
      :title="'Send Request'"
      :message="inviteModalMessage"
      confirmText="Send Request"
      confirmClass="accent"
      @close="showInviteModal = false"
      @confirm="confirmSendInvite"
    />

    <ConfirmActionModal
      v-if="showUnmatchModal"
      :title="'Unmatch'"
      :message="unmatchModalMessage"
      confirmText="Unmatch"
      confirmClass="danger"
      @close="showUnmatchModal = false"
      @confirm="confirmUnmatch"
    />

    <ProfileSnapshotModal
      v-if="showProfileModal && selectedProfile"
      :profile="selectedProfile"
      :show="showProfileModal"
      @close="showProfileModal = false"
    />

  </section>
</template>

<script setup lang="ts">
import ConfirmActionModal from '../components/ConfirmActionModal.vue'
import ProfileSnapshotModal from '../components/ProfileSnapshotModal.vue'
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import UserProfileCard from '../components/UserProfileCard.vue'
import { ApiService } from '../services/api'
import { useProfileStore } from '../stores/profile'
import { useAuthStore } from '../stores/auth'

const profileStore = useProfileStore()
const authStore = useAuthStore()
const router = useRouter()

// Loading and error states
const loading = ref(false)
const error = ref('')

// Invite modal state
const showInviteModal = ref(false)
const selectedInviteProfile = ref(null)
const inviteModalMessage = computed(() =>
  selectedInviteProfile.value
    ? `Send a request to ${selectedInviteProfile.value.displayname}?`
    : ''
)

// Unmatch modal state
const showUnmatchModal = ref(false)
const selectedUnmatchProfile = ref(null)
const unmatchModalMessage = computed(() =>
  selectedUnmatchProfile.value
    ? `Are you sure you want to unmatch with ${selectedUnmatchProfile.value.displayname}? This will delete your conversation and you won't be able to message each other.`
    : ''
)

// Profile modal state
const showProfileModal = ref(false)
const selectedProfile = ref(null)

// Track thumbs-ups sent by current user
const thumbsUpsSent = ref(new Set())

// Track suggestion IDs for sent requests (profileId -> suggestionId)
const suggestionIds = ref(new Map<string, string>())

// Track thumbs-ups received from other users (from backend)
const thumbsUpsReceived = ref(new Set())

// Track mutual matches per profile (cached results from _hasMutualMatch)
const mutualMatchCache = ref(new Map<string, boolean>())

// Track active match IDs: userId -> matchId (for unmatch functionality)
const activeMatchIds = ref(new Map<string, string>())

// Check if a profile has a mutual match with current user
async function checkMutualMatch(profileId: string): Promise<boolean> {
  // Check cache first
  if (mutualMatchCache.value.has(profileId)) {
    return mutualMatchCache.value.get(profileId) || false
  }
  
  try {
    const session = authStore.session
    if (!session) return false
    
    const result = await ApiService.callConceptAction('UserProfile', '_hasMutualMatch', {
      session,
      otherUser: profileId
    })
    
    // Response format: { hasMutualMatch: true/false }
    const hasMatch = result?.hasMutualMatch === true
    mutualMatchCache.value.set(profileId, hasMatch)
    return hasMatch
  } catch (e) {
    console.error('[checkMutualMatch] Error:', e)
    return false
  }
}

async function handleThumbsUp(profile) {
  const profileId = profile._id || profile.userId
  if (!profileId) return
  
  // If request already sent, unsend it
  if (thumbsUpsSent.value.has(profileId)) {
    await handleUnsendRequest(profile)
    return
  }
  
  // Open confirmation modal first
  openInviteModal(profile)
}

async function confirmSendInvite() {
  if (!selectedInviteProfile.value) return
  
  const profile = selectedInviteProfile.value
  // Prefer userId over _id since backend uses user IDs
  const recipientId = profile.userId || profile._id || profile.id
  
  try {
    const session = authStore.session
    if (!session) {
      error.value = 'Session not found'
      return
    }
    
    // Call suggestMatch API - use recipientId (the person who will receive the request)
    const result = await ApiService.callConceptAction('UserProfile', 'suggestMatch', {
      session,
      otherUser: recipientId
    })
    
    // Check for errors
    if (result && typeof result === 'object' && 'error' in result) {
      error.value = result.error as string
      showInviteModal.value = false
      selectedInviteProfile.value = null
      return
    }
    
    // Success - mark as sent and store suggestion ID if available
    // recipientId is the person who received the request
    // Store with all possible ID formats for lookup
    const allRecipientIdVariants = [
      recipientId,
      profile._id,
      profile.userId,
      profile.id
    ].filter(Boolean)
    
    allRecipientIdVariants.forEach(id => {
      thumbsUpsSent.value.add(id)
    })
    
    // Store suggestion ID if present in response (response format: { request: '...', hasMutualMatch: true })
    // Map suggestion ID to recipient ID (the person who received the request)
    if (result && typeof result === 'object' && 'request' in result && result.request) {
      const suggestionId = result.request as string
      // Store with all ID variants for reliable lookup
      allRecipientIdVariants.forEach(id => {
        suggestionIds.value.set(id, suggestionId)
      })
      console.log('[confirmSendInvite] Stored suggestion ID:', suggestionId, 'for recipient:', recipientId)
    }
    
    // Check if response indicates a mutual match was created
    const hasMutualMatch = result?.hasMutualMatch === true
    
    if (hasMutualMatch) {
      // Mutual match created! Update cache and navigate to chat
      allRecipientIdVariants.forEach(id => {
        mutualMatchCache.value.set(id, true)
      })
      showInviteModal.value = false
      selectedInviteProfile.value = null
      
      // Immediately navigate to chat with the match (using thread ID)
      await navigateToChat(recipientId)
    } else {
      // Check if mutual match exists (might have been created by other user)
      const hasMutual = await checkMutualMatch(recipientId)
      if (hasMutual) {
        allRecipientIdVariants.forEach(id => {
          mutualMatchCache.value.set(id, true)
        })
        // Navigate to chat if mutual match exists (using thread ID)
        await navigateToChat(recipientId)
      } else {
        // No mutual match yet, just close the modal
        showInviteModal.value = false
        selectedInviteProfile.value = null
      }
    }
  } catch (e) {
    console.error('[confirmSendInvite] Error:', e)
    error.value = e instanceof Error ? e.message : 'Failed to send request'
    showInviteModal.value = false
    selectedInviteProfile.value = null
  }
}

async function handleUnsendRequest(profile) {
  // Get the recipient user ID (the person who received the request)
  // Try both _id and userId since profile IDs and user IDs might be different
  const recipientId = profile.userId || profile._id || profile.id
  if (!recipientId) {
    console.error('[handleUnsendRequest] No recipient ID found in profile:', profile)
    return
  }
  
  try {
    const session = authStore.session
    if (!session) {
      error.value = 'Session not found'
      return
    }
    
    // Get the current user's ID (the person who sent the request - the candidate)
    const candidateId = authStore.user?.id
    if (!candidateId) {
      error.value = 'User ID not found'
      return
    }
    
    console.log('[handleUnsendRequest] Looking up suggestion ID for candidate:', candidateId, 'recipient:', recipientId)
    
    // First, try to get suggestion ID from cache
    let suggestionId: string | undefined = suggestionIds.value.get(recipientId)
    
    // If not in cache, use the new API to directly fetch the suggestion ID
    if (!suggestionId) {
      try {
        const result = await ApiService.callConceptAction<any>('PartnerMatching', '_getSuggestionIdForUser', {
          session,
          candidate: candidateId,
          recipient: recipientId
        })
        
        // Response might be just the ID string, or an object with suggestionId
        if (typeof result === 'string') {
          suggestionId = result
        } else if (result && typeof result === 'object') {
          suggestionId = result.suggestionId || result.suggestion || result._id || result.id
        }
        
        if (suggestionId) {
          console.log('[handleUnsendRequest] Found suggestion ID via API:', suggestionId)
          // Cache it for future use
          suggestionIds.value.set(recipientId, suggestionId)
        } else {
          console.warn('[handleUnsendRequest] API returned no suggestion ID. Response:', result)
        }
      } catch (apiError) {
        console.error('[handleUnsendRequest] Error fetching suggestion ID from API:', apiError)
        // Continue - we'll try to update local state anyway
      }
    } else {
      console.log('[handleUnsendRequest] Using cached suggestion ID:', suggestionId)
    }
    
    // If we have a suggestion ID, call declineSuggestion
    if (suggestionId) {
      await ApiService.callConceptAction('PartnerMatching', 'declineSuggestion', {
        suggestion: suggestionId,
        recipient: recipientId,
        candidate: candidateId
      })
      console.log('[handleUnsendRequest] Successfully declined suggestion:', suggestionId)
    } else {
      // If no suggestion ID found, the request might have already been declined, accepted, or expired
      console.warn('[handleUnsendRequest] No suggestion ID found - request may have already been processed')
      // Still update local state to reflect user's intent
    }
    
    // Remove from sent thumbs-ups and suggestion IDs (using all possible ID formats)
    const allRecipientIdVariants = [
      recipientId,
      profile._id,
      profile.userId,
      profile.id
    ].filter(Boolean)
    
    allRecipientIdVariants.forEach(id => {
      thumbsUpsSent.value.delete(id)
      suggestionIds.value.delete(id)
      mutualMatchCache.value.delete(id)
    })
  } catch (e) {
    console.error('[handleUnsendRequest] Error:', e)
    error.value = e instanceof Error ? e.message : 'Failed to unsend request'
    
    // Even if API call fails, update local state to reflect user's intent
    const allRecipientIdVariants = [
      recipientId,
      profile._id,
      profile.userId,
      profile.id
    ].filter(Boolean)
    
    allRecipientIdVariants.forEach(id => {
      thumbsUpsSent.value.delete(id)
      suggestionIds.value.delete(id)
      mutualMatchCache.value.delete(id)
    })
  }
}

function openInviteModal(profile) {
  selectedInviteProfile.value = profile
  showInviteModal.value = true
}

async function handleShowProfile(profile) {
  // Fetch username if not already in profile
  const profileId = profile._id || profile.userId
  if (!profile.username && profileId) {
    try {
      const usernameResult = await ApiService.callConceptAction<{ username: string } | { error: string }>(
        'PasswordAuthentication',
        '_getUsername',
        { user: profileId }
      )
      if (usernameResult && !('error' in usernameResult)) {
        profile.username = usernameResult.username
      }
    } catch (e) {
      console.warn('Failed to fetch username for profile:', e)
    }
  }
  
  selectedProfile.value = profile
  showProfileModal.value = true
}

async function navigateToChat(profileId: string) {
  try {
    const session = authStore.session
    if (!session) {
      error.value = 'Session not found'
      return
    }
    
    // Call _getOrCreateThreadForMatchedUser to get or create the thread
    const result = await ApiService.callConceptAction('UserProfile', '_getOrCreateThreadForMatchedUser', {
      session,
      otherUser: profileId
    })
    
    // Check for errors
    if (result && typeof result === 'object' && 'error' in result) {
      error.value = result.error as string
      return
    }
    
    // Extract thread ID from response
    // Response format: { threadId: '...' } or { thread: '...' } or just the threadId string
    let extractedThreadId: string | undefined
    
    if (typeof result === 'string') {
      extractedThreadId = result
    } else if (result && typeof result === 'object') {
      extractedThreadId = result.threadId || result.thread || (result._id as string)
    }
    
    if (!extractedThreadId) {
      error.value = 'Failed to get thread ID from response'
      return
    }
    
    // Navigate to chat with thread ID
    router.push(`/chat/${extractedThreadId}`)
  } catch (e) {
    console.error('[navigateToChat] Error:', e)
    error.value = e instanceof Error ? e.message : 'Failed to open chat'
  }
}

function handleUnmatch(profile: any) {
  selectedUnmatchProfile.value = profile
  showUnmatchModal.value = true
}

async function confirmUnmatch() {
  if (!selectedUnmatchProfile.value) {
    showUnmatchModal.value = false
    return
  }

  const profile = selectedUnmatchProfile.value
  const otherUserId = profile.userId || profile._id || profile.id
  const currentUserId = authStore.user?.id

  if (!otherUserId || !currentUserId) {
    error.value = 'Missing user information'
    showUnmatchModal.value = false
    return
  }

  try {
    const session = authStore.session
    if (!session) {
      error.value = 'Session not found'
      showUnmatchModal.value = false
      return
    }

    // Step 1: Get thread ID
    let threadId: string | undefined
    try {
      const threadsResult = await ApiService.callConceptAction<any>(
        'Messaging',
        '_getThreadsForUser',
        { user: currentUserId }
      )

      const threads = Array.isArray(threadsResult) 
        ? threadsResult 
        : threadsResult?.threads || []

      // Find thread where userA or userB matches the other user
      const matchingThread = threads.find((thread: any) => {
        const userA = thread.userA
        const userB = thread.userB
        return (userA === otherUserId || userA === profile._id || userA === profile.id) ||
               (userB === otherUserId || userB === profile._id || userB === profile.id)
      })

      if (matchingThread) {
        threadId = matchingThread._id || matchingThread.id
        console.log('[confirmUnmatch] Found thread ID:', threadId)
      } else {
        console.warn('[confirmUnmatch] No thread found for users:', { currentUserId, otherUserId })
      }
    } catch (e) {
      console.error('[confirmUnmatch] Error fetching threads:', e)
      // Continue - thread might not exist yet
    }

    // Step 2: Get match ID from stored active matches
    // Try all ID variants to find the match ID
    const profileIdVariants = [
      otherUserId,
      profile._id,
      profile.userId,
      profile.id
    ].filter(Boolean)
    
    let matchId: string | undefined
    for (const id of profileIdVariants) {
      const storedMatchId = activeMatchIds.value.get(id)
      if (storedMatchId) {
        matchId = storedMatchId
        console.log('[confirmUnmatch] Found match ID from cache:', matchId, 'for user ID:', id)
        break
      }
    }
    
    if (!matchId) {
      console.warn('[confirmUnmatch] No match ID found in cache for user:', otherUserId, 'variants:', profileIdVariants)
      console.warn('[confirmUnmatch] Available match IDs:', Array.from(activeMatchIds.value.entries()))
    }

    // Step 3: Unmatch the users
    if (matchId) {
      try {
        await ApiService.callConceptAction('PartnerMatching', 'unmatch', {
          activeMatch: matchId,
          userA: currentUserId,
          userB: otherUserId
        })
        console.log('[confirmUnmatch] Successfully unmatched users')
      } catch (e) {
        console.error('[confirmUnmatch] Error unmatching:', e)
        // Continue to delete chat even if unmatch fails
      }
    } else {
      console.warn('[confirmUnmatch] No match ID found, skipping unmatch call')
    }

    // Step 4: Delete chat for both users (if thread exists)
    if (threadId) {
      try {
        // Delete chat for current user
        await ApiService.callConceptAction('Messaging', 'deleteChat', {
          initiator: currentUserId,
          thread: threadId
        })
        console.log('[confirmUnmatch] Deleted chat for current user')

        // Delete chat for other user
        await ApiService.callConceptAction('Messaging', 'deleteChat', {
          initiator: otherUserId,
          thread: threadId
        })
        console.log('[confirmUnmatch] Deleted chat for other user')
      } catch (e) {
        console.error('[confirmUnmatch] Error deleting chat:', e)
        // Continue - chat might already be deleted
      }
    } else {
      console.warn('[confirmUnmatch] No thread ID found, skipping chat deletion')
    }

    // Update local state
    const allProfileIdVariants = [
      otherUserId,
      profile._id,
      profile.userId,
      profile.id
    ].filter(Boolean)

    allProfileIdVariants.forEach(id => {
      mutualMatchCache.value.delete(id)
      thumbsUpsSent.value.delete(id)
      suggestionIds.value.delete(id)
    })

    showUnmatchModal.value = false
    selectedUnmatchProfile.value = null

    // Optionally refresh the profiles list and mutual match cache
    await fetchUsersInArea()
    await fetchSentThumbsUps()
  } catch (e) {
    console.error('[confirmUnmatch] Error:', e)
    error.value = e instanceof Error ? e.message : 'Failed to unmatch'
    showUnmatchModal.value = false
    selectedUnmatchProfile.value = null
  }
}

// Profiles array - will be populated from API
const profiles = ref([])

const locationFilter = ref('all')
const genderFilter = ref('all')
const levelFilter = ref('all')

// Dynamic filter options
const locationOptions = computed(() => {
  const set = new Set()
  profiles.value.forEach(p => p.location && set.add(p.location))
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
const levelOptions = computed(() => {
  const set = new Set()
  profiles.value.forEach(p => p.tags?.runningLevel && set.add(p.tags.runningLevel))
  return Array.from(set).sort()
})

// Helper function to parse pace string (e.g., "8:30") to total seconds
function parsePaceToSeconds(paceString: string): number | null {
  if (!paceString) return null
  const parts = paceString.split(':')
  if (parts.length !== 2) return null
  const minutes = parseInt(parts[0], 10)
  const seconds = parseInt(parts[1], 10)
  if (isNaN(minutes) || isNaN(seconds)) return null
  return minutes * 60 + seconds
}

// Helper function to check if two paces are within 1:00 min (60 seconds)
function pacesWithinRange(pace1: string, pace2: string): boolean {
  const seconds1 = parsePaceToSeconds(pace1)
  const seconds2 = parsePaceToSeconds(pace2)
  if (seconds1 === null || seconds2 === null) return false
  return Math.abs(seconds1 - seconds2) <= 60
}

// Helper function to check if time of day matches based on timeOfDayCategory
// Rules:
// - If current user has "All Times", match everyone
// - If current user has a specific time, only match users with "All Times" or the exact same time
function matchesTimeOfDayCategory(currentUserTime: string | undefined, partnerTime: string | undefined): boolean {
  // Default to "All Times" if not set
  const currentTime = currentUserTime || 'All Times'
  const partnerTimeCategory = partnerTime || 'All Times'
  
  // If current user has "All Times", they match with everyone
  if (currentTime === 'All Times') {
    return true
  }
  
  // If current user has a specific time, only match:
  // 1. Partners with "All Times" (flexible)
  // 2. Partners with the exact same time
  return partnerTimeCategory === 'All Times' || partnerTimeCategory === currentTime
}

// Helper function to check mutual match for a profile ID
// This is reactive because it accesses the ref, so it will update when cache changes
function hasMutualMatch(profileId: string): boolean {
  if (!profileId) return false
  
  // Check all possible ID variants
  const idVariants = [profileId]
  if (profileId) {
    // Also check if there's a profile with this ID that might have different ID format
    const profile = profiles.value.find((p: any) => 
      (p._id === profileId || p.userId === profileId || p.id === profileId)
    )
    if (profile) {
      idVariants.push(profile._id, profile.userId, profile.id)
    }
  }
  
  // Check if any variant is in the cache
  const hasMatch = idVariants.some(id => id && mutualMatchCache.value.get(id) === true) || false
  
  return hasMatch
}

// Helper function to get mutual match status for a profile object
// This ensures reactivity by accessing both the profile and the cache
function getMutualMatchStatus(profile: any): boolean {
  const profileId = profile._id || profile.userId || profile.id
  if (!profileId) return false
  
  // Get all ID variants for this profile
  const idVariants = [
    profileId,
    profile._id,
    profile.userId,
    profile.id
  ].filter(Boolean)
  
  // Check if any variant is in the cache as true
  const hasMatch = idVariants.some(id => {
    const cached = mutualMatchCache.value.get(id)
    return cached === true
  })
  
  if (hasMatch) {
    console.log('[getMutualMatchStatus] TRUE for profile:', profile.displayname, 'ID:', profileId, 'variants:', idVariants)
  }
  
  return hasMatch
}

// Helper function to get mutual match for a profile (for template binding)
// This function accesses the reactive cache directly to ensure reactivity
function getMutualMatchForProfile(profile: any): boolean {
  // Access the cache directly - this ensures Vue tracks the dependency
  const cacheValue = mutualMatchCache.value
  const profileId = profile._id || profile.userId || profile.id
  
  if (!profileId) return false
  
  const idVariants = [
    profileId,
    profile._id,
    profile.userId,
    profile.id
  ].filter(Boolean)
  
  const hasMatch = idVariants.some(id => cacheValue.get(id) === true)
  return hasMatch
}

// Create a computed object that maps profile IDs to mutual match status
// This ensures Vue tracks changes to the mutual match cache
const profileMutualMatches = computed(() => {
  const result: Record<string, boolean> = {}
  // Access mutualMatchCache to ensure reactivity
  const cacheEntries = Array.from(mutualMatchCache.value.entries())
  
  profiles.value.forEach((profile: any) => {
    const profileId = profile._id || profile.userId || profile.id
    if (profileId) {
      const idVariants = [
        profileId,
        profile._id,
        profile.userId,
        profile.id
      ].filter(Boolean)
      const hasMatch = idVariants.some(id => {
        // Access the cache to ensure reactivity
        const cached = mutualMatchCache.value.get(id)
        return cached === true
      })
      result[profileId] = hasMatch
      // Also set for all ID variants
      idVariants.forEach(id => {
        if (id) result[id] = hasMatch
      })
      
      if (hasMatch) {
        console.log('[profileMutualMatches] TRUE for:', profile.displayname, 'ID:', profileId, 'variants:', idVariants)
      }
    }
  })
  
  console.log('[profileMutualMatches] Computed result:', result)
  return result
})

// Filtered profiles (excluding current user, matching pace and user-selected filters)
const filteredProfiles = computed(() => {
  const currentUserId = authStore.user?.id
  const currentUserProfile = profileStore.profile
  const currentUserPace = currentUserProfile.tags?.runningPace
  
  return profiles.value.filter(p => {
    // Exclude current user
    if (p._id === currentUserId || p.userId === currentUserId) {
      return false
    }
    
    // Location filter
    const locMatch = locationFilter.value === 'all' || p.location === locationFilter.value
    
    // Level filter - user-controlled filter
    const levelMatch = levelFilter.value === 'all' || p.tags?.runningLevel === levelFilter.value
    
    // Pace filter - must be within 1:00 min (60 seconds) of current user's pace (if user has a pace set)
    let paceMatch = true
    if (currentUserPace && p.tags?.runningPace) {
      paceMatch = pacesWithinRange(currentUserPace, p.tags.runningPace)
    }
    
    // Gender filter
    let genderMatch = true
    if (genderFilter.value === 'woman' || genderFilter.value === 'man') {
      genderMatch = p.tags?.gender === genderFilter.value
    } else if (genderFilter.value === 'other') {
      genderMatch = p.tags?.gender !== 'woman' && p.tags?.gender !== 'man'
    }
    
    // Time of day filter - automatically matches based on current user's timeOfDayCategory
    const currentUserTime = currentUserProfile.timeOfDayCategory || 'All Times'
    const timeMatch = matchesTimeOfDayCategory(currentUserTime, p.timeOfDayCategory)
    
    return locMatch && levelMatch && paceMatch && genderMatch && timeMatch
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
    
    // Get all active matches to determine which profiles should show unmatch button
    try {
      const session = authStore.session
      if (session && currentUserId) {
        const matchesResult = await ApiService.callConceptAction<any>(
          'PartnerMatching',
          '_getActiveMatches',
          { user: currentUserId }
        )
        
        const matches = Array.isArray(matchesResult)
          ? matchesResult
          : matchesResult?.matches || []
        
        console.log('[fetchUsersInArea] Found active matches:', matches.length)
        console.log('[fetchUsersInArea] Active matches data:', matches)
        
        // Clear previous match data and prepare new maps
        const newCache = new Map<string, boolean>()
        const newMatchIds = new Map<string, string>()
        
        // Process each active match
        matches.forEach((match: any) => {
          const matchId = match._id || match.id
          if (!matchId) {
            console.warn('[fetchUsersInArea] Match missing ID:', match)
            return
          }
          
          // Handle different match structures
          // Structure 1: { userA: '...', userB: '...' }
          // Structure 2: { users: ['...', '...'] }
          let userA: string | undefined
          let userB: string | undefined
          
          if (match.userA && match.userB) {
            userA = match.userA
            userB = match.userB
          } else if (Array.isArray(match.users) && match.users.length >= 2) {
            userA = match.users[0]
            userB = match.users[1]
          }
          
          if (!userA || !userB) {
            console.warn('[fetchUsersInArea] Match missing user data:', match)
            return
          }
          
          // Determine which user is the other user (not current user)
          const currentUserIdVariants = [
            currentUserId,
            authStore.user?.id,
            authStore.user?.username
          ].filter(Boolean)
          
          const otherUser = currentUserIdVariants.includes(userA) ? userB : userA
          
          if (otherUser) {
            // Store match ID for this user (for unmatch functionality)
            newMatchIds.set(otherUser, matchId)
            
            // Also store all ID variants for this user
            // Find the profile and cache all its ID variants
            const profile = profiles.value.find((p: any) => {
              const profileId = p._id || p.userId || p.id
              return profileId === otherUser || 
                     p._id === otherUser || 
                     p.userId === otherUser || 
                     p.id === otherUser ||
                     p.username === otherUser
            })
            
            if (profile) {
              const profileIdVariants = [
                profile._id,
                profile.userId,
                profile.id,
                otherUser
              ].filter(Boolean)
              
              // Mark as having a mutual match
              profileIdVariants.forEach(id => {
                if (id) {
                  newCache.set(id, true)
                  newMatchIds.set(id, matchId) // Store match ID for all ID variants
                }
              })
              
              console.log('[fetchUsersInArea] Processed match for profile:', profile.displayname, 'matchId:', matchId, 'otherUser:', otherUser)
            } else {
              // Profile not loaded yet, but store the match ID anyway
              newMatchIds.set(otherUser, matchId)
              newCache.set(otherUser, true)
              console.log('[fetchUsersInArea] Processed match for user (profile not loaded):', otherUser, 'matchId:', matchId)
            }
          }
        })
        
        // Replace the entire Map to trigger reactivity (Vue doesn't track Map mutations deeply)
        mutualMatchCache.value = newCache
        activeMatchIds.value = newMatchIds
        
        console.log('[fetchUsersInArea] Active match IDs map:', Array.from(activeMatchIds.value.entries()))
        console.log('[fetchUsersInArea] Mutual match cache:', Array.from(mutualMatchCache.value.entries()))
      }
    } catch (e) {
      console.warn('[fetchUsersInArea] Error fetching active matches:', e)
    }
  } catch (e) {
    console.error('Error fetching users in area:', e)
    error.value = e instanceof Error ? e.message : 'Failed to fetch users in your area.'
  } finally {
    loading.value = false
  }
}

// Fetch sent thumbs-ups from backend with suggestion IDs
async function fetchSentThumbsUps() {
  try {
    const session = authStore.session
    if (!session) return
    
    // First, get the list of users we've sent requests to (using the old API as fallback)
    let userIds: string[] = []
    try {
      const oldResult = await ApiService.callConceptAction<any>('UserProfile', '_getThumbsUpsSent', { session })
      if (oldResult) {
        if (Array.isArray(oldResult)) {
          userIds = oldResult
        } else if (typeof oldResult === 'object' && 'userIds' in oldResult && Array.isArray(oldResult.userIds)) {
          userIds = oldResult.userIds
        }
      }
    } catch (e) {
      console.warn('[fetchSentThumbsUps] Could not fetch from old API:', e)
    }
    
    // Then, try to get suggestion IDs from the new API
    try {
      const result = await ApiService.callConceptAction<any>('PartnerMatching', '_getThumbsUpsSentWithIds', { session })
      
      console.log('[fetchSentThumbsUps] _getThumbsUpsSentWithIds API response:', result)
      
      // Response format: { suggestions: [{ suggestionId: "...", recipientId: "..." }, ...] }
      let suggestions: any[] = []
      if (result && typeof result === 'object' && 'suggestions' in result && Array.isArray(result.suggestions)) {
        suggestions = result.suggestions
      } else if (Array.isArray(result)) {
        suggestions = result
      }
      
      console.log('[fetchSentThumbsUps] Parsed suggestions:', suggestions)
      
      // Extract user IDs and store suggestion IDs
      suggestions.forEach((suggestion: any) => {
        // Try multiple ways to get recipient ID
        const recipientId = suggestion.recipientId || suggestion.recipient
        const recipientIdObj = suggestion.recipientId || suggestion.recipient
        const recipientIdFromObj = typeof recipientIdObj === 'object' 
          ? (recipientIdObj._id || recipientIdObj.userId || recipientIdObj.id)
          : null
        const finalRecipientId = recipientId || recipientIdFromObj
        
        const suggestionId = suggestion.suggestionId || suggestion.suggestion || suggestion._id || suggestion.id
        
        if (finalRecipientId) {
          // Add to userIds if not already there
          if (!userIds.includes(finalRecipientId)) {
            userIds.push(finalRecipientId)
          }
          // Store suggestion ID mapped to recipient ID (the person who received the request)
          if (suggestionId) {
            suggestionIds.value.set(finalRecipientId, suggestionId)
            console.log('[fetchSentThumbsUps] Stored suggestion ID:', suggestionId, 'for recipient:', finalRecipientId)
          } else {
            console.warn('[fetchSentThumbsUps] No suggestion ID found in suggestion:', suggestion)
          }
        } else {
          console.warn('[fetchSentThumbsUps] No recipient ID found in suggestion:', suggestion)
        }
      })
    } catch (e) {
      console.warn('[fetchSentThumbsUps] Could not fetch suggestion IDs from new API:', e)
      // Continue with just the user IDs from the old API
    }
    
    // Update thumbsUpsSent with all user IDs we found
    thumbsUpsSent.value = new Set(userIds)
    console.log('[fetchSentThumbsUps] Final suggestionIds map:', Array.from(suggestionIds.value.entries()))
    console.log('[fetchSentThumbsUps] Final thumbsUpsSent set:', Array.from(thumbsUpsSent.value))
  } catch (e) {
    console.error('[fetchSentThumbsUps] Error:', e)
  }
}

// Fetch received thumbs-ups from backend
async function fetchReceivedThumbsUps() {
  try {
    const session = authStore.session
    if (!session) return
    
    const result = await ApiService.callConceptAction('UserProfile', '_getThumbsUpsReceived', { session })
    
    // Response format: { userIds: [...] }
    let userIds: string[] = []
    if (result && typeof result === 'object' && 'userIds' in result && Array.isArray(result.userIds)) {
      userIds = result.userIds
    } else if (Array.isArray(result)) {
      userIds = result
    }
    
    thumbsUpsReceived.value = new Set(userIds)
    
    // Check mutual matches for all received thumbs-ups
    // A mutual match exists if userId is in both sent and received
    for (const userId of userIds) {
      if (thumbsUpsSent.value.has(userId)) {
        mutualMatchCache.value.set(userId, true)
      } else {
        // Still check via API to be sure (in case there's an active match)
        const hasMutual = await checkMutualMatch(userId)
        if (hasMutual) {
          mutualMatchCache.value.set(userId, true)
        }
      }
    }
  } catch (e) {
    console.error('[fetchReceivedThumbsUps] Error:', e)
  }
}

onMounted(async () => {
  // Fetch sent and received thumbs-ups first to populate state
  await fetchSentThumbsUps()
  await fetchReceivedThumbsUps()
  // Then fetch and display profiles
  await fetchUsersInArea()
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

.page-description {
  color: var(--color-secondary);
  font-size: 1rem;
  margin-bottom: 1.5rem;
  line-height: 1.5;
  text-align: center;
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
</style>

