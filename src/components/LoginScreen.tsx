import React, { useState } from 'react';
import { Zap, Loader2, ShieldCheck, Globe } from 'lucide-react';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup } from 'firebase/auth';
import { translations, Lang } from '../lib/i18n';

interface LoginScreenProps {
  onLoginSuccess: () => void;
  lang: Lang;
  setLang: (l: Lang) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, lang, setLang }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const t = (key: keyof typeof translations.en) => translations[lang][key] || key;

  const handleLogin = async () => {
    setIsConnecting(true);
    setErrorMsg(null);
    try {
      await signInWithPopup(auth, googleProvider);
      onLoginSuccess();
    } catch (error: any) {
      console.error("Firebase Login Error", error);
      if (error.code === 'auth/popup-closed-by-user') {
        setErrorMsg('Sign-in popup was closed before completion. Please try again or allow popups.');
      } else {
        setErrorMsg(error.message || 'An error occurred during sign in.');
      }
      setIsConnecting(false);
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-100 font-sans antialiased overflow-hidden select-none relative">
      {/* Language Toggle in Corner */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={() => setLang(lang === 'en' ? 'vi' : 'en')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{lang === 'en' ? '🇬🇧 EN' : '🇻🇳 VI'}</span>
        </button>
      </div>

      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-lg p-6 shadow-2xl flex flex-col items-center relative overflow-hidden">
        
        {/* Brand Icon */}
        <div className="w-12 h-12 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-emerald-400 mb-3 shadow-sm">
          <Zap className="w-6 h-6 fill-emerald-500/20" />
        </div>
        
        {/* Header Text */}
        <h1 className="text-lg font-bold text-zinc-100 tracking-tight font-mono mb-1">MEDIAVAULT CORE</h1>
        <p className="text-xs text-zinc-500 font-mono text-center mb-8">End-to-End Encrypted P2P Media Node</p>
        
        {/* Content Container */}
        <div className="w-full space-y-4">
          
          {/* Action Button */}
          <button
            onClick={handleLogin}
            disabled={isConnecting}
            className={`w-full py-2.5 px-4 rounded-md text-white font-medium text-xs flex items-center justify-center gap-2 transition-all border ${
              isConnecting
                ? 'bg-zinc-800 border-zinc-700 text-zinc-400 cursor-wait'
                : 'bg-zinc-100 border-zinc-200 text-zinc-900 hover:bg-white hover:border-white shadow-sm cursor-pointer'
            }`}
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                <span className="font-mono">Establishing WebRTC Peer Connection...</span>
              </>
            ) : (
              <>
                {/* Generic G-style icon using standard SVG as Google logo is not in standard lucide */}
                <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span className="font-bold">{t('signInWithGoogle')}</span>
              </>
            )}
          </button>

          <button
            onClick={onLoginSuccess}
            className="w-full py-2 px-4 rounded-md bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white text-xs font-mono transition-colors cursor-pointer"
          >
            ⚡ {lang === 'vi' ? 'Truy cập nhanh chế độ Node Khách' : 'Direct Demo / Local Node Access'}
          </button>

          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 rounded p-3 text-[11px] text-red-400 text-center">
              {errorMsg}
            </div>
          )}

          {/* Info Badge */}
          <div className="bg-zinc-950 border border-zinc-800 rounded p-3 flex items-start gap-2.5">
             <ShieldCheck className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
             <p className="text-[10px] text-zinc-500 font-mono leading-relaxed">
               Authentication occurs directly via Google Identity Services. Node connections are established via ICE/STUN protocols. No media routing through public relays.
             </p>
          </div>

        </div>
      </div>
    </div>
  );
};
