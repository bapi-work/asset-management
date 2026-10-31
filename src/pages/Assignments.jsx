import React, { useState, useEffect, useMemo } from 'react';
import { formatDate } from '../utils/date';
import axios from 'axios';

const Assignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'active',
    location: '',
    ackStatus: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({
    key: 'assignedDate',
    direction: 'desc'
  });
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    asset: '',
    employee: '',
    assignedDate: new Date().toISOString().split('T')[0],
    acknowledgementForm: '',
    notes: ''
  });
  const [editingAckId, setEditingAckId] = useState(null);
  const [editingAckValue, setEditingAckValue] = useState('');
  const [returnData, setReturnData] = useState({});
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchData();
  }, [filters.status]);

  const fetchData = async () => {
    try {
      const statusParam = filters.status ? `?status=${filters.status}` : '';
      const [assignRes, assetRes, empRes, locRes] = await Promise.all([
        axios.get(`/api/assignments${statusParam}`),
        axios.get('/api/assets?status=available'),
        axios.get('/api/employees'),
        axios.get('/api/locations')
      ]);

      setAssignments(assignRes.data);
      setAssets(assetRes.data);
      setEmployees(empRes.data);
      setLocations(locRes.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getAssignmentLocation = (assignment) => {
    return (
      assignment.asset?.location?.name ||
      assignment.employee?.location?.name ||
      assignment.employeeSnapshot?.locationName ||
      'Unassigned Location'
    );
  };

  const getAssignmentAckForm = (assignment) => {
    const val = (assignment.acknowledgementForm || assignment.asset?.acknowledgementForm || '').trim();
    return val;
  };

  const isAckFormSubmitted = (val) => {
    if (!val) return false;
    const lower = val.toLowerCase();
    return !['none', 'na', 'n/a', '-', 'no', 'pending', 'not signed', 'unsigned'].includes(lower);
  };

  const getEmployeeDisplay = (assignment) => {
    const emp = assignment.employee || assignment.employeeSnapshot || {};
    const empId = emp.employeeId || assignment.employeeSnapshot?.employeeId || '';
    const firstName = emp.firstName || assignment.employeeSnapshot?.firstName || '';
    const lastName = emp.lastName || assignment.employeeSnapshot?.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim() || 'Exited Employee';
    const label = empId ? `${empId} - ${fullName}` : fullName;
    const isExited = Boolean(emp.isExited || assignment.employeeSnapshot?.isExited);
    return { label, fullName, empId, isExited };
  };

  // Location summary counts for Test Case 4 (Assigned Asset details based on location)
  const locationSummary = useMemo(() => {
    const counts = {};
    locations.forEach(loc => {
      if (loc.name) counts[loc.name] = 0;
    });
    assignments.forEach(a => {
      const locName = getAssignmentLocation(a);
      counts[locName] = (counts[locName] || 0) + 1;
    });
    return Object.entries(counts)
      .filter(([locName, count]) => count > 0 || locations.some(l => l.name === locName))
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [assignments, locations]);

  // Distinct location options for dropdown
  const locationOptions = useMemo(() => {
    const set = new Set();
    locations.forEach(l => {
      if (l.name) set.add(l.name);
    });
    assignments.forEach(a => {
      const loc = getAssignmentLocation(a);
      if (loc && loc !== 'Unassigned Location') set.add(loc);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [locations, assignments]);

  // Filtered & sorted assignments
  const filteredAndSortedAssignments = useMemo(() => {
    const searchLower = searchQuery.trim().toLowerCase();

    const filtered = assignments.filter(a => {
      const locName = getAssignmentLocation(a);
      const ackVal = getAssignmentAckForm(a);
      const { label: empLabel, fullName } = getEmployeeDisplay(a);

      if (filters.location && locName.toLowerCase() !== filters.location.toLowerCase()) {
        return false;
      }

      if (filters.ackStatus === 'submitted' && !isAckFormSubmitted(ackVal)) {
        return false;
      }
      if (filters.ackStatus === 'pending' && isAckFormSubmitted(ackVal)) {
        return false;
      }

      if (searchLower) {
        const assetTag = (a.asset?.assetTag || '').toLowerCase();
        const assetName = (a.asset?.name || '').toLowerCase();
        const locLower = locName.toLowerCase();
        const ackLower = ackVal.toLowerCase();
        return (
          empLabel.toLowerCase().includes(searchLower) ||
          fullName.toLowerCase().includes(searchLower) ||
          assetTag.includes(searchLower) ||
          assetName.includes(searchLower) ||
          locLower.includes(searchLower) ||
          ackLower.includes(searchLower)
        );
      }

      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortConfig.key === 'assignedDate') {
        const timeA = a.assignedDate ? new Date(a.assignedDate).getTime() : 0;
        const timeB = b.assignedDate ? new Date(b.assignedDate).getTime() : 0;
        return sortConfig.direction === 'asc' ? timeA - timeB : timeB - timeA;
      }

      const getVal = (item, key) => {
        switch (key) {
          case 'assetTag':
            return (item.asset?.assetTag || '').toLowerCase();
          case 'assetModel':
            return (item.asset?.name || '').toLowerCase();
          case 'employee':
            return getEmployeeDisplay(item).label.toLowerCase();
          case 'location':
            return getAssignmentLocation(item).toLowerCase();
          case 'acknowledgementForm':
            return getAssignmentAckForm(item).toLowerCase();
          case 'status':
            return (item.status || '').toLowerCase();
          default:
            return '';
        }
      };

      const valA = getVal(a, sortConfig.key);
      const valB = getVal(b, sortConfig.key);
      const cmp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
      return sortConfig.direction === 'asc' ? cmp : -cmp;
    });

    return sorted;
  }, [assignments, filters, searchQuery, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <span className="ml-1 text-slate-400 opacity-60">↕</span>;
    }
    return <span className="ml-1 text-blue-500 font-bold">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  const handleAssignAsset = async (e) => {
    e.preventDefault();
    if (!formData.acknowledgementForm || !formData.acknowledgementForm.trim()) {
      alert('Laptop Acknowledgement Form field is mandatory.');
      return;
    }
    try {
      const response = await axios.post('/api/assignments', formData);
      setAssignments([response.data, ...assignments]);
      setShowForm(false);
      setFormData({
        asset: '',
        employee: '',
        assignedDate: new Date().toISOString().split('T')[0],
        acknowledgementForm: '',
        notes: ''
      });
      fetchData();
    } catch (err) {
      console.error('Failed to assign asset:', err);
      alert(err.response?.data?.message || 'Failed to assign asset');
    }
  };

  const handleSaveAckForm = async (assignmentId) => {
    if (!editingAckValue || !editingAckValue.trim()) {
      alert('Laptop Acknowledgement Form is mandatory.');
      return;
    }
    try {
      const response = await axios.put(`/api/assignments/${assignmentId}`, {
        acknowledgementForm: editingAckValue.trim()
      });
      setAssignments(assignments.map(a => a._id === assignmentId ? response.data : a));
      setEditingAckId(null);
      setEditingAckValue('');
    } catch (err) {
      console.error('Failed to update acknowledgement form:', err);
      alert(err.response?.data?.message || 'Failed to update acknowledgement form');
    }
  };

  const handleReturnAsset = async (assignmentId) => {
    try {
      const response = await axios.post(`/api/assignments/${assignmentId}/return`, returnData[assignmentId] || {});
      setAssignments(assignments.map(a => a._id === assignmentId ? response.data : a));
      setReturnData({ ...returnData, [assignmentId]: {} });
      fetchData();
    } catch (err) {
      console.error('Failed to return asset:', err);
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to delete this assignment?')) return;
    try {
      await axios.delete(`/api/assignments/${assignmentId}`);
      setAssignments(assignments.filter(a => a._id !== assignmentId));
    } catch (err) {
      console.error('Failed to delete assignment:', err);
      alert('Failed to delete assignment');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Asset Tag', 'Asset Model', 'Employee', 'Location', 'Laptop Acknowledgement Form', 'Status', 'Assigned Date'];
    const csvContent = [
      headers.join(','),
      ...filteredAndSortedAssignments.map(a => [
        a.asset?.assetTag || '',
        a.asset?.name || '',
        getEmployeeDisplay(a).label,
        getAssignmentLocation(a),
        getAssignmentAckForm(a) || 'Pending',
        a.status || '',
        a.assignedDate ? formatDate(a.assignedDate) : ''
      ].map(field => `"${(field || '').toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `assignments_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const hasActiveFilters = Boolean(searchQuery || filters.location || filters.ackStatus || filters.status !== 'active');

  if (loading) {
    return <div className="p-6">Loading assignments...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Assignments</h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
          {['admin', 'manager'].includes(user?.role) && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + New Assignment
            </button>
          )}
        </div>
      </div>

      {/* Assigned Assets by Location Summary Bar (Test Case 4) */}
      {locationSummary.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Assigned Asset Details Based on Location
            </h3>
            {filters.location && (
              <button
                type="button"
                onClick={() => setFilters({ ...filters, location: '' })}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Show All Locations
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilters({ ...filters, location: '' })}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 border ${
                !filters.location
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>All Locations</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[11px] ${!filters.location ? 'bg-blue-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'}`}>
                {assignments.length}
              </span>
            </button>
            {locationSummary.map(([locName, count]) => {
              const isSelected = filters.location.toLowerCase() === locName.toLowerCase();
              return (
                <button
                  key={locName}
                  type="button"
                  onClick={() => setFilters({ ...filters, location: isSelected ? '' : locName })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 border ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{locName}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[11px] ${isSelected ? 'bg-blue-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters & Sort Controls (Test Cases 2 & 4) */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-4 flex flex-wrap gap-3 items-center">
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="returned">Returned</option>
          <option value="lost">Lost</option>
        </select>

        <select
          value={filters.location}
          onChange={(e) => setFilters({ ...filters, location: e.target.value })}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
        >
          <option value="">All Locations</option>
          {locationOptions.map(locName => (
            <option key={locName} value={locName}>{locName}</option>
          ))}
        </select>

        <select
          value={filters.ackStatus}
          onChange={(e) => setFilters({ ...filters, ackStatus: e.target.value })}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
        >
          <option value="">All Ack Forms</option>
          <option value="submitted">Ack Form: Signed / Submitted</option>
          <option value="pending">Ack Form: Pending / Missing</option>
        </select>

        <input
          type="text"
          placeholder="Search by Employee, Asset Tag, Model, Location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white flex-1 min-w-[220px]"
        />

        <div className="flex items-center gap-2">
          <select
            value={sortConfig.key}
            onChange={(e) => setSortConfig({ ...sortConfig, key: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
            title="Sort By"
          >
            <option value="assignedDate">Sort: Date</option>
            <option value="assetTag">Sort: Asset Tag</option>
            <option value="assetModel">Sort: Asset Model</option>
            <option value="employee">Sort: Employee</option>
            <option value="location">Sort: Location</option>
            <option value="acknowledgementForm">Sort: Ack Form</option>
            <option value="status">Sort: Status</option>
          </select>
          <button
            type="button"
            onClick={() => setSortConfig(prev => ({ ...prev, direction: prev.direction === 'asc' ? 'desc' : 'asc' }))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-slate-50 dark:bg-gray-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 text-sm font-medium whitespace-nowrap"
            title="Toggle Sort Direction"
          >
            {sortConfig.direction === 'asc' ? '↑ Asc' : '↓ Desc'}
          </button>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setFilters({ status: 'active', location: '', ackStatus: '' });
              setSearchQuery('');
            }}
            className="px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:underline whitespace-nowrap"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Create Assignment Form (Test Case 2: Laptop Acknowledgement Form is mandatory) */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Assign Asset to Employee</h2>
          <form onSubmit={handleAssignAsset} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Asset *</label>
              <select
                value={formData.asset}
                onChange={(e) => {
                  const selectedAsset = assets.find(a => a._id === e.target.value);
                  setFormData({
                    ...formData,
                    asset: e.target.value,
                    acknowledgementForm: selectedAsset?.acknowledgementForm || formData.acknowledgementForm || 'Signed'
                  });
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="">Select Asset</option>
                {assets.map(asset => (
                  <option key={asset._id} value={asset._id}>
                    {asset.assetTag} - {asset.name} {asset.location?.name ? `(${asset.location.name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Employee *</label>
              <select
                value={formData.employee}
                onChange={(e) => setFormData({ ...formData, employee: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="">Select Employee</option>
                {employees.map(emp => (
                  <option key={emp._id} value={emp._id}>
                    {emp.employeeId ? `${emp.employeeId} - ` : ''}{emp.firstName} {emp.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Assigned Date *</label>
              <input
                type="date"
                value={formData.assignedDate}
                onChange={(e) => setFormData({ ...formData, assignedDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                Laptop Acknowledgement Form * <span className="text-red-500">(Mandatory)</span>
              </label>
              <input
                type="text"
                list="ack-form-options"
                placeholder="e.g., Signed, Submitted, Form URL / Ref No."
                value={formData.acknowledgementForm}
                onChange={(e) => setFormData({ ...formData, acknowledgementForm: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                required
              />
              <datalist id="ack-form-options">
                <option value="Signed" />
                <option value="Submitted" />
                <option value="Received" />
                <option value="Verified" />
                <option value="Yes" />
              </datalist>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notes (optional)"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                rows="2"
              />
            </div>

            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Assign Asset
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 py-2 px-4 bg-gray-300 text-gray-900 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Assignments Table */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th
                  onClick={() => handleSort('assetTag')}
                  className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap cursor-pointer select-none"
                >
                  Asset {renderSortIcon('assetTag')}
                </th>
                <th
                  onClick={() => handleSort('assetModel')}
                  className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap cursor-pointer select-none"
                >
                  Model {renderSortIcon('assetModel')}
                </th>
                <th
                  onClick={() => handleSort('employee')}
                  className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap cursor-pointer select-none"
                >
                  Employee {renderSortIcon('employee')}
                </th>
                <th
                  onClick={() => handleSort('location')}
                  className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap cursor-pointer select-none"
                >
                  Location {renderSortIcon('location')}
                </th>
                <th
                  onClick={() => handleSort('acknowledgementForm')}
                  className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap cursor-pointer select-none"
                >
                  Laptop Ack. Form * {renderSortIcon('acknowledgementForm')}
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap cursor-pointer select-none"
                >
                  Status {renderSortIcon('status')}
                </th>
                <th
                  onClick={() => handleSort('assignedDate')}
                  className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap cursor-pointer select-none"
                >
                  Date {renderSortIcon('assignedDate')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredAndSortedAssignments.map(assignment => {
                const { label: empLabel, isExited } = getEmployeeDisplay(assignment);
                const locName = getAssignmentLocation(assignment);
                const ackFormVal = getAssignmentAckForm(assignment);
                const ackSubmitted = isAckFormSubmitted(ackFormVal);

                return (
                  <tr key={assignment._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-3 text-gray-900 dark:text-gray-100 font-medium whitespace-nowrap">
                      {assignment.asset?.assetTag || '-'}
                    </td>
                    <td className="px-6 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {assignment.asset?.name || '-'}
                    </td>
                    <td className="px-6 py-3 text-gray-900 dark:text-gray-100 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span>{empLabel}</span>
                        {isExited && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                            Exited
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                        {locName}
                      </span>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      {editingAckId === assignment._id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            list="ack-form-options"
                            value={editingAckValue}
                            onChange={(e) => setEditingAckValue(e.target.value)}
                            placeholder="Signed / Ref..."
                            className="px-2 py-1 text-xs border border-blue-400 rounded dark:bg-slate-800 dark:text-white w-28"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveAckForm(assignment._id)}
                            className="px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => { setEditingAckId(null); setEditingAckValue(''); }}
                            className="px-2 py-1 text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              ackSubmitted
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                            }`}
                          >
                            {ackFormVal || 'Pending (Required)'}
                          </span>
                          {['admin', 'manager'].includes(user?.role) && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingAckId(assignment._id);
                                setEditingAckValue(ackFormVal || 'Signed');
                              }}
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                              title="Update Laptop Acknowledgement Form"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        assignment.status === 'active' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                        assignment.status === 'returned' ? 'bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-slate-300' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {assignment.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {formatDate(assignment.assignedDate)}
                    </td>
                    <td className="px-6 py-3 flex gap-2 whitespace-nowrap">
                      {assignment.status === 'active' && ['admin', 'manager'].includes(user?.role) && (
                        <button
                          onClick={() => handleReturnAsset(assignment._id)}
                          className="text-orange-600 hover:text-orange-800 text-sm font-medium mr-3"
                        >
                          Return
                        </button>
                      )}
                      {['admin', 'manager'].includes(user?.role) && (
                        <button
                          onClick={() => handleDeleteAssignment(assignment._id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredAndSortedAssignments.length === 0 && (
            <div className="text-center py-10 text-slate-500 dark:text-slate-400">
              No assignments found matching your filters.
            </div>
          )}
        </div>
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400">
          Showing {filteredAndSortedAssignments.length} of {assignments.length} assignment{assignments.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
};

export default Assignments;
