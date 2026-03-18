import { Router } from 'express';
import { writeFile } from 'fs/promises';
import { spawn } from 'child_process';
import { gpgDecrypt } from './auth.js';
import { readFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

const PASSWORDS_FILE = process.env.PASSWORDS_FILE || '/etc/linux/passwords.csv.asc';
const GPG_CIRCLE_FILE = process.env.GPG_CIRCLE_FILE || '/etc/linux/gpg-circle.csv';

async function getRecipients() {
  const csv = await readFile(GPG_CIRCLE_FILE, 'utf8');
  return csv.split('\n')
    .filter(l => l.trim() && !l.startsWith('#'))
    .map(l => l.split(',')[2]?.trim())
    .filter(Boolean);
}

async function gpgEncrypt(plaintext, recipients) {
  const args = ['--batch', '--yes', '--no-tty', '--armor'];
  for (const r of recipients) args.push('-r', r);
  args.push('--encrypt');

  return new Promise((resolve, reject) => {
    const proc = spawn('gpg', args);
    proc.stdin.write(plaintext);
    proc.stdin.end();
    let out = '';
    let err = '';
    proc.stdout.on('data', d => (out += d));
    proc.stderr.on('data', d => (err += d));
    proc.on('close', code => (code === 0 ? resolve(out) : reject(new Error(err))));
  });
}

function parseCsv(text) {
  return text.split('\n')
    .filter(l => l.trim())
    .map(l => {
      const [domain, host, user, pass] = l.split(',');
      return { domain, host, user, pass };
    });
}

function buildCsv(rows) {
  return rows.map(r => `${r.domain},${r.host},${r.user},${r.pass}`).join('\n') + '\n';
}

export function createPasswordsRouter() {
  const router = Router();

  router.get('/', async (req, res) => {
    try {
      const plain = await gpgDecrypt(req.passphrase, PASSWORDS_FILE);
      res.json(parseCsv(plain));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.put('/', async (req, res) => {
    try {
      const csv = buildCsv(req.body);
      const recipients = await getRecipients();
      const encrypted = await gpgEncrypt(csv, recipients);
      await writeFile(PASSWORDS_FILE, encrypted);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}
