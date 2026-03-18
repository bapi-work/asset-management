import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode.react';

const AssetDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState(null);
  const [assets, setAssets] = useState([]);
  const [locations, setLocations] = useState([]);
  const [assetTypes, setAssetTypes] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState('Overview');
  const [formData, setFormData] = useState({});
  const [newNote, setNewNote] = useState('');
  const [postingNote, setPostingNote] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchAssetDetail();
    fetchAssignmentHistory();
    fetchLocations();
    fetchAssetTypes();
  }, [id]);

  const fetchAssetDetail = async () => {
    try {
      const response = await axios.get(`/api/assets/${id}`);
      setAsset(response.data);
      setFormData(response.data);
    } catch (err) {
      console.error('Failed to fetch asset:', err);
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
    } catch (err) {
      console.error('Failed to fetch asset types:', err);
    }
  };

  const fetchAssignmentHistory = async () => {
    try {
      const response = await axios.get(`/api/assignments/asset/${id}/history`);
      setHistory(response.data);
    } catch (err) {
      console.error('Failed to fetch assignment history:', err);
    }
  };

  const formatCurrency = (value, currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(value || 0);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put(`/api/assets/${id}`, formData);
      setAsset(response.data);
      setEditMode(false);
    } catch (err) {
      console.error('Failed to update asset:', err);
      alert('Failed to update asset');
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || postingNote) return;
    setPostingNote(true);
    try {
      const response = await axios.post(`/api/assets/${id}/notes`, { content: newNote });
      setAsset(response.data);
      setNewNote('');
    } catch (err) {
      console.error('Failed to add note:', err);
    } finally {
      setPostingNote(false);
    }
  };

  const handleMoveToMaintenance = async () => {
    if (!window.confirm('Are you sure you want to move this asset to Service Request?')) return;
    try {
      const response = await axios.put(`/api/assets/${id}`, { status: 'in_maintenance' });
      setAsset(response.data);
      setFormData(response.data);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to delete this assignment?')) return;
    try {
      await axios.delete(`/api/assignments/${assignmentId}`);
      setHistory(history.filter(a => a._id !== assignmentId));
      fetchAssetDetail();
    } catch (err) {
      console.error('Failed to delete assignment:', err);
      alert('Failed to delete assignment');
    }
  };

  const handleServiceStatus = async (status) => {
    try {
      const response = await axios.put(`/api/assets/${id}`, { serviceStatus: status });
      setAsset(response.data);
      setFormData(response.data);
    } catch (err) {
      console.error('Failed to update service status:', err);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading asset details...</div>;
  }

  if (!asset) {
    return <div className="p-6 text-center text-red-600">Asset not found</div>;
  }

  const DetailItem = ({ label, value, color, fullWidth }) => (
    <div className={`space-y-1 overflow-hidden ${fullWidth ? 'col-span-2' : ''}`}>
      <p className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold">{label}</p>
      <p className={`text-base font-semibold break-words whitespace-pre-wrap ${color || 'text-slate-900 dark:text-white'}`}>{value || '-'}</p>
    </div>
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <button
          onClick={() => navigate('/assets')}
          className="text-blue-600 dark:text-blue-400 hover:opacity-80 flex items-center gap-2 group font-medium"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Assets
        </button>
        {['admin', 'manager'].includes(user?.role) && (
          <div className="flex gap-2">
            {!editMode && asset.status !== 'in_maintenance' && (
              <button
                onClick={handleMoveToMaintenance}
                className="px-6 py-2 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-all shadow-sm"
              >
                Move to Service Request
              </button>
            )}
            <button
              onClick={() => setEditMode(!editMode)}
              className={`px-6 py-2 rounded-xl font-bold transition-all shadow-sm ${editMode ? 'bg-slate-200 text-slate-800' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
              {editMode ? 'Cancel Editing' : 'Edit Asset'}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Info Column */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-8">
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Asset Model</p>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white leading-tight">{asset.name}</h1>
                <p className="text-slate-500 font-medium">{asset.serialNumber}</p>
              </div>
              <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${asset.status === 'available' ? 'bg-emerald-100 text-emerald-800' :
                asset.status === 'assigned' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                }`}>
                {asset.status.replace('_', ' ')}
              </span>
            </div>

            {editMode ? (
              <form onSubmit={handleUpdate} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* General Info */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">General</h3>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Asset Tag</label>
                      <input type="text" value={formData.assetTag} onChange={(e) => setFormData({ ...formData, assetTag: e.target.value })} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Asset Model Name</label>
                      <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Type</label>
                      <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
                        {assetTypes.map(type => <option key={type._id} value={type.name}>{type.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Status</label>
                      <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="available">Available</option>
                        <option value="assigned">Assigned</option>
                        <option value="in_maintenance">Service Request</option>
                        <option value="retired">Retired</option>
                        <option value="lost">Lost</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Location</label>
                      <select value={formData.location?._id || formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Select Location</option>
                        {locations.map(loc => <option key={loc._id} value={loc._id}>{loc.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Manufacturer</label>
                      <input type="text" value={formData.manufacturer} onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Model No.</label>
                      <input type="text" value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Serial Number</label>
                      <input type="text" value={formData.serialNumber} onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Priority</label>
                      <input type="text" value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>

                  {/* Specs */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">Specifications</h3>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Processor</label>
                      <input type="text" value={formData.processor} onChange={(e) => setFormData({ ...formData, processor: e.target.value })} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">RAM</label>
                      <input type="text" value={formData.ram} onChange={(e) => setFormData({ ...formData, ram: e.target.value })} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Storage</label>
                      <input type="text" value={formData.storage} onChange={(e) => setFormData({ ...formData, storage: e.target.value })} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Adapter S/N</label>
                      <input type="text" value={formData.adapterSerialNumber} onChange={(e) => setFormData({ ...formData, adapterSerialNumber: e.target.value })} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Express Service</label>
                      <input type="text" value={formData.expressServiceCode} onChange={(e) => setFormData({ ...formData, expressServiceCode: e.target.value })} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>

                  {/* User Details */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">User Details</h3>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Assigned Date</label>
                      <input type="date" value={formData.laptopAssignedDate ? new Date(formData.laptopAssignedDate).toISOString().split('T')[0] : ''} onChange={(e) => setFormData({ ...formData, laptopAssignedDate: e.target.value })} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Previous Owner</label>
                      <input type="text" value={formData.oldLoaner} onChange={(e) => setFormData({ ...formData, oldLoaner: e.target.value })} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Ack Form</label>
                      <input type="text" value={formData.acknowledgementForm} onChange={(e) => setFormData({ ...formData, acknowledgementForm: e.target.value })} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>

                  {/* Purchase & Identity */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">Purchase & Tracking</h3>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Invoice No</label>
                      <input type="text" value={formData.invoiceNo} onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Invoice Date</label>
                      <input type="date" value={formData.invoiceDate ? new Date(formData.invoiceDate).toISOString().split('T')[0] : ''} onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Supplier</label>
                      <input type="text" value={formData.supplierName} onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Vendor</label>
                      <input type="text" value={formData.vendor} onChange={(e) => setFormData({ ...formData, vendor: e.target.value })} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Purchase Price</label>
                      <input type="number" value={formData.purchasePrice} onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">License</label>
                      <input type="text" value={formData.license} onChange={(e) => setFormData({ ...formData, license: e.target.value })} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>

                  {/* Warranty */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">Warranty</h3>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Warranty Expiry</label>
                      <input type="date" value={formData.warrantyExpiry ? new Date(formData.warrantyExpiry).toISOString().split('T')[0] : ''} onChange={(e) => setFormData({ ...formData, warrantyExpiry: e.target.value })} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Warranty Provider</label>
                      <input type="text" value={formData.warrantyProvider || ''} onChange={(e) => setFormData({ ...formData, warrantyProvider: e.target.value })} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Warranty Status</label>
                      <select value={formData.warrantyStatus || 'inactive'} onChange={(e) => setFormData({ ...formData, warrantyStatus: e.target.value })} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  {/* Service Request Tracking Form */}
                  {(formData.status === 'in_maintenance' || formData.damageReason) && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">Service Request Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Repair Type</label>
                          <select value={formData.serviceType || ''} onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Select</option>
                            <option value="OEM">In-Warranty (OEM)</option>
                            <option value="Local">Out-of-Warranty (Local Vendor)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Service Status</label>
                          <select value={formData.serviceStatus || ''} onChange={(e) => setFormData({ ...formData, serviceStatus: e.target.value })} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Select</option>
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-slate-500 mb-1">Damaged Item (e.g., Display, Charger)</label>
                          <input type="text" value={formData.damagedItem || ''} onChange={(e) => setFormData({ ...formData, damagedItem: e.target.value })} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-slate-500 mb-1">Damage Reason</label>
                          <input type="text" value={formData.damageReason || ''} onChange={(e) => setFormData({ ...formData, damageReason: e.target.value })} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div className="md:col-span-1">
                          <label className="block text-xs font-bold text-slate-500 mb-1">Service Cost / Parts Amount</label>
                          <input type="number" value={formData.serviceCost || ''} onChange={(e) => setFormData({ ...formData, serviceCost: e.target.value })} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div className="md:col-span-1">
                          <label className="block text-xs font-bold text-slate-500 mb-1">Resolution (How was it fixed?)</label>
                          <input type="text" value={formData.serviceResolution || ''} onChange={(e) => setFormData({ ...formData, serviceResolution: e.target.value })} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Attachments */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">Attachments</h3>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Main Photo URL</label>
                      <input type="text" value={formData.photoUrl || ''} onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>

                </div>

                <div className="flex gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <button type="submit" disabled={loading} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 dark:shadow-none disabled:opacity-50">Save All Changes</button>
                  <button type="button" onClick={() => setEditMode(false)} className="px-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
                </div>
              </form>
            ) : (
              <div className="space-y-12">
                <div className="flex gap-8 border-b border-slate-200 dark:border-slate-800">
                  {['Overview', 'Warranty', 'Service Request'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`pb-4 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${activeTab === tab ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {activeTab === 'Overview' && (
                  <div className="space-y-12 animate-fade-in">
                    {/* Visual Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-10">
                      <DetailItem label="Asset Tag" value={asset.assetTag} />
                      <DetailItem label="Type" value={asset.type} />
                      <DetailItem label="Priority" value={asset.priority} color="text-blue-600 dark:text-blue-400" />
                      <DetailItem label="Location" value={asset.location?.name} />

                      <DetailItem label="Assigned To" value={asset.assignedTo ? `${asset.assignedTo.firstName} ${asset.assignedTo.lastName}` : 'Unassigned'} color={asset.assignedTo ? 'text-emerald-600' : 'text-slate-400'} />
                      <DetailItem label="Processor" value={asset.processor} />
                      <DetailItem label="RAM" value={asset.ram} />
                      <DetailItem label="Storage" value={asset.storage} />
                      <DetailItem label="Adapter S/N" value={asset.adapterSerialNumber} />

                      {user?.role !== 'employee' && (
                        <>
                          <DetailItem label="Invoice No" value={asset.invoiceNo || asset.invoiceNumber} />
                          <DetailItem label="Supplier" value={asset.supplierName || asset.vendor} />
                          <DetailItem label="Value" value={formatCurrency(asset.currentValue || asset.purchasePrice, asset.location?.currency)} color="text-blue-600 dark:text-blue-400 font-black" />
                          <DetailItem label="Purchase Date" value={asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : '-'} />
                        </>
                      )}
                    </div>

                    {/* Additional Details Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 pt-10 border-t border-slate-100 dark:border-slate-800">
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Extended Specs</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <DetailItem label="Express Service" value={asset.expressServiceCode} />
                          <DetailItem label="Assigned Date" value={asset.laptopAssignedDate ? new Date(asset.laptopAssignedDate).toLocaleDateString() : '-'} />
                          <DetailItem label="License" value={asset.license} />
                          <DetailItem label="Old Loaner" value={asset.oldLoaner} />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contact & Forms</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <DetailItem label="Ack. Form" value={asset.acknowledgementForm} />
                        </div>
                      </div>
                    </div>

                    {/* Attachments */}
                    <div className="pt-10 border-t border-slate-100 dark:border-slate-800">
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Attachments</h4>
                        <div className="grid grid-cols-1 gap-4">
                          {asset.photoUrl && (
                            <div>
                              <p className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold mb-2">Main Photo</p>
                              <img src={asset.photoUrl} alt="Asset" onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/150?text=No+Image'; }} className="w-32 h-32 object-cover rounded-lg border border-slate-200 dark:border-slate-700" />
                            </div>
                          )}
                          {!asset.photoUrl && <p className="text-sm text-slate-400 italic">No attachments</p>}
                        </div>
                      </div>
                    </div>

                    {/* Custom Fields Section */}
                    {asset.customFields?.length > 0 && (
                      <div className="pt-10 border-t border-slate-100 dark:border-slate-800">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Custom Metadata</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                          {asset.customFields.map((cf, idx) => (
                            <DetailItem key={idx} label={cf.fieldName} value={cf.fieldValue} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'Warranty' && (
                  <div className="space-y-12 animate-fade-in">
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-8 border border-slate-100 dark:border-slate-800">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Warranty Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <DetailItem label="Warranty Status" value={asset.warrantyStatus === 'active' ? 'Active' : 'Inactive'} color={asset.warrantyStatus === 'active' ? 'text-emerald-600' : 'text-slate-500'} />
                        <DetailItem label="Warranty Expiry Date" value={asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toLocaleDateString() : '-'} />
                        <DetailItem label="Warranty Provider" value={asset.warrantyProvider} />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'Service Request' && (
                  <div className="space-y-12 animate-fade-in">
                    <div className="pt-4">
                      {/* Approved/Pending Buttons mapped to requirements */}
                      <div className="flex items-center gap-4 mb-8">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex-1">Status</h4>
                        {['admin', 'manager'].includes(user?.role) ? (
                          <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                            <button onClick={() => handleServiceStatus('Pending')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${asset.serviceStatus === 'Pending' ? 'bg-white shadow-sm text-amber-600 dark:bg-slate-700' : 'text-slate-500 hover:text-slate-700'}`}>Pending</button>
                            <button onClick={() => handleServiceStatus('Approved')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${asset.serviceStatus === 'Approved' ? 'bg-white shadow-sm text-emerald-600 dark:bg-slate-700' : 'text-slate-500 hover:text-slate-700'}`}>Approved</button>
                          </div>
                        ) : (
                          <span className={`px-3 py-1 text-xs font-bold bg-amber-100 text-amber-800 rounded-full dark:bg-amber-900/30 dark:text-amber-400`}>{asset.serviceStatus || 'Pending'}</span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-2 gap-y-10 gap-x-8">
                        <DetailItem label="Repair Type" value={asset.serviceType === 'OEM' ? 'In-Warranty (OEM)' : asset.serviceType === 'Local' ? 'Out-of-Warranty (Local Vendor)' : '-'} color="text-amber-600" />
                        <DetailItem label="Damaged Item" value={asset.damagedItem} />
                        <DetailItem label="Service Cost" value={asset.serviceCost ? formatCurrency(asset.serviceCost, asset.location?.currency) : '-'} color="text-blue-600 font-black" />
                        <DetailItem label="Damage Reason" value={asset.damageReason} />
                        <DetailItem label="Resolution" value={asset.serviceResolution} fullWidth />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Activity & Notes */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-8">
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-8">Service Request Log</h2>
            <div className="space-y-8">
              <div className="flex gap-4">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Record an update or maintenance action..."
                  className="flex-1 px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                />
                <button
                  onClick={handleAddNote}
                  disabled={postingNote}
                  className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none disabled:opacity-50"
                >
                  {postingNote ? '...' : 'Post'}
                </button>
              </div>
              <div className="space-y-6">
                {asset.notes?.length > 0 ? asset.notes.slice().reverse().map((note, idx) => (
                  <div key={idx} className="relative pl-8 before:content-[''] before:absolute before:left-0 before:top-2 before:bottom-0 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800">
                    <div className="absolute left-[-4px] top-1.5 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-black text-slate-900 dark:text-white">{note.author?.username || 'System'}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{new Date(note.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{note.content}</p>
                  </div>
                )) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No entries in feed</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-8">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 flex flex-col items-center">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Asset Identifier</h3>
            <div className="p-6 bg-white rounded-3xl shadow-xl shadow-slate-200 dark:shadow-none mb-8 ring-1 ring-slate-100">
              <QRCode value={asset.assetTag} size={180} />
            </div>
            <button
              onClick={() => {
                const link = document.createElement('a');
                const canvas = document.querySelector('canvas');
                link.href = canvas.toDataURL('image/png');
                link.download = `${asset.assetTag}-qr.png`;
                link.click();
              }}
              className="w-full py-4 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-100 transition-all text-xs"
            >
              Download Asset Image
            </button>
          </div>

          {user?.role !== 'employee' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-8">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Ownership Trail</h3>
            <div className="space-y-6">
              {history.length === 0 ? (
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest text-center py-8">Initial Acquisition</p>
              ) : (
                history.map((assignment, idx) => (
                  <div key={idx} className="flex gap-4 group">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full border-2 border-white ${assignment.status === 'active' ? 'bg-emerald-500 scale-125' : 'bg-slate-300'}`}></div>
                      <div className="w-0.5 flex-1 bg-slate-100 dark:bg-slate-800 my-1"></div>
                    </div>
                    <div className="flex-1 pb-6">
                      <p className="text-sm font-black text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                        {assignment.employee?.firstName} {assignment.employee?.lastName}
                      </p>
                      <div className="flex justify-between items-center mt-1">
                        <span className={`text-[10px] font-black uppercase tracking-tighter ${assignment.status === 'active' ? 'text-emerald-500' : 'text-slate-400'}`}>
                          {assignment.status === 'active' ? 'Current Owner' : 'Past Owner'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-300 font-mono">
                          {new Date(assignment.assignedDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {['admin', 'manager'].includes(user?.role) && (
                      <button onClick={() => handleDeleteAssignment(assignment._id)} className="text-red-500 hover:text-red-700 p-2 text-xs font-bold uppercase tracking-widest self-start mt-1">Delete</button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssetDetail;
