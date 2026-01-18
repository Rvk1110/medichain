import React from 'react';
import { StoreProvider, useStore } from './context/Store';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { PatientDashboard } from './pages/PatientDashboard';
import { DoctorDashboard } from './pages/DoctorDashboard';
import { LabDashboard } from './pages/LabDashboard';
import { LedgerExplorer } from './pages/LedgerExplorer';
import { UserRole } from './types';
import { FileSearch } from 'lucide-react';

const AppContent: React.FC = () => {
  const { currentUser } = useStore();
  const [showLedger, setShowLedger] = React.useState(false);

  if (!currentUser) {
    return (
      <Layout>
        <Login />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex justify-end mb-4">
        <button 
          onClick={() => setShowLedger(!showLedger)}
          className="text-xs font-medium text-slate-500 hover:text-primary flex items-center gap-1"
        >
          <FileSearch size={14} /> {showLedger ? 'Back to Dashboard' : 'View Blockchain Ledger'}
        </button>
      </div>

      {showLedger ? (
        <LedgerExplorer />
      ) : (
        <>
          {currentUser.role === UserRole.PATIENT && <PatientDashboard />}
          {currentUser.role === UserRole.DOCTOR && <DoctorDashboard />}
          {currentUser.role === UserRole.LAB_TECHNICIAN && <LabDashboard />}
        </>
      )}
    </Layout>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}