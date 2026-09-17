using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace SDKWork.Iam.BackendSdk.Models
{
    public class IamTenantApplicationManagementUpdateCommand
    {
        public string? PrimaryDomain { get; set; }
        public List<string>? AccessPermissions { get; set; }
    }
}
