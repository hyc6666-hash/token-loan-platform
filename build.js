const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const clientDir = path.join(__dirname, 'client');
const distDir = path.join(clientDir, 'dist');

console.log('Building frontend...');
try {
  execSync('node node_modules/vite/bin/vite.js build', {
    cwd: clientDir,
    stdio: 'inherit',
    env: { ...process.env, PATH: path.join(process.env.USERPROFILE || '', 'tools', 'nodejs') + ';' + process.env.PATH }
  });
  console.log('\nBuild completed!');
  
  if (fs.existsSync(distDir)) {
    const files = fs.readdirSync(distDir, { recursive: true });
    console.log(`Output files: ${files.length}`);
    console.log(`dist/index.html exists: ${fs.existsSync(path.join(distDir, 'index.html'))}`);
  }
} catch (err) {
  console.error('Build failed:', err.message);
  process.exit(1);
}
