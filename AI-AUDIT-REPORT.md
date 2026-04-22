# Audit IA Archer — 2026-04-22

**Méthodologie :** lecture read-only de `backend/server.py` (9 485 lignes), `backend/services/legal_rag.py`, `backend/prompts/case_type_personas.py`, endpoints chat/letter/refine, plus survol frontend. Aucune modification de code dans ce commit.

---

## 🚨 TOP 3 CRITIQUES À VALIDER EN PRIORITÉ

1. **🔴 `call_claude_fast` appelle Opus 4.7 — le nom ment.** Chat, Q&A d'impact et génération de lettre légère utilisent tous `claude-opus-4-7` via `call_claude_fast`, avec un simple `timeout=90s` au lieu d'un modèle réellement rapide. C'est là que tu perds 5-10 s par appel "fast". Fix = passer à `claude-sonnet-4-6` pour Q&A impact (~3× plus rapide, qualité suffisante pour un patch incrémental).

2. **🔴 Pas de Pass 7 de validation des citations.** Le RAG retourne des articles réels (corpus belge embarqué), le prompt dit au modèle *« Toute citation hors de cette liste sera détectée comme HALLUCINATION »* — mais **aucune validation réelle** n'est exécutée après Pass 2. Le modèle peut donc inventer `Art. 1134 bis C. civ.` sans que rien ne le rattrape. Fix = ajouter une passe de regex + lookup dans le corpus après Pass 2.

3. **🔴 `VOYAGE_API_KEY` manquante = RAG silencieusement désactivé.** Si la clé n'est pas présente, `legal_rag.py:144` log un warning et retourne `None`. La Pass 2 continue **sans articles de loi injectés**, mais le prompt reste identique. Résultat : analyse dégradée invisible, sans alerte admin. Fix = vérification au boot + failover avec erreur 500 explicite OU fallback à la `jurisprudence.json` statique.

**Avant que je lance le freeze US (commit 2), valide ces 3 diagnostics et dis-moi lesquels tu veux que je fixe dans le même sprint.**

---

## 1. Cartographie des fichiers IA

| Fichier | Lignes | Rôle |
|---|---|---|
| `backend/server.py` | 9 485 | Tout le pipeline d'analyse (US+BE+stream+multi-doc), chat, lettres, refinement, contract guard |
| `backend/services/legal_rag.py` | 372 | RAG Voyage AI — corpus statutes + jurisprudence belge |
| `backend/prompts/case_type_personas.py` | 230 | Blocks d'expertise par type de cas (US et BE) |
| `backend/models.py` | ~260 | Schemas Case, Document, User, LawyerCall, etc. |
| `backend/jurisprudence.json` + `jurisprudence_belgique.json` | — | Corpus statique (chargé en RAM) |
| `backend/routes/live_counsel_routes.py` | 408 | Matching & routing des appels live |
| Frontend `Signup.js`, `HomePage.jsx`, `CaseTypePicker.jsx`, `Settings.js` | — | Sélecteur jurisdiction + copies US |

---

## 2. Pipeline d'analyse — état par pass

Le pipeline réellement exécuté en production passe par `_start_streaming_analysis` (`server.py:1833`) → `analyze_document_stream` (`server.py:1360`). Il a **6 passes** (pas 7), avec du self-critique inline sur Pass 2 et Pass 6.

