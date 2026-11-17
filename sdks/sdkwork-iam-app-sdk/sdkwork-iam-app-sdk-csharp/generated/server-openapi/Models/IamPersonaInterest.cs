using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace SDKWork.Iam.AppSdk.Models
{
    public class IamPersonaInterest
    {
        public string Code { get; set; }
        public int SortOrder { get; set; }
        public Dictionary<string, string> Labels { get; set; }
    }
}
