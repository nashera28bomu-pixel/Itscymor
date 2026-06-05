import mongoose from 'mongoose';

export async function connectDB() {
  if (!process.env.MONGODB_URI) {
    console.log('⚠️  No MongoDB URI found. Running without database.');
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    console.log('⚠️  Running without database...');
  }
}

// User schema (for future multi-user support)
const userSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  name: String,
  joinedAt: { type: Date, default: Date.now },
  isBanned: { type: Boolean, default: false },
  commandCount: { type: Number, default: 0 },
  lastSeen: Date,
  favouriteTeam: String,
  favouriteLeague: String,
});

export const User = mongoose.models.User || mongoose.model('User', userSchema);
