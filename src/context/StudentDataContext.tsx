import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  getParentMe,
  buildStudentProfile,
  getAttendance,
  getTodaySchedule,
  getUpcomingEvents,
  getFeeStatus,
} from '../services/dashboardService';
import {
  currentMonth,
  type StudentProfile,
  type AttendanceData,
  type ScheduleItem,
  type UpcomingEvent,
  type FeeRecord,
} from '../lib/studentDashboard';

interface StudentData {
  // Core data
  profile: StudentProfile | null;
  attendance: AttendanceData | null;
  schedule: ScheduleItem[];
  upcomingEvents: UpcomingEvent[];
  feeRecords: FeeRecord[];

  // Top-level state
  loading: boolean;
  error: string;
  refreshing: boolean;
  refresh: () => Promise<void>;
  retry: () => void;

  // Per-tab month pickers
  attendanceMonth: string;
  setAttendanceMonth: (m: string) => void;
  changeAttendanceMonth: (m: string) => void;
  attendanceLoading: boolean;

  feeMonth: string;
  setFeeMonth: (m: string) => void;
  changeFeeMonth: (m: string) => void;
  feeLoading: boolean;
}

const StudentDataContext = createContext<StudentData | null>(null);

export function StudentDataProvider({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading } = useAuth();

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const [attendanceMonth, setAttendanceMonth] = useState(currentMonth);
  const [feeMonth, setFeeMonth] = useState(currentMonth);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [feeLoading, setFeeLoading] = useState(false);

  // ── Load everything the four tabs need, in parallel ────────────────────────
  const fetchAll = useCallback(async () => {
    const [parent, a, s, u, f] = await Promise.all([
      getParentMe(),
      getAttendance(attendanceMonth),
      getTodaySchedule(),
      getUpcomingEvents(5),
      getFeeStatus(feeMonth),
    ]);
    const fees = (f as FeeRecord[]) ?? [];
    const p = await buildStudentProfile(parent, a.items, fees);
    setProfile(p as StudentProfile);
    setAttendance(a);
    setSchedule(s as ScheduleItem[]);
    setUpcomingEvents(u as UpcomingEvent[]);
    setFeeRecords(fees);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAll = useCallback(async () => {
    setError('');
    try {
      await fetchAll();
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message ?? 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [fetchAll]);

  useEffect(() => {
    if (!authLoading && session) {
      loadAll();
    }
  }, [authLoading, session, loadAll]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchAll();
      setError('');
    } catch {
      // ignore — keep stale data
    } finally {
      setRefreshing(false);
    }
  }, [fetchAll]);

  const retry = useCallback(() => {
    setLoading(true);
    loadAll();
  }, [loadAll]);

  const changeAttendanceMonth = useCallback(async (month: string) => {
    setAttendanceLoading(true);
    try {
      const a = await getAttendance(month);
      setAttendance(a);
    } catch {
      // keep stale
    } finally {
      setAttendanceLoading(false);
    }
  }, []);

  const changeFeeMonth = useCallback(async (month: string) => {
    setFeeLoading(true);
    try {
      const f = await getFeeStatus(month);
      setFeeRecords((f as FeeRecord[]) ?? []);
    } catch {
      // keep stale
    } finally {
      setFeeLoading(false);
    }
  }, []);

  const value: StudentData = {
    profile,
    attendance,
    schedule,
    upcomingEvents,
    feeRecords,
    loading,
    error,
    refreshing,
    refresh,
    retry,
    attendanceMonth,
    setAttendanceMonth,
    changeAttendanceMonth,
    attendanceLoading,
    feeMonth,
    setFeeMonth,
    changeFeeMonth,
    feeLoading,
  };

  return <StudentDataContext.Provider value={value}>{children}</StudentDataContext.Provider>;
}

export function useStudentData(): StudentData {
  const ctx = useContext(StudentDataContext);
  if (!ctx) {
    throw new Error('useStudentData must be used within a StudentDataProvider');
  }
  return ctx;
}
