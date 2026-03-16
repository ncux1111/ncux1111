import { useEffect } from 'react';

/**
 * Hook для real-time обновлений данных
 * Сейчас работает с polling (каждые 5 секунд проверяет контекст)
 * Когда Supabase подключен - будет использовать WebSocket subscriptions
 */
export function useRealtimeData(callback?: () => void) {
  useEffect(() => {
    // Polling interval - будет заменен на Supabase realtime когда подключится
    const interval = setInterval(() => {
      if (callback) {
        callback();
      }
      // Данные автоматически обновятся через React Context
      // Анимации не прервутся, т.к. компонент не ремонтируется
    }, 5000);

    return () => clearInterval(interval);
  }, [callback]);

  // Когда Supabase подключится, здесь будет:
  // const channel = supabase
  //   .channel('employees-changes')
  //   .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, handleChange)
  //   .subscribe()
  // return () => { supabase.removeChannel(channel) }
}
