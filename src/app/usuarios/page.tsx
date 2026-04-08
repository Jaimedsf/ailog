'use client';

import { useAuth } from '@/components/AuthProvider';
import { Modal } from '@/components/Modal';
import { showToast } from '@/lib/utils';
import { useState, useEffect, useCallback } from 'react';
import { fetchAllUsersServer, inviteUserServer, deleteUserServer } from '@/app/actions/usuarios';

type UserList = { id: string; email: string; nome: string; perfil: string }[];

export default function UsuariosPage() {
  const { perfil, user } = useAuth();
  const isAdmin = perfil === 'admin';

  const [usersList, setUsersList] = useState<UserList>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [novoPerfil, setNovoPerfil] = useState('visualizador');

  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
    const res = await fetchAllUsersServer();
    if (res.error) {
      console.log('Error fetching users (only visible to superadmin)', res.error);
    } else if (res.users) {
      setUsersList(res.users);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const inviteUser = async () => {
    if (!email) { showToast('Informe o e-mail!', '#f85149'); return; }
    if (!senha || senha.length < 6) { showToast('Informe uma senha com pelo menos 6 caracteres!', '#f85149'); return; }

    const res = await inviteUserServer(email, senha, nome, novoPerfil);
    
    if (res.error) {
      showToast('Erro: ' + res.error, '#f85149');
    } else {
      showToast('Usuário criado!');
      setModalOpen(false);
      setEmail(''); setNome(''); setSenha('');
      fetchUsers();
    }
  };

  const deleteUser = async (id: string) => {
    if (id === user?.id) { showToast('Não pode se excluir!', '#f85149'); return; }
    if (!confirm('Excluir este usuário?')) return;
    
    const res = await deleteUserServer(id);
    if (res.error) {
      showToast('Erro: ' + res.error, '#f85149');
    } else {
      showToast('Excluído com sucesso');
      fetchUsers();
    }
  };

  if (!isAdmin) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>Acesso restrito a administradores.</div>;
  }

  return (
    <div id="section-usuarios" className="tab-content active" style={{ display: 'block' }}>
      <div className="section-header">
        <div className="section-title">Usuários do Sistema</div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>＋ Convidar Usuário</button>
      </div>

      <div id="users-list">
        {usersList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>Aguarde...</div>
        ) : usersList.map(u => (
          <div key={u.id} className="user-list-item">
            <div className="user-list-avatar">{u.email.charAt(0).toUpperCase()}</div>
            <div className="user-list-info">
              <div className="user-list-email">{u.email} <span style={{ color: 'var(--muted2)' }}>({u.nome})</span></div>
              <div className="user-list-role">
                <span className={`role-badge ${u.perfil === 'admin' ? 'role-admin' : 'role-viewer'}`}>
                  {u.perfil === 'admin' ? 'Administrador' : 'Visualizador'}
                </span>
                {u.id === user?.id && <span style={{ marginLeft: '6px', color: 'var(--accent2)', fontSize: '10px' }}>Você</span>}
              </div>
            </div>
            {u.id !== user?.id && (
               <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => deleteUser(u.id)}>🗑</button>
            )}
          </div>
        ))}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Convidar Usuário"
        maxWidth="440px"
        footer={
          <>
            <button className="btn" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={inviteUser}>➕ Criar Usuário</button>
          </>
        }
      >
        <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>Preencha os dados do novo usuário. Ele já poderá acessar com e-mail e senha definidos aqui.</div>
        <div className="form-grid">
          <div className="field full"><label>E-mail *</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="usuario@seas.ce.gov.br" /></div>
          <div className="field full"><label>Nome</label><input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do usuário" /></div>
          <div className="field full"><label>Senha *</label><input type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" /></div>
          <div className="field full"><label>Perfil *</label>
            <select value={novoPerfil} onChange={e => setNovoPerfil(e.target.value)}>
              <option value="visualizador">Visualizador (somente leitura)</option>
              <option value="admin">Administrador (acesso total)</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
