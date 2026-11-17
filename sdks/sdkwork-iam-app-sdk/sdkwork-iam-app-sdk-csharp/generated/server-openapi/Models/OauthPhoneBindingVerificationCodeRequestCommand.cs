using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace SDKWork.Iam.AppSdk.Models
{
    public class OauthPhoneBindingVerificationCodeRequestCommand
    {
        public string ContinuationToken { get; set; }
        public string Phone { get; set; }
    }
}
