import type {
  SdkworkIamCloudAccountConsoleMessages,
  SdkworkIamCloudAccountKindHints,
  SdkworkIamCloudAccountSecretLabels,
} from "../../../../types/cloud-account-console-messages";

/**
 * 凭据类型 → 到哪里取，用平台自己的说法。
 *
 * 用于服务商没有专门页面的类型：十个服务商里有六个既不签发 Bearer 令牌、也不签发服务账号
 * 密钥文件。但身份形态选择器与服务商选择器是两个独立的轴，契约里没有任何一处规定哪个服务商
 * 支持哪种形态，所以表单仍然必须能渲染这些组合。诚实的答案是说明该服务商不签发这种凭据，
 * 而不是留一个让操作者自己猜的空白。
 */
const neutralHints: SdkworkIamCloudAccountKindHints = {
  access_key_pair: "按该服务商的控制台创建访问密钥对。",
  bearer_token: "该服务商不签发可长期使用的 Bearer 令牌；请改选它实际提供的凭据形态。",
  secret_text: "按该服务商的文档创建该凭据。",
  service_account_json: "按该服务商的文档创建服务账号密钥文件。",
};

/**
 * 三种单密钥类型 → 它们的字段名，用平台自己的说法。
 *
 * 按类型分键而不是一家一个字符串，这正是关键所在：它们三个共用同一个 `secret_text` 字段，
 * 里面装的却不是同一种东西，一个字符串最多只对其中一种成立——上一版就是这么把 Cloudflare 的
 * API 令牌与 Google 的服务账号 JSON 叫成了同一个名字。
 */
const neutralSecretLabels: SdkworkIamCloudAccountSecretLabels = {
  bearer_token: "Bearer 令牌",
  secret_text: "密钥文本",
  service_account_json: "服务账号 JSON 密钥",
};

