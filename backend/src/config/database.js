import mongoose from 'mongoose';
import { env } from './env.js';
export const connectDatabase = () => mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 });
