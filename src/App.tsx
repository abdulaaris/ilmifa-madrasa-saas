import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { TenantProvider } from './context/TenantContext';
import { AuthGuard } from './guards/AuthGuard';
import { RoleGuard } from './guards/RoleGuard';
import { TenantGuard } from './guards/TenantGuard';
import { ModuleGuard } from './guards/ModuleGuard';

import { SetupPage } from './pages/SetupPage';
import { CoreLoginPage } from './pages/core/CoreLoginPage';
import { CoreDashboard } from './pages/core/CoreDashboard';
import { CoreMadrasasPage } from './pages/core/CoreMadrasasPage';
import { CoreDomainsPage } from './pages/core/CoreDomainsPage';
import { CoreUsersPage } from './pages/core/CoreUsersPage';
import { CoreSettingsPage } from './pages/core/CoreSettingsPage';
import { CoreHistoryPage } from './pages/core/CoreHistoryPage';

import { PortalLoginPage } from './pages/portal/PortalLoginPage';
import { PrincipalDashboard } from './pages/portal/PrincipalDashboard';
import { TeacherDashboard } from './pages/portal/TeacherDashboard';
import { ParentDashboard } from './pages/portal/ParentDashboard';
import { ClassesPage } from './pages/portal/ClassesPage';
import { SubjectsPage } from './pages/portal/SubjectsPage';
import { StudentsPage } from './pages/portal/StudentsPage';
import { TeachersPage } from './pages/portal/TeachersPage';
import { ParentsPage } from './pages/portal/ParentsPage';
import { HolidaysPage } from './pages/portal/HolidaysPage';
import { AttendancePage } from './pages/portal/AttendancePage';
import { FeesPage } from './pages/portal/FeesPage';
import { ExamsPage } from './pages/portal/ExamsPage';
import { NoticesPage } from './pages/portal/NoticesPage';
import { TimetablePage } from './pages/portal/TimetablePage';
import { PWAInstallBanner } from './components/common/PWAInstallBanner';
import { DynamicPWATheme } from './components/common/DynamicPWATheme';
import { MobileOrientationGuard } from './components/common/MobileOrientationGuard';
import { RootRedirect } from './components/common/RootRedirect';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <TenantProvider>
        <BrowserRouter>
          <DynamicPWATheme />
          <MobileOrientationGuard />
          <PWAInstallBanner />
          <Routes>
            {/* Setup & Core Super Admin Routes */}
            <Route path="/setup" element={<SetupPage />} />
            <Route path="/core/login" element={<CoreLoginPage />} />
            
            <Route path="/core/dashboard" element={<AuthGuard><RoleGuard allowedRoles={['SUPER_ADMIN']}><CoreDashboard /></RoleGuard></AuthGuard>} />
            <Route path="/core/madrasas" element={<AuthGuard><RoleGuard allowedRoles={['SUPER_ADMIN']}><CoreMadrasasPage /></RoleGuard></AuthGuard>} />
            <Route path="/core/domains" element={<AuthGuard><RoleGuard allowedRoles={['SUPER_ADMIN']}><CoreDomainsPage /></RoleGuard></AuthGuard>} />
            <Route path="/core/users" element={<AuthGuard><RoleGuard allowedRoles={['SUPER_ADMIN']}><CoreUsersPage /></RoleGuard></AuthGuard>} />
            <Route path="/core/history" element={<AuthGuard><RoleGuard allowedRoles={['SUPER_ADMIN']}><CoreHistoryPage /></RoleGuard></AuthGuard>} />
            <Route path="/core/settings" element={<AuthGuard><RoleGuard allowedRoles={['SUPER_ADMIN']}><CoreSettingsPage /></RoleGuard></AuthGuard>} />

            {/* Customer Tenant Portal Routes */}
            <Route path="/m/:tenantSlug" element={<PortalLoginPage />} />
            <Route path="/m/:tenantSlug/login" element={<PortalLoginPage />} />

            {/* Principal Routes */}
            <Route path="/m/:tenantSlug/principal" element={<AuthGuard><TenantGuard><RoleGuard allowedRoles={['PRINCIPAL']}><PrincipalDashboard /></RoleGuard></TenantGuard></AuthGuard>} />
            <Route path="/m/:tenantSlug/principal/classes" element={<AuthGuard><TenantGuard><RoleGuard allowedRoles={['PRINCIPAL']}><ClassesPage /></RoleGuard></TenantGuard></AuthGuard>} />
            <Route path="/m/:tenantSlug/principal/subjects" element={<AuthGuard><TenantGuard><RoleGuard allowedRoles={['PRINCIPAL']}><SubjectsPage /></RoleGuard></TenantGuard></AuthGuard>} />
            <Route path="/m/:tenantSlug/principal/students" element={<AuthGuard><TenantGuard><RoleGuard allowedRoles={['PRINCIPAL']}><ModuleGuard moduleKey="students"><StudentsPage /></ModuleGuard></RoleGuard></TenantGuard></AuthGuard>} />
            <Route path="/m/:tenantSlug/principal/teachers" element={<AuthGuard><TenantGuard><RoleGuard allowedRoles={['PRINCIPAL']}><ModuleGuard moduleKey="teachers"><TeachersPage /></ModuleGuard></RoleGuard></TenantGuard></AuthGuard>} />
            <Route path="/m/:tenantSlug/principal/parents" element={<AuthGuard><TenantGuard><RoleGuard allowedRoles={['PRINCIPAL']}><ModuleGuard moduleKey="parents"><ParentsPage /></ModuleGuard></RoleGuard></TenantGuard></AuthGuard>} />
            <Route path="/m/:tenantSlug/principal/attendance" element={<AuthGuard><TenantGuard><RoleGuard allowedRoles={['PRINCIPAL']}><ModuleGuard moduleKey="attendance"><AttendancePage /></ModuleGuard></RoleGuard></TenantGuard></AuthGuard>} />
            <Route path="/m/:tenantSlug/principal/holidays" element={<AuthGuard><TenantGuard><RoleGuard allowedRoles={['PRINCIPAL']}><HolidaysPage /></RoleGuard></TenantGuard></AuthGuard>} />
            <Route path="/m/:tenantSlug/principal/fees" element={<AuthGuard><TenantGuard><RoleGuard allowedRoles={['PRINCIPAL']}><ModuleGuard moduleKey="fees"><FeesPage /></ModuleGuard></RoleGuard></TenantGuard></AuthGuard>} />
            <Route path="/m/:tenantSlug/principal/exams" element={<AuthGuard><TenantGuard><RoleGuard allowedRoles={['PRINCIPAL']}><ModuleGuard moduleKey="exams"><ExamsPage /></ModuleGuard></RoleGuard></TenantGuard></AuthGuard>} />
            <Route path="/m/:tenantSlug/principal/results" element={<AuthGuard><TenantGuard><RoleGuard allowedRoles={['PRINCIPAL']}><ModuleGuard moduleKey="results"><ExamsPage /></ModuleGuard></RoleGuard></TenantGuard></AuthGuard>} />
            <Route path="/m/:tenantSlug/principal/notices" element={<AuthGuard><TenantGuard><RoleGuard allowedRoles={['PRINCIPAL']}><ModuleGuard moduleKey="notices"><NoticesPage /></ModuleGuard></RoleGuard></TenantGuard></AuthGuard>} />
            <Route path="/m/:tenantSlug/principal/timetable" element={<AuthGuard><TenantGuard><RoleGuard allowedRoles={['PRINCIPAL']}><ModuleGuard moduleKey="timetable"><TimetablePage /></ModuleGuard></RoleGuard></TenantGuard></AuthGuard>} />

            {/* Teacher Routes */}
            <Route path="/m/:tenantSlug/teacher" element={<AuthGuard><TenantGuard><RoleGuard allowedRoles={['TEACHER']}><TeacherDashboard /></RoleGuard></TenantGuard></AuthGuard>} />
            <Route path="/m/:tenantSlug/teacher/students" element={<AuthGuard><TenantGuard><RoleGuard allowedRoles={['TEACHER']}><StudentsPage /></RoleGuard></TenantGuard></AuthGuard>} />
            <Route path="/m/:tenantSlug/teacher/attendance" element={<AuthGuard><TenantGuard><RoleGuard allowedRoles={['TEACHER']}><ModuleGuard moduleKey="attendance"><AttendancePage /></ModuleGuard></RoleGuard></TenantGuard></AuthGuard>} />
            <Route path="/m/:tenantSlug/teacher/results" element={<AuthGuard><TenantGuard><RoleGuard allowedRoles={['TEACHER']}><ModuleGuard moduleKey="results"><ExamsPage /></ModuleGuard></RoleGuard></TenantGuard></AuthGuard>} />
            <Route path="/m/:tenantSlug/teacher/notices" element={<AuthGuard><TenantGuard><RoleGuard allowedRoles={['TEACHER']}><ModuleGuard moduleKey="notices"><NoticesPage /></ModuleGuard></RoleGuard></TenantGuard></AuthGuard>} />
            <Route path="/m/:tenantSlug/teacher/timetable" element={<AuthGuard><TenantGuard><RoleGuard allowedRoles={['TEACHER']}><ModuleGuard moduleKey="timetable"><TimetablePage /></ModuleGuard></RoleGuard></TenantGuard></AuthGuard>} />

            {/* Parent Routes */}
            <Route path="/m/:tenantSlug/parent" element={<AuthGuard><TenantGuard><RoleGuard allowedRoles={['PARENT']}><ParentDashboard /></RoleGuard></TenantGuard></AuthGuard>} />
            <Route path="/m/:tenantSlug/parent/children" element={<AuthGuard><TenantGuard><RoleGuard allowedRoles={['PARENT']}><ParentDashboard /></RoleGuard></TenantGuard></AuthGuard>} />
            <Route path="/m/:tenantSlug/parent/attendance" element={<AuthGuard><TenantGuard><RoleGuard allowedRoles={['PARENT']}><ParentDashboard /></RoleGuard></TenantGuard></AuthGuard>} />
            <Route path="/m/:tenantSlug/parent/fees" element={<AuthGuard><TenantGuard><RoleGuard allowedRoles={['PARENT']}><ModuleGuard moduleKey="fees"><FeesPage /></ModuleGuard></RoleGuard></TenantGuard></AuthGuard>} />
            <Route path="/m/:tenantSlug/parent/results" element={<AuthGuard><TenantGuard><RoleGuard allowedRoles={['PARENT']}><ModuleGuard moduleKey="results"><ParentDashboard /></ModuleGuard></RoleGuard></TenantGuard></AuthGuard>} />
            <Route path="/m/:tenantSlug/parent/notices" element={<AuthGuard><TenantGuard><RoleGuard allowedRoles={['PARENT']}><ModuleGuard moduleKey="notices"><NoticesPage /></ModuleGuard></RoleGuard></TenantGuard></AuthGuard>} />
            <Route path="/m/:tenantSlug/parent/timetable" element={<AuthGuard><TenantGuard><RoleGuard allowedRoles={['PARENT']}><ModuleGuard moduleKey="timetable"><TimetablePage /></ModuleGuard></RoleGuard></TenantGuard></AuthGuard>} />

            {/* Root & Catch-all isolated tenant redirect */}
            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </BrowserRouter>
      </TenantProvider>
    </AuthProvider>
  );
};

export default App;
