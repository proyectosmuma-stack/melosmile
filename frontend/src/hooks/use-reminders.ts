import useSWR from 'swr';
import { Database } from '@/lib/supabase/types';

export type ReminderWithPatient = Database['public']['Tables']['reminders']['Row'] & {
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
    phone?: string | null;
  } | null;
  appointment?: {
    id: string;
    appointment_date: string;
  } | null;
};

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Failed to fetch data');
  return res.json();
});

export function useReminders(
  patientId?: string,
  opts?: { archivedOnly?: boolean; enabled?: boolean }
) {
  const params = new URLSearchParams();
  if (patientId) params.set('patientId', patientId);
  if (opts?.archivedOnly) params.set('archived', 'only');
  const qs = params.toString();
  const enabled = opts?.enabled !== false;

  const { data, error, isLoading, mutate } = useSWR<ReminderWithPatient[]>(
    enabled ? `/api/reminders${qs ? `?${qs}` : ''}` : null,
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
