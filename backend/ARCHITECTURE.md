# Backend Architecture

```
backend/
├── index.js                 # Application entry point
├── config/                  # Configuration management
│   └── index.js            # Environment variables & config
├── controllers/             # Request handlers
│   └── slackController.js  # Slack event handling logic
├── services/                # Business logic
│   └── messageClassifier.js # FDE message classification
├── middleware/              # Express middleware
│   └── slackVerification.js # Slack request verification
└── routes/                  # API routes
    └── slack.js            # Slack event endpoints
```

### `controllers/slackController.js`
Handles Slack events:
- URL verification challenges
- Message event processing
- Asynchronous event handling (responds to Slack within 3s)

### `services/messageClassifier.js`
Core classification logic:
- Pattern-based message analysis
- Relevance determination
- Category assignment with confidence scores

### `middleware/slackVerification.js`
Request validation:
- Validates Slack request structure
- TODO: Add signature verification for production