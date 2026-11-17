using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace SDKWork.Iam.AppSdk.Models
{
    public class OauthPhoneBindingSessionCreateCommand
    {
        public string ContinuationToken { get; set; }
        public string Phone { get; set; }
        public string VerificationCode { get; set; }
        public string? SurfaceCode { get; set; }
        public string? DeviceId { get; set; }
    }
}
