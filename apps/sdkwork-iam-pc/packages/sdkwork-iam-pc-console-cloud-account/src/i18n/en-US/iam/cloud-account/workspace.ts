import type {
  SdkworkIamCloudAccountConsoleMessages,
  SdkworkIamCloudAccountKindHints,
  SdkworkIamCloudAccountKindUrls,
  SdkworkIamCloudAccountSecretLabels,
} from "../../../../types/cloud-account-console-messages";

/**
 * Credential kind → where to get it, in the platform's own words.
 *
 * Used for the kinds a provider has no first-class page for: six of the ten issue
 * no bearer token, no service-account key file, or both. The form still has to be
 * able to render those shapes — the identity picker and the provider picker are
 * independent axes, and nothing in the contract says which provider supports which
 * shape — so the honest answer is to say the provider does not issue one, rather
 * than to leave a blank the operator has to interpret.
 */
const neutralHints: SdkworkIamCloudAccountKindHints = {
  access_key_pair: "Create a key pair in that provider's console.",
  bearer_token: "This provider issues no long-lived bearer token. Pick a credential shape it does issue.",
  secret_text: "Create the credential following that provider's documentation.",
  service_account_json: "Create a service-account key file following that provider's documentation.",
};

/**
 * The same axis, as links: where each of those directions actually goes. Empty
 * means the provider publishes no such page.
 *
 * One-to-one with `neutralHints` and keyed the same way, for the same reason:
 * `bearer_token` is a kind most providers never issue, so most of these entries
 * are empty by design — and an empty entry resolves to the provider's console
 * entry through `kindHintUrlFor` rather than to a dead link. Only "no page for
 * this kind" combined with "no console at all" (`custom`, and any provider code
 * this build has never seen) resolves to nothing, and then the page renders no
 * link rather than one pointed at a site nobody here can vouch for.
 */
const neutralHintUrls: SdkworkIamCloudAccountKindUrls = {
  access_key_pair: "",
  bearer_token: "",
  secret_text: "",
  service_account_json: "",
};

/**
 * The three single-secret kinds → their field name, in the platform's words.
 *
 * Keyed by kind rather than one string per provider, and this is the whole point:
 * the three share the single `secret_text` *field* while holding different things.
 * One string could be right for at most one of them — which is how the previous
 * revision came to call a Cloudflare API token and a Google service-account JSON
 * blob by the same name.
 */
const neutralSecretLabels: SdkworkIamCloudAccountSecretLabels = {
  bearer_token: "Bearer token",
  secret_text: "Secret text",
  service_account_json: "Service account JSON key",
};

