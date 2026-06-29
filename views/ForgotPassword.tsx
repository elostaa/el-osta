
import React, { useState } from 'react';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ArrowRight } from 'lucide-react';

interface ForgotPasswordProps {
  onSwitch: () => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onSwitch }) => {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [user, setUser] = useState<any>(null);
  const [answer, setAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const findUser = async () => {
    setError('');
    const q = query(collection(db, 'users'), where('phone', '==', phone));
    const snap = await getDocs(q);
    if (snap.empty) {
      setError('عذراً، هذا الهاتف غير مسجل لدينا');
    } else {
      setUser({ id: snap.docs[0].id, ...snap.docs[0].data() });
      setStep(2);
    }
  };

  const verifyAnswer = () => {
    if (answer === user.securityAnswer) {
      setStep(3);
    } else {
      setError('الإجابة غير صحيحة، يرجى المحاولة مرة أخرى');
    }
  };

  const resetPassword = async () => {
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { password: newPassword });
      setSuccess('تم تغيير كلمة المرور بنجاح! يمكنك الدخول الآن.');
      setTimeout(onSwitch, 2000);
    } catch (err) {
      setError('فشل في تحديث كلمة المرور');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 font-sans relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60rem] h-[60rem] bg-amber-500/5 rounded-full blur-[120px]"></div>
      
      <div className="w-full max-w-lg mb-6 z-20 flex justify-end">
        <button 
          onClick={onSwitch} 
          className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100 text-slate-600 font-bold text-xs md:text-sm hover:bg-slate-900 hover:text-white transition-all group"
        >
          <span>العودة للدخول</span>
          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      <div className="bg-white max-w-lg w-full p-8 md:p-16 rounded-3xl md:rounded-[4rem] shadow-2xl border border-white z-10 text-center animate-fadeIn">
        <div className="w-16 h-16 md:w-20 md:h-20 bg-amber-100 text-amber-600 rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto mb-6 md:mb-8 text-2xl md:text-3xl">🔑</div>
        <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter mb-4">استعادة الوصول</h2>
        
        <div className="flex justify-center gap-2 mb-8 md:mb-10">
          {[1,2,3].map(s => (
            <div key={s} className={`h-1.5 rounded-full transition-all duration-500 ${step >= s ? 'w-8 bg-amber-500' : 'w-4 bg-slate-100'}`}></div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <p className="text-slate-400 font-bold mb-6 md:mb-8 text-sm md:text-base">أدخل رقم هاتفك لنقوم بالبحث عن حسابك في قاعدة بيانات الأسطى</p>
            <input 
              value={phone} 
              onChange={e => setPhone(e.target.value)} 
              className="w-full bg-slate-50 p-4 md:p-6 rounded-2xl md:rounded-[2rem] border-2 border-transparent focus:border-amber-500 outline-none font-bold text-center text-lg md:text-xl" 
              placeholder="01xxxxxxxxx" 
            />
            <button onClick={findUser} className="w-full bg-slate-900 text-white font-black py-4 md:py-5 rounded-2xl md:rounded-[2rem] shadow-xl hover:bg-slate-800 transition transform active:scale-95 text-sm md:text-base">ابحث عن حسابي 🔍</button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-slate-900 p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] text-white mb-6 md:mb-8">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">سؤال الأمان الخاص بك</p>
              <p className="text-lg md:text-xl font-black">{user.securityQuestion}</p>
            </div>
            <input 
              value={answer} 
              onChange={e => setAnswer(e.target.value)} 
              className="w-full bg-slate-50 p-4 md:p-6 rounded-2xl md:rounded-[2rem] border-2 border-transparent focus:border-amber-500 outline-none font-bold text-center text-sm md:text-base" 
              placeholder="اكتب الإجابة هنا..." 
            />
            <button onClick={verifyAnswer} className="w-full bg-amber-500 text-slate-900 font-black py-4 md:py-5 rounded-2xl md:rounded-[2rem] shadow-xl hover:bg-amber-600 transition transform active:scale-95 text-sm md:text-base">تحقق من الإجابة ✅</button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <p className="text-slate-400 font-bold mb-6 md:mb-8 text-sm md:text-base">رائع! تم التحقق بنجاح. أدخل كلمة المرور الجديدة الآن</p>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} 
                className="w-full bg-slate-50 p-4 md:p-6 rounded-2xl md:rounded-[2rem] border-2 border-transparent focus:border-amber-500 outline-none font-bold text-center text-sm md:text-base" 
                placeholder="كلمة المرور الجديدة" 
              />
              <div className="absolute inset-y-0 left-4 md:left-6 flex items-center">
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-slate-300 hover:text-slate-600 transition"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <button onClick={resetPassword} className="w-full bg-emerald-500 text-white font-black py-4 md:py-5 rounded-2xl md:rounded-[2rem] shadow-xl hover:bg-emerald-600 transition transform active:scale-95 text-base md:text-lg">حفظ كلمة المرور الجديدة 💾</button>
          </div>
        )}

        {error && <p className="mt-8 text-red-500 font-bold bg-red-50 p-4 rounded-2xl animate-fadeIn">⚠️ {error}</p>}
        {success && <p className="mt-8 text-emerald-600 font-bold bg-emerald-50 p-4 rounded-2xl animate-fadeIn">🎉 {success}</p>}
        
        <button onClick={onSwitch} className="w-full mt-10 text-slate-300 font-bold hover:text-slate-900 transition border-t border-slate-50 pt-8">العودة لشاشة الدخول</button>
      </div>
    </div>
  );
};

export default ForgotPassword;
