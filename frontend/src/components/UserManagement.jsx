import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API = 'http://localhost:5000/api/users';

const UserRow = ({ user, onSaved, onDeleted, token }) => {
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState(user.email || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(user.role || 'user');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const body = { email, role };
      if (password) body.password = password;
      const res = await axios.put(`${API}/${user._id}`, body, { headers: { Authorization: `Bearer ${token}` } });
      onSaved && onSaved(res.data);
      setEditing(false);
      setPassword('');
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || 'Failed to save');
    } finally { setBusy(false); }
  };

  const del = async () => {
    if (!confirm('Delete this user?')) return;
    setBusy(true);
    try {
      await axios.delete(`${API}/${user._id}`, { headers: { Authorization: `Bearer ${token}` } });
      onDeleted && onDeleted(user._id);
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || 'Failed to delete');
    } finally { setBusy(false); }
  };

  return (
    <tr className="border-b">
      <td className="px-4 py-3">
        {!editing ? (
          <div className="font-medium text-sm text-gray-800">{user.email}</div>
        ) : (
          <input className="w-full border px-2 py-1 rounded text-sm" value={email} onChange={e => setEmail(e.target.value)} />
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {!editing ? user.role : (
          <select className="border px-2 py-1 rounded text-sm" value={role} onChange={e => setRole(e.target.value)}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">{new Date(user.createdAt).toLocaleString()}</td>
      <td className="px-4 py-3 text-right">
        {!editing ? (
          <div className="inline-flex items-center gap-2">
            <button className="px-3 py-1 border rounded text-sm text-gray-700 hover:bg-gray-50" onClick={() => setEditing(true)}>Edit</button>
            <button className="px-3 py-1 border border-red-300 rounded text-sm text-red-600 hover:bg-red-50" onClick={del} disabled={busy}>Delete</button>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2">
            <input type="password" placeholder="New password" className="border px-2 py-1 rounded text-sm" value={password} onChange={e => setPassword(e.target.value)} />
            <button className="px-3 py-1 border border-green-300 rounded text-sm text-green-700" onClick={save} disabled={busy}>Save</button>
            <button className="px-3 py-1 border rounded text-sm text-gray-600" onClick={() => { setEditing(false); setEmail(user.email); setPassword(''); }}>Cancel</button>
          </div>
        )}
      </td>
    </tr>
  );
};

// Mobile-friendly card for small screens
const MobileUserCard = ({ user, onSaved, onDeleted, token }) => {
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState(user.email || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(user.role || 'user');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const body = { email, role };
      if (password) body.password = password;
      const res = await axios.put(`${API}/${user._id}`, body, { headers: { Authorization: `Bearer ${token}` } });
      onSaved && onSaved(res.data);
      setEditing(false);
      setPassword('');
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || 'Failed to save');
    } finally { setBusy(false); }
  };

  const del = async () => {
    if (!confirm('Delete this user?')) return;
    setBusy(true);
    try {
      await axios.delete(`${API}/${user._id}`, { headers: { Authorization: `Bearer ${token}` } });
      onDeleted && onDeleted(user._id);
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || 'Failed to delete');
    } finally { setBusy(false); }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium text-sm text-gray-800">{user.email}</div>
          <div className="text-xs text-gray-500 mt-1">{user.role} • {new Date(user.createdAt).toLocaleString()}</div>
        </div>
        <div className="inline-flex items-center gap-2">
          {!editing ? (
            <>
              <button className="px-3 py-1 border rounded text-sm text-gray-700" onClick={() => setEditing(true)}>Edit</button>
              <button className="px-3 py-1 border border-red-300 rounded text-sm text-red-600" onClick={del} disabled={busy}>Delete</button>
            </>
          ) : (
            <>
              <button className="px-3 py-1 border border-green-300 rounded text-sm text-green-700" onClick={save} disabled={busy}>Save</button>
              <button className="px-3 py-1 border rounded text-sm text-gray-600" onClick={() => { setEditing(false); setEmail(user.email); setPassword(''); }}>Cancel</button>
            </>
          )}
        </div>
      </div>

      {editing && (
        <div className="mt-3 space-y-2">
          <input className="w-full border px-2 py-2 rounded text-sm" value={email} onChange={e => setEmail(e.target.value)} />
          <select className="w-full border px-2 py-2 rounded text-sm" value={role} onChange={e => setRole(e.target.value)}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <input type="password" className="w-full border px-2 py-2 rounded text-sm" placeholder="New password" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
      )}
    </div>
  );
};

