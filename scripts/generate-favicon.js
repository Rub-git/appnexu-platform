import fs from 'fs';
import sharp from 'sharp';
import toIco from 'to-ico';

async function createFavicon() {
  const logoPath = 'public/images/appnexu-logo.jpg';
  const faviconPath = 'public/favicon.ico';

  // Redimensionar el logo a 32x32 y 48x48 px
  const sizes = [32, 48];
  const pngBuffers = await Promise.all(
    sizes.map(size => sharp(logoPath).resize(size, size).png().toBuffer())
  );

  // Convertir los PNGs a un solo .ico
  const icoBuffer = await toIco(pngBuffers);
  fs.writeFileSync(faviconPath, icoBuffer);
  console.log('Favicon generado correctamente:', faviconPath);
}

createFavicon().catch(console.error);
