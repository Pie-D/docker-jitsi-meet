// -----------------------------------------------------------------------------
// This function creates the context inside JWT's payload. It gets userInfo
// (which comes from Keycloak) as parameter.
//
// Update the codes according to your requirements. Welcome to TypeScript :)
// -----------------------------------------------------------------------------

export function createContext(userInfo: Record<string, unknown>) {
  const realm_access = userInfo.realm_access as { roles: string[] }
  const conditions = ["ADMIN", "SUPER_ADMIN"]

  const context = {
    user: {
      id: userInfo.sub,
      name: userInfo.preferred_username || "",
      email: userInfo.email || "",
      lobby_bypass: true,
      avatar: userInfo.email ? `files.cmcati.vn/ftp/${userInfo.email}` : "",
      security_bypass: true,
      affiliation: realm_access.roles.some(role => conditions.includes(role)) ? "owner" : "member"
    },
    features: {
      livestreaming: true,
      transcription: true,
      recording: realm_access.roles.some(role => conditions.includes(role)) ? true : false
    }
  };

  return context;
}
