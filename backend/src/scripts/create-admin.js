import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import { parseCredentials } from '../validators/auth.js';
import { createUser } from '../services/auth.service.js';
import User from '../models/User.js';

let muted = false;
const output = new Writable({ write(chunk, encoding, done) { if (!muted) process.stdout.write(chunk); done(); } });
const rl = createInterface({ input: process.stdin, output, terminal: true });
try {
  const fullName = await rl.question('Admin full name: ');
  const email = await rl.question('Admin email: ');
  process.stdout.write('Admin password (hidden): ');
  muted = true;
  const password = await rl.question('');
  muted = false;
  process.stdout.write('\n');
  const credentials = parseCredentials({ fullName, email, password, role: 'admin' }, true, true);
  await connectDatabase();
  await User.init();
  await createUser(credentials);
  console.log('Admin created. Existing accounts were not changed.');
} catch (error) {
  console.error(error.status ? error.message : `Cannot create admin (${error.name}).`);
  process.exitCode = 1;
} finally {
  rl.close();
  await mongoose.disconnect();
}
