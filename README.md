# Karen CLI

> Sassy CSS layout auditor with AI-powered visual analysis

Karen CLI is a containerized CSS layout auditing tool that examines websites across multiple viewports, uses AI to detect visual and code-level issues, and generates actionable fix recommendations.

## Features

- 📱 **Multi-viewport Testing**: Test across mobile, tablet, desktop, and ultrawide screens
- 🤖 **AI-Powered Analysis**: Claude vision API for detecting visual layout issues
- ♿ **Accessibility Checks**: WCAG contrast ratio validation
- 📏 **Design System Enforcement**: Spacing scale, typescale, and color palette validation
- 🔧 **Auto-fix Suggestions**: Get code fixes for detected issues
- 🐳 **Containerized**: Run anywhere with Docker
- 📊 **Multiple Output Formats**: JSON and Markdown reports

## Installation

### From npm (Recommended)

```bash
# Using npm
npm install -g karen-cli

# Using pnpm
pnpm add -g karen-cli

# Using yarn
yarn global add karen-cli
```

### From source

```bash
git clone https://github.com/saharbarak/KarenCLI.git
cd KarenCLI/packages/karen-cli
pnpm install
pnpm build
```

### Environment Setup

Create a `.env` file with your Anthropic API key (required for AI analysis):

```bash
ANTHROPIC_API_KEY=sk-ant-api03-YOUR_KEY_HERE
```

## Usage

### CLI

```bash
# Basic audit
karen audit https://example.com

# With AI analysis
karen audit https://example.com --api-key sk-ant-xxx

# Custom config
karen audit https://example.com --config ./karen.config.js

# Custom output paths
karen audit https://example.com \
  --output ./results.json \
  --markdown ./REPORT.md
```

### Docker

```bash
# Build image
docker build -t karen-cli .

# Run audit
docker run \
  -e ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY} \
  -v $(pwd)/output:/app/output \
  karen-cli audit https://example.com \
  --output /app/output/tasks.json \
  --markdown /app/output/TASKS.md
```

## Configuration

Create a `karen.config.js` file:

```javascript
export default {
  spacingScale: [0, 4, 8, 12, 16, 24, 32, 48, 64],
  typescale: {
    base: 16,
    ratio: 1.25,
    sizes: [12, 14, 16, 20, 25, 31, 39, 49],
  },
  colorPalette: [
    '#F5E6D3',
    '#D4A574',
    '#8B7355',
  ],
  breakpoints: [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'desktop', width: 1440, height: 900 },
  ],
  failOn: ['critical', 'high'],
  features: ['overflow', 'spacing', 'typescale', 'accessibility'],
};
```

## License

MIT © Sahar Barak
