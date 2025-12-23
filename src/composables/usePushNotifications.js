import { ref } from 'vue';
import { push } from '../services/api';

const isSupported = ref(false);
const isSubscribed = ref(false);
const permission = ref('default');

// Check if push notifications are supported
export const checkSupport = () => {
    isSupported.value = 'serviceWorker' in navigator && 'PushManager' in window;
    return isSupported.value;
};

// Get current permission status
export const checkPermission = () => {
    if ('Notification' in window) {
        permission.value = Notification.permission;
    }
    return permission.value;
};

// Convert VAPID key from base64 to Uint8Array
const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
};

// Request permission and subscribe
export const subscribeToPush = async () => {
    if (!checkSupport()) {
        console.warn('[Push] Not supported');
        return false;
    }

    try {
        // Request permission
        const result = await Notification.requestPermission();
        permission.value = result;

        if (result !== 'granted') {
            console.log('[Push] Permission denied');
            return false;
        }

        // Get VAPID key from server
        const { data } = await push.getVapidKey();
        const vapidKey = data.publicKey;

        if (!vapidKey) {
            console.warn('[Push] No VAPID key from server');
            return false;
        }

        // Get service worker registration
        const registration = await navigator.serviceWorker.ready;

        // Subscribe to push
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey)
        });

        // Send subscription to server
        await push.subscribe(subscription.toJSON());

        isSubscribed.value = true;
        console.log('[Push] Subscribed successfully');
        return true;
    } catch (error) {
        console.error('[Push] Subscription failed:', error);
        return false;
    }
};

// Check if already subscribed
export const checkSubscription = async () => {
    if (!checkSupport()) return false;

    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        isSubscribed.value = !!subscription;
        return isSubscribed.value;
    } catch (error) {
        console.error('[Push] Check subscription error:', error);
        return false;
    }
};

// Unsubscribe
export const unsubscribeFromPush = async () => {
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            await push.unsubscribe(subscription.endpoint);
            await subscription.unsubscribe();
            isSubscribed.value = false;
            console.log('[Push] Unsubscribed');
            return true;
        }
        return false;
    } catch (error) {
        console.error('[Push] Unsubscribe error:', error);
        return false;
    }
};

export const usePushNotifications = () => {
    return {
        isSupported,
        isSubscribed,
        permission,
        checkSupport,
        checkPermission,
        checkSubscription,
        subscribeToPush,
        unsubscribeFromPush
    };
};

export default usePushNotifications;
