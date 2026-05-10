const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const excludeDirs = new Set(['node_modules', 'venv', '.venv', '.scannerwork', '.git', 'dist', 'build', 'venv3']);
const exts = new Set(['.js', '.jsx', '.ts', '.tsx', '.json', '.html', '.md', '.txt', '.env', '.py', '.css']);

let modified = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) {
      // allow dotfiles like .env but skip hidden dirs
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (excludeDirs.has(entry.name)) continue;
      walk(full);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (!exts.has(ext)) continue;
      try {
        let content = fs.readFileSync(full, 'utf8');
        let original = content;

        // Replace exact locale codes used in toLocaleString/date helpers
        content = content.replace(/toLocaleString\(\s*['"]fr-FR['"]\s*,/g, (m) => m.replace("en-IN", 'en-IN'));
        content = content.replace(/toLocaleDateString\(\s*['"]fr-FR['"]\s*,/g, (m) => m.replace("en-IN", 'en-IN'));
        content = content.replace(/['"]fr-FR['"]/g, '"en-IN"');

        // Replace common French text snippets
        content = content.replace(/Invalid date/g, 'Invalid date');
        content = content.replace(/Locating/g, 'Locating');

        // Replace currency symbols and codes
        content = content.replace(/₹/g, '₹');
        content = content.replace(/\bEUR\b/g, 'INR');
        content = content.replace(/\beur\b/g, 'inr');

        if (content !== original) {
          fs.writeFileSync(full, content, 'utf8');
          modified.push(full.replace(root + path.sep, ''));
        }
      } catch (e) {
        console.error('skipping', full, e.message);
      }
    }
  }
}

walk(root);

console.log('Modified files:', modified.length);
modified.forEach(f => console.log('-', f));