| Pass | Nom | Modèle | Max tokens | Cache | Parallèle ? | Storage | Problème |
|---|---|---|---|---|---|---|---|
| 1 | Fact extraction | opus-4-7 | 4 000 | ✅ sys | séquentiel | `cases.ai_findings` (implicite) | OK |
| 2 | Legal analysis | opus-4-7 | **8 000** | ✅ sys | séquentiel | `cases.applicable_laws` + `ai_findings` | **Max tokens excessif** |
| 2-crit | Self-critique | opus-4-7 | 2 000 | ✅ sys | séquentiel | `analysis_critiques` | Déclenché si severity > 5 |
| 2-rewr | Self-rewrite | opus-4-7 | 8 000 | ✅ sys | séquentiel | réécrit la Pass 2 en place | **Double coût Opus** |
| 3 | Strategic recs | opus-4-7 | 6 000 | ✅ sys | **parallèle** avec 4A/4B/5 | `cases.ai_next_steps`, `archer_question`, `success_probability` | `archer_question` parfois manquant → retry |
| 4A | User arguments | opus-4-7 | 4 000 | ✅ sys | **parallèle** | `cases.battle_preview` (user side) | Validation post-hoc (>= 3 args sinon retry) |
| 4B | Opposing arguments | opus-4-7 | 4 000 | ✅ sys | **parallèle** | `battle_preview` (opposing) | **Pas de validation** |
| 5 | Adversarial attack | opus-4-7 | 5 000 | ✅ sys | **parallèle** | `cases.adversarial_attack` | Retourne `{}` silencieusement si parse fail |
| 6 | Counter-strategy | opus-4-7 | **8 000** | ✅ sys | séquentiel (après gather) | réécrit `strategy` | **Skippé si Pass 5 vide** → Pass 3 garde la main |
| 6-crit | Self-critique | opus-4-7 | 2 000 | ✅ sys | séquentiel | `analysis_critiques` | idem |
| 7 | Citation validation | **N/A** | — | — | — | — | **N'EXISTE PAS** 🔴 |

**Détails importants :**

- `call_claude` (`server.py:502`) : system prompt avec `cache_control: ephemeral`, user messages **non cachés**. Cache hit rate estimé <20% du fait que le JSON facts/analysis est dans le user message.
- Retry : outer 3 retries avec backoff `(attempt+1)*3` = 3s/6s ; inner 4 auto-scales max_tokens (4k→32k) sur truncation. Return `{}` en cas d'échec total (pipeline continue avec données vides 🟡).
- Timeout Anthropic : **180 s** (`call_claude`), **90 s** (`call_claude_fast`). CourtListener : 15 s.
- `analyze_document_stream` ne stream PAS les tokens Anthropic — il émet 9 events SSE entre les passes, chacun après un `await call_claude()` complet. Le "streaming" est cinématique frontend, pas token-by-token.

---

## 3. Incohérences détectées

### 🔴 Critiques (fix priorité 1)

1. **`call_claude_fast` ≠ fast** (`server.py:574-611`, `587` : `"model": "claude-opus-4-7"`). Utilisé ligne 5604 (Q&A impact) et 5696 (letter draft). La seule différence avec `call_claude` est `timeout=90s` et 2 retries au lieu de 3. **Impact perf** : chaque Q&A impact coûte un appel Opus complet alors qu'un Sonnet suffit amplement.

2. **Pas de Pass 7 / validation de citations** (cherché `validate_citations`, `check_citations`, regex sur articles dans server.py — absent). Le RAG (`legal_rag.py:302-303`) injecte une instruction stricte dans le prompt, mais rien côté code ne vérifie que les citations retournées par la Pass 2 existent réellement. Risque hallucination. Exemple concret : le modèle peut citer `art. 1134 bis C. civ.` (inexistant) sans filet.

3. **VOYAGE_API_KEY silencieusement optionnelle** (`legal_rag.py:144-147`). Si absente → `logger.warning("legal_rag: VOYAGE_API_KEY missing — skipping retrieval")` → `None`. La Pass 2 continue sans articles. Pas de health check au démarrage, pas d'alerte.

