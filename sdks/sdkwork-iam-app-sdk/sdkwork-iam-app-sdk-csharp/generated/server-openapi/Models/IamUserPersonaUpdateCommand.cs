using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace SDKWork.Iam.AppSdk.Models
{
    public class IamUserPersonaUpdateCommand
    {
        public string? Role { get; set; }
        public List<string>? Interests { get; set; }
        public bool? PromptDismissed { get; set; }
    }
}
