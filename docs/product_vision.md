# PPL Flashcard App Product Vision

## Purpose

The goal of this app is to make studying for the Canadian Private Pilot Licence groundschool exam easier, more focused, and more consistent.

The app should provide a simple mobile-first flashcard experience that can be used during short study windows: on the couch, during a break, while commuting as a passenger, or before a lesson. It should help turn a large and sometimes overwhelming body of aviation knowledge into small, repeatable learning steps.

## Core Idea

The app is a personal study companion for PPL knowledge.

Instead of reading manuals passively or reviewing long static question documents, the user studies with interactive flashcards. The app tracks progress, repeats cards at useful intervals, and helps identify weak areas.

The system starts with curated Canadian PPL questions created from official and trusted references, but it should also make it easy to add personal questions while studying.

## Target User

The first target user is a Canadian PPL student preparing for:

- groundschool,
- the Transport Canada written exam,
- PSTAR-related knowledge,
- flight training briefings,
- practical weather and air law decisions.

The app should also be useful later for:

- pilots refreshing old knowledge,
- instructors creating focused decks,
- students preparing for specific lessons or weak topics.

## Learning Goals

The app should help the user:

- remember facts and definitions,
- understand aviation concepts,
- interpret weather products, charts, and reports,
- practise real-world go/no-go decision-making,
- recognize weak areas,
- build confidence before exams and flights,
- keep knowledge fresh over time.

The app should not only test whether an answer is correct. It should also teach through explanations, references, diagrams, and repeated exposure.

## Study Experience

The study experience should be:

- simple,
- fast,
- mobile-friendly,
- calm,
- visually polished,
- low-friction.

A study session should not feel like managing software. It should feel like opening the app, answering the next useful question, learning from the explanation, and moving on.

The main study flow should support:

- multiple-choice questions,
- open-answer questions,
- image/chart/table-based questions,
- explanations after answering,
- references for deeper study,
- self-rating for open-answer cards.

## Spaced Repetition

The app should use spaced repetition so that cards are reviewed when they are most useful.

Cards that are easy should appear less often. Cards that are hard, forgotten, or answered incorrectly should return sooner. Over time, this should make study sessions more efficient than random review alone.

The first scheduler can be simple, but the data should be stored in a way that allows a more advanced scheduler later.

## Question Sources

Questions may come from:

- Transport Canada material,
- Canadian Aviation Regulations,
- PSTAR questions,
- NAV CANADA weather references,
- FAA references where appropriate for non-Canadian-law topics,
- personally created study notes,
- future AI-assisted imports.

The app should preserve source information wherever possible so the user can go back to the reference material and understand where the answer came from.

## Database as Source of Truth

Markdown files are useful for creating and collecting questions during early development, but the long-term source of truth should be the application database.

The app should allow cards to be:

- imported,
- edited,
- tagged,
- reviewed,
- archived,
- exported again later.

Exporting back to Markdown should be possible in the future so the question set remains portable and reviewable outside the app.

## Tags and Organization

The app should support flexible tags instead of forcing every question into only one category.

Tags can describe:

- topic,
- source,
- difficulty,
- exam area,
- skill,
- scenario type,
- personal weak area.

This should make it possible to study broadly or narrowly, for example:

- all meteorology,
- only Canadian weather products,
- only weak air law questions,
- only image-based chart questions,
- only cards from official Transport Canada references.

## Personalization

The app should support personal learning over time.

The user should be able to:

- add a question when they notice a weak area,
- edit a confusing card,
- tag a card as personally important,
- focus study sessions on weak cards,
- keep progress synced across devices.

Although the first version may be used by one person, the app should be designed so multiple users can eventually have separate progress, decks, and study histories.

## Media Support

Some aviation questions cannot be studied well as plain text.

The app should eventually support:

- images,
- weather charts,
- diagrams,
- tables,
- graphs,
- screenshots,
- short videos,
- PDF excerpts or references.

Media should be attached to cards with source information and alt text where possible.

## Long-Term Direction

Over time, the app could grow into a broader aviation study tool.

Possible future features:

- bulk import with validation,
- AI-assisted question generation,
- duplicate detection,
- instructor-created decks,
- shared decks,
- offline study mode,
- richer progress analytics,
- exam-readiness estimates,
- lesson-specific study packs,
- Markdown/JSON/CSV export,
- better media library management.

The first version should stay focused: study cards, track progress, import the existing deck, and make it pleasant enough to use every day.

