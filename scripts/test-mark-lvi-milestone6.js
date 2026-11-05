// ============================================================
// TADASHI LifeOS — Automated Test Suite: Mark LVI Milestone 6
// PC Operations, Scoped Capabilities, Emergency Stop & Presence
// ============================================================

const assert = require('assert');
const path = require('path');
const { PCAgent, SUPPORTED_SCOPES, OUTCOME } = require('../server/src/agent/pc-agent.js');

async function runMilestone6Tests() {
  console.log('--- RUNNING MARK LVI MILESTONE 6 TEST SUITE ---');

  // ------------------------------------------------------------
  // Test 1: Device Pairing Gate
  // ------------------------------------------------------------
  console.log('\n[Test 1] Device Pairing Gate & Unpaired Action Rejection');

  const unpairedAgent = new PCAgent({
    deviceId: 'dev_unpaired_test',
    deviceName: 'Unpaired Test PC',
    isPairedDevice: false
  });

  assert.strictEqual(unpairedAgent.isPaired(), false, 'Device must start as unpaired');

  // Device actions MUST be impossible while unpaired
  const deniedAction = await unpairedAgent.executeDeviceAction('get_system_metrics');
  assert.strictEqual(deniedAction.outcome, OUTCOME.FAILED, 'Action on unpaired device must fail');
  assert(deniedAction.error.includes('PC device is not paired'), 'Error must report unpaired security gate');

  // Pair device
  const pairRes = unpairedAgent.pair('pair_token_secure_123', 'usr_john_doe', ['pc.system.read']);
  assert.strictEqual(pairRes.ok, true, 'Pairing must succeed');
  assert.strictEqual(unpairedAgent.isPaired(), true, 'Device must now be paired');
  assert(unpairedAgent.hasScope('pc.system.read'), 'Must have initial scope pc.system.read');

  // Unpair device
  const unpairRes = unpairedAgent.unpair();
  assert.strictEqual(unpairRes.ok, true, 'Unpairing must succeed');
  assert.strictEqual(unpairedAgent.isPaired(), false, 'Device must be marked as unpaired');
  assert.strictEqual(unpairedAgent.getGrantedScopes().length, 0, 'Scopes must be cleared on unpair');

  console.log('✓ Device pairing gate and lifecycle verified');

  // ------------------------------------------------------------
  // Test 2: Scoped Capabilities & Permission Gating
  // ------------------------------------------------------------
  console.log('\n[Test 2] Scoped Capabilities and Least-Privilege Gates');

  const agent = new PCAgent({
    deviceId: 'dev_paired_test',
    deviceName: 'Paired Test PC',
    isPairedDevice: true,
    pairedUserId: 'usr_john_doe',
    grantedScopes: ['pc.system.read']
  });

  // Action permitted by granted scope
  const sysRes = await agent.executeDeviceAction('get_system_metrics');
  assert.strictEqual(sysRes.outcome, OUTCOME.VERIFIED_DONE, 'System metrics must succeed when scope is granted');
  assert(sysRes.verified, 'Action outcome must be marked verified');
  assert(sysRes.data.memory, 'Data must include memory info');

  // Action rejected due to missing scope
  const winRes = await agent.executeDeviceAction('get_active_window');
  assert.strictEqual(winRes.outcome, OUTCOME.FAILED, 'Window action must fail without pc.window.read scope');
  assert(winRes.error.includes('Missing required capability scope "pc.window.read"'), 'Must specify missing scope');

  // Grant scope and retry
  const grantRes = agent.grantScope('pc.window.read');
  assert.strictEqual(grantRes.ok, true, 'Granting scope must succeed');
  const winRes2 = await agent.executeDeviceAction('get_active_window');
  assert.strictEqual(winRes2.outcome, OUTCOME.VERIFIED_DONE, 'Window action must now succeed');
  assert.strictEqual(winRes2.verified, true);
  assert(winRes2.data.title, 'Data must include window title');

  // Reject unsupported scope
  const invalidScopeRes = agent.grantScope('pc.root.shell');
  assert.strictEqual(invalidScopeRes.ok, false, 'Arbitrary root scope must be rejected');

  // Zero arbitrary shell check
  assert.throws(() => {
    agent.executeCommand('whoami');
  }, /Arbitrary shell execution is strictly disallowed/, 'executeCommand must throw security violation');

  console.log('✓ Capability scopes, permission gates, and zero-shell guard verified');

  // ------------------------------------------------------------
  // Test 3: Emergency Stop Control
  // ------------------------------------------------------------
  console.log('\n[Test 3] Emergency Stop Control & Operation Halting');

  assert.strictEqual(agent.isStopped(), false, 'Agent must not be stopped initially');

  const stopRes = agent.emergencyStop('User triggered emergency stop shortcut');
  assert.strictEqual(stopRes.ok, true, 'Emergency stop must succeed');
  assert.strictEqual(agent.isStopped(), true, 'Agent must be in emergency stop state');

  // Actions attempted during emergency stop must be cancelled immediately
  const cancelledAction = await agent.executeDeviceAction('get_system_metrics');
  assert.strictEqual(cancelledAction.outcome, OUTCOME.CANCELLED, 'Action must be cancelled under emergency stop');
  assert(cancelledAction.error.includes('Emergency stop is active'), 'Error must report active emergency stop');

  // Resuming without confirmation must fail
  const resumeFail = agent.resumeFromEmergencyStop(false);
  assert.strictEqual(resumeFail.ok, false, 'Must require confirmation to resume');
  assert.strictEqual(agent.isStopped(), true, 'Agent must remain stopped');

  // Resuming with confirmation
  const resumeOk = agent.resumeFromEmergencyStop(true);
  assert.strictEqual(resumeOk.ok, true, 'Must successfully resume with confirmation');
  assert.strictEqual(agent.isStopped(), false, 'Agent must no longer be stopped');

  const resumedAction = await agent.executeDeviceAction('get_system_metrics');
  assert.strictEqual(resumedAction.outcome, OUTCOME.VERIFIED_DONE, 'Action must succeed after emergency stop reset');

  console.log('✓ Emergency stop trigger, cancellation, and confirmed resume verified');

  // ------------------------------------------------------------
  // Test 4: Workspace Sandbox Boundary Enforcement
  // ------------------------------------------------------------
  console.log('\n[Test 4] Workspace Filesystem Sandbox & Path Traversal Protection');

  agent.grantScope('pc.files.stat');
  agent.approvedWorkspacePath = path.resolve(__dirname, '..');

  // Valid file inside workspace
  const validFileStat = await agent.executeDeviceAction('stat_workspace_file', {
    filePath: 'index.html'
  });
  assert.strictEqual(validFileStat.outcome, OUTCOME.VERIFIED_DONE, 'Valid workspace file stat must succeed');
  assert.strictEqual(validFileStat.data.exists, true, 'index.html must exist in workspace');
  assert(validFileStat.data.sizeBytes > 0, 'sizeBytes must be greater than 0');

  // Path traversal attempt escaping sandbox
  const traversalStat = await agent.executeDeviceAction('stat_workspace_file', {
    filePath: '../../../../../../Windows/System32/cmd.exe'
  });
  assert.strictEqual(traversalStat.outcome, OUTCOME.FAILED, 'Path traversal must fail');
  assert(traversalStat.error.includes('escapes approved workspace sandbox'), 'Must block sandbox escape attempt');

  console.log('✓ Workspace sandbox boundary and path traversal protection verified');

  // ------------------------------------------------------------
  // Test 5: User Confirmation Gate for Clipboard Access
  // ------------------------------------------------------------
  console.log('\n[Test 5] Sensitive Operation Gate (Clipboard Read Confirmation)');

  agent.grantScope('pc.clipboard.read');
  agent.mockClipboardText = 'Sensitive clipboard note for Tadashi';

  // Attempt without confirmation
  const unconfirmedClip = await agent.executeDeviceAction('read_clipboard', {}, { confirmed: false });
  assert.strictEqual(unconfirmedClip.outcome, OUTCOME.FAILED, 'Unconfirmed clipboard access must be rejected');
  assert(unconfirmedClip.error.includes('requires explicit user confirmation'), 'Must explain confirmation requirement');

  // Attempt with explicit confirmation
  const confirmedClip = await agent.executeDeviceAction('read_clipboard', {}, { confirmed: true });
  assert.strictEqual(confirmedClip.outcome, OUTCOME.VERIFIED_DONE, 'Confirmed clipboard access must succeed');
  assert.strictEqual(confirmedClip.data.text, 'Sensitive clipboard note for Tadashi');

  console.log('✓ Human confirmation requirement for sensitive actions verified');

  // ------------------------------------------------------------
  // Test 6: Desktop Presence Status & Audit History
  // ------------------------------------------------------------
  console.log('\n[Test 6] Desktop Presence Telemetry and Audit Records');

  const presence = agent.getPresenceStatus();
  assert.strictEqual(presence.deviceId, 'dev_paired_test', 'Presence deviceId must match');
  assert.strictEqual(presence.paired, true, 'Presence paired state must be true');
  assert.strictEqual(presence.emergencyStopped, false, 'Presence emergencyStopped must be false');
  assert(presence.grantedScopes.includes('pc.files.stat'), 'Presence must list granted scopes');
  assert(typeof presence.uptimeSeconds === 'number', 'Presence uptimeSeconds must be a number');

  const audit = agent.getAuditLog();
  assert(audit.length >= 5, `Audit log must record executed operations (logged: ${audit.length})`);
  const emergencyEvent = audit.find(e => e.event === 'emergency_stop_triggered');
  assert(emergencyEvent, 'Audit log must record emergency stop trigger event');

  console.log(`✓ Desktop presence telemetry and audit history verified (${audit.length} entries)`);

  console.log('\n======================================================');
  console.log('ALL MARK LVI MILESTONE 6 PC PRESENCE TESTS PASSED');
  console.log('======================================================\n');
}

runMilestone6Tests().catch(err => {
  console.error('\nTEST SUITE FAILED:', err);
  process.exit(1);
});
