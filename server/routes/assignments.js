import express from 'express';
import Assignment from '../models/Assignment.js';
import Asset from '../models/Asset.js';
import Employee from '../models/Employee.js';
import AuditLog from '../models/AuditLog.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

/**
 * Helper to ensure assignments whose employee was deleted (exited) still return
 * complete employee details from employeeSnapshot, AuditLog, or Asset.oldLoaner.
 */
async function enrichAssignments(assignments, rawEmployeeMap = new Map()) {
  const results = [];
  for (const doc of assignments) {
    const item = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
    const rawEmpId = rawEmployeeMap.get(item._id.toString()) || item.employee?._id || item.employee;

    // Ensure acknowledgementForm falls back to the asset's acknowledgementForm if not set on the assignment
    if (!item.acknowledgementForm && item.asset?.acknowledgementForm) {
      item.acknowledgementForm = item.asset.acknowledgementForm;
    }

    // If employee exists (not deleted), backfill snapshot in memory if missing
    if (item.employee && typeof item.employee === 'object' && (item.employee.firstName || item.employee.lastName)) {
      if (!item.employeeSnapshot || !item.employeeSnapshot.firstName) {
        item.employeeSnapshot = {
          employeeId: item.employee.employeeId || '',
          firstName: item.employee.firstName || '',
          lastName: item.employee.lastName || '',
          email: item.employee.email || '',
          department: item.employee.department || '',
          designation: item.employee.designation || '',
          locationName: item.employee.location?.name || '',
          isExited: false
        };
      }
      results.push(item);
      continue;
    }

    // Employee reference is null (employee was deleted from Employee page)
    let snapshot = item.employeeSnapshot;

    if (!snapshot || (!snapshot.firstName && !snapshot.lastName)) {
      let recoveredFirst = '';
      let recoveredLast = '';
      let recoveredEmpId = '';

      if (rawEmpId) {
        const auditEntry = await AuditLog.findOne({
          entityId: rawEmpId,
          action: { $in: ['employee_deleted', 'employee_updated', 'employee_created'] }
        }).sort({ createdAt: -1 });

        if (auditEntry) {
          if (auditEntry.changes?.before?.firstName) {
            recoveredFirst = auditEntry.changes.before.firstName;
            recoveredLast = auditEntry.changes.before.lastName || '';
            recoveredEmpId = auditEntry.changes.before.employeeId || '';
          } else if (auditEntry.entityName) {
            const nameStr = auditEntry.entityName.trim();
            if (nameStr.includes(' - ')) {
              const [idPart, ...rest] = nameStr.split(' - ');
              recoveredEmpId = idPart.trim();
              const parts = rest.join(' - ').trim().split(/\s+/);
              recoveredFirst = parts[0] || '';
              recoveredLast = parts.slice(1).join(' ');
            } else {
              const parts = nameStr.split(/\s+/);
              recoveredFirst = parts[0] || '';
              recoveredLast = parts.slice(1).join(' ');
            }
          }
        }
      }

      if (!recoveredFirst && item.asset?.oldLoaner && !['none', 'na', 'n/a', '-'].includes(item.asset.oldLoaner.toLowerCase())) {
        recoveredFirst = item.asset.oldLoaner;
      }

      snapshot = {
        employeeId: recoveredEmpId,
        firstName: recoveredFirst || 'Exited Employee',
        lastName: recoveredLast || '',
        email: '',
        department: '',
        designation: '',
        locationName: item.asset?.location?.name || '',
        isExited: true
      };

      // Persist recovered snapshot so future queries don't need to re-lookup
      await Assignment.updateOne({ _id: item._id }, { $set: { employeeSnapshot: snapshot } });
    }

    item.employeeSnapshot = { ...snapshot, isExited: true };
    item.employee = {
      _id: rawEmpId || null,
      employeeId: snapshot.employeeId || '',
      firstName: snapshot.firstName || 'Exited Employee',
      lastName: snapshot.lastName || '',
      email: snapshot.email || '',
      department: snapshot.department || '',
      designation: snapshot.designation || '',
      location: snapshot.locationName ? { name: snapshot.locationName } : (item.asset?.location || null),
      isExited: true
    };

    results.push(item);
  }
  return results;
}

