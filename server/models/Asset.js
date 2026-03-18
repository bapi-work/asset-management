import mongoose from 'mongoose';

const assetSchema = new mongoose.Schema({
  assetTag: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  serialNumber: String,
  manufacturer: String,
  model: String,
  description: String,

  // New Fields from User Request
  priority: String,
  employeeId: String,
  companyClient: String,
  mobileNumber: String,
  internalMailId: String,
  clientMailId: String,
  expressServiceCode: String,
  adapterSerialNumber: String,
  processor: String,
  ram: String,
  storage: String,
  laptopAssignedDate: Date,
  license: String,
  acknowledgementForm: String,
  oldLoaner: String,
  supplierName: String,
  invoiceDate: Date,
  invoiceNo: String,

  // Purchase Information
  purchaseDate: Date,
  purchasePrice: Number,
  currency: {
    type: String,
    default: 'USD'
  },
  vendor: String,
  invoiceNumber: String,

  // Depreciation
  depreciationMethod: {
    type: String,
    enum: ['straight_line', 'declining_balance'],
    default: 'straight_line'
  },
  usefulLife: Number, // in years
  salvageValue: Number,
  currentValue: Number,

  // Status & Location
  status: {
    type: String,
    enum: ['available', 'assigned', 'in_maintenance', 'retired', 'lost'],
    default: 'available'
  },
  location: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },

  // Media
  photoUrl: String,
  qrCode: String,

  // Custom Fields
  customFields: [{
    fieldName: String,
    fieldValue: String
  }],

  // Notes & History
  notes: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Warranty
  warrantyExpiry: Date,
  warrantyProvider: String,
  warrantyStatus: {
    type: String, // Active, Inactive
    default: 'inactive'
  },

  // Service Request
  serviceType: { type: String, enum: ['OEM', 'Local'] },
  serviceStatus: { type: String, enum: ['Pending', 'Approved', ''] },
  damageReason: String,
  damagedItem: String,
  serviceResolution: String,
  serviceCost: Number,

  // Attachments & Reports
  attachments: [{
    name: String,
    url: String,
    type: String, // photo, report, document
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Tracking
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Calculate depreciation on retrieval
assetSchema.methods.calculateDepreciation = function () {
  if (!this.purchaseDate || !this.purchasePrice || !this.usefulLife) {
    return this.purchasePrice;
  }

  const monthsElapsed = (new Date() - new Date(this.purchaseDate)) / (1000 * 60 * 60 * 24 * 30);
  const totalMonths = this.usefulLife * 12;

  if (monthsElapsed >= totalMonths) {
    return this.salvageValue || 0;
  }

  if (this.depreciationMethod === 'straight_line') {
    const monthlyDepreciation = (this.purchasePrice - (this.salvageValue || 0)) / totalMonths;
    return Math.round(this.purchasePrice - (monthlyDepreciation * monthsElapsed));
  } else if (this.depreciationMethod === 'declining_balance') {
    const depreciaationRate = 2 / this.usefulLife;
    let value = this.purchasePrice;
    const monthlyRate = depreciaationRate / 12;
    for (let i = 0; i < monthsElapsed; i++) {
      value -= value * monthlyRate;
    }
    return Math.round(Math.max(value, this.salvageValue || 0));
  }

  return Math.round(this.purchasePrice);
};

export default mongoose.model('Asset', assetSchema);
