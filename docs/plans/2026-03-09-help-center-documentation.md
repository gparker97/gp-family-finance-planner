# Plan: Help Center Documentation

> Date: 2026-03-09
> Related issues: #133

## Context

Users need comprehensive documentation about beanies.family — features, encryption, calculations, getting started. This is also the prerequisite content layer for the LLM chatbot (issue #133 phase 2). Content lives in TypeScript data files so it can be squashed into an LLM prompt or used for semantic search/RAG in the chatbot phase.

## Approach

- Content as TypeScript data (structured article objects, no markdown library)
- 7 section types rendered by HelpArticleRenderer component
- Public access via `requiresAuth: false` routes; unauthenticated visitors see HelpPublicHeader
- 16 initial articles across 4 categories (Getting Started, Features, Security, How It Works)
- Client-side search via useHelpSearch composable (debounced, title-first ranking)
- LLM-ready: getArticleSearchText() flattens articles into plain text for prompts

## Files affected

### Created (14)

- `src/content/help/types.ts` — Type definitions
- `src/content/help/categories.ts` — 4 category definitions
- `src/content/help/getting-started.ts` — 4 articles
- `src/content/help/features.ts` — 4 articles
- `src/content/help/security.ts` — 4 articles
- `src/content/help/how-it-works.ts` — 4 articles
- `src/content/help/index.ts` — Barrel with ALL_ARTICLES, getArticle(), search utils
- `src/composables/useHelpSearch.ts` — Search composable
- `src/components/help/HelpPublicHeader.vue` — Public header for unauthenticated visitors
- `src/components/help/HelpArticleCard.vue` — Article preview card
- `src/components/help/HelpArticleRenderer.vue` — Section renderer (7 types)
- `src/pages/HelpCenterPage.vue` — Landing page
- `src/pages/HelpCategoryPage.vue` — Category listing
- `src/pages/HelpArticlePage.vue` — Article view with sidebar, TOC, feedback

### Modified (3)

- `src/router/index.ts` — 3 help routes
- `src/constants/navigation.ts` — Help nav item in pinned section
- `src/services/translation/uiStrings.ts` — ~40 help.\* translation entries
