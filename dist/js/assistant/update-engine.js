// ============================================================
// TADASHI LifeOS — Live Update & Hot-Patching Engine
// Allows live-updating code, styles, domain templates, and data schemas
// while the application is running via update-manifest.json packages.
// ============================================================

(function(window) {
  'use strict';

  const STORAGE_PATCHES_KEY = 'tadashi_live_patches';
  const STORAGE_BACKUP_KEY = 'tadashi_pre_update_backup';

  const ALLOWED_DIRECTORIES = ['js/', 'css/', 'assets/', 'src/', 'docs/'];
  const ALLOWED_ROOT_FILES = ['index.html', 'manifest.json', 'sw.js', 'package.json', 'vercel.json'];

  const UpdateEngine = {
    version: '1.0.0',

    // ============================================================
    // 1. MANIFEST VALIDATION
    // ============================================================
    validate(manifest, filesMap = {}) {
      const errors = [];
      const warnings = [];

      if (!manifest || typeof manifest !== 'object') {
        return { ok: false, errors: ['Manifest must be a valid JSON object.'] };
      }

      if (!manifest.version || typeof manifest.version !== 'string') {
        errors.push('Manifest must specify a "version" string (e.g. "5.9.0").');
      }

      const files = Array.isArray(manifest.files) ? manifest.files : [];
      if (files.length === 0 && (!manifest.schemaMigrations || manifest.schemaMigrations.length === 0)) {
        errors.push('Manifest must contain at least one file entry or schema migration.');
      }

      const validatedFiles = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        if (!f || !f.path) {
          errors.push(`File entry #${i + 1} is missing "path".`);
          continue;
        }

        const normalizedPath = f.path.trim().replace(/\\/g, '/').replace(/^\.\//, '');

        // Security check: Prevent path traversal attacks
        if (normalizedPath.includes('..') || normalizedPath.startsWith('/') || normalizedPath.includes(':')) {
          errors.push(`Security violation: Illegal file path "${f.path}". Path traversal is blocked.`);
          continue;
        }

        // Check if path is in allowed directories or root files
        const isAllowedDir = ALLOWED_DIRECTORIES.some(d => normalizedPath.startsWith(d));
        const isAllowedRoot = ALLOWED_ROOT_FILES.includes(normalizedPath);
        if (!isAllowedDir && !isAllowedRoot) {
          warnings.push(`File "${normalizedPath}" is outside standard directories (${ALLOWED_DIRECTORIES.join(', ')}).`);
        }

        // Get file content either embedded in manifest or from filesMap
        let content = f.content;
        if (content === undefined && filesMap[normalizedPath] !== undefined) {
          content = filesMap[normalizedPath];
        }

        if (content === undefined || content === null) {
          errors.push(`Content missing for file "${normalizedPath}". Must be in manifest or provided in uploaded files.`);
          continue;
        }

        // Pre-validate JavaScript syntax before applying
        if (normalizedPath.endsWith('.js')) {
          try {
            new Function(content);
          } catch (syntaxErr) {
            errors.push(`JavaScript syntax error in "${normalizedPath}": ${syntaxErr.message}`);
            continue;
          }
        }

        validatedFiles.push({
          path: normalizedPath,
          action: f.action || 'replace',
          sizeBytes: new Blob([content]).size,
          content: content,
          sha256: f.sha256 || null
        });
      }

      const totalBytes = validatedFiles.reduce((acc, f) => acc + f.sizeBytes, 0);
      let riskLevel = 'low';
      if (validatedFiles.some(f => f.path.includes('db.js') || f.path === 'index.html')) {
        riskLevel = 'high';
      } else if (validatedFiles.length > 3 || (manifest.schemaMigrations && manifest.schemaMigrations.length > 0)) {
        riskLevel = 'medium';
      }

      return {
        ok: errors.length === 0,
        errors,
        warnings,
        version: manifest.version,
        description: manifest.description || 'No description provided.',
        author: manifest.author || 'Anonymous',
        requiresReload: Boolean(manifest.requiresReload),
        files: validatedFiles,
        schemaMigrations: Array.isArray(manifest.schemaMigrations) ? manifest.schemaMigrations : [],
        stats: {
          fileCount: validatedFiles.length,
          totalBytes,
          riskLevel
        }
      };
    },

    // ============================================================
    // 2. LIVE UPDATE EXECUTION (Hot-Patching with Zero Downtime)
    // ============================================================
    async apply(manifest, filesMap = {}) {
      const validation = this.validate(manifest, filesMap);
      if (!validation.ok) {
        throw new Error(`Validation failed:\n${validation.errors.join('\n')}`);
      }

      console.log(`[UpdateEngine] Beginning live update to v${validation.version}...`);

      // 1. Create safety backup snapshot
      const backupSnapshot = {
        timestamp: new Date().toISOString(),
        previousVersion: this.getCurrentVersion(),
        targetVersion: validation.version,
        dbState: (typeof window.DB !== 'undefined') ? window.DB.getAll() : null,
        activePatches: this.getActivePatches()
      };
      try {
        localStorage.setItem(STORAGE_BACKUP_KEY, JSON.stringify(backupSnapshot));
      } catch (e) {
        console.warn('[UpdateEngine] Could not save full pre-update backup to localStorage:', e);
      }

      const appliedPatches = [];

      // 2. Update CacheStorage (Service Worker) so future loads get the new versions
      if (typeof window.caches !== 'undefined') {
        try {
          const cacheKeys = await window.caches.keys();
          const activeCacheName = cacheKeys[0] || 'tadashi-cache-v1';
          const cache = await window.caches.open(activeCacheName);

          for (const file of validation.files) {
            const mime = file.path.endsWith('.css') ? 'text/css'
                       : file.path.endsWith('.js') ? 'application/javascript'
                       : file.path.endsWith('.json') ? 'application/json'
                       : 'text/html';
            
            const response = new Response(file.content, {
              status: 200,
              headers: { 'Content-Type': mime, 'X-Tadashi-Live-Patch': validation.version }
            });
            await cache.put(`/${file.path}`, response);
            console.log(`[UpdateEngine] Cached updated asset in Service Worker: /${file.path}`);
          }
        } catch (cacheErr) {
          console.warn('[UpdateEngine] CacheStorage update skipped:', cacheErr.message);
        }
      }

      // 3. Hot-patch in-memory DOM & Runtime
      for (const file of validation.files) {
        if (file.path.endsWith('.css')) {
          // Inject or replace style tag
          const styleId = `tadashi-live-patch-${file.path.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
          let styleEl = document.getElementById(styleId);
          if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = styleId;
            styleEl.setAttribute('data-patch-file', file.path);
            styleEl.setAttribute('data-patch-version', validation.version);
            document.head.appendChild(styleEl);
          }
          styleEl.textContent = file.content;
          console.log(`[UpdateEngine] Hot-applied CSS styles for ${file.path}`);
        } else if (file.path.endsWith('.js')) {
          // Hot-evaluate JS code in global window scope
          try {
            const scriptFn = new Function(file.content);
            scriptFn.call(window);
            console.log(`[UpdateEngine] Hot-evaluated JavaScript module for ${file.path}`);
          } catch (evalErr) {
            console.error(`[UpdateEngine] Failed to hot-evaluate ${file.path}:`, evalErr);
            throw new Error(`Execution error in ${file.path}: ${evalErr.message}`);
          }
        }

        appliedPatches.push({
          path: file.path,
          version: validation.version,
          sizeBytes: file.sizeBytes,
          appliedAt: new Date().toISOString()
        });
      }

      // 4. Apply Schema Migrations if present
      if (validation.schemaMigrations.length > 0 && typeof window.DB !== 'undefined') {
        for (const mig of validation.schemaMigrations) {
          console.log(`[UpdateEngine] Applying schema migration for domain "${mig.domain}"...`);
          // Safely execute domain schema updates
          if (mig.action === 'setField' && mig.domain && mig.field && window.DB[mig.domain]) {
            const state = window.DB.getAll();
            if (state[mig.domain]) {
              state[mig.domain][mig.field] = mig.value;
              window.DB.importState(state);
            }
          }
        }
      }

      // 5. Persist applied patches metadata in localStorage
      const allPatches = this.getActivePatches().concat(appliedPatches);
      try {
        localStorage.setItem(STORAGE_PATCHES_KEY, JSON.stringify(allPatches));
      } catch (e) {}

      // 6. Record update history entry in DB
      if (typeof window.DB !== 'undefined' && window.DB.updates && typeof window.DB.updates.recordUpdate === 'function') {
        window.DB.updates.recordUpdate({
          id: `upd_${Date.now()}`,
          version: validation.version,
          description: validation.description,
          author: validation.author,
          timestamp: new Date().toISOString(),
          filesCount: validation.files.length,
          status: 'applied'
        });
      }

      // 7. Refresh current domain view immediately to reflect changes
      if (typeof window.renderDomainPage === 'function') {
        try {
          const cur = window.currentDomainId || 'updates';
          window.renderDomainPage(cur);
        } catch (rErr) {
          console.warn('[UpdateEngine] Re-render error:', rErr);
        }
      }

      if (typeof window.showToast === 'function') {
        window.showToast(`Live Update v${validation.version} applied successfully! (0 downtime)`);
      }

      return {
        ok: true,
        version: validation.version,
        appliedPatches,
        timestamp: new Date().toISOString()
      };
    },

    // ============================================================
    // 3. ROLLBACK SYSTEM
    // ============================================================
    async rollback() {
      console.log('[UpdateEngine] Rolling back to pre-update snapshot...');
      let backup = null;
      try {
        const raw = localStorage.getItem(STORAGE_BACKUP_KEY);
        if (raw) backup = JSON.parse(raw);
      } catch (e) {}

      if (!backup) {
        throw new Error('No pre-update backup snapshot found in system storage.');
      }

      // 1. Restore DB state
      if (backup.dbState && typeof window.DB !== 'undefined' && typeof window.DB.importState === 'function') {
        window.DB.importState(backup.dbState);
      }

      // 2. Remove live injected style tags
      const patchStyles = document.querySelectorAll('style[id^="tadashi-live-patch-"]');
      patchStyles.forEach(s => s.remove());

      // 3. Revert active patches registry
      try {
        localStorage.removeItem(STORAGE_PATCHES_KEY);
      } catch (e) {}

      // 4. Re-render UI
      if (typeof window.renderDomainPage === 'function') {
        const cur = window.currentDomainId || 'updates';
        window.renderDomainPage(cur);
      }

      if (typeof window.showToast === 'function') {
        window.showToast(`System rolled back to v${backup.previousVersion || 'previous'}!`);
      }

      return {
        ok: true,
        restoredVersion: backup.previousVersion,
        timestamp: new Date().toISOString()
      };
    },

    // ============================================================
    // 4. REHYDRATE PERSISTED PATCHES ON BOOT
    // ============================================================
    init() {
      const patches = this.getActivePatches();
      if (!patches || patches.length === 0) return;

      console.log(`[UpdateEngine] Rehydrating ${patches.length} active live patch(es)...`);
      // Re-inject any saved patches
      for (const p of patches) {
        if (p.content && p.path.endsWith('.css')) {
          const styleId = `tadashi-live-patch-${p.path.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
          if (!document.getElementById(styleId)) {
            const styleEl = document.createElement('style');
            styleEl.id = styleId;
            styleEl.textContent = p.content;
            document.head.appendChild(styleEl);
          }
        }
      }
    },

    // ============================================================
    // 5. HELPERS & GENERATORS
    // ============================================================
    getCurrentVersion() {
      if (typeof window.DB !== 'undefined' && window.DB.updates && typeof window.DB.updates.getStatus === 'function') {
        return window.DB.updates.getStatus().systemVersion || '5.9.0';
      }
      return '5.9.0';
    },

    getActivePatches() {
      try {
        const raw = localStorage.getItem(STORAGE_PATCHES_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    },

    hasPreUpdateBackup() {
      try {
        return Boolean(localStorage.getItem(STORAGE_BACKUP_KEY));
      } catch (e) {
        return false;
      }
    },

    generateManifestTemplate() {
      return JSON.stringify({
        version: "5.9.1",
        timestamp: new Date().toISOString(),
        description: "Hotfix / Domain enhancement patch",
        author: "Krishna Singh",
        requiresReload: false,
        files: [
          {
            path: "js/domain-pages.js",
            action: "replace",
            content: "// Put new or updated JavaScript code here"
          },
          {
            path: "css/tailwind.css",
            action: "replace",
            content: "/* Put new CSS rules here */"
          }
        ],
        schemaMigrations: []
      }, null, 2);
    }
  };

  // Auto-init on script load
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => UpdateEngine.init());
    } else {
      UpdateEngine.init();
    }
  }

  window.UpdateEngine = UpdateEngine;

})(typeof window !== 'undefined' ? window : global);
