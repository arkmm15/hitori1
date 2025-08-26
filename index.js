const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} = require('@adiwajshing/baileys');
const P = require('pino');

async function startBot() {
  // Simpan sesi di folder "session"
  const { state, saveCreds } = await useMultiFileAuthState('session');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: P({ level: 'silent' }),
    printQRInTerminal: true, // QR muncul di terminal
    auth: state,
    browser: ['TermuxBot', 'Chrome', '20.0']
  });

  // Simpan sesi otomatis
  sock.ev.on('creds.update', saveCreds);

  // Status koneksi
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'open') {
      console.log('✅ Bot tersambung ke WhatsApp');
    } else if (connection === 'close') {
      console.log('❌ Koneksi terputus, mencoba ulang...');
      startBot();
    }
  });

  // Pairing Code (gunakan sekali untuk login via kode, bukan QR)
  if (!sock.authState.creds.registered) {
    const nomor = '6281234567890'; // ganti dengan nomor kamu
    try {
      const pairingCode = await sock.requestPairingCode(nomor);
      console.log('🔑 Pairing Code untuk', nomor, ':', pairingCode);
      console.log('👉 Buka WhatsApp > Linked Devices > Pair with Code');
    } catch (err) {
      console.error('Gagal membuat pairing code:', err);
    }
  }

  // Handler pesan masuk
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.remoteJid;
    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      '';

    console.log('📩 Dari', sender, ':', text);

    // AUTO REPLY
    if (text.toLowerCase() === 'ping') {
      await sock.sendMessage(sender, { text: 'Pong 🏓' });
    } else if (text.toLowerCase() === 'halo') {
      await sock.sendMessage(sender, {
        text: 'Hai 👋, saya bot sederhana. Ketik *help* untuk daftar perintah.'
      });
    } else if (text.toLowerCase() === 'help') {
      await sock.sendMessage(sender, {
        text: `📌 *Menu Bot*
1. halo → sapaan bot
2. ping → cek bot hidup
3. info → tentang bot
4. help → menampilkan menu ini`
      });
    } else if (text.toLowerCase() === 'info') {
      await sock.sendMessage(sender, {
        text: '🤖 Bot WhatsApp sederhana berbasis *Baileys*.\nDijalankan di Termux dengan Node.js v24.'
      });
    }
  });
}

// Jalankan bot
startBot().catch((err) => console.error('Bot error:', err));