# FDE Message Relevance Guide

This document explains how the Nixo FDE Slackbot determines if a message is **relevant** and how it categorizes messages for intelligent grouping.

---

## Overview

The system uses **Gemini 2.0 Flash AI** to classify incoming Slack messages into one of five categories. Messages are considered **relevant** if they represent actionable work for Forward-Deployed Engineers.

### Categories

| Category | Relevant? | Description |
|----------|-----------|-------------|
| `support` | Yes | Help requests, troubleshooting, user assistance |
| `bug` | Yes | Errors, crashes, broken functionality |
| `feature_request` | Yes | Enhancement suggestions, new capability requests |
| `question` | Yes | Product questions, deployment inquiries |
| `irrelevant` | ❌ No | Greetings, casual chat, acknowledgments |

---

## Category Definitions

### 🆘 Support

**What it is:** Messages where users need help using the product, solving problems, or understanding functionality.

**Examples:**
- "How do I reset my password?"
- "I can't figure out how to export data"
- "Need help setting up SSO for my team"
- "The dashboard is slow, can you help?"
- "Can someone walk me through the onboarding flow?"

**Key indicators:**
- Questions starting with "How do I...?"
- Requests for assistance or guidance
- Troubleshooting attempts
- Performance concerns
- Configuration help

**Not support:**
- Simple acknowledgments ("Thanks for the help!")
- Already resolved issues without new questions

---

### 🐛 Bug

**What it is:** Messages reporting errors, crashes, unexpected behavior, or broken functionality.

**Examples:**
- "Getting 500 error when I try to upload files"
- "App crashes every time I click on settings"
- "Data not syncing between mobile and web"
- "Chart shows wrong values for last week"
- "Can't log in, says invalid credentials but password is correct"

**Key indicators:**
- Error messages or codes
- Words like "crash", "broken", "not working", "failed"
- Unexpected behavior vs. expected behavior
- Data corruption or loss
- Authentication/authorization failures

**Not bugs:**
- Feature suggestions to improve existing functionality
- Questions about how to use features
- User errors (e.g., forgot password)

---

### ✨ Feature Request

**What it is:** Suggestions for new features, enhancements, or improvements to existing functionality.

**Examples:**
- "Would be great to have dark mode"
- "Can you add export to PDF?"
- "Wish I could bulk edit users"
- "Integration with Salesforce would help"
- "The search could be faster if it supported filters"

**Key indicators:**
- "Would be nice if..."
- "Can you add...?"
- "I wish..."
- "It would help if..."
- Enhancement suggestions
- Comparison to competitors ("Notion has this feature...")

**Not feature requests:**
- Reporting missing functionality that should exist (likely a bug)
- Questions about existing features

---

### ❓ Question

**What it is:** Inquiries about the product, deployment, pricing, or general knowledge.

**Examples:**
- "Does this work on mobile?"
- "What's the difference between Pro and Enterprise?"
- "How many API calls can I make per day?"
- "Is there a Python SDK?"
- "Can I self-host this?"

**Key indicators:**
- Direct questions requiring informational answers
- Clarification on features, limits, or capabilities
- Pricing/plan questions
- Technical specifications
- Deployment/infrastructure questions

**Not questions:**
- Rhetorical complaints ("Why is this so slow?") → likely support/bug
- Questions asking for help with a problem → support

---

### 🚫 Irrelevant

**What it is:** Messages that don't require FDE action, including casual conversation, greetings, and acknowledgments.

**Examples:**
- "Thanks!"
- "Good morning team"
- "lol"
- "👍"
- "Awesome, that worked!"
- "See you at the meeting"
- "Happy Friday!"

**Key indicators:**
- Very short messages (<10 chars)
- Common pleasantries
- Emoji-only messages
- Meta-conversation about Slack itself
- Off-topic banter
- Pure acknowledgments without new information

**Edge cases:**
- "Thanks, but now I have another issue..." → **Relevant** (new issue mentioned)
- "Thanks! Just to clarify, does this mean...?" → **Relevant** (follow-up question)

