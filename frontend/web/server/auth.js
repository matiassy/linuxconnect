import { Router } from 'express';
import { spawn } from 'child_process';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
export const sessions = new Map();

const PASSWORDS_FILE = process.env.PASSWORDS_FILE || '/etc/linux/passwords.csv.asc';

// Usa spawn para evitar shell injection; --pinentry-mode loopback lee el passphrase de stdin
export function gpgDecrypt(passphrase, file) {
  return new Promise((resolve, reject) => {
    const proc = spawn('gpg', [
      '--batch', '--yes', '--no-tty',
      '--pinentry-mode', 'loopback',
      '--passphrase-fd', '0',
      '--decrypt', file
    ]);
    proc.stdin.write(passphrase + '\n');
    proc.stdin.end();
    let out = '';
    let err = '';
    proc.stdout.on('data', d => (out += d));
    proc.stderr.on('data', d => (err += d));
    proc.on('close', code => (code === 0 ? resolve(out) : reject(new Error(err))));
  });
}

export function createAuthRouter() {
  const router = Router();

  router.post('/', async (req, res) => {
    const { passphrase } = req.body;
    if (!passphrase) return res.status(400).json({ error: 'Passphrase requerida' });
    try {
      await gpgDecrypt(passphrase, PASSWORDS_FILE);
      const token = jwt.sign({ ok: true }, JWT_SECRET, { expiresIn: '8h' });
      sessions.set(token, passphrase);
      setTimeout(() => sessions.delete(token), 8 * 60 * 60 * 1000);
      res.json({ token });
    } catch {
      res.status(401).json({ error: 'Passphrase incorrecta o llave GPG no disponible' });
    }
  });

  return router;
}
