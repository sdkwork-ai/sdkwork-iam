using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace SDKWork.Iam.BackendSdk.Models
{
    public class IamInstallationCredential
    {
        public string CredentialId { get; set; }
        public string TenantId { get; set; }
        public string InstallationEnvironmentId { get; set; }
        public string EnvironmentKey { get; set; }
        public string ClientId { get; set; }
        public List<string> RedirectUris { get; set; }
        public List<string> GrantedScopes { get; set; }
        public string Status { get; set; }
        public string? RotatedAt { get; set; }
        public string? RetiredAt { get; set; }
        public string CreatedAt { get; set; }
        public string UpdatedAt { get; set; }
    }
}
