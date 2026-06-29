
import React, { useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from '../types';
import { ArrowRight } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
  onSwitchRegister: () => void;
  onSwitchForgot: () => void;
  onBackHome: () => void;
  onAdminPortal: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onSwitchRegister, onSwitchForgot, onBackHome, onAdminPortal }) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const q = query(collection(db, 'users'), where('phone', '==', phone));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('عفواً، هذا الرقم غير مسجل لدينا');
      } else {
        const userData = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as User;
        if (userData.password === password) {
          onLogin(userData);
        } else {
          setError('كلمة المرور التي أدخلتها غير صحيحة');
        }
      }
    } catch (err) {
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-[50rem] h-[50rem] bg-amber-500/10 rounded-full blur-[120px] -mr-64 -mt-64"></div>
      <div className="absolute bottom-0 left-0 w-[50rem] h-[50rem] bg-slate-900/5 rounded-full blur-[120px] -ml-64 -mb-64"></div>

      <nav className="w-full z-50 px-6 py-4 md:px-12 md:py-8 flex justify-between items-center">
        <div onClick={onBackHome} className="text-xl md:text-3xl font-black flex items-center gap-2 md:gap-3 cursor-pointer group">
          <span className="text-slate-900 group-hover:text-amber-500 transition-colors hidden sm:inline">EL OSTAA</span>
          <span className="bg-amber-500 text-slate-900 px-3 py-1 md:px-4 md:py-1 rounded-xl md:rounded-2xl transform -rotate-2 group-hover:rotate-0 transition-transform">الأسطى</span>
        </div>
        <button 
          onClick={onBackHome} 
          className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100 text-slate-600 font-bold text-xs md:text-sm hover:bg-slate-900 hover:text-white transition-all group"
        >
          <span>العودة للرئيسية</span>
          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </nav>

      <div className="flex-1 flex items-center justify-center p-4 md:p-6 z-10">
        <div className="bg-white w-full max-w-2xl rounded-3xl md:rounded-[4rem] shadow-2xl overflow-hidden border border-white">
          
          <div className="p-8 md:p-16 flex flex-col justify-center">
            <header className="mb-8 md:mb-12">
               <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter mb-4">مرحباً بعودتك!</h2>
               <p className="text-slate-400 font-bold text-base md:text-lg">سجل دخولك لطلب أفضل الفنيين في مصر.</p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-300 uppercase tracking-widest mr-4">رقم الهاتف</label>
                <input 
                  type="text" 
                  required 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  className="w-full bg-slate-50 px-8 py-5 rounded-[2rem] border-2 border-transparent focus:border-amber-500 focus:bg-white outline-none font-bold text-slate-700 transition-all" 
                  placeholder="01xxxxxxxxx" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-300 uppercase tracking-widest mr-4">كلمة المرور</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      className="w-full bg-slate-50 px-8 py-5 rounded-[2rem] border-2 border-transparent focus:border-amber-500 focus:bg-white outline-none font-bold text-slate-700 transition-all" 
                      placeholder="••••••••" 
                    />
                    <div className="absolute inset-y-0 left-6 flex items-center">
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-200 transition"
                      >
                        {showPassword ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-sm font-bold flex items-center gap-3 animate-fadeIn">
                  <span>⚠️</span> {error}
                </div>
              )}

              <div className="pt-4 flex flex-col gap-4">
                <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 md:py-6 rounded-2xl md:rounded-[2.5rem] shadow-2xl shadow-slate-900/20 transition-all transform active:scale-95 text-lg md:text-xl">
                  {isSubmitting ? 'جاري التحقق...' : 'دخول المنصة 🚀'}
                </button>
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-4">
                  <button onClick={onSwitchForgot} type="button" className="text-sm font-bold text-slate-400 hover:text-amber-600 transition">نسيت كلمة المرور؟</button>
                  <div className="flex flex-col items-center sm:items-end gap-1">
                    <button onClick={onSwitchRegister} type="button" className="text-sm font-black text-amber-600 border-b-2 border-amber-600 pb-1">إنشاء حساب جديد</button>
                    <button onClick={onAdminPortal} type="button" className="text-[10px] font-bold text-slate-300 hover:text-slate-500 transition uppercase tracking-tighter">دخول الإدارة</button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
