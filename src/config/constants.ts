import { MadrasaModule } from '../types';

export const PLATFORM_NAME = 'iLmiFa';
export const PLATFORM_DOMAIN = 'ilmifa.com';
export const DEV_PORTAL_PREFIX = '/m/';

export const DEFAULT_BRANDING = {
  primaryColor: '#7B2525',
  secondaryColor: '#BA6A4C',
  cream: '#EEE0CC',
  background: '#F7F5F2',
  text: '#252525',
  welcomeMessage: 'Welcome to Madrasa Management Portal',
};

export const ALL_MODULES: { id: MadrasaModule; label: string; description: string }[] = [
  { id: 'students', label: 'Students', description: 'Manage student admissions, profiles, and records' },
  { id: 'teachers', label: 'Teachers', description: 'Manage teacher profiles, classes, and subjects' },
  { id: 'parents', label: 'Parents', description: 'Manage parent accounts and student linkages' },
  { id: 'attendance', label: 'Attendance', description: 'Daily attendance tracking for classes' },
  { id: 'fees', label: 'Fees', description: 'Fee structures, invoices, and payment tracking' },
  { id: 'exams', label: 'Exams', description: 'Schedule examinations and tests' },
  { id: 'results', label: 'Results', description: 'Record student marks, calculate grades and reports' },
  { id: 'notices', label: 'Notices', description: 'Broadcast notices to teachers, parents, or all' },
  { id: 'timetable', label: 'Timetable', description: 'Class schedules and teacher timetables' },
  { id: 'classes', label: 'Classes', description: 'Class and section organization' },
  { id: 'reports', label: 'Reports', description: 'Analytics and printable academic/financial reports' },
];

export const CLASS_OPTIONS: string[] = [];
