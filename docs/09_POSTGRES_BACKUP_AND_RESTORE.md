# PostgreSQL Backup and Restore Runbook (Phase 4)

This runbook documents operational procedures for PostgreSQL database backups, point-in-time recovery, migration rollbacks, and automated backup schedules for TADASHI LifeOS.

---

## 1. Environment & Database Configuration

TADASHI LifeOS uses PostgreSQL 15+ for its central canonical database.

```bash
# Standard environment variables
export PGHOST=localhost
export PGPORT=5432
export PGDATABASE=tadashi_lifeos
export PGUSER=tadashi
export PGPASSWORD=your_secure_password
```

---

## 2. Taking an On-Demand Backup

### Logical Dump (Compressed Custom Format)
The custom format (`-F c`) is compressed, flexible, and allows selective object restoration via `pg_restore`:

```bash
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/backups/tadashi"
mkdir -p "$BACKUP_DIR"

pg_dump -h $PGHOST -U $PGUSER -d $PGDATABASE -F c -b -v -f "$BACKUP_DIR/tadashi_backup_${TIMESTAMP}.dump"
```

### Plain Text SQL Dump (Readable / Portable)
```bash
pg_dump -h $PGHOST -U $PGUSER -d $PGDATABASE --clean --if-exists > "$BACKUP_DIR/tadashi_backup_${TIMESTAMP}.sql"
```

---

## 3. Restoring from a Backup

### Staging Verification Restore
To test a restore safely without touching the live database:

1. Create a dedicated staging database:
```bash
createdb -h $PGHOST -U $PGUSER tadashi_staging
```

2. Restore the dump into staging:
```bash
pg_restore -h $PGHOST -U $PGUSER -d tadashi_staging -v "$BACKUP_DIR/tadashi_backup_${TIMESTAMP}.dump"
```

3. Verify record counts and table integrity:
```bash
psql -h $PGHOST -U $PGUSER -d tadashi_staging -c "SELECT 'users' AS tbl, count(*) FROM users UNION ALL SELECT 'devices', count(*) FROM devices UNION ALL SELECT 'records', count(*) FROM lifeos_records UNION ALL SELECT 'sync_operations', count(*) FROM sync_operations;"
```

4. Clean up staging test database:
```bash
dropdb -h $PGHOST -U $PGUSER tadashi_staging
```

---

## 4. Automated Daily Backup (Cron)

Add to system crontab (`crontab -e`):

```cron
# Daily backup at 02:00 AM IST
0 2 * * * /usr/local/bin/tadashi-db-backup.sh >> /var/log/tadashi_backup.log 2>&1
```

Script template (`/usr/local/bin/tadashi-db-backup.sh`):
```bash
#!/bin/bash
set -e
BACKUP_DIR="/var/backups/tadashi"
DATE=$(date +"%Y%m%d_%H%M")
FILE="$BACKUP_DIR/tadashi_${DATE}.dump"

pg_dump -h localhost -U tadashi -d tadashi_lifeos -F c -f "$FILE"
# Retain backups for 30 days
find "$BACKUP_DIR" -type f -name "*.dump" -mtime +30 -delete
```

---

## 5. Non-Destructive Client Migration Rollback

When a user migrates browser `localStorage` to the cloud, the client automatically stores a pre-migration safety backup:
- LocalStorage key: `tadashi_pre_migration_backup`
- To revert client state:
```javascript
const backup = localStorage.getItem('tadashi_pre_migration_backup');
if (backup) {
  localStorage.setItem('tadashi_lifeos_db', backup);
  DB.init();
  location.reload();
}
```
