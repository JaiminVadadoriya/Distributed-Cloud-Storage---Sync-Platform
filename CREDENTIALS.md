# 🔐 Project Credentials (Development Only)

This file contains the default credentials for testing and local development. 

> [!CAUTION]
> **SECURITY WARNING**: Never use these credentials in a production environment. 
> In a real deployment, passwords are never stored in plain text and are protected by one-way hashing.

## Default Administrative Account

| Identity | Username / Email | Security Phrase (Password) | Role |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@cloud.io` | `admin123` | `Admin` |

## Standard User Patterns

Most test accounts are created with the following pattern for convenience:
- **Username**: `user1`, `user2`, etc.
- **Password**: `password123` or `admin123` (depending on the seeding script used).

## Security Model Overview

### BCrypt Hashing
All user passwords in this system are protected using **BCrypt** hashing in the backend (`AuthService.cs`). This means:
1. **One-Way Protection**: Passwords stored in the database are transformed into an unreadable "hash". 
2. **Non-Exportable**: It is mathematically impossible to "reverse" these hashes to reveal the original passwords.
3. **Internal Verification**: When you log in, the system hashes your input and compares it to the stored hash.

### Managing Accounts
If you need to access a user account but have forgotten the password:
1. **Admin Panel**: Log in as `admin@cloud.io` and use the User Management dashboard to manage users (Note: Admins can toggle status or change quotas, but cannot "read" passwords).
2. **Register New**: You can always create a new "Identity" via the **Provision_Identity** link on the login page.
3. **Database Reset**: For a complete reset, run `dotnet ef database update 0` followed by `dotnet ef database update` to re-seed the initial state.
