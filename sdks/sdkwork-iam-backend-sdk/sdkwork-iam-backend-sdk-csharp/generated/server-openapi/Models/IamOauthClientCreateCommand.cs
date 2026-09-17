using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace SDKWork.Iam.BackendSdk.Models
{
    public class IamOauthClientCreateCommand
    {
        public string IntegrationId { get; set; }
        public string ProviderCode { get; set; }
        public string ClientCode { get; set; }
        public string DisplayName { get; set; }
        public string ProviderClientId { get; set; }
        public string? ProviderTenantId { get; set; }
    }
}
