import { defineStore } from 'pinia';
import { ApiService } from '@/services/api';
import { useAuthStore } from '@/stores/auth';

export interface SharedGoalUser {
  id: string;
  name?: string;
}

export interface SharedGoal {
  id: string;
  description: string;
  isActive: boolean;
  users: SharedGoalUser[];
}

export interface SharedStep {
  id: string;
  description: string;
  start: string;
  completion?: string;
}

export const useSharedGoalsStore = defineStore('sharedGoals', {
  state: () => ({
    sharedGoals: [] as SharedGoal[],
    steps: [] as SharedStep[],
    stepsByGoal: {} as Record<string, SharedStep[]>,
    loading: false,
    error: '',
  }),
  actions: {
    getSession() {
      const authStore = useAuthStore();
      return authStore.session;
    },

    // New: Fetch all shared goals for a user
    async fetchAllSharedGoalsForUser() {
      this.loading = true;
      this.error = '';
      try {
        const session = this.getSession();
        if (!session) throw new Error('Session not found');
        // Call the new backend method (update backend to support this!)
        const response = await ApiService.callConceptAction<any>('SharedGoals', '_getAllGoalsForUser', { session });
        // Backend returns { goals: [...] }
        const goalsList = response.goals || response;
        this.sharedGoals = Array.isArray(goalsList)
          ? goalsList.map((g: any) => ({
              id: g._id, // use _id from backend
              description: g.description,
              isActive: g.isActive,
              createdAt: g.createdAt || g.start,
              closedAt: g.closedAt,
              users: Array.isArray(g.users)
                ? g.users.map((u: any) => ({
                    id: u.id || u._id || u,
                    displayname: u.displayname || undefined,
                  }))
                : [],
            }))
          : [];
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch shared goals.';
      } finally {
        this.loading = false;
      }
    },

    async fetchSharedGoalById(users: string[], sharedGoalId: string) {
      this.loading = true;
      this.error = '';
      try {
        const session = this.getSession();
        if (!session) throw new Error('Session not found');
        const response = await ApiService.callConceptAction<any>('SharedGoals', '_getSharedGoalById', { session, users, sharedGoalId });
        // Backend returns { goal: {...} }
        return response.goal || response;
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch shared goal.';
        return null;
      } finally {
        this.loading = false;
      }
    },

    async createSharedGoal({ users, description }: { users: string[]; description: string }) {
      try {
        const session = this.getSession();
        if (!session) throw new Error('Session not found');
        const response = await ApiService.callConceptAction<any>('SharedGoals', 'createSharedGoal', { session, users, description });
        console.log('[SharedGoalsStore] createSharedGoal response:', JSON.stringify(response, null, 2));
        console.log('[SharedGoalsStore] Response keys:', Object.keys(response));
        if (response.error) {
          this.error = response.error;
          throw new Error(response.error);
        }
        // Do NOT refresh the goals list here.
        // The modal will emit 'goalCreated' after approval, and the view will refresh then.
        
        // Try different possible property names, or if response is the ID itself
        let goalId = response.sharedGoalId || response.sharedGoal || response.id || response._id || response.goal;
        
        // If none of the properties exist, the response itself might be the ID
        if (!goalId && typeof response === 'string') {
          goalId = response;
        }
        
        // Check all properties of response
        if (!goalId) {
          console.error('[SharedGoalsStore] Could not find goal ID in response. Response properties:', Object.getOwnPropertyNames(response));
          for (const key in response) {
            console.log(`[SharedGoalsStore] response.${key} =`, response[key]);
          }
        }
        
        console.log('[SharedGoalsStore] Extracted goal ID:', goalId);
        
        if (!goalId) {
          throw new Error('Backend did not return a goal ID');
        }
        
        return goalId;
      } catch (err: any) {
        this.error = err.message || 'Failed to create shared goal.';
        throw err;
      }
    },

    async closeSharedGoal({ sharedGoal }: { sharedGoal: string }) {
      this.loading = true;
      this.error = '';
      try {
        const session = this.getSession();
        if (!session) throw new Error('Session not found');
        const response = await ApiService.callConceptAction<any>('SharedGoals', 'closeSharedGoal', { session, sharedGoal });
        if (response.error) throw new Error(response.error);
      } catch (err: any) {
        this.error = err.message || 'Failed to close shared goal.';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async fetchSharedSteps(sharedGoal: string) {
      this.loading = true;
      this.error = '';
      try {
        const session = this.getSession();
        if (!session) throw new Error('Session not found');
        const response = await ApiService.callConceptAction<any>('SharedGoals', '_getSharedSteps', { session, sharedGoal });
          // Backend returns { steps: [...] }
          const stepsList = response.steps || response;
          this.steps = Array.isArray(stepsList)
            ? stepsList.map((s: any) => ({
                id: s.id || s._id,
                description: s.description,
                start: s.start,
                completion: s.completion,
              }))
          : [];
          // Also store in stepsByGoal map for multi-goal tracking
          this.stepsByGoal[sharedGoal] = this.steps;
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch shared steps.';
      } finally {
        this.loading = false;
      }
    },

    async generateSharedSteps({ sharedGoal }: { sharedGoal: string }) {
      // Don't use this.loading to avoid triggering reactivity that unmounts the modal
      try {
        const session = this.getSession();
        if (!session) throw new Error('Session not found');
        console.log('[SharedGoalsStore] Calling generateSharedSteps with:', { session, sharedGoal });
        // Correct backend action name is 'generateSharedSteps'
        const response = await ApiService.callConceptAction<any>('SharedGoals', 'generateSharedSteps', { session, sharedGoal });
        console.log('[SharedGoalsStore] generateSharedSteps response:', response);
        if (response.error) {
          // Return error object instead of throwing to keep modal alive
          return { error: response.error };
        }
        // DO NOT automatically fetch and persist steps here.
        // The modal will handle displaying and saving after user approval.
        return { steps: response.steps };
      } catch (err: any) {
        // Return error instead of throwing
        return { error: err.message || 'Failed to generate shared steps.' };
      }
    },

    async regenerateSharedSteps({ sharedGoal }: { sharedGoal: string }) {
      // Don't use this.loading to avoid triggering reactivity that unmounts the modal
      try {
        const session = this.getSession();
        if (!session) throw new Error('Session not found');
        const response = await ApiService.callConceptAction<any>('SharedGoals', 'regenerateSharedSteps', { session, sharedGoal });
        if (response.error) {
          // Return error object instead of throwing to keep modal alive
          return { error: response.error };
        }
        // DO NOT automatically fetch and persist steps here.
        // The modal will handle displaying and saving after user approval.
        return { steps: response.steps };
      } catch (err: any) {
        // Return error instead of throwing
        return { error: err.message || 'Failed to regenerate shared steps.' };
      }
    },

    async addSharedStep({ sharedGoal, description }: { sharedGoal: string; description: string }) {
      this.loading = true;
      this.error = '';
      try {
        const session = this.getSession();
        if (!session) throw new Error('Session not found');
        const response = await ApiService.callConceptAction<any>('SharedGoals', 'addSharedStep', { session, sharedGoal, description });
        if (response.error) throw new Error(response.error);
        await this.fetchSharedSteps(sharedGoal);
        return response.step;
      } catch (err: any) {
        this.error = err.message || 'Failed to add shared step.';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async completeSharedStep({ step, sharedGoal }: { step: string; sharedGoal: string }) {
      this.loading = true;
      this.error = '';
      try {
        const session = this.getSession();
        if (!session) throw new Error('Session not found');
        const response = await ApiService.callConceptAction<any>('SharedGoals', 'completeSharedStep', { session, step });
        if (response.error) throw new Error(response.error);
        await this.fetchSharedSteps(sharedGoal);
        // Removed auto-close logic - let users manually close the goal
      } catch (err: any) {
        this.error = err.message || 'Failed to complete shared step.';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async removeSharedStep({ step, sharedGoal }: { step: string; sharedGoal: string }) {
      this.loading = true;
      this.error = '';
      try {
        const session = this.getSession();
        if (!session) throw new Error('Session not found');
        const response = await ApiService.callConceptAction<any>('SharedGoals', 'removeSharedStep', { session, step });
        if (response.error) throw new Error(response.error);
        await this.fetchSharedSteps(sharedGoal);
      } catch (err: any) {
        this.error = err.message || 'Failed to remove shared step.';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async setInitialized({ users, isInitialized }: { users: string[]; isInitialized: boolean }) {
      this.loading = true;
      this.error = '';
      try {
        const session = this.getSession();
        if (!session) throw new Error('Session not found');
        await ApiService.callConceptAction<any>('SharedGoals', 'setInitialized', { session, users, isInitialized });
      } catch (err: any) {
        this.error = err.message || 'Failed to set initialized.';
        throw err;
      } finally {
        this.loading = false;
      }
    }
  }
});