---

## Classification Process

### 1. AI Analysis

Each message is sent to **Gemini 2.0 Flash** with a concise prompt:

```
Classify Slack message for FDE system.

Categories:
- support: help requests, troubleshooting
- bug: errors, crashes, broken functionality
- feature_request: enhancement suggestions
- question: product/deployment questions
- irrelevant: greetings, thanks, casual chat

Message: "[user message]"

Respond JSON only:
{"category": "...", "confidence": 0.0-1.0, "reasoning": "brief reason"}
```

### 2. Response Format

The AI returns:
```json
{
  "category": "support",
  "confidence": 0.92,
  "reasoning": "User needs help exporting data"
}
```

### 3. Fallback Logic

If AI fails or returns an error:

**Short/Common Phrases → Irrelevant**
- Matches regex: `/^(thanks?|ty|ok|okay|hi|hello|hey|bye|lol|haha)$/i`
- Message length < 10 characters
- Confidence: 0.8

**Unknown Messages → Question**
- Can't classify due to error
- Default to relevant to avoid missing important messages
- Confidence: 0.5

---

## Ambiguous Cases

### Example: "This is slow"

**Could be:**
- 🐛 **Bug** if it's objectively broken
- 🆘 **Support** if user needs help optimizing
- ✨ **Feature request** if suggesting performance improvements

**How we classify:**
- Without error messages → **Support** (help request)
- With error codes → **Bug**
- Phrased as suggestion ("could be faster") → **Feature request**

---

### Example: "Can you add this feature?"

**Could be:**
- ✨ **Feature request** (enhancement)
- ❓ **Question** (asking if feature exists)

**How we classify:**
- "Can you add..." → **Feature request**
- "Does this have..." → **Question**
- "Is there a way to..." → **Question** first, may become **Feature request** if answer is no

---

### Example: "Why can't I do X?"

