import { createRouter, createWebHistory } from 'vue-router'
import SplashView from '../views/SplashView.vue'

// Public routes that don't require authentication
const publicRoutes = ['/', '/login', '/signup', '/forgot-password', '/admin/login'];

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'splash',
            component: SplashView
        },
        {
            path: '/login',
            name: 'login',
            component: () => import('../views/LoginView.vue')
        },
        {
            path: '/signup',
            name: 'signup',
            component: () => import('../views/SignupView.vue')
        },
        {
            path: '/dashboard',
            name: 'dashboard',
            component: () => import('../views/DashboardView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/book',
            name: 'book',
            component: () => import('../views/BookView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/split',
            name: 'split',
            component: () => import('../views/SplitView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/profile',
            name: 'profile',
            component: () => import('../views/ProfileView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/convert',
            name: 'convert',
            component: () => import('../views/ConvertView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/converted-codes',
            name: 'converted-codes',
            component: () => import('../views/ConvertedCodesView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/community-tickets',
            name: 'community-tickets',
            component: () => import('../views/CommunityTicketsView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/notifications',
            name: 'notifications',
            component: () => import('../views/NotificationsView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/pricing',
            name: 'pricing',
            component: () => import('../views/PricingView.vue'),
            meta: { requiresAuth: true }
        },


        {
            path: '/payment/callback',
            name: 'payment-callback',
            component: () => import('../views/PaymentCallbackView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/forgot-password',
            name: 'forgot-password',
            component: () => import('../views/ForgotPasswordView.vue')
        },
        {
            path: '/admin/login',
            name: 'admin-login',
            component: () => import('../views/admin/AdminLoginView.vue')
        },
        {
            path: '/admin',
            component: () => import('../layouts/AdminLayout.vue'),
            meta: { requiresAdmin: true },
            children: [
                {
                    path: '',
                    name: 'admin-dashboard',
                    component: () => import('../views/admin/AdminDashboardView.vue'),
                    meta: { title: 'Dashboard' }
                },
                {
                    path: 'users',
                    name: 'admin-users',
                    component: () => import('../views/admin/AdminUsersView.vue'),
                    meta: { title: 'User Management' }
                },
                {
                    path: 'content',
                    name: 'admin-content',
                    component: () => import('../views/admin/AdminContentView.vue'),
                    meta: { title: 'Content Management' }
                },
                {
                    path: 'clubs',
                    name: 'admin-clubs',
                    component: () => import('../views/admin/AdminClubsView.vue'),
                    meta: { title: 'Clubs Management' }
                },
                {
                    path: 'transactions',
                    name: 'admin-transactions',
                    component: () => import('../views/admin/AdminTransactionsView.vue'),
                    meta: { title: 'Transactions' }
                },
                {
                    path: 'plans',
                    name: 'admin-plans',
                    component: () => import('../views/admin/AdminPlansView.vue'),
                    meta: { title: 'Subscription Plans' }
                },
                {
                    path: 'notifications',
                    name: 'admin-notifications',
                    component: () => import('../views/admin/AdminNotificationsView.vue'),
                    meta: { title: 'Notifications' }
                }
            ]
        }
    ]
})

router.beforeEach(async (to, from, next) => {
    let token = localStorage.getItem('token');

    // Check Token Expiry
    if (token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            const payload = JSON.parse(jsonPayload);

            if (payload.exp && payload.exp * 1000 < Date.now()) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                token = null;
            }
        } catch (e) {
            localStorage.removeItem('token');
            token = null;
        }
    }
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : {};

    // Check if the path is public
    const isPublic = publicRoutes.includes(to.path);

    // If route requires admin access
    if (to.matched.some(record => record.meta.requiresAdmin)) {
        if (!token) return next('/admin/login');
        if (user.role !== 'admin') return next('/dashboard');
        return next();
    }

    // If route requires auth (or is not explicitly public)
    // We treat all non-public routes as requiring auth for safety
    if (!isPublic && !token) {
        return next('/login');
    }

    // Prevent authenticated users from visiting login/signup pages
    if (token && (to.path === '/login' || to.path === '/signup' || to.path === '/admin/login')) {
        if (user.role === 'admin' && to.path === '/admin/login') {
            return next('/admin');
        }
        return next('/dashboard');
    }

    next();
});

export default router
