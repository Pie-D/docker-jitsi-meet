// -----------------------------------------------------------------------------
// This function creates the context inside JWT's payload. It gets userInfo
// (which comes from Keycloak) as parameter.
//
// Update the codes according to your requirements. Welcome to TypeScript :)
// -----------------------------------------------------------------------------
interface Tenant {
  tenant_id: string;
  tenant_name: string;
  roles: string[];
}

export function createContext(userInfo: Record<string, unknown>) {
  // const realm_access = userInfo.realm_access as { roles: string[] }
  // const active_tenant: Tenant = (userInfo.active_tenant as Tenant) ?? { tenant_id: "", tenant_name: "", roles: string[] };

  // const conditions = ["tenant-superadmin", "tenant-admin"]
  
  // const isOwner = Array.isArray(active_tenant.roles) 
  // ? active_tenant.roles.some(role => conditions.includes(role)) 
  // : false;


  // const context = {
  //   user: {
  //     id: userInfo.sub,
  //     name: userInfo.preferred_username || "",
  //     email: userInfo.email || "",
  //     lobby_bypass: true,
  //     avatar: userInfo.email ? `files.cmcati.vn/ftp/${userInfo.email}` : "",
  //     security_bypass: true,
  //     affiliation: isOwner ? "owner" : "member"
  //   },
  //   features: {
  //     livestreaming: true,
  //     transcription: true,
  //     recording: isOwner ? true : false
  //   },
  //   active_tenant: active_tenant
  // };
  const realm_access = userInfo.realm_access as { roles: string[] }
  const conditions = ["ADMIN", "SUPER_ADMIN"]

  const context = {
    user: {
      id: userInfo.sub,
      name: userInfo.preferred_username || "",
      email: userInfo.email || "",
      lobby_bypass: true,
      security_bypass: true,
      affiliation: realm_access.roles.some(role => conditions.includes(role)) ? "owner" : "member"
    },
    features: {
      livestreaming: true,
      transcription: true,
      recording: realm_access.roles.some(role => conditions.includes(role)) ? true : false
    },
    realm_access : realm_access
  };

  return context;
}
