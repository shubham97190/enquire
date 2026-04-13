import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import AdminLayout from './components/layout/AdminLayout';
import { AuthProvider } from './context/AuthContext';

// Admin pages
import Login from './pages/admin/Login';
import Dashboard from './pages/admin/Dashboard';
import UserManagement from './pages/admin/UserManagement';
import FormList from './pages/admin/FormList';
import FormBuilder from './pages/admin/FormBuilder';
import FormSubmissions from './pages/admin/FormSubmissions';
import FormReport from './pages/admin/FormReport';

// Public: Dynamic Form
import DynamicForm from './pages/public/DynamicForm';
import FormThankYou from './pages/public/FormThankYou';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>
          {/* Dynamic form (standalone) */}
          <Route path="/f/:slug" element={<DynamicForm />} />
          <Route path="/f/:slug/thank-you" element={<FormThankYou />} />

          {/* Admin routes */}
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="surveys" element={<FormList />} />
            <Route path="surveys/:id/builder" element={<FormBuilder />} />
            <Route path="surveys/:id/submissions" element={<FormSubmissions />} />
            <Route path="surveys/:id/report" element={<FormReport />} />
          </Route>

          {/* Catch-all: redirect to admin */}
          <Route path="*" element={<Login />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

