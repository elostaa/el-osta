
import React, { useState } from 'react';
import { User } from '../types';
import { ArrowRight } from 'lucide-react';

interface AdminLoginProps {
  role: 'admin' | 'manager';
  onLogin: (name: string, pass: string) => void;
  onBack: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ role, onLogin, onBack }) => {
  const [name, setName] = useState('');
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      {/* Background Glow */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50rem] h-[50rem] rounded-full blur-[120px] ${role === 'manager' ? 'bg-amber-500/10' : 'bg-blue-600/10'}`}></div>

      <div className="w-full max-w-xl mb-6 z-20 flex justify-end">
        <button 
          onClick={onBack} 
          className="flex items-center gap-2 bg-white/5 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-white/60 font-bold text-xs md:text-sm hover:bg-white hover:text-slate-900 transition-all group"
        >
          <span>تراجع</span>
          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      <div className="bg-white/5 backdrop-blur-3xl border border-white/10 w-full max-w-xl rounded-3xl md:rounded-[4rem] shadow-2xl p-8 md:p-16 text-center relative z-10">
        <div className={`w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-[2rem] flex items-center justify-center mx-auto mb-6 md:mb-10 shadow-2xl transform rotate-12 transition-transform hover:rotate-0 duration-500 ${role === 'manager' ? 'bg-amber-500 text-slate-900' : 'bg-blue-600 text-white'}`}>
          <span className="text-3xl md:text-5xl">{role === 'manager' ? '🔑' : '👤'}</span>
        </div>
        
        <h2 className="text-2xl md:text-4xl font-black text-white mb-2 md:mb-3 tracking-tighter">دخول {role === 'manager' ? 'المدير' : 'المشرف'}</h2>
        <p className="text-white/40 font-bold mb-8 md:mb-12 text-sm md:text-base">يرجى تأكيد هويتك للوصول لمركز التحكم</p>

        <form onSubmit={(e) => { e.preventDefault(); onLogin(name, pass); }} className="space-y-4 md:space-y-6">
          <div className="space-y-1.5 md:space-y-2 text-right">
            <label className="text-[8px] md:text-[10px] font-black text-white/20 uppercase tracking-widest mr-4 md:mr-6">معرف المشرف</label>
            <input 
              type="text" 
              placeholder="Admin ID" 
              required 
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 p-4 md:p-6 rounded-2xl md:rounded-[2rem] outline-none focus:ring-4 focus:ring-amber-500/20 text-center font-black text-white placeholder-white/20 transition-all text-sm md:text-base"
            />
          </div>
          <div className="space-y-1.5 md:space-y-2 text-right">
             <label className="text-[8px] md:text-[10px] font-black text-white/20 uppercase tracking-widest mr-4 md:mr-6">كلمة المرور المشفرة</label>
             <div className="relative">
                <input 
                  type={showPass ? "text" : "password"} 
                  placeholder="Master Password" 
                  required 
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 p-4 md:p-6 rounded-2xl md:rounded-[2rem] outline-none focus:ring-4 focus:ring-amber-500/20 text-center font-black text-white placeholder-white/20 transition-all text-sm md:text-base"
                />
                <div className="absolute inset-y-0 left-4 md:left-6 flex items-center">
                  <button 
                    type="button" 
                    onClick={() => setShowPass(!showPass)}
                    className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-white/20 hover:text-white transition"
                  >
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>
             </div>
          </div>
          <div className="pt-4 md:pt-6">
            <button type="submit" className={`w-full py-4 md:py-6 rounded-2xl md:rounded-[2.5rem] text-slate-900 font-black text-lg md:text-xl shadow-2xl transition-all transform active:scale-95 ${role === 'manager' ? 'bg-amber-500 hover:bg-amber-400' : 'bg-blue-500 hover:bg-blue-400'}`}>
              تحقق ولوج آمن 🔒
            </button>
          </div>
        </form>

        <button onClick={onBack} className="mt-8 md:mt-10 text-white/30 font-bold text-xs md:text-sm hover:text-white transition">تراجع وتغيير مستوى الصلاحية</button>
      </div>
    </div>
  );
};

export default AdminLogin;
