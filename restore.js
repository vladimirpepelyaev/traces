const { execSync } = require('child_process');
try {
  const out = execSync('git checkout src/App.tsx', { encoding: 'utf8' });
  console.log('Success:', out);
} catch (e) {
  console.error('Error:', e.message);
}