4. **Doublons de pipelines — 5 copies** :
   - `analyze_document_advanced` (server.py:1195) — US, non-stream
   - `analyze_document_belgian` (server.py:2360) — BE, non-stream
   - `analyze_document_stream` (server.py:1360) — US+BE, stream (production)
   - `run_multi_doc_analysis_advanced` (server.py:~3500) — US multi-doc
   - `run_multi_doc_analysis_belgian` (server.py:3706) — BE multi-doc
   
   Chaque pipeline duplique la logique PASS 1→2→gather(3/4A/4B/5)→6. Un seul `analyze_document(country, doc_list, stream)` paramétré éliminerait ~40% de code dupliqué. Coût maintenance actuel : toute correction de prompt doit être faite 5 fois.

### 🟡 Moyens (fix sprint suivant)

5. **Letter generation : pas de prompt caching** (`server.py:2973-2979`). Headers sans `cache_control` ni `anthropic-beta`, contrairement à `call_claude` et au chat. System prompt lettre réenvoyé intégralement à chaque appel.

6. **PASS 2 et PASS 6 : `max_tokens=8000`** (`server.py:1236`, `server.py:918`). C'est énorme pour un output JSON structuré. Un cap à 6 000 devrait suffire (économie ~5s latence + coût).

7. **Chat : sliding window naïve** (`server.py:6575`). Hard limit `to_list(50)` messages sans token counting. Si un message contient une longue citation, on peut dépasser le context limit silencieusement.

8. **Dynamic case context non caché** (`server.py:6602-6603`). Le static system (persona chat) est caché, mais le bloc dynamique "Active case X, risk Y, findings..." est ajouté en clair. Si l'user pose 10 questions sur le même case, on renvoie le contexte 10× sans cache.

9. **Defaults jurisdiction = "US" en 3 endroits** (voir §8).

10. **Query embeddings Voyage non cachés** (`legal_rag.py:207`). Document embeddings cachés une fois au boot ✅, mais chaque query refait un appel Voyage. Si le même case_type + facts relance une analyse (refinement), on paie 2× l'embedding.

11. **PASS 6 skip silencieux** (`server.py:1270-1272`). Si Pass 5 retourne `counter_arguments: []`, Pass 6 n'est pas lancée → la strategy reste celle de Pass 3, sans absorber les contre-arguments. Il n'y a pas de log/alert sur ce skip.

### 🟢 Mineurs

12. **`analyze_document_advanced` encore utilisé côté non-streaming** (letter generation, contract guard). Peu d'impact mais contribue à la duplication.

13. **`ai_findings` reçoit le output Pass 2 entier** (pas juste findings). Un tri côté backend rendrait le contrat DB plus propre.

14. **`SENIOR_ATTORNEY_PERSONA` (US)** est toujours le fallback par défaut — si un user BE a `jurisdiction=None`, il tombe sur la persona US.

---

## 4. Problèmes de performance

### Chain critique (estimation)

```
PASS 1 (Opus, 4k, ~15 s)
  ↓
PASS 2 (Opus, 8k, ~20 s)
  ↓
[self-critique PASS 2 + rewrite éventuel (~5-15 s supplémentaires si déclenché)]
  ↓
asyncio.gather(PASS 3 6k, PASS 4A 4k, PASS 4B 4k, PASS 5 5k) → durée = max(~15 s)
  ↓
PASS 6 (Opus, 8k, ~20 s, conditionnel)
  ↓
[self-critique PASS 6 + rewrite éventuel]
  ↓
DB persist (~1 s)

TOTAL : ~70 s sans self-critique déclenchée, ~95-110 s avec.
```

Ça explique tes "dizaines de secondes voire timeout" — avec 2 self-critiques déclenchées + RAG (~2 s) + CourtListener sur US (~5-8 s), on dépasse facilement 110 s.

### Goulots identifiés

