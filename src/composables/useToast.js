
import { ref } from 'vue';

const toasts = ref([]);

export function useToast() {
    const addToast = (message, type = 'info', duration = 3000) => {
        const id = Date.now();
        toasts.value.push({ id, message, type });

        setTimeout(() => {
            removeToast(id);
        }, duration);
    };

    const removeToast = (id) => {
        toasts.value = toasts.value.filter(t => t.id !== id);
    };

    const success = (msg) => addToast(msg, 'success');
    const error = (msg) => addToast(msg, 'error');
    const info = (msg) => addToast(msg, 'info');
    const warning = (msg) => addToast(msg, 'warning');

    return {
        toasts,
        addToast,
        removeToast,
        success,
        error,
        info,
        warning
    };
}
