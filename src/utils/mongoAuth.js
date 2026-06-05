import mongoose from 'mongoose';

// Define a schema for session data
const sessionSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  data: { type: Object, required: true }
});

const Session = mongoose.models.Session || mongoose.model('Session', sessionSchema);

export async function useMongoDBAuthState() {
  const SESSION_ID = 'cymor-bot-session';

  const writeData = async (data, id) => {
    try {
      await Session.findByIdAndUpdate(
        id,
        { data: JSON.parse(JSON.stringify(data, (_, v) => (typeof v === 'bigint' ? v.toString() : v))) },
        { upsert: true }
      );
    } catch (err) {
      console.error('Error saving to MongoDB:', err);
    }
  };

  const readData = async (id) => {
    try {
      const doc = await Session.findById(id);
      return doc ? doc.data : null;
    } catch (err) {
      console.error('Error reading from MongoDB:', err);
      return null;
    }
  };

  // Load existing state
  const creds = (await readData('creds')) || {
    noiseKey: { public: Buffer.alloc(0), private: Buffer.alloc(0) },
    signedIdentityKey: { public: Buffer.alloc(0), private: Buffer.alloc(0) },
    signedPreKey: { keyId: 0, keySignature: Buffer.alloc(0), publicKey: Buffer.alloc(0) },
    registrationId: 0,
    advSecretKey: '',
    processedHistoryMessages: [],
    nextPreKeyId: 1,
    firstUnuploadedPreKeyId: 1,
    accountSettings: {},
    registered: false,
    pairingCode: null,
  };

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          for (const id of ids) {
            const val = await readData(`${type}-${id}`);
            if (val) data[id] = val;
          }
          return data;
        },
        set: async (data) => {
          for (const type in data) {
            for (const id in data[type]) {
              await writeData(data[type][id], `${type}-${id}`);
            }
          }
        },
      },
    },
    saveCreds: () => writeData(creds, 'creds'),
  };
}
