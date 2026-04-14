const http = require('http');

http.get('http://localhost:3000/pwa/cmnxj7l4x0002kz04s6exvfno/manifest.json', (res) => {
  console.log('Manifest status:', res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Manifest response:', data.substring(0, 500)));
}).on('error', (err) => console.log('Manifest error:', err.message));

http.get('http://localhost:3000/app/cmnxj7l4x0003kz04r5js866g', (res) => {
  console.log('App status:', res.statusCode);
}).on('error', (err) => console.log('App error:', err.message));
