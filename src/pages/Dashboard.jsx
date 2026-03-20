import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// SVG Icons for Dashboard
const Icons = {
  Asset: () => <svg width="24" height="24" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>,
  Check: () => <svg width="24" height="24" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>,
  Wrench: () => <svg width="24" height="24" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  Person: () => <svg width="24" height="24" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  Upload: () => <svg width="24" height="24" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
}

const Dashboard = ({ settings }) => {
  const [stats, setStats] = useState(null);
  const [depreciation, setDepreciation] = useState(null);
  const [recentAssignments, setRecentAssignments] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    let mounted = true;
    fetchDashboardData(mounted);
    return () => { mounted = false; };
  }, []); // Keep empty array to run once on mount. App.jsx renders this only after loading=false.

  useEffect(() => {
    if (settings?.companyName) {
      document.title = `${settings.companyName} - Dashboard`;
    }
  }, [settings]);

  const fetchDashboardData = async (mounted) => {
    try {
      const [statsRes, depRes, assignRes, healthRes] = await Promise.all([
        axios.get('/api/dashboard/stats'),
        axios.get('/api/dashboard/depreciation'),
        axios.get('/api/dashboard/recent-assignments'),
        axios.get('/api/dashboard/health')
      ]);

      setStats(statsRes.data);
      setDepreciation(depRes.data);
      setRecentAssignments(assignRes.data);
      setHealth(healthRes.data);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      if (mounted) setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  /* Fallback if data fetch failed or returned nothing */
  if (!stats) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>No dashboard data available. The system might be initializing.</p>
        <button onClick={() => window.location.reload()} className="mt-4 text-blue-600 hover:underline">
          Refresh Page
        </button>
      </div>
    );
  }

  // Use slate-based colors for charts
  const assetStatusChart = {
    labels: stats?.assetsByStatus?.map(item => item.status) || [],
    datasets: [{
      label: 'Assets by Status',
      data: stats?.assetsByStatus?.map(item => item.count) || [],
      backgroundColor: [
        '#10b981', // Emerald 500
        '#3b82f6', // Blue 500
        '#f59e0b', // Amber 500
        '#ef4444', // Red 500
        '#8b5cf6'  // Violet 500
      ],
      borderWidth: 0
    }]
  };

  const assetTypeChart = {
    labels: stats?.assetsByType?.map(item => item._id) || [],
    datasets: [{
      label: 'Assets by Type',
      data: stats?.assetsByType?.map(item => item.count) || [],
      backgroundColor: '#3b82f6',
      borderRadius: 4
    }]
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Executive Overview</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Real-time insights into your asset inventory</p>
        </div>

        {/* System Health Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700">
          <div className={`w-2.5 h-2.5 rounded-full ${health?.status === 'healthy' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
            System {health?.status === 'healthy' ? 'Online' : 'Issues'}
          </span>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Assets" value={stats?.totalAssets || 0} icon={<Icons.Asset />} to="/assets" />
        <StatCard label="Assigned" value={stats?.assignedAssets || 0} icon={<Icons.Upload />} color="blue" to="/assets?status=assigned" />
        <StatCard label="Available" value={stats?.availableAssets || 0} icon={<Icons.Check />} color="emerald" to="/assets?status=available" />
        <StatCard label="Service Request" value={stats?.maintenanceAssets || 0} icon={<Icons.Wrench />} color="amber" to="/assets?status=in_maintenance" />
      </div>

      {/* Secondary KPI Grid */}
      {user?.role !== 'employee' && (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total Employees" value={stats?.totalEmployees || 0} icon={<Icons.Person />} color="slate" to="/employees" />
        <StatCard label="Active Personnel" value={stats?.activeEmployees || 0} icon={<Icons.Check />} color="emerald" to="/employees" />
        <StatCard label="Registered Users" value={stats?.totalUsers || 0} icon={<Icons.Person />} color="indigo" to="/users" />
      </div>
      )}

      {/* Depreciation Section */}
      {depreciation && user?.role !== 'employee' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <span className="w-1 h-4 bg-blue-600 rounded-full"></span>
            Financial Valuation
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Acquisition Cost</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {settings?.currency || 'USD'} {depreciation.totalPurchaseValue?.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Current Book Value</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {settings?.currency || 'USD'} {depreciation.totalCurrentValue?.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Total Depreciation</p>
              <p className="text-2xl font-bold text-red-600 tracking-tight">
                {settings?.currency || 'USD'} {depreciation.totalDepreciation?.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Value Retained</p>
              <p className="text-2xl font-bold text-amber-600 tracking-tight">
                {100 - depreciation.depreciationPercentage}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-6">Inventory Status Distribution</h2>
          <div className="h-64 flex justify-center">
            <Doughnut data={assetStatusChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-6">Asset Composition</h2>
          <div className="h-64">
            <Bar data={assetTypeChart} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Recent Assignments</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-950">
              <tr>
                <th className="text-left py-3 px-6 font-semibold text-slate-600 dark:text-slate-400">Asset</th>
                <th className="text-left py-3 px-6 font-semibold text-slate-600 dark:text-slate-400">Employee</th>
                <th className="text-left py-3 px-6 font-semibold text-slate-600 dark:text-slate-400">Status</th>
                <th className="text-left py-3 px-6 font-semibold text-slate-600 dark:text-slate-400">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentAssignments.slice(0, 5).map(assignment => (
                <tr key={assignment._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-6 text-slate-900 dark:text-slate-200 font-medium">{assignment.asset?.name}</td>
                  <td className="py-3 px-6 text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                        {assignment.employee?.firstName?.charAt(0)}
                      </div>
                      {assignment.employee?.firstName} {assignment.employee?.lastName}
                    </div>
                  </td>
                  <td className="py-3 px-6">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${assignment.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                      {assignment.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-6 text-slate-500 dark:text-slate-400 font-mono text-xs">
                    {new Date(assignment.assignedDate).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon, color = 'slate', to }) => {
  const styles = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  };

  const Content = (
    <div className={`bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 flex items-start justify-between hover:shadow-md transition-shadow ${to ? 'cursor-pointer' : ''}`}>
      <div>
        <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wide">{label}</p>
        <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1 tracking-tight">{value}</p>
      </div>
      <div className={`p-3 rounded-lg ${styles[color] || styles.slate}`}>
        {icon}
      </div>
    </div>
  );

  return to ? <Link to={to} className="block">{Content}</Link> : Content;
};

export default Dashboard;
