import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Budgets from './pages/Budgets';
import BudgetDetail from './pages/BudgetDetail';
import Payments from './pages/Payments';
import NewReimbursement from './pages/NewReimbursement';
import NewPlannedExpense from './pages/NewPlannedExpense';
import MyReimbursements from './pages/MyReimbursements';
import NewCharge from './pages/NewCharge';
import UserManagement from './pages/UserManagement';
import GroupManagement from './pages/GroupManagement';
import PaymentTransfers from './pages/PaymentTransfers';
import FundMonthlyDetail from './pages/FundMonthlyDetail';
import Profile from './pages/Profile';
import Incomes from './pages/Incomes';
import NewDirectExpense from './pages/NewDirectExpense';
import EditDirectExpense from './pages/EditDirectExpense';
import BugReportFooter from './components/BugReportFooter';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>טוען...</div>;
  }

  return user ? <>{children}</> : <Navigate to="/login" />;
}

function TreasurerRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>טוען...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!user.isCircleTreasurer && !user.isGroupTreasurer) {
    return <Navigate to="/dashboard" />;
  }

  return <>{children}</>;
}

function CircleTreasurerRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>טוען...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!user.isCircleTreasurer) {
    return <Navigate to="/dashboard" />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/budgets" element={<PrivateRoute><Budgets /></PrivateRoute>} />
            <Route path="/budgets/:id" element={<PrivateRoute><BudgetDetail /></PrivateRoute>} />
            <Route path="/incomes" element={<PrivateRoute><Incomes /></PrivateRoute>} />
            <Route path="/payments" element={<TreasurerRoute><Payments /></TreasurerRoute>} />
            <Route path="/payment-transfers" element={<TreasurerRoute><PaymentTransfers /></TreasurerRoute>} />
            <Route path="/reimbursements/new" element={<PrivateRoute><NewReimbursement /></PrivateRoute>} />
            <Route path="/planned-expenses/new" element={<PrivateRoute><NewPlannedExpense /></PrivateRoute>} />
            <Route path="/planned-expenses/:id/edit" element={<PrivateRoute><NewPlannedExpense /></PrivateRoute>} />
            <Route path="/my-reimbursements" element={<PrivateRoute><MyReimbursements /></PrivateRoute>} />
            <Route path="/charges/new" element={<PrivateRoute><NewCharge /></PrivateRoute>} />
            <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="/users" element={<CircleTreasurerRoute><UserManagement /></CircleTreasurerRoute>} />
            <Route path="/groups" element={<CircleTreasurerRoute><GroupManagement /></CircleTreasurerRoute>} />
            <Route path="/funds/:fundId/monthly" element={<PrivateRoute><FundMonthlyDetail /></PrivateRoute>} />
            <Route path="/direct-expenses/new" element={<TreasurerRoute><NewDirectExpense /></TreasurerRoute>} />
            <Route path="/direct-expenses/:id/edit" element={<TreasurerRoute><EditDirectExpense /></TreasurerRoute>} />
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
          <BugReportFooter />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
