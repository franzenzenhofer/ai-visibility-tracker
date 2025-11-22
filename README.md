# 🔍 AI Visibility Tracker

**Professional command-line tool for tracking domain visibility across AI search engines**

Track how your domain appears in AI-powered search results from **GPT-5-mini** and **Gemini 2.5 Flash** - with and without web search capabilities.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)
![License](https://img.shields.io/badge/license-ISC-green.svg)

---

## ✨ Features

### 🎯 4-Way Matrix Analysis
- **GPT-5-mini WITHOUT web search** - Pure model knowledge
- **GPT-5-mini WITH web search** - ✅ REAL web search via Responses API
- **Gemini 2.5 Flash WITHOUT Google Search** - Pure model knowledge
- **Gemini 2.5 Flash WITH Google Search** - ✅ REAL Google Search grounding

### 🔍 Professional Features
- ⚡ **Multi-language Excel support** - Auto-detects columns in any language
- 🌍 **Location context** - Prompts include geographic context ("Hey, I am from Vienna...")
- 📊 **Complete transparency** - Shows ALL URLs from each response, not just matches
- 🎨 **Color-coded output** - Target domain highlighted in green
- ⏱️  **Timing information** - See how long each API call takes (in debug mode)
- 📈 **Visibility summary** - Detailed breakdown with percentages
- 💾 **Export options** - CSV or Excel output
- 🔧 **100% configurable** - All settings and prompts in TOML config file

---

## 🚀 Quick Start

### 1. Installation

```bash
cd geo-visiblity
npm install
npm run build
```

### 2. Configuration

#### Step 1: API Keys (.env file)

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```env
# OpenAI API Key (get from: https://platform.openai.com/api-keys)
OPENAI_API_KEY=your_openai_key_here

# Google Gemini API Key (get from: https://makersuite.google.com/app/apikey)
GEMINI_API_KEY=your_gemini_key_here
```

#### Step 2: Settings (geo-visibility-config.toml file)

Edit `geo-visibility-config.toml` to customize:

```toml
# Target domain to track
target_domain = "example.com"

# User location (MOST IMPORTANT! Provides geographic context)
user_location = "Vienna, Austria"

# AI models to use
model_openai = "gpt-5-mini"
model_gemini = "gemini-2.5-flash"

# All prompts are also in this file - fully customizable!
```

### 3. Prepare Your Data

Export queries from Google Search Console as an Excel file. The tool will auto-detect the query column regardless of language:
- `Top queries` (English)
- `Suchanfrage` (German)
- `Query` (various)
- `Keyword` (various)
- And more...

**Sample Data:** A sample GSC export file is provided in `sampledata/sample-gsc-export.xlsx` for testing.

### 4. Run Analysis

```bash
# Basic usage (3 queries, console output only)
npm run dev -- process your-gsc-export.xlsx

# Process 10 queries
npm run dev -- process your-gsc-export.xlsx -n 10

# Save results to directory
npm run dev -- process your-gsc-export.xlsx -n 10 -o results/

# Export as Excel
npm run dev -- process your-gsc-export.xlsx -f xlsx -o results/

# Verbose mode (shows all requests, responses, and timing)
npm run dev -- process your-gsc-export.xlsx --debug
```

---

## 📖 CLI Commands

### `process <input-file>`

Process queries from an Excel file and analyze AI visibility.

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output-dir <directory>` | Save results to directory (optional) | Console only |
| `-f, --format <format>` | Output format: `csv` or `xlsx` | `csv` |
| `-d, --domain <domain>` | Target domain to track | From config |
| `-l, --location <location>` | User location | From config |
| `--language <lang>` | Language for persona prompts (ISO 639-1: en, de, es, fr, etc.) | From config |
| `--skip <lines>` | Skip first N lines from Excel file | `0` |
| `--count <number>` | Number of queries to process | `3` |
| `-n, --limit <count>` | DEPRECATED: Use --count instead | `0` |
| `--model-openai <model>` | OpenAI model to use | From config |
| `--model-gemini <model>` | Gemini model to use | From config |
| `--debug` | Enable verbose mode (show all requests/responses + timing) | `false` |

**Examples:**

```bash
# Basic usage with defaults (first 3 queries)
npm run dev -- process data.xlsx

# Process 50 queries with debug logging
npm run dev -- process data.xlsx --count 50 --debug

# Custom domain and location
npm run dev -- process data.xlsx -d example.com -l "Berlin, Germany"

# German language persona prompts
npm run dev -- process data.xlsx --language de

# Skip first 100 lines, process next 10
npm run dev -- process data.xlsx --skip 100 --count 10

# Export to Excel in results directory
npm run dev -- process data.xlsx --count 100 -f xlsx -o results/

# Override models
npm run dev -- process data.xlsx --model-openai gpt-5 --model-gemini gemini-1.5-flash

# Full control with all parameters
npm run dev -- process data.xlsx \
  -d mysite.com \
  -l "London, UK" \
  --language de \
  --skip 56 \
  --count 100 \
  -o results/ \
  -f xlsx \
  --debug
```

### `config`

Show current configuration from files.

```bash
npm run dev -- config
```

---

## 📊 Output Format

### Console Output (Default)

Beautiful color-coded terminal output showing:
- Query and persona prompt
- Visibility status (VISIBLE ✅ / TOOL-ONLY ⚠️ / INVISIBLE ❌ / ERROR ⛔)
- ALL URLs from each variant (target domain in **green**)
- Complete visibility summary with percentages

### File Output (Optional)

When using `-o` flag, results are saved with the following columns:

| Column | Description |
|--------|-------------|
| Original Query | The keyword from your input file |
| Persona Prompt | AI-generated natural language question |
| Status | `VISIBLE`, `INVISIBLE`, `TOOL-ONLY`, or `ERROR` |
| GPT Rank | Ranking in GPT without tools (`-` if not found) |
| GPT URL | URL from GPT without tools |
| GPT Rank (Web) | Ranking in GPT with web search |
| GPT URL (Web) | URL from GPT with web search |
| Gemini Rank | Ranking in Gemini without grounding |
| Gemini URL | URL from Gemini without grounding |
| Gemini Rank (Web) | Ranking in Gemini with Google Search |
| Gemini URL (Web) | URL from Gemini with Google Search |

**Status Definitions:**

- ✅ **VISIBLE**: Domain found in model knowledge (without web search)
- ⚠️  **TOOL-ONLY**: Domain only visible when using web search/grounding
- ❌ **INVISIBLE**: Domain not found in any variant
- ⛔ **ERROR**: API or processing error occurred

---

## ⚙️ Configuration Files

### `.env` - API Keys (Secrets)

Contains ONLY API keys. Never commit to Git.

```env
OPENAI_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
```

### `geo-visibility-config.toml` - All Settings & Prompts

Human-readable TOML configuration containing:

**Settings:**
- `target_domain` - Domain to track
- `user_location` - Geographic context (CRITICAL!)
- `model_openai` - OpenAI model name
- `model_gemini` - Gemini model name

**Prompts (All Customizable):**
- `persona_system` - Converts keywords to natural questions
- `search_openai_no_tools_system` - GPT search without web
- `search_openai_with_tools_system` - GPT search with web
- `search_gemini_no_grounding` - Gemini without Google Search
- `search_gemini_with_grounding` - Gemini with Google Search

**Placeholders:**
- `{location}` - Replaced with `user_location`
- `{query}` - Replaced with the actual query

**Example:**

```toml
[prompts]
persona_system = """Context: The user is from {location}.
Task: Rewrite the keyword into a natural, conversational question.
Format: "Hey, I am from {location} and I want to know: [question]"
..."""
```

See the full `geo-visibility-config.toml` file for all prompts and detailed documentation.

---

## 🐛 Debug Mode

Enable verbose mode to see **everything** in the terminal:

```bash
npm run dev -- process data.xlsx --debug
```

**Debug Output Includes:**

- 📤 Full request prompts sent to each AI model
- 📥 Complete responses from each API
- ⏱️  **Timing information** - How long each API call takes
- ⚙️  Configuration options (tools, grounding, etc.)
- ❌ Detailed error messages with stack traces

**Example Debug Output:**

```
================================================================================
📤 REQUEST TO OPENAI PERSONA [gpt-5-mini]
================================================================================
PROMPT:
System: You are helping convert search keywords...
User: pizza aktion
================================================================================

================================================================================
📥 RESPONSE FROM OPENAI PERSONA [SUCCESS]
⏱️  Time: 1234ms
================================================================================
RESPONSE:
Hey, I am from Vienna, Austria and I want to know: Are there any pizza promotions...
================================================================================
```

---

## 🏗️ Project Structure

```
geo-visiblity/
├── 📄 README.md                      # This file
├── ⚙️  geo-visibility-config.toml    # All settings & prompts
├── 🔐 .env                           # API keys (not in git)
├── 📝 .env.example                   # API keys template
├── 🛠️  package.json                  # Dependencies
├── ⚙️  tsconfig.json                 # TypeScript config
├── 🔍 eslint.config.mjs              # Code quality rules
├── 📂 src/                           # Source code
│   ├── cli.ts                        # Command-line interface
│   ├── config.ts                     # Config loader (TOML)
│   ├── types.ts                      # TypeScript types
│   ├── excel-reader.ts               # Multi-language Excel parser
│   ├── openai-client.ts              # OpenAI API (Responses API)
│   ├── gemini-client.ts              # Gemini API (Google Search)
│   ├── processor.ts                  # Main processing logic
│   ├── output-writer.ts              # Console/file output
│   └── logger.ts                     # Debug/verbose logging
├── 📂 dist/                          # Compiled JavaScript
└── 📂 node_modules/                  # Dependencies
```

---

## 🔧 Development

### Scripts

```bash
# Build TypeScript
npm run build

# Run in development mode
npm run dev -- <command>

# Type checking
npm run typecheck

# Linting
npm run lint

# Fix linting issues
npm run lint:fix
```

### Code Quality

- **TypeScript** with `strict: true`
- **ESLint** with TypeScript rules
- **Zero errors** policy
- **DRY principle** - No code duplication
- **Type safety** throughout

---

## 🔬 Technical Details

### API Models Used

**OpenAI:**
- Model: `gpt-5-mini` (default, cheapest, fastest)
- Other supported: `gpt-5`, `o4-mini`, `gpt-5-nano`
- ✅ **REAL WEB SEARCH**: Uses Responses API with `web_search` tool
- "With Tools" variant performs ACTUAL web searches

**Google Gemini:**
- Model: `gemini-2.5-flash` (default)
- Other supported: `gemini-1.5-flash`
- Temperature: 0.2
- ✅ **REAL WEB SEARCH**: Google Search grounding via `googleSearch` tool
- "With Grounding" variant performs ACTUAL web searches via Google

### Processing Flow

1. **Read Excel** - Parse GSC export file (auto-detect language)
2. **Generate Persona** - Convert keyword to natural question using GPT
3. **Matrix Query** - Send to 4 variants simultaneously:
   - OpenAI without tools (pure model knowledge)
   - ✅ OpenAI with web search (REAL web search via Responses API)
   - Gemini without grounding (pure model knowledge)
   - ✅ Gemini with Google Search grounding (REAL web search)
4. **Analyze Results** - Check for target domain presence
5. **Determine Status** - Visible, Invisible, or Tool-Only
6. **Display/Export** - Show in terminal and/or save to file

**✅ BOTH APIs USE REAL WEB SEARCH:**
- OpenAI: Uses Responses API with `web_search` tool (REAL web search)
- Gemini: Uses `googleSearch` tool (REAL web search)
- No simulation - all web searches are authentic

### Rate Limiting

- 500ms delay between queries
- Concurrent API calls within each query (all 4 variants in parallel)
- Graceful error handling for rate limits

---

## 🛠️ Troubleshooting

### API Errors

**"Config file not found"**
- Ensure `geo-visibility-config.toml` exists in project root
- Check file name spelling

**"API key not found"**
- Check `.env` file exists (copy from `.env.example`)
- Verify API keys are correct
- Ensure no extra spaces in API keys

### Model Errors

**Gemini model not found (404)**
- Ensure you're using `gemini-2.5-flash` or `gemini-1.5-flash`
- Check your API key has access to this model

**OpenAI model not found**
- Verify your API key has access to `gpt-5-mini`
- Check your OpenAI plan/quota

### Rate Limits

If you hit rate limits:
- Use `--count` to process fewer queries at a time
- Add longer delays (modify `src/processor.ts`)
- Process in smaller batches

### Excel File Issues

**"Could not detect query column"**
- Verify Excel file has a recognizable header
- Check the Excel sheet isn't empty
- Try manually specifying headers in `src/config.ts` → `GSC_HEADERS`

---

## 📈 Best Practices

### Location is Critical

The `user_location` setting is the **most important** configuration:

```toml
user_location = "Vienna, Austria"  # ✅ Good
user_location = "New York, USA"    # ✅ Good
user_location = "London, UK"       # ✅ Good
```

This provides crucial geographic context to AI models, resulting in:
- More relevant local results
- Better understanding of user intent
- Accurate visibility testing for your market

### Prompt Customization

All prompts are in `geo-visibility-config.toml`. Edit them to:
- Change the persona style
- Adjust result formatting
- Add specific instructions
- Test different approaches

### Processing Limits

Start small and scale up:

```bash
# Test with 3 queries first
npm run dev -- process data.xlsx

# Then 10 queries
npm run dev -- process data.xlsx -n 10

# Finally full run
npm run dev -- process data.xlsx -n 1000 -o results/
```

---

## 📝 License

ISC

---

## 👤 Author

Franz Enzenhofer

---

## 🆘 Support

For issues or questions:
1. Check debug output with `--debug` flag
2. Review API error messages
3. Verify `.env` and `geo-visibility-config.toml` configuration
4. Ensure Excel file has correct format

---

## 🎯 Key Improvements Over Original

1. ✅ **Separated configuration** - API keys in .env, settings in TOML
2. ✅ **Real web search** - Both OpenAI and Gemini use actual web search
3. ✅ **Multi-language support** - Auto-detects columns in any language
4. ✅ **Complete transparency** - Shows ALL URLs, not just matches
5. ✅ **Location context** - Prompts include geographic information
6. ✅ **Timing information** - See how long each API call takes
7. ✅ **Visibility summary** - Detailed breakdown with percentages
8. ✅ **Domain normalization** - Consistent domain formatting
9. ✅ **Professional output** - Color-coded, well-formatted results
10. ✅ **100% configurable** - All prompts and settings in config files

---

**Built with TypeScript, OpenAI Responses API, and Google Gemini API**
