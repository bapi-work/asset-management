import express from 'express';
import Employee from '../models/Employee.js';
import User from '../models/User.js';
import Location from '../models/Location.js';
import Asset from '../models/Asset.js';
import Assignment from '../models/Assignment.js';
import AuditLog from '../models/AuditLog.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { escapeRegex, sanitizePayload } from '../utils/security.js';

const router = express.Router();

// Get all employees
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { department, location, employmentType, isActive, search, sortBy, sortOrder } = req.query;
    let filter = {};

    if (req.user.role === 'employee') {
      filter.user = req.user.userId;
    }

    if (department) {
      filter.department = { $regex: new RegExp(`^${escapeRegex(String(department).trim())}$`, 'i') };
    }
    if (location) {
      filter.location = String(location);
    }
    if (employmentType) {
      filter.employmentType = String(employmentType);
    }
    if (isActive !== undefined && isActive !== '') {
      filter.isActive = isActive === 'true';
    }
    if (search) {
      const safeSearch = escapeRegex(String(search).trim());
      filter.$or = [
        { firstName: { $regex: safeSearch, $options: 'i' } },
        { lastName: { $regex: safeSearch, $options: 'i' } },
        { email: { $regex: safeSearch, $options: 'i' } },
        { employeeId: { $regex: safeSearch, $options: 'i' } },
        { department: { $regex: safeSearch, $options: 'i' } },
        { designation: { $regex: safeSearch, $options: 'i' } },
        { $expr: { $regexMatch: { input: { $concat: ['$firstName', ' ', '$lastName'] }, regex: safeSearch, options: 'i' } } }
      ];
    }

    const allowedSortFields = ['employeeId', 'firstName', 'lastName', 'email', 'department', 'designation', 'employmentType', 'createdAt'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    const employees = await Employee.find(filter)
      .populate('manager', 'firstName lastName')
      .populate('location', 'name currency country')
      .populate('user', 'username email role')
      .sort({ [sortField]: sortDirection });

    res.json(employees);
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get employee by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate('manager', 'firstName lastName')
      .populate('location', 'name currency country')
      .populate('user', 'username email role')
      .populate('assignedAssets');

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    if (req.user.role === 'employee' && employee.user?._id.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(employee);
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Create employee
router.post('/', authenticateToken, authorizeRole('admin', 'manager'), async (req, res) => {
  try {
    const { createLoginAccess, username, password, ...rawEmployeeData } = req.body;
    const employeeData = sanitizePayload(rawEmployeeData);

    if (createLoginAccess) {
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required to create login access.' });
      }
      const existingUser = await User.findOne({
        username: { $regex: new RegExp(`^${escapeRegex(String(username).trim())}$`, 'i') }
      });
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists.' });
      }
      const user = new User({
        username: String(username).trim(),
        email: employeeData.email,
        password,
        role: 'employee',
        isActive: true
      });
      await user.save();
      employeeData.user = user._id;
    }

    if (!employeeData.employeeId || String(employeeData.employeeId).trim() === '') {
      delete employeeData.employeeId;
    }

    const employee = new Employee(employeeData);
    await employee.save();

    await AuditLog.create({
      user: req.user.userId,
      action: 'employee_created',
      entityType: 'employee',
      entityId: employee._id,
      entityName: `${employee.firstName} ${employee.lastName}`
    });

    await employee.populate('manager location user');
    res.status(201).json(employee);
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update employee
router.put('/:id', authenticateToken, authorizeRole('admin', 'manager'), async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const oldData = employee.toObject();
    const updateData = sanitizePayload(req.body, ['_id', '__v', 'createdAt', 'user']);

    if (updateData.employeeId !== undefined && (updateData.employeeId === null || String(updateData.employeeId).trim() === '')) {
      delete updateData.employeeId;
      employee.employeeId = null;
    }

    Object.assign(employee, updateData);
    employee.updatedAt = new Date();
    await employee.save();
    await employee.populate('manager location user');

    // Keep employeeSnapshot in sync on historical and active assignments
    await Assignment.updateMany(
      { employee: employee._id },
      {
        $set: {
          'employeeSnapshot.employeeId': employee.employeeId || '',
          'employeeSnapshot.firstName': employee.firstName || '',
          'employeeSnapshot.lastName': employee.lastName || '',
          'employeeSnapshot.email': employee.email || '',
          'employeeSnapshot.department': employee.department || '',
          'employeeSnapshot.designation': employee.designation || '',
          'employeeSnapshot.locationName': employee.location?.name || ''
        }
      }
    );

    await AuditLog.create({
      user: req.user.userId,
      action: 'employee_updated',
      entityType: 'employee',
      entityId: employee._id,
      entityName: `${employee.firstName} ${employee.lastName}`,
      changes: { before: oldData, after: employee.toObject() }
    });

    res.json(employee);
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Delete employee (preserves all loaner & ownership history on Assets and Assignments)
router.delete('/:id', authenticateToken, authorizeRole('admin', 'manager'), async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id).populate('location', 'name');
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
    const empLabel = employee.employeeId ? `${employee.employeeId} - ${fullName}` : fullName;

    const snapshot = {
      employeeId: employee.employeeId || '',
      firstName: employee.firstName || '',
      lastName: employee.lastName || '',
      email: employee.email || '',
      department: employee.department || '',
      designation: employee.designation || '',
      locationName: employee.location?.name || '',
      isExited: true
    };

    // 1. Preserve employee details on all Assignments for this employee
    const empAssignments = await Assignment.find({ employee: employee._id });
    const affectedAssetIds = new Set();

    for (const assignment of empAssignments) {
      if (assignment.asset) {
        affectedAssetIds.add(assignment.asset.toString());
      }
      assignment.employeeSnapshot = snapshot;
      if (assignment.status === 'active') {
        assignment.status = 'returned';
        assignment.returnDate = new Date();
        assignment.returnedBy = req.user.userId;
        assignment.returnNotes = assignment.returnNotes
          ? `${assignment.returnNotes} | Auto-returned upon employee exit`
          : 'Auto-returned upon employee exit';
      }
      assignment.updatedAt = new Date();
      await assignment.save();
    }

    // 2. Also find any Assets directly referencing this employee in assignedTo
    const assignedAssets = await Asset.find({ assignedTo: employee._id });
    for (const asset of assignedAssets) {
      affectedAssetIds.add(asset._id.toString());
    }

    // 3. Preserve Old Loaner details & loanerHistory on all affected Assets
    if (affectedAssetIds.size > 0) {
      const assetsToUpdate = await Asset.find({ _id: { $in: Array.from(affectedAssetIds) } });
      for (const asset of assetsToUpdate) {
        const currentOldLoaner = (asset.oldLoaner || '').trim();
        const isEmptyLoaner = !currentOldLoaner || ['none', 'na', 'n/a', '-'].includes(currentOldLoaner.toLowerCase());

        if (isEmptyLoaner) {
          asset.oldLoaner = empLabel;
        } else if (!currentOldLoaner.toLowerCase().includes(fullName.toLowerCase())) {
          asset.oldLoaner = `${empLabel} (Prev: ${currentOldLoaner})`;
        }

        if (!Array.isArray(asset.loanerHistory)) {
          asset.loanerHistory = [];
        }
        asset.loanerHistory.push({
          employeeId: employee.employeeId || '',
          employeeName: fullName,
          email: employee.email || '',
          department: employee.department || '',
          assignedDate: asset.laptopAssignedDate || undefined,
          returnedDate: new Date(),
          notes: 'Preserved automatically when employee exited / was deleted'
        });

        if (asset.assignedTo && asset.assignedTo.toString() === employee._id.toString()) {
          asset.assignedTo = null;
          if (asset.status === 'assigned') {
            asset.status = 'available';
          }
        }
        asset.updatedAt = new Date();
        await asset.save();
      }
    }

    await Employee.findByIdAndDelete(req.params.id);

    await AuditLog.create({
      user: req.user.userId,
      action: 'employee_deleted',
      entityType: 'employee',
      entityId: employee._id,
      entityName: empLabel,
      changes: { before: snapshot }
    });

    res.json({
      message: 'Employee deleted successfully. Asset loaner history and previous owner records have been preserved.'
    });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Bulk upload employees from CSV
router.post('/bulk-upload/csv', authenticateToken, authorizeRole('admin', 'manager'), async (req, res) => {
  try {
    const { data } = req.body;

    if (!Array.isArray(data)) {
      return res.status(400).json({ message: 'Data must be an array' });
    }

    const uploadedEmployees = [];
    for (const item of data) {
      const getVal = (keys) => {
        const itemKeys = Object.keys(item);
        for (const k of keys) {
          const target = k.toLowerCase().replace(/\s/g, '');
          const matchedKey = itemKeys.find(ik => ik.toLowerCase().replace(/\s/g, '') === target);
          if (matchedKey && item[matchedKey] !== undefined) return item[matchedKey];
        }
        return undefined;
      };

      const employeeId = getVal(['Employee ID', 'employeeId', 'Emp ID', 'EMP ID']);
      const firstName = getVal(['First Name', 'firstName']);
      const lastName = getVal(['Last Name', 'lastName']);
      const email = getVal(['Email', 'email']);
      const department = getVal(['Department', 'department']);
      const designation = getVal(['Designation', 'designation']);
      const employmentType = getVal(['Type', 'employmentType', 'Employment Type']);
      const locationName = getVal(['Location', 'location']);

      if (!firstName || !email) continue; // Skip if basic required fields are missing

      let locationId = null;
      if (locationName) {
        const loc = await Location.findOne({
          name: { $regex: new RegExp(`^${escapeRegex(String(locationName).trim())}$`, 'i') }
        });
        if (loc) {
          locationId = loc._id;
        }
      }

      // Check if employee exists to update or skip
      if (employeeId && String(employeeId).trim() !== '') {
        const existing = await Employee.findOne({ employeeId: String(employeeId).trim() });
        if (existing) continue;
      }

      const employeeObj = {
        firstName: String(firstName).trim(),
        lastName: lastName ? String(lastName).trim() : '',
        email: String(email).trim().toLowerCase(),
        department: department ? String(department).trim() : '',
        designation: designation ? String(designation).trim() : '',
        employmentType: employmentType || 'full_time',
        location: locationId
      };

      if (employeeId && String(employeeId).trim() !== '') {
        employeeObj.employeeId = String(employeeId).trim();
      }

      const employee = new Employee(employeeObj);
      await employee.save();
      uploadedEmployees.push(employee);
    }

    await AuditLog.create({
      user: req.user.userId,
      action: 'csv_imported',
      entityType: 'employee',
      entityName: `Bulk employee upload: ${uploadedEmployees.length} employees`
    });

    res.status(201).json({ count: uploadedEmployees.length, employees: uploadedEmployees });
  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
