import React, { useState, useEffect } from 'react';
import axios from 'axios';

import ImportModal from '../components/ImportModal';

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filters, setFilters] = useState({ department: '', search: '' });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [formData, setFormData] = useState({
    employeeId: '',
    firstName: '',
    lastName: '',
    email: '',
    department: '',
    designation: '',
    employmentType: 'full_time',
    location: '',
    phone: '',
    costCenter: '',
    createLoginAccess: false,
    username: '',
    password: ''
  });
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchEmployees();
    fetchLocations();
  }, [filters]);

  const fetchEmployees = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.department) queryParams.append('department', filters.department);
      if (filters.search) queryParams.append('search', filters.search);

      const response = await axios.get(`/api/employees?${queryParams}`);
      setEmployees(response.data);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await axios.get('/api/locations');
      setLocations(response.data);
    } catch (err) {
      console.error('Failed to fetch locations:', err);
    }
  };

  const handleSubmitRaw = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Basic validation
      if (!formData.location) {
        alert('Please select a location');
        setSubmitting(false);
        return;
      }

      if (editingId) {
        const response = await axios.put(`/api/employees/${editingId}`, formData);
        setEmployees(employees.map(emp => emp._id === editingId ? response.data : emp));
      } else {
        const response = await axios.post('/api/employees', formData);
        setEmployees([response.data, ...employees]);
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({
        employeeId: '',
        firstName: '',
        lastName: '',
        email: '',
        department: '',
        designation: '',
        employmentType: 'full_time',
        location: '',
        phone: '',
        costCenter: '',
        createLoginAccess: false,
        username: '',
        password: ''
      });
      fetchEmployees(); // Ensure list is fresh
    } catch (err) {
      console.error('Failed to save employee:', err);
      // Detailed error message
      const msg = err.response?.data?.message || err.message || 'Failed to save employee';
      alert(`Error: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (employee) => {
    setFormData({
      employeeId: employee.employeeId || '',
      firstName: employee.firstName || '',
      lastName: employee.lastName || '',
      email: employee.email || '',
      department: employee.department || '',
      designation: employee.designation || '',
      employmentType: employee.employmentType || 'full_time',
      location: employee.location?._id || employee.location || '',
      phone: employee.phone || '',
      costCenter: employee.costCenter || '',
      createLoginAccess: false,
      username: '',
      password: ''
    });
    setEditingId(employee._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;
    try {
      await axios.delete(`/api/employees/${id}`);
      setEmployees(employees.filter(e => e._id !== id));
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete employee: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} employees?`)) return;
    try {
      await Promise.all(selectedIds.map(id => axios.delete(`/api/employees/${id}`)));
      setEmployees(employees.filter(e => !selectedIds.includes(e._id)));
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
      alert('Failed to delete some employees');
      fetchEmployees();
    }
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(employees.map(emp => emp._id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Employee ID', 'First Name', 'Last Name', 'Email', 'Department', 'Designation', 'Type', 'Location'];
    const csvContent = [
      headers.join(','),
      ...employees.map(emp => [
        emp.employeeId,
        emp.firstName,
        emp.lastName,
        emp.email,
        emp.department,
        emp.designation,
        emp.employmentType,
        emp.location?.name || ''
      ].map(field => `"${(field || '').toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `employees_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const templateFields = {
    employeeId: '(Optional) EMP001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    department: 'Engineering',
    designation: 'Senior Developer',
    employmentType: 'full_time',
    location: 'Headquarters'
  };

  if (loading) {
    return <div className="p-6">Loading employees...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center sticky top-0 z-10 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-md p-4 -mt-4 -mx-4 rounded-b-xl shadow-sm border-b border-slate-200 dark:border-slate-800 gap-4">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Employees</h1>
        {['admin', 'manager'].includes(user?.role) && (
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
            {selectedIds.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 border border-red-300 dark:border-red-600 text-red-700 dark:text-red-400 bg-red-50/50 dark:bg-red-900/10 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors flex items-center gap-2"
              >
                Delete Selected ({selectedIds.length})
              </button>
            )}
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Import CSV
            </button>
            <button
              onClick={() => {
                if (!showForm) {
                  setFormData({
                    employeeId: '',
                    firstName: '',
                    lastName: '',
                    email: '',
                    department: '',
                    designation: '',
                    employmentType: 'full_time',
                    location: '',
                    createLoginAccess: false,
                    username: '',
                    password: ''
                  });
                  setEditingId(null);
                }
                setShowForm(!showForm);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
            >
              + New Employee
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-4 flex gap-4 flex-wrap">
        <input
          type="text"
          placeholder="Search employees..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="flex-1 min-w-200 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <input
          type="text"
          placeholder="Department"
          value={filters.department}
          onChange={(e) => setFilters({ ...filters, department: e.target.value })}
          className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6 animate-fade-in w-full max-w-4xl m-auto mt-10 mb-10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{editingId ? 'Edit Employee' : 'Create New Employee'}</h2>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 pointer">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmitRaw} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Employee ID"
              value={formData.employeeId}
              onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
            />
            <input
              type="text"
              placeholder="First Name"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
              required
            />
            <input
              type="text"
              placeholder="Last Name"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
              required
            />
            <input
              type="text"
              placeholder="Department"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
              required
            />
            <input
              type="text"
              placeholder="Designation"
              value={formData.designation}
              onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
            />
            <input
              type="text"
              placeholder="Mobile Number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
            />
            <input
              type="text"
              placeholder="Cost Center"
              value={formData.costCenter}
              onChange={(e) => setFormData({ ...formData, costCenter: e.target.value })}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
            />
            <select
              value={formData.employmentType}
              onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
            >
              <option value="full_time">Full Time</option>
              <option value="part_time">Part Time</option>
              <option value="contractor">Contractor</option>
              <option value="intern">Intern</option>
            </select>
            <select
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
              required
            >
              <option value="">Select Location</option>
              {locations.map(loc => (
                <option key={loc._id} value={loc._id}>{loc.name}</option>
              ))}
            </select>
            
            {/* Create Login Access Section (Only on creation) */}
            {!editingId && (
              <div className="md:col-span-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <label className="flex items-center gap-2 mb-4 cursor-pointer text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={formData.createLoginAccess}
                    onChange={(e) => setFormData({ ...formData, createLoginAccess: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700"
                  />
                  <span className="font-medium text-sm">Create User Login Access</span>
                </label>

                {formData.createLoginAccess && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <input
                      type="text"
                      placeholder="Username for login"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white bg-white focus:ring-2 focus:ring-blue-500"
                      required={formData.createLoginAccess}
                      autoComplete="new-username"
                    />
                    <input
                      type="password"
                      placeholder="Password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white bg-white focus:ring-2 focus:ring-blue-500"
                      required={formData.createLoginAccess}
                      autoComplete="new-password"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {editingId ? 'Update Employee' : 'Create Employee'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingId(null); }}
                className="flex-1 py-2 px-4 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
        </div>
      )}

      {/* Employees Table */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-950">
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-left whitespace-nowrap">
                  <input 
                    type="checkbox" 
                    checked={employees.length > 0 && selectedIds.length === employees.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700"
                  />
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">EMP ID</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Name</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Email</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Department</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Designation</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Type</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {employees.map(employee => (
                <tr key={employee._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(employee._id)}
                      onChange={() => toggleSelect(employee._id)}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-700"
                    />
                  </td>
                  <td className="px-6 py-4 text-slate-900 dark:text-white font-medium whitespace-nowrap">{employee.employeeId || '-'}</td>
                  <td className="px-6 py-4 text-slate-900 dark:text-white font-medium whitespace-nowrap">
                    {employee.firstName} {employee.lastName}
                  </td>
                  <td className="px-6 py-4 text-slate-700 dark:text-slate-300 whitespace-nowrap">{employee.email}</td>
                  <td className="px-6 py-4 text-slate-700 dark:text-slate-300 whitespace-nowrap">{employee.department || '-'}</td>
                  <td className="px-6 py-4 text-slate-700 dark:text-slate-300 whitespace-nowrap">{employee.designation || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                      {employee.employmentType.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex gap-2 whitespace-nowrap">
                    <button onClick={() => handleEdit(employee)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Edit</button>
                    <button onClick={() => handleDelete(employee._id)} className="text-red-600 hover:text-red-800 text-sm font-medium">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {employees.length === 0 && (
            <div className="text-center py-10 text-slate-500 dark:text-slate-400">
              No employees found. Import CSV to get started.
            </div>
          )}
        </div>
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400">
          Showing {employees.length} employee{employees.length !== 1 ? 's' : ''}
        </div>
      </div>

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Employees"
        apiEndpoint="/api/employees/bulk-upload/csv"
        onSuccess={fetchEmployees}
        templateFields={templateFields}
      />
    </div>
  );
};

export default Employees;
