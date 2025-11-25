
import { ref, computed } from 'vue';
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
        profile.value = mergeProfile(result as UserProfile);
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

  function mergeProfile(partial: Partial<UserProfile>): UserProfile {
    const { name = '', phone = '' } = partial.emergencyContact || {};
    return {
      ...defaultProfile,
      ...partial,
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
        profile.value = { ...(profile.value || {}), displayname };
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

  async function updateProfileImage(image: string): Promise<void> {
    loading.value = true;
    error.value = '';
    try {
      const userId = getUserId();
      if (!userId) throw new Error('User not found');
      const result = await ApiService.callConceptAction('UserProfile', 'setProfileImage', { user: userId, image });
      if (result && !result.error) {
        profile.value = { ...(profile.value || {}), profileImage: image };
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
        profile.value = { ...(profile.value || {}), bio };
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
        profile.value = { ...(profile.value || {}), location };
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
        profile.value = { ...(profile.value || {}), emergencyContact: { name, phone } };
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
        const tags = { ...((profile.value && profile.value.tags) || {}) };
        tags[tagType] = value;
        profile.value = { ...(profile.value || {}), tags };
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

  async function removeTag(tagType: string): Promise<void> {
    loading.value = true;
    error.value = '';
    try {
      const userId = getUserId();
      if (!userId) throw new Error('User not found');
      const result = await ApiService.callConceptAction('UserProfile', 'removeTag', { user: userId, tagType });
      if (result && !result.error) {
        if (profile.value && profile.value.tags) {
          const tags = { ...profile.value.tags };
          delete tags[tagType];
          profile.value = { ...profile.value, tags };
        }
      } else {
        error.value = (result && typeof result === 'object' && 'error' in result) ? (result.error as string) : 'Failed to remove tag.';
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to remove tag.';
      throw e;
    } finally {
      loading.value = false;
    }
  }

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
    removeTag,
  };
});
