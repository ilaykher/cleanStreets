# CleanStreet

## Run locally in VS Code

### Requirements

- [Node.js 22](https://nodejs.org/) (the project is configured for Node 22)
- [pnpm 10](https://pnpm.io/installation)
- Visual Studio Code

### First-time setup

1. Open VS Code.
2. Select **File → Open Folder…** and choose the `cleanStreet` project folder.
3. Open the integrated terminal with **Terminal → New Terminal** (or press **Ctrl+`**).
4. Confirm the terminal is at the project root, where `package.json` is located.
5. Install dependencies:

   ```bash
   pnpm install
   ```

6. The project folder includes a local `.env` file. Keep it in the project root. Do not share or commit its values. The app has a default ping message if `PING_MESSAGE` is not set.

### Start the development app

1. In the VS Code terminal, run:

   ```bash
   pnpm dev
   ```

2. Wait for Vite to report that the server is ready.
3. Open [http://localhost:8080](http://localhost:8080) in your browser.
4. Leave the terminal running while you use the app. Press **Ctrl+C** in that terminal to stop it.

The development server serves the React app and Express API on the same port. The API includes `GET /api/ping` and `GET /api/demo`.

### Common commands

Run these from the VS Code terminal at the project root:

| Command | What it does |
| --- | --- |
| `pnpm dev` | Starts the local Vite development server with the Express API. |
| `pnpm typecheck` | Checks TypeScript types. |
| `pnpm test` | Runs the Vitest test suite once. |
| `pnpm build` | Builds the frontend and production server into `dist/`. |
| `pnpm start` | Starts the production server after `pnpm build`. |

### Troubleshooting

- **`pnpm` is not recognized:** install pnpm, then close and reopen the VS Code terminal.
- **Port 8080 is already in use:** stop the other process using that port, then run `pnpm dev` again.
- **Dependencies seem missing:** run `pnpm install` from the folder containing `package.json`.
- **App changes are not appearing:** check that `pnpm dev` is still running and refresh the browser.

The app currently has no database setup configured in the project files inspected for these instructions.