| # | Goulot | Impact estimé | Effort fix |
|---|---|---|---|
| A | `call_claude_fast` utilise Opus | Gains 5-10 s sur Q&A/letter-fast | 1 ligne |
| B | PASS 2 `max_tokens=8000` | -3 à -5 s | 1 ligne |
| C | PASS 6 `max_tokens=8000` | -3 à -5 s | 1 ligne |
| D | User message non caché (PASS 2/3/4/5 réutilisent facts JSON) | Cache hit +30% = -5 à -10 s sur refinement | moyen (restructurer les calls) |
| E | Letter gen sans caching | -2 à -4 s par lettre | 3 lignes (ajouter headers + cache_control) |
| F | 2 self-critiques séquentielles Opus | Rendre Sonnet (qualité suffit) : -10 à -20 s | petit refactor |
| G | Query embedding Voyage non caché | LRU 256 queries : -200 ms par refinement | petit |

### Opus vs Sonnet — où downgrader sans perte

- Self-critique (analyser un JSON) → **Sonnet 4.6 OK**
- Letter draft `call_claude_fast` → **Sonnet 4.6 OK**
- Q&A impact (classification binaire) → **Sonnet 4.6 voire Haiku 4.5**
- Chat → déjà Sonnet 4.6 ✅
- Validation Pass 4A (> 3 args) → **Sonnet**
- Validation `archer_question` → **Sonnet**

Rester sur Opus : Pass 1 (extraction précise), Pass 2 (legal analysis), Pass 3 (stratégie), Pass 4A/4B/5 (raisonnement multi-partie), Pass 6 (counter-strategy), letter generation finale (Opus déjà).

---

## 5. Bugs de prompts

### 5.1 Contradictions

- **`get_jurisdiction_guard`** (`server.py:3187-3210`) : injecte *"NEVER cite Belgian law or EU law under any pretext"* quand jurisdiction=US, et l'inverse pour BE. Cohérent en soi, MAIS la `SENIOR_ATTORNEY_PERSONA` (ligne 87-100) décrit l'avocat comme *"20 years of experience… 2,000+ cases across every area of civil law"* — sans précision US. Un user BE qui tombe sur le fallback US persona (voir §3.14) reçoit donc un prompt US + jurisdiction_guard BE. Contradiction implicite.

- **US prompts en anglais, BE prompts en français** — cohérent, mais `PASS4A_SYSTEM` (US, ligne 427) dit *"NEVER leave arguments empty"* en caps, alors que `BE_PASS4A_SYSTEM` (ligne 2259) dit la même chose en français sans les caps. Pas grave mais inconsistance de ton.

### 5.2 Instructions manquantes

- Aucun prompt ne demande de validation explicite des citations légales retournées (pas de `# If citing a statute, it MUST match the provided list exactly` en fin de prompt Pass 2). Le garde-fou est soft.

- Pas d'exemple JSON dans les prompts PASS (pas de few-shot). Le modèle se base sur la description textuelle du schéma.

### 5.3 "Action phrases" bug

Le brief mentionne un bug connu sur les "phrases d'action vs titres de concepts". Recherche dans le code : **pas de preuve** dans la génération de lettre (`server.py:2731-2766`, `5677-5682`). La lettre sort `subject/recipient/body/legal_citations/deadline_mentioned`. Le bug signalé concerne probablement `ai_next_steps[].action` (Pass 3) — mais le prompt dit explicitement *"next_steps with action_type, recipient, legal_basis"* donc format OK. **À clarifier avec toi : sur quelle page le bug se manifeste ?**

### 5.4 Marques IA interdites

Recherche `Claude`, `Anthropic`, `Opus`, `Sonnet` dans les prompts system : **pas de mention**. ✅ Propre.

### 5.5 Prompt trop long

- `SENIOR_ATTORNEY_PERSONA` + jurisdiction_guard + expertise_block + lang_instruction : **~2 000-3 000 tokens** de system prompt à chaque appel (au moins caché). OK grâce au caching système.
- `BE_PASS2_PROMPT` complet avec jurisprudence_section injectée : peut atteindre **4 000-5 000 tokens** de user message (non caché). C'est là qu'on paie.

---

## 6. Recommandations (par priorité)

### Sprint immédiat (< 1 semaine)

