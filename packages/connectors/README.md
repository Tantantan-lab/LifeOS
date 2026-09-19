# @lifeos/connectors

Data connector layer. Arrives in **M4**.

Every external system normalizes into the unified `Event` shape (`apps/web/src/data/types.ts` → `database/migrations/`):

```
GitHub / Apple Health / Calendar / Anki / Hevy / Gmail / Finance / Manual
        ↓
   Event Queue
        ↓
    Normalize   (domain, metric, value, unit, source, confidence)
        ↓
   PostgreSQL
```

First connector ships in **M5**: GitHub.
