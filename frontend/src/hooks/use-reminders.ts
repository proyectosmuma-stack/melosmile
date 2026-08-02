import useSWR from 'swr';
import { Database } from '@/lib/supabase/types';

type Reminder = Database['public']['Tables']['reminders']['Row'];

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Failed to fetch data');
  return res.json();
});

export function useReminders(patientId?: string) {
  const queryParam = patientId ? `?patientId=${patientId}` : '';
  const { data, error, isLoading, mutate } = useSWR<Reminder[]>(
    `/api/reminders${queryParam}`,
    fetcher
  );

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/reminders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      const updatedReminder = await res.json();
      
      // Update local SWR cache
      mutate((currentData) => {
        if (!currentData) return currentData;
        return currentData.map((reminder) =>
          reminder.id === id ? { ...reminder, status: updatedReminder.status } : reminder
        );
      }, false);
      
      return updatedReminder;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const cancelReminder = async (id: string) => {
    return updateStatus(id, 'cancelado');
  };

  return {
    reminders: data,
    isLoading,
    isError: error,
    updateStatus,
    cancelReminder,
    mutate,
  };
}
