using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace SDKWork.Iam.AppSdk.Models
{
    public class IamPersonaCatalog
    {
        public string Version { get; set; }
        public List<IamPersonaRole> Roles { get; set; }
        public List<IamPersonaInterest> Interests { get; set; }
    }
}
