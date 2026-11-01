import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AuthModal } from './features/auth/AuthModal';
import { AppLayout } from './components/layout/AppLayout';
import { FoundationDashboard } from './features/foundation/FoundationDashboard';
import { HouseholdView } from './features/household/HouseholdView';
import { FamilyVaultView } from './features/vault/FamilyVaultView';
import { DocumentDoctorView } from './features/doctor/DocumentDoctorView';
import { SahayDailyView } from './features/daily/SahayDailyView';
import { HealthShieldView } from './features/health/HealthShieldView';
import { PublicEmergencyView } from './features/health/PublicEmergencyView';
import { LakshyaDashboardView } from './features/lakshya/LakshyaDashboardView';
import { SahayAIAssistantView } from './features/assistant/SahayAIAssistantView';
import { SahayShieldView } from './features/shield/SahayShieldView';
import { ModulePlaceholder } from './features/common/ModulePlaceholder';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AuthModal />
      <Routes>
        <Route path="/emergency-mode/:token" element={<PublicEmergencyView />} />
        <Route path="/" element={<AppLayout />}>
          <Route index element={<FoundationDashboard />} />
          <Route path="household" element={<HouseholdView />} />
          <Route path="daily" element={<SahayDailyView />} />
          <Route path="vault" element={<FamilyVaultView />} />
          <Route path="document-doctor" element={<DocumentDoctorView />} />
          <Route path="health" element={<HealthShieldView />} />
          <Route path="lakshya" element={<LakshyaDashboardView />} />
          <Route path="assistant" element={<SahayAIAssistantView />} />
          <Route path="shield" element={<SahayShieldView />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
};

export default App;
