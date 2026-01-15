---
name: Feature
about: Describe this issue template's purpose here.
title: ''
labels: ''
assignees: ''

---

name: Feature Request
description: Request a new feature or capability
title: "[FEATURE] <short, action-oriented summary>"
labels: ["feature"]
assignees: []
body:
  - type: input
    id: summary
    attributes:
      label: Feature Summary
      placeholder: "Add bulk recipe import via CSV"
    validations:
      required: true

  - type: textarea
    id: problem
    attributes:
      label: Problem Statement
      description: What problem this feature solves and for whom.
    validations:
      required: true

  - type: textarea
    id: proposed_solution
    attributes:
      label: Proposed Solution
      description: High-level description of the desired behavior.
    validations:
      required: true

  - type: textarea
    id: functional_requirements
    attributes:
      label: Functional Requirements
      placeholder: |
        - User can upload CSV
        - Validate schema
        - Show preview before import
    validations:
      required: true

  - type: textarea
    id: nonfunctional_requirements
    attributes:
      label: Non-Functional Requirements
      placeholder: |
        - Max file size: 5MB
        - Upload completes < 3s
        - Secure file handling
    validations:
      required: false

  - type: textarea
    id: scope
    attributes:
      label: In-Scope
      placeholder: |
        - Backend API
        - Frontend upload UI
        - Validation logic
    validations:
      required: true

  - type: textarea
    id: out_of_scope
    attributes:
      label: Out of Scope
      placeholder: |
        - Background imports
        - Third-party integrations
    validations:
      required: false

  - type: textarea
    id: acceptance_criteria
    attributes:
      label: Acceptance Criteria
      placeholder: |
        - CSV import works end-to-end
        - Errors are user-friendly
        - Unit + integration tests added
    validations:
      required: true

  - type: textarea
    id: implementation_notes
    attributes:
      label: Implementation Notes for AI Agent
      description: Architecture, patterns, or libraries to use or avoid.
      placeholder: |
        - Use existing upload middleware
        - Follow service/controller pattern
        - Update OpenAPI spec
