using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace SDKWork.Iam.AppSdk.Models
{
    public class IamAppAccessToken
    {
        public string AccessToken { get; set; }
        public string AuthToken { get; set; }
        public string ExpiresAt { get; set; }
        public string AppId { get; set; }
        public string InstallationId { get; set; }
        public string? OrganizationId { get; set; }
        public string OwnershipScope { get; set; }
        public string? SessionId { get; set; }
        public string? Environment { get; set; }
    }
}
