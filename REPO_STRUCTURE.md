# Repository Structure

## 📁 Clean Project Layout

```
geo-visiblity/
├── 📄 README.md                      # Main documentation
├── ⚙️  geo-visibility-config.toml    # All settings & prompts (human-readable)
├── 🔐 .env                           # API keys ONLY (not in git)
├── 📝 .env.example                   # API keys template
├── 🛠️  package.json                  # Dependencies
├── 📦 package-lock.json              # Locked dependencies
├── ⚙️  tsconfig.json                 # TypeScript config
├── 🔍 eslint.config.mjs              # Code quality rules
├── 🗑️  trash/                        # Moved old files here
├── 📂 src/                           # Source code
│   ├── cli.ts                        # Command-line interface
│   ├── config.ts                     # Configuration loader (reads TOML)
│   ├── types.ts                      # TypeScript type definitions
│   ├── excel-reader.ts               # Multi-language Excel parser
│   ├── openai-client.ts              # OpenAI API (with Responses API)
│   ├── gemini-client.ts              # Gemini API (with Google Search)
│   ├── processor.ts                  # Main processing logic
│   ├── output-writer.ts              # Console/file output
│   └── logger.ts                     # Debug/verbose logging
├── 📂 dist/                          # Compiled JavaScript (auto-generated)
└── 📂 node_modules/                  # Dependencies (auto-installed)
```

## 🎯 Key Files

### Configuration (What You Edit)
- **`geo-visibility-config.toml`** - All settings and prompts
- **`.env`** - API keys only (create from .env.example)

### Documentation
- **`README.md`** - Complete usage guide

### Code Quality
- **Strict TypeScript** - No `any` types without justification
- **ESLint** - Zero errors policy
- **DRY Principle** - No code duplication
- **Single Responsibility** - Each file has one clear purpose

## 🚀 Quick Start

1. **Install**: `npm install`
2. **Configure**: 
   - Copy `.env.example` to `.env` and add API keys
   - Edit `geo-visibility-config.toml` for settings
3. **Run**: `npm run dev -- process data.xlsx`

## 🗑️ Trash Contents

All test files, old scripts, and temporary results have been moved to `trash/`:
- Old results CSV files
- Test Excel files
- Original app-script.gs
- Test scripts
- Outdated documentation
