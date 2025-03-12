<picture>
  <source srcset="https://github.com/user-attachments/assets/fbf3f128-e0e6-4ff6-b05c-315521b89749" media="(prefers-color-scheme: dark)">
  <img src="https://github.com/user-attachments/assets/90aa081c-4cce-41fa-9c9b-03bd908a8b20" alt="Logo" width="200">
</picture>

# GitSage

An intelligent Git commit message generator powered by OpenAI's GPT-4. This tool analyzes your staged changes and automatically generates meaningful, conventional commit messages.

## Features

- 🤖 AI-powered commit message generation
- 📝 Conventional commit format support
- 🔍 Smart change analysis and grouping
- ✨ Interactive commit message selection
- 🛠️ Easy configuration and setup
- 🔄 Interactive fixup for commit amendments
- 📋 AI-powered PR content generation
- 🌿 Smart branch management
- 🔄 Automated push handling

## Quick Start

You can use gitsage directly without installation using npx:

```bash
npx gitsage
```

### Optional Installation

If you prefer, you can install the package globally:

```bash
npm install -g gitsage
```

## Configuration

Before using gitsage, you'll need to configure your OpenAI API key. The tool will prompt you for the key on first use, or you can set it up manually:

1. Get your API key from [OpenAI's platform](https://platform.openai.com/)
2. The tool will automatically store your API key securely for future use

## Usage

### Commit Management

1. (Optional) Stage your changes using git add:
```bash
git add <files>
```

2. Run gitsage:
```bash
gitsage commit
```

### Branch Management

Create a new branch or switch to an existing one:
```bash
gitsage branch <branch-title> [-t <type>]
```
Example:
```bash
gitsage branch new-feature -t feature
```

Push your current branch to remote:
```bash
gitsage push
```
This command handles:
- Setting up upstream tracking
- Handling force push scenarios
- Interactive confirmation for potentially destructive operations

### Other Commands

Rename a commit:
```bash
gitsage rename [commit-hash]
```

Add changes to a previous commit:
```bash
gitsage fixup
```

Generate PR content:
```bash
gitsage pr
```

```bash
gitsage
```

3. Review and confirm the generated commit messages

Note: If no changes are staged, gitsage will automatically help you select which files to stage through an interactive interface. This makes the staging process optional and more user-friendly.

### Using Branch Management

To create or switch to a branch with proper type prefix:

```bash
gitsage checkout <branch-name>
```

If no type is provided in the branch name (e.g., feature/my-branch), you'll be prompted to select one from:
- feature
- fix
- chore
- docs
- style
- refactor
- perf
- test

To push your current branch:

```bash
gitsage push
```

This will:
1. Push your changes to remote
2. Handle upstream branch creation if needed
3. Prompt for force push if remote has diverged

### Using Pull Request Generation

To generate a pull request with AI-powered content:

```bash
gitsage pr
```

This will:
1. Detect your Git platform (GitHub/Bitbucket)
2. Analyze the changes between your current branch and target branch
3. Generate a well-structured PR description including:
   - Title and description
   - Problem statement
   - Solution overview
   - List of changes
   - Testing details
4. Create the PR using the platform's CLI tool (gh/bb)

Requirements:
- GitHub CLI (gh) for GitHub repositories
- Bitbucket CLI (bb) for Bitbucket repositories

### Using Fixup

The fixup command helps you amend changes to a previous commit:

```bash
gitsage fixup
```

This will:
1. Show your current changes
2. Display a list of recent commits
3. Let you select a commit to fixup into
4. Create a fixup commit and automatically rebase

It's useful when you want to:
- Add forgotten changes to a previous commit
- Fix bugs in earlier commits
- Keep your commit history clean and organized

### Using Commit

To generate an AI-powered commit message for your changes:

```bash
gitsage commit
```

This will:
1. Analyze your staged changes (or help you stage them)
2. Generate meaningful commit messages based on the changes
3. Group related changes together
4. Let you select or modify the generated message
5. Create a conventional commit with the selected message

### Using Rename

To rename files with AI assistance:

```bash
gitsage rename
```

This will:
1. Analyze your selected files
2. Suggest meaningful names based on file content and context
3. Let you review and confirm the suggested names
4. Handle the file renaming and related git operations

Useful for:
- Organizing project files
- Making file names more descriptive
- Maintaining consistent naming conventions

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
3. Commit your changes using the tool itself! (`gitsage`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Powered by OpenAI's GPT-4
- Inspired by conventional commits
- Built with TypeScript and Node.js
