using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace SDKWork.Iam.BackendSdk.Models
{
    public class ServiceAccountTokenExchangeCommand
    {
        public string ClientId { get; set; }
        public string ClientSecret { get; set; }
    }
}
