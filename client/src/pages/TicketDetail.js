import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const statusOptions = ['Pending', 'In Progress', 'On Hold', 'Done', 'Closed'];

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

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const TicketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [note, setNote] = useState('');
  const [noteLoading, setNoteLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchTicket = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/tickets/${id}`);
      setTicket(res.data.ticket);
      setUpdates(res.data.updates);
      setStatus(res.data.ticket.status);
    } catch (err) {
      toast.error('Failed to fetch ticket');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();
    // eslint-disable-next-line
  }, [id]);

  const handleStatusChange = async (e) => {
    e.preventDefault();
    setStatusLoading(true);
    try {
      await axios.put(`/api/tickets/${id}/status`, { status, notes: statusNotes });
      toast.success('Status updated');
      setStatusNotes('');
      fetchTicket();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    setNoteLoading(true);
    try {
      await axios.post(`/api/tickets/${id}/notes`, { notes: note });
      toast.success('Note added');
      setNote('');
      fetchTicket();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add note');
    } finally {
      setNoteLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) {
      return;
    }

    setDeleteLoading(true);
    try {
      await axios.delete(`/api/tickets/${id}`);
      toast.success('Ticket deleted successfully');
      navigate('/tickets');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete ticket');
    } finally {
      setDeleteLoading(false);
    }
  };

  const isTicketClosed = ticket?.status === 'Closed';

  if (loading) return <LoadingSpinner />;
  if (!ticket) return <div className="text-center py-12">Ticket not found.</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ticket Details</h1>
          <p className="text-gray-600">View and manage ticket <span className="font-mono">#{ticket.ticket_number}</span></p>
          {isTicketClosed && (
            <div className="mt-2 p-3 bg-gray-100 border border-gray-300 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Note:</strong> This ticket is closed and cannot be modified.
              </p>
            </div>
          )}
        </div>
        {!isTicketClosed && (
          <button
            onClick={handleDelete}
            disabled={deleteLoading}
            className="btn-danger"
          >
            {deleteLoading ? 'Deleting...' : 'Delete Ticket'}
          </button>
        )}
      </div>

      <div className="card p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-500">Department</div>
            <div className="font-medium text-gray-900">{ticket.department}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Equipment</div>
            <div className="font-medium text-gray-900">{ticket.equipment_type}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Status</div>
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
              {ticket.status}
            </span>
          </div>
          <div>
            <div className="text-sm text-gray-500">Created</div>
            <div className="font-medium text-gray-900">{formatDate(ticket.created_at)}</div>
          </div>
          <div className="md:col-span-2">
            <div className="text-sm text-gray-500">Problem Description</div>
            <div className="text-gray-900 whitespace-pre-line">{ticket.problem_description}</div>
          </div>
          {ticket.photo_url && (
            <div className="md:col-span-2">
              <div className="text-sm text-gray-500 mb-1">Photo</div>
              <img src={ticket.photo_url} alt="Ticket" className="max-h-64 rounded border" />
            </div>
          )}
        </div>
      </div>

      {/* Admin: Change Status */}
      {isAdmin && !isTicketClosed && (
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">Change Ticket Status</h2>
          <form onSubmit={handleStatusChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="input mt-1"
                required
              >
                {statusOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
              <input
                type="text"
                value={statusNotes}
                onChange={e => setStatusNotes(e.target.value)}
                className="input mt-1"
                placeholder="Reason for status change"
              />
            </div>
            <button
              type="submit"
              className="btn-primary"
              disabled={statusLoading}
            >
              {statusLoading ? 'Updating...' : 'Update Status'}
            </button>
          </form>
        </div>
      )}

      {/* Add Note */}
      {!isTicketClosed && (
        <div className="card p-6">
          <form onSubmit={handleAddNote} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Add Note</label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                className="input mt-1"
                rows={2}
                placeholder="Add a note or update..."
              />
            </div>
            <button
              type="submit"
              className="btn-primary"
              disabled={noteLoading || !note.trim()}
            >
              {noteLoading ? 'Adding...' : 'Add Note'}
            </button>
          </form>
        </div>
      )}

      {/* Ticket History */}
      <div className="card p-6">
        <h2 className="text-lg font-bold mb-4">Ticket History</h2>
        {updates.length === 0 ? (
          <div className="text-gray-500">No updates yet.</div>
        ) : (
          <ul className="space-y-4">
            {updates.map((u, idx) => (
              <li key={u.id || idx} className="border-b pb-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-gray-900">{u.username}</div>
                  <div className="text-xs text-gray-500">{formatDate(u.created_at)}</div>
                </div>
                <div className="text-sm text-gray-700 mt-1">
                  {u.update_type === 'status_change' ? (
                    <>
                      <span className="font-semibold">Status changed</span> from <span className="font-mono">{u.old_value || 'N/A'}</span> to <span className="font-mono">{u.new_value}</span>
                      {u.notes && <>: <span>{u.notes}</span></>}
                    </>
                  ) : (
                    <>
                      <span className="font-semibold">Note:</span> {u.notes}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default TicketDetail; 