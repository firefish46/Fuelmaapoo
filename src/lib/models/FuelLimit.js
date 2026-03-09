import mongoose from 'mongoose';

const FuelLimitSchema = new mongoose.Schema({
  vehicleClass: { type: String, required: true, unique: true },
  dailyLimitLiters: { type: Number, required: true, min: 0 },
  icon: { type: String, default: '🚗' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.models.FuelLimit || mongoose.model('FuelLimit', FuelLimitSchema);