export const sdkworkIamCloudAccountConsoleMessages: SdkworkIamCloudAccountConsoleMessages = {
  adminSubtitle: "查看并管理调用方有权访问的归属级别，包括对全体租户生效的平台级默认账号。",
  actions: {
    cancel: "取消",
    close: "关闭",
    create: "新建账号",
    delete: "删除账号",
    detail: "详情",
    disable: "停用",
    edit: "编辑",
    enable: "启用",
    loadMore: "加载更多",
    resolve: "预览解析",
    save: "保存",
    setDefault: "设为默认",
  },
  accountType: {
    api_key: "API 密钥",
    federated_identity:
      "联合身份",
    long_term_key: "长期密钥",
    managed_identity:
      "托管身份",
    service_account: "服务账号",
    service_linked_role:
      "服务关联角色",
    temporary_credential: "临时凭据",
  },
  capabilityAny: "任意能力",
  capability: {
    cdn: "CDN 加速",
    certificate: "证书",
    compute: "计算",
    container_registry: "容器镜像",
    dns: "DNS 解析",
    email: "邮件",
    object_storage: "对象存储",
    sms: "短信",
  },
  columns: {
    accountCode: "账号标识",
    actions: "操作",
    credential: "凭据",
    displayName: "显示名称",
    environment: "环境",
    isDefault: "默认",
    maskedLabel: "掩码",
    scope: "归属级别",
    status: "状态",
    vendor: "服务商",
  },
  create: {
    accountCode: "账号标识",
    accountCodePlaceholder: "prod-storage",
    // 不在这里举例说明别的服务商怎么称呼这个字段。上面那行的标签已经是**这个**服务商的叫法
    // （阿里云账号 ID / 订阅 ID / 项目 ID 都由 `vendorConfig.accountIdLabel` 给出），在它下面
    // 再列一串别家的名字，等于在讲一个跟眼前这个服务商无关的事实——和把腾讯云的框标成
    // 「AccessKey ID」是同一类错误，只是反着来。
    accountIdHint: "可选。该账号在服务商自身的标识，用来核对这份凭据属于哪个账号。",
    accountType: "身份形态",
    capabilities: "能力",
    capabilitiesHint: "无需选择：不指定能力时，该账号可服务该服务商下的任意能力。",
    // 凭据区只说**当前选中**的这一种身份形态。一段话把四种形态都列一遍，操作者得先读四条
    // 才能挑出跟自己有关的那一条，而且一旦选中的不是第一条，这行字读起来就是在描述不是
    // 眼前的东西。不保存密钥的那三种形态不在这里：它们要的是「为什么什么都不用填」，那是
    // `credentialNotNeeded` 逐条负责的。
    credentialShapeHint: {
      long_term_key: "长期密钥用一对：标识与密钥各占一栏，都由服务商长期签发，需要自行轮换。",
      temporary_credential:
        "临时凭据在密钥对之外还要会话令牌：三段由服务商同一次签发，少了令牌就无法证明凭据来自服务商。",
      service_account:
        "服务账号的密钥是一整份密钥文件：把整段内容整份粘贴到下面这一栏，不要只取其中某个字段。",
      api_key: "API 密钥是一段不透明字符串：把服务商签发的那一段整段粘贴进来即可。",
    },
    credentialMissingNote:
      "尚未填写密钥：该账号保存后不会被解析到，直到在这里或账号详情里写入凭据。",
    // 三种「本平台不保存密钥」的身份形态各有各的原因，逐条写清楚，不共用一句话：
    // 服务关联角色是云服务自己代入的，联邦身份是外部签发方签的断言在服务商侧换来的，
    // 托管身份根本不含密钥材料。共用一句会让持有 SAML 断言的人以为无处可配，
    // 也会让登记角色的人不知道该去服务商控制台把角色授给谁。
    credentialNotNeeded: {
      service_linked_role:
        "服务关联角色由云服务代表账号所有者行使时自行代入，没有可轮换的静态密钥，所以这里不需要填写；请在服务商控制台把该角色授予需要它的云服务。",
      federated_identity:
        "联合身份（OIDC / SAML）用的是外部签发方签出的断言，由服务商侧换取短期凭据，本平台不保存该断言，所以这里不需要填写；请在服务商控制台配置签发方与信任策略。",
      managed_identity:
        "托管身份由平台挂载在云资源上，完全不含密钥材料，所以这里不需要填写；请在服务商控制台把该身份绑定到对应的云资源。",
    },
    credentialNotNeededUnknown:
      "该身份形态不向本平台登记密钥（具体原因本版本尚未收录），所以这里不需要填写；请在服务商控制台完成授权。",
    credentialSection: "凭据",
    description: "登记一个服务商账号，并把调用它所需的凭据一并写入。",
    displayName: "显示名称",
    displayNamePlaceholder: "生产对象存储",
    environment: "环境",
    // 归属级别只有在调用方可能操作多个级别时才是选择器；控制台上只有个人一级，那时表单里
    // 根本没有级别控件，「此级别」就没有可见的指代对象。把级别名字写进来，两种形态都读得通。
    isDefault: "设为该服务商在归属级别「{scope}」与环境下的默认账号",
    organizationId: "组织 ID",
    organizationIdPlaceholder: "org-1",
    ownership: "归属级别",
    provider: "服务商",
    region: "地域",
    regionClear: "清除地域",
    regionEmpty: "该服务商没有匹配的地域；直接输入的值同样会被保存。",
    regionHint:
      "候选地域来自所选服务商；也可直接输入它未列出的地域标识。切换服务商时，不属于新服务商的地域会被清空。",
    // cloudflare / minio / custom 三家没有任何候选地域，这一栏退化成纯输入框，上面那句
    // 「候选地域来自所选服务商」在那里第一句就是假的——它承诺了一份并不存在的清单。
    // 后半句照旧保留，而且不是顺手抄的：`iamCloudAccountVendorAcceptsRegion` 对这三家
    // 的任何非空值都返回 false，所以**切到**它们会清掉已填的地域，而操作者从一个自由输入框
    // 上看不出这件事。
    regionHintNoCandidates:
      "该服务商不提供候选地域，直接输入地域标识即可；切换服务商时，不属于新服务商的地域会被清空。",
    regionPlaceholder: "选择或输入地域标识",
    submit: "登记账号",
    title: "登记云账号",
  },
  credentials: {
    add: "添加凭据",
    addTitle: "添加凭据",
    empty: "尚未存储凭据。",
    kind: "凭据类型",
    name: "凭据槽位",
    namePlaceholder: "default",
    revoke: "吊销",
    rotationApplies: "该身份形态需要轮换。",
    sessionToken: "会话令牌",
    sessionTokenHint: "临时凭据的第三段：服务商签发密钥时一并给出，缺少它就无法证明凭据来自服务商。",
    store: "存储凭据",
    subtitle: "在已有槽位上再次写入即为轮换：旧记录转为已取代，消费方无需改配置即可取到新值。密钥只写不读。",
    title: "凭据",
  },
  credentialKind: {
    access_key_pair: "访问密钥对",
    bearer_token: "Bearer 令牌",
    secret_text: "密钥文本",
    service_account_json: "服务账号 JSON",
  },
  detail: {
    deleteDescription: "删除「{name}」？该账号及其凭据将不再参与解析，此操作不可撤销。",
    editTitle: "编辑账号",
    factsTitle: "账号信息",
    resolutionEmpty: "没有任何可见级别的账号能服务该服务商与能力。",
    resolutionTitle: "该需求的解析结果",
  },
  environment: {
    development: "开发",
    production: "生产",
    sandbox: "沙箱",
  },
  errors: {
    createAccount: "登记云账号失败",
    credentialAfterCreate:
      "账号「{name}」已登记，但凭据没有写入：{reason}。请在账号详情里重试写入凭据，否则该账号不会参与解析。",
    deleteAccount: "删除云账号失败",
    loadAccounts: "加载云账号失败",
    loadCredentials: "加载凭据失败",
    resolve: "解析云账号失败",
    revokeCredential: "吊销凭据失败",
    setDefault: "设为默认失败",
    storeCredential: "存储凭据失败",
    updateAccount: "更新云账号失败",
  },
  list: {
    credentialConfigured: "已配置 {count} 条",
    credentialMissing: "未配置",
    default: "默认",
    emptyDescription: "点右上角「新建账号」登记第一个云账号，并在同一张表单里写入它调用服务商所需的凭据。",
    emptyTitle: "还没有云账号",
    showingOf: "已加载 {loaded} / 共 {total}",
  },
  // 地域名按服务商分组，不能拉平：`ap-southeast-1` 在阿里云与 AWS 是新加坡，
  // 在华为云却是中国香港；`ap-southeast-3` 在阿里云是马来西亚，在华为云是新加坡。
  // 同一串码在不同服务商指的不是同一个地方，所以这里的键必须带上服务商。
  region: {
    aliyun: {
      "ap-northeast-1": "日本（东京）",
      "ap-south-1": "印度（孟买）",
      "ap-southeast-1": "新加坡",
      "ap-southeast-2": "澳大利亚（悉尼）",
      "ap-southeast-3": "马来西亚（吉隆坡）",
      "ap-southeast-5": "印度尼西亚（雅加达）",
      "cn-beijing": "华北2（北京）",
      "cn-chengdu": "西南1（成都）",
      "cn-guangzhou": "华南3（广州）",
      "cn-hangzhou": "华东1（杭州）",
      "cn-heyuan": "华南2（河源）",
      "cn-hongkong": "中国香港",
      "cn-qingdao": "华北1（青岛）",
      "cn-shanghai": "华东2（上海）",
      "cn-shenzhen": "华南1（深圳）",
      "cn-wulanchabu": "华北6（乌兰察布）",
      "cn-zhangjiakou": "华北3（张家口）",
      "eu-central-1": "德国（法兰克福）",
      "eu-west-1": "英国（伦敦）",
      "us-east-1": "美国（弗吉尼亚）",
      "us-west-1": "美国（硅谷）",
    },
    aws: {
      "ap-east-1": "亚太（中国香港）",
      "ap-northeast-1": "亚太（东京）",
      "ap-northeast-2": "亚太（首尔）",
      "ap-northeast-3": "亚太（大阪）",
      "ap-south-1": "亚太（孟买）",
      "ap-southeast-1": "亚太（新加坡）",
      "ap-southeast-2": "亚太（悉尼）",
      "ca-central-1": "加拿大（中部）",
      "cn-north-1": "中国（北京）",
      "cn-northwest-1": "中国（宁夏）",
      "eu-central-1": "欧洲（法兰克福）",
      "eu-west-1": "欧洲（爱尔兰）",
      "eu-west-2": "欧洲（伦敦）",
      "sa-east-1": "南美洲（圣保罗）",
      "us-east-1": "美国东部（弗吉尼亚北部）",
      "us-east-2": "美国东部（俄亥俄）",
      "us-west-1": "美国西部（加利福尼亚北部）",
      "us-west-2": "美国西部（俄勒冈）",
    },
    azure: {
      "centralus": "美国中部",
      "chinaeast2": "中国东部 2",
      "chinanorth3": "中国北部 3",
      "eastasia": "东亚（中国香港）",
      "eastus": "美国东部",
      "eastus2": "美国东部 2",
      "germanywestcentral": "德国中西部",
      "japaneast": "日本东部",
      "japanwest": "日本西部",
      "koreacentral": "韩国中部",
      "northeurope": "北欧（爱尔兰）",
      "southeastasia": "东南亚（新加坡）",
      "uksouth": "英国南部",
      "westeurope": "西欧（荷兰）",
      "westus2": "美国西部 2",
    },
    // 这三个服务商没有地域：Cloudflare 是全球任播网络、MinIO 装在哪就是哪、
    // 自定义服务商无从得知。空表是结论，不是待补的缺口。
    cloudflare: {},
    custom: {},
    google: {
      "asia-east1": "亚洲东部 1（中国台湾）",
      "asia-east2": "亚洲东部 2（中国香港）",
      "asia-northeast1": "亚洲东北部 1（日本东京）",
      "asia-northeast2": "亚洲东北部 2（日本大阪）",
      "asia-northeast3": "亚洲东北部 3（韩国首尔）",
      "asia-south1": "亚洲南部 1（印度孟买）",
      "asia-southeast1": "亚洲东南部 1（新加坡）",
      "asia-southeast2": "亚洲东南部 2（印度尼西亚雅加达）",
      "europe-west1": "欧洲西部 1（比利时）",
      "europe-west2": "欧洲西部 2（英国伦敦）",
      "europe-west3": "欧洲西部 3（德国法兰克福）",
      "europe-west4": "欧洲西部 4（荷兰）",
      "us-central1": "美国中部 1（艾奥瓦）",
      "us-east1": "美国东部 1（南卡罗来纳）",
      "us-west1": "美国西部 1（俄勒冈）",
    },
    huawei: {
      "ap-southeast-1": "中国香港",
      "ap-southeast-2": "泰国曼谷",
      "ap-southeast-3": "新加坡",
      "cn-east-2": "华东-上海二",
      "cn-east-3": "华东-上海一",
      "cn-north-1": "华北-北京一",
      "cn-north-4": "华北-北京四",
      "cn-south-1": "华南-广州",
      "cn-southwest-2": "西南-贵阳一",
    },
    minio: {},
    tencent: {
      "ap-beijing": "北京",
      "ap-bangkok": "曼谷",
      "ap-chengdu": "成都",
      "ap-chongqing": "重庆",
      "ap-guangzhou": "广州",
      "ap-hongkong": "中国香港",
      "ap-jakarta": "雅加达",
      "ap-mumbai": "孟买",
      "ap-nanjing": "南京",
      "ap-seoul": "首尔",
      "ap-shanghai": "上海",
      "ap-singapore": "新加坡",
      "ap-tokyo": "东京",
      "eu-frankfurt": "法兰克福",
      "na-ashburn": "弗吉尼亚",
      "na-siliconvalley": "硅谷",
      "sa-saopaulo": "圣保罗",
    },
    volcengine: {
      "cn-beijing": "华北2（北京）",
      "cn-guangzhou": "华南1（广州）",
      "cn-hongkong": "中国香港",
      "cn-shanghai": "华东2（上海）",
    },
  },
  scope: {
    organization: "组织",
    platform: "平台",
    tenant: "租户",
    user: "个人",
  },
  status: {
    active: "已启用",
    deleted: "已删除",
    disabled: "已停用",
  },
  // The credential mechanics (write-once, rotate-in-place) are stated once, in
  // `credentials.subtitle`, where the fields that do it are. Repeating them here
  // made the page explain the same rule twice, 200px apart.
  subtitle: "登记并管理你自己的服务商账号；凭据在登记时一并写入，之后可在账号详情里轮换。",
  title: "云账号",
  vendor: {
    aliyun: "阿里云",
    aws: "AWS",
    azure: "Microsoft Azure",
    cloudflare: "Cloudflare",
    custom: "自定义",
    google: "Google 云",
    huawei: "华为云",
    minio: "MinIO",
    tencent: "腾讯云",
    volcengine: "火山引擎",
  },
  // 每个服务商对自己的密钥有自己的叫法，而且这些叫法会**贴到表单标签上**供操作者照着抄：
  // 阿里云是 `AccessKey ID`、腾讯云是 `SecretId`、Azure 是 `应用（客户端）ID`、MinIO 是
  // `Secret Key`。统一写成「访问密钥 ID」并不会报错，只会让操作者把值贴进错的框里。
  //
  // 更要紧的是 `hint` 与 `secretLabel` **按凭据类型分键**，不是一家一个字符串。三种单密钥
  // 类型共用同一个 `secret_text` 字段却装着不同的东西：Cloudflare 的 API 令牌、Google 的
  // 服务账号 JSON 文件、以及一个不透明字符串。一个字符串最多只对其中一种成立——上一版就是
  // 一家一个 `secretTextLabel`，结果十个服务商里有八个把 `service_account` 和 `api_key`
  // 两种形态渲染成同一句「密钥文本」，而 Google 反过来把它的 **API 密钥**叫成了
  // 「服务账号 JSON 密钥」。现在每种类型各说各的名字，没有借到别人措辞的路径。
  //
  // `keyIdLabel` / `keySecretLabel` 对**没有密钥对**的服务商（google / cloudflare）是平台自己的
  // 中性措辞，不是给它们编一个不存在的厂商术语：操作者仍可能给它们选「长期密钥」形态，
  // 那时字段总得说点什么，而说错的厂商词比中性词更糟。
  vendorConfig: {
    aliyun: {
      accountIdLabel: "阿里云账号 ID",
      accountIdPlaceholder: "1234567890123456",
      hint: {
        ...neutralHints,
        access_key_pair: "在阿里云控制台右上角头像的「AccessKey 管理」里创建。",
      },
      keyIdLabel: "AccessKey ID",
      keySecretLabel: "AccessKey Secret",
      secretLabel: { ...neutralSecretLabels },
    },
    aws: {
      accountIdLabel: "AWS 账号 ID",
      accountIdPlaceholder: "123456789012",
      hint: {
        ...neutralHints,
        access_key_pair: "在 AWS 控制台的「IAM → 安全凭证」里创建访问密钥。",
      },
      keyIdLabel: "Access Key ID",
      keySecretLabel: "Secret Access Key",
      secretLabel: { ...neutralSecretLabels },
    },
    azure: {
      accountIdLabel: "订阅 ID",
      accountIdPlaceholder: "00000000-0000-0000-0000-000000000000",
      hint: {
        ...neutralHints,
        access_key_pair: "在 Azure 门户的「Microsoft Entra ID → 应用注册」里创建客户端密钥。",
      },
      keyIdLabel: "应用（客户端）ID",
      keySecretLabel: "客户端密钥",
      secretLabel: { ...neutralSecretLabels },
    },
    // Cloudflare 没有密钥对：它签发的是 API 令牌（本质是 Bearer）和全局 API 密钥（一个
    // 不透明字符串），所以这两条单密钥类型各有自己的页面与叫法，密钥对那一栏保持中性措辞。
    cloudflare: {
      accountIdLabel: "账号 ID",
      accountIdPlaceholder: "0123456789abcdef0123456789abcdef",
      hint: {
        ...neutralHints,
        bearer_token: "在 Cloudflare 控制台的「我的个人资料 → API 令牌」里创建。",
        secret_text: "在 Cloudflare 控制台的「我的个人资料 → API 密钥 → 全局 API 密钥」里查看。",
      },
      keyIdLabel: "访问密钥 ID",
      keySecretLabel: "访问密钥 Secret",
      secretLabel: {
        ...neutralSecretLabels,
        bearer_token: "API 令牌",
        secret_text: "全局 API 密钥",
      },
    },
    custom: {
      accountIdLabel: "服务商侧账号标识",
      accountIdPlaceholder: "account-id",
      hint: { ...neutralHints },
      keyIdLabel: "访问密钥 ID",
      keySecretLabel: "访问密钥 Secret",
      secretLabel: { ...neutralSecretLabels },
    },
    // Google 的两种单密钥类型**各有页面**，也最容易被混为一谈：服务账号密钥是一整份 JSON
    // 文件，API 密钥是一个不透明字符串。上一版把两者都写成「服务账号 JSON 密钥」，等于让
    // 选了「API 密钥」形态的操作者去粘贴一份 JSON。
    google: {
      accountIdLabel: "项目 ID",
      accountIdPlaceholder: "my-project-123456",
      hint: {
        ...neutralHints,
        secret_text: "在 Google Cloud 控制台的「API 和服务 → 凭据 → API 密钥」里创建。",
        service_account_json: "在 Google Cloud 控制台的「IAM 和管理 → 服务账号 → 密钥」里创建 JSON 密钥。",
      },
      keyIdLabel: "访问密钥 ID",
      keySecretLabel: "访问密钥 Secret",
      secretLabel: {
        ...neutralSecretLabels,
        secret_text: "API 密钥",
      },
    },
    huawei: {
      accountIdLabel: "华为云账号名",
      accountIdPlaceholder: "hw-account",
      hint: {
        ...neutralHints,
        access_key_pair: "在华为云控制台的「我的凭证 → 访问密钥」里创建。",
      },
      keyIdLabel: "Access Key ID（AK）",
      keySecretLabel: "Secret Access Key（SK）",
      secretLabel: { ...neutralSecretLabels },
    },
    minio: {
      accountIdLabel: "部署标识",
      accountIdPlaceholder: "minio-prod",
      hint: {
        ...neutralHints,
        access_key_pair: "由部署 MinIO 的管理员在创建服务账号时给出。",
      },
      keyIdLabel: "Access Key",
      keySecretLabel: "Secret Key",
      secretLabel: { ...neutralSecretLabels },
    },
    tencent: {
      accountIdLabel: "腾讯云主账号 APPID",
      accountIdPlaceholder: "1300000000",
      hint: {
        ...neutralHints,
        access_key_pair: "在腾讯云控制台的「访问管理 → API 密钥管理」里创建。",
      },
      keyIdLabel: "SecretId",
      keySecretLabel: "SecretKey",
      secretLabel: { ...neutralSecretLabels },
    },
    volcengine: {
      accountIdLabel: "火山引擎账号 ID",
      accountIdPlaceholder: "2100000000",
      hint: {
        ...neutralHints,
        access_key_pair: "在火山引擎控制台的「访问控制 → 密钥管理」里创建。",
      },
      keyIdLabel: "Access Key ID（AK）",
      keySecretLabel: "Secret Access Key（SK）",
      secretLabel: { ...neutralSecretLabels },
    },
  },
  // 服务端接受的 vendor_code 比选择器提供的多（列只校验 `^[a-z][a-z0-9_]{1,31}$`），
  // 所以表单必须能为一个本版本不认识的服务商渲染。用平台自己的中性措辞，不借用一个具体厂商的
  // 术语——把「AccessKey ID」按到一个没听过的厂商头上，等于替它编了个事实。
  vendorFallbackConfig: {
    accountIdLabel: "服务商侧账号标识",
    accountIdPlaceholder: "account-id",
    hint: { ...neutralHints },
    keyIdLabel: "访问密钥 ID",
    keySecretLabel: "访问密钥 Secret",
    secretLabel: { ...neutralSecretLabels },
  },
};

