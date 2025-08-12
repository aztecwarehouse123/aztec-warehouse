import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Stock from './pages/Stock';
import Orders from './pages/Orders';
import WarehouseOperations from './pages/WarehouseOperations';
import ReportsAnalytics from './pages/ReportsAnalytics';
import Settings from './pages/Settings';
import { useAuth } from './contexts/AuthContext';
import OutboundStock from './pages/OutboundStock';
import WarehouseLocations from './pages/WarehouseLocations';
import Add from './pages/Add';

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles: string[];
}> = ({ children, allowedRoles }) => {
  const {user} = useAuth();

  if (!user){
    return <Navigate to="/login" replace />;
  }
  if(!allowedRoles.includes(user.role)){
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route path="/" element={<AppLayout />}>
        <Route index element={
          <ProtectedRoute allowedRoles={['admin', 'staff']}>
            <Dashboard />
          </ProtectedRoute>
        } />

        <Route path="stock" element={
          <ProtectedRoute allowedRoles={['admin','staff']}>
            <Stock />
          </ProtectedRoute>
        } />
        <Route path="orders" element={
          <ProtectedRoute allowedRoles={['']}>
            <Orders />
          </ProtectedRoute>
        } />
        <Route path="outbound-stock" element={
          <ProtectedRoute allowedRoles={['admin','staff']}>
            <OutboundStock />
          </ProtectedRoute>
        } />
        
        <Route path="warehouse-locations" element={
          <ProtectedRoute allowedRoles={['admin','staff']}>
            <WarehouseLocations />
          </ProtectedRoute>
        } />
        <Route path="warehouse-operations" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <WarehouseOperations />
          </ProtectedRoute>
        } />
        <Route path="reports-analytics" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ReportsAnalytics />
          </ProtectedRoute>
        } />
        <Route path="settings" element={
          <ProtectedRoute allowedRoles={['admin', 'staff']}>
            <Settings />
          </ProtectedRoute>
        } />
        <Route path="add" element={
          <ProtectedRoute allowedRoles={['admin','staff']}>
            <Add />
          </ProtectedRoute>
        } />
      </Route>
    </Routes>
  );
}

export default App;