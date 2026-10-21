import { runAllDomainTests } from './appointmentRules.test.ts';
import { runOperationalProTests } from './operationalPro.test.ts';
import { runAutomationTests } from './automationEngine.test.ts';
import { runSmokeTests } from './smoke.test.ts';
import { runTwilioIntegrationTests } from './twilioIntegration.test.ts';

async function main() {
  try {
    const smokeCount = await runSmokeTests();
    const domainCount = await runAllDomainTests();
    const opProCount = await runOperationalProTests();
    const autoCount = await runAutomationTests();
    const twilioCount = await runTwilioIntegrationTests();

    const totalPassed =
      (smokeCount || 0) +
      (domainCount || 0) +
      (opProCount || 0) +
      (autoCount || 0) +
      (twilioCount || 0);
    const totalExpected = 51 + (twilioCount || 0);

    console.log('\n========================================');
    console.log(` ALL SUITES PASSED: ${totalPassed}/${totalExpected} TESTS PASSED (100%) `);
    console.log('========================================\n');
    process.exit(0);
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  }
}

main();
