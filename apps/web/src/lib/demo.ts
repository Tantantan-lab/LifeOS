/**
 * Demo-mode flag — the ONLY thing client components should import from the
 * demo machinery (data modules pull in the generator; this file stays tiny).
 * Set at build time: NEXT_PUBLIC_DEMO_MODE=1. Baked into the bundle, so a
 * demo build is demo forever and a normal build never enters demo paths.
 */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "1";
