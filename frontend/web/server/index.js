import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import jwt from 'jsonwebtoken';
import { createAuthRouter, sessions, JWT_SECRET } from './auth.js';
import { createClientsRouter } from './clients.js';
import { createPasswordsRouter } from './passwords.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'No autorizado' });
  const token = auth.slice(7);
  try {
    jwt.verify(token, JWT_SECRET);
    const passphrase = sessions.get(token);
    if (!passphrase) return res.status(401).json({ error: 'Sesión expirada' });
    req.passphrase = passphrase;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

app.use('/api/auth', createAuthRouter());
app.use('/api/clients', requireAuth, createClientsRouter());
app.use('/api/passwords', requireAuth, createPasswordsRouter());

// Serve built React app
app.use(express.static(path.join(__dirname, '../dist')));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, '../dist/index.html')));

app.listen(3000, '0.0.0.0', () => console.log('LinuxConnect Web corriendo en :3000'));