const UserManagement = ({ token }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [toasts, setToasts] = useState([]);

  const addToast = (message, kind = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, message, kind }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  };

  useEffect(() => {
    const init = async () => {
      if (!token) return;
      try {
        // get current user info
        const r = await axios.get('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
        const me = r.data && r.data.user ? r.data.user : r.data;
        if (!me || me.role !== 'admin') {
          setBlocked(true);
          addToast('Access denied — admin only', 'warn');
          return;
        }

        setLoading(true);
        const res = await axios.get(API, { headers: { Authorization: `Bearer ${token}` } });
        setUsers(res.data || []);
      } catch (err) {
        console.error(err);
        addToast(err?.response?.data?.message || 'Failed to load users', 'error');
      } finally { setLoading(false); }
    };

    init();
  }, [token]);

  const handleSaved = (u) => {
    setUsers(list => list.map(x => x._id === u._id ? u : x));
  };

  const handleDeleted = (id) => {
    setUsers(list => list.filter(x => x._id !== id));
  };

  // create user form state
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [creating, setCreating] = useState(false);

  const createUser = async () => {
    if (!newEmail || !newPassword) return addToast('Email and password required', 'warn');
    setCreating(true);
    try {
      const res = await axios.post(API, { email: newEmail, password: newPassword, role: newRole }, { headers: { Authorization: `Bearer ${token}` } });
      setUsers(list => [res.data, ...list]);
      setNewEmail(''); setNewPassword(''); setNewRole('user'); setShowCreate(false);
      addToast('User created', 'success');
    } catch (err) {
      console.error(err);
      addToast(err?.response?.data?.message || 'Failed to create user', 'error');
    } finally { setCreating(false); }
  };

  return (
    <div className="relative">
      {/* toast container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(t => (
          <div key={t.id} className={`max-w-sm w-full px-4 py-2 rounded shadow ${t.kind === 'error' ? 'bg-red-50 border-l-4 border-red-400 text-red-800' : t.kind === 'warn' ? 'bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800' : 'bg-green-50 border-l-4 border-green-400 text-green-800'}`}>
            <div className="text-sm">{t.message}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">User Management</h2>
          {!blocked && (
            <div>
              <button onClick={() => setShowCreate(s => !s)} className="px-3 py-1 border rounded text-sm">{showCreate ? 'Cancel' : 'Add User'}</button>
            </div>
          )}
        </div>
        {loading ? <div>Loading...</div> : blocked ? (
          <div className="text-sm text-gray-600">You do not have permission to view this page.</div>
        ) : (
          <>
            {showCreate && (
              <div className="mb-4 p-4 border rounded bg-gray-50">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                  <input className="border px-2 py-1 rounded" placeholder="Email" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                  <input type="password" className="border px-2 py-1 rounded" placeholder="Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                  <select className="border px-2 py-1 rounded" value={newRole} onChange={e => setNewRole(e.target.value)}>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={createUser} className="px-3 py-1 bg-green-600 text-white rounded text-sm" disabled={creating}>{creating ? 'Creating...' : 'Create'}</button>
                  <button onClick={() => { setShowCreate(false); setNewEmail(''); setNewPassword(''); setNewRole('user'); }} className="px-3 py-1 border rounded text-sm">Cancel</button>
                </div>
              </div>
            )}
          {/* Mobile: stacked cards */}
          <div className="md:hidden space-y-3 mb-4">
            {users.map(u => (
              <MobileUserCard key={u._id} user={u} token={token} onSaved={handleSaved} onDeleted={handleDeleted} />
            ))}
            {users.length === 0 && (
              <div className="text-center text-sm text-gray-500">No users found.</div>
            )}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map(u => (
                  <UserRow key={u._id} user={u} token={token} onSaved={handleSaved} onDeleted={handleDeleted} />
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
