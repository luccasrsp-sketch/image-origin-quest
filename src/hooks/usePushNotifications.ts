import { useState, useEffect, useCallback } from 'react';

declare global {
  interface ServiceWorkerRegistration {
    pushManager: PushManager;
  }
}

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// VAPID public key - this should be generated and stored securely
// For now, we'll generate one or use a placeholder
const VAPID_PUBLIC_KEY = 'BLBx-OVEZuLJqnHjhHYxiWY2qnNqY_G4h5pY3gP4CQeLvqZlPqaQtKtEaLEZqCnE_cZ3JJpQhBQJdN5pHqMx0EE';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { profile } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Check if push notifications are supported
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
      checkSubscription();
    } else {
      setIsLoading(false);
    }
  }, [profile]);

  const checkSubscription = async () => {
    if (!profile) {
      setIsLoading(false);
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        // Check if this subscription exists in the database
        const { data } = await supabase
          .from('push_subscriptions')
          .select('id')
          .eq('endpoint', subscription.endpoint)
          .maybeSingle();
        
        setIsSubscribed(!!data);
      } else {
        setIsSubscribed(false);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const subscribe = useCallback(async () => {
    if (!profile || !isSupported) return false;

    try {
      // Request permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      
      if (permissionResult !== 'granted') {
        toast.error('Permissão para notificações negada');
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });

      // Extract keys
      const subscriptionJson = subscription.toJSON();
      const p256dh = subscriptionJson.keys?.p256dh || '';
      const auth = subscriptionJson.keys?.auth || '';

      // Save to database
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: profile.id,
          endpoint: subscription.endpoint,
          p256dh,
          auth,
        }, {
          onConflict: 'user_id,endpoint',
        });

      if (error) throw error;

      setIsSubscribed(true);
      toast.success('Notificações ativadas!');
      return true;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      toast.error('Erro ao ativar notificações');
      return false;
    }
  }, [profile, isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!profile) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        // Remove from database
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', subscription.endpoint);

        // Unsubscribe from push
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
      toast.success('Notificações desativadas');
      return true;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast.error('Erro ao desativar notificações');
      return false;
    }
  }, [profile]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
  };
}
