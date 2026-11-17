using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace SDKWork.Iam.AppSdk.Models
{
    public class AuthorizationsCompletionsCreateResponse
    {
        public int Code { get; set; }
        public string TraceId { get; set; }
        public Dictionary<string, object> Data { get; set; }
    }
}
