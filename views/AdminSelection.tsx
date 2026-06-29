
import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';

interface AdminSelectionProps {
  onSelect: (role: 'admin' | 'manager') => void;
  onBack: () => void;
}

const AdminSelection: React.FC<AdminSelectionProps> = ({ onSelect, onBack }) => {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      {/* Dynamic Backgrounds */}
      <div className="absolute top-0 right-0 w-[60rem] h-[60rem] bg-amber-500/10 rounded-full blur-[140px] -mr-80 -mt-80"></div>
      <div className="absolute bottom-0 left-0 w-[60rem] h-[60rem] bg-blue-500/5 rounded-full blur-[140px] -ml-80 -mb-80"></div>

      <div className="w-full max-w-5xl mb-6 z-20 flex justify-end">
        <button 
          onClick={onBack} 
          className="flex items-center gap-2 bg-white/5 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-white/60 font-bold text-xs md:text-sm hover:bg-white hover:text-slate-900 transition-all group"
        >
          <span>العودة للرئيسية</span>
          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      <div className="mb-10 md:mb-16 text-center relative z-10">
         <div className="inline-block bg-white/5 border border-white/10 px-4 md:px-6 py-1.5 md:py-2 rounded-xl md:rounded-2xl mb-4 md:mb-6 backdrop-blur-md">
            <span className="text-amber-500 font-black tracking-[0.3em] text-[8px] md:text-[10px] uppercase">Security Management</span>
         </div>
         <h1 className="text-3xl md:text-6xl font-black text-white tracking-tighter mb-2">بوابة الإدارة المركزية</h1>
         <p className="text-white/40 font-bold text-base md:text-xl">يرجى تحديد مستوى الصلاحية المطلوب للولوج</p>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 relative z-10 px-4">
        {/* Manager Card */}
        <button 
          onClick={() => onSelect('manager')}
          className="group bg-white/5 backdrop-blur-xl border border-white/10 p-8 md:p-16 rounded-3xl md:rounded-[4rem] transition-all duration-500 hover:bg-amber-500 hover:border-amber-600 hover:scale-105 hover:shadow-[0_0_80px_rgba(245,158,11,0.2)] text-right"
        >
          <div className="w-16 h-16 md:w-24 md:h-24 bg-amber-500/10 text-amber-500 rounded-2xl md:rounded-[2rem] flex items-center justify-center mb-6 md:mb-10 group-hover:bg-slate-900 group-hover:text-amber-500 transition-colors shadow-2xl">
            <span className="text-3xl md:text-5xl">👑</span>
          </div>
          <h3 className="text-2xl md:text-4xl font-black text-white group-hover:text-slate-900 mb-2 md:mb-3 tracking-tight transition-colors">المدير العام</h3>
          <p className="text-white/30 group-hover:text-slate-900/40 font-black text-[10px] uppercase tracking-[0.2em] mb-4 md:mb-6 transition-colors">LEVEL: SYSTEM OWNER</p>
          <p className="text-white/60 group-hover:text-slate-900/80 font-bold text-base md:text-lg leading-relaxed transition-colors">صلاحيات مطلقة لإدارة النظام بالكامل، تعديل كلمات المرور، ومراقبة كافة العمليات المالية.</p>
        </button>

        {/* Admin Card */}
        <button 
          onClick={() => onSelect('admin')}
          className="group bg-white/5 backdrop-blur-xl border border-white/10 p-8 md:p-16 rounded-3xl md:rounded-[4rem] transition-all duration-500 hover:bg-blue-600 hover:border-blue-700 hover:scale-105 hover:shadow-[0_0_80px_rgba(37,99,235,0.2)] text-right"
        >
          <div className="w-16 h-16 md:w-24 md:h-24 bg-blue-500/10 text-blue-500 rounded-2xl md:rounded-[2rem] flex items-center justify-center mb-6 md:mb-10 group-hover:bg-white group-hover:text-blue-600 transition-colors shadow-2xl">
            <span className="text-3xl md:text-5xl">🛡️</span>
          </div>
          <h3 className="text-2xl md:text-4xl font-black text-white mb-2 md:mb-3 tracking-tight transition-colors">مشرف النظام</h3>
          <p className="text-white/30 group-hover:text-white/40 font-black text-[10px] uppercase tracking-[0.2em] mb-4 md:mb-6 transition-colors">LEVEL: OPERATIONAL ADMIN</p>
          <p className="text-white/60 group-hover:text-white/90 font-bold text-base md:text-lg leading-relaxed transition-colors">صلاحيات تشغيلية لمتابعة حالة الطلبات، اعتماد الفنيين الجدد، وحل مشكلات العملاء اليومية.</p>
        </button>
      </div>

      <div className="mt-12 md:mt-20 flex flex-col items-center gap-4 md:gap-6 relative z-10">
        <button onClick={onBack} className="text-white/40 font-black hover:text-amber-500 transition border-b border-transparent hover:border-amber-500 pb-1">العودة للرئيسية</button>
        <div className="text-[9px] font-black text-white/10 uppercase tracking-[0.4em]">EL OSTAA ENTERPRISE HQ • EST 2025</div>
      </div>
    </div>
  );
};

export default AdminSelection;
