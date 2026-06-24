import fs from 'fs';
import path from 'path';

function searchUp(dir) {
  console.log("Searching in:", dir);
  try {
    const files = fs.readdirSync(dir);
    const envs = files.filter(f => f.startsWith('.env'));
    if (envs.length > 0) {
      console.log(`FOUND ENVS in ${dir}:`, envs);
      for (const env of envs) {
        const content = fs.readFileSync(path.join(dir, env), 'utf8');
        console.log(`Content keys of ${env}:`, content.split('\n').map(l => l.split('=')[0].trim()).filter(Boolean));
      }
    }
  } catch (e) {
    console.error("Error reading", dir, e.message);
  }
  const parent = path.dirname(dir);
  if (parent !== dir) {
    searchUp(parent);
  }
}

searchUp(process.cwd());
