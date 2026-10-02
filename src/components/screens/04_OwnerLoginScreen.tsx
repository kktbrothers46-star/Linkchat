import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, ArrowLeft, Check, CheckCircle2, Crown, ExternalLink, Eye, EyeOff, Lock, Phone, RefreshCw, Settings, ShieldCheck, Sparkles, User, UserPlus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { currentSupabaseUrl, currentSupabaseAnonKey, testSupabaseConnection } from '../../lib/supabase';

export const OwnerLoginScreen: React.FC = () => {
  const { navigateTo, ownerLogin, ownerRegister, checkOwnerPhone } = useApp();

  // Mode: 'existing' = Log In, 'new' = Create New Owner Account
  const [mode, setMode] = useState<'existing' | 'new'>('existing');

  // Input fields (Start completely blank)
  const [phone, setPhone] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status & feedback
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [phoneCheckResult, setPhoneCheckResult] = useState<{
    checkedPhone: string;
    exists: boolean;
    name?: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Supabase Connection Settings Modal State
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [inputUrl, setInputUrl] = useState(currentSupabaseUrl);
  const [inputKey, setInputKey] = useState(currentSupabaseAnonKey);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestAndSave = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await testSupabaseConnection(inputUrl, inputKey);
      setTestResult(res);
      if (res.success) {
        localStorage.setItem('LINKCHAT_SUPABASE_URL', inputUrl.trim());
        localStorage.setItem('LINKCHAT_SUPABASE_ANON_KEY', inputKey.trim());
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setTestResult({ success: false, message: msg });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleResetToBuiltin = () => {
    localStorage.removeItem('LINKCHAT_SUPABASE_URL');
    localStorage.removeItem('LINKCHAT_SUPABASE_ANON_KEY');
    window.location.reload();
  };

  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-check phone number against backend when user types a phone number
  const handlePhoneChange = (val: string) => {
    setPhone(val);
    setError(null);
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }

    const cleaned = val.trim();
    if (cleaned.length >= 7) {
      checkTimeoutRef.current = setTimeout(async () => {
        setCheckingPhone(true);
        try {
          const res = await checkOwnerPhone(cleaned);
          setPhoneCheckResult({
            checkedPhone: cleaned,
            exists: res.exists,
            name: res.name,
          });

          // Strictly auto-adapt mode based on backend existence:
          // If exists -> Existing Owner login
          // If does NOT exist -> New Owner account creation
          if (res.exists) {
            setMode('existing');
          } else {
            setMode('new');
          }
          setError(null);
        } catch {
          // ignore network debounce errors
        } finally {
          setCheckingPhone(false);
        }
      }, 400);
    } else {
      setPhoneCheckResult(null);
    }
  };

  useEffect(() => {
    return () => {
      if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }

    const cleanPhone = phone.trim();
    const cleanPassword = password.trim();
    const cleanName = ownerName.trim();

    if (!cleanPhone) {
      setError('Please enter your phone number.');
      return;
    }

    if (!cleanPassword) {
      setError(mode === 'new' ? 'Please create a password for your account.' : 'Please enter your owner password.');
      return;
    }

    if (mode === 'new' && cleanPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (mode === 'new' && !cleanName) {
      setError('Please enter your Owner or Organization name.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Single source of truth: verify account existence directly against backend database
      const check = await checkOwnerPhone(cleanPhone);
      setPhoneCheckResult({
        checkedPhone: cleanPhone,
        exists: check.exists,
        name: check.name,
      });

      if (!check.exists) {
        // Account DOES NOT exist in backend
        if (mode === 'existing') {
          // User attempted to login with an unknown phone number:
          // NEVER trigger existing owner password verification!
          setMode('new');
          setError('No owner account found for this phone number. Please enter your name and create a password below to register.');
          setLoading(false);
          return;
        }
        // STRICT NEW OWNER FLOW: Creates account in Supabase Auth & PostgreSQL
        await ownerRegister(cleanPhone, cleanPassword, cleanName);
      } else {
        // Account DOES exist in backend
        if (mode === 'new') {
          // User attempted to register with an already existing phone number:
          setMode('existing');
          setError('An owner account already exists with this phone number. Please enter your password to log in.');
          setLoading(false);
          return;
        }
        // STRICT EXISTING OWNER FLOW: Authenticates with Supabase Auth & restores existing owner data
        await ownerLogin(cleanPassword, undefined, cleanPhone, 'login');
      }

      navigateTo('05_OWNER_HOME');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-between w-full h-full min-h-[640px] p-6 bg-[#F5F5EC] select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between w-full pt-3">
        <button
          type="button"
          onClick={() => navigateTo('03_ACCOUNT_TYPE')}
          aria-label="Back"
          className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-[#20221D] hover:bg-black/5"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
        </button>
        <button
          type="button"
          onClick={() => {
            setInputUrl(currentSupabaseUrl);
            setInputKey(currentSupabaseAnonKey);
            setTestResult(null);
            setShowConfigModal(true);
          }}
          title="Supabase Database Settings"
          className="px-3 py-1.5 rounded-full text-[#77796F] hover:text-[#20221D] hover:bg-black/5 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer border border-[#E4E5D9] bg-white/70"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Database</span>
        </button>
      </div>

      {/* Main Login / Register Area */}
      <div className="w-full max-w-sm mx-auto my-auto flex flex-col items-center">
        {/* Crown Icon Badge */}
        <div className="w-16 h-16 rounded-full bg-[#CDEB5A] flex items-center justify-center text-[#20221D] shadow-xs mb-3">
          <Crown className="w-8 h-8 stroke-[2.2]" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-[#20221D]">Owner Portal</h1>
        <p className="text-xs text-[#77796F] mt-1 text-center max-w-xs">
          Broadcast directly to your members with zero group chat noise.
        </p>

        {/* Tab Switcher: Existing Owner vs New Owner */}
        <div className="w-full grid grid-cols-2 p-1 bg-[#E8EAD9]/80 rounded-2xl mt-4 mb-3 border border-[#E4E5D9]">
          <button
            type="button"
            onClick={() => {
              setMode('existing');
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              mode === 'existing'
                ? 'bg-white text-[#20221D] shadow-xs'
                : 'text-[#77796F] hover:text-[#20221D]'
            }`}
          >
            Existing Owner
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('new');
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              mode === 'new'
                ? 'bg-[#CDEB5A] text-[#20221D] shadow-xs'
                : 'text-[#77796F] hover:text-[#20221D]'
            }`}
          >
            New Owner
          </button>
        </div>

        {/* Automatic Backend Detection Status Banner (Only displayed when there is no blocking error) */}
        {!error && phoneCheckResult && phone.trim().length >= 7 && (
          <div
            className={`w-full p-2.5 rounded-2xl text-xs flex items-center space-x-2 mb-2 transition-all ${
              phoneCheckResult.exists
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-[#CDEB5A]/25 text-[#20221D] border border-[#CDEB5A]/50'
            }`}
          >
            {phoneCheckResult.exists ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-none" />
                <span className="truncate">
                  Account found: <strong>{phoneCheckResult.name || 'Owner'}</strong>. Enter password below.
                </span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-[#8BAE10] flex-none" />
                <span>
                  New phone number detected. Fill in details to create your owner account!
                </span>
              </>
            )}
          </div>
        )}

        {/* Error message (Only shown on explicit submit failure; cleared on typing or tab switch) */}
        {error && (
          <div className="mb-3 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 w-full text-left space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-none mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{error}</div>
            </div>
            {(error.includes('Unable to connect') || error.includes('fetch') || error.includes('Supabase')) && (
              <button
                type="button"
                onClick={() => {
                  setInputUrl(currentSupabaseUrl);
                  setInputKey(currentSupabaseAnonKey);
                  setTestResult(null);
                  setShowConfigModal(true);
                }}
                className="w-full py-2 px-3 bg-red-100 hover:bg-red-200 active:bg-red-300 text-red-900 font-bold rounded-xl text-center text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Configure Supabase Project URL</span>
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off" className="w-full space-y-3">
          {/* Phone Number Input (Universal First Step) */}
          <div>
            <div className="flex items-center justify-between ml-1 mb-1">
              <label className="block text-xs font-bold text-[#20221D]">
                Phone Number
              </label>
              {checkingPhone && (
                <span className="text-[11px] text-[#77796F] flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 border border-[#77796F] border-t-transparent rounded-full animate-spin" />
                  <span>Checking...</span>
                </span>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#77796F]">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="tel"
                value={phone}
                autoComplete="off"
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="Enter your phone number"
                required
                className="w-full pl-10 pr-4 py-3 bg-white border border-[#E4E5D9] rounded-2xl text-sm font-medium text-[#20221D] placeholder-[#9E9F96] focus:outline-hidden focus:border-[#CDEB5A] focus:ring-2 focus:ring-[#CDEB5A]/30 shadow-2xs transition-all"
              />
            </div>
          </div>

          {/* Owner / Organization Name (Only for New Owner mode) */}
          {mode === 'new' && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-200">
              <label className="block text-xs font-bold text-[#20221D] mb-1 ml-1">
                Owner / Organization Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#77796F]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={ownerName}
                  autoComplete="off"
                  onChange={(e) => {
                    setOwnerName(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="e.g. BT Fitness Gym or John Doe"
                  required={mode === 'new'}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-[#E4E5D9] rounded-2xl text-sm font-medium text-[#20221D] placeholder-[#9E9F96] focus:outline-hidden focus:border-[#CDEB5A] focus:ring-2 focus:ring-[#CDEB5A]/30 shadow-2xs transition-all"
                />
              </div>
            </div>
          )}

          {/* Password Input Field */}
          <div>
            <label className="block text-xs font-bold text-[#20221D] mb-1 ml-1">
              {mode === 'new' ? 'Create Owner Password' : 'Owner Password'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#77796F]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={mode === 'new' ? 'Create a secure password (min 6 chars)' : 'Enter your owner password'}
                autoComplete="new-password"
                required
                className="w-full pl-10 pr-11 py-3 bg-white border border-[#E4E5D9] rounded-2xl text-sm font-medium text-[#20221D] placeholder-[#9E9F96] focus:outline-hidden focus:border-[#CDEB5A] focus:ring-2 focus:ring-[#CDEB5A]/30 shadow-2xs transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#77796F] hover:text-[#20221D] transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {mode === 'existing' && (
              <p className="text-[11px] text-[#77796F] mt-1 ml-1">
                New user? Switch to the <strong>New Owner</strong> tab above to create an account.
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#CDEB5A] hover:bg-[#bfe043] active:scale-[0.98] text-[#20221D] font-bold text-base py-3.5 rounded-full shadow-xs transition-all flex items-center justify-center cursor-pointer border border-[#BDE040]/50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-[#20221D] border-t-transparent rounded-full animate-spin" />
              ) : mode === 'new' ? (
                <span className="flex items-center space-x-2">
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account & Access</span>
                </span>
              ) : (
                'Log In to Dashboard'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Footer Security Notice */}
      <div className="w-full max-w-sm mx-auto pb-4 text-center">
        <p className="text-xs text-[#77796F] flex items-center justify-center space-x-1">
          <ShieldCheck className="w-3.5 h-3.5 text-[#4CAF50] flex-none" />
          <span>Your broadcasts & chat history are permanently stored for this phone number.</span>
        </p>
      </div>

      {/* Supabase Connection Settings Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-[#E4E5D9] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-[#CDEB5A] flex items-center justify-center text-[#20221D]">
                  <Settings className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#20221D]">Database Connection</h3>
                  <p className="text-[11px] text-[#77796F]">Configure your Supabase Cloud project</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#77796F] hover:bg-black/5 cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-[#F5F5EC] rounded-2xl text-xs text-[#55574D] space-y-1.5 border border-[#E4E5D9]">
              <p className="font-semibold text-[#20221D]">Where to find these in Supabase:</p>
              <p>1. Open your <strong>Supabase Dashboard</strong></p>
              <p>2. Go to <strong>Project Settings → API</strong></p>
              <p>3. Copy your <strong>Project URL</strong> and <strong>Publishable key</strong></p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#20221D] mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="url"
                  value={inputUrl}
                  onChange={(e) => {
                    setInputUrl(e.target.value);
                    setTestResult(null);
                  }}
                  placeholder="https://your-project-id.supabase.co"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E4E5D9] rounded-xl text-xs font-medium text-[#20221D] placeholder-[#9E9F96] focus:outline-hidden focus:border-[#CDEB5A] focus:ring-2 focus:ring-[#CDEB5A]/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#20221D] mb-1">
                  Public Anon / Publishable Key
                </label>
                <textarea
                  rows={2}
                  value={inputKey}
                  onChange={(e) => {
                    setInputKey(e.target.value);
                    setTestResult(null);
                  }}
                  placeholder="sb_publishable_... or eyJhbGciOi..."
                  className="w-full px-3.5 py-2 bg-white border border-[#E4E5D9] rounded-xl text-xs font-mono text-[#20221D] placeholder-[#9E9F96] focus:outline-hidden focus:border-[#CDEB5A] focus:ring-2 focus:ring-[#CDEB5A]/30"
                />
              </div>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-2xl text-xs flex items-start gap-2 ${
                  testResult.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {testResult.success ? (
                  <Check className="w-4 h-4 text-emerald-600 flex-none mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 flex-none mt-0.5" />
                )}
                <div className="flex-1 leading-relaxed font-medium">
                  {testResult.message}
                  {testResult.success && (
                    <div className="mt-1 text-[11px] text-emerald-700">
                      Reloading application with new connection settings...
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={handleTestAndSave}
                disabled={testingConnection}
                className="w-full bg-[#CDEB5A] hover:bg-[#bfe043] text-[#20221D] font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {testingConnection ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Testing Connection...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Test & Save Connection</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleResetToBuiltin}
                className="w-full py-2 text-center text-xs text-[#77796F] hover:text-[#20221D] transition-colors cursor-pointer"
              >
                Reset to Build-time Default
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
