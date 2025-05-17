const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

// Paths
const rootDir = path.join(__dirname, '..');
const resourcesDir = path.join(rootDir, 'resources');
const buildDir = path.join(rootDir, 'build');
const staticDir = path.join(buildDir, 'static');
const iconScript = path.join(__dirname, 'create-mac-icon.sh');

// Source paths
const projectRoot = path.join(__dirname, '../..');
const electronDir = path.join(projectRoot, 'electron');
const distDir = path.join(projectRoot, 'dist');

// Clean and create necessary directories
fs.removeSync(buildDir);
fs.removeSync(distDir);
fs.ensureDirSync(resourcesDir);
fs.ensureDirSync(buildDir);
fs.ensureDirSync(staticDir);

// Install dependencies in the main project
console.log('📦 Installing dependencies...');
try {
  execSync('npm install', {
    stdio: 'inherit',
    cwd: projectRoot
  });
  console.log('✅ Dependencies installed');
} catch (error) {
  console.error('❌ Error installing dependencies:', error);
  process.exit(1);
}

// Build the Vite app
console.log('🏗️ Building Vite app...');
try {
  execSync('npm run build', { 
    stdio: 'inherit',
    cwd: projectRoot
  });
  console.log('✅ Vite build successful');
} catch (error) {
  console.error('❌ Error building Vite app:', error);
  process.exit(1);
}

// Copy the built files
console.log('📦 Copying built files...');
if (fs.existsSync(distDir)) {
  fs.copySync(distDir, staticDir);
  // Verify the copy
  if (!fs.existsSync(path.join(staticDir, 'index.html'))) {
    console.error('❌ index.html not found in static directory after copy');
    process.exit(1);
  }
  console.log('✅ Built files copied successfully');
} else {
  console.error('❌ Dist directory not found. Make sure the Vite build was successful.');
  process.exit(1);
}

// Copy and modify main.js
console.log('📦 Copying and updating main.js...');
let mainJsContent = fs.readFileSync(path.join(electronDir, 'main.js'), 'utf8');

// Update the path to the index.html file
mainJsContent = mainJsContent.replace(
  "win.loadFile(path.join(__dirname, 'static', 'index.html'))",
  "win.loadFile(path.join(__dirname, 'static', 'index.html'))"
);

fs.writeFileSync(path.join(buildDir, 'main.js'), mainJsContent);

// Make icon conversion script executable and run it
try {
  fs.chmodSync(iconScript, '755');
  execSync(iconScript, { stdio: 'inherit' });
  console.log('✅ Mac icon created successfully');
} catch (error) {
  console.error('❌ Error creating Mac icon:', error);
  process.exit(1);
}

console.log('✅ Build preparation complete');

