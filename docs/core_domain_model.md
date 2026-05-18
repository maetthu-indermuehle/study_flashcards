# Core Domain Model

This diagram reflects the current Prisma schema (`app/prisma/schema.prisma`). It should be updated whenever the schema changes.

```mermaid
erDiagram
    USER ||--o{ DECK : creates
    USER ||--o{ CARD : creates
    USER ||--o{ STUDY_SESSION : starts
    USER ||--o{ REVIEW : records
    USER ||--o{ CARD_PROGRESS : owns
    USER ||--o{ IMPORT_BATCH : runs
    USER ||--o{ MEDIA_ASSET : uploads
    USER ||--o{ ADMIN_EVENT : acts_in
    USER ||--o{ ADMIN_EVENT : targeted_by
    USER ||--o{ STUDY_PRESET : saves

    DECK ||--o{ CARD : contains

    CARD ||--o{ CHOICE : has
    CARD ||--o{ REVIEW : reviewed_as
    CARD ||--o{ CARD_PROGRESS : tracked_by
    CARD ||--o{ SOURCE_REFERENCE : cites
    CARD ||--o{ CARD_TAG : classified_by
    CARD ||--o{ CARD_MEDIA : uses

    TAG ||--o{ CARD_TAG : applied_to

    MEDIA_ASSET ||--o{ CARD_MEDIA : attached_as

    STUDY_SESSION ||--o{ REVIEW : includes

    IMPORT_BATCH ||--o{ CARD : creates

    USER ||--o{ CARD_REVISION : edits
    CARD ||--o{ CARD_REVISION : versioned_by

    USER {
        string id PK
        string email
        string displayName
        string passwordHash
        Role role "USER | EDITOR | ADMIN"
        int passwordVersion
        datetime createdAt
        datetime updatedAt
    }

    DECK {
        string id PK
        string name
        string description
        string visibility
        string createdByUserId FK
    }

    CARD {
        string id PK
        string deckId FK
        string createdByUserId FK
        string importBatchId FK
        string originalId
        string type
        string question
        string answer
        string explanation
        string difficulty
        string status
        datetime createdAt
        datetime updatedAt
    }

    CHOICE {
        string id PK
        string cardId FK
        string text
        boolean isCorrect
        int sortOrder
    }

    TAG {
        string id PK
        string name
        string type
    }

    CARD_TAG {
        string cardId FK
        string tagId FK
        string note "nullable"
    }

    SOURCE_REFERENCE {
        string id PK
        string cardId FK
        string label
        string url
        string documentName
        int page
        string section
        string notes
    }

    MEDIA_ASSET {
        string id PK
        string ownerUserId FK
        string storageKey
        string publicUrl
        string mimeType
        string kind
        string altText
        string sourceLabel
        string sourceUrl
        string licenseNotes
        datetime createdAt
    }

    CARD_MEDIA {
        string cardId FK
        string mediaAssetId FK
        string role
        int sortOrder
    }

    REVIEW {
        string id PK
        string userId FK
        string cardId FK
        string sessionId FK
        string rating
        boolean answeredCorrectly
        int responseMs
        datetime reviewedAt
    }

    CARD_PROGRESS {
        string userId FK
        string cardId FK
        datetime dueAt
        datetime lastReviewedAt
        float intervalDays
        float ease
        float stability
        float difficulty
        int lapses
        int reviewCount
        string lastRating
    }

    STUDY_SESSION {
        string id PK
        string userId FK
        string mode
        json filters
        datetime startedAt
        datetime endedAt
    }

    IMPORT_BATCH {
        string id PK
        string userId FK
        string sourceType
        string status
        string rawInput
        string summary
        datetime createdAt
    }

    CARD_REVISION {
        string id PK
        string cardId FK
        string editedByUserId FK
        datetime editedAt
        string reason "nullable"
        json snapshot
    }

    LOGIN_ATTEMPT {
        string id PK
        string email
        boolean succeeded
        string ipAddress "nullable"
        datetime attemptedAt
    }

    ADMIN_EVENT {
        string id PK
        string actorUserId FK
        string targetUserId FK "nullable"
        string action
        json detail
        datetime createdAt
    }

    STUDY_PRESET {
        string id PK
        string userId FK
        string name
        json tagIds "array of Tag IDs"
        boolean isShared
        datetime createdAt
        datetime updatedAt
    }
```

## Relationship Notes

- `CardProgress` is per user and per card. This lets multiple users study the same deck while keeping separate spaced repetition state.
- `Review` is append-only history. The scheduler can be changed later because the raw review events are preserved.
- `Choice` exists only for multiple-choice cards. Open-answer cards do not need choices.
- `Tag` is flexible. Topic, source, skill area, and custom filters all use the same tagging system.
- `MediaAsset` stores file metadata; the actual file lives in object storage or a local volume. `sourceLabel` holds the attribution credit line (author and license), `sourceUrl` holds the origin URL where the asset was obtained, and `licenseNotes` holds additional license detail when needed.
- `SourceReference` is separate from tags so a card can have precise references as well as broad filterable labels.
- `ImportBatch` records how cards entered the system and supports preview, validation, rollback, and later export/debug workflows.
- `Card.originalId` preserves the source identifier from the import file (e.g. `"MET-042"`) for traceability and idempotent re-imports.
- `Card.importBatchId` links a card back to the import run that created it.
- `CardTag.note` stores a free-text annotation when the tag is the special `flagged` marker — lets the user record what they think is wrong with a card for later review.
- `CardRevision` is append-only edit history. One row is written before every card save, capturing the full card state as a JSON snapshot (question, answer, explanation, difficulty, status, choices, tags, flagNote). The UI for browsing and restoring revisions is deferred to a later phase; the table exists now so no edit history is lost.
- `User.role` is a three-level enum: `USER` (study + flag + change own password), `EDITOR` (+ card create/edit/import), `ADMIN` (+ manage users). Role checks use a numeric rank comparison so `EDITOR` implicitly satisfies any `USER` check.
- `User.passwordVersion` is incremented on every password change or role change. The value is embedded in the session cookie; `requireRole()` re-reads it from the DB to detect stale sessions without a server-side session store.
- `LoginAttempt` is email-keyed (no `userId` FK) so lock-out behaviour is identical whether the account exists or not, preventing user enumeration via timing differences. Ten failures in 15 minutes locks the account; rows older than 24 h are pruned on each write.
- `AdminEvent` is an append-only audit log written by every admin action (`CREATE_USER`, `CHANGE_ROLE`, `RESET_PASSWORD`, `DELETE_USER`). It records the actor, optional target user, and a JSON detail blob.
- `StudyPreset` stores a named tag selection the user can reload on the study setup page. `tagIds` is a JSON array of Tag IDs; an empty array means "study all cards". `isShared` makes the preset visible to all users; only EDITOR+ role can toggle sharing. The `Deck` (subject) level is not stored in the preset — presets are deck-agnostic, since tag IDs already scope the cards to specific topics.
- `Deck` is the top-level subject grouping. One deck per subject per user (e.g. "Canadian PPL", "IFR"). Created automatically by the importer when a JSON file carries a new `subject` label.
