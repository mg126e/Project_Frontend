<template>
  <section class="profile-edit">
    <div v-if="loadingProfile" class="profile-loading">Loading profile...</div>
    <template v-else>
      <h1>Edit Profile</h1>
      <div v-if="auth.user?.username" class="profile-username-top">@{{ auth.user.username }}</div>
      <form v-if="isEditMode" @submit.prevent="saveProfile" class="profile-form">
      <div class="form-group">
        <label for="displayname">Display Name <span class="required-star">*</span></label>
        <input id="displayname" v-model="editForm.displayname" type="text" required />
      </div>
      <div class="profile-avatar-row">
        <div v-if="editFormImageUrl" class="profile-preview-wrapper">
          <img :src="editFormImageUrl" alt="Profile Preview" class="profile-preview" />
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
        <textarea id="bio" v-model="editForm.bio" rows="3" required></textarea>
      </div>
      <div class="form-group">
        <label for="location">Location <span class="required-star">*</span></label>
        <input id="location" v-model="editForm.location" type="text" required placeholder="e.g. San Francisco, CA" @input="onLocationInput" />
        <span v-if="locationError" class="error-msg">Location must be in format: City, ST (e.g. San Francisco, CA)</span>
      </div>
      <div class="form-group">
        <label for="emergencyContact">Emergency Contact <span class="required-star">*</span></label>
        <input id="emergencyContact" v-model="editForm.emergencyContact.name" type="text" required placeholder="Contact Name" style="margin-bottom:0.5em;" />
        <input id="emergencyContactPhone" v-model="editForm.emergencyContact.phone" type="tel" required placeholder="Phone Number" @input="onEmergencyPhoneInput" />
        <span v-if="emergencyPhoneError" class="error-msg">Enter a valid phone number</span>
      </div>
      <div class="form-group">
        <label>Tags</label>
        <div class="tags-grid">
          <div>
            <label>Gender <span class="required-star">*</span></label>
            <select v-model="editForm.tags.gender" required>
              <option value="">Select</option>
              <option value="woman">Woman</option>
              <option value="man">Man</option>
              <option value="other">Other</option>
            </select>
            <input
              v-if="editForm.tags.gender === 'other'"
              v-model="editForm.tags.genderOther"
              type="text"
              placeholder="You may specify here"
              style="margin-top: 0.5em; width: 100%;"
              required
            />
          </div>
          <div>
            <label>Age <span class="required-star">*</span></label>
            <input v-model="editForm.tags.age" type="number" min="0" required />
          </div>
          <div>
            <label>Running Level <span class="required-star">*</span></label>
            <select v-model="editForm.tags.runningLevel" required>
              <option value="">Select</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div>
            <label>Running Pace (min/mile) <span class="required-star">*</span></label>
              <input
                v-model="editForm.tags.runningPace"
                type="text"
                placeholder="e.g. 8:30"
                required
                @input="onPaceInput"
              />
              <span v-if="paceInputError" class="error-msg">Running pace must be in correct format (e.g. 8:30)</span>
          </div>
          <div>
            <label>Preferred Time of Day <span class="required-star">*</span></label>
            <select v-model="editForm.timeOfDayCategory" required>
              <option value="All Times">All Times</option>
              <option value="Morning (5am - 12pm)">Morning (5am - 12pm)</option>
              <option value="Afternoon (12pm - 5pm)">Afternoon (12pm - 5pm)</option>
              <option value="Evening (5pm - 9pm)">Evening (5pm - 9pm)</option>
              <option value="Night (9pm - 5am)">Night (9pm - 5am)</option>
            </select>
          </div>
          <div>
            <label>Personality <span class="required-star">*</span></label>
            <select v-model="editForm.tags.personality" required>
              <option value="">Select</option>
              <option value="introvert">Introvert</option>
              <option value="extrovert">Extrovert</option>
              <option value="ambivert">Ambivert</option>
            </select>
          </div>
        </div>
      </div>
      <div style="display: flex; gap: 1rem; margin-top: 1.2rem;">
        <button class="btn-primary" type="submit" :disabled="savingProfile">
          <span v-if="savingProfile" class="button-spinner"></span>
          <span v-else>Save Profile</span>
        </button>
        <button v-if="!savingProfile" class="btn-link" type="button" @click="cancelEdit">Cancel</button>
      </div>
      </form>

      <div v-else class="profile-view-grid">
      <div class="profile-view-main">
        <div class="profile-view-tags">
          <div class="profile-tag-row"><span class="profile-label profile-label--primary">Display Name</span><span class="profile-value">{{ profile.displayname }}</span></div>
          <div class="profile-tag-row"><span class="profile-label profile-label--primary">Gender</span><span class="profile-value">{{ profile.tags?.gender === 'other' ? (profile.tags?.genderOther || 'other') : profile.tags?.gender }}</span></div>
          <div class="profile-tag-row"><span class="profile-label profile-label--primary">Age</span><span class="profile-value">{{ profile.tags?.age }}</span></div>
          <div class="profile-tag-row"><span class="profile-label profile-label--primary">Running Level</span><span class="profile-value">{{ profile.tags?.runningLevel }}</span></div>
          <div class="profile-tag-row"><span class="profile-label profile-label--primary">Running Pace</span><span class="profile-value">{{ profile.tags?.runningPace }}</span></div>
          <div class="profile-tag-row"><span class="profile-label profile-label--primary">Personality</span><span class="profile-value">{{ profile.tags?.personality }}</span></div>
          <div class="profile-tag-row"><span class="profile-label profile-label--primary">Preferred Time of Day</span><span class="profile-value">{{ profile.timeOfDayCategory || 'All Times' }}</span></div>
          <div class="profile-tag-row"><span class="profile-label profile-label--primary">Location</span><span class="profile-value">{{ profile.location }}</span></div>
        </div>
        <div class="profile-view-avatar-large">
          <div v-if="currentProfileImageUrl" class="profile-preview-wrapper">
            <img :src="currentProfileImageUrl" alt="Profile Preview" class="profile-preview-large" />
          </div>
          <div v-else class="profile-fallback-avatar-large">
            <span>{{ (auth.user?.username?.charAt(0) || '?').toUpperCase() }}</span>
          </div>
        </div>
      </div>
      <div class="profile-view-bottom">
        <div class="profile-bottom-left">
          <span class="profile-label">Emergency Contact</span>
          <span class="profile-value">{{ profile.emergencyContact?.name }}<br v-if="profile.emergencyContact?.name && profile.emergencyContact?.phone" />
            <span v-if="profile.emergencyContact?.phone">📞 {{ profile.emergencyContact.phone }}</span>
          </span>
        </div>
        <div class="profile-bottom-right">
          <span class="profile-label">Bio</span>
          <span class="profile-value">{{ profile.bio }}</span>
        </div>
      </div>
      <button class="btn-primary" @click="startEdit" style="margin-top:1.5rem;">Edit Profile</button>
    </div>


      <div class="change-password-trigger">
        <button class="btn-link" @click="showPasswordModal = true">Change Password</button>
        <button class="btn-link danger" @click="showDeleteModal = true">Delete Account</button>
      </div>

      <ChangePasswordModal
        v-if="showPasswordModal"
        :show="showPasswordModal"
        @close="showPasswordModal = false"
        @password-changed="onPasswordChanged"
      />
      <ConfirmActionModal
        v-if="showDeleteModal"
        title="Delete Account"
        message="Are you sure you want to delete your account? This cannot be undone."
        confirmText="Delete"
        confirmClass="danger"
        @close="showDeleteModal = false"
        @confirm="handleDeleteUser"
      />
      <p v-if="passwordChangeMsg" class="success-msg">{{ passwordChangeMsg }}</p>
      <p v-if="deleteMsg" :class="{'error-msg': deleteMsgType==='error', 'success-msg': deleteMsgType==='success'}">{{ deleteMsg }}</p>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useAuthStore } from '../stores/auth';
