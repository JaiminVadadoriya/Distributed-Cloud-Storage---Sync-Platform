# Secret Rotation and Repository Sanitization Guide

This document outlines the step-by-step procedure for rotating all application credentials and sanitizing Git repository history to resolve historical secret exposures.

---

## 1. Credentials Rotation Procedure

### 1.1 JSON Web Token (JWT) Key
1. Generate a new cryptographically secure 256-bit (32-byte) key.
   ```powershell
   # PowerShell
   $bytes = New-Object Byte[] 32
   [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
   [Convert]::ToBase64String($bytes)
   ```
2. Update the `JWT_KEY` environment variable in the active Kubernetes `Secret` manifest or local `.env` configuration.
3. Perform a rolling deployment of the API services to pick up the new signing key. Existing active access tokens will be invalidated immediately, forcing users to re-authenticate (refresh tokens will remain valid if database references are active, but they will issue tokens signed with the new key).

### 1.2 PostgreSQL Credentials
1. Connect to the PostgreSQL database as superuser and alter the password:
   ```sql
   ALTER USER postgres WITH PASSWORD 'NewSecurePasswordHere';
   ```
2. Update `DB_PASSWORD` (or `ConnectionStrings:DefaultConnection`) in deployment configurations.
3. Restart backend service pods/containers to establish connections with the new password.

### 1.3 RabbitMQ Credentials
1. Update RabbitMQ user passwords via CLI:
   ```bash
   rabbitmqctl change_password username 'NewSecurePasswordHere'
   ```
2. Update `RABBITMQ_PASSWORD` in application deployment files.
3. Restart backend API pods and consumer instances.

### 1.4 MinIO Credentials
1. Update `MINIO_ROOT_PASSWORD` or individual IAM access policies in the MinIO console or via the `mc` CLI tool.
2. Update `StorageProvider:MinIO:SecretKey` in Kubernetes Secrets or environment configurations.
3. Restart backend API instances.

---

## 2. Git History Sanitization

If credentials were accidentally committed to the Git repository, cleaning active files is not sufficient. The secrets remain in the commit history. Follow these steps to purge them permanently.

### 2.1 Using `git-filter-repo` (Recommended)
`git-filter-repo` is the modern, fast, and recommended tool to rewrite history.

1. Install `git-filter-repo` using package managers or python:
   ```bash
   pip install git-filter-repo
   ```
2. Create a file named `secrets-to-purge.txt` containing the values to remove (one per line):
   ```text
   supersecretkey123
   anotherpassword456
   ```
3. Run the filter command to replace these secret values with a placeholder string (`***REMOVED***`) across all commits, branches, and tags:
   ```bash
   git filter-repo --replace-text secrets-to-purge.txt
   ```
4. Push the sanitized history back to the remote server (forces updates on all branches):
   ```bash
   git push origin --force --all
   git push origin --force --tags
   ```

### 2.2 Using BFG Repo-Cleaner (Alternative)
If `git-filter-repo` is not available, the Java-based BFG tool can be used.

1. Download `bfg.jar` and run the text replacer:
   ```bash
   java -jar bfg.jar --replace-text secrets-to-purge.txt
   ```
2. Run standard git pruning to delete loose objects:
   ```bash
   git reflog expire --expire=now --all && git gc --prune=now --aggressive
   ```
3. Force push branch updates:
   ```bash
   git push origin --force --all
   ```

> [!WARNING]
> Purging git history changes commit hashes. Inform all team members to perform a fresh clone after history cleanup to prevent local conflicts.
