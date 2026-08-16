export type UserRole = 'SUPER_ADMIN' | 'PRINCIPAL' | 'TEACHER' | 'PARENT';

export type UserStatus = 'active' | 'inactive' | 'suspended';

export type MadrasaStatus = 'active' | 'trial' | 'suspended';

export type DomainStatus = 'generated' | 'pending' | 'connected' | 'verified' | 'suspended';

export type MadrasaModule = 
  | 'students'
  | 'teachers'
  | 'parents'
  | 'attendance'
  | 'fees'
  | 'exams'
  | 'results'
  | 'notices'
  | 'timetable'
  | 'classes'
  | 'reports';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  tenantId: string | null;
  status: UserStatus;
  phone?: string;
  studentIds?: string[]; // Linked children for Parents
  assignedClasses?: string[]; // Classes for Teachers
  subjects?: string[]; // Subjects for Teachers
  createdAt: string;
  updatedAt?: string;
  passwordResetByAdmin?: boolean;
}

export interface TenantBranding {
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  welcomeMessage?: string;
}

export interface MadrasaTenant {
  id: string; // MAD-2026-000001
  name: string;
  shortName: string;
  slug: string; // e.g. noorul-hayath
  email: string;
  phone: string;
  address: string;
  status: MadrasaStatus;
  principalUid: string;
  principalEmail: string;
  principalName: string;
  branding: TenantBranding;
  enabledModules: MadrasaModule[];
  customDomain?: string;
  domainStatus: DomainStatus;
  trialStartDate?: string;
  trialEndsAt?: string;
  suspendedAt?: string;
  suspensionReason?: string;
  createdAt: string;
}

export interface Student {
  id: string;
  studentCode: string; // e.g. STU-001
  tenantId: string;
  name: string;
  photoUrl?: string;
  dob: string;
  gender: 'male' | 'female';
  classId: string;
  section: string;
  parentId?: string;
  parentName?: string;
  parentPhone?: string;
  admissionDate: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Teacher {
  id: string;
  tenantId: string;
  uid: string;
  name: string;
  email: string;
  mobile: string;
  assignedClasses: string[];
  subjects: string[];
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Parent {
  id: string;
  tenantId: string;
  uid: string;
  name: string;
  email: string;
  mobile: string;
  relationship: string;
  studentIds: string[];
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  tenantId: string;
  classId: string;
  date: string; // YYYY-MM-DD
  markedBy: string;
  records: Record<string, 'present' | 'absent' | 'late'>; // studentId -> status
  createdAt: string;
  updatedAt: string;
}

export interface FeeRecord {
  id: string;
  tenantId: string;
  studentId: string;
  studentName: string;
  classId: string;
  month: string;
  feeAmount: number;
  paidAmount: number;
  balance: number;
  dueDate: string;
  paymentDate?: string;
  status: 'paid' | 'partial' | 'pending' | 'overdue';
  createdAt: string;
}

export interface ExamRecord {
  id: string;
  tenantId: string;
  title: string;
  classId: string;
  subject: string;
  maxMarks: number;
  examDate: string;
  createdAt: string;
}

export interface ExamResult {
  id: string;
  tenantId: string;
  examId: string;
  examTitle: string;
  studentId: string;
  studentName: string;
  classId: string;
  subject: string;
  maxMarks: number;
  obtainedMarks: number;
  percentage: number;
  grade: string;
  remarks?: string;
  createdAt: string;
}

export interface Notice {
  id: string;
  tenantId: string;
  title: string;
  content: string;
  targetAudience: 'all' | 'teachers' | 'parents';
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export interface TimetableSlot {
  id: string;
  tenantId: string;
  classId: string;
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  startTime: string;
  endTime: string;
  subject: string;
  teacherName: string;
}

export interface MadrasaClass {
  id: string;
  tenantId: string;
  name: string;
  section: string;
  medium?: string;
  classTeacherName?: string;
  description?: string;
  createdAt: string;
}

export interface MadrasaHoliday {
  id: string;
  tenantId: string;
  title: string;
  date: string; // YYYY-MM-DD
  isRecurringFriday?: boolean;
  description?: string;
  createdAt: string;
}

export interface MadrasaSubject {
  id: string;
  tenantId: string;
  name: string;
  code?: string;
  classId?: string;
  createdAt: string;
}