import ChangePasswordModal from '../components/ChangePasswordModal.vue';
import ConfirmActionModal from '../components/ConfirmActionModal.vue';
import { useProfileStore } from '../stores/profile';
import { storeToRefs } from 'pinia';

type TimeOfDayCategory = "All Times" | "Morning (5am - 12pm)" | "Afternoon (12pm - 5pm)" | "Evening (5pm - 9pm)" | "Night (9pm - 5am)" | '';

const auth = useAuthStore();
const profileStore = useProfileStore();
const { profile } = storeToRefs(profileStore);

const showDeleteModal = ref(false);
const showPasswordModal = ref(false);
const deleteMsg = ref('');
const deleteMsgType = ref('');
const emergencyPhoneError = ref(false);
const passwordChangeMsg = ref('');
const loadingProfile = ref(true);
const locationError = ref(false);
const paceInputError = ref(false);
const isEditMode = ref(false);
const savingProfile = ref(false);

// Local edit form for editing profile - MUST be declared before watchers/computed that use it
const editForm = ref({
  displayname: '',
  profileImage: '',
  bio: '',
  location: '',
  emergencyContact: { name: '', phone: '' },
  timeOfDayCategory: 'All Times' as TimeOfDayCategory,
  tags: {
    gender: '',
    genderOther: '',
    age: '',
    runningLevel: '',
    runningPace: '',
    personality: ''
  }
});

