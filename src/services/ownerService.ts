/**
 * ownerService.ts — API service layer for all owner-facing operations.
 *
 * Wraps api.ts (the shared axios instance with Supabase JWT interceptor).
 * All functions correspond to BatchBook backend endpoints under /batch,
 * /enrollment, /student, /fee, /attendance, and /scores.
 */

import api from './api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Batch {
  id: number;
  name: string;
  subject: string;
  grade?: string | null;
  start_time: string;
  end_time: string;
  days_of_week: string[];
  max_capacity: number;
  start_date?: string;
  end_date: string;
  status?: 'ACTIVE' | 'CLOSING' | 'ARCHIVED';
}

export interface Enrollment {
  id: number;
  student_id: number;
  batch_id: number;
  due_day?: number;
  first_month_amount?: number;
  is_active?: boolean;
}

export interface StudentData {
  name: string;
  phone_number: string;
  email?: string;
}

export interface InviteStudentPayload {
  student_name: string;
  parent_name: string;
  parent_phone: string;
  batch_id: number;
  due_day?: number;
  first_month_amount?: number;
}

export interface FeeRecord {
  id: number;
  enrollment_id: number;
  month: string;
  amount_due: number;
  amount_paid: number;
  status: 'PENDING' | 'PAID' | 'PARTIAL' | 'NOT_PAID' | 'PARTIALLY_PAID';
  paid_at?: string;
  reference?: string | null;
  payment_link?: string | null;
}

export interface SessionData {
  batch_id: number;
  date: string;
  start_time: string;
  end_time: string;
  topic?: string;
}

export interface TestScoreData {
  enrollment_id: number;
  test_name: string;
  subject: string;
  date: string;
  max_marks: number;
  obtained_marks: number;
}

// ─── Batch functions ──────────────────────────────────────────────────────────

export async function getBatches(): Promise<Batch[]> {
  const { data } = await api.get('/batch/');
  return data;
}

export async function createBatch(batchData: Partial<Batch>): Promise<Batch> {
  const { data } = await api.post('/batch/', batchData);
  return data;
}

export async function getBatch(batchId: number): Promise<Batch> {
  const { data } = await api.get(`/batch/${batchId}`);
  return data;
}

export async function updateBatch(batchId: number, updates: Partial<Batch>): Promise<Batch> {
  const { data } = await api.patch(`/batch/${batchId}`, updates);
  return data;
}

export async function deleteBatch(batchId: number): Promise<void> {
  await api.delete(`/batch/${batchId}`);
}

// ─── Enrollment functions ─────────────────────────────────────────────────────

export async function getEnrollmentsByBatch(batchId: number): Promise<Enrollment[]> {
  const { data } = await api.get(`/enrollment/batch/${batchId}`);
  return data;
}

export async function enrollStudent(enrollmentData: Partial<Enrollment>): Promise<Enrollment> {
  const { data } = await api.post('/enrollment/', enrollmentData);
  return data;
}

export async function updateEnrollment(enrollmentId: number, updates: Partial<Enrollment>): Promise<Enrollment> {
  const { data } = await api.patch(`/enrollment/${enrollmentId}`, updates);
  return data;
}

export async function removeEnrollment(enrollmentId: number): Promise<void> {
  await api.delete(`/enrollment/${enrollmentId}`);
}

// ─── Student functions ────────────────────────────────────────────────────────

export async function createStudent(studentData: StudentData): Promise<unknown> {
  const { data } = await api.post('/student/', studentData);
  return data;
}

export async function addStudentAndEnroll({
  name,
  phone_number,
  email,
  batch_id,
  due_day,
  first_month_amount,
}: StudentData & { batch_id: number; due_day?: number; first_month_amount?: number }): Promise<{
  student: unknown;
  enrollment: Enrollment;
}> {
  const student = await createStudent({ name, phone_number, email });
  const enrollment = await enrollStudent({
    student_id: (student as { id: number }).id,
    batch_id,
    due_day,
    first_month_amount: first_month_amount != null ? Number(first_month_amount) : undefined,
  });
  return { student, enrollment };
}

export async function inviteStudent(payload: InviteStudentPayload): Promise<Enrollment> {
  const { data } = await api.post('/enrollment/invite', payload);
  return data;
}

// ─── Fee API (/fee/*) ─────────────────────────────────────────────────────────

export async function getFeeDashboard(month: string): Promise<unknown> {
  const { data } = await api.get('/fee/dashboard', { params: { month } });
  return data;
}

export async function getBatchFees(batchId: number, month: string): Promise<FeeRecord[]> {
  const { data } = await api.get(`/fee/batch/${batchId}`, { params: { month } });
  return data;
}

export async function getFeeStructure(batchId: number): Promise<unknown> {
  const { data } = await api.get(`/fee/structure/${batchId}`);
  return data;
}

export async function setupFeeStructure(batchId: number, monthlyAmount: number): Promise<unknown> {
  const { data } = await api.post('/fee/structure', {
    batch_id: batchId,
    monthly_amount: monthlyAmount,
  });
  return data;
}

export async function generateMonthlyRecords(batchId: number, month: string): Promise<unknown> {
  const { data } = await api.post(`/fee/generate/${batchId}`, null, { params: { month } });
  return data;
}

export async function markPayment(
  recordId: number,
  amountPaid: number,
  reference?: string | null
): Promise<FeeRecord> {
  const { data } = await api.patch(`/fee/record/${recordId}/pay`, {
    amount_paid: amountPaid,
    reference: reference ?? null,
  });
  return data;
}

export async function sendFeeReminder(recordId: number): Promise<unknown> {
  const { data } = await api.post(`/fee/remind/${recordId}`);
  return data;
}

// ─── Attendance API (/attendance/*) ──────────────────────────────────────────

export async function createSession(sessionData: SessionData): Promise<unknown> {
  const { data } = await api.post('/attendance/session', sessionData);
  return data;
}

export async function markAttendance(sessionId: number, presentEnrollmentIds: number[]): Promise<unknown> {
  const { data } = await api.post(`/attendance/session/${sessionId}/mark`, {
    present_enrollment_ids: presentEnrollmentIds,
  });
  return data;
}

export async function getSessionAttendance(sessionId: number): Promise<unknown> {
  const { data } = await api.get(`/attendance/session/${sessionId}`);
  return data;
}

export async function getBatchSessions(batchId: number): Promise<unknown[]> {
  const { data } = await api.get(`/attendance/batch/${batchId}`);
  return data;
}

export async function getStudentAttendanceSummary(enrollmentId: number, month: string): Promise<unknown> {
  const { data } = await api.get(`/attendance/student/${enrollmentId}`, { params: { month } });
  return data;
}

// ─── Test Score API (/scores/*) ───────────────────────────────────────────────

export async function getStudentScores(enrollmentId: number): Promise<unknown[]> {
  const { data } = await api.get(`/scores/student/${enrollmentId}`);
  return data;
}

export async function createTestScore(scoreData: TestScoreData): Promise<unknown> {
  const { data } = await api.post('/scores/', scoreData);
  return data;
}

// ─── Owner stats (/owner/stats) ───────────────────────────────────────────────

export async function getOwnerStats(): Promise<{
  enrolled_students: number;
  fees_collected_this_month: string;
  avg_attendance_this_month: number;
}> {
  const { data } = await api.get('/owner/stats');
  return data;
}
