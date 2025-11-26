
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
      genderOther: '',
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
      const result = await ApiService.callConceptAction('UserProfile', 'getProfile', { user: userId });
      if (result && !result.error) {
        profile.value = await mergeProfile(result as UserProfile);
        // Debug: log the resolved profile after refresh
        console.log('[fetchProfile after mergeProfile] profile.value:', profile.value);
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
      genderOther: '',
      age: '',
      runningLevel: '',
      runningPace: '',
      personality: ''
    }
  };

  async function mergeProfile(partial: Partial<UserProfile>): Promise<UserProfile> {
    const { name = '', phone = '' } = partial.emergencyContact || {};
    let profileImage = '';
    if (partial.profileImage) {
      // If profileImage is a fileId, resolve to download URL
      const res = await ApiService.getDownloadURL(partial.profileImage);
      if (res && 'downloadURL' in res) {
        profileImage = res.downloadURL + '?t=' + Date.now();
      }
    }
    return {
      ...defaultProfile,
      ...partial,
      profileImage,
      emergencyContact: { name, phone },
      tags: {
        ...defaultProfile.tags,
        ...(partial.tags || {})
      }
    };
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
      const result = await ApiService.callConceptAction('UserProfile', 'setName', { user: userId, displayname });
      if (result && !result.error) {
        await fetchProfile();
      } else {
        error.value = (result && typeof result === 'object' && 'error' in result) ? (result.error as string) : 'Failed to update display name.';
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
      const result = await ApiService.callConceptAction('UserProfile', 'setBio', { user: userId, bio });
      if (result && !result.error) {
        await fetchProfile();
      } else {
        error.value = (result && typeof result === 'object' && 'error' in result) ? (result.error as string) : 'Failed to update bio.';
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
      const result = await ApiService.callConceptAction('UserProfile', 'setLocation', { user: userId, location });
      if (result && !result.error) {
        await fetchProfile();
      } else {
        error.value = (result && typeof result === 'object' && 'error' in result) ? (result.error as string) : 'Failed to update location.';
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
      const result = await ApiService.callConceptAction('UserProfile', 'setEmergencyContact', { user: userId, name, phone });
      if (result && !result.error) {
        await fetchProfile();
      } else {
        error.value = (result && typeof result === 'object' && 'error' in result) ? (result.error as string) : 'Failed to update emergency contact.';
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
      const result = await ApiService.callConceptAction('UserProfile', 'setTag', { user: userId, tagType, value });
      if (result && !result.error) {
        await fetchProfile();
      } else {
        error.value = (result && typeof result === 'object' && 'error' in result) ? (result.error as string) : 'Failed to update tag.';
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update tag.';
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
        // Optionally clear profile on logout
        profile.value = { ...defaultProfile };
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
  };
});
