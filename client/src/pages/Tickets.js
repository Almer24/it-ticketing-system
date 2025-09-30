import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Plus, Eye, Trash2 } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const Tickets = () => {
  const { user } = useAuth();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    status: '',
    department: '',
    createdBy: '' // '' = all, or numeric user id string
  });

  const [pagination, setPagination] = useState({ current: 1, total: 1, totalItems: 0 });
  const [deletingTickets, setDeletingTickets] = useState(new Set());

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const statusOptions = ['Pending', 'In Progress', 'On Hold', 'Done', 'Closed'];

  // enforce department for non-admins
  useEffect(() => {
    if (user && String(user.role).toLowerCase() !== 'admin') {
      setFilters(prev => ({ ...prev, department: user.department || '' }));
    }
  }, [user]);

  // load users list for admins so they can filter by specific submitter
  useEffect(() => {
    if (!user || String(user.role).toLowerCase() !== 'admin') return;
    const fetchUsers = async () => {
      try {
        setUsersLoading(true);
        const res = await axios.get('/api/users');
        setUsers(res.data.users || res.data || []);
      } catch (err) {
        console.error('Failed to load users', err);
      } finally {
        setUsersLoading(false);
      }
    };
    fetchUsers();
  }, [user]);

  useEffect(() => {
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, pagination.current]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', pagination.current);
      params.append('limit', 10);
      if (filters.status) params.append('status', filters.status);
      if (filters.department) params.append('department', filters.department);

      // only send numeric created_by value (admin selects a user id)
      if (filters.createdBy && !Number.isNaN(Number(filters.createdBy))) {
        params.append('created_by', String(filters.createdBy));
      }

      const response = await axios.get(`/api/tickets?${params.toString()}`);
      let returned = response.data.tickets || [];

      // client-side fallback: filter by selected user id if provided
      if (filters.createdBy && returned.length > 0) {
        const selectedId = Number(filters.createdBy);
        if (!Number.isNaN(selectedId)) {
          returned = returned.filter(t => Number(t.created_by) === selectedId);
        }
      }

      setTickets(returned);
      setPagination(response.data.pagination || {
        current: pagination.current,
        total: response.data.pagination?.total || Math.max(1, Math.ceil((response.data.total || returned.length) / 10)),
        totalItems: response.data.pagination?.totalItems ?? (response.data.total ?? returned.length)
      });
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleDelete = async (ticketId) => {
    if (!window.confirm('Are you sure you want to delete this ticket?')) return;
    setDeletingTickets(prev => new Set(prev).add(ticketId));
    try {
      await axios.delete(`/api/tickets/${ticketId}`);
      toast.success('Ticket deleted');
      fetchTickets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete ticket');
    } finally {
      setDeletingTickets(prev => {
        const s = new Set(prev);
        s.delete(ticketId);
        return s;
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return 'text-warning-600 bg-warning-100';
      case 'In Progress': return 'text-primary-600 bg-primary-100';
      case 'On Hold': return 'text-gray-600 bg-gray-100';
      case 'Done': return 'text-success-600 bg-success-100';
      case 'Closed': return 'text-gray-500 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleString();

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tickets</h1>
          <p className="text-gray-600">Manage and track support tickets</p>
        </div>
        <Link to="/tickets/create" className="btn-primary flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>New Ticket</span>
        </Link>
      </div>

      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Created By filter */}
          {user && String(user.role).toLowerCase() === 'admin' && (
            <select
              value={filters.createdBy}
              onChange={(e) => handleFilterChange('createdBy', e.target.value)}
              className="input"
            >
              <option value="">All Creators</option>
              {usersLoading ? (
                <option disabled>Loading users...</option>
              ) : (
                users.map(u =>
                  <option key={u.id} value={String(u.id)}>
                    {u.username || u.name || u.email || `User ${u.id}`}
                  </option>
                )
              )}
            </select>
          )}

          {/* Status */}
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="input"
          >
            <option value="">All Status</option>
            {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Department - admin only */}
          {user && String(user.role).toLowerCase() === 'admin' ? (
            <select
              value={filters.department}
              onChange={(e) => handleFilterChange('department', e.target.value)}
              className="input"
            >
              <option value="">All Departments</option>
              <option value="OSDS">OSDS</option>
              <option value="SGOD">SGOD</option>
              <option value="CID">CID</option>
            </select>
          ) : null}

          <button
            onClick={() => {
              setFilters({
                status: '',
                department: user && String(user.role).toLowerCase() !== 'admin' ? (user.department || '') : '',
                createdBy: user && String(user.role).toLowerCase() !== 'admin' ? 'me' : ''
              });
              setPagination(prev => ({ ...prev, current: 1 }));
            }}
            className="btn-secondary"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div className="card">
        {tickets.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tickets found</h3>
            <p className="text-gray-600 mb-4">Create a new ticket to get started</p>
            <Link to="/tickets/create" className="btn-primary">Create Ticket</Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticket</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Equipment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tickets.map(ticket => (
                    <tr key={ticket.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <Link to={`/tickets/${ticket.id}`} className="text-primary-600 hover:text-primary-900 font-medium">{ticket.ticket_number}</Link>
                          <p className="text-sm text-gray-500 truncate max-w-xs">{ticket.problem_description}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ticket.department}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ticket.equipment_type}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
                          {ticket.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(ticket.created_at)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <Link to={`/tickets/${ticket.id}`} className="text-primary-600 hover:text-primary-900 flex items-center space-x-1">
                            <Eye className="h-4 w-4" />
                            <span>View</span>
                          </Link>
                          {ticket.status !== 'Closed' && (
                            <button
                              onClick={() => handleDelete(ticket.id)}
                              disabled={deletingTickets.has(ticket.id)}
                              className="text-red-600 hover:text-red-900 flex items-center space-x-1 disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span>{deletingTickets.has(ticket.id) ? 'Deleting...' : 'Delete'}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination.total > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200">
                <div className="text-sm text-gray-700">Showing page {pagination.current} of {pagination.total} ({pagination.totalItems} total tickets)</div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, current: Math.max(1, prev.current - 1) }))}
                    disabled={pagination.current === 1}
                    className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, current: Math.min(pagination.total, prev.current + 1) }))}
                    disabled={pagination.current === pagination.total}
                    className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Tickets;