# Security policy

quarry connects to your data warehouse and lets an AI agent query it, so we take security reports seriously.

## Reporting a vulnerability

**Do not open a public issue for a security problem.** Report it privately through GitHub:
[Security → Report a vulnerability](https://github.com/joemark0008/quarry/security/advisories/new).

Please include what you found, how to reproduce it (with the example warehouse or other test data), and the impact you
expect. We aim to acknowledge a report within 5 working days and to agree a disclosure date with you once a fix is
ready.

## Scope

In scope: the code in this repository (`apps/api`, `apps/frontend`, `apps/shared`), its Docker image and its default
configuration. Of particular interest:

- ways to make the agent or the query workbench write to the warehouse, or read tables and columns the synced context
  excludes, or bypass row security predicates;
- reading or changing another organization's or project's chats, stories, context or warehouse credentials;
- shared stories, embeds or share links exposing more than was shared;
- leaking warehouse credentials or LLM API keys.

Out of scope: vulnerabilities in a deployment you do not own, social engineering, and denial of service by volume.

## Supported versions

quarry is pre-1.0. Only the latest `main` receives security fixes.

## Never use real data

Do not test against, or attach, real customer or production data in a report. Use the example warehouse
(`docker/postgres/warehouse-example.sql`).
