/**
 * UI Typography & Modal Consistency Invariant Tests
 * Requirement R4: Consistencia Visual, Tipografía y UI Polish (Milestone 5)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

describe('Milestone 5 (R4): UI Typography & Consistency Invariants', () => {
  test('R4.1: index.css defines .font-display (Fredoka) and .font-body (Outfit) utilities', () => {
    const cssPath = path.join(srcDir, 'index.css');
    assert.ok(fs.existsSync(cssPath), 'index.css must exist');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    assert.match(
      cssContent,
      /\.font-display\s*\{\s*font-family:\s*['"]Fredoka['"]/m,
      '.font-display must define Fredoka cursive font family'
    );
    assert.match(
      cssContent,
      /\.font-body\s*\{\s*font-family:\s*['"]Outfit['"]/m,
      '.font-body must define Outfit sans-serif font family'
    );
  });

  test('R4.2: Zero raw unicode ✕ close buttons exist across src components', () => {
    function scanDir(dir: string): string[] {
      const results: string[] = [];
      const list = fs.readdirSync(dir);
      for (const item of list) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          results.push(...scanDir(fullPath));
        } else if (/\.(tsx|ts|jsx|js)$/.test(item)) {
          results.push(fullPath);
        }
      }
      return results;
    }

    const files = scanDir(srcDir);
    const filesWithRawClose: string[] = [];

    for (const f of files) {
      const content = fs.readFileSync(f, 'utf8');
      if (content.includes('✕')) {
        filesWithRawClose.push(f);
      }
    }

    assert.equal(
      filesWithRawClose.length,
      0,
      `Found raw ✕ characters in components: ${filesWithRawClose.join(', ')}`
    );
  });

  test('R4.3: Zero raw inline font-[\'Outfit\'] or font-[\'Fredoka\'] remain in src', () => {
    function scanDir(dir: string): string[] {
      const results: string[] = [];
      const list = fs.readdirSync(dir);
      for (const item of list) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          results.push(...scanDir(fullPath));
        } else if (/\.(tsx|ts)$/.test(item)) {
          results.push(fullPath);
        }
      }
      return results;
    }

    const files = scanDir(srcDir);
    const filesWithRawInlineFont: string[] = [];

    for (const f of files) {
      const content = fs.readFileSync(f, 'utf8');
      if (content.includes("font-['Outfit']") || content.includes("font-['Fredoka']")) {
        filesWithRawInlineFont.push(f);
      }
    }

    assert.equal(
      filesWithRawInlineFont.length,
      0,
      `Found raw font-['...'] inline definitions in: ${filesWithRawInlineFont.join(', ')}`
    );
  });

  test('R4.4: Modals have standardized close buttons with Lucide X and w-9 h-9 rounded-xl', () => {
    const modalFiles = [
      'components/ui/ShopModal.tsx',
      'components/ui/PauseAndSettingsModal.tsx',
      'components/ui/LeaderboardModal.tsx',
      'components/ui/EventsAndChallengesModal.tsx',
      'components/ui/AvatarCustomizer.tsx',
      'components/modals/MoleCodexModal.tsx',
      'components/modals/PizzaRecipeCodex.tsx',
      'components/camera/CameraTutorialModal.tsx',
    ];

    for (const relPath of modalFiles) {
      const fullPath = path.join(srcDir, relPath);
      assert.ok(fs.existsSync(fullPath), `${relPath} must exist`);
      const content = fs.readFileSync(fullPath, 'utf8');

      // Verify Lucide X is imported
      assert.match(
        content,
        /import\s+[^}]*\bX\b[^}]*from\s+['"]lucide-react['"]/,
        `${relPath} must import X from lucide-react`
      );

      // Verify standard close button classes
      assert.ok(
        content.includes('w-9 h-9') && content.includes('rounded-xl') && content.includes('<X className="w-4 h-4" />'),
        `${relPath} must use standard w-9 h-9 rounded-xl close button with Lucide <X className="w-4 h-4" />`
      );
    }
  });

  test('R4.5: Headers in all modals and App hero use font-display font-black', () => {
    const headerChecks = [
      { file: 'App.tsx', match: /<h1 className="[^"]*font-display[^"]*font-black/ },
      { file: 'components/ui/ShopModal.tsx', match: /<h2 className="[^"]*font-display[^"]*font-black/ },
      { file: 'components/ui/PauseAndSettingsModal.tsx', match: /<h2 className="[^"]*font-display[^"]*font-black/ },
      { file: 'components/ui/LeaderboardModal.tsx', match: /<h2 className="[^"]*font-display[^"]*font-black/ },
      { file: 'components/ui/EventsAndChallengesModal.tsx', match: /<h2 className="[^"]*font-display[^"]*font-black/ },
      { file: 'components/ui/AvatarCustomizer.tsx', match: /<h2 className="[^"]*font-display[^"]*font-black/ },
      { file: 'components/modals/MoleCodexModal.tsx', match: /<h2 className="[^"]*font-display/ },
      { file: 'components/modals/PizzaRecipeCodex.tsx', match: /<h2 className="[^"]*font-display[^"]*font-black/ },
      { file: 'components/ui/GameOverModal.tsx', match: /<h2 className="[^"]*font-display[^"]*font-black/ },
      { file: 'components/camera/CameraTutorialModal.tsx', match: /<h2 className="[^"]*font-display[^"]*font-black/ },
    ];

    for (const { file, match } of headerChecks) {
      const fullPath = path.join(srcDir, file);
      assert.ok(fs.existsSync(fullPath), `${file} must exist`);
      const content = fs.readFileSync(fullPath, 'utf8');
      assert.match(content, match, `${file} header must use font-display typography`);
    }
  });

  test('R4.6: PizzaRecipeCodex is wired in App.tsx and accessible across screens', () => {
    const appPath = path.join(srcDir, 'App.tsx');
    const appContent = fs.readFileSync(appPath, 'utf8');

    // Lazy import
    assert.match(
      appContent,
      /const PizzaRecipeCodex\s*=\s*React\.lazy/,
      'App.tsx must lazy-load PizzaRecipeCodex'
    );

    // Conditional render
    assert.match(
      appContent,
      /activeModal\s*===\s*['"]pizza_codex['"]/,
      'App.tsx must render PizzaRecipeCodex when activeModal is pizza_codex'
    );

    // Menu trigger
    assert.match(
      appContent,
      /setActiveModal\(['"]pizza_codex['"]\)/,
      'App.tsx must allow opening pizza_codex from menu'
    );

    // GameOverModal onOpenCodex wired
    assert.match(
      appContent,
      /onOpenCodex=\{\(\)\s*=>\s*setActiveModal\(['"]pizza_codex['"]\)\}/,
      'App.tsx must wire onOpenCodex on GameOverModal'
    );
  });
});
