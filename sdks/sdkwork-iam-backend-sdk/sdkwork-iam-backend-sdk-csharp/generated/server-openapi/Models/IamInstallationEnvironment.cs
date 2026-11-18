using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace SDKWork.Iam.BackendSdk.Models
{
    public class IamInstallationEnvironment
    {
        public string EnvironmentId { get; set; }
        public string TenantId { get; set; }
        public string? OrganizationId { get; set; }
        public string InstallationId { get; set; }
        public string EnvironmentKey { get; set; }
        public string? PrimaryDomain { get; set; }
        public Dictionary<string, object>? DomainConfig { get; set; }
        public string Status { get; set; }
        public string CreatedAt { get; set; }
        public string UpdatedAt { get; set; }
    }
}