export const sdkworkIamCloudAccountConsoleMessages: SdkworkIamCloudAccountConsoleMessages = {
  adminSubtitle: "Review and manage the cloud provider accounts held at the ownership levels this caller may reach, including the platform default every tenant resolves through.",
  actions: {
    cancel: "Cancel",
    close: "Close",
    create: "New account",
    delete: "Delete account",
    detail: "Details",
    disable: "Disable",
    edit: "Edit",
    enable: "Enable",
    loadMore: "Load more",
    resolve: "Preview resolution",
    save: "Save",
    setDefault: "Set as default",
  },
  accountType: {
    api_key: "API key",
    federated_identity: "Federated identity",
    long_term_key: "Long-term key",
    managed_identity: "Managed identity",
    service_account: "Service account",
    service_linked_role: "Service-linked role",
    temporary_credential: "Temporary credential",
  },
  capabilityAny: "Any capability",
  capability: {
    cdn: "CDN",
    certificate: "Certificate",
    compute: "Compute",
    container_registry: "Container registry",
    dns: "DNS",
    email: "Email",
    object_storage: "Object storage",
    sms: "SMS",
  },
  columns: {
    accountCode: "Account code",
    actions: "Actions",
    credential: "Credential",
    displayName: "Display name",
    environment: "Environment",
    isDefault: "Default",
    maskedLabel: "Mask",
    scope: "Ownership",
    status: "Status",
    vendor: "Provider",
  },
  create: {
    accountCode: "Account code",
    accountCodePlaceholder: "prod-storage",
    // No example of what some *other* provider calls this field. The label above is
    // already this provider's word (Alibaba Cloud account id, subscription id,
    // project id, all from `vendorConfig.accountIdLabel`), and listing a second
    // provider's terms underneath it states a fact about a provider the operator is
    // not looking at — the same defect as labelling a Tencent Cloud field
    // "AccessKey ID", only pointed the other way.
    accountIdHint:
      "Optional. What the provider itself calls this account, so a credential can be traced back to the account it belongs to.",
    accountType: "Identity shape",
    capabilities: "Capabilities",
    capabilitiesHint: "Nothing to choose: with no capability specified, the account serves any capability of this provider.",
    // The credential group describes the identity shape that is *selected*. One
    // paragraph enumerating all four makes the operator read four configurations to
    // find theirs, and the moment the selected shape is not the first one listed it
    // reads as a description of something else. The three shapes that hold no secret
    // are absent here on purpose: what they need said is *why* there is nothing to
    // type, which `credentialNotNeeded` states per shape.
    credentialShapeHint: {
      long_term_key:
        "A long-term key is a pair: one box for its id and one for its secret, both issued by the provider for the long run, and you rotate them yourself.",
      temporary_credential:
        "A temporary credential adds a session token to the key pair: the provider issues all three in one go, and without the token nothing proves the credential came from the provider.",
      service_account:
        "A service account key is a whole key document: paste the entire file into the single box below, not one field out of it.",
      api_key: "An API key is one opaque string: paste exactly what the provider issued into the single box below.",
    },
    credentialMissingNote:
      "No secret typed: this account resolves through nothing until a credential is written here or from its detail.",
    // Three shapes render no credential fields, and they render none for three
    // different reasons: a service-linked role is assumed by the cloud service
    // itself, a federated identity trades an assertion an external issuer signed,
    // and a managed identity has no secret material at all. One shared sentence
    // tells the operator holding a SAML assertion that there is nothing to
    // configure, and never tells the operator registering a role which side has to
    // grant it — so each shape states its own reason.
    credentialNotNeeded: {
      service_linked_role:
        "A service-linked role is assumed by the cloud service itself when it acts on the account owner's behalf, so there is no static secret to rotate and nothing to type here. Grant the role to the service that needs it on the provider's console.",
      federated_identity:
        "A federated identity (OIDC / SAML) uses an assertion signed by an external issuer, which the provider exchanges for short-lived credentials; this platform never stores that assertion, so there is nothing to type here. Configure the issuer and the trust policy on the provider's console.",
      managed_identity:
        "A managed identity is attached to a cloud resource by the platform and carries no secret material at all, so there is nothing to type here. Bind the identity to the resource on the provider's console.",
    },
    credentialNotNeededUnknown:
      "This identity shape registers no credential with this platform — the reason is not covered by this build — so there is nothing to type here. Authorise it on the provider's console.",
    credentialSection: "Credentials",
    description: "Register a provider account and write the credential that calls it in the same pass.",
    displayName: "Display name",
    displayNamePlaceholder: "Production object storage",
    environment: "Environment",
    // The ownership level is a picker only where the caller may act on more than one
    // level; on the console exactly one level exists, so the form shows no level
    // control at all and "this level" has no visible referent. Naming the level
    // reads correctly in both shapes of the form.
    isDefault: "Make this the default account of this provider for the {scope} ownership level and this environment",
    organizationId: "Organization id",
    organizationIdPlaceholder: "org-1",
    ownership: "Ownership",
    provider: "Provider",
    region: "Region",
    regionClear: "Clear region",
    regionEmpty: "No region of this provider matches. What you typed is saved as it is.",
    regionHint:
      "Candidates come from the selected provider. A region it does not list can still be typed in; changing the provider clears a region the new one does not publish.",
    // `cloudflare`, `minio`, `dnspod` and `custom` publish no regions at all, and the field
    // degrades to free text there — where the sentence above is false in its first
    // clause, promising a list that does not exist. The second clause is kept and is
    // not a copy by accident: `iamCloudAccountVendorAcceptsRegion` answers `false`
    // for every non-empty code when the provider publishes none, so switching *to*
    // one of these three clears what was typed, and a free-text box gives the
    // operator no way to see that coming.
    regionHintNoCandidates:
      "This provider publishes no region candidates; type the region id directly. Changing the provider clears a region the new one does not publish.",
    regionPlaceholder: "Select or type a region id",
    submit: "Register account",
    title: "Register a cloud account",
  },
  credentials: {
    add: "Add credential",
    addTitle: "Add a credential",
    empty: "No credential is stored yet.",
    kind: "Credential kind",
    name: "Slot name",
    namePlaceholder: "default",
    revoke: "Revoke",
    rotationApplies: "Rotation applies to this identity shape.",
    sessionToken: "Session token",
    sessionTokenHint: "The third part of a temporary credential: the provider hands it out with the key pair, and without it the credential cannot be proven to come from the provider.",
    store: "Store credential",
    subtitle: "Creating a credential for a slot that already has one rotates it: the previous row is superseded and consumers pick up the new value with no change of their own. Secret material is written once and never read back.",
    title: "Credentials",
  },
  credentialKind: {
    access_key_pair: "Access key pair",
    bearer_token: "Bearer token",
    secret_text: "Secret text",
    service_account_json: "Service account JSON",
  },
  // The link label deliberately avoids the word "console": the target is a console
  // page for Alibaba Cloud and Tencent Cloud, but an official document for MinIO,
  // so calling it a console would be false on the ones that are documents. The
  // per-provider half of the block is not here either, but on
  // `vendorConfig.<provider>.help` — it is a fact about a provider, not a word of
  // the interface.
  credentialHelp: {
    link: "Get the credential",
    title: "How to get {vendor} credentials",
  },
  detail: {
    deleteDescription: "Delete \"{name}\"? The account and its credentials stop being resolved through, and the removal cannot be undone.",
    editTitle: "Edit the account",
    factsTitle: "Account",
    resolutionEmpty: "No account at any visible level serves this vendor and capability.",
    resolutionTitle: "What this requirement resolves to",
  },
  environment: {
    development: "Development",
    production: "Production",
    sandbox: "Sandbox",
  },
  errors: {
    createAccount: "Failed to register the cloud account",
    credentialAfterCreate:
      "The account \"{name}\" was registered, but its credential was not written: {reason}. Write the credential from the account's detail, or the account will not resolve through anything.",
    deleteAccount: "Failed to delete the account",
    loadAccounts: "Failed to load cloud accounts",
    loadCredentials: "Failed to load credentials",
    resolve: "Failed to resolve the account",
    revokeCredential: "Failed to revoke the credential",
    setDefault: "Failed to promote the account to default",
    storeCredential: "Failed to store the credential",
    updateAccount: "Failed to update the cloud account",
  },
  list: {
    credentialConfigured: "{count} stored",
    credentialMissing: "None yet",
    default: "Default",
    emptyDescription: "Use \"New account\" above to register your first cloud account, and write the credential it calls the provider with on the same form.",
    emptyTitle: "No cloud account yet",
    showingOf: "Showing {loaded} of {total}",
  },
  // Region names are grouped by provider because they cannot be flattened:
  // `ap-southeast-1` is Singapore for Alibaba Cloud and AWS but Hong Kong, China
  // for Huawei Cloud, and `ap-southeast-3` is Malaysia for Alibaba Cloud while
  // Huawei uses it for Singapore. The same code is not the same place.
  region: {
    aliyun: {
      "ap-northeast-1": "Japan (Tokyo)",
      "ap-south-1": "India (Mumbai)",
      "ap-southeast-1": "Singapore",
      "ap-southeast-2": "Australia (Sydney)",
      "ap-southeast-3": "Malaysia (Kuala Lumpur)",
      "ap-southeast-5": "Indonesia (Jakarta)",
      "cn-beijing": "China North 2 (Beijing)",
      "cn-chengdu": "China Southwest 1 (Chengdu)",
      "cn-guangzhou": "China South 3 (Guangzhou)",
      "cn-hangzhou": "China East 1 (Hangzhou)",
      "cn-heyuan": "China South 2 (Heyuan)",
      "cn-hongkong": "Hong Kong, China",
      "cn-qingdao": "China North 1 (Qingdao)",
      "cn-shanghai": "China East 2 (Shanghai)",
      "cn-shenzhen": "China South 1 (Shenzhen)",
      "cn-wulanchabu": "China North 6 (Ulanqab)",
      "cn-zhangjiakou": "China North 3 (Zhangjiakou)",
      "eu-central-1": "Germany (Frankfurt)",
      "eu-west-1": "UK (London)",
      "us-east-1": "US (Virginia)",
      "us-west-1": "US (Silicon Valley)",
    },
    aws: {
      "ap-east-1": "Asia Pacific (Hong Kong, China)",
      "ap-northeast-1": "Asia Pacific (Tokyo)",
      "ap-northeast-2": "Asia Pacific (Seoul)",
      "ap-northeast-3": "Asia Pacific (Osaka)",
      "ap-south-1": "Asia Pacific (Mumbai)",
      "ap-southeast-1": "Asia Pacific (Singapore)",
      "ap-southeast-2": "Asia Pacific (Sydney)",
      "ca-central-1": "Canada (Central)",
      "cn-north-1": "China (Beijing)",
      "cn-northwest-1": "China (Ningxia)",
      "eu-central-1": "Europe (Frankfurt)",
      "eu-west-1": "Europe (Ireland)",
      "eu-west-2": "Europe (London)",
      "sa-east-1": "South America (Sao Paulo)",
      "us-east-1": "US East (N. Virginia)",
      "us-east-2": "US East (Ohio)",
      "us-west-1": "US West (N. California)",
      "us-west-2": "US West (Oregon)",
    },
    azure: {
      "centralus": "Central US",
      "chinaeast2": "China East 2",
      "chinanorth3": "China North 3",
      "eastasia": "East Asia (Hong Kong, China)",
      "eastus": "East US",
      "eastus2": "East US 2",
      "germanywestcentral": "Germany West Central",
      "japaneast": "Japan East",
      "japanwest": "Japan West",
      "koreacentral": "Korea Central",
      "northeurope": "North Europe (Ireland)",
      "southeastasia": "Southeast Asia (Singapore)",
      "uksouth": "UK South",
      "westeurope": "West Europe (Netherlands)",
      "westus2": "West US 2",
    },
    // These four providers have no regions to name: Cloudflare is one anycast
    // network, MinIO runs wherever it was installed, DNSPod's only locality is the
    // record line (a property of a record rather than of the account), and
    // `custom` names no provider at all. The empty map is the answer, not a gap.
    cloudflare: {},
    custom: {},
    dnspod: {},
    google: {
      "asia-east1": "Asia East 1 (Taiwan, China)",
      "asia-east2": "Asia East 2 (Hong Kong, China)",
      "asia-northeast1": "Asia Northeast 1 (Tokyo, Japan)",
      "asia-northeast2": "Asia Northeast 2 (Osaka, Japan)",
      "asia-northeast3": "Asia Northeast 3 (Seoul, South Korea)",
      "asia-south1": "Asia South 1 (Mumbai, India)",
      "asia-southeast1": "Asia Southeast 1 (Singapore)",
      "asia-southeast2": "Asia Southeast 2 (Jakarta, Indonesia)",
      "europe-west1": "Europe West 1 (Belgium)",
      "europe-west2": "Europe West 2 (London, UK)",
      "europe-west3": "Europe West 3 (Frankfurt, Germany)",
      "europe-west4": "Europe West 4 (Netherlands)",
      "us-central1": "US Central 1 (Iowa)",
      "us-east1": "US East 1 (South Carolina)",
      "us-west1": "US West 1 (Oregon)",
    },
    huawei: {
      "ap-southeast-1": "Hong Kong, China",
      "ap-southeast-2": "Bangkok, Thailand",
      "ap-southeast-3": "Singapore",
      "cn-east-2": "CN East-Shanghai2",
      "cn-east-3": "CN East-Shanghai1",
      "cn-north-1": "CN North-Beijing1",
      "cn-north-4": "CN North-Beijing4",
      "cn-south-1": "CN South-Guangzhou",
      "cn-southwest-2": "CN Southwest-Guiyang1",
    },
    minio: {},
    tencent: {
      "ap-beijing": "Beijing",
      "ap-bangkok": "Bangkok",
      "ap-chengdu": "Chengdu",
      "ap-chongqing": "Chongqing",
      "ap-guangzhou": "Guangzhou",
      "ap-hongkong": "Hong Kong, China",
      "ap-jakarta": "Jakarta",
      "ap-mumbai": "Mumbai",
      "ap-nanjing": "Nanjing",
      "ap-seoul": "Seoul",
      "ap-shanghai": "Shanghai",
      "ap-singapore": "Singapore",
      "ap-tokyo": "Tokyo",
      "eu-frankfurt": "Frankfurt",
      "na-ashburn": "Ashburn",
      "na-siliconvalley": "Silicon Valley",
      "sa-saopaulo": "Sao Paulo",
    },
    volcengine: {
      "cn-beijing": "China North 2 (Beijing)",
      "cn-guangzhou": "China South 1 (Guangzhou)",
      "cn-hongkong": "Hong Kong, China",
      "cn-shanghai": "China East 2 (Shanghai)",
    },
  },
  scope: {
    organization: "Organization",
    platform: "Platform",
    tenant: "Tenant",
    user: "Personal",
  },
  status: {
    active: "Active",
    deleted: "Deleted",
    disabled: "Disabled",
  },
  // The credential mechanics (write-once, rotate-in-place) are stated once, in
  // `credentials.subtitle`, where the fields that do it are. Repeating them here
  // made the page explain the same rule twice, 200px apart.
  subtitle: "Register and manage your own provider accounts. The credential is written at registration and can be rotated from the account's detail.",
  title: "Cloud accounts",
  vendor: {
    aliyun: "Alibaba Cloud",
    aws: "AWS",
    azure: "Microsoft Azure",
    cloudflare: "Cloudflare",
    custom: "Custom",
    dnspod: "DNSPod",
    google: "Google Cloud",
    huawei: "Huawei Cloud",
    minio: "MinIO",
    tencent: "Tencent Cloud",
    volcengine: "VolcEngine",
  },
  // Every provider names its own key fields, and those names are printed as form
  // labels for the operator to copy from: Alibaba Cloud says `AccessKey ID`,
  // Tencent Cloud says `SecretId`, Azure says `Application (client) ID`, MinIO
  // says `Secret Key`. Calling them all "Access key id" would not fail anything —
  // it would just put values in the wrong boxes.
  //
  // More to the point, `hint` and `secretLabel` are keyed by *credential kind*
  // rather than stated once per provider. The three single-secret kinds share the
  // one `secret_text` field while holding different things — a Cloudflare API
  // token, a Google service-account JSON document, an opaque string — so a single
  // string per provider could be right for at most one of them. That is exactly
  // how the previous revision ended up rendering `service_account` and `api_key`
  // as the same word for eight providers out of ten, and calling Google's **API
  // key** a "service account JSON key". Now each kind states its own name and
  // there is no path by which one shape borrows another's wording.
  //
  // `keyIdLabel` / `keySecretLabel` are the platform's own neutral words for the
  // providers that have no key pair (`google`, `cloudflare`), rather than an
  // invented vendor term: an operator may still register one of those under a key
  // pair identity shape, and the field has to say something truthful. A neutral
  // word is the truthful answer there; a vendor word would not be.
  //
  // Each entry also carries three things about *where the credential comes from*:
  // `consoleUrl` (the provider's console entry), `hintUrl` (a direct page per
  // credential kind, empty where there is none and resolved to the entry), and
  // `help` (what this provider's credential system actually is). The first two
  // turn the hint into something clickable; the third moves knowledge that used to
  // live only in these comments — that DNSPod and Tencent Cloud are not the same
  // key, that Cloudflare has no key pair, that Google's two single-secret kinds
  // are issued on two different pages — in front of the operator. All eleven are
  // filled in except `custom` and the unknown-provider fallback: those have no
  // public page to point at, so they state the help and leave the link out, which
  // is better than pointing at an address invented for them.
  vendorConfig: {
    aliyun: {
      accountIdLabel: "Alibaba Cloud account id",
      accountIdPlaceholder: "1234567890123456",
      consoleUrl: "https://homenew.console.aliyun.com/",
      help: "Alibaba Cloud issues RAM AccessKey pairs (AccessKey ID + AccessKey Secret) as its long-lived credential: one pair reaches every resource in the account, so a RAM user's key is the one to use here rather than the root account's — it can be revoked on its own. There is no service-account key file, and the object storage and DNS faces both authenticate with that same pair.",
      hint: {
        ...neutralHints,
        access_key_pair: "Create it under AccessKey management, behind your avatar in the Alibaba Cloud console.",
      },
      hintUrl: {
        ...neutralHintUrls,
        access_key_pair: "https://ram.console.aliyun.com/manage/ak",
      },
      keyIdLabel: "AccessKey ID",
      keySecretLabel: "AccessKey Secret",
      secretLabel: { ...neutralSecretLabels },
    },
    aws: {
      accountIdLabel: "AWS account id",
      accountIdPlaceholder: "123456789012",
      consoleUrl: "https://console.aws.amazon.com/",
      help: "AWS issues access key pairs from IAM. Use a dedicated IAM user's key rather than the root account's: a root key cannot be narrowed by policy, while a user's can, and it can be deleted without touching the account. One IAM user may hold two keys at a time, which is what makes creating-then-revoking a rotation possible.",
      hint: {
        ...neutralHints,
        access_key_pair: "Create an access key under IAM → Security credentials in the AWS console.",
      },
      hintUrl: {
        ...neutralHintUrls,
        access_key_pair: "https://console.aws.amazon.com/iam/home#/security_credentials",
      },
      keyIdLabel: "Access Key ID",
      keySecretLabel: "Secret Access Key",
      secretLabel: { ...neutralSecretLabels },
    },
    azure: {
      accountIdLabel: "Subscription id",
      accountIdPlaceholder: "00000000-0000-0000-0000-000000000000",
      consoleUrl: "https://portal.azure.com/",
      help: "Azure's long-lived credential is the client secret created under Microsoft Entra ID → App registrations, and it is only usable together with that application's Application (client) ID — so both fields must come from the same app registration. Client secrets expire, so they have to be recreated and rotated here. Note that a subscription id and an app registration are two different things: the former lives under Subscriptions, and using it here would point the credential at another account.",
      hint: {
        ...neutralHints,
        access_key_pair: "Create a client secret under Microsoft Entra ID → App registrations in the Azure portal.",
      },
      hintUrl: {
        ...neutralHintUrls,
        access_key_pair:
          "https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade",
      },
      keyIdLabel: "Application (client) ID",
      keySecretLabel: "Client secret",
      secretLabel: { ...neutralSecretLabels },
    },
    // Cloudflare has no key pair: it issues API tokens (bearer tokens in effect)
    // and a Global API Key (an opaque string), so those two kinds each have their
    // own page and their own name, while the pair column keeps neutral words.
    // Both kinds happen to live on the one profile page — the Global API Key is a
    // section of it — so their two URLs are the same on purpose, not by copy-paste.
    cloudflare: {
      accountIdLabel: "Account id",
      accountIdPlaceholder: "0123456789abcdef0123456789abcdef",
      consoleUrl: "https://dash.cloudflare.com/",
      help: "Cloudflare issues no key pair: its two long-lived credentials are the API token and the Global API Key, both reached from My Profile → API Tokens. The token is a bearer token whose permissions can be narrowed per zone and per operation; the Global API Key carries the account's own permissions wholesale and never expires, which is why Cloudflare itself recommends tokens for new integrations.",
      hint: {
        ...neutralHints,
        bearer_token: "Create it under My Profile → API Tokens in the Cloudflare dashboard.",
        secret_text: "Read it under My Profile → API Keys → Global API Key in the Cloudflare dashboard.",
      },
      hintUrl: {
        ...neutralHintUrls,
        bearer_token: "https://dash.cloudflare.com/profile/api-tokens",
        secret_text: "https://dash.cloudflare.com/profile/api-tokens",
      },
      keyIdLabel: "Access key id",
      keySecretLabel: "Secret access key",
      secretLabel: {
        ...neutralSecretLabels,
        bearer_token: "API token",
        secret_text: "Global API key",
      },
    },
    custom: {
      accountIdLabel: "Provider-side account id",
      accountIdPlaceholder: "account-id",
      // This one has no page to point at, and that is the design rather than an
      // omission: both `consoleUrl` and `neutralHintUrls` are empty, so the page
      // renders the help and no link. Inventing an address would be worse than
      // offering none — the operator would land on a page with nothing to do with
      // their provider and believe they had followed the directions.
      consoleUrl: "",
      help: "A custom provider's credentials are whatever you define them to be, and this platform assumes nothing about them: create a key pair or a secret following your provider's own documentation and paste it below. There is no public page to link to for this one, so no link is offered.",
      hint: { ...neutralHints },
      hintUrl: { ...neutralHintUrls },
      keyIdLabel: "Access key id",
      keySecretLabel: "Secret access key",
      secretLabel: { ...neutralSecretLabels },
    },
    // DNSPod and Tencent Cloud are **not the same key**, even though both belong to
    // Tencent: a Tencent Cloud CAM key (`SecretId` + `SecretKey`) drives the whole
    // Tencent Cloud account, while a DNSPod Token (`Key id` + `Token`) can only edit
    // DNS records. This platform's DNS adapter speaks the DNSPod Token line
    // (`dnsapi.cn`, DNSPod API 2.0), so these two labels are DNSPod's own words;
    // calling them `SecretId` / `SecretKey` would send the operator to fetch a key
    // the adapter cannot use.
    dnspod: {
      accountIdLabel: "DNSPod account id",
      accountIdPlaceholder: "13490",
      consoleUrl: "https://console.dnspod.cn/",
      help: "DNSPod and Tencent Cloud are not the same key, even though both belong to Tencent: a DNSPod Token (Key id + Token) can only edit DNS records, while a Tencent Cloud SecretId / SecretKey drives the whole Tencent Cloud account. This platform's DNS adapter speaks the DNSPod Token line, so use the names on this page rather than fetching a key from Tencent Cloud that the adapter cannot use. The token is shown in clear text once, at creation.",
      hint: {
        ...neutralHints,
        access_key_pair: "Create a DNSPod Token under Key Management in the DNSPod account centre (it grants DNS records only).",
      },
      hintUrl: {
        ...neutralHintUrls,
        access_key_pair: "https://console.dnspod.cn/account/token",
      },
      keyIdLabel: "Key id",
      keySecretLabel: "Token",
      secretLabel: { ...neutralSecretLabels },
    },
    // Google's two single-secret kinds each have their own page and are the most
    // easily conflated: a service-account key is a whole JSON document, an API key
    // is an opaque string. The previous revision called both a "service account
    // JSON key", sending an operator who chose *API key* to paste a JSON file.
    google: {
      accountIdLabel: "Project id",
      accountIdPlaceholder: "my-project-123456",
      consoleUrl: "https://console.cloud.google.com/",
      help: "Google Cloud has two independent credentials, and the identity shape picks which one: a service account's key is a whole JSON key file, an API key is an opaque string. They are issued on different pages and are not interchangeable — pasting a JSON document into the API key field does not produce a usable credential.",
      hint: {
        ...neutralHints,
        secret_text: "Create it under APIs & Services → Credentials → API keys in the Google Cloud console.",
        service_account_json: "Create a JSON key under IAM & Admin → Service Accounts → Keys in the Google Cloud console.",
      },
      hintUrl: {
        ...neutralHintUrls,
        secret_text: "https://console.cloud.google.com/apis/credentials",
        service_account_json: "https://console.cloud.google.com/iam-admin/serviceaccounts",
      },
      keyIdLabel: "Access key id",
      keySecretLabel: "Secret access key",
      secretLabel: {
        ...neutralSecretLabels,
        secret_text: "API key",
      },
    },
    huawei: {
      accountIdLabel: "Huawei Cloud account name",
      accountIdPlaceholder: "hw-account",
      consoleUrl: "https://console.huaweicloud.com/",
      help: "Huawei Cloud issues AK/SK access keys under My Credentials → Access Keys, reached from the user name menu at the top right of the console. An account may hold two access keys at most, and the SK is downloadable once, at creation (`credentials.csv`) — once the dialog closes it cannot be retrieved again, so save it then.",
      hint: {
        ...neutralHints,
        access_key_pair: "Create it under My Credentials → Access Keys in the Huawei Cloud console.",
      },
      hintUrl: {
        ...neutralHintUrls,
        access_key_pair: "https://console.huaweicloud.com/iam/?locale=zh-cn#/mine/accessKey",
      },
      keyIdLabel: "Access Key ID (AK)",
      keySecretLabel: "Secret Access Key (SK)",
      secretLabel: { ...neutralSecretLabels },
    },
    minio: {
      accountIdLabel: "Deployment label",
      accountIdPlaceholder: "minio-prod",
      // Self-hosted: there is no vendor console, so the link lands on MinIO's own
      // documentation for access keys rather than on a "MinIO console" that does
      // not exist. The operator's MinIO Console is on whatever host they deployed,
      // and only they know it.
      consoleUrl:
        "https://min.io/docs/minio/linux/administration/identity-access-management/minio-user-management.html#access-keys",
      help: "MinIO is self-hosted object storage with no vendor console this page can open: an access key is created by the deployment's administrator, either on the Access Keys page of their own MinIO Console or with an mc admin command. Ask them for a pair — once created, the secret key can never be read again, only reissued.",
      hint: {
        ...neutralHints,
        access_key_pair: "Handed out by whoever deployed the MinIO instance, when the service account is created.",
      },
      hintUrl: { ...neutralHintUrls },
      keyIdLabel: "Access Key",
      keySecretLabel: "Secret Key",
      secretLabel: { ...neutralSecretLabels },
    },
    tencent: {
      accountIdLabel: "Tencent Cloud root APPID",
      accountIdPlaceholder: "1300000000",
      consoleUrl: "https://console.cloud.tencent.com/",
      help: "Tencent Cloud issues key pairs (SecretId + SecretKey) under Access Management (CAM) → API Key Management. The root account's key drives the entire Tencent Cloud account, so a sub-user's is the one to use here. Note that DNSPod's record key is not this one: if all you need is domain resolution, pick DNSPod as the provider instead.",
      hint: {
        ...neutralHints,
        access_key_pair: "Create it under Access Management → API Key Management in the Tencent Cloud console.",
      },
      hintUrl: {
        ...neutralHintUrls,
        access_key_pair: "https://console.cloud.tencent.com/cam/capi",
      },
      keyIdLabel: "SecretId",
      keySecretLabel: "SecretKey",
      secretLabel: { ...neutralSecretLabels },
    },
    volcengine: {
      accountIdLabel: "VolcEngine account id",
      accountIdPlaceholder: "2100000000",
      consoleUrl: "https://console.volcengine.com/",
      help: "VolcEngine issues AK/SK access keys under Access Control → Key Management. An account may hold two access keys at a time, and the Secret Access Key is shown once, in the creation dialog — it cannot be viewed again afterwards.",
      hint: {
        ...neutralHints,
        access_key_pair: "Create it under Access Control → Key Management in the VolcEngine console.",
      },
      hintUrl: {
        ...neutralHintUrls,
        access_key_pair: "https://console.volcengine.com/iam/keymanage",
      },
      keyIdLabel: "Access Key ID (AK)",
      keySecretLabel: "Secret Access Key (SK)",
      secretLabel: { ...neutralSecretLabels },
    },
  },
  // The server accepts more vendor codes than the picker offers (`vendor_code` is
  // only shape-checked), so the form still has to render for one this build has
  // never heard of. It uses the platform's own neutral words rather than borrowing
  // a specific provider's term, which would be asserting a fact about a provider
  // nobody here has seen.
  vendorFallbackConfig: {
    accountIdLabel: "Provider-side account id",
    accountIdPlaceholder: "account-id",
    // This build has never heard of the provider, so there is no page to point at:
    // borrowing a vendor's address would be asserting a fact about a provider
    // nobody here has seen. The help is still stated, and what it states is that
    // this build does not know — which is more useful than leaving it blank.
    consoleUrl: "",
    help: "This build does not recognise this provider, so it cannot say where the credential comes from. Create it following that provider's own documentation and fill it in below; no link is offered here.",
    hint: { ...neutralHints },
    hintUrl: { ...neutralHintUrls },
    keyIdLabel: "Access key id",
    keySecretLabel: "Secret access key",
    secretLabel: { ...neutralSecretLabels },
  },
};
