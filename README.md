# GitMind

An intelligent Git commit message generator powered by OpenAI's GPT-4. This tool analyzes your staged changes and automatically generates meaningful, conventional commit messages.

## Features

- 🤖 AI-powered commit message generation
- 📝 Conventional commit format support
- 🔍 Smart change analysis and grouping
- ✨ Interactive commit message selection
- 🛠️ Easy configuration and setup

## Quick Start

You can use gitmind directly without installation using npx:

```bash
npx gitmind
```

### Optional Installation

If you prefer, you can install the package globally:

```bash
npm install -g gitmind
```

## Configuration

Before using gitmind, you'll need to configure your OpenAI API key. The tool will prompt you for the key on first use, or you can set it up manually:

1. Get your API key from [OpenAI's platform](https://platform.openai.com/)
2. The tool will automatically store your API key securely for future use

## Usage

1. Stage your changes using git add:
```bash
git add <files>
```

2. Run gitmind:
```bash
gitmind
```

3. Review and confirm the generated commit messages

If no changes are staged, the tool will help you select files to stage before generating commit messages.

## How It Works

1. Analyzes staged Git changes
2. Splits large diffs into manageable chunks
3. Uses GPT-4 to analyze changes and generate appropriate commit messages
4. Groups related changes together
5. Presents commit suggestions for your approval
6. Creates commits using conventional commit format

## Commit Types

The tool generates commits following the conventional commits specification:

- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes using the tool itself! (`gitmind`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Powered by OpenAI's GPT-4
- Inspired by conventional commits
- Built with TypeScript and Node.js
