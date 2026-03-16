import { useEffect, useRef } from 'react';

interface SyncData {
  employees: any[];
  teams: any[];
  prizePool: number;
  tvAudioSettings?: unknown;
  tvMemeSettings?: unknown;
  tvMemeTrigger?: unknown;
  timestamp: number;
}

/**
 * Cross-window synchronization via BroadcastChannel.
 * Keeps a single channel instance and only publishes when payload changes.
 */
export function useCrossWindowSync(
  data: Omit<SyncData, 'timestamp'>,
  onDataUpdate?: (data: SyncData) => void
) {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const prevPayloadRef = useRef('');
  const onDataUpdateRef = useRef(onDataUpdate);

  useEffect(() => {
    onDataUpdateRef.current = onDataUpdate;
  }, [onDataUpdate]);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') {
      console.warn('BroadcastChannel API is not supported');
      return;
    }

    const channel = new BroadcastChannel('law-firm-rating-sync');
    channelRef.current = channel;

    const handleMessage = (event: MessageEvent) => {
      try {
        const syncData = event.data as SyncData;
        onDataUpdateRef.current?.(syncData);
      } catch (error) {
        console.error('Error handling sync message:', error);
      }
    };

    channel.addEventListener('message', handleMessage);

    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
      channelRef.current = null;
    };
  }, []);

  useEffect(() => {
    const channel = channelRef.current;
    if (!channel) return;

    const payload = JSON.stringify(data);
    if (payload === prevPayloadRef.current) return;

    prevPayloadRef.current = payload;

    const syncData: SyncData = {
      ...data,
      timestamp: Date.now(),
    };

    try {
      channel.postMessage(syncData);
    } catch (error) {
      console.error('Error posting sync message:', error);
    }
  }, [data.employees, data.teams, data.prizePool, data.tvAudioSettings, data.tvMemeSettings, data.tvMemeTrigger]);
}

/**
 * Listens for sync messages and mirrors them to localStorage + custom event.
 */
export function useReceiveSyncData() {
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') {
      console.warn('BroadcastChannel API is not supported');
      return;
    }

    const channel = new BroadcastChannel('law-firm-rating-sync');

    const handleMessage = (event: MessageEvent) => {
      try {
        const syncData = event.data as SyncData;
        localStorage.setItem('law-firm-rating-data', JSON.stringify(syncData));
        window.dispatchEvent(new CustomEvent('rating-data-updated', { detail: syncData }));
      } catch (error) {
        console.error('Error handling sync message:', error);
      }
    };

    channel.addEventListener('message', handleMessage);

    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, []);
}
