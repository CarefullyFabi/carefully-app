import React, { useState } from 'react';
import { ChatInterface } from './components/ChatInterface';
import { PaywallModal } from './components/PaywallModal';
import { useUser } from './hooks/useUser';

export default function App() {
  const [showImpressum, setShowImpressum] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const user = useUser();

  const handleUpgrade = () => {
    user.startCheckout();
  };

  const handleClosePaywall = () => {
    setShowPaywall(false);
    user.clearCheckoutError();
  };

  return (
    <div className="h-full bg-[#F8F9FA] text-slate-800 font-sans selection:bg-blue-100 selection:text-blue-900 overflow-hidden flex flex-col">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-1/2 h-1/2 rounded-full bg-[#E3F2FD] blur-[120px] opacity-60" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[#FFF3E0] blur-[140px] opacity-70" />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[40%] rounded-full bg-[#E0F2F1] blur-[100px] opacity-50" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto w-full flex flex-col h-full overflow-hidden app-container">
        <header className="flex flex-col items-center mb-2 md:mb-4 shrink-0 app-header sticky top-0 z-20 bg-[#F8F9FA]/90 backdrop-blur-sm">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-medium text-slate-800 tracking-tight italic font-serif leading-tight">
              <span className="text-5xl md:text-6xl">C</span>arefully
              {!user.loading && (
                <span className={`ml-2 text-xs md:text-sm font-sans not-italic tracking-normal align-middle px-2 py-0.5 rounded-full ${
                  user.isPremium
                    ? 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 border border-amber-200'
                    : 'bg-blue-50 text-blue-500 border border-blue-200'
                }`}>
                  {user.isPremium ? 'Premium' : 'free'}
                </span>
              )}
            </h1>
            {user.isPremium && (
              <button
                onClick={() => user.manageSubscription()}
                className="mt-1 text-[0.625rem] text-slate-400 hover:text-slate-600 transition-colors underline underline-offset-2 font-medium"
              >
                Abo kündigen
              </button>
            )}
            <p className="text-[0.625rem] md:text-xs text-blue-600 font-medium uppercase tracking-[0.15em] mt-2 leading-tight app-subtitle">Begleitung bei Ängsten, Depressionen, Psychosen</p>
          </div>
          <a href="tel:112" className="mt-2 bg-red-50 text-red-600 border border-red-100 px-3 py-1.5 rounded-full text-[0.625rem] font-bold uppercase tracking-wider hover:bg-red-100 transition-colors flex items-center gap-2 shadow-sm shrink-0 app-emergency">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            Notruf 112
          </a>
        </header>

        <main className="flex-1 flex flex-col overflow-hidden min-h-0">
          <ChatInterface
            currentMood={null}
            userId={user.userId}
            isPremium={user.isPremium}
            limitReached={user.limitReached}
            remainingMessages={user.remainingMessages}
            onLimitReached={(messageCount) => user.updateMessageState(messageCount, true)}
            onMessageSent={(messageCount, limitReached) => user.updateMessageState(messageCount, limitReached)}
            onShowPaywall={() => setShowPaywall(true)}
          />
        </main>

        <footer className="shrink-0 flex flex-col justify-center items-center py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] border-t border-slate-200/50 gap-0.5 app-footer">
          <p className="text-[0.625rem] text-slate-400 font-medium tracking-wider">
            © ❤️ mit Liebe gemacht von{' '}
            <button
              onClick={() => setShowImpressum(true)}
              className="underline hover:text-slate-600 transition-colors cursor-pointer"
            >
              Fabian Matthey
            </button>
            {' | '}
            <button
              onClick={() => window.open('/datenschutz.html', '_blank', 'width=800,height=600,scrollbars=yes')}
              className="underline hover:text-slate-600 transition-colors cursor-pointer"
            >
              Datenschutz
            </button>
          </p>
          <p className="text-[0.625rem] text-slate-400 font-medium tracking-wider">
            Für Sunny.
          </p>
        </footer>

        {showImpressum && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowImpressum(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-[90%] sm:w-[85%] p-6 relative max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setShowImpressum(false)}
                className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 transition-colors text-lg leading-none cursor-pointer"
                aria-label="Schließen"
              >
                ✕
              </button>
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Impressum</h2>
              <div className="text-sm text-slate-600 space-y-1">
                <p className="font-medium text-slate-700">Fabian Matthey</p>
                <p>Rigaer Str. 23</p>
                <p>97980 Bad Mergentheim</p>
                <p>Deutschland</p>
                <p className="mt-3">
                  E-Mail:{' '}
                  <a href="mailto:einkonto44@gmail.com" className="text-blue-600 hover:underline">
                    einkonto44@gmail.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <PaywallModal
        visible={showPaywall}
        loading={false}
        error={null}
        onUpgrade={handleUpgrade}
        onClose={handleClosePaywall}
      />
    </div>
  );
}
