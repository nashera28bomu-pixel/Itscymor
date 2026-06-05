import http from 'http';

let server = null;

export function startKeepAlive() {
  const PORT = process.env.PORT || 3000;

  // Create a simple HTTP server so Render can ping it
  server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'online',
      bot: 'Cymor Football Analyzer',
      version: '1.0.0',
      uptime: Math.floor(process.uptime()),
      timezone: 'EAT (UTC+3)',
      timestamp: new Date().toISOString(),
    }));
  });

  server.listen(PORT, () => {
    console.log(`🌐 Keep-alive server running on port ${PORT}`);
    console.log(`📌 Add this URL to UptimeRobot to prevent sleep:`);
    console.log(`   https://your-app.onrender.com\n`);
  });

  // Self-ping every 14 minutes to stay awake
  if (process.env.RENDER_URL) {
    setInterval(async () => {
      try {
        const url = process.env.RENDER_URL;
        const req = http.get(url, (res) => {
          console.log(`🏓 Self-ping: ${res.statusCode} — ${new Date().toLocaleTimeString('en-KE', { timeZone: 'Africa/Nairobi' })} EAT`);
        });
        req.on('error', () => {}); // Silently handle errors
      } catch (_) {}
    }, 14 * 60 * 1000); // every 14 minutes
  }
}
