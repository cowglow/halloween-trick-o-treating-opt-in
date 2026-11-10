import { eventEndAt } from "domain/space/event-end.ts";

// The build's event end (deploy.yml passes the EVENT_END_AT repository
// variable; an unset one arrives as "", hence eventEndAt's fallback).
export const EVENT_END = eventEndAt(import.meta.env.VITE_EVENT_END_AT);
