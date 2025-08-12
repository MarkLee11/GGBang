// === src/hooks/useHostActions.ts ===
import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useNotifications } from './useNotifications';

type Result = {
  loading: boolean;
  error: string | null;
  cancelParticipation: (eventId: number) => Promise<boolean>;
  removeAttendee?: (eventId: number, targetUserId: string) => Promise<boolean>;
  approveRequest?: (
    requestId: number,
    eventId: number,
    requesterId: string,
    refreshRequests?: () => void,
    refreshAttendees?: () => void
  ) => Promise<boolean>;
};

export function useEventActions(): Result {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { notifySuccess, notifyError } = useNotifications();

  // 取消自己参加的活动
  const cancelParticipation = useCallback(async (eventId: number): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) throw new Error('Not authenticated');

      // 1) 删除参会记录
      const { error: delAttendErr } = await supabase
        .from('event_attendees')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', userId);
      if (delAttendErr) throw delAttendErr;

      // 2) 删除 join_requests 记录（状态回到 none）
      const { error: delReqErr } = await supabase
        .from('join_requests')
        .delete()
        .eq('event_id', eventId)
        .eq('requester_id', userId);
      if (delReqErr) throw delReqErr;

      notifySuccess('You have left this event.');
      return true;
    } catch (e: any) {
      const msg = e?.message || 'Failed to cancel participation';
      setError(msg);
      notifyError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [notifySuccess, notifyError]);

  // 主办方移除某个参与者
  const removeAttendee = useCallback(async (eventId: number, targetUserId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user?.id) throw new Error('Not authenticated');

      // 删除 event_attendees
      const { error: delErr } = await supabase
        .from('event_attendees')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', targetUserId);
      if (delErr) throw delErr;

      // 同时清掉 join_requests
      await supabase
        .from('join_requests')
        .delete()
        .eq('event_id', eventId)
        .eq('requester_id', targetUserId);

      notifySuccess('Attendee removed successfully.');
      return true;
    } catch (e: any) {
      const msg = e?.message || 'Failed to remove attendee';
      setError(msg);
      notifyError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [notifyError]);

  // 主办方批准请求
  const approveRequest = useCallback(
    async (
      requestId: number,
      eventId: number,
      requesterId: string,
      refreshRequests?: () => void,
      refreshAttendees?: () => void
    ): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        // 立即刷新 UI（先本地刷新，再后台同步）
        refreshRequests?.();
        refreshAttendees?.();

        // 1) 更新 join_requests 状态为 approved
        const { error: updateError } = await supabase
          .from('join_requests')
          .update({ status: 'approved' })
          .eq('id', requestId);
        if (updateError) throw updateError;

        // 2) 插入到 event_attendees
        const { error: insertError } = await supabase
          .from('event_attendees')
          .insert([{ event_id: eventId, user_id: requesterId }]);
        if (insertError) throw insertError;

        // 3) 再次刷新 UI
        refreshRequests?.();
        refreshAttendees?.();

        notifySuccess('Request approved and attendee added.');
        return true;
      } catch (e: any) {
        const msg = e?.message || 'Failed to approve request';
        setError(msg);
        notifyError(msg);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [notifySuccess, notifyError]
  );

  return {
    loading,
    error,
    cancelParticipation,
    removeAttendee,
    approveRequest
  };
}



