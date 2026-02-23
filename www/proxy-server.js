// Simple CORS proxy for Open Library (Node.js + Express)

const express = require('express');
const cors = require('cors');
let fetchFn;
try {
  fetchFn = global.fetch ? global.fetch : require('node-fetch');
} catch (e) {
  fetchFn = require('node-fetch');
}

const app = express();
app.use(cors());

app.get('/proxy', async (req, res) => {
  const url = req.query.url;
  console.log('Proxy request for:', url);
  if (!url) return res.status(400).send('Missing url');
  try {
    const response = await fetchFn(url);
    if (!response.ok) {
      const errText = await response.text();
      console.error('Open Library error:', response.status, errText);
      return res.status(response.status).send(`Open Library error: ${response.status} - ${errText}`);
    }
    const data = await response.text();
    res.send(data);
  } catch (e) {
    console.error('Proxy error:', e);
    res.status(500).send('Proxy error: ' + e.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Proxy running on port ' + PORT));
