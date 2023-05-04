# Download Discord Emojis & Stickers

Node.js script to download all emojis and stickers for all servers that you have access to.

Inspired by https://github.com/ThaTiemsz/Discord-Emoji-Downloader

Kind of for advanced users only...

Pre-requisites

- Node.js 18.15+
- PNPM 8.4.0
- Getting your API `Authorization` header token from inspecting Discord API calls
    1. Open Discord
    2. Open dev tools
    3. Go to Network tab
    4. Filter by "XHR"
    5. Find out the "science" endpoint call
    6. At the "Request Header" section, "Authorization" entry, copy the value.

Steps:

1. Clone this repo
2. Install dependencies
   ```sh
   pnpm install --frozen-lockfile
   ```
3. Edit `app/auth.js`, replace the value of variable `AUTH_TOKEN` with your token.
   Looks something like this:
   ```js
   const AUTH_TOKEN = `XXXXXXXXXXXXXXXXXXXXXXXX.XXXXXX.XXXXXXXXXXXXXXXXX_XXXXXXXXXXXXXXXXXXXX`;
   ```
   **_IMPORTANT_**: This token is secret to you. Do not commit the file. Leaking this token may result in unauthorized access to your Discord account. Proceed with caution.
4. Run
   ```sh
   pnpm start
   ```

This script will:

1. Fetch list of servers that you belong to
2. Fetch list of emojis & stickers of those servers
3. Download those emojis & stickers to `output/` folder, organized by Servers

Example output:

```
output
├───Bocchi_The_Rock
│   ├───emojis
│   │       AikoSmug.png
│   │       Bocchi3HoursOfSleep.png
│   │       BocchiAngry.png
│   │       BocchiAngryDino.png
│   │       BocchiAvoid.gif
│   │       [and so on...]
│   └───stickers
│           BocchiCry.png
│           BocchiDefeated.png
│           BocchiDespair.png
│           BocchiDinoAttack.png
│           BocchiExhausted.png
│           BocchiExistentialCrisis.png
│           [and so on...]
│[and so on...]
```

Note that for stickers, `.png` extension is used if the sticker format is using the type "APNG" (Animated PNG)
