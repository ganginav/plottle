/**
 * Optional shared datastore for community daily stats. Uses Upstash Redis over its
 * REST API, reading whichever env vars the Vercel KV / Upstash integration injects.
 * If none are set, `kv` is null and the feature degrades gracefully (hidden in UI).
 *
 * To enable: add a KV / Upstash Redis store in the Vercel dashboard (Storage tab) —
 * it auto-injects the env vars below — then redeploy.
 */
import { Redis } from '@upstash/redis';

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const kvEnabled = Boolean(url && token);
export const kv = kvEnabled ? new Redis({ url: url!, token: token! }) : null;
