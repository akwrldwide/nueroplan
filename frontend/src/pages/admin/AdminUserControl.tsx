import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { adminFetch } from '../../utils/adminApi';
import AdminLayout from '../../components/layout/AdminLayout';
import { 
  Plus, 
  Trash2, 
  Key, 
  X,
  Loader2,
  Lock,
  Mail,
  User
} from 'lucide-react';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export default function AdminUserControl() {
  const { token, user: currentUser } = useContext(AuthContext);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add Admin Form States
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Change Password Modal States
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);
  const [updatePasswordVal, setUpdatePasswordVal] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const data = await adminFetch('/admins', token);
      setAdmins(data || []);
      setError('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to retrieve administrative users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchAdmins();
  }, [token]);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const res = await adminFetch('/admins', token, {
        method: 'POST',
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          password: newPassword
        })
      });
      setSuccess(res.message || 'New administrator successfully registered.');
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      fetchAdmins();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to register new administrator.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveAdmin = async (id: string) => {
    if (id === currentUser?.id) {
      alert('You cannot delete your own active administrator account.');
      return;
    }
    if (!confirm('Are you sure you want to revoke administrative permissions for this user? This will delete their account.')) return;
    try {
      const res = await adminFetch(`/admins/${id}`, token, { method: 'DELETE' });
      setSuccess(res.message || 'Administrator account removed.');
      fetchAdmins();
    } catch (err: any) {
      alert(err.message || 'Failed to delete administrator.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdminId) return;
    setUpdatingPassword(true);
    try {
      const res = await adminFetch(`/admins/${selectedAdminId}/password`, token, {
        method: 'PUT',
        body: JSON.stringify({ newPassword: updatePasswordVal })
      });
      alert(res.message || 'Password successfully updated.');
      setSelectedAdminId(null);
      setUpdatePasswordVal('');
    } catch (err: any) {
      alert(err.message || 'Failed to update administrative password.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (loading && admins.length === 0) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500 gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
          <p className="text-sm font-medium">Loading administrative registry...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Admin Accounts</h1>
          <p className="text-slate-500 mt-1">Manage platform administrators credentials and security parameters.</p>
        </div>

        {success && (
          <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-xl">
            <p className="text-sm text-emerald-800 font-semibold">{success}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl">
            <p className="text-sm text-red-700 font-semibold">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Admin Directory */}
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between self-start">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider mb-4">Administrators Directory</h3>
              <div className="divide-y divide-slate-100">
                {admins.map(adm => (
                  <div key={adm.id} className="flex items-center justify-between py-4 group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
                        {adm.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                          {adm.name}
                          {adm.id === currentUser?.id && (
                            <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded font-black uppercase">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">{adm.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setSelectedAdminId(adm.id)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                        title="Change Password"
                      >
                        <Key className="h-4 w-4" />
                      </button>
                      {adm.id !== currentUser?.id && (
                        <button
                          onClick={() => handleRemoveAdmin(adm.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                          title="Revoke Admin Access"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Add New Admin Form */}
          <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider mb-4">Register Admin</h3>
            <form onSubmit={handleAddAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-500 uppercase">Full Name</label>
                <div className="relative mt-1.5">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="e.g. Samuel Admin"
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-500 uppercase">Email Address</label>
                <div className="relative mt-1.5">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="admin@email.com"
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-500 uppercase">Password</label>
                <div className="relative mt-1.5">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm font-semibold"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 px-4 rounded-xl transition-all cursor-pointer shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Registering...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" /> Add Administrator
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* CHANGE PASSWORD MODAL */}
        {selectedAdminId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-6 overflow-hidden">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-md font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="h-4.5 w-4.5 text-indigo-600" /> Reset Admin Password
                </h3>
                <button
                  onClick={() => {
                    setSelectedAdminId(null);
                    setUpdatePasswordVal('');
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-500 uppercase">New Password</label>
                  <div className="relative mt-1.5">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-4 w-4" />
                    </span>
                    <input
                      type="password"
                      required
                      min={6}
                      value={updatePasswordVal}
                      onChange={e => setUpdatePasswordVal(e.target.value)}
                      placeholder="Enter new secure password"
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm font-semibold"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAdminId(null);
                      setUpdatePasswordVal('');
                    }}
                    className="flex-1 px-4 py-2.5 bg-slate-100 font-bold text-slate-700 text-sm rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatingPassword}
                    className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 font-bold text-white text-sm rounded-xl transition-colors shadow-sm disabled:opacity-50"
                  >
                    {updatingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
