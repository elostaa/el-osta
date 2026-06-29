
import React from 'react';

interface HomeProps {
  onStartService: () => void;
  onJoinAsTech: () => void;
  onLoginNav: () => void;
  onRegisterNav: () => void;
}

const Home: React.FC<HomeProps> = ({ onStartService, onJoinAsTech, onLoginNav, onRegisterNav }) => {
  return (
    <div className="min-h-screen flex flex-col font-sans bg-white overflow-hidden">
      {/* Navbar */}
      <nav className="fixed w-full z-50 glass px-4 py-3 md:px-8 md:py-5 flex justify-between items-center transition-all duration-300">
        <div className="flex items-center gap-4 md:gap-12">
          <div className="text-xl md:text-3xl font-black flex items-center gap-2 tracking-tighter">
            <span className="text-slate-900 hidden sm:inline">EL OSTAA</span>
            <span className="bg-amber-500 text-white px-2 py-1 md:px-3 md:py-1 rounded-xl md:rounded-2xl transform -rotate-3">الأسطى</span>
          </div>
          <div className="hidden md:flex gap-8 text-sm font-black text-slate-500 uppercase tracking-widest">
            <a href="#" className="hover:text-amber-500 transition">الرئيسية</a>
            <button onClick={onStartService} className="hover:text-amber-500 transition">الخدمات</button>
            <button onClick={onJoinAsTech} className="hover:text-amber-500 transition">انضم للفريق</button>
            <button onClick={() => window.open('https://wa.me/201550134227', '_blank')} className="hover:text-amber-500 transition">خدمة العملاء</button>
          </div>
        </div>
        <div className="flex items-center gap-3 md:gap-6">
          <button onClick={onLoginNav} className="text-slate-900 font-black text-xs md:text-sm hover:text-amber-500 transition">دخول</button>
          <button onClick={onRegisterNav} className="bg-slate-900 text-white px-4 py-2 md:px-8 md:py-3 rounded-xl md:rounded-2xl font-black text-xs md:text-sm shadow-2xl shadow-slate-900/20 hover:bg-slate-800 transition transform hover:scale-105 active:scale-95">ابدأ الآن</button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=2069&auto=format&fit=crop" 
            className="w-full h-full object-cover scale-105 transition-transform duration-[10s] ease-linear" 
            style={{ animation: 'zoomInOut 20s infinite alternate' }}
            alt="Craftsman"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-transparent"></div>
        </div>

        <div className="relative z-10 container mx-auto px-6 text-center text-white mt-20 md:mt-12">
          <div className="inline-block bg-amber-500/20 border border-amber-500/30 backdrop-blur-md px-4 py-1.5 md:px-6 md:py-2 rounded-full mb-6 md:mb-8 animate-fadeIn">
             <span className="text-amber-400 font-black text-[10px] md:text-xs uppercase tracking-widest">المنصة الأولى للصيانة في مصر</span>
          </div>
          <h1 className="text-4xl sm:text-6xl md:text-[8rem] font-black mb-6 md:mb-8 leading-[1] md:leading-[0.9] drop-shadow-2xl animate-fadeIn" style={{ animationDelay: '0.1s' }}>
            الأسطى.. <br /> احترافية <br /> في بيتك
          </h1>
          <p className="text-lg md:text-2xl font-bold mb-8 md:mb-12 text-white/70 max-w-3xl mx-auto leading-relaxed animate-fadeIn" style={{ animationDelay: '0.2s' }}>
            نوفر لك أسطولاً من الفنيين المعتمدين والموثقين لتلبية كافة احتياجات منزلك بدقة متناهية وسرعة فائقة.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center items-center animate-fadeIn" style={{ animationDelay: '0.3s' }}>
            <button 
              onClick={onStartService}
              className="group bg-amber-500 hover:bg-amber-600 text-slate-900 text-xl md:text-2xl font-black px-10 py-4 md:px-16 md:py-6 rounded-2xl md:rounded-[2rem] shadow-2xl shadow-amber-500/40 transition-all transform hover:scale-110 active:scale-95 flex items-center gap-4"
            >
              اطلب أسطى الآن ⚡
            </button>
            <button 
              onClick={onJoinAsTech}
              className="text-white text-lg md:text-xl font-black border-b-4 border-amber-500 pb-2 hover:text-amber-500 transition-colors"
            >
              انضم كفني محترف
            </button>
          </div>
        </div>
      </section>

      {/* Floating Elements Design */}
      <style>{`
        @keyframes zoomInOut {
          from { transform: scale(1); }
          to { transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
};

export default Home;
