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
  const getSession = () => authStore.session; // TODO: use
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
      const userId = getUserId();
      if (!userId) throw new Error('User not found');
      const result = await ApiService.callConceptAction('UserProfile', '_getProfile', { user: userId });
      console.log('result:', result);
      if (result && !result.error) {
        const merged = await mergeProfile(result as UserProfile);
        // Only mutate properties, never replace the object
        for (const key of Object.keys(merged)) {
          // @ts-ignore
          profile.value[key] = merged[key];
        }
        console.log('[fetchProfile after mergeProfile] profile.value:', profile.value);
      } else if (result && typeof result === 'object' && 'error' in result && String(result.error).toLowerCase().includes('not found')) {
        // If profile not found, create it and retry
        console.warn('Profile not found, creating profile...');
        await createProfile();
        // createProfile already calls fetchProfile, so return
        return;
      } else {
        error.value = (result && typeof result === 'object' && 'error' in result) ? (result.error as string) : 'Failed to fetch profile.';
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
    console.log('[mergeProfile] backend returned:', JSON.parse(JSON.stringify(partial)));
    const { name = '', phone = '' } = partial.emergencyContact || {};
    let profileImage = '';
    if (partial.profileImage) {
      // If profileImage is a fileId, resolve to download URL
      const res = await ApiService.getDownloadURL(partial.profileImage);
      if (res && 'downloadURL' in res) {
        profileImage = res.downloadURL + '?t=' + Date.now();
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
    console.log('[mergeProfile] merged profile:', JSON.parse(JSON.stringify(merged)));
    return merged;
  }

  async function createProfile(): Promise<void> {
    loading.value = true;
    error.value = '';
    try {
      const userId = getUserId();
      if (!userId) throw new Error('User not found');
      const result = await ApiService.callConceptAction('UserProfile', 'createProfile', { user: userId });
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
      const userId = getUserId();
      if (!userId) throw new Error('User not found');
      const payload = { user: userId, displayname };
      console.log('[updateDisplayName] Payload:', payload);
      const result = await ApiService.callConceptAction('UserProfile', 'setName', payload);
      if (result && result.error) {
        error.value = (typeof result === 'object' && 'error' in result) ? (result.error as string) : 'Failed to update display name.';
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update display name.';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function updateProfileImage(file: File): Promise<void> {
    loading.value = true;
    error.value = '';
    try {
      const userId = getUserId();
      if (!userId) throw new Error('User not found');
      // 1. Request upload URL
      const filename = file.name;
      const uploadRes = await ApiService.requestUploadURL(userId, filename);
      if (!uploadRes || 'error' in uploadRes) {
        throw new Error(uploadRes?.error || 'Failed to get upload URL');
      }
      // 2. Upload file to uploadURL (local: PUT to /uploads/...)
      const uploadURL = uploadRes.uploadURL;
      const fileId = uploadRes.file;
      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
      });
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }
      // 3. Confirm upload
      const confirmRes = await ApiService.confirmUpload(fileId);
      if (!confirmRes || 'error' in confirmRes) {
        throw new Error(confirmRes?.error || 'Failed to confirm upload');
      }
      // 4. Save fileId in profile (setProfileImage)
      const result = await ApiService.callConceptAction('UserProfile', 'setProfileImage', { user: userId, image: fileId });
      if (result && !result.error) {
        // Always re-fetch the profile to ensure the image is resolved and state is in sync
        await fetchProfile();
      } else {
        error.value = (result && typeof result === 'object' && 'error' in result) ? (result.error as string) : 'Failed to update profile image.';
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update profile image.';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function updateBio(bio: string): Promise<void> {
    loading.value = true;
    error.value = '';
    try {
      const userId = getUserId();
      if (!userId) throw new Error('User not found');
      const payload = { user: userId, bio };
      console.log('[updateBio] Payload:', payload);
      const result = await ApiService.callConceptAction('UserProfile', 'setBio', payload);
      if (result && result.error) {
        error.value = (typeof result === 'object' && 'error' in result) ? (result.error as string) : 'Failed to update bio.';
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
      const userId = getUserId();
      if (!userId) throw new Error('User not found');
      const payload = { user: userId, location };
      console.log('[updateLocation] Payload:', payload);
      const result = await ApiService.callConceptAction('UserProfile', 'setLocation', payload);
      if (result && result.error) {
        error.value = (typeof result === 'object' && 'error' in result) ? (result.error as string) : 'Failed to update location.';
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
      const userId = getUserId();
      if (!userId) throw new Error('User not found');
      const payload = { user: userId, name, phone };
      console.log('[updateEmergencyContact] Payload:', payload);
      const result = await ApiService.callConceptAction('UserProfile', 'setEmergencyContact', payload);
      if (result && result.error) {
        error.value = (typeof result === 'object' && 'error' in result) ? (result.error as string) : 'Failed to update emergency contact.';
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
      const userId = getUserId();
      if (!userId) throw new Error('User not found');
      const payload = { user: userId, tagType, value };
      console.log('[updateTag] Payload:', payload);
      const result = await ApiService.callConceptAction('UserProfile', 'setTag', payload);
      if (result && result.error) {
        error.value = (typeof result === 'object' && 'error' in result) ? (result.error as string) : 'Failed to update tag.';
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
      const userId = getUserId();
      if (!userId) throw new Error('User not found');
      const payload = { user: userId, isActive };
      const result = await ApiService.callConceptAction('UserProfile', 'setIsActive', payload);
      if (result && result.error) {
        error.value = (typeof result === 'object' && 'error' in result) ? (result.error as string) : 'Failed to update isActive.';
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
      const userId = getUserId();
      if (!userId) throw new Error('User not found');
      const result = await ApiService.callConceptAction('UserProfile', 'closeProfile', { user: userId });
      if (result && result.error) {
        error.value = (typeof result === 'object' && 'error' in result) ? (result.error as string) : 'Failed to close profile.';
        throw new Error(error.value);
      }
      // Note: The backend DeleteUserOnAccountClose sync will automatically
      // delete the user from PasswordAuthentication after closeProfile succeeds
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
    console.log('[batchUpdateProfile] Received newProfile:', newProfile);
    try {
      const userId = getUserId();
      if (!userId) throw new Error('User not found');
      // Update each field, but do not fetch after each
      await updateDisplayName(newProfile.displayname || '');
      await updateBio(newProfile.bio || '');
      console.log('[batchUpdateProfile] profile.value.location before updateLocation:', profile.value.location);
      await updateLocation(newProfile.location || '');
      const ec = newProfile.emergencyContact || { name: '', phone: '' };
      await updateEmergencyContact(ec.name || '', ec.phone || '');
      const tags = newProfile.tags || {};
      for (const tagType of ['gender', 'age', 'runningLevel', 'runningPace', 'personality']) {
        if (tags[tagType]) {
          await updateTag(tagType, tags[tagType]);
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
      if (!newUserId) {
        // Optionally clear profile on logout, but keep the reference
        for (const key of Object.keys(defaultProfile)) {
          // @ts-ignore
          profile.value[key] = defaultProfile[key];
        }
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
    updateProfileImage,
    updateBio,
    updateLocation,
    updateEmergencyContact,
    updateTag,
    batchUpdateProfile,
    setIsActive,
    closeProfile
  };
});
