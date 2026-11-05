// ============================================================
// TADASHI — Mark LVI Milestone 4 Test Suite
// Verifies: Skills Catalogue, Package Integrity Digests,
// Sandboxed Test Execution, Permission Expansion Detection,
// and Complete Lifecycle (Inspect, Run, Toggle, Update, Rollback, Uninstall).
// ============================================================

const assert = require('assert');

// 1. Mock Browser Environment
const storage = {};
global.localStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
};
global.window = global;
global.performance = global.performance || { now: () => Date.now() };

// Mock DB
global.DB = {
  tasks: {
    list: () => [{ id: 1, title: 'Exam Prep' }]
  },
  calendar: {
    list: () => [{ id: 2, title: 'Lecture' }]
  },
  routines: {
    list: () => [{ id: 3, name: 'Morning run' }]
  },
  knowledge: {
    list: () => [{ id: 4, title: 'Operating Systems', preview: 'Kernel vs User space' }]
  }
};

// Load SkillRuntime & PC Agent
require('../js/assistant/skill-runtime.js');
const { PCAgent } = require('../server/src/agent/pc-agent');

async function runMilestone4Tests() {
  console.log('--- STARTING MARK LVI MILESTONE 4 SUITE: SKILLS CATALOGUE & LIFECYCLE ---');

  // -------------------------------------------------------------
  // Test 1: Central Skills Catalogue Search & Inspection
  // -------------------------------------------------------------
  const catalogueList = SkillRuntime.catalogue.list();
  assert(Array.isArray(catalogueList), 'Catalogue list must be an array');
  assert(catalogueList.length >= 4, 'Catalogue must include all seed skills');

  // Verify seeds are present
  const seedIds = catalogueList.map(s => s.id);
  assert(seedIds.includes('lecture-notes-summarizer'));
  assert(seedIds.includes('flashcard-generator'));
  assert(seedIds.includes('daily-agenda-planner'));
  assert(seedIds.includes('habit-streak-tracker'));

  // Search catalogue by query
  const searchAgenda = SkillRuntime.catalogue.search('agenda');
  assert.strictEqual(searchAgenda.length, 1);
  assert.strictEqual(searchAgenda[0].id, 'daily-agenda-planner');

  // Inspect skill from catalogue
  const inspection = SkillRuntime.inspect('daily-agenda-planner');
  assert.strictEqual(inspection.id, 'daily-agenda-planner');
  assert(Array.isArray(inspection.permissions));
  assert(inspection.permissions.includes('tasks.read'));
  assert(inspection.permissions.includes('calendar.read'));
  assert.strictEqual(inspection.isInstalled, false);
  console.log('✓ Test 1: Central skills catalogue searchable and inspectable with complete metadata');

  // -------------------------------------------------------------
  // Test 2: Package Integrity Digest Verification
  // -------------------------------------------------------------
  const sampleCode = 'function run(inputs) { return "ok"; }';
  const validDigest = SkillRuntime.computeDigest(sampleCode);
  assert(validDigest.startsWith('sha256:'), 'Digest must follow sha256 format');

  // Integrity passes for authentic code
  const verifyPass = SkillRuntime.verifyPackageIntegrity(
    { id: 'test-skill', digest: validDigest },
    sampleCode,
    validDigest
  );
  assert.strictEqual(verifyPass.ok, true);

  // Tampered code must fail integrity check
  const tamperedCode = 'function run(inputs) { return "tampered payload"; }';
  const verifyFail = SkillRuntime.verifyPackageIntegrity(
    { id: 'test-skill', digest: validDigest },
    tamperedCode,
    validDigest
  );
  assert.strictEqual(verifyFail.ok, false);
  assert(verifyFail.error.includes('Package integrity check failed'), 'Tampered package must be rejected');
  console.log('✓ Test 2: Package integrity digest strictly prevents installation of corrupted/tampered code');

  // -------------------------------------------------------------
  // Test 3: Sandboxed Test Execution Requirement
  // -------------------------------------------------------------
  const failingSkill = {
    id: 'broken-skill',
    name: 'Broken Skill',
    version: '1.0.0',
    description: 'Skill with broken unit tests',
    runtime: 'isolated-worker',
    permissions: ['tasks.read'],
    network: { enabled: false, allowed_domains: [] },
    inputs: [],
    outputs: [],
    risk: 'read',
    requiresApproval: true,
    tests: ['failing_test']
  };

  SkillRuntime.draftSkill(
    failingSkill,
    () => 'result',
    (ctx) => { ctx.assert(false, 'Simulated sandbox test failure'); }
  );

  const blockedInstall = await SkillRuntime.install(failingSkill, { isApproved: true });
  assert.strictEqual(blockedInstall.ok, false);
  assert(blockedInstall.error.includes('Sandboxed tests failed'), 'Installation must be blocked when tests fail');
  console.log('✓ Test 3: Sandboxed test failures strictly block skill installation');

  // -------------------------------------------------------------
  // Test 4: Human Approval Gate & Permission Expansion Detection
  // -------------------------------------------------------------
  const newSkill = {
    id: 'daily-agenda-planner',
    name: 'Daily Agenda Planner',
    version: '1.0.0',
    description: 'Synthesizes scheduled calendar blocks, tasks, and routines.',
    runtime: 'isolated-worker',
    permissions: ['tasks.read', 'calendar.read'],
    network: { enabled: false, allowed_domains: [] },
    inputs: [],
    outputs: [],
    risk: 'read',
    requiresApproval: true,
    tests: ['test_agenda']
  };

  // 1. Initial install without approval -> generates proposal card
  const unapprovedInstall = await SkillRuntime.install(newSkill, { isApproved: false });
  assert.strictEqual(unapprovedInstall.ok, false);
  assert.strictEqual(unapprovedInstall.approvalRequired, true);
  assert(unapprovedInstall.proposal, 'Must generate proposal card');

  // 2. Install with user approval
  const approvedInstall = await SkillRuntime.install(newSkill, { isApproved: true });
  assert.strictEqual(approvedInstall.ok, true);
  assert.strictEqual(approvedInstall.skill.status, 'enabled');

  // 3. Update skill requesting EXPANDED permissions (adding 'tasks.write')
  const expandedSkill = {
    ...newSkill,
    version: '1.1.0',
    permissions: ['tasks.read', 'calendar.read', 'tasks.write'] // Added 'tasks.write'!
  };

  const expansionCheck = await SkillRuntime.install(expandedSkill, { isApproved: false });
  assert.strictEqual(expansionCheck.ok, false);
  assert.strictEqual(expansionCheck.approvalRequired, true);
  assert.strictEqual(expansionCheck.isPermissionExpansion, true, 'Must detect permission expansion');
  assert.deepStrictEqual(expansionCheck.addedPermissions, ['tasks.write']);
  assert(expansionCheck.proposal.title.includes('Permission Expansion Requested'), 'Proposal title must warn user');
  assert(expansionCheck.proposal.consequence.includes('tasks.write'), 'Proposal consequence must specify added permissions');

  // Approve permission expansion
  const approvedExpansion = await SkillRuntime.install(expandedSkill, { isApproved: true });
  assert.strictEqual(approvedExpansion.ok, true);
  assert.strictEqual(approvedExpansion.skill.version, '1.1.0');
  console.log('✓ Test 4: Approval gates require explicit confirmation and highlight permission expansions');

  // -------------------------------------------------------------
  // Test 5: Full Lifecycle: Execute, Toggle, Rollback, Uninstall
  // -------------------------------------------------------------
  // Execution
  const execRes = await SkillRuntime.execute('daily-agenda-planner', {});
  assert.strictEqual(execRes.ok, true);
  assert(execRes.output.includes('Daily Agenda Plan'));

  // Toggle (Disable)
  SkillRuntime.toggle('daily-agenda-planner', false);
  const disabledExec = await SkillRuntime.execute('daily-agenda-planner', {});
  assert.strictEqual(disabledExec.ok, false);
  assert(disabledExec.error.includes('currently disabled'));

  // Re-enable
  SkillRuntime.toggle('daily-agenda-planner', true);

  // Rollback to v1.0.0
  const rollbackRes = SkillRuntime.rollback('daily-agenda-planner');
  assert.strictEqual(rollbackRes.ok, true);
  assert.strictEqual(rollbackRes.version, '1.0.0');
  const rolledBackItem = SkillRuntime.listInstalled().find(s => s.id === 'daily-agenda-planner');
  assert.strictEqual(rolledBackItem.version, '1.0.0');

  // Uninstall
  const uninstallRes = SkillRuntime.uninstall('daily-agenda-planner');
  assert.strictEqual(uninstallRes.ok, true);
  assert.strictEqual(SkillRuntime.listInstalled().some(s => s.id === 'daily-agenda-planner'), false);
  console.log('✓ Test 5: Complete lifecycle (execute, disable, rollback, uninstall) verified');

  // -------------------------------------------------------------
  // Test 6: PC Local Agent Skills Inventory
  // -------------------------------------------------------------
  const pcAgent = new PCAgent({ deviceId: 'dev_pc_laptop_skills' });
  const localSkillsInventory = pcAgent.listLocalSkills([
    { id: 'lecture-notes-summarizer', name: 'Summarizer', version: '1.0.0', runtime: 'isolated-worker', status: 'enabled', permissions: ['knowledge.read'] }
  ]);
  assert.strictEqual(localSkillsInventory.length, 1);
  assert.strictEqual(localSkillsInventory[0].id, 'lecture-notes-summarizer');
  assert.strictEqual(localSkillsInventory[0].status, 'enabled');
  console.log('✓ Test 6: PC Companion Agent successfully tracks and reports local skills inventory');

  console.log('\n=============================================================');
  console.log('ALL 6 TESTS PASSED SUCCESSFULLY! MARK LVI MILESTONE 4 VERIFIED.');
  console.log('=============================================================');
}

runMilestone4Tests().catch(err => {
  console.error('\nTEST SUITE FAILED:', err);
  process.exit(1);
});