// Get all assignments
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, employee, asset, location } = req.query;
    let filter = {};

    if (req.user.role === 'employee') {
      const empData = await Employee.findOne({ user: req.user.userId });
      if (empData) {
        filter.employee = empData._id;
      } else {
        filter._id = null;
      }
    } else if (employee) {
      filter.employee = String(employee);
    }

    if (status) filter.status = String(status);
    if (asset) filter.asset = String(asset);

    // Capture raw employee ObjectIds before populate in case any referenced Employee was deleted
    const rawDocs = await Assignment.find(filter).select('_id employee').lean();
    const rawEmployeeMap = new Map(rawDocs.map(d => [d._id.toString(), d.employee]));

    const assignments = await Assignment.find(filter)
      .populate({
        path: 'asset',
        select: 'name assetTag type serialNumber location acknowledgementForm oldLoaner status',
        populate: { path: 'location', select: 'name currency country' }
      })
      .populate({
        path: 'employee',
        select: 'firstName lastName employeeId email department designation location',
        populate: { path: 'location', select: 'name currency country' }
      })
      .populate('assignedBy', 'username')
      .populate('returnedBy', 'username')
      .sort({ assignedDate: -1 });

    let enriched = await enrichAssignments(assignments, rawEmployeeMap);

    // Optional server-side location filter (matches either asset location or employee location by ID or name)
    if (location) {
      const locQuery = String(location).trim().toLowerCase();
      enriched = enriched.filter(a => {
        const assetLocId = a.asset?.location?._id?.toString() || '';
        const assetLocName = (a.asset?.location?.name || '').toLowerCase();
        const empLocId = a.employee?.location?._id?.toString() || '';
        const empLocName = (a.employee?.location?.name || a.employeeSnapshot?.locationName || '').toLowerCase();
        return (
          assetLocId === location ||
          empLocId === location ||
          assetLocName === locQuery ||
          empLocName === locQuery
        );
      });
    }

    res.json(enriched);
  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get assignment by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const rawDoc = await Assignment.findById(req.params.id).select('_id employee').lean();
    if (!rawDoc) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    const assignment = await Assignment.findById(req.params.id)
      .populate({
        path: 'asset',
        populate: { path: 'location', select: 'name currency country' }
      })
      .populate({
        path: 'employee',
        populate: { path: 'location', select: 'name currency country' }
      })
      .populate('assignedBy', 'username')
      .populate('returnedBy', 'username');

    if (req.user.role === 'employee') {
      const empData = await Employee.findOne({ user: req.user.userId });
      if (!empData || assignment.employee?._id?.toString() !== empData._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    const [enriched] = await enrichAssignments([assignment], new Map([[rawDoc._id.toString(), rawDoc.employee]]));
    res.json(enriched);
  } catch (error) {
    console.error('Get assignment error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Assign asset to employee (Check-Out)
router.post('/', authenticateToken, authorizeRole('admin', 'manager'), async (req, res) => {
  try {
    const { asset, employee, notes, assignedDate, acknowledgementForm } = req.body;

    if (!acknowledgementForm || !String(acknowledgementForm).trim()) {
      return res.status(400).json({ message: 'Laptop Acknowledgement Form is mandatory' });
    }

    // Check if asset exists and is available
    const assetRecord = await Asset.findById(asset).populate('location', 'name');
    if (!assetRecord) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    if (assetRecord.status !== 'available') {
      return res.status(400).json({ message: 'Asset is not available for assignment' });
    }

    const empRecord = await Employee.findById(employee).populate('location', 'name');
    if (!empRecord) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const employeeSnapshot = {
      employeeId: empRecord.employeeId || '',
      firstName: empRecord.firstName || '',
      lastName: empRecord.lastName || '',
      email: empRecord.email || '',
      department: empRecord.department || '',
      designation: empRecord.designation || '',
      locationName: empRecord.location?.name || assetRecord.location?.name || '',
      isExited: false
    };

    const ackFormValue = String(acknowledgementForm).trim();

    // Create assignment
    const assignment = new Assignment({
      asset,
      employee,
      employeeSnapshot,
      acknowledgementForm: ackFormValue,
      assignedBy: req.user.userId,
      notes,
      assignedDate: assignedDate ? new Date(assignedDate) : new Date()
    });

    await assignment.save();

    // Update asset status and acknowledgementForm
    assetRecord.status = 'assigned';
    assetRecord.assignedTo = employee;
    assetRecord.laptopAssignedDate = assignment.assignedDate;
    assetRecord.acknowledgementForm = ackFormValue;
    await assetRecord.save();

    await AuditLog.create({
      user: req.user.userId,
      action: 'asset_assigned',
      entityType: 'assignment',
      entityId: assignment._id,
      entityName: `Asset ${assetRecord.assetTag} assigned to ${empRecord.firstName} ${empRecord.lastName}`
    });

    await assignment.populate([
      {
        path: 'asset',
        select: 'name assetTag type serialNumber location acknowledgementForm oldLoaner status',
        populate: { path: 'location', select: 'name currency country' }
      },
      {
        path: 'employee',
        select: 'firstName lastName employeeId email department designation location',
        populate: { path: 'location', select: 'name currency country' }
      },
      { path: 'assignedBy', select: 'username' }
    ]);

    res.status(201).json(assignment);
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update assignment (e.g. Acknowledgement Form or notes)
router.put('/:id', authenticateToken, authorizeRole('admin', 'manager'), async (req, res) => {
  try {
    const { acknowledgementForm, notes, assignedDate } = req.body;
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (acknowledgementForm !== undefined) {
      if (!String(acknowledgementForm).trim()) {
        return res.status(400).json({ message: 'Laptop Acknowledgement Form cannot be empty' });
      }
      assignment.acknowledgementForm = String(acknowledgementForm).trim();
      if (assignment.asset) {
        await Asset.findByIdAndUpdate(assignment.asset, {
          acknowledgementForm: assignment.acknowledgementForm,
          updatedAt: new Date()
        });
      }
    }

    if (notes !== undefined) assignment.notes = notes;
    if (assignedDate) assignment.assignedDate = new Date(assignedDate);
    assignment.updatedAt = new Date();
    await assignment.save();

    const rawDoc = { _id: assignment._id, employee: assignment.employee };
    await assignment.populate([
      {
        path: 'asset',
        select: 'name assetTag type serialNumber location acknowledgementForm oldLoaner status',
        populate: { path: 'location', select: 'name currency country' }
      },
      {
        path: 'employee',
        select: 'firstName lastName employeeId email department designation location',
        populate: { path: 'location', select: 'name currency country' }
      },
      { path: 'assignedBy', select: 'username' },
      { path: 'returnedBy', select: 'username' }
    ]);

    const [enriched] = await enrichAssignments([assignment], new Map([[rawDoc._id.toString(), rawDoc.employee]]));
    res.json(enriched);
  } catch (error) {
    console.error('Update assignment error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Return asset (Check-In)
router.post('/:id/return', authenticateToken, authorizeRole('admin', 'manager'), async (req, res) => {
  try {
    const { conditionOnReturn, returnNotes } = req.body || {};

    const rawDoc = await Assignment.findById(req.params.id).select('_id employee').lean();
    const assignment = await Assignment.findById(req.params.id).populate({
      path: 'employee',
      populate: { path: 'location', select: 'name' }
    });

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (assignment.status !== 'active') {
      return res.status(400).json({ message: 'Assignment is not active' });
    }

    // Preserve employeeSnapshot on the assignment before returning
    if (assignment.employee && (assignment.employee.firstName || assignment.employee.lastName)) {
      assignment.employeeSnapshot = {
        employeeId: assignment.employee.employeeId || '',
        firstName: assignment.employee.firstName || '',
        lastName: assignment.employee.lastName || '',
        email: assignment.employee.email || '',
        department: assignment.employee.department || '',
        designation: assignment.employee.designation || '',
        locationName: assignment.employee.location?.name || '',
        isExited: false
      };
    }

    const snap = assignment.employeeSnapshot || {};
    const fullName = `${snap.firstName || ''} ${snap.lastName || ''}`.trim();
    const empLabel = snap.employeeId ? `${snap.employeeId} - ${fullName}` : fullName;

    // Update assignment
    assignment.returnDate = new Date();
    assignment.returnedBy = req.user.userId;
    assignment.status = 'returned';
    if (conditionOnReturn) assignment.conditionOnReturn = conditionOnReturn;
    if (returnNotes !== undefined) assignment.returnNotes = returnNotes;
    assignment.updatedAt = new Date();
    await assignment.save();

    // Update asset status and preserve Old Loaner details
    const asset = await Asset.findById(assignment.asset);
    if (asset) {
      asset.status = 'available';
      asset.assignedTo = null;
      if (empLabel) {
        asset.oldLoaner = empLabel;
        if (!Array.isArray(asset.loanerHistory)) {
          asset.loanerHistory = [];
        }
        asset.loanerHistory.push({
          employeeId: snap.employeeId || '',
          employeeName: fullName,
          email: snap.email || '',
          department: snap.department || '',
          assignedDate: assignment.assignedDate,
          returnedDate: assignment.returnDate,
          notes: returnNotes || `Returned (${conditionOnReturn || 'good'})`
        });
      }
      asset.updatedAt = new Date();
      await asset.save();
    }

    await AuditLog.create({
      user: req.user.userId,
      action: 'asset_returned',
      entityType: 'assignment',
      entityId: assignment._id,
      entityName: `Asset returned${conditionOnReturn ? ` - Condition: ${conditionOnReturn}` : ''}`
    });

    await assignment.populate([
      {
        path: 'asset',
        select: 'name assetTag type serialNumber location acknowledgementForm oldLoaner status',
        populate: { path: 'location', select: 'name currency country' }
      },
      {
        path: 'employee',
        select: 'firstName lastName employeeId email department designation location',
        populate: { path: 'location', select: 'name currency country' }
      },
      { path: 'assignedBy', select: 'username' },
      { path: 'returnedBy', select: 'username' }
    ]);

    const [enriched] = await enrichAssignments([assignment], new Map([[rawDoc._id.toString(), rawDoc.employee]]));
    res.json(enriched);
  } catch (error) {
    console.error('Return asset error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get assignment history for asset
router.get('/asset/:assetId/history', authenticateToken, async (req, res) => {
  try {
    const rawDocs = await Assignment.find({ asset: req.params.assetId }).select('_id employee').lean();
    const rawEmployeeMap = new Map(rawDocs.map(d => [d._id.toString(), d.employee]));

    const history = await Assignment.find({ asset: req.params.assetId })
      .populate({
        path: 'asset',
        select: 'name assetTag oldLoaner acknowledgementForm location',
        populate: { path: 'location', select: 'name' }
      })
      .populate({
        path: 'employee',
        select: 'firstName lastName employeeId email department designation location',
        populate: { path: 'location', select: 'name' }
      })
      .populate('assignedBy', 'username')
      .populate('returnedBy', 'username')
      .sort({ assignedDate: -1 });

    const enrichedHistory = await enrichAssignments(history, rawEmployeeMap);
    res.json(enrichedHistory);
  } catch (error) {
    console.error('Get assignment history error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Delete assignment
router.delete('/:id', authenticateToken, authorizeRole('admin', 'manager'), async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id).populate('employee', 'firstName lastName employeeId email department');
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    const snap = assignment.employee || assignment.employeeSnapshot || {};
    const fullName = `${snap.firstName || ''} ${snap.lastName || ''}`.trim();
    const empLabel = snap.employeeId ? `${snap.employeeId} - ${fullName}` : fullName;

    const asset = await Asset.findById(assignment.asset);
    if (asset) {
      // Preserve Old Loaner before deleting assignment record
      if (empLabel && (!asset.oldLoaner || ['none', 'na', 'n/a', '-'].includes(asset.oldLoaner.toLowerCase()))) {
        asset.oldLoaner = empLabel;
      }
      if (assignment.status === 'active') {
        asset.status = 'available';
        asset.assignedTo = null;
      }
      await asset.save();
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
