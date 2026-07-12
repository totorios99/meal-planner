#!/usr/bin/env node
/**
 * Mise MCP server — exposes the meal planner's HTTP API to agents over stdio.
 *
 * Env:
 *   MISE_URL      base URL of a running Mise instance (default http://localhost:3000)
 *   MISE_API_KEY  key for POST /api/meals/import (only needed for import_meal)
 *
 * Run: node mcp/server.mjs   (or `npm run mcp`)
 */
import { readFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createHash } from 'node:crypto'
import { tmpdir, homedir } from 'node:os'
import { join } from 'node:path'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const exec = promisify(execFile)

const BASE = process.env.MISE_URL ?? 'http://localhost:3000'
const API_KEY = process.env.MISE_API_KEY ?? ''

const EXTRACTION_PROMPT = readFileSync(new URL('./extraction-prompt.md', import.meta.url), 'utf8')

async function api(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      ...init.headers,
    },
  })
  const text = await res.text()
  if (!res.ok) {
    // Surface API error bodies (e.g. the max-5 favorites message) to the agent
    throw new Error(`Mise API ${res.status}: ${text}`)
  }
  return text ? JSON.parse(text) : null
}

function json(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
}

const server = new McpServer({ name: 'mise', version: '1.0.0' })

// ── Video extraction (TikTok / Reels / Shorts) ──
// Recipes in short-form video carry their content in audio + frames, not HTML.
// extract_video shells out to yt-dlp + ffmpeg + whisper so any model can read them.

// MCP clients often spawn servers with a minimal PATH — resolve ~/.local/bin installs
function bin(name, envVar) {
  if (process.env[envVar]) return process.env[envVar]
  const local = join(homedir(), '.local', 'bin', name)
  return existsSync(local) ? local : name
}
const YTDLP = bin('yt-dlp', 'YTDLP_BIN')
const WHISPER = bin('whisper-ctranslate2', 'WHISPER_BIN')
const FRAME_SECONDS = 5
const MAX_FRAMES = 12

const videoDir = (url) =>
  join(tmpdir(), `mise-video-${createHash('sha1').update(url).digest('hex').slice(0, 12)}`)

async function fetchVideo(url) {
  const dir = videoDir(url)
  const video = join(dir, 'video.mp4')
  if (!existsSync(video)) {
    mkdirSync(dir, { recursive: true })
    // Prefer best h264: TikTok's h265 variants claim aac in metadata but ship without
    // an audio track, so acodec filters can't be trusted there
    await exec(YTDLP, [
      '-f', 'b[vcodec^=h264]/b[acodec!=none]/b', '--write-info-json', '-o', video, url,
    ], { timeout: 120_000 })
  }
  const { stdout } = await exec('ffprobe', [
    '-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=codec_type', video,
  ])
  return { dir, video, hasAudio: stdout.includes('audio') }
}

server.registerTool('extract_video', {
  description:
    'Extract recipe content from a short-form video URL (TikTok, Instagram Reels, YouTube Shorts). ' +
    'Downloads the video, transcribes the audio, and returns caption + transcript + one frame every ' +
    `${FRAME_SECONDS}s (each labelled with its timestamp). Use this whenever a recipe link is a video ` +
    'page that plain fetching cannot read. Afterwards call upload_frame with the timestamp of the best ' +
    'finished-dish frame to get an image URL for import_meal. Requires yt-dlp, ffmpeg and whisper on the server.',
  inputSchema: { url: z.string().url().describe('Video page URL') },
}, async ({ url }) => {
  const { dir, video, hasAudio } = await fetchVideo(url)

  const info = JSON.parse(await readFile(join(dir, 'video.info.json'), 'utf8'))

  let transcript = '(video has no audio track — extract from caption and frames)'
  if (hasAudio) {
    if (!existsSync(join(dir, 'video.txt'))) {
      await exec(WHISPER, [
        video, '--model', 'small', '--output_dir', dir, '--output_format', 'txt',
      ], { timeout: 600_000 })
    }
    transcript = await readFile(join(dir, 'video.txt'), 'utf8')
  }

  if (!readdirSync(dir).some(f => f.startsWith('frame_'))) {
    await exec('ffmpeg', [
      '-y', '-i', video, '-vf', `fps=1/${FRAME_SECONDS},scale=480:-2`, '-q:v', '5',
      join(dir, 'frame_%03d.jpg'),
    ], { timeout: 120_000 })
  }
  const all = readdirSync(dir).filter(f => f.startsWith('frame_')).sort()
  const step = Math.max(1, Math.ceil(all.length / MAX_FRAMES))
  const picked = all.filter((_, i) => i % step === 0)

  const content = [{
    type: 'text',
    text: [
      `Title/caption: ${info.title ?? ''}`,
      `Uploader: ${info.uploader ?? ''}`,
      `Duration: ${info.duration ?? '?'}s`,
      '',
      `Transcript:\n${transcript.trim()}`,
      '',
      `Frames below are labelled with their timestamp in seconds (1 every ${FRAME_SECONDS}s${step > 1 ? `, sampled every ${step * FRAME_SECONDS}s to cap at ${MAX_FRAMES}` : ''}). ` +
      'Pick the best finished-dish frame and pass its timestamp to upload_frame.',
    ].join('\n'),
  }]
  for (const f of picked) {
    const t = (parseInt(f.slice(6, 9), 10) - 1) * FRAME_SECONDS
    content.push({ type: 'text', text: `t=${t}s:` })
    content.push({
      type: 'image',
      data: (await readFile(join(dir, f))).toString('base64'),
      mimeType: 'image/jpeg',
    })
  }
  return { content }
})

