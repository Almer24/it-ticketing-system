import React, { useEffect, useState } from 'react';
import axios from 'axios';
import LoadingSpinner from '../components/LoadingSpinner';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';

const COLORS = ['#2563eb', '#f59e0b', '#16a34a', '#dc2626', '#6b7280', '#a21caf', '#fbbf24'];

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [recurring, setRecurring] = useState([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [months] = useState([
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]);

  useEffect(() => {
    fetchStats();
    fetchMonthly(month, year);
    fetchRecurring();
    // eslint-disable-next-line
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/dashboard/stats');
      setStats(res.data);
    } catch (err) {
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthly = async (m, y) => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/dashboard/report/monthly?month=${m}&year=${y}`);
      setMonthly(res.data);
    } catch (err) {
      setMonthly(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecurring = async () => {
    try {
      const res = await axios.get('/api/dashboard/recurring-problems');
      setRecurring(res.data.recurringProblems || []);
    } catch (err) {
      setRecurring([]);
    }
  };

  const handleMonthChange = (e) => {
    const m = parseInt(e.target.value);
    setMonth(m);
    fetchMonthly(m, year);
  };
  const handleYearChange = (e) => {
    const y = parseInt(e.target.value);
    setYear(y);
    fetchMonthly(month, y);
  };

  if (loading && !stats) return <LoadingSpinner />;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-gray-600">Generate reports and view system analytics</p>
      </div>

      {/* Dashboard Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card text-center">
            <div className="text-sm text-gray-500">Total Tickets</div>
            <div className="text-3xl font-bold text-gray-900">{stats.totalTickets || 0}</div>
          </div>
          <div className="card text-center">
            <div className="text-sm text-gray-500">Recent (7 days)</div>
            <div className="text-3xl font-bold text-gray-900">{stats.recentTickets || 0}</div>
          </div>
          <div className="card text-center">
            <div className="text-sm text-gray-500">Avg. Resolution (hrs)</div>
            <div className="text-3xl font-bold text-gray-900">
              {stats.avgResolutionHours && typeof stats.avgResolutionHours === 'number' 
                ? stats.avgResolutionHours.toFixed(1) 
                : 'N/A'}
            </div>
          </div>
        </div>
      )}

      {/* Status Breakdown Pie Chart */}
      {stats && stats.statusStats && stats.statusStats.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-bold mb-4">Tickets by Status</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={stats.statusStats}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {stats.statusStats.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Department Breakdown Bar Chart */}
      {stats && stats.departmentStats && stats.departmentStats.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-bold mb-4">Tickets by Department</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.departmentStats}>
              <XAxis dataKey="department" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Monthly Report */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center md:space-x-4 mb-4">
          <h2 className="text-lg font-bold mb-2 md:mb-0">Monthly Report</h2>
          <select value={month} onChange={handleMonthChange} className="input w-auto mr-2">
            {months.map((m, idx) => (
              <option key={m} value={idx + 1}>{m}</option>
            ))}
          </select>
          <input
            type="number"
            min="2020"
            max={new Date().getFullYear() + 1}
            value={year}
            onChange={handleYearChange}
            className="input w-24"
          />
        </div>
        {monthly ? (
          <>
            <div className="mb-4">Total Tickets: <span className="font-bold">{monthly.totalTickets}</span></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">By Status</h3>
                <ul>
                  {monthly.statusBreakdown.map((s, idx) => (
                    <li key={s.status}>{s.status}: <span className="font-bold">{s.count}</span></li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">By Department</h3>
                <ul>
                  {monthly.departmentBreakdown.map((d, idx) => (
                    <li key={d.department}>{d.department}: <span className="font-bold">{d.count}</span></li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">By Equipment</h3>
                <ul>
                  {monthly.equipmentBreakdown.map((e, idx) => (
                    <li key={e.equipment_type}>{e.equipment_type}: <span className="font-bold">{e.count}</span></li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        ) : (
          <div className="text-gray-500">No data for this period.</div>
        )}
      </div>

      {/* Recurring Problems */}
      <div className="card">
        <h2 className="text-lg font-bold mb-4">Recurring Problems</h2>
        {recurring.length === 0 ? (
          <div className="text-gray-500">No recurring problems found.</div>
        ) : (
          <ul className="space-y-2">
            {recurring.map((p, idx) => (
              <li key={idx} className="flex justify-between border-b pb-1">
                <span>{p.problem_description}</span>
                <span className="text-sm text-gray-500">{p.occurrence_count} times</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Reports; 