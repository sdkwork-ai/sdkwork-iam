using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace SDKWork.Iam.AppSdk.Models
{
    public class IamAppAccessTokenCreateCommand
    {
        public string? AppId { get; set; }
        public string? InstallationId { get; set; }
        public string? InstanceKey { get; set; }
        public string? Environment { get; set; }
        public string? OwnershipScope { get; set; }
    }
}
