import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Stock from './pages/Stock';
import Inventory from './pages/Inventory';
import Jobs from './pages/Jobs';
import Orders from './pages/Orders';
import WarehouseOperations from './pages/WarehouseOperations';
import ReportsAnalytics from './pages/ReportsAnalytics';
import Settings from './pages/Settings';
import { useAuth } from './contexts/AuthContext';
import OutboundStock from './pages/OutboundStock';
import WarehouseLocations from './pages/WarehouseLocations';
import Add from './pages/Add';
import SupplyServe from './pages/SupplyServe';

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
      {/* <Route path="/jobs" element={<Jobs />} /> */}
      
      <Route path="/" element={<AppLayout />}>
        <Route index element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'staff']}>
            <Dashboard />
          </ProtectedRoute>
        } />

        <Route path="stock" element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'staff']}>
            <Stock />
          </ProtectedRoute>
        } />
        <Route path="jobs" element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'staff']}>
            <Jobs />
          </ProtectedRoute>
        } />
        <Route path="inventory" element={
          <ProtectedRoute allowedRoles={['admin', 'manager']}>
            <Inventory />
          </ProtectedRoute>
        } />
        <Route path="orders" element={
          <ProtectedRoute allowedRoles={['']}>
            <Orders />
          </ProtectedRoute>
        } />
        <Route path="outbound-stock" element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'staff']}>
            <OutboundStock />
          </ProtectedRoute>
        } />
        
        <Route path="warehouse-locations" element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'staff']}>
            <WarehouseLocations />
          </ProtectedRoute>
        } />
        <Route path="warehouse-operations" element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'staff']}>
            <WarehouseOperations />
          </ProtectedRoute>
        } />
        <Route path="reports-analytics" element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'staff']}>
            <ReportsAnalytics />
          </ProtectedRoute>
        } />
        <Route path="settings" element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'staff']}>
            <Settings />
          </ProtectedRoute>
        } />
        <Route path="add" element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'staff']}>
            <Add />
          </ProtectedRoute>
        } />
        <Route path="supply-serve" element={
          <ProtectedRoute allowedRoles={['supply_serve', 'fahiz', 'aphy']}>
            <SupplyServe />
          </ProtectedRoute>
        } />
      </Route>
    </Routes>
  );
}

export default App;