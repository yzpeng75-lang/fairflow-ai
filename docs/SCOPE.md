# FairFlow MVP Scope

## Problem statement

Important price and consent changes often appear across several checkout steps. A single-page classifier cannot reliably determine what changed. FairFlow treats a purchase as a sequence of page states and reports evidence-backed changes before payment.

## Target user

An online shopper considering a product, subscription, ticket, or free trial in a desktop browser.

## In scope for the 14-day build

### 1. Price change tracking

- Record the initial displayed price.
- Record the final payable price before payment.
- Identify newly introduced line items.
- Calculate the absolute and percentage increase.

### 2. Preselected paid add-ons

- Detect checked checkboxes, radio buttons, and switches.
- Associate the control with a label and price.
- Distinguish optional add-ons from required checkout inputs.

### 3. Trial-to-paid subscriptions

- Extract the free-trial duration when present.
- Extract recurring price and billing interval.
- Record the first step at which renewal is disclosed.

## Required output for every finding

- Risk category
- Severity
- Confidence
- Evidence text
- Page step
- Relevant amount, when available
- A neutral user action such as "Review this option"

## Explicitly out of scope

- Declaring that a company or interface is illegal
- Automatically clicking, purchasing, or cancelling
- Capturing passwords, payment cards, addresses, or authentication tokens
- Fake urgency and cancellation-friction detection in the MVP
- Universal compatibility with all websites
- Unsupported performance claims

## Day 14 success criteria

- A Chrome-compatible extension completes one end-to-end audit.
- A controlled demo store contains normal and risky paired flows.
- FairFlow-Bench has documented labels and held-out templates.
- Evaluation compares rules, text-only detection, and full-flow detection.
- Every published metric is reproducible from the repository.
- A public demo, repository, and two-minute video are ready for Devpost.

