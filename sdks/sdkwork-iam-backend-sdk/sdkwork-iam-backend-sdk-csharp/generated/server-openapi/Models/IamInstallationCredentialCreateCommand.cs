using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace SDKWork.Iam.BackendSdk.Models
{
    public class IamInstallationCredentialCreateCommand
    {
        public string EnvironmentKey { get; set; }
        public string? ClientId { get; set; }
        public List<string>? RedirectUris { get; set; }
        public List<string>? GrantedScopes { get; set; }
    }
}