// Profile image URL cache and management
const profileImageUrls = ref<{ [key: string]: string }>({});

async function getProfileImageUrl(fileId: string): Promise<string> {
  if (!fileId) return '';
  if (fileId.startsWith('data:image/')) return fileId; // fallback for legacy base64
  if (fileId.startsWith('http://') || fileId.startsWith('https://')) return fileId; // already a URL
  
  // Check cache first
  if (profileImageUrls.value[fileId]) {
    return profileImageUrls.value[fileId];
  }
  
  // Use the profile store method to get download URL
  const result = await profileStore.getFileDownloadURL(fileId);
  if ('downloadURL' in result) {
    profileImageUrls.value[fileId] = result.downloadURL;
    return result.downloadURL;
  }
  return '';
}

// Computed properties for reactive image URLs
const currentProfileImageUrl = computed(() => {
  const fileId = profile.value.profileImage;
  if (!fileId) return '';
  if (fileId.startsWith('http')) return fileId;
  return profileImageUrls.value[fileId] || '';
});

const editFormImageUrl = computed(() => {
  const fileId = editForm.value.profileImage;
  if (!fileId) return '';
  if (fileId.startsWith('http')) return fileId;
  return profileImageUrls.value[fileId] || '';
});

// Load profile image URLs when they change
watch(() => profile.value.profileImage, async (newFileId) => {
  if (newFileId && !newFileId.startsWith('http') && !profileImageUrls.value[newFileId]) {
    await getProfileImageUrl(newFileId);
  }
}, { immediate: true });

watch(() => editForm.value.profileImage, async (newFileId) => {
  if (newFileId && !newFileId.startsWith('http') && !profileImageUrls.value[newFileId]) {
    await getProfileImageUrl(newFileId);
  }
}, { immediate: true });

function startEdit() {
  // Only copy from the already-loaded profile.value
  const p = profile.value || {};
  // Merge defaults with profile data for tags and emergencyContact
  const defaultTags = {
    gender: '',
    genderOther: '',
    age: '',
    runningLevel: '',
    runningPace: '',
    personality: ''
  };
  const defaultEC = { name: '', phone: '' };
  editForm.value = {
    displayname: p.displayname || '',
    profileImage: p.profileImage || '',
    bio: p.bio || '',
    location: p.location || '',
    timeOfDayCategory: (p.timeOfDayCategory || 'All Times') as TimeOfDayCategory,
    emergencyContact: { ...defaultEC, ...(p.emergencyContact || {}) },
    tags: { ...defaultTags, ...(p.tags || {}) }
  };
  isEditMode.value = true;
}

function cancelEdit() {
  // Reset editForm to last saved profile values and exit edit mode
  const p = profile.value || {};
  const defaultTags = {
    gender: '',
    genderOther: '',
    age: '',
    runningLevel: '',
    runningPace: '',
    personality: ''
  };
  const defaultEC = { name: '', phone: '' };
  editForm.value = {
    displayname: p.displayname || '',
    profileImage: p.profileImage || '',
    bio: p.bio || '',
    location: p.location || '',
    timeOfDayCategory: (p.timeOfDayCategory || 'All Times') as TimeOfDayCategory,
    emergencyContact: { ...defaultEC, ...(p.emergencyContact || {}) },
    tags: { ...defaultTags, ...(p.tags || {}) }
  };
  isEditMode.value = false;
}

onMounted(async () => {
  await profileStore.fetchProfile();
  if (profile.value.isActive === false) {
    startEdit();
  }
  loadingProfile.value = false;
});

