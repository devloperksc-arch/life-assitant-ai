# Self-learning and skill acquisition: safety design

## Define “learning” precisely

TADASHI should support several learning levels:

1. **Preferences:** learn user-approved stable preferences from repeated corrections; user can inspect/edit/delete them.
2. **Episodic memory:** remember significant actions and outcomes with timestamps/source links.
3. **Knowledge acquisition:** index user-approved PDFs, notes, documents and websites; cite source chunks when answering.
4. **Procedural skills:** define a reusable workflow/tool with tests, permissions, versioning, approval and rollback.
5. **Model fine-tuning:** optional future project with curated training data, evaluation, privacy review and explicit consent. It is not required for most feature acquisition.

## Skill lifecycle

`requested -> drafted -> validated -> sandbox_tested -> awaiting_approval -> installed -> enabled -> disabled/deprecated`

Any new permission, network domain, runtime, file access or external write is a permission expansion and returns to `awaiting_approval`.

## Skill manifest draft

```yaml
id: lecture-pdf-to-revision-notes
name: Lecture PDF to Revision Notes
version: 1.0.0
description: Creates structured revision notes from user-selected lecture PDFs.
entrypoint: skill-handler
runtime: isolated-worker
permissions:
  - files.read:selected-inputs
  - knowledge.write:study-notes
network:
  enabled: false
  allowed_domains: []
secrets: []
inputs:
  - name: fileIds
    type: string[]
  - name: outputStyle
    type: string
outputs:
  - name: documentId
    type: string
risk: reversible_write
requiresApproval: true
resourceLimits:
  timeoutSeconds: 120
  memoryMb: 512
tests:
  - fixtures/sample-lecture.pdf
```

The fields are a proposed internal format; implement a real JSON Schema and validator rather than trusting YAML text.

## Installation gate

Before installation, show the user:
- skill name, version, purpose and source;
- exact tools/actions the skill can call;
- exact folders/data domains it can read/write;
- network domains and whether internet is required;
- whether it can create external side effects;
- test fixtures/results and known limitations;
- estimated runtime/cost where relevant;
- rollback/disable steps.

Require explicit approval before installing. Require renewed approval when permissions expand.

## Sandbox constraints

- Run skills in a separate process/container/worker with a low-privilege identity.
- Default deny filesystem access except selected inputs and designated output directory.
- Default deny network; explicit domain allow-list only.
- No access to browser cookies, session database, environment variables, provider keys or host filesystem.
- No arbitrary host shell, unrestricted child process or unrestricted package installation.
- Pin dependencies, record artifact digest and scan dependencies.
- Enforce CPU, memory, time, output-size and concurrency limits.
- Validate inputs and outputs with schemas.
- Treat skill instructions, imported content and remote resources as untrusted.
- Keep immutable run logs and support immediate disable/revoke.

## What skills can do first

Start with low-risk capabilities: summarize selected PDF, make flashcards from user-approved notes, create a weekly report from LifeOS data, find available time, draft a meal/workout plan, search local project files and run allow-listed repository checks.

Do not begin with skills that can send messages, spend money, book services, change account security, delete large data sets or run arbitrary PC commands.
