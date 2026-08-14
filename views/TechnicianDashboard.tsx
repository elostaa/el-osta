
import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db, rtdb } from '../firebase';
import { ref, onValue, update } from 'firebase/database';
import { User, Order } from '../types';
import { incrementCompletedOrders } from '../loyaltyHelper';

interface TechnicianDashboardProps {
  user: User;
  onLogout: () => void;
}

const TechnicianDashboard: React.FC<TechnicianDashboardProps> = ({ user, onLogout }) => {
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [errorOrderId, setErrorOrderId] = useState<string | null>(null);
  const [errorNotes, setErrorNotes] = useState('');
  const [currentUserData, setCurrentUserData] = useState<User>(user);

  useEffect(() => {
    const unsubUser = onSnapshot(doc(db, 'users', user.id), (docSnap) => {
      if (docSnap.exists()) {
        setCurrentUserData({ id: docSnap.id, ...docSnap.data() } as User);
      }
    }, (err) => {
      console.warn("Technician user listener:", err);
    });

    if (currentUserData.isApproved) {
      // 1. Read orders from Realtime Database under /orders
      const ordersDbRef = ref(rtdb, 'orders');
      const unsubOrders = onValue(ordersDbRef, (snapshot) => {
        const available: Order[] = [];
        const my: Order[] = [];
        
        snapshot.forEach((childSnapshot) => {
          const val = childSnapshot.val();
          if (!val) return;
          
          const statusVal = val.status || 'Pending';
          const isPending = statusVal.toLowerCase() === 'pending';
          const matchSpecialty = val.serviceType === user.specialty;
          
          const orderObj: Order = {
            id: childSnapshot.key || '',
            customerId: val.customerId || '',
            customerName: val.customerName || val.customerPhone || 'عميل',
            customerPhone: val.customerPhone || val.phone || '',
            address: val.address || '',
            detailedLocation: val.detailedLocation || '',
            serviceType: val.serviceType || '',
            description: val.problemDescription || val.description || '',
            preferredTiming: val.preferredTiming || '',
            specificTime: val.specificTime || 'فوري',
            status: statusVal,
            createdAt: val.createdAt || Date.now(),
            imageUrl: val.imageUrl || '',
            paymentConfirmed: val.paymentConfirmed !== undefined ? val.paymentConfirmed : true,
            isEmergency: val.isEmergency || false,
            isDirect: val.isDirect || false,
            technicianId: val.technicianId || null,
            technicianName: val.technicianName || null,
            technicianPhone: val.technicianPhone || null,
            technicianSpecialty: val.technicianSpecialty || null,
            orderNumber: val.orderNumber || undefined
          };

          if (isPending && matchSpecialty) {
            available.push(orderObj);
          } else if (val.technicianId === user.id) {
            my.push(orderObj);
          }
        });
        
        setAvailableOrders(available.sort((a, b) => b.createdAt - a.createdAt));
        setMyOrders(my.sort((a, b) => b.createdAt - a.createdAt));
      }, (err) => {
        console.warn("RTDB orders listener:", err);
      });

      return () => { unsubUser(); unsubOrders(); };
    }

    return () => unsubUser();
  }, [user.id, user.specialty, currentUserData.isApproved]);

  const acceptOrder = async (orderId: string) => {
    try {
      // Update Realtime Database
      try {
        await update(ref(rtdb, `orders/${orderId}`), {
          status: 'assigned',
          technicianId: user.id,
          technicianName: user.name,
          technicianSpecialty: user.specialty,
          technicianPhone: user.phone
        });
      } catch (err) {
        console.warn('RTDB update error:', err);
      }

      // Update Firestore
      try {
        await updateDoc(doc(db, 'orders', orderId), {
          status: 'assigned',
          technicianId: user.id,
          technicianName: user.name,
          technicianSpecialty: user.specialty,
          technicianPhone: user.phone
        });
      } catch (err) {
        console.warn('Firestore update error:', err);
      }

      alert('تم قبول المهمة!');
    } catch (err) { alert('خطأ في القبول'); }
  };

  const handleFinish = async (orderId: string, status: 'completed' | 'failed') => {
    if (status === 'failed') {
      setErrorOrderId(orderId);
      return;
    }
    try {
      try {
        await update(ref(rtdb, `orders/${orderId}`), { status });
      } catch (e) {}
      try {
        await updateDoc(doc(db, 'orders', orderId), { status });
      } catch (e) {}

      // Trigger loyalty increment
      const orderObj = myOrders.find(o => o.id === orderId);
      if (orderObj && orderObj.customerPhone) {
        await incrementCompletedOrders(orderObj.customerPhone, orderObj.customerName || '');
      }

      alert('تم التحديث بنجاح');
    } catch (err) { alert('خطأ في التحديث'); }
  };

  const submitError = async () => {
    if (!errorNotes.trim()) return alert('يرجى توضيح السبب');
    try {
      try {
        await update(ref(rtdb, `orders/${errorOrderId!}`), {
          status: 'failed',
          failureReason: errorNotes,
          adminResolved: false
        });
      } catch (e) {}
      try {
        await updateDoc(doc(db, 'orders', errorOrderId!), { 
          status: 'failed', 
          failureReason: errorNotes, 
          adminResolved: false 
        });
      } catch (e) {}
      setErrorOrderId(null);
      setErrorNotes('');
      alert('تم إبلاغ الإدارة');
    } catch (err) { alert('خطأ في الإرسال'); }
  };

  if (!currentUserData.isApproved) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/20 rounded-full blur-[100px] -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] -ml-48 -mb-48"></div>
        <div className="bg-white/10 backdrop-blur-2xl border border-white/10 max-w-xl w-full p-8 md:p-16 rounded-3xl md:rounded-[4rem] shadow-2xl animate-fadeIn relative z-10">
          <div className="w-20 h-20 md:w-28 md:h-28 bg-amber-500 text-slate-900 rounded-2xl md:rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 md:mb-10 shadow-2xl animate-pulse">
            <span className="text-4xl md:text-6xl">🛠️</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-black text-white mb-4 md:mb-6 tracking-tight leading-tight">حسابك قيد <br /> الاعتماد يا أسطى</h1>
          <p className="text-white/60 font-bold leading-relaxed mb-8 md:mb-12 text-base md:text-lg">
            أهلاً بك يا أسطى <span className="text-amber-500">{user.name}</span>. 
            يتم الآن مراجعة بياناتك من قبل الإدارة. ابقَ متصلاً، ففرص العمل قادمة قريباً.
          </p>
          <button onClick={onLogout} className="w-full py-4 md:py-5 rounded-2xl md:rounded-[2rem] bg-white/10 text-white font-black hover:bg-white hover:text-slate-900 transition-all border border-white/20">تسجيل خروج آمن</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      <nav className="bg-slate-900 text-white p-4 md:p-8 shadow-2xl sticky top-0 z-50 rounded-b-3xl md:rounded-b-[3.5rem] flex justify-between items-center px-6 md:px-12">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-amber-500 rounded-xl md:rounded-2xl flex items-center justify-center text-2xl md:text-3xl shadow-xl transform rotate-3">👷‍♂️</div>
          <div>
            <h1 className="text-lg md:text-2xl font-black tracking-tighter">الأسطى • {user.name}</h1>
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-black text-amber-500 tracking-widest uppercase">{user.specialty}</p>
              {currentUserData.averageRating && (
                <span className="text-[10px] font-black text-white bg-white/10 px-2 py-0.5 rounded-full">⭐ {currentUserData.averageRating}</span>
              )}
            </div>
          </div>
        </div>
        <button onClick={onLogout} className="bg-white/10 hover:bg-red-500 px-4 py-2 md:px-8 md:py-3 rounded-xl md:rounded-2xl font-black text-xs md:text-sm transition-all duration-300">خروج</button>
      </nav>

      <div className="container mx-auto px-4 mt-8 md:mt-16 grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16">
        {/* New Orders Column */}
        <div className="space-y-6 md:space-y-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl md:text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-3 md:gap-4">
              <span className="w-2 h-2 md:w-3 md:h-3 bg-red-500 rounded-full animate-ping"></span> متاح الآن
            </h2>
            <span className="text-[8px] md:text-[10px] bg-white border border-slate-100 px-3 py-1.5 md:px-4 md:py-2 rounded-full font-black text-slate-400 uppercase tracking-widest shadow-sm">تحديث لحظي 🟢</span>
          </div>
          
          <div className="grid grid-cols-1 gap-6 md:gap-8">
            {availableOrders.map(order => (
              <div key={order.id} className="bg-white p-6 md:p-10 rounded-3xl md:rounded-[3.5rem] shadow-sm border border-slate-100 transition-all hover:shadow-2xl hover:scale-[1.02] group relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 md:w-2 h-full bg-slate-900"></div>
                <div className="flex justify-between items-start mb-4 md:mb-6">
                  <div>
                    <h3 className="font-black text-xl md:text-2xl text-slate-900 flex items-center gap-2">
                      {order.customerName}
                      {order.orderNumber && <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">#{order.orderNumber}</span>}
                    </h3>
                    <p className="text-[10px] md:text-[11px] font-black text-slate-400 mt-1">📍 {order.detailedLocation}</p>
                  </div>
                  <div className="bg-slate-50 text-slate-500 px-3 py-1.5 md:px-6 md:py-2 rounded-xl md:rounded-2xl text-[8px] md:text-[10px] font-black">{order.specificTime}</div>
                </div>
                <div className="bg-slate-50 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100 mb-6 md:mb-8">
                  <p className="text-[10px] text-slate-400 font-black uppercase mb-1 md:mb-2">وصف العطل:</p>
                  <p className="text-sm font-bold text-slate-700 leading-relaxed">{order.description}</p>
                  {order.imageUrl && (
                    <div className="mt-4 border-t border-slate-200/60 pt-4">
                      <p className="text-[10px] text-slate-400 font-black uppercase mb-2">صورة العطل:</p>
                      <img src={order.imageUrl} alt="صورة العطل" className="w-full max-h-60 object-cover rounded-xl shadow-md border border-slate-200" referrerPolicy="no-referrer" />
                    </div>
                  )}
                </div>
                <button onClick={() => acceptOrder(order.id)} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 md:py-5 rounded-2xl md:rounded-[2rem] transition-all transform active:scale-95 shadow-xl shadow-slate-900/20 text-base md:text-lg">قبول المهمة 🚀</button>
              </div>
            ))}
            {availableOrders.length === 0 && (
              <div className="text-center py-20 md:py-40 opacity-20 italic font-black text-xl md:text-3xl grayscale">بانتظار طلبات جديدة...</div>
            )}
          </div>
        </div>

        {/* My Tasks Column */}
        <div className="space-y-6 md:space-y-10">
          <h2 className="text-xl md:text-3xl font-black text-slate-900 tracking-tighter">مهامي الجارية</h2>
          
          <div className="grid grid-cols-1 gap-6 md:gap-8">
            {myOrders.filter(o => o.status === 'assigned').map(order => (
              <div key={order.id} className={`bg-white p-6 md:p-10 rounded-3xl md:rounded-[4rem] shadow-xl border-2 md:border-4 ${order.isDirect ? 'border-amber-500' : 'border-slate-900'} relative overflow-hidden`}>
                {order.isDirect && (
                  <div className="absolute -top-1 -right-1 bg-amber-500 text-slate-900 text-[8px] md:text-[10px] font-black px-4 py-1.5 md:px-6 md:py-2 rounded-bl-2xl md:rounded-bl-3xl shadow-lg">طلب مباشر ⭐</div>
                )}
                <div className="flex flex-col md:flex-row justify-between items-start mb-4 md:mb-6 gap-3 md:gap-4">
                   <div>
                     <h3 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-2">
                       {order.customerName}
                       {order.orderNumber && <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">#{order.orderNumber}</span>}
                     </h3>
                     <p className="text-base md:text-lg font-bold text-amber-600">📞 {order.customerPhone}</p>
                   </div>
                   <div className="md:text-right">
                      <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 md:mb-1">الموعد</p>
                      <p className="text-xs md:text-sm font-black text-slate-900">{order.specificTime}</p>
                   </div>
                </div>
                
                <div className="bg-slate-50 p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] mb-6 md:mb-10 border border-slate-100">
                   <p className="text-[10px] font-black text-slate-300 uppercase mb-1 md:mb-2">الموقع المحدد</p>
                   <p className="text-sm md:text-base font-bold text-slate-700">{order.detailedLocation}</p>
                   <p className="text-[10px] md:text-xs text-slate-400 mt-3 md:mt-4 italic">"{order.description}"</p>
                   {order.imageUrl && (
                     <div className="mt-4 border-t border-slate-200/60 pt-4">
                       <p className="text-[10px] text-slate-400 font-black uppercase mb-2">صورة العطل المعاينة:</p>
                       <img src={order.imageUrl} alt="صورة العطل المعاينة" className="w-full max-h-60 object-cover rounded-xl shadow-md border border-slate-200" referrerPolicy="no-referrer" />
                     </div>
                   )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                  <button onClick={() => handleFinish(order.id, 'completed')} className="flex-[2] bg-emerald-500 hover:bg-emerald-600 text-white py-4 md:py-5 rounded-2xl md:rounded-[2rem] font-black shadow-xl shadow-emerald-500/30 transition-all transform active:scale-95 text-base md:text-lg">تم بنجاح ✅</button>
                  <button onClick={() => handleFinish(order.id, 'failed')} className="flex-1 bg-red-50 text-red-500 py-4 md:py-5 rounded-2xl md:rounded-[2rem] font-black hover:bg-red-500 hover:text-white transition-all border border-red-100 text-base md:text-lg">تعثرت ❌</button>
                </div>

                {errorOrderId === order.id && (
                  <div className="mt-6 md:mt-8 p-6 md:p-8 bg-red-50 rounded-2xl md:rounded-[3rem] border border-red-200 animate-fadeIn">
                     <p className="text-[10px] font-black text-red-600 mb-3 md:mb-4 uppercase tracking-widest">أبلغ الإدارة بالسبب:</p>
                     <textarea value={errorNotes} onChange={e => setErrorNotes(e.target.value)} className="w-full p-4 md:p-6 rounded-2xl md:rounded-3xl border-none outline-none font-bold text-sm mb-4 md:mb-6 shadow-sm focus:ring-4 focus:ring-red-200 transition-all" placeholder="العميل لا يرد، قطع غيار غير متوفرة..." />
                     <button onClick={submitError} className="w-full bg-red-600 text-white py-3 md:py-4 rounded-xl md:rounded-2xl font-black shadow-lg text-sm md:text-base">إرسال البلاغ</button>
                  </div>
                )}
              </div>
            ))}
            {myOrders.filter(o => o.status === 'assigned').length === 0 && (
              <div className="text-center py-20 md:py-40 bg-white rounded-3xl md:rounded-[4rem] border-2 border-dashed border-slate-200">
                 <p className="text-slate-300 font-black italic text-lg md:text-xl">لا توجد مهام نشطة حالياً</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TechnicianDashboard;
