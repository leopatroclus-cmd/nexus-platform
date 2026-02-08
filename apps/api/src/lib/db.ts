import { createDb } from '@nexus/database';
import { env } from '../env.js';

export const db = createDb(env.DATABASE_URL);