1. **Fix `call_claude_fast`** : changer `"claude-opus-4-7"` → `"claude-sonnet-4-6"` à la ligne 587. Gains immédiats sur Q&A et letter-fast.
2. **Baisser PASS 2 et PASS 6 `max_tokens`** : 8000 → 6000. Deux lignes à changer.
3. **Guard VOYAGE_API_KEY au boot** : check explicite au démarrage, log error si absent, et propager un flag `_rag_enabled` dans les endpoints pour retourner 503 au lieu d'analyser à vide.
4. **Ajouter `cache_control` sur la lettre** (`server.py:2973-2979`) comme dans `call_claude`.

### Sprint +1 (1-2 semaines)

5. **Implémenter Pass 7 validation de citations** : regex pour extraire `art. XXX`, lookup contre corpus statique (`jurisprudence_belgique.json` + statutes) OU embedding similarity, flag les citations orphelines dans `ai_findings`.
6. **Cache query embeddings** : LRU 256 dans `legal_rag.py`.
7. **Dynamic chat context caché** : promouvoir "case summary + findings" en prompt system caché, pas en user message (pour les 10 premières questions sur un même case).
8. **Consolider les 5 pipelines** en `analyze_document(country, multi_doc, stream)`. Refactor gros mais dette de dette.

### Sprint +2 (2-4 semaines)

