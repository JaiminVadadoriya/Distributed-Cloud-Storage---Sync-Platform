# 25. GDPR/SOC2/HIPAA Compliance Framework

## Context
Enterprise deployments require regulatory audit logging, secure data residency controls, and user access reporting.

## Decision
We build a dedicated compliance mapping system. It records immutable audit events, enforces EU data residency validations (disallowing S3/Azure writes outside allowed areas), and manages SCIM right-to-be-forgotten requests.

## Consequences
- **Pros**: Direct compliance mapping and automated validation.
- **Cons**: Increased logging database write volume.
