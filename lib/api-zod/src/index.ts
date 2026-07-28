export * from "./generated/api";
export * from "./generated/types";
// Both generated files now export a `GetBookingParams` (zod schema in api.ts,
// query-param type in types.ts). Explicitly re-export the zod schema, which is
// what the API server consumes for validation.
export { GetBookingParams } from "./generated/api";
