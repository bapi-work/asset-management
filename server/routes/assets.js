import express from 'express';
import Asset from '../models/Asset.js';
import Location from '../models/Location.js';
import AuditLog from '../models/AuditLog.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import qrcode from 'qrcode';
import { stringify } from 'csv-stringify';
import fs from 'fs';

const router = express.Router();

// Get all assets
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, type, location, assignedTo, search } = req.query;
    let filter = {};

    if (status) filter.status = status;
    if (type) filter.type = { $regex: new RegExp(`^${type}$`, 'i') };
    if (location) filter.location = location;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { assetTag: { $regex: search, $options: 'i' } },
        { serialNumber: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
        { manufacturer: { $regex: search, $options: 'i' } }
      ];
    }

    const assets = await Asset.find(filter)
      .populate('location')
      .populate('assignedTo')
      .populate('createdBy', 'username');

    // Calculate depreciation for each asset
    const assetsWithDepreciation = assets.map(asset => {
      const assetObj = asset.toObject();
      assetObj.currentValue = asset.calculateDepreciation();
      return assetObj;
    });

    res.json(assetsWithDepreciation);
  } catch (error) {
    console.error('Get assets error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get asset by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id)
      .populate('location')
      .populate('assignedTo')
      .populate('createdBy', 'username')
      .populate('notes.author', 'username');

    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    const assetObj = asset.toObject();
    assetObj.currentValue = asset.calculateDepreciation();

    res.json(assetObj);
  } catch (error) {
    console.error('Get asset error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Create asset
router.post('/', authenticateToken, authorizeRole('admin', 'manager'), async (req, res) => {
  try {
    const assetData = {
      ...req.body,
      createdBy: req.user.userId
    };

    // Generate QR code
    const qrData = req.body.assetTag || req.body.name;
    assetData.qrCode = await qrcode.toDataURL(qrData);

    const asset = new Asset(assetData);
    await asset.save();

    await AuditLog.create({
      user: req.user.userId,
      action: 'asset_created',
      entityType: 'asset',
      entityId: asset._id,
      entityName: asset.name
    });

    const populatedAsset = await asset.populate('location createdBy', 'username');
    res.status(201).json(populatedAsset);
  } catch (error) {
    console.error('Create asset error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update asset
router.put('/:id', authenticateToken, authorizeRole('admin', 'manager'), async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    const oldData = asset.toObject();

    Object.assign(asset, req.body);
    asset.updatedAt = new Date();

    if (req.body.assetTag && req.body.assetTag !== oldData.assetTag) {
      try {
        asset.qrCode = await qrcode.toDataURL(req.body.assetTag);
      } catch (qrErr) {
        console.error('Failed to generate QR code:', qrErr);
      }
    }

    await asset.save();

    await AuditLog.create({
      user: req.user.userId,
      action: 'asset_updated',
      entityType: 'asset',
      entityId: asset._id,
      entityName: asset.name,
      changes: { before: oldData, after: asset.toObject() }
    });

    await asset.populate('location assignedTo createdBy', 'username');
    const assetObj = asset.toObject();
    assetObj.currentValue = asset.calculateDepreciation();
    res.json(assetObj);
  } catch (error) {
    console.error('Update asset error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Delete asset
router.delete('/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const asset = await Asset.findByIdAndDelete(req.params.id);
    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    await AuditLog.create({
      user: req.user.userId,
      action: 'asset_deleted',
      entityType: 'asset',
      entityId: asset._id,
      entityName: asset.name
    });

    res.json({ message: 'Asset deleted successfully' });
  } catch (error) {
    console.error('Delete asset error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Add note to asset
router.post('/:id/notes', authenticateToken, async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    asset.notes.push({
      author: req.user.userId,
      content: req.body.content,
      createdAt: new Date()
    });

    await asset.save();

    const populatedAsset = await asset.populate('location assignedTo createdBy notes.author', 'username');
    // Ensure currentValue is sent back
    const assetObj = populatedAsset.toObject();
    assetObj.currentValue = populatedAsset.calculateDepreciation();

    res.json(assetObj);
  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Export assets to CSV
router.get('/:id/qrcode', authenticateToken, async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    res.json({ qrCode: asset.qrCode });
  } catch (error) {
    console.error('Get QR code error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Export assets to CSV
router.post('/export/csv', authenticateToken, async (req, res) => {
  try {
    const assets = await Asset.find()
      .populate('location', 'name')
      .populate('assignedTo', 'firstName lastName');

    const output = assets.map(asset => {
      const row = {
        'Asset Tag': asset.assetTag,
        'Name': asset.name,
        'Type': asset.type,
        'Serial Number': asset.serialNumber,
        'Status': asset.status,
        'Priority': asset.priority || '',
        'Employee ID': asset.employeeId || '',
        'Company/Client': asset.companyClient || '',
        'Mobile Number': asset.mobileNumber || '',
        'Internal Mail ID': asset.internalMailId || '',
        'Client Mail ID': asset.clientMailId || '',
        'Express Service Code': asset.expressServiceCode || '',
        'Adapter S/N': asset.adapterSerialNumber || '',
        'Processor': asset.processor || '',
        'RAM': asset.ram || '',
        'Storage': asset.storage || '',
        'Laptop Assigned Date': asset.laptopAssignedDate ? new Date(asset.laptopAssignedDate).toLocaleDateString() : '',
        'License': asset.license || '',
        'Acknowledgement Form': asset.acknowledgementForm || '',
        'Old Loaner': asset.oldLoaner || '',
        'Supplier Name': asset.supplierName || '',
        'Invoice Date': asset.invoiceDate ? new Date(asset.invoiceDate).toLocaleDateString() : '',
        'Invoice No': asset.invoiceNo || '',
        'Purchase Price': asset.purchasePrice,
        'Location': asset.location?.name || '',
        'Assigned To': asset.assignedTo ? `${asset.assignedTo.firstName} ${asset.assignedTo.lastName}` : '',
        'Current Value': asset.calculateDepreciation()
      };

      // Add custom fields to export
      asset.customFields.forEach(cf => {
        row[`CF: ${cf.fieldName}`] = cf.fieldValue;
      });

      return row;
    });

    stringify(output, { header: true }, (err, csvOutput) => {
      if (err) throw err;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=assets_export.csv');
      res.send(csvOutput);
    });
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Import assets from CSV
router.post('/import/csv', authenticateToken, authorizeRole('admin', 'manager'), async (req, res) => {
  try {
    const { data } = req.body;

    if (!Array.isArray(data)) {
      return res.status(400).json({ message: 'Data must be an array' });
    }

    const standardFields = [
      'assetTag', 'name', 'type', 'serialNumber', 'manufacturer', 'model',
      'description', 'purchaseDate', 'purchasePrice', 'currency', 'vendor',
      'invoiceNumber', 'status', 'location', 'assignedTo', 'priority',
      'employeeId', 'companyClient', 'mobileNumber', 'internalMailId',
      'clientMailId', 'expressServiceCode', 'adapterSerialNumber', 'processor',
      'ram', 'storage', 'laptopAssignedDate', 'license', 'acknowledgementForm',
      'oldLoaner', 'supplierName', 'invoiceDate', 'invoiceNo'
    ];

    const importedAssets = [];
    for (const item of data) {
      // 1. Resolve Location
      let locationId = null;
      const locationName = item.location || item.Location;
      if (locationName) {
        const location = await Location.findOne({ name: { $regex: new RegExp(`^${locationName}$`, 'i') } });
        if (location) locationId = location._id;
      }

      // 2. Map standard fields (case-insensitive keys)
      const assetData = {
        createdBy: req.user.userId,
        location: locationId,
        customFields: []
      };

      // Helper to find value in item with various possible key names
      const getValue = (keys) => {
        for (const key of keys) {
          if (item[key] !== undefined) return item[key];
          // Check lowercase and space-to-underscore versions
          const normalizedKey = key.toLowerCase().replace(/\s+/g, '');
          for (const itemKey in item) {
            const normalizedItemKey = itemKey.toLowerCase().replace(/[\s\/\-_]+/g, '');
            if (normalizedItemKey === normalizedKey) return item[itemKey];
          }
        }
        return undefined;
      };

      assetData.assetTag = getValue(['Asset Tag', 'assetTag', 'tag']);
      assetData.name = getValue(['Name', 'name', 'Asset Name']) || `Asset ${assetData.assetTag}`;
      assetData.type = (getValue(['Type', 'type', 'Asset Type']) || 'hardware').toLowerCase();
      assetData.serialNumber = getValue(['Serial Number', 'serialNumber', 'sn', 'S/N']);
      assetData.status = (getValue(['Status', 'status']) || 'available').toLowerCase();
      assetData.purchasePrice = parseFloat(getValue(['Purchase Price', 'purchasePrice', 'Price']) || 0);
      // Helper to parse date strings (e.g. 13-07-2021 to Date object)
      const parseDate = (dateStr) => {
        if (!dateStr) return undefined;
        if (typeof dateStr === 'string') {
          const cleanStr = dateStr.trim().toUpperCase();
          if (cleanStr === 'NA' || cleanStr === 'N/A' || cleanStr === '') return undefined;

          // Check for DD-MM-YYYY format
          if (/^\d{2}-\d{2}-\d{4}$/.test(cleanStr)) {
            const [day, month, year] = cleanStr.split('-');
            return new Date(`${year}-${month}-${day}`);
          }
          // Check for DD/MM/YYYY format
          if (/^\d{2}\/\d{2}\/\d{4}$/.test(cleanStr)) {
            const [day, month, year] = cleanStr.split('/');
            return new Date(`${year}-${month}-${day}`);
          }
        }
        return dateStr;
      };

      assetData.purchaseDate = parseDate(getValue(['Purchase Date', 'purchaseDate']));
      assetData.vendor = getValue(['Vendor', 'vendor', 'Supplier']);
      assetData.invoiceNumber = getValue(['Invoice Number', 'invoiceNumber', 'Invoice No']);

      // New requested fields
      assetData.priority = getValue(['Priority', 'priority']);
      assetData.employeeId = getValue(['Employee ID', 'employeeId', 'Emp ID']);
      assetData.companyClient = getValue(['Company/Client', 'companyClient', 'Client']);
      assetData.mobileNumber = getValue(['Mobile Number', 'mobileNumber', 'Mobile']);
      assetData.internalMailId = getValue(['Internal Mail ID', 'internalMailId', 'Internal Mail']);
      assetData.clientMailId = getValue(['Client Mail ID', 'clientMailId', 'Client Mail']);
      assetData.expressServiceCode = getValue(['Express Service Code', 'expressServiceCode']);
      assetData.adapterSerialNumber = getValue(['Adapter S/N', 'adapterSerialNumber', 'Adapter SN']);
      assetData.processor = getValue(['Processor', 'processor']);
      assetData.ram = getValue(['RAM', 'ram']);
      assetData.storage = getValue(['Storage', 'storage']);
      assetData.laptopAssignedDate = parseDate(getValue(['Laptop Assigned Date', 'laptopAssignedDate']));
      assetData.license = getValue(['License', 'license']);
      assetData.acknowledgementForm = getValue(['Acknowledgement Form', 'acknowledgementForm']);
      assetData.oldLoaner = getValue(['Old Loaner', 'oldLoaner']);
      assetData.supplierName = getValue(['Supplier Name', 'supplierName']);
      assetData.invoiceDate = parseDate(getValue(['Invoice Date', 'invoiceDate']));
      assetData.invoiceNo = getValue(['Invoice No', 'invoiceNo']);

      // 3. Handle Custom Fields (everything else)
      const mappedKeys = [
        'Asset Tag', 'assetTag', 'tag', 'Name', 'name', 'Asset Name', 'Type', 'type', 'Asset Type',
        'Serial Number', 'serialNumber', 'sn', 'S/N', 'Status', 'status', 'Purchase Price', 'purchasePrice', 'Price',
        'Purchase Date', 'purchaseDate', 'Vendor', 'vendor', 'Supplier', 'Invoice Number', 'invoiceNumber', 'Invoice No',
        'Location', 'location', 'Priority', 'priority', 'Employee ID', 'employeeId', 'Emp ID',
        'Assigned To', 'assignedTo', 'Assigned Employee Email', 'assignedEmployeeEmail', 'Assigned Employee Department',
        'assignedEmployeeDepartment', 'Assigned Employee Designation', 'assignedEmployeeDesignation',
        'Company/Client', 'companyClient', 'Client', 'Mobile Number', 'mobileNumber', 'Mobile',
        'Internal Mail ID', 'internalMailId', 'Internal Mail', 'Client Mail ID', 'clientMailId', 'Client Mail',
        'Express Service Code', 'expressServiceCode', 'Adapter S/N', 'adapterSerialNumber', 'Adapter SN',
        'Processor', 'processor', 'RAM', 'ram', 'Storage', 'storage', 'Laptop Assigned Date', 'laptopAssignedDate',
        'License', 'license', 'Acknowledgement Form', 'acknowledgementForm', 'Old Loaner', 'oldLoaner',
        'Supplier Name', 'supplierName', 'Invoice Date', 'invoiceDate', 'Invoice No', 'invoiceNo'
      ].map(k => k.toLowerCase().replace(/[\s\/\-_]+/g, ''));

      for (const key in item) {
        const normalizedKey = key.toLowerCase().replace(/[\s\/\-_]+/g, '');
        if (!mappedKeys.includes(normalizedKey)) {
          assetData.customFields.push({
            fieldName: key,
            fieldValue: String(item[key])
          });
        }
      }

      const asset = new Asset(assetData);
      if (asset.assetTag) {
        try {
          asset.qrCode = await qrcode.toDataURL(asset.assetTag);
        } catch (qrErr) {
          console.error('Failed to generate QR code for imported asset:', qrErr);
        }
      }
      await asset.save();
      importedAssets.push(asset);
    }

    await AuditLog.create({
      user: req.user.userId,
      action: 'csv_imported',
      entityType: 'asset',
      entityName: `Bulk import: ${importedAssets.length} assets with dynamic fields`
    });

    res.status(201).json({ count: importedAssets.length, assets: importedAssets });
  } catch (error) {
    console.error('Import CSV error:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
