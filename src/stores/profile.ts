import { ref, computed, watch } from 'vue';
import { defineStore } from 'pinia';
import { ApiService } from '@/services/api';
import { useAuthStore } from '@/stores/auth';

interface EmergencyContact {
  name: string;
  phone: string;
}

interface UserProfile {
  displayname?: string;
  profileImage?: string;
  profileImageFileId?: string;
  bio?: string;
  location?: string;
  emergencyContact?: EmergencyContact;
  tags?: Record<string, string | number>;
  isActive?: boolean;
}

export const useProfileStore = defineStore('profile', () => {
  const authStore = useAuthStore();
  const getUserId = () => authStore.user?.id;
  const getSession = () => authStore.session;
  const profile = ref<UserProfile>({
    displayname: '',
    profileImage: '',
    bio: '',
    location: '',
    emergencyContact: { name: '', phone: '' },
    tags: {
      gender: '',
      age: '',
      runningLevel: '',
      runningPace: '',
      personality: ''
    }
  });
  const loading = ref(false);
  const error = ref('');

  const hasProfile = computed(() => !!profile.value);

  async function fetchProfile(): Promise<void> {
    loading.value = true;
    error.value = '';
    try {
      const session = getSession();
      if (!session) throw new Error('Session not found');
      const result = await ApiService.callConceptAction('UserProfile', '_getProfile', { session });
      
      // Backend returns { profile: {...} } not just the profile object
      if (result && result.profile && !result.profile.error) {
        const merged = await mergeProfile(result.profile as UserProfile);
        // Only mutate properties, never replace the object
        for (const key of Object.keys(merged)) {
          // @ts-ignore
          profile.value[key] = merged[key];
        }
      } else if (result && result.profile && typeof result.profile === 'object' && 'error' in result.profile && String(result.profile.error).toLowerCase().includes('not found')) {
        // If profile not found, create it and retry
        await createProfile();
        // createProfile already calls fetchProfile, so return
        return;
      } else {
        error.value = (result && result.profile && typeof result.profile === 'object' && 'error' in result.profile) ? (result.profile.error as string) : 'Failed to fetch profile.';
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch profile.';
    } finally {
      loading.value = false;
    }
  }
  const defaultProfile: UserProfile = {
    displayname: '',
    profileImage: '',
    bio: '',
    location: '',
    emergencyContact: { name: '', phone: '' },
    tags: {
      gender: '',
      age: '',
      runningLevel: '',
      runningPace: '',
      personality: ''
    },
    isActive: false
  };

  async function mergeProfile(partial: Partial<UserProfile>): Promise<UserProfile> {
    const { name = '', phone = '' } = partial.emergencyContact || {};
    let profileImage = partial.profileImage || ''; // Default to file ID from backend
    if (partial.profileImage) {
      try {
        // Try to resolve fileId to download URL
        const res = await ApiService.getDownloadURL(partial.profileImage);
        
        // Handle both array and object responses
        const responseData = Array.isArray(res) ? res[0] : res;
        
        if (responseData && 'downloadURL' in responseData) {
          let downloadURL = responseData.downloadURL;
          // If it's a relative URL, prepend the backend base URL
          if (downloadURL.startsWith('/api/')) {
            const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
            downloadURL = baseURL.replace(/\/api$/, '') + downloadURL;
          }
          profileImage = downloadURL + '?t=' + Date.now();
        }
      } catch (err) {
        // Keep the file ID if download URL fetch fails
        profileImage = partial.profileImage;
      }
    }
    // Remove genderOther if present in backend tags
    const tags = { ...defaultProfile.tags, ...(partial.tags || {}) };
    if ('genderOther' in tags) {
      delete tags.genderOther;
    }
    const merged = {
      ...defaultProfile,
      ...partial,
      profileImage,
      emergencyContact: { name, phone },
      tags
    };
    return merged;
  }

  async function createProfile(): Promise<void> {
    loading.value = true;
    error.value = '';
    try {
      const session = getSession();
      if (!session) throw new Error('Session not found');
      const result = await ApiService.callConceptAction('UserProfile', 'createProfile', { session });
      if (result && !result.error) {
        await fetchProfile();
      } else {
        error.value = (result && typeof result === 'object' && 'error' in result) ? (result.error as string) : 'Failed to create profile.';
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to create profile.';
    } finally {
      loading.value = false;
    }
  }

  async function updateDisplayName(displayname: string): Promise<void> {
    loading.value = true;
    error.value = '';
    try {
      const session = getSession();
      if (!session) throw new Error('Session not found');
      const payload = { session, displayname };
      const result = await ApiService.callConceptAction('UserProfile', 'setName', payload);
      // Backend wraps response in msg: { msg: {} } or { msg: { error } }
      if (result && result.msg && result.msg.error) {
        error.value = result.msg.error;
        throw new Error(error.value);
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update display name.';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function requestFileUpload(filename: string, contentType?: string): Promise<{ file: string; uploadURL: string; contentType?: string } | { error: string }> {
    const session = getSession();
    if (!session) return { error: 'Session not found' };
    const result = await ApiService.requestUploadURL(session, filename, contentType);
    // Handle msg wrapper if present (backend wraps in msg with Symbols)
    if (result && typeof result === 'object' && 'msg' in result) {
      const msgContent = (result as any).msg;

      if (msgContent.error) {
        return { error: msgContent.error };
      }
      
      // Try to get values - they might be symbols or regular properties
      let file = msgContent.file || msgContent.fileId;
      let uploadURL = msgContent.uploadURL;
      let returnedContentType = msgContent.contentType;
      
      // If values are undefined, try to get them from symbol properties
      if (!file || !uploadURL) {
        const symbols = Object.getOwnPropertySymbols(msgContent);
        for (const sym of symbols) {
          const key = sym.toString();
          if (key.includes('file') && !file) {
            file = msgContent[sym];
          }
          if (key.includes('uploadURL') && !uploadURL) {
            uploadURL = msgContent[sym];
          }
          if (key.includes('contentType') && !returnedContentType) {
            returnedContentType = msgContent[sym];
          }
        }
      }

      return { file, uploadURL, contentType: returnedContentType };
    }
    
    return result;
  }

  async function confirmFileUpload(fileId: string): Promise<{ file: string } | { error: string }> {
    return await ApiService.confirmUpload(fileId);
  }

  async function getFileDownloadURL(fileId: string): Promise<{ downloadURL: string } | { error: string }> {
    return await ApiService.getDownloadURL(fileId);
  }

  async function updateBio(bio: string): Promise<void> {
    loading.value = true;
    error.value = '';
    try {
      const session = getSession();
      if (!session) throw new Error('Session not found');
      const payload = { session, bio };
      const result = await ApiService.callConceptAction('UserProfile', 'setBio', payload);
      // Backend wraps response in msg: { msg: {} } or { msg: { error } }
      if (result && result.msg && result.msg.error) {
        error.value = result.msg.error;
        throw new Error(error.value);
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update bio.';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function updateLocation(location: string): Promise<void> {
    loading.value = true;
    error.value = '';
    try {
      const session = getSession();
      if (!session) throw new Error('Session not found');
      const payload = { session, location };
      const result = await ApiService.callConceptAction('UserProfile', 'setLocation', payload);
      // Backend wraps response in msg: { msg: {} } or { msg: { error } }
      if (result && result.msg && result.msg.error) {
        error.value = result.msg.error;
        throw new Error(error.value);
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update location.';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function updateEmergencyContact(name: string, phone: string): Promise<void> {
    loading.value = true;
    error.value = '';
    try {
      const session = getSession();
      if (!session) throw new Error('Session not found');
      const payload = { session, name, phone };
      const result = await ApiService.callConceptAction('UserProfile', 'setEmergencyContact', payload);
      // Backend wraps response in msg: { msg: {} } or { msg: { error } }
      if (result && result.msg && result.msg.error) {
        error.value = result.msg.error;
        throw new Error(error.value);
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update emergency contact.';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function updateTag(tagType: string, value: string | number): Promise<void> {
    loading.value = true;
    error.value = '';
    try {
      const session = getSession();
      if (!session) throw new Error('Session not found');
      const payload = { session, tagType, value };
      const result = await ApiService.callConceptAction('UserProfile', 'setTag', payload);
      // Backend wraps response in msg: { msg: {} } or { msg: { error } }
      if (result && result.msg && result.msg.error) {
        error.value = result.msg.error;
        throw new Error(error.value);
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update tag.';
      throw e;
    } finally {
      loading.value = false;
    }
  }
  async function setIsActive(isActive: boolean): Promise<void> {
    loading.value = true;
    error.value = '';
    try {
      const session = getSession();
      if (!session) throw new Error('Session not found');
      const payload = { session, isActive };
      const result = await ApiService.callConceptAction('UserProfile', 'setIsActive', payload);
      // Backend wraps response in msg: { msg: {} } or { msg: { error } }
      if (result && result.msg && result.msg.error) {
        error.value = result.msg.error;
        throw new Error(error.value);
      } else {
        profile.value.isActive = isActive;
        // Note: When isActive is set to false, the backend DeleteUserOnProfileClose sync
        // will automatically delete the user from PasswordAuthentication
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update isActive.';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function closeProfile(): Promise<void> {
    loading.value = true;
    error.value = '';
    try {
      const session = getSession();
      if (!session) throw new Error('Session not found');
      const result = await ApiService.callConceptAction('UserProfile', 'closeProfile', { session });
      // Backend wraps response in msg: { msg: {} } or { msg: { error } }
      if (result && result.msg && result.msg.error) {
        error.value = result.msg.error;
        throw new Error(error.value);
      }
      // backend DeleteUserOnAccountClose sync will automatically delete user as well
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to close profile.';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function batchUpdateProfile(newProfile: UserProfile): Promise<void> {
    loading.value = true;
    error.value = '';
    try {
      const userId = getUserId();
      const session = getSession();
      if (!userId) throw new Error('User not found');
      if (!session) throw new Error('Session not found');
      
      // Update each field, but do not fetch after each
      await updateDisplayName(newProfile.displayname || '');
      await updateBio(newProfile.bio || '');
      await updateLocation(newProfile.location || '');
      const ec = newProfile.emergencyContact || { name: '', phone: '' };
      await updateEmergencyContact(ec.name || '', ec.phone || '');
      const tags = newProfile.tags || {};
      for (const tagType of ['gender', 'age', 'runningLevel', 'runningPace', 'personality']) {
        if (tags[tagType]) {
          await updateTag(tagType, tags[tagType]);
        }
      }
      
      // Update profile image if present (always update to ensure it's saved)
      if (newProfile.profileImage) {
        const result = await ApiService.callConceptAction('UserProfile', 'setProfileImage', { 
          session, 
          image: newProfile.profileImage 
        });
        // Backend wraps response in msg: { msg: {} } or { msg: { error } }
        if (result && result.msg && result.msg.error) {
          throw new Error('Failed to update profile image: ' + result.msg.error);
        }
      }
      
      await setIsActive(true);
      // Only fetch once at the end
      await fetchProfile();
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update profile.';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  // Automatically fetch profile on store creation and whenever user changes
  if (getUserId()) {
    fetchProfile();
  }
  watch(
    () => authStore.user?.id,
    (newUserId, oldUserId) => {
      if (newUserId && newUserId !== oldUserId) {
        fetchProfile();
      }
    }
  );

  return {
    profile,
    loading,
    error,
    hasProfile,
    fetchProfile,
    createProfile,
    updateDisplayName,
    updateBio,
    updateLocation,
    updateEmergencyContact,
    updateTag,
    batchUpdateProfile,
    setIsActive,
    closeProfile,
    requestFileUpload,
    confirmFileUpload,
    getFileDownloadURL
  };
});
