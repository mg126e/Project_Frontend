
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth'
import { watch } from 'vue';

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		{
			path: '/',
			name: 'home',
			component: () => import('../views/HomeView.vue'),
			meta: { requiresGuest: true },
		},
		{
			path: '/login',
			name: 'login',
			component: () => import('../views/LoginView.vue'),
			meta: { requiresGuest: true },
		},
		{
			path: '/register',
			name: 'register',
			component: () => import('../views/RegisterView.vue'),
			meta: { requiresGuest: true },
		},
		{
			path: '/dashboard',
			component: () => import('../components/DashboardLayout.vue'),
			meta: { requiresAuth: true },
			children: [
				{
					path: '',
					name: 'dashboard-home',
					component: () => import('../views/DashboardView.vue'),
				},
			],
		},
		{
			path: '/profile',
			component: () => import('../components/DashboardLayout.vue'),
			meta: { requiresAuth: true },
			children: [
				{
					path: '',
					name: 'profile',
					component: () => import('../views/UserProfileView.vue'),
				},
			],
		},
		{
			path: '/find-buddy',
			component: () => import('../components/DashboardLayout.vue'),
			meta: { requiresAuth: true },
			children: [
				{
					path: '',
					name: 'run-buddy-finder',
					component: () => import('../views/RunBuddyFinderView.vue'),
				},
			],
		},
		{
			path: '/invite/:id',
			component: () => import('../components/DashboardLayout.vue'),
			meta: { requiresAuth: true },
			children: [
				{
					path: '',
					name: 'run-invite',
					component: () => import('../views/RunInviteView.vue'),
				},
			],
		},
		{
			path: '/run/:id',
			component: () => import('../components/DashboardLayout.vue'),
			meta: { requiresAuth: true },
			children: [
				{
					path: '',
					name: 'scheduled-run',
					component: () => import('../views/ScheduledRunView.vue'),
				},
			],
		},
		{
			path: '/matches',
			component: () => import('../components/DashboardLayout.vue'),
			meta: { requiresAuth: true },
			children: [
				{
					path: '',
					name: 'partner-matching',
					component: () => import('../views/PartnerMatchingView.vue'),
				},
				{
					path: 'partner',
					name: 'partner-matching-list',
					component: () => import('../views/PartnerMatchingListView.vue'),
				},
			],
		},
		{
			path: '/goals',
			component: () => import('../components/DashboardLayout.vue'),
			meta: { requiresAuth: true },
			children: [
				{
					path: '',
					name: 'shared-goals',
					component: () => import('../views/SharedGoalsView.vue'),
				},
				{
					path: ':id',
					name: 'goal-detail',
					component: () => import('../views/GoalDetailView.vue'),
				},
			],
		},
		{
			path: '/milestones',
			component: () => import('../components/DashboardLayout.vue'),
			meta: { requiresAuth: true },
			children: [
				{
					path: '',
					name: 'milestone-map',
					component: () => import('../views/MilestoneMapView.vue'),
				},
			],
		},
		{
			path: '/messages',
			component: () => import('../components/DashboardLayout.vue'),
			meta: { requiresAuth: true },
			children: [
				{
					path: '',
					name: 'messages',
					component: () => import('../views/MessagesView.vue'),
				},
			],
		},
		{
			path: '/chat/:id',
			component: () => import('../components/DashboardLayout.vue'),
			meta: { requiresAuth: true },
			children: [
				{
					path: '',
					name: 'chat',
					component: () => import('../views/ChatView.vue'),
				},
			],
		},
		{
			path: '/:pathMatch(.*)*',
			name: 'not-found',
			component: () => import('../views/NotFoundView.vue'),
		},
	],
});

router.beforeEach(async (to, from, next) => {
	// Only run on client
	if (typeof window !== 'undefined') {
		const auth = useAuthStore();
		// Wait for auth.ready if not ready yet
		if (!auth.ready) {
			await new Promise<void>(resolve => {
				const stop = watch(
					() => auth.ready,
					(val) => { if (val) { stop(); resolve(); } }
				);
			});
		}
		
		// Redirect authenticated users away from home page
		if (to.path === '/' && auth.user) {
			return next({ path: '/dashboard' });
		}
		
		if (to.matched.some(record => record.meta.requiresAuth)) {
			if (!auth.user) {
				return next({ name: 'login', query: { redirect: to.fullPath } });
			}
		}
		if (to.matched.some(record => record.meta.requiresGuest)) {
			if (auth.user) {
				return next({ path: '/dashboard' });
			}
		}
	}
	next();
});

export default router;
