import React, { useState } from 'react';
import { Loader2, Languages } from 'lucide-react';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { translations, Lang } from '../lib/i18n';
import { BrandMark } from './Header';

interface LoginScreenProps {
  onLoginSuccess: (email: string) => void;
  lang: Lang;
  setLang: (l: Lang) => void;
}

const GoogleLogo = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, lang, setLang }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const t = (key: keyof typeof translations.en) => translations[lang][key] || key;

  const handleLogin = async () => {
    setIsConnecting(true);
    setErrorMsg(null);
    try {
      const credential = await signInWithPopup(auth, googleProvider);
      const idToken = await credential.user.getIdToken();
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ idToken }),
      });
      // From here on the server's httpOnly session is the only credential; drop Firebase's copy.
      await signOut(auth).catch(() => {});

      if (res.ok) {
        const data = await res.json();
        onLoginSuccess(data.email);
        return;
      }
      setErrorMsg(res.status === 403 ? t('loginForbidden') : res.status === 429 ? t('loginRateLimited') : t('loginFailed'));
    } catch (error: any) {
      console.error('Sign-in error', error);
      setErrorMsg(
        error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/popup-blocked'
          ? t('loginPopupClosed')
          : t('loginFailed')
      );
    }
    setIsConnecting(false);
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-shell text-ink px-4 relative">
      <button
        type="button"
        onClick={() => setLang(lang === 'en' ? 'vi' : 'en')}
        aria-label={t('switchLanguage')}
        className="absolute top-4 right-4 h-10 px-3 rounded-full flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink hover:bg-tile-hover transition-colors cursor-pointer"
      >
        <Languages className="w-[18px] h-[18px]" />
        {lang === 'vi' ? 'VI' : 'EN'}
      </button>

      <main className="w-full max-w-[420px] rounded-3xl bg-panel px-8 py-10 flex flex-col items-center text-center">
        <div className="scale-150 mb-6">
          <BrandMark />
        </div>
        <h1 className="text-[28px] font-normal tracking-tight">MediaVault</h1>
        <p className="text-sm text-ink-muted mt-2 max-w-[32ch] leading-relaxed">{t('loginSubtitle')}</p>

        <button
          type="button"
          onClick={handleLogin}
          disabled={isConnecting}
          className="mt-8 w-full h-12 rounded-full bg-[#f1f3f4] hover:bg-white text-[#1f1f1f] text-[15px] font-medium flex items-center justify-center gap-3 transition-colors cursor-pointer disabled:cursor-wait disabled:opacity-80"
        >
          {isConnecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <GoogleLogo />}
          <span>{isConnecting ? t('loginSigningIn') : t('signInWithGoogle')}</span>
        </button>

        {errorMsg && (
          <p role="alert" className="mt-5 text-sm text-[#f2a39a] leading-relaxed">
            {errorMsg}
          </p>
        )}
      </main>
    </div>
  );
};
