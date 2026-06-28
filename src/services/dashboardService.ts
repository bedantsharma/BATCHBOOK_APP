// ─── BatchBook Dashboard Service ────────────────────────────────────────────
// Calls real backend APIs for all student-facing data.
// Auth is handled by api.ts (Supabase JWT attached automatically).
// student_id is read from AsyncStorage (set after parent OTP verification).

import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

// ─── Local types for API responses ───────────────────────────────────────────

interface FeeStatusItem {
  status: string;
  payment_link?: string | null;
}

interface AttendanceItem {
  batch_name: string;
  subject: string;
  present: number;
  total: number;
}

// ─────────────────────────────────────────────────────────────────────────────

const CURRENT_MONTH = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const TODAY = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export async function getStoredStudentId(): Promise<string | null> {
  return AsyncStorage.getItem('bb_student_id');
}

export async function getStoredStudentName(): Promise<string | null> {
  return AsyncStorage.getItem('bb_student_name');
}

// ─── Student Profile ──────────────────────────────────────────────────────────

export async function getStudentProfile(): Promise<{
  id: number;
  name: string;
  initials: string;
  phone: string;
  institute: string;
  enrolledYear: string;
  batch: string;
  subjects: string[];
  feeDue: boolean;
  paymentLink: string | null;
  avatarUrl: null;
}> {
  const [parentRes, attendanceItems] = await Promise.all([
    api.get('/parent/me'),
    getAttendance(),
  ]);

  const parent = parentRes.data;
  const studentId = parseInt((await getStoredStudentId()) ?? '0', 10);
  const child =
    parent.children?.find((c: { id: number }) => c.id === studentId) ??
    parent.children?.[0];

  const name: string = child?.name ?? parent.name ?? 'Student';
  const initials = name
    .split(' ')
    .map((w: string) => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');

  const feeRecords = (await getFeeStatus()) as FeeStatusItem[];
  const hasUnpaidFee = feeRecords.some(
    (f) => f.status === 'NOT_PAID' || f.status === 'PARTIALLY_PAID'
  );
  const paymentLink =
    feeRecords.find(
      (f) => (f.status === 'NOT_PAID' || f.status === 'PARTIALLY_PAID') && f.payment_link
    )?.payment_link ?? null;

  const items = attendanceItems.items as AttendanceItem[];
  const batchNames = items?.map((a) => a.batch_name) ?? [];
  const subjects = items?.map((a) => a.subject) ?? [];

  return {
    id: studentId,
    name,
    initials,
    phone: parent.phone_number ? `+91 ${parent.phone_number}` : '',
    institute: '',
    enrolledYear: new Date().getFullYear().toString(),
    batch: batchNames[0] ?? '',
    subjects: [...new Set<string>(subjects)],
    feeDue: hasUnpaidFee,
    paymentLink,
    avatarUrl: null,
  };
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export async function getAttendance(month = CURRENT_MONTH()): Promise<{
  present: number;
  total: number;
  streak: number;
  month: string;
  items: AttendanceItem[];
}> {
  const studentId = await getStoredStudentId();
  if (!studentId) return { present: 0, total: 0, streak: 0, month: '', items: [] };

  const { data } = await api.get('/student/me/attendance', {
    params: { student_id: studentId, month },
  });

  const typedData = data as AttendanceItem[];
  const totalPresent = typedData.reduce((sum, item) => sum + item.present, 0);
  const totalSessions = typedData.reduce((sum, item) => sum + item.total, 0);

  const monthLabel = new Date(`${month}-01`).toLocaleString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  return {
    present: totalPresent,
    total: totalSessions,
    streak: 0,
    month: monthLabel,
    items: typedData,
  };
}

// ─── Fee Status ───────────────────────────────────────────────────────────────

export async function getFeeStatus(month = CURRENT_MONTH()): Promise<unknown[]> {
  const studentId = await getStoredStudentId();
  if (!studentId) return [];

  const { data } = await api.get('/student/me/fee', {
    params: { student_id: studentId, month },
  });

  return data;
}

// ─── Upcoming Events ──────────────────────────────────────────────────────────

export async function getUpcomingEvents(limit = 10): Promise<
  {
    id: unknown;
    type: string;
    label: string;
    day: string;
    time: string;
    sub: string;
  }[]
> {
  const studentId = await getStoredStudentId();
  if (!studentId) return [];

  const { data } = await api.get('/student/me/upcoming-events', {
    params: { student_id: studentId, limit },
  });

  const today = TODAY();
  const tomorrow = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  return data.map(
    (event: {
      date: string;
      session_id: unknown;
      start_time?: string;
      batch_name: string;
      topic?: string;
      subject: string;
    }) => {
      const isoDate = event.date;
      let day: string;
      if (isoDate === today) {
        day = 'Today';
      } else if (isoDate === tomorrow) {
        day = 'Tomorrow';
      } else {
        day = new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-IN', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        });
      }

      const startFmt = event.start_time
        ? new Date(`1970-01-01T${event.start_time}`).toLocaleTimeString('en-IN', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          })
        : '';

      return {
        id: event.session_id,
        type: 'class',
        label: event.batch_name,
        day,
        time: startFmt,
        sub: event.topic ?? event.subject,
      };
    }
  );
}

// ─── Unread notification count ────────────────────────────────────────────────

export async function getUnreadNotificationCount(): Promise<number> {
  return 0;
}

// ─── Today's Schedule ─────────────────────────────────────────────────────────

export async function getTodaySchedule(): Promise<
  {
    id: unknown;
    subject: string;
    batchName: string;
    time: string;
    topic: string;
    attendanceStatus: string;
  }[]
> {
  const studentId = await getStoredStudentId();
  if (!studentId) return [];

  const { data } = await api.get('/student/me/schedule', {
    params: { student_id: studentId, date: TODAY() },
  });

  return data.map(
    (s: {
      session_id: unknown;
      subject: string;
      batch_name: string;
      start_time?: string;
      end_time?: string;
      topic?: string;
      attendance_status: string;
    }) => {
      const startFmt = s.start_time
        ? new Date(`1970-01-01T${s.start_time}`).toLocaleTimeString('en-IN', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          })
        : '';
      const endFmt = s.end_time
        ? new Date(`1970-01-01T${s.end_time}`).toLocaleTimeString('en-IN', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          })
        : '';
      return {
        id: s.session_id,
        subject: s.subject,
        batchName: s.batch_name,
        time: startFmt && endFmt ? `${startFmt}–${endFmt}` : startFmt,
        topic: s.topic ?? '',
        attendanceStatus: s.attendance_status,
      };
    }
  );
}
