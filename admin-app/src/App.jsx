import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import ProtectedRoute from './ProtectedRoute';

// Lazy loading for split bundles
const Dashboard = lazy(() => import('./Dashboard'));
const Questions = lazy(() => import('./Questions'));
const Users = lazy(() => import('./Users'));
const Payouts = lazy(() => import('./Payouts'));
const Campaigns = lazy(() => import('./Campaigns'));
const CampaignDetails = lazy(() => import('./CampaignDetails'));
const Settings = lazy(() => import('./Settings'));
const Tickets = lazy(() => import('./Tickets'));
const Login = lazy(() => import('./Login'));
const AccessDenied = lazy(() => import('./AccessDenied'));

function App() {
  return (
    <Router>
      <Suspense fallback={
        <div className="bg-surface-container-lowest min-h-screen flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      }>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/denied" element={<AccessDenied />} />
          
          {/* Protected Admin Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/questions" element={<Questions />} />
              <Route path="/users" element={<Users />} />
              <Route path="/payouts" element={<Payouts />} />
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/campaigns/:id" element={<CampaignDetails />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/tickets" element={<Tickets />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
