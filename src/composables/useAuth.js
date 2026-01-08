import { ref, computed } from 'vue';
import { auth } from '../services/api';

const user = ref(JSON.parse(localStorage.getItem('user') || 'null'));
const token = ref(localStorage.getItem('token'));
const isLoading = ref(false);
const error = ref(null);

export function useAuth() {
    const isAuthenticated = computed(() => !!token.value);

    const setUser = (userData) => {
        user.value = userData;
        localStorage.setItem('user', JSON.stringify(userData));
    };

    const setToken = (newToken) => {
        token.value = newToken;
        localStorage.setItem('token', newToken);
    };

    const clearAuth = () => {
        user.value = null;
        token.value = null;
        localStorage.removeItem('user');
        localStorage.removeItem('token');
    };

    const fetchUser = async () => {
        if (!token.value) return;
        isLoading.value = true;
        error.value = null;
        try {
            const { data } = await auth.me();
            setUser(data);
        } catch (e) {
            console.error('Failed to fetch user:', e);
            error.value = e;
            // If 401, clear auth (handled by api interceptor usually, but good to be safe)
            if (e.response && e.response.status === 401) {
                clearAuth();
            }
        } finally {
            isLoading.value = false;
        }
    };

    const login = async (email, password) => {
        isLoading.value = true;
        error.value = null;
        try {
            const { data } = await auth.login(email, password);
            setToken(data.token);
            setUser(data.user);
            return data;
        } catch (e) {
            error.value = e;
            throw e;
        } finally {
            isLoading.value = false;
        }
    };

    const logout = () => {
        auth.logout(); // Clears local storage via api service too, but good to call
        clearAuth();
        window.location.href = '/login';
    };

    return {
        user,
        token,
        isAuthenticated,
        isLoading,
        error,
        fetchUser,
        login,
        logout,
        setUser
    };
}
