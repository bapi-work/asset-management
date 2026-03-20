import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';

import ImportModal from '../components/ImportModal';

const Assets = () => {
  const [assets, setAssets] = useState([]);
  const [locations, setLocations] = useState([]);
  const [assetTypes, setAssetTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const locationUrl = useLocation();
  const [filters, setFilters] = useState(() => {
    const params = new URLSearchParams(locationUrl.search);
    return {
      status: params.get('status') || '',
      type: params.get('type') || '',
      search: params.get('search') || ''
    };
  });
  const [showForm, setShowForm] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    assetTag: '',
    name: '',
    type: '',
    serialNumber: '',
    manufacturer: '',
    model: '',
    purchasePrice: '',
    purchaseDate: '',
    vendor: '',
    location: '',
    // New Fields
    priority: '',
    expressServiceCode: '',
    adapterSerialNumber: '',
    processor: '',
    ram: '',
    storage: '',
    laptopAssignedDate: '',
    license: '',
    acknowledgementForm: '',
    oldLoaner: '',
    supplierName: '',
    invoiceDate: '',
    invoiceNo: '',
    warrantyExpiry: '',
    warrantyProvider: '',
    warrantyStatus: 'inactive',
    photoUrl: ''
  });
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const params = new URLSearchParams(locationUrl.search);
    setFilters(prev => ({
      ...prev,
      status: params.get('status') || '',
      type: params.get('type') || '',
      search: params.get('search') || prev.search
    }));
  }, [locationUrl.search]);

  useEffect(() => {
    fetchAssets();
    fetchLocations();
    fetchAssetTypes();
  }, [filters]);

  const fetchAssets = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.type) queryParams.append('type', filters.type);
      if (filters.search) queryParams.append('search', filters.search);

      const response = await axios.get(`/api/assets?${queryParams}`);
      setAssets(response.data);
    } catch (err) {
      console.error('Failed to fetch assets:', err);
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

  const fetchAssetTypes = async () => {
    try {
      const response = await axios.get('/api/asset-types');
      setAssetTypes(response.data);
      if (response.data.length > 0 && !formData.type) {
        setFormData(prev => ({ ...prev, type: response.data[0].name }));
      }
    } catch (err) {
      console.error('Failed to fetch asset types:', err);
    }
  };

  const handleCreateAsset = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/assets', formData);
      setAssets([response.data, ...assets]);
      setShowForm(false);
      setFormData({
        assetTag: '',
        name: '',
        type: assetTypes.length > 0 ? assetTypes[0].name : '',
        serialNumber: '',
        manufacturer: '',
        model: '',
        purchasePrice: '',
        purchaseDate: '',
        vendor: '',
        location: '',
        priority: '',
        expressServiceCode: '',
        adapterSerialNumber: '',
        processor: '',
        ram: '',
        storage: '',
        laptopAssignedDate: '',
        license: '',
        acknowledgementForm: '',
        oldLoaner: '',
        supplierName: '',
        invoiceDate: '',
        invoiceNo: '',
        warrantyExpiry: '',
        warrantyProvider: '',
        warrantyStatus: 'inactive',
        photoUrl: ''
      });
      // Refresh assets to show newly created one
      fetchAssets();
    } catch (err) {
      console.error('Failed to create asset:', err);
      alert('Failed to create asset. Please check required fields.');
    }
  };

  const handleDeleteAsset = async (id) => {
    if (window.confirm('Are you sure you want to delete this asset?')) {
      try {
        await axios.delete(`/api/assets/${id}`);
        setAssets(assets.filter(a => a._id !== id));
      } catch (err) {
        console.error('Failed to delete asset:', err);
      }
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Asset Tag', 'Asset Model', 'Type', 'Status', 'Location', 'Serial Number',
      'Processor', 'RAM', 'Storage',
      'Purchase Price', 'Manufacturer', 'Vendor', 'Supplier Name', 'Invoice Date', 'Invoice No',
      'Employee ID', 'Assigned To', 'Assigned Employee Email', 'Assigned Employee Department', 'Assigned Employee Designation', 'Company/Client', 'Mobile Number', 'Internal Mail ID', 'Client Mail ID',
      'Priority', 'Express Service Code', 'Adapter S/N',
      'Assigned Date', 'License', 'Acknowledgement Form', 'Old Loaner',
      'Warranty Expiry', 'Warranty Provider'
    ];

    const csvContent = [
      headers.join(','),
      ...assets.map(asset => [
        asset.assetTag, asset.name, asset.type, asset.status, asset.location?.name || '', asset.serialNumber,
        asset.processor, asset.ram, asset.storage,
        asset.purchasePrice, asset.manufacturer, asset.vendor, asset.supplierName,
        asset.invoiceDate ? new Date(asset.invoiceDate).toLocaleDateString() : '', asset.invoiceNo,
        asset.assignedTo?.employeeId || asset.employeeId || '',
        asset.assignedTo ? `${asset.assignedTo.firstName || ''} ${asset.assignedTo.lastName || ''}`.trim() : '',
        asset.assignedTo?.email || '',
        asset.assignedTo?.department || '',
        asset.assignedTo?.designation || '',
        asset.companyClient, asset.mobileNumber, asset.internalMailId, asset.clientMailId,
        asset.priority, asset.expressServiceCode, asset.adapterSerialNumber,
        asset.laptopAssignedDate ? new Date(asset.laptopAssignedDate).toLocaleDateString() : '',
        asset.license, asset.acknowledgementForm, asset.oldLoaner,
        asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toLocaleDateString() : '', asset.warrantyProvider
      ].map(field => `"${(field || '').toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `assets_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };


  const formatCurrency = (value, currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(value || 0);
  };

  const templateFields = {
    assetTag: 'TAG-001',
    name: 'MacBook Pro',
    manufacturer: 'Apple',
    type: 'hardware',
    serialNumber: 'SN123456',
    purchasePrice: '1999',
    vendor: 'Apple',
    location: 'Headquarters',
    priority: 'High',
    employeeId: 'EMP001',
    companyClient: 'Client A',
    mobileNumber: '1234567890',
    internalMailId: 'it@company.com',
    clientMailId: 'user@client.com',
    expressServiceCode: '987654',
    adapterSerialNumber: 'ADP-SN-123',
    processor: 'M2 Max',
    ram: '64GB',
    storage: '2TB SSD',
    laptopAssignedDate: '2024-01-01',
    license: 'Win11 Pro',
    acknowledgementForm: 'Signed',
    oldLoaner: 'None',
    supplierName: 'Apple Store',
    invoiceDate: '2023-12-01',
    invoiceNo: 'INV-12345',
    warrantyProvider: 'AppleCare',
    warrantyExpiry: '2025-01-01'
  };

  if (loading) {
    return <div className="p-6">Loading assets...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Assets</h1>
        {['admin', 'manager'].includes(user?.role) && (
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </button>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Import CSV
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
            >
              + New Asset
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-4 flex gap-4 flex-wrap">
        <input
          type="text"
          placeholder="Search assets..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="flex-1 min-w-200 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white outline-none"
        >
          <option value="">All Statuses</option>
          <option value="available">Available</option>
          <option value="assigned">Assigned</option>
          <option value="in_maintenance">Service Request</option>
          <option value="retired">Retired</option>
          <option value="lost">Lost</option>
        </select>
        <select
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white outline-none"
        >
          <option value="">All Types</option>
          {assetTypes.map(type => (
            <option key={type._id} value={type.name}>{type.name}</option>
          ))}
        </select>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6 animate-fade-in">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Create New Asset</h2>
          <form onSubmit={handleCreateAsset} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Asset Tag"
              value={formData.assetTag}
              onChange={(e) => setFormData({ ...formData, assetTag: e.target.value })}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
              required
            />
            <div className="flex flex-col">
              <input
                type="text"
                placeholder="Asset Model (Name)"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
                required
              />
              <span className="text-[10px] text-slate-400 ml-1">Example: Dell Latitude 5420</span>
            </div>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
            >
              {assetTypes.map(type => (
                <option key={type._id} value={type.name}>{type.name}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Serial Number"
              value={formData.serialNumber}
              onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
            />
            <input
              type="text"
              placeholder="Manufacturer"
              value={formData.manufacturer}
              onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
            />
            <input
              type="text"
              placeholder="Model No."
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
            />
            <input
              type="date"
              value={formData.purchaseDate}
              onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
            />
            <input
              type="number"
              placeholder="Purchase Price"
              value={formData.purchasePrice}
              onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
            />
            <input
              type="text"
              placeholder="Vendor"
              value={formData.vendor}
              onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
            />
            <select
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
            >
              <option value="">Select Location</option>
              {locations.map(loc => (
                <option key={loc._id} value={loc._id}>{loc.name} ({loc.currency})</option>
              ))}
            </select>

            <div className="md:col-span-2 border-t border-slate-200 dark:border-slate-800 pt-4 mt-2">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Specifications & Details</h3>
            </div>

            <input
              type="text"
              placeholder="Priority"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
            />
            <input
              type="text"
              placeholder="Express Service Code"
              value={formData.expressServiceCode}
              onChange={(e) => setFormData({ ...formData, expressServiceCode: e.target.value })}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
            />
            <input
              type="text"
              placeholder="Adapter S/N"
              value={formData.adapterSerialNumber}
              onChange={(e) => setFormData({ ...formData, adapterSerialNumber: e.target.value })}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
            />
            <input
              type="text"
              placeholder="Processor"
              value={formData.processor}
              onChange={(e) => setFormData({ ...formData, processor: e.target.value })}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
            />
            <input
              type="text"
              placeholder="RAM"
              value={formData.ram}
              onChange={(e) => setFormData({ ...formData, ram: e.target.value })}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
            />
            <input
              type="text"
              placeholder="Storage"
              value={formData.storage}
              onChange={(e) => setFormData({ ...formData, storage: e.target.value })}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
            />
            <div className="flex flex-col">
              <label className="text-xs text-slate-500 ml-1 mb-1">Laptop Assigned Date</label>
              <input
                type="date"
                value={formData.laptopAssignedDate}
                onChange={(e) => setFormData({ ...formData, laptopAssignedDate: e.target.value })}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
              />
            </div>
            <input
              type="text"
              placeholder="License"
              value={formData.license}
              onChange={(e) => setFormData({ ...formData, license: e.target.value })}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
            />
            <input
              type="text"
              placeholder="Acknowledgement Form"
              value={formData.acknowledgementForm}
              onChange={(e) => setFormData({ ...formData, acknowledgementForm: e.target.value })}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
            />
            <input
              type="text"
              placeholder="Old Loaner Info"
              value={formData.oldLoaner}
              onChange={(e) => setFormData({ ...formData, oldLoaner: e.target.value })}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
            />
            <input
              type="text"
              placeholder="Supplier Name"
              value={formData.supplierName}
              onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
            />
            <div className="flex flex-col">
              <label className="text-xs text-slate-500 ml-1 mb-1">Invoice Date</label>
              <input
                type="date"
                value={formData.invoiceDate}
                onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
              />
            </div>
            <input
              type="text"
              placeholder="Invoice No"
              value={formData.invoiceNo}
              onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
            />

            <div className="md:col-span-2 border-t border-slate-200 dark:border-slate-800 pt-4 mt-2">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Warranty & Media</h3>
            </div>
            <input
              type="text"
              placeholder="Warranty Provider"
              value={formData.warrantyProvider}
              onChange={(e) => setFormData({ ...formData, warrantyProvider: e.target.value })}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
            />
            <div className="flex flex-col">
              <label className="text-xs text-slate-500 ml-1 mb-1">Warranty Expiry Date</label>
              <input
                type="date"
                value={formData.warrantyExpiry}
                onChange={(e) => setFormData({ ...formData, warrantyExpiry: e.target.value })}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
              />
            </div>
            <select
              value={formData.warrantyStatus || 'inactive'}
              onChange={(e) => setFormData({ ...formData, warrantyStatus: e.target.value })}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
            >
              <option value="active">Warranty Active</option>
              <option value="inactive">Warranty Inactive</option>
            </select>
            <input
              type="text"
              placeholder="Main Photo URL"
              value={formData.photoUrl}
              onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white md:col-span-2"
            />

            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Create Asset
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 py-2 px-4 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Assets Table */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-950">
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Asset Tag</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Asset Model</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Type</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Location</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Value</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Warranty</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {assets.map(asset => (
                <tr key={asset._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 text-slate-900 dark:text-white font-medium whitespace-nowrap">{asset.assetTag}</td>
                  <td className="px-6 py-4 text-slate-700 dark:text-slate-200 whitespace-nowrap">{asset.name}</td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm capitalize whitespace-nowrap">{asset.type?.replace('_', ' ')}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${asset.status === 'available' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      asset.status === 'assigned' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                        asset.status === 'in_maintenance' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                          'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                      {asset.status === 'in_maintenance' ? 'SERVICE REQUEST' : asset.status?.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm whitespace-nowrap">
                    {asset.location?.name || '-'}
                  </td>
                  <td className="px-6 py-4 text-slate-900 dark:text-white font-medium whitespace-nowrap">
                    {formatCurrency(asset.currentValue || asset.purchasePrice, asset.location?.currency)}
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm whitespace-nowrap">
                    {asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toLocaleDateString() : (asset.warrantyStatus === 'active' ? 'Active' : '-')}
                  </td>
                  <td className="px-6 py-4 flex gap-3 whitespace-nowrap">
                    <button
                      onClick={() => navigate(`/assets/${asset._id}`)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                    >
                      View
                    </button>
                    {['admin', 'manager'].includes(user?.role) && (
                      <button
                        onClick={() => handleDeleteAsset(asset._id)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {assets.length === 0 && (
            <div className="text-center py-10 text-slate-500 dark:text-slate-400">
              No assets found. Upload a CSV or create one manually.
            </div>
          )}
        </div>
      </div>

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Assets"
        apiEndpoint="/api/assets/import/csv"
        onSuccess={fetchAssets}
        templateFields={templateFields}
      />
    </div>
  );
};

export default Assets;