server.registerTool('upload_frame', {
  description:
    'Grab one full-resolution frame from a previously extracted video (see extract_video), upload it to ' +
    'the Mise image store, and return a stable image URL to use as `image` in import_meal. ' +
    'Prefer this over expiring CDN thumbnail URLs (TikTok signs theirs).',
  inputSchema: {
    url: z.string().url().describe('Same video URL passed to extract_video'),
    seconds: z.number().min(0).describe('Timestamp of the frame to use'),
  },
}, async ({ url, seconds }) => {
  const { dir, video } = await fetchVideo(url)
  const photo = join(dir, 'photo.jpg')
  await exec('ffmpeg', [
    '-y', '-ss', String(seconds), '-i', video, '-frames:v', '1', '-q:v', '2', photo,
  ], { timeout: 60_000 })

  const form = new FormData()
  form.append('file', new Blob([await readFile(photo)], { type: 'image/jpeg' }), 'photo.jpg')
  const res = await fetch(`${BASE}/api/images`, { method: 'POST', body: form })
  const body = await res.json()
  if (!res.ok) throw new Error(`Mise API ${res.status}: ${JSON.stringify(body)}`)
  return json(body) // { url: "/api/images/<name>.jpg" }
})

// ── Meals ──

server.registerTool('list_meals', {
  description:
    'List meals in the cookbook. Optional case-insensitive filters: `search` matches title/description/tags, `tag` matches one tag exactly. Meals have ingredients/steps as JSON-encoded string arrays.',
  inputSchema: {
    search: z.string().optional(),
    tag: z.string().optional(),
  },
}, async ({ search, tag }) => {
  let meals = await api('/api/meals')
  if (search) {
    const q = search.toLowerCase()
    meals = meals.filter(m => `${m.title} ${m.description} ${m.tag}`.toLowerCase().includes(q))
  }
  if (tag) {
    const t = tag.toLowerCase()
    meals = meals.filter(m => m.tag.split(',').map(s => s.trim().toLowerCase()).includes(t))
  }
  return json(meals)
})

server.registerTool('get_meal', {
  description: 'Get a single meal by id, including ingredients, steps, macros, timing, and favorite status.',
  inputSchema: { id: z.number().int() },
}, async ({ id }) => json(await api(`/api/meals/${id}`)))

