# Contributing to Full Functional Bot

Thank you for considering contributing to the Full Functional Bot! This document outlines the guidelines for contributing to this project.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## How to Contribute

1. **Fork the Repository**
   - Create your own fork of the repository

2. **Create a Branch**
   - Create a branch with a descriptive name related to your contribution
   - Example: `feature/new-command` or `fix/issue-123`

3. **Make Your Changes**
   - Implement your feature or bug fix
   - Make sure your code follows the existing style
   - Keep your code clean and well-documented

4. **Test Your Changes**
   - Ensure your code works as expected
   - Test new commands thoroughly
   - Check for any unintended side effects

5. **Commit Your Changes**
   - Use clear, descriptive commit messages
   - Reference issues or feature requests in your commit messages when applicable

6. **Submit a Pull Request**
   - Push your changes to your fork
   - Submit a pull request from your branch to the main repository
   - Provide a clear description of the changes in your pull request
   - Link any relevant issues

## Development Setup

1. Clone the repository and install dependencies:
   ```
   git clone https://github.com/yourusername/full-functional-bot.git
   cd full-functional-bot
   npm install
   ```

2. Create a `.env` file with required environment variables (see `.env.example`)

3. Create a `config.json` file (see `config.json.example`)

4. Run the bot in development mode:
   ```
   npm run dev
   ```

## Adding New Commands

When adding new commands:

1. Create a new file in the appropriate directory:
   - Text commands: `commands/`
   - Slash commands: `slashCommands/`
   - Button handlers: `buttons/`

2. Follow the existing command structure

3. Document your command in the code with comments

4. Update the README.md if necessary

## Style Guidelines

- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused on a single task
- Use async/await for asynchronous operations
- Format code consistently

## Pull Request Process

1. Update documentation if needed
2. Ensure all tests pass
3. Get approval from at least one maintainer
4. Your pull request will be merged once approved

Thank you for your contributions! 