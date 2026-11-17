using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace SDKWork.Iam.BackendSdk.Models
{
    public class IamTenantApplicationManagementProvisionCommand
    {
        public string OrganizationId { get; set; }
        public string InstanceKey { get; set; }
        public string DisplayName { get; set; }
        public string Environment { get; set; }
        public string ApplicationType { get; set; }
        public string? PrimaryDomain { get; set; }
        public List<string>? AccessPermissions { get; set; }
        public Dictionary<string, object>? RuntimeConfig { get; set; }
        public string? DeployApplicationId { get; set; }
        public string? ProvisioningIdempotencyKey { get; set; }
    }
}
