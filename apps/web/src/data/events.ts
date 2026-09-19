import { generateEvents } from "@/data/generator";

/**
 * The mock dataset. Built once at module scope; every selector reads from
 * this. M2 deletes this file and the generator — selectors call the API.
 */
export const EVENTS = generateEvents();
