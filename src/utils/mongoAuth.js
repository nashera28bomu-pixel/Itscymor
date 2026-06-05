import mongoose from 'mongoose';

// Define a schema for session data
const sessionSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  data: { type: Object, required: true }
});

const Session = mongoose.models.Session || mongoose.model('Session', sessionSchema);

export async function useMongoDBAuthState() {
  const writeData = async (data, id) => {
    try {
      // Helper to handle Buffers and BigInts for MongoDB compatibility
      const serializedData = JSON.parse(JSON.stringify(data, (key, value) => {
        if (value instanceof Buffer) return { type: 'Buffer', data: Array.from(value) };
        if (typeof value === 'bigint') return value.toString();
        return value;
      }));

      await Session.findByIdAndUpdate(
        id,
        { data: serializedData },
        { upsert: true }
      );
    } catch (err) {
      console.error(`Error saving ${id} to MongoDB:`, err);
    }
  };

  const readData = async (id) => {
    try {
      const doc = await Session.findById(id);
      if (!doc) return null;
      
      // Helper to restore Buffers
      return JSON.parse(JSON.stringify(doc.data), (key, value) => {
        if (value && value.type === 'Buffer') return Buffer.from(value.data);
        return value;
      });
    } catch (err) {
      console.error(`Error reading ${id} from MongoDB:`, err);
      return null;
    }
  };

  // Load existing state
  let creds = await readData('creds');

  // If no creds found, initialize defaults
  if (!creds) {
    creds = {
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
    await writeData(creds, 'creds');
  }

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
