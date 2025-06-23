import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminDashboard from './AdminDashboard';
import InboundDashboard from './InboundDashboard';
//import OutboundDashboard from './OutboundDashboard';
import OutboundDashboard2 from '../OutboundDashboard2';
import Add from '../Add';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  switch (user.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'inbound':
      return <InboundDashboard />;
    case 'outbound':
      return <OutboundDashboard2 />;
      //return <OutboundDashboard/>
    case 'staff':
      return <Add/>
    default:
      return null;
  }
};

export default Dashboard;