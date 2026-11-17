using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace SDKWork.Iam.AppSdk.Models
{
    public class IamUserPersona
    {
        public string Role { get; set; }
        public List<string> Interests { get; set; }
        public bool PromptDismissed { get; set; }
        public bool HasSelection { get; set; }
        public string CatalogVersion { get; set; }
        public string UpdatedAt { get; set; }
    }
}
