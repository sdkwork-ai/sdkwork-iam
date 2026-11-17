using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace SDKWork.Iam.AppSdk.Models
{
    public class IamPersonaRole
    {
        public string Code { get; set; }
        public string? IamRoleCode { get; set; }
        public int SortOrder { get; set; }
        public Dictionary<string, string> Labels { get; set; }
        public Dictionary<string, string> Descriptions { get; set; }
    }
}