9. **Self-critique en Sonnet** : downgrade le critique pass (Opus n'apporte rien pour juger un JSON).
10. **Few-shot examples** dans PASS 2 et PASS 6 (JSON de sortie attendu en exemple).
11. **Alerting sur Pass 6 skip** : log structuré quand Pass 5 retourne vide → dashboard/sentry.

---

## 7. Quick wins (< 30 min chacun)

| Win | Fichier | Ligne | Effort |
|---|---|---|---|
| `call_claude_fast` → Sonnet | `server.py` | 587 | 1 ligne |
| PASS 2 max_tokens 8000 → 6000 | `server.py` | 1236, 2401, 1487 | 3 lignes |
| PASS 6 max_tokens 8000 → 6000 | `server.py` | 918, 3366 | 2 lignes |
| Cache control sur letter | `server.py` | 2973-2979 | +3 lignes |
| Default jurisdiction `"US"` → `"BE"` | auth_routes.py:94, Signup.js:21, HomePage.jsx:43 | | 3 lignes |
| VOYAGE_API_KEY startup check | `server.py` (boot) | — | +5 lignes |
| Log `rag_disabled=true` dans cases.ai_findings metadata | `analyze_document_stream` | — | +2 lignes |

**Total estimé : 1h30 de dev + 30 min de tests** pour un gain de 15-25 s sur le temps d'analyse totale + quality monitoring.

---

## 8. État du freeze USA

### 8.1 Fichiers avec références US identifiées

**Backend prompts 100% US** (`backend/server.py`) :
- `PASS1_PROMPT` (ligne 163) — English, fact extraction US
- `PASS2_PROMPT` (ligne 201) — Legal analysis US law patterns
- `PASS3_PROMPT` (ligne 282) — Strategic US context
- `PASS4A_SYSTEM` + `PASS4A_PROMPT` (lignes 427, 429) — US attorney
- `PASS4B_SYSTEM` + `PASS4B_PROMPT` (lignes 452, 454) — US opposing counsel
- `SENIOR_ATTORNEY_PERSONA` (lignes 87-100) — "20 years US litigation experience"
- `CLAUDE_SYSTEM_PROMPT` (ligne 1356) — alias de SENIOR_ATTORNEY_PERSONA
- `get_jurisdiction_guard(jurisdiction=US)` branch (ligne 3187-3210)
- OCR system, contract guard vision path (lignes 3827, 4455-4463) utilisent CLAUDE_SYSTEM_PROMPT

**Backend expertise blocks US** (`backend/prompts/case_type_personas.py`) :
- `_US["wrongful_termination"]` — Title VII, ADA, ADEA, FMLA (lignes 52-54)
- `_US["severance"]` — OWBPA, ERISA, IRC § 409A (lignes 61-64)
- `_US["workplace_discrimination"]` — Title VII, ADA, EEOC, California FEHA (lignes 71-74)
- `_US["harassment"]` — Meritor/Harris/Faragher/Ellerth (lignes 81-84)
- `_US["debt"]` — FDCPA, FCRA, TCPA (lignes 103-105)
- `_US["insurance_disputes"]` — ERISA § 502 (lignes 113-115)
- `_US["tax_disputes"]` — IRC, Tax Court, SNOD (lignes 122-125)
- `_US["identity_theft"]` — FCRA, FACTA, ITIN (lignes 133-135)
- `_US["disability_claims"]` — SSDI/SSI, ERISA, VA (lignes 153-155)
- `_US["medical_malpractice"]` (ligne 143-146)

**Country branching dans le pipeline** :
- `server.py:1372` `is_belgian = country == "BE"` + tout le bloc `else` (lignes 1375-1423)
- `server.py:3706` `run_multi_doc_analysis_belgian` (le nom laisse entendre que US est par défaut)
- `server.py:4090` `is_belgian = (current_user.jurisdiction or case_doc.get("country", "US")) == "BE"` — **default "US"** 🔴
- `server.py:4161` fallback `SENIOR_ATTORNEY_PERSONA` si non-BE
- `server.py:4357-4490` — 6+ branches `if is_belgian else` pour multi-doc

**Defaults jurisdiction = "US"** :
- `backend/routes/auth_routes.py:94` — fallback "US" sur signup si pas de jurisdiction
- `frontend/src/pages/Signup.js:21` — `localeToSignup['us-en']` default
- `frontend/src/pages/HomePage.jsx:43` — `languageFallback === 'fr' ? 'BE' : 'US'`
- `backend/server.py:1914` — `user_country = current_user.jurisdiction or "US"`

**Frontend — copies US dans l'UI client** :
- `CaseTypePicker.jsx:175-188` — descriptions EN avec sigles US (Title VII, FDCPA, SSDI, IRS, USCIS…)
- `JurisdictionOnboarding.js:67-128` — section onboarding US complète
- `Signup.js:105-112` — dropdown country avec option US
- `Settings.js:261-269` — state selector US-only
- `Settings.js:307` — `'$' + price` hardcodé
- `V3CaseHeader.jsx:79` — flag logic "USA"
- `HowItWorks.js:20, 31-32, 82, 101` — case study NYC + $49.99
- `Landing.js:76, 91` — pricing `$49.99`, `$149`
- `data/landingTranslations.js:86-87, 570-571` — pricing USD dans EN et ES

**Case types candidats au masquage en BE** :
- Tous les `_US[*]` expertise blocks
- Les descriptions EN de `CaseTypePicker.jsx` si la langue UI n'est pas anglais

**Prix en USD dans le pipeline** :
- `SPRINT_E.md:50`, `attorney_matching.py:60` — "€149 / $149" Live Counsel
- `SPRINT_D.md:25` — attorney letter "€39 BE / $49 US"
- `jurisprudence.json:52-54` — "$1,000 FDCPA statutory damages" (contenu RAG US)

### 8.2 Modifications proposées (NON EXÉCUTÉES — en attente de validation)

- [ ] **Hardcode BE dans le pipeline** : 
  - `server.py:1914` `user_country = "BE"` (ou guard 400)
  - `server.py:4090` default `"BE"` + guard si != "BE"
  - `server.py:1360` `analyze_document_stream(country: str = "BE")`
  - `auth_routes.py:94` fallback `"BE"` au lieu de `"US"`
- [ ] **Guard 400** en tête de `analyze_trigger_endpoint` (`server.py:1903`) et du multi-upload : `if user_country.upper() != "BE": raise HTTPException(400, "Archer couvre uniquement la Belgique pour le moment.")`
- [ ] **Commenter les prompts US** avec `# FREEZE US — réactiver M6+` : `PASS1_PROMPT`, `PASS2_PROMPT`, `PASS3_PROMPT`, `PASS4A_*`, `PASS4B_*`, `SENIOR_ATTORNEY_PERSONA`, `CLAUDE_SYSTEM_PROMPT`. **Ne pas supprimer**, juste désactiver via commentaire bloc ou flag `_FREEZE_US = True` qui les rend inaccessibles.
- [ ] **Commenter les `_US[*]` dans `case_type_personas.py`**.
- [ ] **UI frontend** :
  - Retirer option "United States" du dropdown `Signup.js:109`
  - Changer default `localeToSignup['us-en']` → `['be-fr']` (Signup.js:21)
  - Changer fallback HomePage.jsx:43 → `'BE'`
  - Masquer JurisdictionOnboarding.js section US (lignes 67-128) — wrap dans `{false && ...}` ou commentaire
  - Hide state selector Settings.js:261-269
  - Changer `Settings.js:307` `$` → `€`
  - Remplacer descriptions EN US-flavor de CaseTypePicker.jsx par fallback FR ou retirer les sigles

### 8.3 Fichiers US à CONSERVER (freeze, pas suppression)

**À garder pour SEO** (publics) :
- `frontend/src/pages/HowItWorks.js` — a du contenu US visible (case #4821, NYC tenant law)
- `frontend/src/pages/WinningCases.js` — win wall avec cases US
- `frontend/src/pages/Landing.js` — landing principale (jurisdiction-aware)
- `frontend/src/pages/Blog.jsx` + `BlogArticle.jsx` — articles US-focus
- `frontend/src/pages/PillarPage.jsx` — pages pillar US
- `frontend/src/pages/EnginePage.jsx` — architecture overview
- `frontend/src/content/pillarPages.js` — contenu pillar (US + BE)
- `frontend/src/content/statePages.js` — pages par état US (TX, NY, CA, FL, PA, IL)

**Ces pages SEO ne sont PAS modifiées par le freeze** — elles restent en place pour le référencement. Juste : si un visiteur clique "Start a case" depuis une page US, il doit être redirigé vers `/signup` qui force désormais BE.

### 8.4 Backend US à CONSERVER

- `jurisprudence.json` (corpus RAG US) — inutilisé si pipeline BE-only mais gardé pour réactivation
- Routes attorney/matching — pas touchées (attorneys peuvent continuer à être US, c'est un autre produit)
- Live Counsel pricing "€149 / $149" — garder la logique dual-currency, juste le default BE

### 8.5 Estimation effort freeze US

- **Quick (2-3 h)** : hardcode defaults + guards + masquage UI
- **Medium (4-6 h)** : commenter tous les prompts US + expertise blocks + descriptions CaseTypePicker
- **Deep (optionnel, 8+ h)** : remplacer les copies FR/NL par du vrai contenu BE sur les pages SEO

**Proposition de scope pour le commit 2** : Quick + Medium (~6-8 h de dev). Le Deep viendra dans un sprint content/marketing séparé.

---

## 9. Ce qui n'a PAS été vérifié

- **Test réel de perf** : pas de `curl` lancé (pas d'environnement de test accessible depuis le CLI). Les estimations sont basées sur la lecture du code + les latences typiques Anthropic.
- **Validation runtime des self-critiques** : on sait qu'elles sont déclenchées si severity > 5, mais pas quel % de cas réels déclenche (pas de télémétrie lue).
- **Usage réel du cache** : pas de mesure du hit rate (pas de dashboard Anthropic lu).
- **Contenu détaillé des pages SEO US** : survol seulement, pas de lecture exhaustive. Un sprint content séparé sera nécessaire pour les Belgianiser proprement.

---

**Fin du rapport.** En attente de validation Romain sur les 3 critiques en haut avant le commit de freeze US.
