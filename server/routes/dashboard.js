import express from 'express';
import Asset from '../models/Asset.js';
import Assignment from '../models/Assignment.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';
import mongoose from 'mongoose';

const router = express.Router();

router.get('/stats', authenticateToken, async (req, res) => {
  try {
    let matchCondition = {};
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ user: req.user.userId });
      if (employee) {
        matchCondition = { assignedTo: employee._id };
      } else {
        matchCondition = { _id: null };
      }
    }

    const totalAssets = await Asset.countDocuments(matchCondition);
    const assignedAssets = await Asset.countDocuments({ ...matchCondition, status: 'assigned' });
    const availableAssets = await Asset.countDocuments({ ...matchCondition, status: 'available' });
    const maintenanceAssets = await Asset.countDocuments({ ...matchCondition, status: 'in_maintenance' });
    const retiredAssets = await Asset.countDocuments({ ...matchCondition, status: 'retired' });
    const lostAssets = await Asset.countDocuments({ ...matchCondition, status: 'lost' });

    let totalEmployees = 0;
    let activeEmployees = 0;
    let totalUsers = 0;

    if (req.user.role !== 'employee') {
      totalEmployees = await Employee.countDocuments();
      activeEmployees = await Employee.countDocuments({ isActive: true });
      totalUsers = await User.countDocuments();
    }

    const assetsByType = await Asset.aggregate([
      { $match: matchCondition },
      { $group: { _id: { $toLower: '$type' }, count: { $sum: 1 } } }
    ]);

    const assetsByStatus = [
      { status: 'available', count: availableAssets },
      { status: 'assigned', count: assignedAssets },
      { status: 'in_maintenance', count: maintenanceAssets },
      { status: 'retired', count: retiredAssets },
      { status: 'lost', count: lostAssets }
    ];

    res.json({
      totalAssets,
      assignedAssets,
      availableAssets,
      maintenanceAssets,
      retiredAssets,
      lostAssets,
      totalEmployees,
      activeEmployees,
      totalUsers,
      assetsByType,
      assetsByStatus
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get asset depreciation summary
router.get('/depreciation', authenticateToken, async (req, res) => {
  try {
    let matchCondition = { purchasePrice: { $exists: true, $gt: 0 } };
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ user: req.user.userId });
      if (employee) {
        matchCondition.assignedTo = employee._id;
      } else {
        matchCondition._id = null;
      }
    }

    const assets = await Asset.find(matchCondition);

    let totalPurchaseValue = 0;
    let totalCurrentValue = 0;

    assets.forEach(asset => {
      totalPurchaseValue += asset.purchasePrice || 0;
      totalCurrentValue += asset.calculateDepreciation();
    });

    const totalDepreciation = totalPurchaseValue - totalCurrentValue;
    const depreciationPercentage = ((totalDepreciation / totalPurchaseValue) * 100).toFixed(2);

    res.json({
      totalPurchaseValue,
      totalCurrentValue,
      totalDepreciation,
      depreciationPercentage,
      assetCount: assets.length
    });
  } catch (error) {
    console.error('Get depreciation error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get recent assignments
router.get('/recent-assignments', authenticateToken, async (req, res) => {
  try {
    let matchCondition = {};
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ user: req.user.userId });
      if (employee) {
        matchCondition = { employee: employee._id };
      } else {
        matchCondition = { _id: null };
      }
    }

    const recentAssignments = await Assignment.find(matchCondition)
      .populate('asset', 'name assetTag')
      .populate('employee', 'firstName lastName')
      .sort({ assignedDate: -1 })
      .limit(10);

    res.json(recentAssignments);
  } catch (error) {
    console.error('Get recent assignments error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get system health
router.get('/health', authenticateToken, async (req, res) => {
  try {
    const dbConnection = mongoose.connection.readyState === 1;
    const timestamp = new Date();

    res.json({
      status: dbConnection ? 'healthy' : 'unhealthy',
      database: dbConnection ? 'connected' : 'disconnected',
      timestamp
    });
  } catch (error) {
    console.error('Get health error:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
