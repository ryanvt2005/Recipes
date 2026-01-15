---
name: Enhancement
about: Describe this issue template's purpose here.
title: ''
labels: ''
assignees: ''

---

name: Enhancement
description: Improve an existing feature without changing core behavior
title: "[ENHANCEMENT] <short improvement summary>"
labels: ["enhancement"]
assignees: []
body:
  - type: input
    id: summary
    attributes:
      label: Enhancement Summary
      placeholder: "Improve recipe search performance"
    validations:
      required: true

  - type: textarea
    id: current_behavior
    attributes:
      label: Current Behavior
    validations:
      required: true

  - type: textarea
    id: desired_behavior
    attributes:
      label: Desired Behavior
    validations:
      required: true

  - type: textarea
    id: motivation
    attributes:
      label: Motivation / Why
    validations:
      required: true

  - type: textarea
    id: scope
    attributes:
      label: Impacted Areas
      placeholder: |
        - Search query builder
        - Database indexes
    validations:
      required: true

  - type: textarea
    id: acceptance_criteria
    attributes:
      label: Acceptance Criteria
      placeholder: |
        - Search latency reduced by X%
        - No change to API response format
    validations:
      required: true

  - type: textarea
    id: constraints
    attributes:
      label: Constraints / Guardrails
      placeholder: |
        - No schema changes
        - Must remain backward compatible
