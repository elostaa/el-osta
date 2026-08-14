
import React, { useState } from 'react';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { UserRole } from '../types';
import { ArrowRight } from 'lucide-react';

interface RegisterProps {
  onSwitch: () => void;
}

const Register: React.FC<RegisterProps> = ({ onSwitch }) => {
  const [role, setRole] = useState<UserRole>('technician');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    address: '',
    securityQuestion: 'ما هو اسم مدرستك الابتدائية؟',
    securityAnswer: '',
    specialty: 'نجار',
    experience: 1,
    area: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const specialties = [
    'سباك',
    'كهربائي',
    'نجار',
    'فني دش',
    'نقاش',
    'فني تكييف',
    'صيانة اجهزة منزلية',
    'فني الوميتال'
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const q = query(collection(db, 'users'), where('phone', '==', formData.phone));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setError('هذا الهاتف مسجل مسبقاً في نظامنا');
        setIsSubmitting(false);
        return;
      }

      await addDoc(collection(db, 'users'), {
        ...formData,
        role: 'technician',
        isApproved: false,
        createdAt: Date.now()
      });
      setSuccess('تهانينا! تم إنشاء حسابك بنجاح. بانتظار موافقة الإدارة تفعيل الحساب.');
      setTimeout(onSwitch, 2500);
    } catch (err) {
      setError('حدث خطأ فني أثناء التسجيل');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-10 md:py-20 bg-slate-50 flex flex-col items-center justify-center px-4 md:px-6 font-sans relative overflow-hidden">
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px]"></div>
      
      <div className="w-full max-w-4xl mb-6 z-20 flex justify-end">
        <button 
          onClick={onSwitch} 
          className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100 text-slate-600 font-bold text-xs md:text-sm hover:bg-slate-900 hover:text-white transition-all group"
        >
          <span>العودة للدخول</span>
          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      <div className="bg-white w-full max-w-4xl p-6 md:p-16 rounded-3xl md:rounded-[4rem] shadow-2xl border border-white relative z-10 animate-fadeIn">
        <header className="text-center mb-8 md:mb-12">
          <div className="inline-block bg-amber-500 text-slate-900 px-6 py-2 rounded-2xl font-black text-xs uppercase tracking-widest mb-4 transform -rotate-2">انضم لأسطولنا</div>
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter">إنشاء حساب فني جديد</h2>
          <p className="text-slate-400 font-bold mt-2 text-sm md:text-base">سجل كفني محترف وابدأ العمل مع الأسطى</p>
        </header>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-300 uppercase tracking-widest mr-4">الاسم بالكامل</label>
            <input name="name" required onChange={handleInputChange} className="w-full bg-slate-50 px-6 py-4 rounded-2xl border-none focus:ring-4 focus:ring-amber-500/10 outline-none font-bold" placeholder="محمد علي..." />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-300 uppercase tracking-widest mr-4">رقم الهاتف</label>
            <input name="phone" required onChange={handleInputChange} className="w-full bg-slate-50 px-6 py-4 rounded-2xl border-none focus:ring-4 focus:ring-amber-500/10 outline-none font-bold" placeholder="01xxxxxxxxx" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-300 uppercase tracking-widest mr-4">كلمة المرور</label>
            <div className="relative">
              <input 
                name="password" 
                type={showPassword ? "text" : "password"} 
                required 
                onChange={handleInputChange} 
                className="w-full bg-slate-50 px-6 py-4 rounded-2xl border-none focus:ring-4 focus:ring-amber-500/10 outline-none font-bold" 
                placeholder="••••••••"
              />
              <div className="absolute inset-y-0 left-4 flex items-center">
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-300 uppercase tracking-widest mr-4">العنوان الرئيسي</label>
            <input name="address" required onChange={handleInputChange} className="w-full bg-slate-50 px-6 py-4 rounded-2xl border-none focus:ring-4 focus:ring-amber-500/10 outline-none font-bold" placeholder="المحافظة، الحي..." />
          </div>

          <div className="md:col-span-2 bg-slate-900 p-6 md:p-10 rounded-3xl md:rounded-[3rem] text-white space-y-6 md:space-y-8 mt-4">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">🔐 أمان الحساب (لاستعادة كلمة المرور)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-4">سؤال الأمان</label>
                <select name="securityQuestion" onChange={handleInputChange} className="w-full bg-white/5 border border-white/10 px-6 py-4 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none font-bold text-white">
                  <option className="text-slate-900">ما هو اسم مدرستك الابتدائية؟</option>
                  <option className="text-slate-900">ما هو اسم حيوانك الأليف؟</option>
                  <option className="text-slate-900">ما هي مدينتك المفضلة؟</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-4">الإجابة</label>
                <input name="securityAnswer" required onChange={handleInputChange} className="w-full bg-white/5 border border-white/10 px-6 py-4 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none font-bold text-white" placeholder="إجابتك السرية..." />
              </div>
            </div>
          </div>

          {role === 'technician' && (
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-300 uppercase tracking-widest mr-4">التخصص</label>
                <select name="specialty" value={formData.specialty} onChange={handleInputChange} className="w-full bg-slate-50 px-6 py-4 rounded-2xl border-none outline-none font-bold">
                  {specialties.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-300 uppercase tracking-widest mr-4">سنوات الخبرة</label>
                <input name="experience" type="number" required onChange={handleInputChange} className="w-full bg-slate-50 px-6 py-4 rounded-2xl border-none outline-none font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-300 uppercase tracking-widest mr-4">منطقة العمل</label>
                <input name="area" required onChange={handleInputChange} className="w-full bg-slate-50 px-6 py-4 rounded-2xl border-none outline-none font-bold" placeholder="مثلاً: المعادي، أكتوبر..." />
              </div>
            </div>
          )}

          {error && <div className="md:col-span-2 bg-red-50 text-red-500 p-5 rounded-2xl font-bold text-center border border-red-100">{error}</div>}
          {success && <div className="md:col-span-2 bg-emerald-50 text-emerald-600 p-5 rounded-2xl font-bold text-center border border-emerald-100">{success}</div>}

          <div className="md:col-span-2 pt-8 space-y-4 md:space-y-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-black py-4 md:py-6 rounded-2xl md:rounded-[2.5rem] shadow-2xl shadow-amber-500/30 transition-all transform active:scale-95 text-lg md:text-xl"
            >
              {isSubmitting ? 'جاري التحقق...' : 'تأكيد إنشاء الحساب 🚀'}
            </button>
            <button onClick={onSwitch} type="button" className="w-full text-slate-400 font-bold hover:text-slate-900 transition text-sm">لديك حساب بالفعل؟ سجل دخولك الآن</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
