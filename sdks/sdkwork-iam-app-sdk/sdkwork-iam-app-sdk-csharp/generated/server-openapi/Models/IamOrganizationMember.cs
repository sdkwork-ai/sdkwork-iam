using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace SDKWork.Iam.AppSdk.Models
{
    public class IamOrganizationMember
    {
        public string UserId { get; set; }
        public string MembershipId { get; set; }
        public string? DisplayName { get; set; }
        public string? Username { get; set; }
        public string? Email { get; set; }
        public string MembershipKind { get; set; }
        public string Status { get; set; }
        public bool IsPrimary { get; set; }
    }
}
