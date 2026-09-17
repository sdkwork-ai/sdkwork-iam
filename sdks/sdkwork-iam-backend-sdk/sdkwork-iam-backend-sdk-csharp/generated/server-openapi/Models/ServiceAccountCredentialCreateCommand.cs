using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace SDKWork.Iam.BackendSdk.Models
{
    public class ServiceAccountCredentialCreateCommand
    {
        public string TenantApplicationId { get; set; }
        public string? ExpiresAt { get; set; }
    }
}
