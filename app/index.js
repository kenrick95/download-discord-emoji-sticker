import { AUTH_TOKEN } from './auth.js'
import fetch from 'node-fetch';
import pLimit from 'p-limit';
import { mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createWriteStream, existsSync } from 'fs';
import { pipeline } from 'stream/promises';

const limit = pLimit(5);
const __dirname = dirname(fileURLToPath(import.meta.url));
const TARGET_FOLDER = join(__dirname, '..', 'output');

if (!AUTH_TOKEN) {
  throw new Error('Please provide auth token at auth.js');
}

/**
 *
 * @param {string} method
 * @param {string} pathname
 * @param {Record<string, any>=} [body]
 */
async function req(method, pathname, body) {
  const res = await fetch(`https://discord.com/api/v9${pathname}`, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/112.0',
      Accept: '*/*',
      'Accept-Language': 'en-US',
      'Content-Type': 'application/json',
      Authorization: AUTH_TOKEN,
    },
    method,
    body,
  });
  return {
    meta: {
      ok: res.ok,
      status: res.status,
    },
    data: await res.json(),
  };
}

/**
 *
 */
async function getGuilds() {
  return /** @type {Promise<{ meta: { ok: boolean, status: number }, data: Array<{id:string,name:string }>}>} */ (
    req('GET', `/users/@me/guilds`)
  );
}

/**
 *
 * @param {string} guildId
 */
async function getGuild(guildId) {
  return /** @type {Promise<{ meta: { ok: boolean, status: number }, data: { id: string, name:string, emojis: Array<{ name:string, id: string, animated: boolean }>, stickers: Array<{ name:string, id: string, type: number, format_type: number, tags: string, description: string }>} } >} */ (
    req('GET', `/guilds/${guildId}`)
  );
}

/**
 *
 * @param {string} emojiId
 * @param {boolean} isAnimated
 */
function getEmojiUrl(emojiId, isAnimated) {
  return `https://cdn.discordapp.com/emojis/${emojiId}.${getEmojiExtension(
    isAnimated
  )}?v=1`;
}

/**
 *
 * @param {boolean} isAnimated
 */
function getEmojiExtension(isAnimated) {
  return `${isAnimated ? 'gif' : 'png'}`;
}

/**
 *
 * @param {string} stickerId
 * @param {number} formatType 1 = png, 2 = apng, 3 = lottie, 4 = gif. https://discord.com/developers/docs/resources/sticker#sticker-object-sticker-format-types
 */
function getStickerUrl(stickerId, formatType) {
  return `https://cdn.discordapp.com/stickers/${stickerId}.${getStickerExtension(
    formatType
  )}?v=1`;
}

/**
 *
 * @param {number} formatType 1 = png, 2 = apng, 3 = lottie, 4 = gif. https://discord.com/developers/docs/resources/sticker#sticker-object-sticker-format-types
 */
function getStickerExtension(formatType) {
  return `${formatType === 4 ? 'gif' : formatType === 3 ? 'json' : 'png'}`;
}

async function main() {
  const guildsRes = await getGuilds();
  if (!guildsRes.meta.ok || !guildsRes.data) {
    return;
  }
  const guildIds = [];
  if (Array.isArray(guildsRes.data)) {
    for (const guild of guildsRes.data) {
      const guildId = guild.id;
      if (guildId) {
        guildIds.push(guildId);
      }
    }
  }
  console.log('guildIds', guildIds);
  const guildPromises = [];
  for (const guildId of guildIds) {
    guildPromises.push(limit(() => getGuild(guildId)));
  }
  const guildResponses = await Promise.all(guildPromises);

  for (const guildRes of guildResponses) {
    if (guildRes.meta.ok && guildRes.data) {
      processGuild(guildRes.data);
    }
  }
}

/**
 *
 * @param {string} name
 * @returns {string}
 */
function clean(name) {
  return name.replace(/\s/g, '_').replace(/\W/g, '');
}
/**
 *
 * @param {{ id: string, name:string, emojis: Array<{ name:string, id: string, animated: boolean }>, stickers: Array<{ name:string, id: string, type: number, format_type: number, tags: string, description: string }>}} guildData
 */
async function processGuild({ id, name, emojis, stickers }) {
  console.log(`Processing guild ${name}`);
  const promises = [];
  for (const emoji of emojis) {
    promises.push(
      limit(() => {
        return download(
          getEmojiUrl(emoji.id, emoji.animated),
          join(TARGET_FOLDER, clean(name), 'emojis'),
          clean(emoji.name) + `.${getEmojiExtension(emoji.animated)}`
        );
      })
    );
  }
  for (const sticker of stickers) {
    promises.push(
      limit(() => {
        return download(
          getStickerUrl(sticker.id, sticker.format_type),
          join(TARGET_FOLDER, clean(name), 'stickers'),
          clean(sticker.name) + `.${getStickerExtension(sticker.format_type)}`
        );
      })
    );
  }
  await Promise.all(promises);
}

/**
 *
 * @param {string} url
 * @param {string} folderPath
 * @param {string} fileName
 */
async function download(url, folderPath, fileName) {
  const destination = join(folderPath, fileName);
  if (existsSync(destination)) {
    console.log(`${destination} already exists. Skipping...`);
    return;
  }

  console.log(`Fetching ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Fetch ${url} failed with response ${res.status} ${res.statusText}`
    );
  }
  const body = res.body;
  if (!body) {
    throw new Error(`${url} body is null`);
  }

  if (!existsSync(folderPath)) {
    await mkdir(folderPath, { recursive: true });
  }

  const fileStream = createWriteStream(destination);

  await pipeline(body, fileStream);
  console.log(`Saved ${url} to ${destination}`);
}

main();
