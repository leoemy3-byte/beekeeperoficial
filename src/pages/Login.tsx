import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Hexagon, Lock, Mail, ArrowRight, UserPlus, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Login() {
  const { user, loading: authLoading, loginWithGoogle, loginWithEmail, registerWithEmail } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    if (user && !authLoading) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  const handleGoogleLogin = async () => {
    try {
      setError('');
      setLoading(true);
      await loginWithGoogle();
      navigate('/');
    } catch (err) {
      setError('Falha ao fazer login com Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (isRegistering && !name)) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    try {
      setError('');
      setLoading(true);
      if (isRegistering) {
        await registerWithEmail(email, password, name);
      } else {
        await loginWithEmail(email, password);
      }
      navigate('/');
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está em uso.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('O login por e-mail não está ativado no Firebase. Por favor, ative "E-mail/Senha" no console do Firebase em Authentication > Sign-in method.');
      } else {
        setError('Ocorreu um erro. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-yellow-500/10 blur-[150px] rounded-full pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md bg-[#141414] border border-yellow-500/20 rounded-3xl shadow-2xl overflow-hidden z-10"
      >
        <div className="p-8 lg:p-10 flex flex-col items-center">
          <div className="w-16 h-16 bg-yellow-500/10 rounded-2xl border border-yellow-500/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(234,179,8,0.15)]">
            <Hexagon className="w-10 h-10 text-yellow-500" />
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-1 tracking-widest uppercase text-center" style={{ fontFamily: 'serif' }}>
            Beekeeper
          </h1>
          <p className="text-gray-400 text-xs mb-8 text-center uppercase tracking-tighter">
            Controle de Estoque Profissional
          </p>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 text-sm"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="w-full space-y-4 mb-6">
            <AnimatePresence mode="wait">
              {isRegistering && (
                <motion.div
                  key="name-field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <label className="text-xs font-medium text-gray-400 uppercase ml-1">Nome Completo</label>
                  <div className="relative">
                    <Hexagon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-500/50" />
                    <input 
                      type="text" 
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Seu nome"
                      className="w-full bg-black/40 border border-yellow-500/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-yellow-500/40 transition-colors"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-400 uppercase ml-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-500/50" />
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full bg-black/40 border border-yellow-500/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-yellow-500/40 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-400 uppercase ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-500/50" />
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-black/40 border border-yellow-500/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-yellow-500/40 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-yellow-500 text-black font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-yellow-400 transition-all disabled:opacity-50"
            >
              {isRegistering ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
              {loading ? 'Processando...' : (isRegistering ? 'Criar Conta' : 'Entrar')}
            </button>
          </form>

          <div className="w-full flex items-center gap-4 mb-6">
            <div className="h-px flex-1 bg-yellow-500/10" />
            <span className="text-xs text-gray-500 uppercase">ou</span>
            <div className="h-px flex-1 bg-yellow-500/10" />
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white/5 border border-white/10 text-white font-medium py-3.5 rounded-xl flex items-center justify-center gap-3 transition-all hover:bg-white/10 disabled:opacity-50"
          >
            <Mail className="w-5 h-5 text-yellow-500" />
            Entrar com Google
          </button>

          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="mt-6 text-sm text-gray-400 hover:text-yellow-500 transition-colors"
          >
            {isRegistering ? 'Já tem uma conta? Entre aqui' : 'Não tem conta? Crie uma agora'}
          </button>

          <div className="mt-8 flex items-center gap-2 text-[10px] text-gray-600 uppercase tracking-widest">
            <Lock className="w-3 h-3" />
            <span>Acesso seguro e criptografado</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
