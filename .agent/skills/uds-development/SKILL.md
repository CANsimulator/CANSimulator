---
name: UDS Protocol Development
description: Guidelines and workflows for implementing Unified Diagnostic Services (ISO 14229) in the simulator.
---

# UDS Protocol Development Skill

This skill provides standard operating procedures for implementing and maintaining UDS services.

## Core Principles
1. **ISO 14229 Compliance**: All services must strictly adhere to the standard payload structures.
2. **Separation of Concerns**: Logic goes in `src/services/`, types in `src/types/`, UI in `src/components/`.
3. **Immutability**: State updates must be immutable, especially in Context.

## Implementation Workflow

### 1. Define Types
Create interfaces for the Request and Response structures in `src/types/uds.ts` or a service-specific file.

```typescript
export interface Service0x10Request {
  sid: 0x10;
  subFunction: DiagnosticSessionType;
}
```

### 2. Implement Service Logic
Add the service handler in `src/services/UDSLogic.ts` or a modular service file.

- **Input**: `Uint8Array` (raw bytes) or structured Request object.
- **Output**: `Response` object containing `data` (bytes) and `nrc` (if applicable).
- **Timing**: Ensure `P2` and `P2*` timings are respected using the timing simulation utilities.

### 3. Handle Negative Responses
Always verify conditions *before* processing:
1. **0x7F 0xXX 0x12**: Sub-function not supported.
2. **0x7F 0xXX 0x13**: Incorrect message length.
3. **0x7F 0xXX 0x7E**: Service not supported in active session (critical for Non-Default sessions).
4. **0x7F 0xXX 0x33**: Security access denied.

### 4. Register Service
Update the central dispatcher to route the new SID to your handler.

## Common Code Snippets

### Checking Session Support
```typescript
if (!allowedSessions.includes(state.session)) {
  return createNegativeResponse(sid, 0x7E); // ServiceNotSupportedInActiveSession
}
```

### Security Check
```typescript
if (requiresSecurity && state.securityLevel === SecurityLevel.LOCKED) {
  return createNegativeResponse(sid, 0x33); // SecurityAccessDenied
}
```

## Testing
- Use `src/tests/` to create unit tests for the service logic independent of the UI.
- Verify positive flows and ALL negative response paths.
