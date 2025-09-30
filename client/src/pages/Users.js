import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, KeyRound, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const ROLES = [
  { value: 'user', label: 'User' },
  { value: 'admin', label: 'Admin' },
];

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUser, setResetUser] = useState(null);
  const [resetLoading, setResetLoading] = useState(false);
  const { user: currentUser } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm();

  const {
    register: registerReset,
    handleSubmit: handleSubmitReset,
    reset: resetReset,
    formState: { errors: errorsReset },
  } = useForm();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/users');
      setUsers(res.data.users);
    } catch (err) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openModal = (user = null) => {
    setEditUser(user);
    setShowModal(true);
    if (user) {
      setValue('username', user.username);
      setValue('email', user.email);
      setValue('department', user.department);
      setValue('role', user.role);
      setValue('password', '');
    } else {
      reset();
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditUser(null);
    reset();
  };

  const onSubmit = async (data) => {
    try {
      if (editUser) {
        // Edit user
        await axios.put(`/api/users/${editUser.id}`, {
          username: data.username,
          email: data.email,
          department: data.department,
          role: data.role,
        });
        toast.success('User updated');
      } else {
        // Create user
        await axios.post('/api/users', data);
        toast.success('User created');
      }
      closeModal();
      fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save user';
      toast.error(msg);
    }
  };

  const handleDelete = async (user) => {
    if (user.id === currentUser?.id) {
      toast.error("You cannot delete your own account.");
      return;
    }
    if (!window.confirm(`Delete user ${user.username}?`)) return;
    try {
      await axios.delete(`/api/users/${user.id}`);
      toast.success('User deleted');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const openResetModal = (user) => {
    setResetUser(user);
    setShowResetModal(true);
    resetReset();
  };

  const closeResetModal = () => {
    setShowResetModal(false);
    setResetUser(null);
    resetReset();
  };

  const onResetPassword = async (data) => {
    setResetLoading(true);
    try {
      await axios.put(`/api/users/${resetUser.id}/reset-password`, {
        newPassword: data.newPassword,
      });
      toast.success('Password reset');
      closeResetModal();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage system users and permissions</p>
        </div>
        <button className="btn-primary flex items-center space-x-2" onClick={() => openModal()}>
          <Plus className="h-4 w-4" />
          <span>New User</span>
        </button>
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No users found.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{user.username}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{user.department}</td>
                  <td className="px-6 py-4 whitespace-nowrap capitalize">{user.role}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{new Date(user.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                    <button className="btn-secondary px-2 py-1" onClick={() => openModal(user)} title="Edit">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button className="btn-warning px-2 py-1" onClick={() => openResetModal(user)} title="Reset Password">
                      <KeyRound className="h-4 w-4" />
                    </button>
                    <button
                      className="btn-danger px-2 py-1"
                      onClick={() => handleDelete(user)}
                      title={user.id === currentUser?.id ? 'Cannot delete your own account' : 'Delete'}
                      disabled={user.id === currentUser?.id}
                      style={user.id === currentUser?.id ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={closeModal}>
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold mb-4">{editUser ? 'Edit User' : 'New User'}</h2>
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <input
                  type="text"
                  {...register('username', { required: 'Username is required', minLength: { value: 3, message: 'At least 3 characters' } })}
                  className="input mt-1"
                />
                {errors.username && <p className="text-danger-600 text-sm mt-1">{errors.username.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  {...register('email', { required: 'Email is required' })}
                  className="input mt-1"
                />
                {errors.email && <p className="text-danger-600 text-sm mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Department</label>
                {/* <input
                  type="text"
                  {...register('department', { required: 'Department is required' })}
                  className="input mt-1"
                /> */}
                <select
                  {...register('department', { required: 'Department is required' })}
                  className="input mt-1"
                >
                  <option value="" disabled selected>Select a Department</option>
                  <option value="OSDS">OSDS</option>
                  <option value="SGOD">SGOD</option>
                  <option value="CID">OSDS</option>
                </select>
                {errors.department && <p className="text-danger-600 text-sm mt-1">{errors.department.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  {...register('role', { required: 'Role is required' })}
                  className="input mt-1"
                >
                  <option value="">Select role</option>
                  {ROLES.map((role) => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
                {errors.role && <p className="text-danger-600 text-sm mt-1">{errors.role.message}</p>}
              </div>
              {!editUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'At least 6 characters' } })}
                    className="input mt-1"
                  />
                  {errors.password && <p className="text-danger-600 text-sm mt-1">{errors.password.message}</p>}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-primary">{editUser ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={closeResetModal}>
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold mb-4">Reset Password for {resetUser?.username}</h2>
            <form className="space-y-4" onSubmit={handleSubmitReset(onResetPassword)}>
              <div>
                <label className="block text-sm font-medium text-gray-700">New Password</label>
                <input
                  type="password"
                  {...registerReset('newPassword', { required: 'Password is required', minLength: { value: 6, message: 'At least 6 characters' } })}
                  className="input mt-1"
                />
                {errorsReset.newPassword && <p className="text-danger-600 text-sm mt-1">{errorsReset.newPassword.message}</p>}
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn-secondary" onClick={closeResetModal}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={resetLoading}>{resetLoading ? 'Resetting...' : 'Reset Password'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users; 