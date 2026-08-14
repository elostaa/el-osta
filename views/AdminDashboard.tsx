
import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, setDoc, orderBy, getDocs, deleteDoc } from 'firebase/firestore';
import { db, rtdb } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { User, Order } from '../types';

const StatCard = ({ title, val, icon, color }: { title: string, val: number, icon: string, color: string }) => {
  return (
    <div className={`bg-white p-6 md:p-10 rounded-3xl md:rounded-[3rem] shadow-sm border-b-4 md:border-b-8 ${color} relative overflow-hidden group hover:shadow-2xl transition-all duration-500`}>
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div className="text-2xl md:text-4xl">{icon}</div>
        <div className="text-[8px] md:text-[10px] font-black text-slate-300 uppercase tracking-widest">{title}</div>
      </div>
      <p className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter group-hover:scale-110 transition-transform">{val}</p>
    </div>
  );
};

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'stats' | 'orders' | 'completed-log' | 'technicians' | 'customers' | 'tech-performance' | 'emergency' | 'ratings' | 'admin-settings' | 'login-logs'>(user.role === 'admin' ? 'orders' : 'stats');
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [showManagerPass, setShowManagerPass] = useState(false);
  const [expandedOrderImages, setExpandedOrderImages] = useState<Record<string, boolean>>({});
  const prevOrdersCount = useRef<number | null>(null);

  const [rtdbLoyalty, setRtdbLoyalty] = useState<Record<string, { completedCount: number, currentDiscountLevel: number }>>({});
  const [adminNotifications, setAdminNotifications] = useState<any[]>([]);
  const [activeToast, setActiveToast] = useState<string | null>(null);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

  useEffect(() => {
    const unsubOrders = onSnapshot(collection(db, 'orders'), (snap) => {
      const ordersData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      const sorted = ordersData.sort((a, b) => b.createdAt - a.createdAt);
      
      if (prevOrdersCount.current !== null && sorted.length > prevOrdersCount.current) {
        new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {});
      }
      prevOrdersCount.current = sorted.length;
      setOrders(sorted);
    }, (err) => {
      console.warn("Orders listener error:", err);
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
    }, (err) => {
      console.warn("Users listener error:", err);
    });

    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snap) => {
      setCustomers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.warn("Customers listener error:", err);
    });

    const loyaltyRef = ref(rtdb, 'loyalty');
    const unsubLoyalty = onValue(loyaltyRef, (snap) => {
      if (snap.exists()) {
        setRtdbLoyalty(snap.val());
      } else {
        setRtdbLoyalty({});
      }
    }, (err) => {
      console.warn("Loyalty RTDB listener error:", err);
    });

    const notificationsRef = ref(rtdb, 'adminNotifications');
    const unsubNotifications = onValue(notificationsRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const list = Object.values(data).sort((a: any, b: any) => b.timestamp - a.timestamp);
        setAdminNotifications(list);
      } else {
        setAdminNotifications([]);
      }
    }, (err) => {
      console.warn("Admin notifications RTDB listener error:", err);
    });

    return () => { 
      unsubOrders(); 
      unsubUsers(); 
      unsubCustomers(); 
      unsubLoyalty(); 
      unsubNotifications(); 
    };
  }, []);

  // Show live notification toast
  useEffect(() => {
    if (adminNotifications.length > 0) {
      const latest = adminNotifications[0];
      const ageInMs = Date.now() - latest.timestamp;
      if (ageInMs < 8000) {
        setActiveToast(latest.message);
        new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3').play().catch(() => {});
        const timer = setTimeout(() => {
          setActiveToast(null);
        }, 6000);
        return () => clearTimeout(timer);
      }
    }
  }, [adminNotifications]);

  const resolveError = async (orderId: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { adminResolved: true });
      alert('تم اعتماد حل المشكلة ونقل الطلب للسجل المعتمد ✅');
    } catch (err) { alert('فشل التحديث'); }
  };

  const approveTechnician = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { isApproved: true });
      alert('تم اعتماد الفني بنجاح!');
    } catch (err) { alert('فشل الاعتماد'); }
  };

  const revokeTechnician = async (userId: string) => {
    if (!window.confirm('هل أنت متأكد من إلغاء اعتماد هذا الفني؟')) return;
    try {
      await updateDoc(doc(db, 'users', userId), { isApproved: false });
      alert('تم إلغاء اعتماد الفني');
    } catch (err) { alert('فشل إلغاء الاعتماد'); }
  };

  const toggleVIP = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { isVIP: !currentStatus });
      alert(currentStatus ? 'تم إزالة العميل من قائمة VIP' : 'تم ترقية العميل إلى VIP 🌟');
    } catch (err) { alert('فشل تحديث حالة VIP'); }
  };

  const toggleCustomerVIP = async (customerId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'customers', customerId), { isVIP: !currentStatus });
      alert(currentStatus ? 'تم إزالة العميل من قائمة VIP' : 'تم ترقية العميل إلى VIP 🌟');
    } catch (err) { alert('فشل تحديث حالة VIP'); }
  };

  const toggleCustomerSuspension = async (customerId: string, currentStatus: boolean) => {
    if (!window.confirm(currentStatus ? 'هل تريد إلغاء إيقاف هذا العميل؟' : 'هل أنت متأكد من إيقاف هذا العميل؟')) return;
    try {
      await updateDoc(doc(db, 'customers', customerId), { isSuspended: !currentStatus });
      alert(currentStatus ? 'تم إلغاء إيقاف العميل' : 'تم إيقاف العميل مؤقتاً 🛑');
    } catch (err) { alert('فشل تحديث حالة الإيقاف'); }
  };

  const deleteCustomerDoc = async (customerId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا العميل نهائياً؟')) return;
    try {
      await deleteDoc(doc(db, 'customers', customerId));
      alert('تم حذف سجل العميل بنجاح');
    } catch (err) { alert('فشل حذف سجل العميل'); }
  };

  const toggleSuspension = async (userId: string, currentStatus: boolean) => {
    if (!window.confirm(currentStatus ? 'هل تريد إلغاء إيقاف هذا العميل؟' : 'هل أنت متأكد من إيقاف هذا العميل؟')) return;
    try {
      await updateDoc(doc(db, 'users', userId), { isSuspended: !currentStatus });
      alert(currentStatus ? 'تم إلغاء إيقاف العميل' : 'تم إيقاف العميل مؤقتاً 🛑');
    } catch (err) { alert('فشل تحديث حالة الإيقاف'); }
  };

  const assignEmergencyTech = async (orderId: string, tech: User) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'assigned',
        technicianId: tech.id,
        technicianName: tech.name,
        technicianSpecialty: tech.specialty,
        technicianPhone: tech.phone
      });
      alert('تم تعيين الفني للمهمة الطارئة بنجاح! 🚨');
    } catch (err) { alert('فشل التعيين'); }
  };

  const confirmPayment = async (orderId: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { 
        paymentConfirmed: true,
        paymentStatus: 'confirmed'
      });
      alert('تم تأكيد الدفع بنجاح! سيظهر الطلب الآن للفنيين ✅');
    } catch (err) { alert('فشل تأكيد الدفع'); }
  };

  const deleteUser = async (userId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الحساب نهائياً؟')) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
      alert('تم حذف الحساب بنجاح');
    } catch (err) { alert('فشل حذف الحساب'); }
  };

  const deleteRating = async (orderId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا التقييم؟')) return;
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        rating: null,
        feedback: null
      });
      alert('تم حذف التقييم بنجاح');
    } catch (err) { alert('فشل حذف التقييم'); }
  };

  const deleteOrder = async (orderId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الطلب نهائياً؟')) return;
    try {
      await deleteDoc(doc(db, 'orders', orderId));
      alert('تم حذف الطلب بنجاح');
    } catch (err) { alert('فشل حذف الطلب'); }
  };

  const stats = {
    active: orders.filter(o => o.status === 'pending' || o.status === 'assigned').length,
    failed: orders.filter(o => o.status === 'failed' && !o.adminResolved).length,
    completed: orders.filter(o => o.status === 'completed').length,
    techs: users.filter(u => u.role === 'technician' && u.isApproved).length,
    emergency: orders.filter(o => o.isEmergency && o.status === 'pending').length,
  };

  // الطلبات التي بها مشاكل ولم يتم حلها إدارياً
  const currentFailedOrders = orders.filter(o => o.status === 'failed' && !o.adminResolved);

  const technicians = users.filter(u => u.role === 'technician' && u.isApproved);
  
  // دالة جلب أوردرات الفني (تشمل المكتملة والمتعثرة عشان الإدارة تشوف كل حاجة)
  const getTechOrders = (techId: string) => {
    return orders.filter(o => o.technicianId === techId && (o.status === 'completed' || o.status === 'failed'))
                 .sort((a, b) => b.createdAt - a.createdAt);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {/* Sidebar / Mobile Header */}
      <aside className="w-full md:w-80 bg-slate-900 text-white shadow-2xl z-40 flex flex-col">
        <div className="p-6 md:p-12 text-center border-b border-white/5">
          <div className="inline-block bg-amber-500 text-slate-900 p-3 md:p-4 rounded-2xl md:rounded-3xl transform -rotate-12 mb-4 md:mb-6 shadow-2xl">
            <span className="text-2xl md:text-4xl font-black">HQ</span>
          </div>
          <h1 className="text-xl md:text-3xl font-black tracking-tighter mb-1">الأسطى • الإدارة</h1>
          <p className="text-slate-500 text-[8px] md:text-[10px] font-black uppercase tracking-widest relative">
            مركز القيادة الوطني
            {currentFailedOrders.length > 0 && (
              <span className="absolute -top-1 -right-4 w-2 h-2 md:w-3 md:h-3 bg-red-500 rounded-full animate-ping"></span>
            )}
          </p>
        </div>
        
        <nav className="mt-4 md:mt-8 px-4 md:px-8 space-y-2 md:space-y-3 flex flex-row md:flex-col overflow-x-auto md:overflow-y-auto custom-scroll pb-4 md:pb-0">
          {[
            {id:'stats',l:'📊 نظرة عامة', i: 'Dashboard'},
            {id:'orders',l:'📦 الطلبات النشطة', i: 'Live Orders'},
            {id:'tech-performance',l:'📈 أداء الأسطوات', i: 'Performance'},
            {id:'emergency',l:'🚨 طلبات الطوارئ', i: 'Emergency'},
            {id:'completed-log',l:'📜 سجل العمليات', i: 'Full History'},
            {id:'ratings',l:'⭐ تقييمات العملاء', i: 'Ratings'},
            {id:'technicians',l:'👷‍♂️ إدارة الفنيين', i: 'Staff'},
            {id:'customers',l:'👥 إدارة العملاء', i: 'Clients'},
            {id:'admin-settings',l:'⚙️ الإعدادات', i: 'Settings'},
            {id:'login-logs',l:'🔐 سجل الدخول', i: 'Logs'},
          ].filter(item => {
            if (user.role === 'admin') {
              const restricted = ['stats', 'ratings', 'customers', 'tech-performance', 'login-logs', 'admin-settings'];
              return !restricted.includes(item.id);
            }
            return true;
          }).map(item => (
            <button 
              key={item.id} 
              onClick={() => { setActiveTab(item.id as any); setSelectedTechId(null); }} 
              className={`whitespace-nowrap md:whitespace-normal text-right p-3 md:p-5 rounded-xl md:rounded-[2rem] font-black transition-all duration-500 relative flex flex-col flex-shrink-0 md:flex-shrink ${activeTab === item.id ? 'bg-amber-500 text-slate-900 shadow-2xl shadow-amber-500/20 md:translate-x-3' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
            >
              <div className="flex justify-between items-center gap-2">
                <span className="text-xs md:text-base">{item.l}</span>
                {item.id === 'stats' && currentFailedOrders.length > 0 && (
                  <span className="bg-red-500 text-white text-[8px] px-2 py-1 rounded-full animate-bounce">{currentFailedOrders.length}</span>
                )}
                {item.id === 'emergency' && stats.emergency > 0 && (
                  <span className="bg-red-600 text-white text-[8px] px-2 py-1 rounded-full animate-ping">{stats.emergency}</span>
                )}
              </div>
              <span className={`hidden md:block text-[8px] uppercase tracking-widest mt-0.5 ${activeTab === item.id ? 'text-slate-900/50' : 'text-slate-700'}`}>{item.i}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 md:p-8 border-t border-white/5">
          <button onClick={onLogout} className="w-full bg-red-500/10 text-red-500 p-3 md:p-5 rounded-xl md:rounded-[2rem] font-black hover:bg-red-500 hover:text-white transition-all flex justify-center gap-2 md:gap-3 text-xs md:text-base">
            <span>خروج آمن</span>
            <span>🔒</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 md:p-16 custom-scroll relative">
        {/* Floating live toast notification */}
        {activeToast && (
          <div className="fixed top-6 left-6 z-50 max-w-sm bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 rounded-3xl shadow-2xl border border-emerald-400 animate-fadeIn flex items-center gap-4 text-right" style={{ direction: 'rtl' }}>
            <div className="text-3xl">🎉</div>
            <div className="flex-1">
              <p className="text-sm font-black leading-relaxed">{activeToast}</p>
            </div>
            <button onClick={() => setActiveToast(null)} className="text-white/60 hover:text-white font-black text-sm">✕</button>
          </div>
        )}

        {/* التنبيه الأحمر: يظهر الآن في كل الصفحات طالما هناك مشكلة لم تحل */}
        {currentFailedOrders.length > 0 && (
          <div className="mb-8 md:mb-12 p-6 md:p-10 bg-red-600 rounded-3xl md:rounded-[3.5rem] shadow-2xl shadow-red-600/20 text-white animate-fadeIn relative overflow-hidden">
             <div className="absolute -right-6 -bottom-6 opacity-10 text-7xl md:text-9xl font-black rotate-12">⚠️</div>
             <div className="relative z-10">
                <div className="flex items-center gap-4 md:gap-6 mb-6 md:mb-8">
                   <div className="w-12 h-12 md:w-16 md:h-16 bg-white/20 backdrop-blur-md text-white rounded-xl md:rounded-[1.5rem] flex items-center justify-center text-xl md:text-3xl animate-bounce">🚨</div>
                   <div>
                      <h3 className="text-xl md:text-3xl font-black tracking-tighter">أعطال نشطة تحتاج قرارك!</h3>
                      <p className="text-xs md:text-sm font-bold opacity-80">يوجد {currentFailedOrders.length} طلبات متعثرة لم يتم حلها بعد.</p>
                   </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:grid-cols-2 md:gap-6">
                   {currentFailedOrders.map(o => (
                     <div key={o.id} className="bg-white/10 backdrop-blur-xl p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] border border-white/10 flex flex-col justify-between items-start">
                        <div className="mb-4 w-full">
                           <div className="flex justify-between w-full items-start gap-2">
                              <h4 className="text-lg md:text-xl font-black truncate">
                                 {o.orderNumber && <span className="bg-white/20 text-white text-[9px] px-2 py-0.5 rounded-lg font-bold ml-1">#{o.orderNumber}</span>}
                                 {o.customerName}
                               </h4>
                              <span className="text-[8px] md:text-[10px] bg-white/20 px-2 md:px-3 py-1 rounded-full font-black whitespace-nowrap">{o.serviceType}</span>
                           </div>
                           <p className="text-[9px] md:text-[10px] font-black text-red-200 mt-2 italic">السبب: {o.failureReason || 'عطل غير محدد'}</p>
                           {o.customerPhone && <p className="text-[9px] md:text-[10px] font-bold text-amber-200 mt-1">📞 هاتف العميل: {o.customerPhone}</p>}
                           <p className="text-[8px] md:text-[9px] text-white/50 mt-1 uppercase font-bold">بواسطة: {o.technicianName}</p>
                        </div>
                        <button onClick={() => resolveError(o.id)} className="w-full bg-white text-red-600 py-2 md:py-3 rounded-xl font-black text-[10px] md:text-xs hover:scale-105 transition shadow-xl">تأكيد حل المشكلة ✅</button>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        )}

        <header className="mb-8 md:mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8">
          <div className="space-y-1 md:space-y-2">
            <div className="text-[10px] md:text-xs font-black text-amber-600 uppercase tracking-[0.2em] md:tracking-[0.3em] mb-2 md:mb-4">مركز قيادة الأسطى</div>
            <h2 className="text-3xl md:text-6xl font-black text-slate-900 tracking-tighter">
              {activeTab === 'tech-performance' ? 'أداء الأسطوات' : activeTab === 'completed-log' ? 'سجل العمليات الكامل' : activeTab === 'technicians' ? 'إدارة الفنيين' : activeTab === 'customers' ? 'إدارة العملاء' : activeTab === 'emergency' ? 'طلبات الطوارئ 🚨' : `مرحباً، ${user.name}`}
            </h2>
            <p className="text-slate-400 font-bold text-base md:text-xl">متابعة دقيقة لكل فني وحالة 📈</p>
          </div>
          
          <div className="flex items-center gap-3 w-fit">
            {activeTab === 'tech-performance' && selectedTechId && (
              <button onClick={() => setSelectedTechId(null)} className="bg-slate-900 text-white px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-xs md:text-sm flex items-center gap-2 md:gap-3 shadow-xl hover:bg-slate-800 transition transform active:scale-95 w-fit">
                <span>🔙 قائمة الفنيين</span>
              </button>
            )}

            {/* زر الإشعارات الفورية لنظام الولاء */}
            <div className="relative z-40">
              <button 
                onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)} 
                className="bg-white border border-slate-200 text-slate-700 w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shadow-sm hover:bg-slate-50 transition relative active:scale-95 cursor-pointer"
                title="الإشعارات"
              >
                <span className="text-xl md:text-2xl">🔔</span>
                {adminNotifications.length > 0 && (
                  <span className="absolute -top-1.5 -left-1.5 bg-amber-500 text-slate-950 text-[9px] md:text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md border-2 border-white">
                    {adminNotifications.length}
                  </span>
                )}
              </button>

              {showNotificationsDropdown && (
                <div className="absolute left-0 mt-3 w-80 bg-white rounded-3xl border border-slate-100 shadow-2xl z-50 p-5 space-y-4 animate-fadeIn text-right" style={{ direction: 'rtl' }}>
                  <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                    <h3 className="font-black text-slate-900 text-sm">🔔 إشعارات الولاء والمكافآت</h3>
                    <button onClick={() => setShowNotificationsDropdown(false)} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-3 custom-scroll pr-1">
                    {adminNotifications.map((n, idx) => (
                      <div key={n.id || idx} className="p-3 bg-amber-50/50 rounded-2xl border border-amber-100/60 text-xs text-slate-800 leading-relaxed font-bold animate-fadeIn">
                        <p>{n.message}</p>
                        <span className="text-[9px] text-slate-400 block mt-1">
                          {new Date(n.timestamp).toLocaleTimeString('ar-EG')} - {new Date(n.timestamp).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                    ))}
                    {adminNotifications.length === 0 && (
                      <p className="text-center text-slate-400 text-xs py-6 italic font-bold">لا توجد إشعارات حالياً</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {activeTab === 'stats' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 animate-fadeIn">
            <StatCard title="مهام جارية" val={stats.active} icon="🚚" color="border-blue-500" />
            <StatCard title="أعطال نشطة" val={stats.failed} icon="🛑" color="border-red-500" />
            <StatCard title="تم بنجاح" val={stats.completed} icon="🏆" color="border-emerald-500" />
            <StatCard title="الأسطوات المعتمدة" val={stats.techs} icon="👨‍🔧" color="border-amber-500" />
          </div>
        )}

        {/* سجل أداء الفنيين - مربوط بالكامل */}
        {activeTab === 'tech-performance' && (
          <div className="animate-fadeIn">
            {!selectedTechId ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {technicians.map(tech => {
                  const techOrders = getTechOrders(tech.id);
                  const successRate = techOrders.length > 0 ? (techOrders.filter(o => o.status === 'completed').length / techOrders.length * 100).toFixed(0) : 100;
                  return (
                    <div key={tech.id} className="bg-white p-6 md:p-10 rounded-3xl md:rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center group hover:shadow-2xl hover:-translate-y-2 transition-all duration-500">
                      <div className="w-16 h-16 md:w-24 md:h-24 bg-slate-900 text-white rounded-2xl md:rounded-[2.5rem] flex items-center justify-center mb-4 md:mb-6 text-2xl md:text-4xl shadow-xl group-hover:bg-amber-500 group-hover:text-slate-900 transition-colors">👷‍♂️</div>
                      <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter mb-1">{tech.name}</h3>
                      <p className="text-[10px] md:text-xs font-black text-amber-600 uppercase tracking-widest mb-4 md:mb-6">{tech.specialty}</p>
                      
                      <div className="grid grid-cols-2 gap-3 md:gap-4 w-full mb-6 md:mb-8">
                        <div className="bg-slate-50 p-3 md:p-4 rounded-2xl md:rounded-3xl text-center border border-slate-100">
                          <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase mb-1">إجمالي العمليات</p>
                          <p className="text-xl md:text-2xl font-black text-slate-900">{techOrders.length}</p>
                        </div>
                        <div className="bg-slate-50 p-3 md:p-4 rounded-2xl md:rounded-3xl text-center border border-slate-100">
                          <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase mb-1">نسبة النجاح</p>
                          <p className="text-xl md:text-2xl font-black text-emerald-500">{successRate}%</p>
                        </div>
                      </div>

                      <button onClick={() => setSelectedTechId(tech.id)} className="w-full bg-slate-900 text-white py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-xs md:text-sm shadow-xl hover:bg-amber-500 hover:text-slate-900 transition-all flex items-center justify-center gap-2 md:gap-3">
                        عرض التواريخ 📄
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-6 md:space-y-8 animate-fadeIn">
                <div className="bg-slate-900 p-8 md:p-12 rounded-3xl md:rounded-[4rem] text-white flex flex-col md:flex-row justify-between items-center gap-6 md:gap-8 relative overflow-hidden shadow-2xl">
                   <div className="absolute top-0 right-0 w-48 md:w-64 h-48 md:h-64 bg-amber-500/10 rounded-full blur-3xl -mr-24 md:-mr-32 -mt-24 md:-mt-32"></div>
                   <div className="flex items-center gap-4 md:gap-8 relative z-10 text-right">
                      <div className="w-16 h-16 md:w-24 md:h-24 bg-amber-500 text-slate-900 rounded-2xl md:rounded-[2.5rem] flex items-center justify-center text-2xl md:text-4xl shadow-2xl">👷‍♂️</div>
                      <div>
                        <h3 className="text-2xl md:text-4xl font-black tracking-tighter mb-1">{users.find(u => u.id === selectedTechId)?.name}</h3>
                        <p className="text-amber-500 font-black text-[10px] md:text-sm tracking-widest uppercase">سجل العمليات التاريخي للفني</p>
                      </div>
                   </div>
                </div>

                <div className="bg-white rounded-3xl md:rounded-[4rem] shadow-sm border border-slate-100 overflow-hidden">
                   <div className="overflow-x-auto">
                     <table className="w-full text-right min-w-[600px]">
                       <thead className="bg-slate-900 text-white uppercase text-[8px] md:text-[10px] font-black tracking-[0.1em] md:tracking-[0.2em]">
                         <tr>
                           <th className="p-4 md:p-8">التاريخ والوقت</th>
                           <th className="p-4 md:p-8">العميل والموقع</th>
                           <th className="p-4 md:p-8">نوع الخدمة</th>
                           <th className="p-4 md:p-8 text-center">حالة العملية</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                         {getTechOrders(selectedTechId).map(o => (
                           <tr key={o.id} className="hover:bg-slate-50/50 transition-colors group">
                             <td className="p-4 md:p-8 font-black text-slate-900 text-xs md:text-base">
                               {new Date(o.createdAt).toLocaleDateString('ar-EG')} <br />
                               <span className="text-[8px] md:text-[10px] text-slate-400">{new Date(o.createdAt).toLocaleTimeString('ar-EG')}</span>
                             </td>
                             <td className="p-4 md:p-8">
                               <p className="font-black text-slate-900 text-xs md:text-base">{o.customerName}</p>
                               {o.orderNumber && <span className="inline-block text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 mb-1 ml-1">#{o.orderNumber}</span>}
                               {o.customerPhone && <p className="text-[10px] md:text-xs font-bold text-amber-600">📞 {o.customerPhone}</p>}
                               <p className="text-[10px] md:text-xs text-slate-400">📍 {o.detailedLocation}</p>
                               {o.imageUrl && (
                                 <div className="mt-2">
                                   <button 
                                     onClick={() => setExpandedOrderImages(prev => ({ ...prev, [o.id]: !prev[o.id] }))}
                                     className="text-[10px] font-black text-amber-600 hover:text-amber-800 transition-all flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 cursor-pointer"
                                   >
                                     <span>🖼️</span> {expandedOrderImages[o.id] ? "إخفاء الصورة" : "عرض الصورة"}
                                   </button>
                                   {expandedOrderImages[o.id] && (
                                     <div className="mt-2 max-w-xs rounded-xl overflow-hidden shadow-md border border-slate-200 animate-fadeIn">
                                       <img src={o.imageUrl} alt="صورة العطل" className="w-full h-auto max-h-48 object-cover rounded-xl" referrerPolicy="no-referrer" />
                                     </div>
                                   )}
                                 </div>
                               )}
                             </td>
                             <td className="p-4 md:p-8">
                               <span className="bg-slate-100 text-slate-900 px-3 md:px-4 py-1 md:py-1.5 rounded-full text-[8px] md:text-[10px] font-black border border-slate-200">{o.serviceType}</span>
                             </td>
                             <td className="p-4 md:p-8 text-center">
                               <span className={`px-3 md:px-4 py-1 md:py-1.5 rounded-full text-[8px] md:text-[10px] font-black ${o.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                 {o.status === 'completed' ? 'نجحت ✅' : 'تعثرت ❌'}
                               </span>
                               {o.status === 'failed' && <p className="text-[7px] md:text-[8px] text-red-400 mt-1 md:mt-2 font-bold italic">"{o.failureReason}"</p>}
                               <button 
                                 onClick={() => deleteOrder(o.id)}
                                 className="text-red-500 hover:text-red-700 text-[8px] font-black transition-colors block mx-auto mt-2"
                               >
                                 حذف السجل 🗑️
                               </button>
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* سجل العمليات العام */}
        {(activeTab === 'orders' || activeTab === 'completed-log') && (
           <div className="bg-white rounded-3xl md:rounded-[4rem] shadow-sm overflow-hidden border border-slate-100 animate-fadeIn mt-8 md:mt-12">
            <div className="overflow-x-auto">
              <table className="w-full text-right min-w-[700px]">
                <thead className="bg-slate-900 text-white uppercase text-[8px] md:text-[10px] font-black tracking-[0.1em] md:tracking-[0.2em]">
                  <tr>
                    <th className="p-6 md:p-10">العميل والموقع</th>
                    <th className="p-6 md:p-10">الأسطى والبيانات</th>
                    <th className="p-6 md:p-10 text-center">حالة الطلب</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(activeTab === 'orders' 
                    ? orders.filter(o => o.status === 'pending' || o.status === 'assigned' || (o.status === 'failed' && !o.adminResolved))
                    : orders.filter(o => o.status === 'completed' || (o.status === 'failed' && o.adminResolved))
                  ).map(o => (
                    <tr key={o.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="p-6 md:p-10">
                        <p className="font-black text-slate-900 text-xl md:text-2xl tracking-tighter flex items-center gap-2">
                          {o.customerName}
                          {o.orderNumber && <span className="text-[11px] font-black text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">طلب رقم: #{o.orderNumber}</span>}
                        </p>
                        {o.customerPhone && <p className="text-xs md:text-sm font-bold text-slate-800 mt-1">📞 {o.customerPhone}</p>}
                        <p className="text-[8px] md:text-[10px] text-amber-600 font-black uppercase tracking-widest mt-1">📍 {o.detailedLocation}</p>
                        <p className="text-[10px] md:text-xs text-slate-400 font-bold mt-2 italic opacity-60">"{o.description}"</p>
                        {o.imageUrl && (
                          <div className="mt-3">
                            <button 
                              onClick={() => setExpandedOrderImages(prev => ({ ...prev, [o.id]: !prev[o.id] }))}
                              className="text-xs font-black text-amber-600 hover:text-amber-800 transition-all flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 cursor-pointer"
                            >
                              <span>🖼️</span> {expandedOrderImages[o.id] ? "إخفاء صورة العطل" : "عرض صورة العطل"}
                            </button>
                            {expandedOrderImages[o.id] && (
                              <div className="mt-3 max-w-sm rounded-2xl overflow-hidden shadow-lg border border-slate-200 animate-fadeIn">
                                <img src={o.imageUrl} alt="صورة العطل" className="w-full h-auto max-h-64 object-cover rounded-xl" referrerPolicy="no-referrer" />
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-6 md:p-10">
                        {o.technicianName ? (
                          <div className="bg-slate-50 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100 w-fit">
                             <p className="text-lg md:text-xl font-black text-slate-900">{o.technicianName}</p>
                             <p className="text-[8px] md:text-[10px] text-amber-600 font-black mt-1 uppercase tracking-widest">{o.technicianSpecialty}</p>
                          </div>
                        ) : (
                          <span className="text-slate-300 italic font-black text-[10px] md:text-xs animate-pulse">بانتظار قبول أسطى</span>
                        )}
                      </td>
                      <td className="p-6 md:p-10 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <span className={`px-4 md:px-6 py-1.5 md:py-2 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest shadow-sm ${
                            o.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                            o.status === 'assigned' ? 'bg-blue-100 text-blue-700' : 
                            o.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {o.status === 'pending' ? 'في الانتظار' : o.status === 'assigned' ? 'جاري التنفيذ' : o.status === 'completed' ? 'تمت المهمة' : '⚠️ تعثرت'}
                          </span>
                          {o.status === 'failed' && !o.adminResolved && <span className="text-[7px] md:text-[8px] text-red-500 font-black animate-pulse">تتدخل إداري مطلوب 🛑</span>}
                          {activeTab === 'orders' && !o.paymentConfirmed && (
                            <button 
                              onClick={() => confirmPayment(o.id)}
                              className="mt-2 bg-emerald-500 text-white px-4 py-1.5 rounded-full text-[8px] md:text-[10px] font-black hover:bg-emerald-600 transition-all shadow-md"
                            >
                              تم الدفع ✅
                            </button>
                          )}
                          {o.paymentConfirmed && (
                            <span className="mt-1 text-[7px] md:text-[8px] text-emerald-600 font-black">مدفوع ✓</span>
                          )}
                          <button 
                            onClick={() => deleteOrder(o.id)}
                            className="mt-2 text-red-500 hover:text-red-700 text-[8px] md:text-[10px] font-black transition-colors"
                          >
                            حذف الطلب 🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* إدارة الفنيين */}
        {activeTab === 'technicians' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10 animate-fadeIn mt-8 md:mt-12">
            {users.filter(u => u.role === 'technician').map(u => (
              <div key={u.id} className="bg-white p-6 md:p-10 rounded-3xl md:rounded-[4rem] border border-slate-100 shadow-sm flex flex-col justify-center items-center group hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 text-center relative overflow-hidden">
                <div className={`w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-[2.5rem] flex items-center justify-center mb-6 md:mb-8 text-2xl md:text-4xl shadow-inner ${u.isApproved ? 'bg-emerald-50' : 'bg-amber-50 animate-pulse transform -rotate-12'}`}>
                  👷‍♂️
                </div>
                <h3 className="font-black text-slate-900 text-xl md:text-2xl tracking-tighter mb-1 md:mb-2">{u.name}</h3>
                <p className="text-[10px] md:text-xs text-slate-400 font-bold mb-1 uppercase tracking-widest">📞 {u.phone}</p>
                {u.averageRating && (
                  <p className="text-[10px] font-black text-amber-500 mb-2">⭐ {u.averageRating} ({u.ratingCount} تقييم)</p>
                )}
                <p className="text-[10px] md:text-xs text-amber-600 font-black mb-6 uppercase tracking-widest">{u.specialty}</p>
                
                <div className="flex flex-col items-center gap-3 md:gap-4 w-full">
                  <div className="flex items-center gap-2 md:gap-3">
                    <span className={`text-[8px] md:text-[9px] font-black px-4 md:px-5 py-1.5 md:py-2 rounded-full uppercase tracking-[0.1em] md:tracking-[0.2em] shadow-sm bg-slate-900 text-white`}>
                      فني
                    </span>
                    <span className={`text-[8px] md:text-[9px] font-black px-3 md:px-4 py-1.5 md:py-2 rounded-full uppercase tracking-widest shadow-sm ${u.isApproved ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white animate-pulse'}`}>
                      {u.isApproved ? 'موثق' : 'غير معتمد'}
                    </span>
                  </div>
                  {u.isApproved ? (
                    <button onClick={() => revokeTechnician(u.id)} className="w-full mt-4 md:mt-6 bg-red-50 hover:bg-red-100 text-red-600 py-4 md:py-5 rounded-2xl md:rounded-[2rem] font-black text-xs md:text-sm shadow-sm transition-all active:scale-95 border border-red-100 cursor-pointer">
                      إلغاء الاعتماد ❌
                    </button>
                  ) : (
                    <button onClick={() => approveTechnician(u.id)} className="w-full mt-4 md:mt-6 bg-amber-500 hover:bg-amber-600 text-slate-900 py-4 md:py-5 rounded-2xl md:rounded-[2rem] font-black text-xs md:text-sm shadow-2xl transition-all active:scale-95 cursor-pointer">
                      اعتماد الأسطى فوراً ✅
                    </button>
                  )}
                  {user.role === 'manager' && (
                    <button 
                      onClick={() => deleteUser(u.id)}
                      className="w-full mt-2 text-red-400 hover:text-red-600 text-[10px] font-black transition-colors cursor-pointer"
                    >
                      حذف الحساب نهائياً 🗑️
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* إدارة العملاء */}
        {activeTab === 'customers' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10 animate-fadeIn mt-8 md:mt-12 text-right" style={{ direction: 'rtl' }}>
            {customers.map(c => (
              <div key={c.id} className="bg-white p-6 md:p-10 rounded-3xl md:rounded-[4rem] border border-slate-100 shadow-sm flex flex-col justify-center items-center group hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 text-center relative overflow-hidden">
                <div className={`w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-[2.5rem] flex items-center justify-center mb-6 md:mb-8 text-2xl md:text-4xl shadow-inner bg-slate-50`}>
                  👤
                </div>
                <h3 className="font-black text-slate-900 text-xl md:text-2xl tracking-tighter mb-1 md:mb-2">{c.name}</h3>
                <p className="text-[10px] md:text-xs text-slate-400 font-bold mb-4 uppercase tracking-widest">📞 {c.phone}</p>
                <p className="text-[10px] md:text-xs text-slate-500 font-bold mb-3 italic">عدد طلبات العميل: {c.orderCount || 0}</p>

                {/* عداد نظام الولاء ومستوى الخصم */}
                <div className="w-full bg-slate-50 p-3 rounded-2xl mb-4 text-center border border-slate-100 animate-fadeIn">
                  <p className="text-[10px] font-black text-slate-500">🏆 نظام الولاء والخصومات</p>
                  <div className="flex justify-between items-center mt-2 text-[11px] font-black text-slate-900">
                    <span>الطلبات المكتملة: <span className="text-amber-600 font-bold">{rtdbLoyalty[c.phone?.trim().replace(/[\s\+\-\(\)]/g, '')]?.completedCount ?? c.completedCount ?? 0}</span> / 8</span>
                    <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-2 py-0.5 rounded-full">
                      خصم {rtdbLoyalty[c.phone?.trim().replace(/[\s\+\-\(\)]/g, '')]?.currentDiscountLevel ?? c.currentDiscountLevel ?? 5}% 🎁
                    </span>
                  </div>
                  {/* Progress bar visual */}
                  <div className="w-full bg-slate-200 h-2 rounded-full mt-2 overflow-hidden">
                    <div 
                      className="bg-amber-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${(((rtdbLoyalty[c.phone?.trim().replace(/[\s\+\-\(\)]/g, '')]?.completedCount ?? c.completedCount ?? 0) / 8) * 100)}%` }}
                    />
                  </div>
                </div>
                
                  <div className="flex flex-col items-center gap-3 md:gap-4 w-full">
                    <div className="flex items-center gap-2">
                      <span className={`text-[8px] md:text-[9px] font-black px-4 md:px-5 py-1.5 md:py-2 rounded-full uppercase tracking-[0.1em] md:tracking-[0.2em] shadow-sm bg-slate-100 text-slate-500`}>
                        عميل
                      </span>
                      {c.isVIP && (
                        <span className="text-[8px] md:text-[9px] font-black px-3 md:px-4 py-1.5 md:py-2 rounded-full uppercase tracking-widest shadow-sm bg-amber-500 text-slate-900">
                          VIP 🌟
                        </span>
                      )}
                      {c.isSuspended && (
                        <span className="text-[8px] md:text-[9px] font-black px-3 md:px-4 py-1.5 md:py-2 rounded-full uppercase tracking-widest shadow-sm bg-red-500 text-white">
                          موقوف 🛑
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 w-full mt-4">
                      <button 
                        onClick={() => toggleCustomerVIP(c.id, !!c.isVIP)} 
                        className={`bg-white border-2 py-3 rounded-2xl font-black text-[10px] transition-all active:scale-95 cursor-pointer ${c.isVIP ? 'border-slate-200 text-slate-400 hover:bg-slate-50' : 'border-amber-500 text-amber-600 hover:bg-amber-50'}`}
                      >
                        {c.isVIP ? 'إلغاء VIP' : 'ترقية VIP'}
                      </button>
                      <button 
                        onClick={() => toggleCustomerSuspension(c.id, !!c.isSuspended)} 
                        className={`bg-white border-2 py-3 rounded-2xl font-black text-[10px] transition-all active:scale-95 cursor-pointer ${c.isSuspended ? 'border-emerald-500 text-emerald-600 hover:bg-emerald-50' : 'border-red-500 text-red-600 hover:bg-red-50'}`}
                      >
                        {c.isSuspended ? 'تفعيل' : 'إيقاف'}
                      </button>
                    </div>
                    {user.role === 'manager' && (
                      <button 
                        onClick={() => deleteCustomerDoc(c.id)}
                        className="w-full mt-4 text-red-400 hover:text-red-600 text-[10px] font-black transition-colors cursor-pointer"
                      >
                        حذف العميل 🗑️
                      </button>
                    )}
                  </div>
              </div>
            ))}
          </div>
        )}

        {/* طلبات الطوارئ */}
        {activeTab === 'emergency' && (
          <div className="space-y-8 md:space-y-12 animate-fadeIn mt-8 md:mt-12">
            {orders.filter(o => o.isEmergency && o.status === 'pending').map(order => (
              <div key={order.id} className="bg-white rounded-[3rem] md:rounded-[4rem] shadow-xl border-4 border-red-500 overflow-hidden">
                <div className="bg-red-600 p-6 md:p-10 text-white flex justify-between items-center">
                  <div>
                    <h3 className="text-2xl md:text-4xl font-black tracking-tighter flex items-center gap-3">
                      {order.orderNumber && <span className="bg-white/20 text-white text-xs md:text-base px-3 py-1 rounded-xl font-bold ml-1">#{order.orderNumber}</span>}
                      {order.customerName}
                    </h3>
                    <p className="text-red-100 font-bold mt-1">📞 {order.customerPhone} | 📍 {order.detailedLocation}</p>
                  </div>
                  <div className="bg-white/20 px-6 py-3 rounded-2xl font-black text-xs md:text-lg">
                    {order.serviceType} 🚨
                  </div>
                </div>
                <div className="p-8 md:p-12 grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16">
                  <div>
                    <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest mb-4">وصف الحالة الطارئة</h4>
                    <p className="text-lg md:text-xl font-bold text-slate-700 leading-relaxed bg-slate-50 p-6 rounded-3xl border border-slate-100 italic">
                      "{order.description}"
                    </p>
                  </div>
                  <div className="flex flex-col gap-4">
                    <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest mb-4">حالة الدفع</h4>
                    {!order.paymentConfirmed ? (
                      <button 
                        onClick={() => confirmPayment(order.id)}
                        className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black text-sm hover:bg-emerald-600 transition-all shadow-lg flex items-center justify-center gap-2"
                      >
                        تأكيد استلام الدفع (20 ج) ✅
                      </button>
                    ) : (
                      <div className="bg-emerald-50 border-2 border-emerald-200 p-4 rounded-2xl flex items-center justify-center gap-2">
                        <span className="text-emerald-600 font-black text-sm">تم الدفع بنجاح ✓</span>
                      </div>
                    )}
                    
                    <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest mt-6 mb-4">الفنيين المختصين المتاحين</h4>
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-4 custom-scroll">
                      {users.filter(u => u.role === 'technician' && u.isApproved && u.specialty === order.serviceType).map(tech => (
                        <div key={tech.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-slate-100 transition-colors group">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center text-lg">👷‍♂️</div>
                            <div>
                              <p className="font-black text-slate-900 text-sm">{tech.name}</p>
                              <p className="text-[10px] text-slate-400 font-bold">📞 {tech.phone}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => assignEmergencyTech(order.id, tech)}
                            className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black hover:bg-emerald-500 transition-all transform active:scale-95"
                          >
                            تعيين الآن ✅
                          </button>
                        </div>
                      ))}
                      {users.filter(u => u.role === 'technician' && u.isApproved && u.specialty === order.serviceType).length === 0 && (
                        <p className="text-center py-10 text-slate-300 italic font-black">لا يوجد فنيين متاحين لهذا التخصص حالياً</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {orders.filter(o => o.isEmergency && o.status === 'pending').length === 0 && (
              <div className="text-center py-40 opacity-20 italic font-black text-3xl grayscale">لا توجد طلبات طوارئ حالياً 🕊️</div>
            )}
          </div>
        )}

        {/* تقييمات العملاء */}
        {activeTab === 'ratings' && (
          <div className="animate-fadeIn mt-8 md:mt-12 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {orders.filter(o => o.rating).map(order => (
                <div key={order.id} className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-xl transition-all group">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">⭐</span>
                        <span className="text-2xl font-black text-amber-500">{order.rating}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => deleteRating(order.id)}
                          className="bg-red-50 text-red-500 p-2 rounded-full hover:bg-red-500 hover:text-white transition-all"
                          title="حذف التقييم"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    <p className="text-slate-900 font-black text-lg mb-2">"{order.feedback || 'بدون تعليق'}"</p>
                    <div className="space-y-1 text-[10px] md:text-xs font-bold text-slate-400">
                      <p>👤 العميل: {order.customerName}</p>
                      {order.customerPhone && <p className="text-amber-600 font-bold">📞 هاتف العميل: {order.customerPhone}</p>}
                      <p>👷‍♂️ الفني: {order.technicianName}</p>
                      <p>🛠️ الخدمة: {order.serviceType}</p>
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-50 text-[8px] md:text-[10px] text-slate-300 font-black uppercase tracking-widest">
                    {new Date(order.createdAt).toLocaleDateString('ar-EG')}
                  </div>
                </div>
              ))}
            </div>
            {orders.filter(o => o.rating).length === 0 && (
              <div className="text-center py-40 opacity-20 italic font-black text-3xl grayscale">لا توجد تقييمات حالياً ⭐</div>
            )}
          </div>
        )}

        {/* إعدادات الإدارة */}
        {activeTab === 'admin-settings' && (
          <div className={`max-w-4xl mx-auto grid grid-cols-1 ${user.role === 'manager' ? 'md:grid-cols-2' : ''} gap-8 animate-fadeIn mt-8 md:mt-12`}>
            {/* تغيير كلمة مرور مشرف النظام */}
            <div className="bg-white p-8 md:p-12 rounded-3xl md:rounded-[4rem] border border-slate-100 shadow-sm">
              <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-8 text-center">⚙️ كلمة مرور مشرف النظام</h3>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const newPass = formData.get('adminPass') as string;
                const confirmPass = formData.get('confirmAdminPass') as string;
                
                if (newPass !== confirmPass) return alert('كلمات المرور غير متطابقة');
                if (newPass.length < 6) return alert('كلمة مرور قصيرة جداً');

                if (!window.confirm('هل أنت متأكد من تغيير كلمة مرور المشرف؟')) return;

                try {
                  await setDoc(doc(db, 'settings', 'admin'), {
                    adminPassword: newPass
                  }, { merge: true });
                  alert('تم تحديث كلمة مرور المشرف بنجاح ✅');
                  (e.target as HTMLFormElement).reset();
                } catch (err) { alert('فشل تحديث كلمة المرور'); }
              }} className="space-y-6">
                <div>
                  <label className="block text-slate-400 font-black text-xs md:text-sm mb-2 uppercase tracking-widest">كلمة المرور الجديدة</label>
                  <div className="relative">
                    <input name="adminPass" type={showAdminPass ? "text" : "password"} required className="w-full bg-slate-50 border-2 border-slate-100 p-4 md:p-5 rounded-2xl md:rounded-3xl font-bold focus:border-amber-500 outline-none transition-all" />
                    <button type="button" onClick={() => setShowAdminPass(!showAdminPass)} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showAdminPass ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-slate-400 font-black text-xs md:text-sm mb-2 uppercase tracking-widest">تأكيد كلمة المرور</label>
                  <div className="relative">
                    <input name="confirmAdminPass" type={showAdminPass ? "text" : "password"} required className="w-full bg-slate-50 border-2 border-slate-100 p-4 md:p-5 rounded-2xl md:rounded-3xl font-bold focus:border-amber-500 outline-none transition-all" />
                  </div>
                </div>
                <button type="submit" className="w-full bg-slate-900 text-white py-4 md:py-5 rounded-2xl md:rounded-[2rem] font-black text-sm md:text-base shadow-2xl hover:bg-amber-500 hover:text-slate-900 transition-all transform active:scale-95">
                  حفظ كلمة مرور المشرف 💾
                </button>
              </form>
            </div>

            {/* تغيير كلمة مرور المدير العام */}
            {user.role === 'manager' && (
              <div className="bg-white p-8 md:p-12 rounded-3xl md:rounded-[4rem] border border-slate-100 shadow-sm">
                <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-8 text-center">👑 كلمة مرور المدير العام</h3>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const newPass = formData.get('managerPass') as string;
                  const confirmPass = formData.get('confirmManagerPass') as string;
                  
                  if (newPass !== confirmPass) return alert('كلمات المرور غير متطابقة');
                  if (newPass.length < 6) return alert('كلمة مرور قصيرة جداً');

                  if (!window.confirm('هل أنت متأكد من تغيير كلمة مرور المدير؟')) return;

                  try {
                    await setDoc(doc(db, 'settings', 'admin'), {
                      managerPassword: newPass
                    }, { merge: true });
                    alert('تم تحديث كلمة مرور المدير بنجاح ✅');
                    (e.target as HTMLFormElement).reset();
                  } catch (err) { alert('فشل تحديث كلمة المرور'); }
                }} className="space-y-6">
                  <div>
                    <label className="block text-slate-400 font-black text-xs md:text-sm mb-2 uppercase tracking-widest">كلمة المرور الجديدة</label>
                    <div className="relative">
                      <input name="managerPass" type={showManagerPass ? "text" : "password"} required className="w-full bg-slate-50 border-2 border-slate-100 p-4 md:p-5 rounded-2xl md:rounded-3xl font-bold focus:border-amber-500 outline-none transition-all" />
                      <button type="button" onClick={() => setShowManagerPass(!showManagerPass)} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showManagerPass ? '👁️' : '👁️‍🗨️'}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-400 font-black text-xs md:text-sm mb-2 uppercase tracking-widest">تأكيد كلمة المرور</label>
                    <div className="relative">
                      <input name="confirmManagerPass" type={showManagerPass ? "text" : "password"} required className="w-full bg-slate-50 border-2 border-slate-100 p-4 md:p-5 rounded-2xl md:rounded-3xl font-bold focus:border-amber-500 outline-none transition-all" />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-slate-900 text-white py-4 md:py-5 rounded-2xl md:rounded-[2rem] font-black text-sm md:text-base shadow-2xl hover:bg-amber-500 hover:text-slate-900 transition-all transform active:scale-95">
                    حفظ كلمة مرور المدير 💾
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* سجل الدخول */}
        {activeTab === 'login-logs' && (
          <div className="bg-white rounded-3xl md:rounded-[4rem] shadow-sm overflow-hidden border border-slate-100 animate-fadeIn mt-8 md:mt-12">
            <div className="p-8 md:p-12 border-b border-slate-50 flex justify-between items-center">
              <h3 className="text-xl md:text-2xl font-black text-slate-900">🔐 سجل دخول مشرفين النظام</h3>
              <button 
                onClick={async () => {
                  if (!window.confirm('هل تريد مسح السجل بالكامل؟')) return;
                  try {
                    const snapshot = await getDocs(collection(db, 'adminLoginLogs'));
                    await Promise.all(snapshot.docs.map(d => deleteDoc(d.ref)));
                    alert('تم مسح السجل بنجاح');
                  } catch (err) { alert('فشل مسح السجل'); }
                }}
                className="text-red-500 font-black text-xs md:text-sm hover:underline"
              >
                مسح السجل 🗑️
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right min-w-[600px]">
                <thead className="bg-slate-50 text-slate-400 uppercase text-[8px] md:text-[10px] font-black tracking-widest">
                  <tr>
                    <th className="p-6 md:p-8">المشرف</th>
                    <th className="p-6 md:p-8">الدور</th>
                    <th className="p-6 md:p-8">التاريخ والوقت</th>
                    <th className="p-6 md:p-8">عنوان IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  <LoginLogsList db={db} />
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const LoginLogsList: React.FC<{ db: any }> = ({ db }) => {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'adminLoginLogs'), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot: any) => {
      setLogs(snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() })));
    });
  }, [db]);

  return (
    <>
      {logs.map(log => (
        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
          <td className="p-6 md:p-8 font-black text-slate-900">{log.adminName}</td>
          <td className="p-6 md:p-8">
            <span className={`px-3 py-1 rounded-full text-[10px] font-black ${log.role === 'manager' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
              {log.role === 'manager' ? 'مدير عام' : 'مشرف نظام'}
            </span>
          </td>
          <td className="p-6 md:p-8 text-slate-500 font-bold text-xs">
            {new Date(log.timestamp).toLocaleString('ar-EG')}
          </td>
          <td className="p-6 md:p-8 text-slate-400 font-mono text-[10px]">{log.ip || '---'}</td>
        </tr>
      ))}
      {logs.length === 0 && (
        <tr>
          <td colSpan={4} className="p-20 text-center text-slate-300 italic">لا توجد سجلات دخول حالياً</td>
        </tr>
      )}
    </>
  );
};

export default AdminDashboard;