// Watch for profile changes and trigger startEdit if inactive
// Only trigger startEdit if profile is inactive AND has required fields (not empty)
watch(profile, (newProfile) => {
  if (
    newProfile &&
    newProfile.isActive === false &&
    newProfile.displayname &&
    newProfile.displayname.length > 0
  ) {
    startEdit();
  }
}, { immediate: true });

function validatePhone(phone: string): boolean {
  // Accepts (123) 456-7890, 123-456-7890, 1234567890, 123.456.7890, 123 456 7890, +1 (123) 456-7890, etc.
  return /^\s*(\+?1[-.\s]*)?(\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}\s*$/.test((phone || '').trim());
}

function validateLocationFormat(location: string): boolean {
  // Accepts: City, ST (2 letters, case-insensitive, optional spaces)
  return /^\s*[^,]+,\s*[a-zA-Z]{2}\s*$/.test(location);
}

function validatePaceFormat(pace: string | number): boolean {
  // Accepts #:## or ##:##, minutes:seconds, 1 or 2 digits for minutes, always 2 digits for seconds
  if (pace === undefined || pace === null) pace = '';
  const paceStr = typeof pace === 'string' ? pace.trim() : String(pace).trim();
  const result = /^\d{1,2}:[0-5]\d$/.test(paceStr);
  return result;
}

function onEmergencyPhoneInput(event: Event) {
  const phone = event && (event.target as HTMLInputElement) ? (event.target as HTMLInputElement).value : '';
  // Only show error if field is non-empty and invalid
  emergencyPhoneError.value = phone.length > 0 && !validatePhone(phone);
}

function onPaceInput(event: Event) {
  const pace = event && (event.target as HTMLInputElement) ? (event.target as HTMLInputElement).value : '';
  // Only show error if field is non-empty and invalid
  paceInputError.value = pace.length > 0 && !validatePaceFormat(pace);
}

function onLocationInput(event: Event) {
  const value = event && (event.target as HTMLInputElement) ? (event.target as HTMLInputElement).value : '';
  // Only show error if field is non-empty and invalid
  locationError.value = value.length > 0 && !validateLocationFormat(value);
}

async function onImageChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  try {
    // 1. Request upload URL WITHOUT contentType - let backend sign without content-type header
    const uploadReqResult = await profileStore.requestFileUpload(file.name);
    
    if ('error' in uploadReqResult) {
      console.error('[onImageChange] Error getting upload URL:', uploadReqResult.error);
      alert('Failed to get upload URL: ' + uploadReqResult.error);
      return;
    }
    
    const { file: fileId, uploadURL } = uploadReqResult;

    const uploadRes = await fetch(uploadURL, {
      method: 'PUT',
      body: file
      // NO HEADERS - backend should not include content-type in signed headers
    });
    
    if (!uploadRes.ok) {
      await uploadRes.text();
      return;
    }
    
    // 3. Confirm upload to mark file as uploaded
    const confirmResult = await profileStore.confirmFileUpload(fileId);
    
    if ('error' in confirmResult) {
      return;
    }
    
    // 4. Create immediate local preview from file blob
    const localPreviewURL = URL.createObjectURL(file);
    profileImageUrls.value[fileId] = localPreviewURL;
    editForm.value.profileImage = fileId;
    
    // 5. Fetch server download URL in background to replace local preview
    try {
      const downloadResult = await profileStore.getFileDownloadURL(fileId);
      
      // Handle both array and object responses
      const responseData = Array.isArray(downloadResult) ? downloadResult[0] : downloadResult;
      
      if (responseData && 'downloadURL' in responseData) {
        let downloadURL = responseData.downloadURL;
        // If it's a relative URL, prepend the backend base URL
        if (downloadURL.startsWith('/api/')) {
          const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
          downloadURL = baseURL.replace(/\/api$/, '') + downloadURL;
        }
        // Replace local preview with server URL
        URL.revokeObjectURL(localPreviewURL); // Clean up blob URL
        profileImageUrls.value[fileId] = downloadURL + '?t=' + Date.now();
      }
    } catch (previewErr) {
      console.warn('[onImageChange] Could not load server URL, keeping local preview:', previewErr);
    }
    
  } catch (err) {
    console.error('[onImageChange] Exception during upload:', err);
    alert('An error occurred while uploading the file: ' + (err instanceof Error ? err.message : String(err)));
  }
}

