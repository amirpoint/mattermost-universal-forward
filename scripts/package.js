// Builds dist/<id>.tar.gz from plugin.json + webapp/dist/main.js
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'plugin.json'), 'utf8'));
const id = manifest.id;
const stage = path.join(root, 'dist', id);

fs.rmSync(path.join(root, 'dist'), {recursive: true, force: true});
fs.mkdirSync(path.join(stage, 'webapp', 'dist'), {recursive: true});
fs.copyFileSync(path.join(root, 'plugin.json'), path.join(stage, 'plugin.json'));
fs.copyFileSync(path.join(root, 'webapp', 'dist', 'main.js'), path.join(stage, 'webapp', 'dist', 'main.js'));
execFileSync('tar', ['-czf', `${id}.tar.gz`, id], {cwd: path.join(root, 'dist')});
console.log(`dist/${id}.tar.gz`);
