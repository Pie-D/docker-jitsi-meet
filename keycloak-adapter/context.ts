// -----------------------------------------------------------------------------
// This function creates the context inside JWT's payload. It gets userInfo
// (which comes from Keycloak) as parameter.
//
// Update the codes according to your requirements. Welcome to TypeScript :)
// -----------------------------------------------------------------------------

export function createContext(userInfo: Record<string, unknown>, token : string) {
  // const realm_access = userInfo.realm_access as { roles: string[] }
  const active_tenant = userInfo.active_tenant as {tenant_id: string, tenant_name: string, roles: string[]}

  const conditions = ["tenant-superadmin", "tenant-admin"]
  
  const isOwner = Array.isArray(active_tenant.roles) 
  ? active_tenant.roles.some(role => conditions.includes(role)) 
  : false;


  const context = {
    user: {
      id: userInfo.sub,
      name: "[" + active_tenant.tenant_name + "] " + userInfo.preferred_username || "CMC ATIer",
      email: userInfo.email || "",
      lobby_bypass: true,
      avatar: userInfo.email ? `files.cmcati.vn/ftp/${userInfo.email}` : "",
      security_bypass: true,
      affiliation: isOwner ? "owner" : "member"
    },
    features: {
      livestreaming: true,
      transcription: true,
      recording: isOwner ? true : false
    },
    active_tenant: active_tenant,
    token: token
  };

  return context;
}
