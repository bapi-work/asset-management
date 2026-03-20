import express from 'express';
import Assignment from '../models/Assignment.js';
import Asset from '../models/Asset.js';
import AuditLog from '../models/AuditLog.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// Get all assignments
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, employee, asset } = req.query;
    let filter = {};

    if (status) filter.status = status;
    if (employee) filter.employee = employee;
    if (asset) filter.asset = asset;

    const assignments = await Assignment.find(filter)
      .populate('asset', 'name assetTag')
      .populate('employee', 'firstName lastName employeeId')
      .populate('assignedBy', 'username')
      .populate('returnedBy', 'username');

    res.json(assignments);
  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get assignment by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('asset')
      .populate('employee')
      .populate('assignedBy', 'username')
      .populate('returnedBy', 'username');

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    res.json(assignment);
  } catch (error) {
    console.error('Get assignment error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Assign asset to employee (Check-Out)
router.post('/', authenticateToken, authorizeRole('admin', 'manager'), async (req, res) => {
  try {
    const { asset, employee, notes, assignedDate } = req.body;

    // Check if asset exists and is available
    const assetRecord = await Asset.findById(asset);
    if (!assetRecord) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    if (assetRecord.status !== 'available') {
      return res.status(400).json({ message: 'Asset is not available for assignment' });
    }

    // Create assignment
    const assignment = new Assignment({
      asset,
      employee,
      assignedBy: req.user.userId,
      notes,
      assignedDate: assignedDate ? new Date(assignedDate) : new Date()
    });

    await assignment.save();

    // Update asset status
    assetRecord.status = 'assigned';
    assetRecord.assignedTo = employee;
    assetRecord.laptopAssignedDate = assignment.assignedDate;
    await assetRecord.save();

    await AuditLog.create({
      user: req.user.userId,
      action: 'asset_assigned',
      entityType: 'assignment',
      entityId: assignment._id,
      entityName: `Asset ${assetRecord.assetTag} assigned`
    });

    await assignment.populate('asset employee assignedBy');
    res.status(201).json(assignment);
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Return asset (Check-In)
router.post('/:id/return', authenticateToken, authorizeRole('admin', 'manager'), async (req, res) => {
  try {
    const { conditionOnReturn, returnNotes } = req.body;

    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (assignment.status !== 'active') {
      return res.status(400).json({ message: 'Assignment is not active' });
    }

    // Update assignment
    assignment.returnDate = new Date();
    assignment.returnedBy = req.user.userId;
    assignment.status = 'returned';
    assignment.conditionOnReturn = conditionOnReturn;
    assignment.returnNotes = returnNotes;
    await assignment.save();

    // Update asset status
    const asset = await Asset.findById(assignment.asset);
    asset.status = 'available';
    asset.assignedTo = null;
    await asset.save();

    await AuditLog.create({
      user: req.user.userId,
      action: 'asset_returned',
      entityType: 'assignment',
      entityId: assignment._id,
      entityName: `Asset returned - Condition: ${conditionOnReturn}`
    });

    await assignment.populate('asset employee assignedBy returnedBy');
    res.json(assignment);
  } catch (error) {
    console.error('Return asset error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get assignment history for asset
router.get('/asset/:assetId/history', authenticateToken, async (req, res) => {
  try {
    const history = await Assignment.find({ asset: req.params.assetId })
      .populate('employee', 'firstName lastName employeeId')
      .populate('assignedBy', 'username')
      .populate('returnedBy', 'username')
      .sort({ assignedDate: -1 });

    res.json(history);
  } catch (error) {
    console.error('Get assignment history error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Delete assignment
router.delete('/:id', authenticateToken, authorizeRole('admin', 'manager'), async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (assignment.status === 'active') {
      const asset = await Asset.findById(assignment.asset);
      if (asset) {
        asset.status = 'available';
        asset.assignedTo = null;
        await asset.save();
      }
    }

    await Assignment.findByIdAndDelete(req.params.id);

    await AuditLog.create({
      user: req.user.userId,
      action: 'assignment_deleted',
      entityType: 'assignment',
      entityId: assignment._id,
      entityName: `Assignment ${assignment._id} deleted`
    });

    res.json({ message: 'Assignment deleted' });
  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
