import express from 'express';
import Location from '../models/Location.js';
import AuditLog from '../models/AuditLog.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { sanitizePayload } from '../utils/security.js';

const router = express.Router();

// Get all locations
router.get('/', authenticateToken, async (req, res) => {
    try {
        const locations = await Location.find();
        res.json(locations);
    } catch (error) {
        console.error('Get locations error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Create location
router.post('/', authenticateToken, authorizeRole('admin', 'manager'), async (req, res) => {
    try {
        const locationData = sanitizePayload(req.body);
        const location = new Location(locationData);
        await location.save();

        await AuditLog.create({
            user: req.user.userId,
            action: 'location_created',
            entityType: 'location',
            entityId: location._id,
            entityName: location.name
        });

        res.status(201).json(location);
    } catch (error) {
        console.error('Create location error:', error);
        res.status(400).json({ message: error.message });
    }
});

// Update location
router.put('/:id', authenticateToken, authorizeRole('admin', 'manager'), async (req, res) => {
    try {
        const updateData = sanitizePayload(req.body);
        const location = await Location.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!location) return res.status(404).json({ message: 'Location not found' });

        await AuditLog.create({
            user: req.user.userId,
            action: 'location_updated',
            entityType: 'location',
            entityId: location._id,
            entityName: location.name
        });

        res.json(location);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete location
router.delete('/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const location = await Location.findByIdAndDelete(req.params.id);
        if (!location) return res.status(404).json({ message: 'Location not found' });

        await AuditLog.create({
            user: req.user.userId,
            action: 'location_deleted',
            entityType: 'location',
            entityId: location._id,
            entityName: location.name
        });

        res.json({ message: 'Location deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Import locations from CSV
router.post('/import/csv', authenticateToken, authorizeRole('admin', 'manager'), async (req, res) => {
    try {
        const { data } = req.body;
        if (!Array.isArray(data)) {
            return res.status(400).json({ message: 'Data must be an array' });
        }

        const importedLocations = [];
        for (const item of data) {
            let currency = item.currency;
            if (!currency && item.country) {
                const country = String(item.country).toLowerCase();
                if (country.includes('india')) currency = 'INR';
                else if (country.includes('malaysia')) currency = 'MYR';
                else if (country.includes('singapore')) currency = 'SGD';
                else if (country.includes('thailand')) currency = 'THB';
                else if (country.includes('australia')) currency = 'AUD';
                else if (country.includes('canada')) currency = 'CAD';
                else if (country.includes('japan')) currency = 'JPY';
                else if (country.includes('china')) currency = 'CNY';
                else if (country.includes('usa') || country.includes('united states')) currency = 'USD';
                else if (country.includes('europe') || country.includes('germany') || country.includes('france')) currency = 'EUR';
                else if (country.includes('uk') || country.includes('united kingdom')) currency = 'GBP';
            }

            const location = new Location({
                name: item.name,
                address: item.address,
                city: item.city,
                state: item.state,
                country: item.country,
                currency: currency || 'USD'
            });
            await location.save();
            importedLocations.push(location);
        }

        await AuditLog.create({
            user: req.user.userId,
            action: 'csv_imported',
            entityType: 'location',
            entityName: `Bulk import: ${importedLocations.length} locations`
        });

        res.status(201).json({ count: importedLocations.length, locations: importedLocations });
    } catch (error) {
        console.error('Import CSV error:', error);
        res.status(500).json({ message: error.message });
    }
});

export default router;
