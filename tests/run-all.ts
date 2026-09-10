/**
 * Master Test Runner for WhackAMole MediaPipe Hands E2E Test Suite
 * Executes Tier 1, Tier 2, Tier 3, and Tier 4 in sequence.
 */

import { run } from 'node:test';
import { spec } from 'node:test/reporters';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runAllTests() {
  console.log('================================================================');
  console.log('  WhackAMole MediaPipe Hands 4-Tier E2E Test Suite Runner');
  console.log('================================================================\n');

  const testFiles = [
    path.resolve(__dirname, 'tier1_features.test.ts'),
    path.resolve(__dirname, 'tier2_boundaries.test.ts'),
    path.resolve(__dirname, 'tier2_camera_tutorial.test.ts'),
    path.resolve(__dirname, 'tier3_combinations.test.ts'),
    path.resolve(__dirname, 'tier4_gameplay_scenarios.test.ts'),
    path.resolve(__dirname, 'handDetector_adversarial.test.ts'),
    path.resolve(__dirname, 'tier3_audio_feedback.test.ts'),
  ];

  const startTime = Date.now();

  try {
    const stream = run({
      files: testFiles,
      concurrency: 1, // Run sequentially for deterministic leak auditing
    });

    stream.compose(new spec()).pipe(process.stdout);

    let failed = false;

    stream.on('test:fail', () => {
      failed = true;
    });

    stream.on('end', () => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log('\n================================================================');
      console.log(`  Test Suite Completed in ${elapsed}s`);
      if (failed) {
        console.log('  STATUS: FAILED ❌');
        process.exitCode = 1;
      } else {
        console.log('  STATUS: ALL TESTS PASSED ✅ (100% Invariants Satisfied)');
      }
      console.log('================================================================\n');
    });
  } catch (err) {
    console.error('Test execution failed with error:', err);
    process.exit(1);
  }
}

runAllTests();
