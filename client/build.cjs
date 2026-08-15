const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const clientDir = __dirname;
const distDir = path.join(clientDir, 'dist');

// 清理旧构建
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true });
}

console.log('Building frontend with production env...');
try {
  execSync('node node_modules/vite/bin/vite.js build', {
    cwd: clientDir,
    stdio: 'inherit'
  });
  console.log('\nBuild completed!');
  if (fs.existsSync(path.join(distDir, 'index.html'))) {
    console.log('dist/index.html exists: true');
    // 验证API地址是否嵌入
    const jsFiles = fs.readdirSync(path.join(distDir, 'assets')).filter(f => f.endsWith('.js'));
    if (jsFiles.length > 0) {
      const content = fs.readFileSync(path.join(distDir, 'assets', jsFiles[0]), 'utf8');
      const hasApiUrl = content.includes('tcloudbase.com');
      console.log('API URL embedded in build:', hasApiUrl);
    }
  }
} catch (err) {
  console.error('Build failed:', err.message);
  process.exit(1);
}
