import mongoose from 'mongoose';
import app from './app.js';
import { env, requireJwtSecret } from './config/env.js';
import { connectDatabase } from './config/database.js';
import User from './models/User.js';
import Favorite from './models/Favorite.js';
import Notification from './models/Notification.js';
import Conversation from './models/Conversation.js';
import ChatMessage from './models/ChatMessage.js';
try {
  requireJwtSecret();
  await connectDatabase();
  await User.init();
  await Favorite.init();
  await Notification.init();
  await Conversation.init();
  await ChatMessage.init();
  const server = app.listen(env.port, () => console.log(`API: http://localhost:${env.port}/api/v1`));
  let closing = false;
  const shutdown = () => {
    if (closing) return;
    closing = true;
    const timer = setTimeout(() => process.exit(1), 10000);
    timer.unref();
    server.close(async () => {
      await mongoose.disconnect();
      clearTimeout(timer);
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (error) {
  console.error('Cannot start API:', error.message);
  process.exitCode = 1;
}

