# Action Plans Creation Test

## Bug Regression Test: createdBy field

### Bug Description
The `createdBy` field was being stripped during Zod validation because it's in the `.omit()` list, causing NOT NULL constraint violations.

### Test Case
```bash
# Should successfully create an action plan with createdBy populated
curl -X POST http://localhost:5000/api/action-plans \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Plan",
    "riskId": "0d8db484-de5d-42f2-9f9c-353274e35e39",
    "description": "Test description",
    "responsible": "Test User",
    "dueDate": "2025-12-31",
    "priority": "high",
    "status": "pending",
    "progress": 0
  }'
```

### Expected Result
- HTTP Status: 201 Created
- Response includes `"createdBy": "user-1"`
- Database record has `created_by` populated (not NULL)

### Actual Result (After Fix)
✅ PASSED - Action plan created successfully with createdBy field populated

### Root Cause
Fields in `insertActionSchema.omit()` are removed during `.parse()`. Must add them AFTER validation, not before.

### Pattern to Follow
```typescript
// ❌ WRONG - createdBy will be stripped
const data = { ...fields, createdBy: userId };
const validated = schema.parse(data);
await storage.create(validated); // createdBy is gone!

// ✅ CORRECT - Add after validation
const data = { ...fields };
const validated = schema.parse(data);
const final = { ...validated, createdBy: userId };
await storage.create(final); // createdBy preserved!
```
