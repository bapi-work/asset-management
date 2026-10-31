import mongoose from 'mongoose';

const assignmentSchema = new mongoose.Schema({
  asset: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset',
    required: true
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: false
  },
  employeeSnapshot: {
    employeeId: String,
    firstName: String,
    lastName: String,
    email: String,
    department: String,
    designation: String,
    locationName: String,
    isExited: {
      type: Boolean,
      default: false
    }
  },
  acknowledgementForm: {
    type: String,
    default: ''
  },
  assignedDate: {
    type: Date,
    default: Date.now
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  returnDate: Date,
  returnedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['active', 'returned', 'lost'],
    default: 'active'
  },
  conditionOnReturn: {
    type: String,
    enum: ['good', 'fair', 'poor', 'damaged', 'lost', ''],
    default: 'good'
  },
  notes: String,
  returnNotes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Assignment', assignmentSchema);