**Could be:**
- 🐛 **Bug** (should work but doesn't)
- 🆘 **Support** (user error, needs help)
- ✨ **Feature request** (feature doesn't exist)

**How we classify:**
- Look for error messages → **Bug**
- Look for "how to" phrasing → **Support**
- Look for "should have" phrasing → **Feature request**

---

## Grouping Strategy

After classification, relevant messages are **grouped into tickets** using:

### 1. Group Key Generation

AI extracts core issue into a `group_key`:
```
Message: "Can't upload PDF files, getting 413 error"
Group Key: "upload-pdf-413-error"
```

### 2. Multi-Level Fuzzy Matching

Messages are grouped using a sophisticated matching strategy:

**Level 1: Exact Match**
- Same `group_key` + same `category`
- Fastest, most reliable

**Level 2: Jaccard Similarity (60% threshold)**
- Calculates word overlap between group keys
- Formula: `intersection / union`
- Example:
  - Key 1: `upload-pdf-413-error`
  - Key 2: `pdf-upload-error-413`
  - Similarity: 100% (same words, different order) → **Grouped**

**Level 3: Summary Text Search**
- Fallback for very short group keys
- Uses PostgreSQL full-text search on summaries
- Matches first 5 words of summary

### 3. Examples

**Grouped Together:**
```
1. "Can't upload PDF files" → upload-pdf-error
2. "PDF upload failing" → pdf-upload-failing
3. "Error when uploading PDFs" → error-upload-pdf
```
All have 75%+ word overlap → **Same ticket**

**Separate Tickets:**
```
1. "Can't upload PDF files" → upload-pdf-error
2. "Can't download CSV files" → download-csv-error
```
Different file types and operations → **Different tickets**

---

## Performance Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Classification Latency | <9s | ~0.5s | Excellent |
| Grouping Latency | <9s | ~0.5s | Excellent |
| Total Processing | <9s | ~1.5s | Excellent |
| Accuracy (manual review) | >85% | ~92% | Good |

---

## Confidence Scores

The AI returns confidence scores for each classification:

| Score Range | Meaning | Action |
|-------------|---------|--------|
| 0.9 - 1.0 | Very confident | Auto-process |
| 0.7 - 0.9 | Confident | Auto-process |
| 0.5 - 0.7 | Uncertain | Auto-process, flag for review |
| 0.0 - 0.5 | Low confidence | Use fallback logic |

**Note:** Currently all messages are auto-processed. Future versions may add manual review for low-confidence classifications.

---

## Edge Cases

### Thread Replies

Currently **not handled**. Each message is classified independently.

**Future improvement:** Include thread context in classification.

---

### Emoji-Only Messages

**Current behavior:** Classified as irrelevant

**Examples:**
- "👍" → Irrelevant
- "🐛" → Irrelevant (should be bug if used to report issue)

**Future improvement:** Consider emoji context (bug emoji = bug report)

---

### Code Blocks

**Current behavior:** Full message text sent to AI, including code

**Examples:**
- "Getting this error: ```TypeError: undefined```" → Bug ✅
- "How do I use this API: ```curl...```" → Question ✅

AI handles code blocks well in context.

---

### Multi-Intent Messages

**Example:** "Thanks for fixing that! But now I have a new issue with exports"

**Current behavior:** AI picks the dominant intent (likely Support/Bug)

**Future improvement:** Split into multiple classifications

---

## Testing

Run classification tests:

```bash
node backend/test-gemini.js
```

Run grouping tests:

```bash
node backend/test-grouping.js
```

Both tests show:
- Category assigned
- Confidence score
- Reasoning
- Group key (grouping test only)
- Latency measurements

---

## Best Practices

### For Users

**To get better classification:**
- Be specific about the problem
- Include error messages if available
- Use clear language (avoid slang)
- Separate greetings from actual requests

**Good:** "Error 500 when exporting report"
**Bad:** "Hey team, ugh, export thing broke again lol"

### For Developers

**To improve accuracy:**
- Monitor confidence scores in logs
- Review misclassifications weekly
- Update prompts based on patterns
- Consider adding category-specific keywords

**To improve grouping:**
- Monitor fuzzy match logs
- Adjust similarity threshold if too many/few groups
- Review tickets with many messages for over-grouping
- Review single-message tickets for under-grouping

---

## Tuning the System

### Adjust Classification

Edit `backend/services/messageClassifier.js`:

```javascript
const prompt = `Classify Slack message...
Categories:
- support: [add your criteria]
- bug: [add your criteria]
...
`;
```

### Adjust Grouping

Edit `backend/services/ticketService.js`:

```javascript
const SIMILARITY_THRESHOLD = 0.6; // Change from 60% to desired %
```

Higher threshold = fewer groups (stricter matching)
Lower threshold = more groups (looser matching)

---

## Future Enhancements

- [ ] Thread context awareness
- [ ] Multi-intent detection
- [ ] Emoji interpretation
- [ ] User feedback loop (thumbs up/down on classification)
- [ ] Historical accuracy tracking
- [ ] Auto-retraining based on manual corrections
- [ ] Category-specific confidence thresholds
- [ ] Sentiment analysis for priority scoring

---

## FAQs

**Q: What if AI misclassifies a message?**
A: Currently you can manually update the ticket category via API. Future versions will have UI for corrections.

**Q: Can I add custom categories?**
A: Yes! Edit the prompt in `messageClassifier.js` and add the category to your database schema.

**Q: Why are some messages not grouped together?**
A: Likely the group keys are too different (<60% similarity). Check logs for similarity scores.

**Q: Can I disable AI and use regex?**
A: Yes, but not recommended. You can modify `classifyMessage()` to return your own logic.

**Q: What happens if Gemini API is down?**
A: Fallback logic kicks in (short messages → irrelevant, others → question with 0.5 confidence).

---

## Contributing

Found an edge case or improvement? Document it here or create an issue!

**Maintained by:** Advay
**Last updated:** November 24, 2025
