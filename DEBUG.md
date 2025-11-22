# 🐛 Debug Mode Documentation

## Overview
The AI Visibility Tracker now includes a comprehensive **always-on debug mode** that provides real-time visibility into all operations, errors, and events.

**Live URL**: https://ai-visibility-by-gsc-export.franzai.com

## Features

### 1. **Always-Visible Debug Panel** (Right Side)
- **Real-time log streaming**: See every request, response, SSE event, and error as it happens
- **Color-coded log levels**:
  - 🔵 **INFO** (Blue): General information and status updates
  - 🔴 **ERROR** (Red): Errors and failures
  - 🟢 **REQUEST** (Green): Outgoing API requests
  - 🟣 **RESPONSE** (Purple): API responses
  - 🟣 **SSE** (Purple): Server-Sent Events from streaming API

### 2. **Logger Reuses CLI Pattern** (DRY Principle)
The browser logger is based on the same pattern as `src/logger.ts`:
- Timestamps for every event
- Structured logging with data payloads
- Service tracking (detect, process)
- JSON formatting for complex objects

**Location**: `workers/utils/browser-logger.ts` (40 lines, compliant with ≤75 rule)

### 3. **Comprehensive Event Tracking**

#### File Operations
```
[21:30:15.234] INFO
📁 File selected: sample-gsc-export.xlsx (142.56 KB)
```

#### API Requests
```
[21:30:20.567] REQUEST
📤 POSTing to /api/process
{
  "file": "sample-gsc-export.xlsx",
  "domain": "marktguru.at",
  "location": "Vienna, Austria",
  "limit": "3"
}
```

#### API Responses
```
[21:30:21.123] RESPONSE
📥 SSE connection opened (200)
```

#### SSE Events
```
[21:30:21.456] SSE
📨 SSE event
{"type":"init","data":{"total":3},"timestamp":1234567890}
```

#### Errors
```
[21:30:25.789] ERROR
❌ HTTP 401: Unauthorized
401 Incorrect API key provided...
```

### 4. **Real-Time Statistics**
Three counters track processing results:
- **VISIBLE**: Queries where domain appears in results
- **INVISIBLE**: Queries where domain doesn't appear
- **ERRORS**: Failed queries

### 5. **Copy-to-Clipboard Functionality**
- **📋 Copy** button: Copies all logs as formatted text with timestamps
- **🗑️ Clear** button: Clears the log panel (useful for long sessions)

Format when copied:
```
[2025-11-22T21:30:15.234Z] INFO: 🚀 App initialized

[2025-11-22T21:30:20.567Z] REQUEST: 📤 POSTing to /api/process
{
  "file": "sample-gsc-export.xlsx",
  "domain": "marktguru.at",
  "location": "Vienna, Austria",
  "limit": "3"
}
```

### 6. **Dark Theme (VS Code Style)**
- Monospace font for better log readability
- Color-coded syntax highlighting
- Sticky debug panel (stays visible while scrolling)
- Auto-scroll to latest log entry

## Usage

### Basic Workflow
1. **Open** https://ai-visibility-by-gsc-export.franzai.com
2. **Upload** your GSC export file → See file info in debug log
3. **Enter API keys** → Keys saved notification appears
4. **Click "Auto-Detect"** → Watch API request/response in real-time
5. **Click "Start Processing"** → See every SSE event, query, and result

### When Things Go Wrong
The debug panel shows EXACTLY what's failing:

#### Example 1: Missing API Key
```
[21:30:25.789] ERROR
❌ Auto-detection failed
"API key required"
```

#### Example 2: Invalid API Key
```
[21:30:30.123] ERROR
❌ HTTP 401: Unauthorized
401 Incorrect API key provided: sk-proj-***...
```

#### Example 3: Network Error
```
[21:30:35.456] ERROR
❌ Processing error
Failed to fetch
```

#### Example 4: SSE Parsing Error
```
[21:30:40.789] ERROR
❌ Failed to parse SSE event
Unexpected token } in JSON at position 123
```

### Debugging SSE Streaming Issues

The logger shows **every SSE event** received from the server:

```
[21:31:00.000] SSE: 📨 SSE event
{"type":"init","data":{"total":3},"timestamp":1234567890}

[21:31:01.000] SSE: 📨 SSE event
{"type":"query_start","data":{"index":0,"query":"best seo tools"}}

[21:31:02.000] SSE: 📨 SSE event
{"type":"step","data":{"step":"persona","result":"User searching for SEO tools..."}}

[21:31:03.000] SSE: 📨 SSE event
{"type":"step","data":{"step":"gpt_no_tools","urls":["https://example.com"]}}

[21:31:04.000] SSE: 📨 SSE event
{"type":"query_complete","data":{"originalQuery":"best seo tools","status":"VISIBLE",...}}

[21:31:05.000] SSE: 📨 SSE event
{"type":"progress","data":{"current":1,"total":3}}
```

This allows you to:
1. Verify SSE connection is established
2. See exactly what data the server is sending
3. Identify where parsing fails
4. Spot missing or malformed events
5. Debug timing issues

## Architecture

### Code Reuse (DRY Principle)
The debug system reuses the CLI's logging pattern from `src/logger.ts`:

**CLI Logger** (`src/logger.ts`):
```typescript
export class Logger {
  logRequest(service: string, model: string, prompt: string): void
  logResponse(service: string, status: string, response: string): void
  logError(service: string, error: Error): void
}
```

**Browser Logger** (`workers/utils/browser-logger.ts`):
```typescript
export interface LogEntry {
  timestamp: number;
  level: 'info' | 'error' | 'request' | 'response' | 'sse';
  service?: string;
  message: string;
  data?: unknown;
}

export class BrowserLogger {
  log(level, message, data, service): void
  getLogs(): LogEntry[]
  clear(): void
}
```

**Frontend Implementation** (inline in `index.html`):
```javascript
const logger = {
  logs: [],
  log(level, message, data = null, service = null) {
    // Reuses same structure as BrowserLogger
  }
}
```

All three use the same conceptual model:
- Timestamped entries
- Structured data payloads
- Service/context tracking
- Clear separation of log levels

### File Organization
```
workers/
├── utils/
│   └── browser-logger.ts (40 lines) - TypeScript logger interface
└── static/
    └── index.html (380 lines) - Includes inline logger implementation

src/
└── logger.ts (120 lines) - Original CLI logger (reference implementation)
```

## Best Practices

### For Users
1. **Keep debug panel visible** while diagnosing issues
2. **Copy logs** before clearing to preserve error context
3. **Check timestamps** to understand event sequencing
4. **Look for error patterns** (e.g., repeated 401s = bad API key)

### For Developers
1. **Always log requests before sending** - captures request state even if network fails
2. **Log responses with status codes** - distinguish between 200, 4xx, 5xx
3. **Log raw SSE data before parsing** - catches malformed JSON
4. **Include data payloads** - easier to debug than just messages
5. **Use appropriate log levels** - makes scanning logs faster

## Common Issues & Solutions

| Symptom | Debug Log Shows | Solution |
|---------|----------------|----------|
| Stuck at "Processing..." | No SSE events after connection | Check server logs, verify SSE endpoint |
| 404 on favicon | ERROR: Failed to load /favicon.ico:1 | Harmless, browser requesting icon |
| No progress updates | SSE events arrive but no 'progress' type | Check SSE event handlers |
| Empty results | query_complete with status="ERROR" | Check API key validity, rate limits |
| Connection drops | SSE stream ends unexpectedly | Check Worker timeout limits (CPU_MS) |

## Future Enhancements

Potential additions:
- [ ] Export logs as JSON file
- [ ] Filter logs by level (show only errors)
- [ ] Search/filter logs
- [ ] Performance metrics (request duration)
- [ ] Network request replay
- [ ] WebSocket debugging (if migrating from SSE)

## Technical Details

### SSE Event Format
All events follow this structure:
```
data: {"type":"EVENT_TYPE","data":{...},"timestamp":1234567890}\n\n
```

Event types:
- `init` - Processing started (total queries)
- `query_start` - Query processing begins
- `step` - Individual step complete (persona, gpt_no_tools, etc.)
- `progress` - Overall progress update
- `query_complete` - Query fully processed
- `complete` - All queries done
- `error` - Error occurred

### Browser Compatibility
- Modern browsers (Chrome 90+, Firefox 88+, Safari 14+)
- Requires `fetch()`, `ReadableStream`, `TextDecoder`
- LocalStorage for API key persistence
- Clipboard API for copy functionality

---

**Last Updated**: 2025-11-22
**Version**: 1.1.0 (Debug Mode)
