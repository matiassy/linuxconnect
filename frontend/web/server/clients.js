import { Router } from 'express';
import { readFile, writeFile } from 'fs/promises';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

const CLIENTS_FILE = process.env.CLIENTS_FILE || '/etc/linux/clientes.xml';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  isArray: name => name === 'domain' || name === 'host'
});

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  format: true,
  indentBy: '   ',
  suppressBooleanAttributes: false
});

export function createClientsRouter() {
  const router = Router();

  router.get('/', async (_req, res) => {
    try {
      const xml = await readFile(CLIENTS_FILE, 'utf8');
      const parsed = parser.parse(xml);
      res.json(parsed.config);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.put('/', async (req, res) => {
    try {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` + builder.build({ config: req.body });
      await writeFile(CLIENTS_FILE, xml);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}