const importShape = {
  name: z.string().min(1).describe('Recipe title'),
  description: z.string().optional().describe('One-line summary'),
  image: z.union([z.url(), z.string().regex(/^\/api\/images\//)])
    .describe('Image URL (required) — a stable /api/images/… path from upload_frame, or an og:image URL. Avoid signed/expiring CDN URLs.'),
  servings: z.number().int().min(1).optional().describe('Servings the recipe yields (default 1)'),
  prepMinutes: z.number().int().min(0).optional(),
  cookMinutes: z.number().int().min(0).optional(),
  calories: z.number().min(0).describe('kcal per serving'),
  protein: z.number().min(0).describe('grams per serving'),
  carbs: z.number().min(0).describe('grams per serving'),
  fats: z.number().min(0).describe('grams per serving'),
  categories: z.array(z.enum(['Breakfast', 'Lunch', 'Dinner', 'Snack'])).optional(),
  tags: z.array(z.string()).optional().describe('Free-form tags, e.g. "High protein"'),
  ingredients: z.array(z.string()).min(1).describe('Clean ingredient strings, no serving prefixes'),
  steps: z.array(z.string()).min(1).describe('Ordered cooking steps'),
}

server.registerTool('import_meal', {
  description:
    'Create a meal from structured recipe data (the canonical way for agents to add recipes). Requires MISE_API_KEY. See the extract-recipe prompt / mise://recipe-schema resource for extraction rules.',
  inputSchema: importShape,
}, async (recipe) => json(await api('/api/meals/import', { method: 'POST', body: JSON.stringify(recipe) })))

server.registerTool('update_meal', {
  description:
    'Replace a meal (full update — send every field). Fields: title, description, tag (comma-separated string), calories, protein, carbs, fats, imageUrl, ingredients (string[]), steps (string[]), prepMinutes, cookMinutes, servings.',
  inputSchema: {
    id: z.number().int(),
    title: z.string().min(1),
    description: z.string().optional(),
    tag: z.string().optional().describe('Comma-separated tags, e.g. "Dinner, High protein"'),
    calories: z.number().min(0),
    protein: z.number().min(0),
    carbs: z.number().min(0),
    fats: z.number().min(0),
    imageUrl: z.string().optional(),
    ingredients: z.array(z.string()).optional(),
    steps: z.array(z.string()).optional(),
    prepMinutes: z.number().int().min(0).optional(),
    cookMinutes: z.number().int().min(0).optional(),
    servings: z.number().int().min(1).optional(),
  },
}, async ({ id, ...fields }) => json(await api(`/api/meals/${id}`, { method: 'PUT', body: JSON.stringify(fields) })))

server.registerTool('delete_meal', {
  description: 'Delete a meal by id. Irreversible.',
  inputSchema: { id: z.number().int() },
}, async ({ id }) => json(await api(`/api/meals/${id}`, { method: 'DELETE' })))

server.registerTool('set_favorite', {
  description: 'Mark or unmark a meal as favorite. At most 5 favorites; a 6th returns an error telling you to unfavorite one first.',
  inputSchema: { id: z.number().int(), isFavorite: z.boolean() },
}, async ({ id, isFavorite }) => json(await api(`/api/meals/${id}`, { method: 'PATCH', body: JSON.stringify({ isFavorite }) })))

// ── Weekly plan ──

server.registerTool('get_week_plan', {
  description:
    'Get (or auto-create) the weekly plan. Pass weekStart as YYYY-MM-DD (a Monday, in the user\'s local timezone) — omitting it falls back to server UTC time, which can be off by a day. Response includes plan id and 7 days (dayIndex 0=Mon..6=Sun), each with its day id and meal entries (entry id, meal, slotIndex, portionMultiplier). Use those ids for the other plan tools.',
  inputSchema: { weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() },
}, async ({ weekStart }) => json(await api(`/api/plans/active${weekStart ? `?weekStart=${weekStart}` : ''}`)))

server.registerTool('add_meal_to_day', {
  description: 'Add a meal to a plan day. Get planId/dayId from get_week_plan. slotIndex orders meals within the day (0-based, append = current meal count).',
  inputSchema: {
    planId: z.number().int(),
    dayId: z.number().int(),
    mealId: z.number().int(),
    slotIndex: z.number().int().min(0),
    portionMultiplier: z.number().positive().optional().describe('Portion scale, default 1.0'),
  },
}, async ({ planId, dayId, ...body }) =>
  json(await api(`/api/plans/${planId}/days/${dayId}/meals`, { method: 'POST', body: JSON.stringify(body) })))

server.registerTool('remove_plan_meal', {
  description: 'Remove a meal entry from a plan day. mealEntryId is the entry id from get_week_plan (not the meal id).',
  inputSchema: { planId: z.number().int(), dayId: z.number().int(), mealEntryId: z.number().int() },
}, async ({ planId, dayId, mealEntryId }) =>
  json(await api(`/api/plans/${planId}/days/${dayId}/meals/${mealEntryId}`, { method: 'DELETE' })))

server.registerTool('set_portion', {
  description: 'Change the portion multiplier of a plan meal entry.',
  inputSchema: {
    planId: z.number().int(),
    dayId: z.number().int(),
    mealEntryId: z.number().int(),
    portionMultiplier: z.number().positive(),
  },
}, async ({ planId, dayId, mealEntryId, portionMultiplier }) =>
  json(await api(`/api/plans/${planId}/days/${dayId}/meals/${mealEntryId}`, { method: 'PUT', body: JSON.stringify({ portionMultiplier }) })))

// ── Extraction prompt + schema ──

server.registerPrompt('extract-recipe', {
  description: 'Instructions for extracting recipe data from a webpage/transcript into Mise import JSON.',
  argsSchema: { input: z.string().describe('The webpage content or transcript to extract from') },
}, ({ input }) => ({
  messages: [{
    role: 'user',
    content: { type: 'text', text: `${EXTRACTION_PROMPT}\n\n## Input\n\n${input}` },
  }],
}))

server.registerResource('recipe-schema', 'mise://recipe-schema', {
  description: 'Mise recipe import JSON schema and extraction rules',
  mimeType: 'text/markdown',
}, async (uri) => ({
  contents: [{ uri: uri.href, mimeType: 'text/markdown', text: EXTRACTION_PROMPT }],
}))

await server.connect(new StdioServerTransport())
