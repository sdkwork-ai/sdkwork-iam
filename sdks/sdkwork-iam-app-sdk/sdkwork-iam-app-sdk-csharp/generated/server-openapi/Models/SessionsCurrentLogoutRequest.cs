using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace SDKWork.Iam.AppSdk.Models
{
    public class SessionsCurrentLogoutRequest
    {
        public string RefreshToken { get; set; }
    }
}
