---
name: Bug
about: Describe this issue template's purpose here.
title: ''
labels: ''
assignees: ''

---

name: Bug Report
description: Report a defect that causes incorrect or unexpected behavior
title: "[BUG] <short, precise summary>"
labels: ["bug"]
assignees: []
body:
  - type: input
    id: summary
    attributes:
      label: Summary
      description: One-sentence description of the bug.
      placeholder: "API returns 401 when valid JWT is supplied"
    validations:
      required: true

  - type: textarea
    id: expected_behavior
    attributes:
      label: Expected Behavior
      description: What should happen when the system is working correctly.
    validations:
      required: true

  - type: textarea
    id: actual_behavior
    attributes:
      label: Actual Behavior
      description: What actually happens.
    validations:
      required: true

  - type: textarea
    id: reproduction_steps
    attributes:
      label: Steps to Reproduce
      description: Ordered steps that reliably reproduce the issue.
      placeholder: |
        1. Call POST /auth/login
        2. Receive JWT
        3. Call GET /recipes with Authorization header
    validations:
      required: true

  - type: textarea
    id: scope
    attributes:
      label: Impacted Scope
      description: Files, modules, routes, or components likely involved.
      placeholder: "backend/auth/middleware.ts, /recipes route"

  - type: textarea
    id: logs
    attributes:
      label: Logs / Errors
      description: Relevant logs, stack traces, or error messages.
      render: shell

  - type: dropdown
    id: severity
    attributes:
      label: Severity
      options:
        - blocker
        - critical
        - major
        - minor
        - cosmetic
    validations:
      required: true

  - type: textarea
    id: acceptance_criteria
    attributes:
      label: Acceptance Criteria
      description: Conditions that must be met to consider this bug fixed.
      placeholder: |
        - Valid JWT is accepted
        - No regression in auth middleware
        - Tests updated or added
    validations:
      required: true

  - type: textarea
    id: constraints
    attributes:
      label: Constraints / Notes for AI Agent
      description: Hard rules the agent must respect.
      placeholder: |
        - Do not change public API contract
        - Maintain backward compatibility
        - Follow existing error handling pattern
