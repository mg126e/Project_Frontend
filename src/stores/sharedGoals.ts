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
        this.sharedGoals = Array.isArray(response)
          ? response.map((g: any) => ({
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
        return response;
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
        if (response.error) throw new Error(response.error);
        // Do NOT refresh the goals list here.
        // The modal will emit 'goalCreated' after approval, and the view will refresh then.
        return response.sharedGoalId;
      } catch (err: any) {
        this.error = err.message || 'Failed to create shared goal.';
        throw err;
      }
    },

    async closeSharedGoal({ sharedGoal, user }: { sharedGoal: string; user: string }) {
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
          this.steps = Array.isArray(response)
            ? response.map((s: any) => ({
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

    async generateSharedSteps({ sharedGoal, user }: { sharedGoal: string; user: string }) {
      // Don't use this.loading to avoid triggering reactivity that unmounts the modal
      try {
        const session = this.getSession();
        if (!session) throw new Error('Session not found');
        // Correct backend action name is 'generateSharedSteps'
        const response = await ApiService.callConceptAction<any>('SharedGoals', 'generateSharedSteps', { session, sharedGoal });
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

    async regenerateSharedSteps({ sharedGoal, user }: { sharedGoal: string; user: string }) {
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

    async addSharedStep({ sharedGoal, description, user }: { sharedGoal: string; description: string; user: string }) {
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

    async completeSharedStep({ step, user, sharedGoal }: { step: string; user: string; sharedGoal: string }) {
      this.loading = true;
      this.error = '';
      try {
        const session = this.getSession();
        if (!session) throw new Error('Session not found');
        const response = await ApiService.callConceptAction<any>('SharedGoals', 'completeSharedStep', { session, step });
        if (response.error) throw new Error(response.error);
        await this.fetchSharedSteps(sharedGoal);
        // If all steps are now completed, close the goal
        const allComplete = this.steps.length > 0 && this.steps.every(s => !!s.completion);
        if (allComplete) {
          await this.closeSharedGoal({ sharedGoal, user });
        }
      } catch (err: any) {
        this.error = err.message || 'Failed to complete shared step.';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async removeSharedStep({ step, user, sharedGoal }: { step: string; user: string; sharedGoal: string }) {
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
    },

    // Wrapper for explicit step fetching (for clarity/future-proofing)
    async getSharedSteps(sharedGoal: string) {
      return await this.fetchSharedSteps(sharedGoal);
    },
  },
});
