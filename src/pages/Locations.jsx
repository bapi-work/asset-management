import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ImportModal from '../components/ImportModal';

const Locations = () => {
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        city: '',
        state: '',
        country: '',
        currency: 'USD'
    });
    const [editId, setEditId] = useState(null);
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        fetchLocations();
    }, []);

    const fetchLocations = async () => {
        try {
            const response = await axios.get('/api/locations');
            setLocations(response.data);
        } catch (err) {
            console.error('Failed to fetch locations:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateLocation = async (e) => {
        e.preventDefault();
        try {
            if (editId) {
                const response = await axios.put(`/api/locations/${editId}`, formData);
                setLocations(locations.map(l => l._id === editId ? response.data : l));
                setEditId(null);
            } else {
                const response = await axios.post('/api/locations', formData);
                setLocations([...locations, response.data]);
            }
            setShowForm(false);
            setFormData({
                name: '',
                address: '',
                city: '',
                state: '',
                country: '',
                currency: 'USD'
            });
        } catch (err) {
            alert(`Failed to save location: ${err.message}`);
        }
    };

    const handleEditLocation = (loc) => {
        setEditId(loc._id);
        setFormData({
            name: loc.name,
            address: loc.address || '',
            city: loc.city || '',
            state: loc.state || '',
            country: loc.country || '',
            currency: loc.currency || 'USD'
        });
        setShowForm(true);
    };

    const handleDeleteLocation = async (id) => {
        if (window.confirm('Are you sure you want to delete this location?')) {
            try {
                await axios.delete(`/api/locations/${id}`);
                setLocations(locations.filter(l => l._id !== id));
            } catch (err) {
                alert(`Failed to delete location: ${err.message}`);
            }
        }
    };

    const templateFields = {
        name: 'Main Office',
        address: '123 Tech Lane',
        city: 'San Francisco',
        state: 'CA',
        country: 'USA',
        currency: 'USD'
    };

    if (loading) {
        return <div className="p-6">Loading locations...</div>;
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Locations</h1>
                {['admin', 'manager'].includes(user?.role) && (
                    <div className="flex gap-2">
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
                            + New Location
                        </button>
                    </div>
                )}
            </div>

            {/* Create/Edit Form */}
            {showForm && (
                <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6 animate-fade-in">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                        {editId ? 'Edit Location' : 'Create New Location'}
                    </h2>
                    <form onSubmit={handleCreateLocation} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                            type="text"
                            placeholder="Location Name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
                            required
                        />
                        <input
                            type="text"
                            placeholder="Address"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
                        />
                        <input
                            type="text"
                            placeholder="City"
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
                        />
                        <input
                            type="text"
                            placeholder="State/Province"
                            value={formData.state}
                            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                            className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
                        />
                        <input
                            type="text"
                            placeholder="Country"
                            value={formData.country}
                            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                            className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
                        />
                        <select
                            value={formData.currency}
                            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                            className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
                        >
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="GBP">GBP (£)</option>
                            <option value="INR">INR (₹)</option>
                            <option value="MYR">MYR (RM)</option>
                            <option value="SGD">SGD (S$)</option>
                            <option value="THB">THB (฿)</option>
                            <option value="AED">AED (dh)</option>
                            <option value="AUD">AUD (A$)</option>
                            <option value="CAD">CAD (C$)</option>
                            <option value="JPY">JPY (¥)</option>
                            <option value="PHP">PHP (₱)</option>
                            <option value="CNY">CNY (¥)</option>
                        </select>
                        <div className="md:col-span-2 flex gap-2">
                            <button
                                type="submit"
                                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                            >
                                {editId ? 'Update Location' : 'Create Location'}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowForm(false);
                                    setEditId(null);
                                }}
                                className="flex-1 py-2 px-4 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Locations Table */}
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-950">
                            <tr className="border-b border-slate-200 dark:border-slate-800">
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Address</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Country</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Currency</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {locations.map(loc => (
                                <tr key={loc._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4 text-slate-900 dark:text-white font-medium">{loc.name}</td>
                                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{loc.city}, {loc.country}</td>
                                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">{loc.country}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                            {loc.currency}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 flex gap-2">
                                        <button
                                            onClick={() => handleEditLocation(loc)}
                                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDeleteLocation(loc._id)}
                                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {locations.length === 0 && (
                        <div className="text-center py-10 text-slate-500 dark:text-slate-400">
                            No locations found.
                        </div>
                    )}
                </div>
            </div>

            <ImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                title="Locations"
                apiEndpoint="/api/locations/import/csv"
                onSuccess={fetchLocations}
                templateFields={templateFields}
            />
        </div>
    );
};

export default Locations;
