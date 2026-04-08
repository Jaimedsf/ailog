'use client';

import { useState } from 'react';
import { db } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  const doLogin = async () => {
    if (!email || !senha) {
      showError('Preencha e-mail e senha.');
      return;
    }
    const { error } = await db.auth.signInWithPassword({ email, password: senha });
    if (error) {
      showError('E-mail ou senha incorretos.');
      return;
    }
    // AuthProvider will redirect
  };

  const doRecovery = async () => {
    if (!email) {
      showError('Informe seu e-mail.');
      return;
    }
    const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    if (error) {
      showError('Erro ao enviar e-mail.');
      return;
    }
    showError('✅ E-mail enviado! Verifique sua caixa de entrada.', true);
  };

  const showError = (msg, isSuccess = false) => {
    setErrorMsg(msg);
    setSuccess(isSuccess);
  };

  return (
    <div className="login-screen" id="login-screen">
      <div className="login-box">
        <div className="login-logo">SEAS</div>
        <div className="login-sub">Superintendência do Sistema Estadual<br />de Atendimento Socioeducativo<br />Gestão de Obras · Infraestrutura</div>
        
        {errorMsg && (
          <div className="login-error" style={{ display: 'block', background: success ? 'rgba(63,185,80,0.1)' : 'rgba(248,81,73,0.1)', borderColor: success ? 'rgba(63,185,80,0.3)' : 'rgba(248,81,73,0.3)', color: success ? '#3fb950' : 'var(--accent3)' }}>
            {errorMsg}
          </div>
        )}

        {!isRecovery ? (
          <div>
            <div className="login-field"><label>E-mail</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" /></div>
            <div className="login-field"><label>Senha</label><input type="password" value={senha} onChange={e => setSenha(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doLogin()} placeholder="••••••••" /></div>
            <button className="login-btn" onClick={doLogin}>Entrar</button>
            <div className="login-link"><a onClick={() => { setIsRecovery(true); setErrorMsg(''); }}>Esqueci minha senha</a></div>
          </div>
        ) : (
          <div>
            <div className="login-field"><label>E-mail para recuperação</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" /></div>
            <button className="login-btn" onClick={doRecovery}>Enviar link de recuperação</button>
            <div className="login-link"><a onClick={() => { setIsRecovery(false); setErrorMsg(''); }}>← Voltar ao login</a></div>
          </div>
        )}
      </div>
    </div>
  );
}
