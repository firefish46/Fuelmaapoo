import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
  vehicleReg: { type: String, required: true, uppercase: true, trim: true },
  ownerName: { type: String, default: 'N/A' },
  vehicleClass: { type: String, required: true },
  amountLiters: { type: Number, required: true, min: 0 },
  pumpId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pump', required: true },
  pumpName: { type: String },
  operatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  operatorName: { type: String },
  status: { type: String, enum: ['valid', 'rejected'], required: true },
  rejectionReason: { type: String },
  dailyTotalAfter: { type: Number },
  dailyLimit: { type: Number },
}, { timestamps: true });

TransactionSchema.index({ vehicleReg: 1, createdAt: -1 });
TransactionSchema.index({ pumpId: 1, createdAt: -1 });

export default mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
