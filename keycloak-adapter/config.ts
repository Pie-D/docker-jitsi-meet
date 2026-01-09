// keycloak
export const KEYCLOAK_ORIGIN =
  Deno.env.get("KEYCLOAK_ORIGIN") || "";
export const KEYCLOAK_ORIGIN_INTERNAL =
  Deno.env.get("KEYCLOAK_ORIGIN_INTERNAL") || KEYCLOAK_ORIGIN;
export const KEYCLOAK_REALM = Deno.env.get("KEYCLOAK_REALM") || "";
export const KEYCLOAK_CLIENT_ID =
  Deno.env.get("KEYCLOAK_CLIENT_ID") || "";
export const KEYCLOAK_MODE = Deno.env.get("KEYCLOAK_MODE") || "";

// jwt
export const JWT_ALG = Deno.env.get("JWT_ALG") || "";
export const JWT_HASH = Deno.env.get("JWT_HASH") || "";
export const JWT_APP_ID = Deno.env.get("JWT_APP_ID") || "";
export const JWT_APP_SECRET = Deno.env.get("JWT_APP_SECRET") || "";
export const JWT_EXP_SECOND = Number(Deno.env.get("JWT_EXP_SECOND") || 604800);

// adapter
export const HOSTNAME = Deno.env.get("HOSTNAME") || "";
export const PORT = Number(Deno.env.get("PORT") || 9000);
export const DEBUG = Deno.env.get("DEBUG") === "true";
export const CMEET_SERVER_MANAGER_API =
  Deno.env.get("CMEET_SERVER_MANAGER_API") || "";
