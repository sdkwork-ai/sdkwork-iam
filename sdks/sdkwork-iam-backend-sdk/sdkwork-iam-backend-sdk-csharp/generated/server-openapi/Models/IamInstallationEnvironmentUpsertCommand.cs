using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace SDKWork.Iam.BackendSdk.Models
{
    public class IamInstallationEnvironmentUpsertCommand
    {
        public string? EnvironmentKey { get; set; }
        public string? PrimaryDomain { get; set; }
        public Dictionary<string, object>? DomainConfig { get; set; }
        public string? Status { get; set; }
    }
}
