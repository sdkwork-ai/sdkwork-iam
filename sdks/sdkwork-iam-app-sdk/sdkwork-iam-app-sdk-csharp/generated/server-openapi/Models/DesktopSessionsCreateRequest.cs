using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace SDKWork.Iam.AppSdk.Models
{
    public class DesktopSessionsCreateRequest
    {
        public string ClientId { get; set; }
        public string AuthorizationCode { get; set; }
        public string CodeVerifier { get; set; }
        public string RedirectUri { get; set; }
        public string? ClientSecret { get; set; }
        public string? DeviceId { get; set; }
    }
}
