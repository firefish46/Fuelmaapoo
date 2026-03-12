import mongoose from 'mongoose';

const PumpSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  location: { type: String, required: true },
  lat:      { type: Number, default: null },
  lng:      { type: Number, default: null },
  status:   { type: String, enum: ['online', 'offline'], default: 'online' },
}, { timestamps: true });

export default mongoose.models.Pump || mongoose.model('Pump', PumpSchema);