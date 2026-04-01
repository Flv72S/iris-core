#!/usr/bin/env bash
# Phase 7 Runtime Test Execution & Determinism Certification
# Runs all phase-7-tests and prints PHASE 7 CERTIFICATION REPORT.
set -e
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
echo "Running Phase 7 certification suite..."
npx vitest run tests/phase-7-tests --reporter=verbose 2>&1
EXIT=$?
echo ""
echo "=============================================="
echo "   PHASE 7 CERTIFICATION REPORT"
echo "=============================================="
echo "   Determinism:          $([ $EXIT -eq 0 ] && echo PASS || echo FAIL)"
echo "   Guardrails:           $([ $EXIT -eq 0 ] && echo PASS || echo FAIL)"
echo "   Kill-Switch:          $([ $EXIT -eq 0 ] && echo PASS || echo FAIL)"
echo "   Rollback:             $([ $EXIT -eq 0 ] && echo PASS || echo FAIL)"
echo "   Audit Integrity:      $([ $EXIT -eq 0 ] && echo PASS || echo FAIL)"
echo "   Replay Certification: $([ $EXIT -eq 0 ] && echo PASS || echo FAIL)"
echo "   Golden Scenarios:     $([ $EXIT -eq 0 ] && echo PASS || echo FAIL)"
echo "=============================================="
if [ $EXIT -eq 0 ]; then
  echo "   Phase 7 CERTIFIED."
else
  echo "   Phase 7 NOT CERTIFIED. Do not advance to Phase 8."
fi
echo "=============================================="
exit $EXIT