async function saveProfile() {
  const p = editForm.value;
  const tags = p.tags || {};
  const ec = p.emergencyContact || {};
  locationError.value = (p.location || '').length > 0 && !validateLocationFormat(p.location || '');
  emergencyPhoneError.value = (ec.phone || '').length > 0 && !validatePhone(ec.phone || '');
  if (locationError.value) {
    return;
  }
  paceInputError.value = (tags.runningPace || '').length > 0 && !validatePaceFormat(tags.runningPace || '');
  if (paceInputError.value) {
    return;
  }
  if (emergencyPhoneError.value) {
    return;
  }
  // If gender is 'other' and genderOther is filled, use genderOther as the value
  let genderValue = tags.gender;
  if (tags.gender === 'other' && tags.genderOther && tags.genderOther.trim()) {
    genderValue = tags.genderOther.trim();
  }
  // Remove genderOther from tags before saving
  const { genderOther, ...tagsWithoutGenderOther } = tags;
  // Ensure timeOfDayCategory has a value - default if undefined/null/empty
  const timeOfDayValue = (p.timeOfDayCategory && p.timeOfDayCategory.trim() !== '') 
    ? p.timeOfDayCategory 
    : 'All Times';
  
  const payload = {
    displayname: p.displayname,
    bio: p.bio,
    location: p.location,
    timeOfDayCategory: timeOfDayValue,
    emergencyContact: { name: ec.name, phone: ec.phone },
    tags: { ...tagsWithoutGenderOther, gender: genderValue },
    profileImage: p.profileImage
  };
  
  savingProfile.value = true;
  try {
    await profileStore.batchUpdateProfile(payload);
    // Re-fetch profile to update profileImage and all fields
    await profileStore.fetchProfile();
    isEditMode.value = false;
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'Failed to save profile.';
    console.error('[saveProfile] Error saving profile:', e);
    alert(`Failed to save profile: ${errorMsg}`);
  } finally {
    savingProfile.value = false;
  }
}


async function handleDeleteUser() {
  showDeleteModal.value = false;
  const result = await auth.deleteUser();
  if (result === true) {
    deleteMsg.value = 'Account deleted. You have been logged out.';
    deleteMsgType.value = 'success';
  } else {
    deleteMsg.value = result || 'Failed to delete account.';
    deleteMsgType.value = 'error';
  }
}

function onPasswordChanged(msg: string) {
  showPasswordModal.value = false;
  passwordChangeMsg.value = msg;
  setTimeout(() => { passwordChangeMsg.value = ''; }, 4000);
}
</script>

<style scoped>
.required-star {
  color: var(--color-error);
  font-size: 1.1em;
  margin-left: 0.15em;
  vertical-align: middle;
}
.profile-edit {
  width: 700px;
  margin: 3.5rem auto 0 auto;
  background: #F9FAFB;
  border-radius: 16px;
  padding: 2.5rem 3.5rem 2.2rem 3.5rem;
  position: relative;
}
.profile-edit h1 {
  color: var(--color-primary);
  font-size: 2.1rem;
  margin-bottom: .3rem;
  text-align: center;
  letter-spacing: 0.5px;
}
.profile-form {
  margin-bottom: 2.2rem;
}
.profile-view-grid {
  margin-bottom: 2.2rem;
  border-radius: 16px;
  background: var(--color-primary-light);
  padding: 2.2rem 3.5rem 1.5rem 3.5rem;
  display: flex;
  flex-direction: column;
  align-items: stretch;
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
  background: #F9FAFB;
  border-radius: 8px;
  padding: 0.5em 1em;
  font-size: 1.05rem;
  color: #333;
}
.profile-label {
  font-weight: 600;
  min-width: 110px;
}
.profile-label--primary {
  color: var(--color-primary);
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
  background: #F9FAFB;
}

.profile-username-top {
  text-align: center;
  font-size: 1.05rem;
  color: var(--color-secondary);
  margin-bottom: 2.0rem;
  letter-spacing: 0.2px;
}

.profile-fallback-avatar-large {
  width: 130px;
  height: 130px;
  border-radius: 50%;
  background: var(--color-accent, #f1a238);
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
  background: #F9FAFB;
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
  border: 1.2px solid var(--color-primary-border);
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
  background: #F9FAFB;
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
  color: var(--color-error);
}
.btn-link:hover {
  color: #106cb8;
  background: var(--color-primary-light);
}
.btn-link.danger:hover {
  color: #b71c1c;
  background: #fdeaea;
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
.button-spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>