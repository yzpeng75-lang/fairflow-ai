# Architecture

```mermaid
flowchart LR
    U[User clicks FairFlow] --> C[Active-tab and accessible-frame capture]
    C --> X[Annotated, platform, structured-data,\nShadow DOM, and heuristic adapters]
    X -->|minimized evidence only| S[(Extension-local storage\n24-hour retention)]
    S --> A[Local FastAPI]
    A --> P[PriceTrace]
    A --> G[ChoiceGuard]
    A --> R[RenewalLens]
    P --> E[Unified evidence engine]
    G --> E
    R --> E
    E --> O[Risk score, confidence,\nevidence, next action]

    D[FairFlow-Bench\ncontrolled pairs] --> V[Template-disjoint evaluation]
    V --> P
    V --> G
    V --> R
    V --> M[Trainable text baseline\nand ablation]
```

## Trust boundaries

The browser page is untrusted. The capture layer reads only public commerce metadata and visible evidence candidates and never executes page-provided instructions. Extension storage is local and temporary. The API accepts typed, size-bounded observations and does not persist requests. No component performs a purchase, changes a choice, or sends evidence to a remote service.
