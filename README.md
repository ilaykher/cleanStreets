# CleanStreet

## Run locally in VS Code

### Requirements

- [Node.js](https://nodejs.org/) — install the LTS version
- [pnpm](https://pnpm.io/installation)
- Visual Studio Code
- Git, for pushing changes to GitHub

### First-time setup

1. Open VS Code.
2. Select **File → Open Folder…** and choose the `cleanStreet` project folder.
3. Open the integrated terminal with **Terminal → New Terminal** (or press **Ctrl+`**).
4. Confirm the terminal is at the project root, where `package.json` is located:

   ```bash
   dir
   ```

5. Check that Node.js and npm are installed:

   ```bash
   node --version
   npm --version
   ```

6. Install pnpm if it is not already installed:

   ```bash
   npm install -g pnpm
   ```

7. Confirm pnpm is installed:

   ```bash
   pnpm --version
   ```

8. Install the project dependencies:

   ```bash
   pnpm install
   ```

9. The project folder includes a local `.env` file. Keep it in the project root. Do not share or commit its values. The app has a default ping message if `PING_MESSAGE` is not set.

### Start the development app

1. In the VS Code terminal, run:

   ```bash
   pnpm dev
   ```

2. Wait for Vite to report that the server is ready.
3. Open [http://localhost:8080](http://localhost:8080) in your browser.