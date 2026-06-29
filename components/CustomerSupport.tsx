
import React, { useState } from 'react';
import { Headset, MessageCircle, Phone, X } from 'lucide-react';

const CustomerSupport: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const supportOptions = [
    {
      name: 'واتساب',
      icon: <MessageCircle className="w-6 h-6 text-green-500" />,
      action: () => window.open('https://wa.me/201550134227', '_blank'),
      color: 'hover:bg-green-50'
    },
    {
      name: 'اتصال هاتفي',
      icon: <Phone className="w-6 h-6 text-blue-500" />,
      action: () => window.open('tel:+201550134227', '_blank'),
      color: 'hover:bg-blue-50'
    }
  ];

  return (
    <div className="fixed bottom-6 left-6 z-[9999] flex flex-col items-end gap-4">
      {/* Support Menu */}
      {isOpen && (
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-4 min-w-[200px] animate-fadeIn mb-2">
          <div className="flex justify-between items-center mb-4 px-2">
            <h3 className="font-black text-slate-900 text-sm">خدمة العملاء</h3>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2">
            {supportOptions.map((opt, idx) => (
              <button
                key={idx}
                onClick={opt.action}
                className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all ${opt.color} group`}
              >
                <div className="bg-white shadow-sm p-2 rounded-xl group-hover:scale-110 transition-transform">
                  {opt.icon}
                </div>
                <span className="font-bold text-slate-700 text-sm">{opt.name}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-50 text-center">
            <p className="text-[10px] text-slate-400 font-bold">نحن هنا لمساعدتك 24/7</p>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all transform hover:scale-110 active:scale-95 ${
          isOpen ? 'bg-slate-900 text-white' : 'bg-amber-500 text-slate-900'
        }`}
      >
        {isOpen ? <X className="w-8 h-8" /> : <Headset className="w-8 h-8" />}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
          </span>
        )}
      </button>
    </div>
  );
};

export default CustomerSupport;
