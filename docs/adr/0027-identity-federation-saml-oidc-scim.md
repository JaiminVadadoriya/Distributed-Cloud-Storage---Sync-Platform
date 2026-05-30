# 27. Identity Federation with SAML/OIDC/SCIM

## Context
Multi-tenant enterprise buyers want to integrate their own identity providers (Azure AD, Okta, Ping Identity) to provision users and enforce SSO.

## Decision
We implement a federated identity provider management layer supporting SAML 2.0, OpenID Connect (OIDC), and SCIM 2.0 user lifecycle synchronization.

## Consequences
- **Pros**: Simplified user onboarding, centralized credential control.
- **Cons**: Complexity of handling divergent tenant SSO protocols.
