import { Router, json as jsonParser } from 'express';
import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

const router = Router();
router.use(jsonParser({ limit: '25mb' }));

// In-memory IMAP sessions
const _imapSessions = new Map();

// ---------------------------------------------------------------------------
// Helper: create nodemailer transporter from client-provided creds
// ---------------------------------------------------------------------------
function _createTransporter(smtp) {
  return nodemailer.createTransport({
    host: smtp.host,
    port: Number(smtp.port) || 587,
    secure: smtp.secure ?? (Number(smtp.port) === 465),
    auth: { user: smtp.user, pass: smtp.pass },
    tls: { rejectUnauthorized: false },
  });
}

// ---------------------------------------------------------------------------
// POST /api/email/test-smtp
// ---------------------------------------------------------------------------
router.post('/test-smtp', async (req, res) => {
  try {
    const { host, port, user, pass, secure } = req.body;
    if (!host || !user || !pass) return res.status(400).json({ ok: false, error: 'Host, User und Passwort erforderlich' });
    const transporter = _createTransporter({ host, port, user, pass, secure });
    await transporter.verify();
    transporter.close();
    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/email/test-imap
// ---------------------------------------------------------------------------
router.post('/test-imap', async (req, res) => {
  try {
    const { host, port, user, pass, secure } = req.body;
    if (!host || !user || !pass) return res.status(400).json({ ok: false, error: 'Host, User und Passwort erforderlich' });
    const client = new ImapFlow({
      host, port: Number(port) || 993,
      secure: secure ?? true,
      auth: { user, pass },
      logger: false,
    });
    await client.connect();
    await client.logout();
    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/email/send-batch  (SSE stream)
// ---------------------------------------------------------------------------
router.post('/send-batch', async (req, res) => {
  const { smtp, emails, delay } = req.body;
  if (!smtp || !emails?.length) return res.status(400).json({ error: 'smtp + emails[] erforderlich' });

  // SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const transporter = _createTransporter(smtp);
  let sent = 0, failed = 0;

  for (let i = 0; i < emails.length; i++) {
    const em = emails[i];
    send({ index: i, status: 'sending', to: em.to });
    try {
      const info = await transporter.sendMail({
        from: smtp.from || smtp.user,
        to: em.to,
        subject: em.subject || '',
        text: em.text || '',
        html: em.html || undefined,
        attachments: (em.attachments || []).map((a) => ({
          filename: a.filename,
          content: Buffer.from(a.content, 'base64'),
          contentType: a.contentType || 'application/pdf',
        })),
      });
      send({ index: i, status: 'sent', messageId: info.messageId });
      sent++;
    } catch (e) {
      send({ index: i, status: 'error', error: e.message });
      failed++;
    }
    if (i < emails.length - 1) await wait(delay || 1000);
  }

  transporter.close();
  send({ done: true, sent, failed });
  res.end();
});

// ---------------------------------------------------------------------------
// POST /api/email/watch  (SSE — IMAP IDLE)
// ---------------------------------------------------------------------------
router.post('/watch', async (req, res) => {
  const { imap, forwardSmtp, forwardTo, renamePattern } = req.body;
  if (!imap || !forwardSmtp || !forwardTo) return res.status(400).json({ error: 'imap + forwardSmtp + forwardTo erforderlich' });

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const send = (data) => { try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch {} };
  const sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  const client = new ImapFlow({
    host: imap.host,
    port: Number(imap.port) || 993,
    secure: imap.secure ?? true,
    auth: { user: imap.user, pass: imap.pass },
    logger: false,
  });

  _imapSessions.set(sessionId, client);

  try {
    await client.connect();
    send({ type: 'connected', sessionId, inbox: 'INBOX' });

    const lock = await client.getMailboxLock('INBOX');
    try {
      // Track highest UID so we only process new messages
      let lastUid = client.mailbox.uidNext - 1;

      client.on('exists', async (data) => {
        try {
          // Fetch new messages since lastUid
          const range = `${lastUid + 1}:*`;
          for await (const msg of client.fetch(range, { envelope: true, bodyStructure: true, source: true })) {
            lastUid = Math.max(lastUid, msg.uid);
            const from = msg.envelope?.from?.[0]?.address || 'unknown';
            const subject = msg.envelope?.subject || '(kein Betreff)';

            // Parse attachments from source
            const attachments = [];
            if (msg.source) {
              const parsed = await simpleParser(msg.source);
              for (const att of (parsed.attachments || [])) {
                if (att.contentType === 'application/pdf' || att.filename?.toLowerCase().endsWith('.pdf')) {
                  // Rename according to pattern
                  let newName = (renamePattern || '{Von}_{Betreff}_{Original}')
                    .replace(/\{Von\}/gi, from.split('@')[0])
                    .replace(/\{Betreff\}/gi, subject.replace(/[^a-zA-Z0-9äöüÄÖÜß_\- ]/g, '').trim())
                    .replace(/\{Datum\}/gi, new Date().toISOString().slice(0, 10))
                    .replace(/\{Original\}/gi, att.filename?.replace(/\.pdf$/i, '') || 'Anhang');
                  newName = newName.replace(/\s+/g, '_') + '.pdf';
                  attachments.push({ filename: newName, content: att.content });
                }
              }
            }

            if (attachments.length) {
              // Forward via nodemailer
              const fwdTransporter = _createTransporter(forwardSmtp);
              await fwdTransporter.sendMail({
                from: forwardSmtp.from || forwardSmtp.user,
                to: forwardTo,
                subject: `Fwd: ${subject}`,
                text: `Weitergeleitete Nachricht von ${from}\nBetreff: ${subject}\n\nAnhänge wurden umbenannt.`,
                attachments: attachments.map((a) => ({
                  filename: a.filename,
                  content: a.content,
                })),
              });
              fwdTransporter.close();
              send({ type: 'forwarded', from, subject, attachments: attachments.map((a) => a.filename), to: forwardTo });
            } else {
              send({ type: 'skipped', from, subject, reason: 'Kein PDF-Anhang' });
            }
          }
        } catch (e) {
          send({ type: 'error', message: 'Fetch/Forward: ' + e.message });
        }
      });

      // Keep connection alive until client disconnects or watch-stop
      await new Promise((resolve) => {
        req.on('close', resolve);
        client.on('close', resolve);
        client.on('error', (e) => { send({ type: 'error', message: e.message }); resolve(); });
      });
    } finally {
      lock.release();
    }
  } catch (e) {
    send({ type: 'error', message: e.message });
  } finally {
    _imapSessions.delete(sessionId);
    try { await client.logout(); } catch {}
    res.end();
  }
});

// ---------------------------------------------------------------------------
// POST /api/email/watch-stop
// ---------------------------------------------------------------------------
router.post('/watch-stop', async (req, res) => {
  const { sessionId } = req.body;
  const client = _imapSessions.get(sessionId);
  if (client) {
    try { await client.logout(); } catch {}
    _imapSessions.delete(sessionId);
    res.json({ ok: true });
  } else {
    res.json({ ok: false, error: 'Session nicht gefunden' });
  }
});

export default router;
