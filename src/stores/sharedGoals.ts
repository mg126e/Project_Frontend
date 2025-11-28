import { defineStore } from 'pinia';
import { ApiService } from '@/services/api';

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
    loading: false,
    error: '',
  }),
  actions: {

    // New: Fetch all shared goals for a user
    async fetchAllSharedGoalsForUser(user: string) {
      this.loading = true;
      this.error = '';
      try {
        // Call the new backend method (update backend to support this!)
        const response = await ApiService.callConceptAction<any>('SharedGoals', 'getAllGoalsForUser', { user });
        this.sharedGoals = Array.isArray(response)
          ? response.map((g: any) => ({
              id: g._id, // use _id from backend
              description: g.description,
              isActive: g.isActive,
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
        const response = await ApiService.callConceptAction<any>('SharedGoals', '_getSharedGoalById', { users, sharedGoalId });
        return response;
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch shared goal.';
        return null;
      } finally {
        this.loading = false;
      }
    },

    async createSharedGoal({ users, description }: { users: string[]; description: string }) {
      this.loading = true;
      this.error = '';
      try {
        const response = await ApiService.callConceptAction<any>('SharedGoals', 'createSharedGoal', { users, description });
        if (response.error) throw new Error(response.error);
        // After creating, fetch all shared goals for the current user (assume first user is current)
        if (Array.isArray(users) && typeof users[0] === 'string') {
          await this.fetchAllSharedGoalsForUser(users[0]);
        }
        return response.sharedGoalId;
      } catch (err: any) {
        this.error = err.message || 'Failed to create shared goal.';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async closeSharedGoal({ sharedGoal, user }: { sharedGoal: string; user: string }) {
      this.loading = true;
      this.error = '';
      try {
        const response = await ApiService.callConceptAction<any>('SharedGoals', 'closeSharedGoal', { sharedGoal, user });
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
        const response = await ApiService.callConceptAction<any>('SharedGoals', '_getSharedSteps', { sharedGoal });
        this.steps = Array.isArray(response)
          ? response.map((s: any) => ({
              id: s.id,
              description: s.description,
              start: s.start,
              completion: s.completion,
            }))
          : [];
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch shared steps.';
      } finally {
        this.loading = false;
      }
    },

    async generateSharedSteps({ sharedGoal, user }: { sharedGoal: string; user: string }) {
      this.loading = true;
      this.error = '';
      try {
        // Correct backend action name is 'generateSharedSteps'
        const response = await ApiService.callConceptAction<any>('SharedGoals', 'generateSharedSteps', { sharedGoal, user });
        if (response.error) throw new Error(response.error);
        await this.fetchSharedSteps(sharedGoal);
        return response.steps;
      } catch (err: any) {
        this.error = err.message || 'Failed to generate shared steps.';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async regenerateSharedSteps({ sharedGoal, user }: { sharedGoal: string; user: string }) {
      this.loading = true;
      this.error = '';
      try {
        // Correct backend action name is 'regenerateSharedSteps'
        const response = await ApiService.callConceptAction<any>('SharedGoals', 'regenerateSharedSteps', { sharedGoal, user });
        if (response.error) throw new Error(response.error);
        await this.fetchSharedSteps(sharedGoal);
        return response.steps;
      } catch (err: any) {
        this.error = err.message || 'Failed to regenerate shared steps.';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async addSharedStep({ sharedGoal, description, user }: { sharedGoal: string; description: string; user: string }) {
      this.loading = true;
      this.error = '';
      try {
        const response = await ApiService.callConceptAction<any>('SharedGoals', 'addSharedStep', { sharedGoal, description, user });
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
        const response = await ApiService.callConceptAction<any>('SharedGoals', 'completeSharedStep', { step, user });
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
        const response = await ApiService.callConceptAction<any>('SharedGoals', 'removeSharedStep', { step, user });
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
        await ApiService.callConceptAction<any>('SharedGoals', 'setInitialized', { users, isInitialized });
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
