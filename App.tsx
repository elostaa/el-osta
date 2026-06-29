
import React, { useState, useEffect } from 'react';
import { User } from './types';
import Login from './views/Login';
import Register from './views/Register';
import ForgotPassword from './views/ForgotPassword';
import CustomerDashboard from './views/CustomerDashboard';
import TechnicianDashboard from './views/TechnicianDashboard';
import AdminDashboard from './views/AdminDashboard';
import Home from './views/Home';
import AdminSelection from './views/AdminSelection';
import AdminLogin from './views/AdminLogin';
import CustomerSupport from './components/CustomerSupport';
import { doc, onSnapshot, collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'home' | 'login' | 'register' | 'forgot' | 'admin-select' | 'admin-login' | 'customer-dashboard'>('home');
  const [selectedAdminRole, setSelectedAdminRole] = useState<'admin' | 'manager' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [adminPasswords, setAdminPasswords] = useState({ admin: 'admin123', manager: 'manager123' });

  useEffect(() => {
    const savedUser = localStorage.getItem('alOstaUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    
    // Fetch dynamic passwords
    const unsub = onSnapshot(doc(db, 'settings', 'admin'), (docSnap: any) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAdminPasswords({
          admin: data.adminPassword || 'admin123',
          manager: data.managerPassword || 'manager123'
        });
      }
    });

    setIsLoading(false);
    return () => unsub();
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('alOstaUser', JSON.stringify(userData));
  };

  const handleAdminAuth = async (name: string, pass: string) => {
    const requiredPass = selectedAdminRole === 'manager' ? adminPasswords.manager : adminPasswords.admin;
    if (pass === requiredPass) {
      const adminUser: User = {
        id: selectedAdminRole!,
        name: name,
        phone: 'ADMIN_SESSION',
        role: selectedAdminRole!,
        securityQuestion: '',
        securityAnswer: '',
        createdAt: Date.now()
      };
      
      // Log login
      try {
        await addDoc(collection(db, 'adminLoginLogs'), {
          adminName: name,
          role: selectedAdminRole,
          timestamp: Date.now(),
          ip: '---' // IP detection usually requires backend or external service
        });
      } catch (err) { console.error('Failed to log admin login', err); }

      handleLogin(adminUser);
    } else {
      alert('كلمة مرور خاطئة!');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('alOstaUser');
    setView('home');
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-screen bg-slate-900">
          <div className="text-white text-2xl font-bold animate-pulse">الأسطى... جاري التحميل</div>
        </div>
      );
    }

    if (user) {
      switch (user.role) {
        case 'customer': return <CustomerDashboard user={user} onLogout={handleLogout} />;
        case 'technician': return <TechnicianDashboard user={user} onLogout={handleLogout} />;
        case 'admin':
        case 'manager': return <AdminDashboard user={user} onLogout={handleLogout} />;
        default: return <div className="p-10 text-center">خطأ في تحديد الدور</div>;
      }
    }

    switch (view) {
      case 'customer-dashboard': return <CustomerDashboard user={null} onLogout={handleLogout} />;
      case 'register': return <Register onSwitch={() => setView('login')} />;
      case 'forgot': return <ForgotPassword onSwitch={() => setView('login')} />;
      case 'admin-select': return <AdminSelection onSelect={(role) => { setSelectedAdminRole(role); setView('admin-login'); }} onBack={() => setView('home')} />;
      case 'admin-login': return <AdminLogin role={selectedAdminRole!} onLogin={handleAdminAuth} onBack={() => setView('admin-select')} />;
      case 'login': return (
        <Login 
          onLogin={handleLogin} 
          onSwitchRegister={() => setView('register')} 
          onSwitchForgot={() => setView('forgot')}
          onBackHome={() => setView('home')}
          onAdminPortal={() => setView('admin-select')}
        />
      );
      default: return (
        <Home 
          onStartService={() => setView('customer-dashboard')} 
          onJoinAsTech={() => setView('register')}
          onLoginNav={() => setView('login')}
          onRegisterNav={() => setView('customer-dashboard')}
        />
      );
    }
  };

  const isCustomerDashboard = (user && user.role === 'customer') || (!user && view === 'customer-dashboard');

  return (
    <>
      {renderContent()}
      {!isCustomerDashboard && <CustomerSupport />}
    </>
  );
};

export default App;
