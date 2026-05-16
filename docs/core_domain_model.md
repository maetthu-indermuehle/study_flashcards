# Core Domain Model

This diagram shows the planned core entities for the PPL flashcard app. It is a conceptual model, not the final Prisma schema, but it should map closely to the database design.

```mermaid
erDiagram
    USER ||--o{ DECK : creates
    USER ||--o{ CARD : creates
    USER ||--o{ STUDY_SESSION : starts
    USER ||--o{ REVIEW : records
    USER ||--o{ CARD_PROGRESS : owns
    USER ||--o{ IMPORT_BATCH : runs
    USER ||--o{ MEDIA_ASSET : uploads

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

    USER {
        string id PK
        string email
        string displayName
        string passwordHash
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
        string sourceImportId FK
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
```

## Relationship Notes

- `CardProgress` is per user and per card. This lets multiple users study the same deck while keeping separate spaced repetition state.
- `Review` is append-only history. The scheduler can be changed later because the raw review events are preserved.
- `Choice` exists only for multiple-choice cards. Open-answer cards do not need choices.
- `Tag` is flexible. Topic, source, skill area, and custom filters all use the same tagging system.
- `MediaAsset` stores file metadata; the actual file should live in object storage or another external file store.
- `SourceReference` is separate from tags so a card can have precise references as well as broad filterable labels.
- `ImportBatch` records how cards entered the system and supports preview, validation, rollback, and later export/debug workflows.

