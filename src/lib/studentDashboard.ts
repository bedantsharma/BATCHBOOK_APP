// Shared types + presentational helpers for the student dashboard tabs.
// Kept outside the (student) route directory so expo-router doesn't treat it as a route.

import C from '../constants/colors';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StudentProfile {
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
}

export interface AttendanceData {
  present: number;
  total: number;
  streak: number;
  month: string;
  items: {
    batch_name: string;
    subject: string;
    present: number;
    total: number;
  }[];
}

export interface ScheduleItem {
  id: unknown;
  subject: string;
  batchName: string;
  time: string;
  topic: string;
  attendanceStatus: string;
}

export interface UpcomingEvent {
  id: unknown;
  type: string;
  label: string;
  day: string;
  time: string;
  sub: string;
}

export interface FeeRecord {
  batch_name?: string;
  amount_due?: number;
  amount_paid?: number;
  status?: string;
  payment_link?: string | null;
}

// ─── Month picker helpers ─────────────────────────────────────────────────────

export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMonthLabel(ym: string): string {
  const [year, month] = ym.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleString('en-IN', { month: 'short', year: 'numeric' });
}

export function prevMonth(ym: string): string {
  const [year, month] = ym.split('-').map(Number);
  const d = new Date(year, month - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function nextMonth(ym: string): string {
  const [year, month] = ym.split('-').map(Number);
  const d = new Date(year, month, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ─── Fee status helpers ───────────────────────────────────────────────────────

export function feeStatusColor(status: string | undefined): string {
  if (!status) return C.text2;
  if (status === 'FULLY_PAID' || status === 'PAID') return C.success;
  if (status === 'PARTIALLY_PAID' || status === 'PARTIAL') return C.warning;
  return C.error;
}

export function feeStatusLabel(status: string | undefined): string {
  if (!status) return 'Unknown';
  if (status === 'FULLY_PAID' || status === 'PAID') return 'Paid';
  if (status === 'PARTIALLY_PAID' || status === 'PARTIAL') return 'Partial';
  return 'Unpaid';
}
