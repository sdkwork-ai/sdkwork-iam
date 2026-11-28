# 应用企业授权（Application Enterprise Authorization）

> 状态：active ｜ 权威范围：`iam_application_enterprise_order` / `_link` / `_seat` / `_event`
> ｜ 对应迁移：`0054_iam_application_enterprise_order` ｜ 产品对标：WorkBuddy「企业单管理」

## 1. 解决什么

一个已发布的应用要交付给**另一个企业**使用，需要的不只是一个安装记录，而是一份可审计的授权：

- 授权给哪家企业、由谁发布、有效期多长；
- 企业管理员如何确认（不能由发布方单方面生效）；
- 全员可用还是按席位分配，席位上限是多少；
- 到期、提前终止、取消各走哪条路径，谁在什么时间做的。

这些事实属于**授权**，不属于应用本身，因此落在 IAM，而不是 `sdkwork-deployments`。应用侧只声明
`distribution_scope = enterprise`（意图），真正可用的依据是本域的一张 `active` 订单。

订单的 `application_id` 使用部署应用锚点（安装记录的 `deploy_application_id`），不是各租户独立的
IAM runtime `app_id`。运行时通过受让企业的安装记录关联订单，避免把发布方租户误当成授权对象。

## 2. 两个租户平面

| 列 | 含义 |
| --- | --- |
| `tenant_id` | **发布方**（拥有应用的租户），订单的写属主 |
| `enterprise_tenant_id` | **被授权企业**（受让方） |
| `organization_id` | 发布方侧的组织收窄（`0` = 租户级） |
| `enterprise_organization_id` | 受让方侧的组织收窄（`0` = 整个企业） |

发布方查询按 `tenant_id` 过滤，企业侧查询按 `enterprise_tenant_id` 过滤。两条索引
（`ix_..._publisher` / `ix_..._enterprise`）就是这两个问题的答案，不需要关联表。

席位行的 `tenant_id` 是**受让企业**，因为席位是企业管理员对自己成员分配的；服务在写席位时校验
`seat.tenant_id = order.enterprise_tenant_id`。`database/contract/sql-scope.json` 为企业平面的
三条语句登记了具名例外（`contains: "enterprise_tenant_id = $1"`），理由写在例外里：在这些语句上绑定
`tenant_id` 会取到合同错误的一侧。

## 3. 状态机（数据库强制）

```
PENDING_AUTHORIZATION ──企业管理员确认链接──▶ ACTIVE ──发布方发起终止──▶ PENDING_TERMINATION
        │                                      │                              │
     取消│                                   到期│                          企业确认│
        ▼                                      ▼                              ▼
    CANCELLED                              TERMINATED                      TERMINATED
```

`ck_iam_application_enterprise_order_lifecycle` 把状态与时间戳绑在一起：

| 状态 | `authorized_at` | `terminated_at` |
| --- | --- | --- |
| `pending_authorization` | NULL | NULL |
| `active` / `pending_termination` | 非空 | NULL |
| `terminated` | 非空 | 非空 |
| `cancelled` | NULL | NULL |

因此「active 但没有授权时间」「terminated 但没有终止时间」在数据库层就无法写入，服务不需要自证。

## 4. 授权链接

- 一个订单同一时刻**每种链接至多一条 active**（`ux_..._link_active`）；重新签发会在同一事务里
  撤销上一条，旧邮件失效。
- 只存 `token_hash = sha256(token)`；明文只在签发响应里出现一次（`linkToken`），之后任何读路径
  都无法重建。链接默认长期有效（`expires_at` 为空），需要窗口的链接种类才会写入过期时间。
- 确认与终止都是**企业管理员**的动作：`POST .../enterprise_order_authorizations` /
  `.../enterprise_order_terminations`，token 放在请求体而不是 URL，避免进入访问日志。
- 服务在消费链接后校验 `order.enterprise_tenant_id = 调用方租户`，所以 A 企业的链接不能被 B 企业
  拿去确认。

## 5. 席位

- 仅 `seat` 模式的 `active` 订单可分配；`all_members` 订单没有席位可分配（`ck_..._seat` 也禁止
  `all_members` 带 `seat_count`）。
- 上限由服务在 `FOR UPDATE` 锁住订单行后按活跃席位计数强制；数据库无法表达聚合上限，这条以
  文档 + 单测记录（`seat quota exceeded`）。
- 用户必须是该企业的活跃成员（`iam_tenant_member.status = 'active'`），否则 `400`。
- 同一用户在同一订单上只能有一条活跃席位（部分唯一索引）；释放后可重新分配。
- 订单终止或到期时，所有活跃席位在同一事务里释放，不允许席位比授权活得更久。

## 6. 事件台账

`iam_application_enterprise_order_event` 是 append-only：`created / link_issued / authorized /
termination_requested / termination_confirmed / expired / cancelled / seat_assigned / seat_released`，
`actor_kind ∈ publisher | enterprise_admin | system`。没有 UPDATE/DELETE 路径，因此订单终止后仍能回答
「谁在什么时候确认、谁释放了哪个席位」。

## 7. 接口面（backend-api）

| 平面 | 操作 | 路径 |
| --- | --- | --- |
| 发布方 | list / create | `GET|POST /backend/v3/api/iam/tenants/{tenantId}/applications/{applicationId}/enterprise_orders` |
| 发布方 | retrieve / cancel / terminate / events | `.../enterprise_orders/{orderId}[/cancel|/terminate|/events]` |
| 企业 | 我获得授权的订单 | `GET /backend/v3/api/iam/tenants/{tenantId}/enterprise_orders` |
| 企业 | 席位 list / assign / release | `.../enterprise_orders/{orderId}/seats[/{seatId}]` |
| 企业 | 确认授权 / 确认终止 | `POST .../enterprise_order_authorizations` / `.../enterprise_order_terminations` |

权限：读 `iam.enterprise_orders.read`，写 `iam.enterprise_orders.manage`（登记在
`iam/modules/iam-kernel/iam.module.manifest.json` 与本仓 permission catalog 种子中）。

## 8. 到期处理

`expire_due_enterprise_orders(limit)` 把 `active` 且 `expires_at <= now()` 的订单转 `terminated`
（`termination_reason = 'expired'`、`actor_kind = system`），同事务释放席位并写 `expired` 事件。
谓词只匹配 `active`，所以重复执行是幂等的。token 签发、发布方/企业订单列表和席位列表会调用该函数
做 lazy reconciliation；部署调度器仍应周期性调用，避免长时间无流量时台账延迟。

运行时授权在用户 token 签发时和每个已验证用户请求的上下文投影时执行：应用没有任何企业订单时
保持既有行为；一旦存在订单，则必须存在未到期、状态为 `active`、组织范围匹配的订单。`all_members`
订单放行匹配范围的成员，`seat` 订单还要求该用户持有匹配范围的 active seat。因此席位释放、订单
终止或到期会立即阻止后续访问，不依赖已签发 token 自然过期。服务账号和 public shared application
token 不套用用户席位规则，仍由各自的安装、作用域和受众策略约束。

## 9. 应用 OAuth 客户端策略（迁移 `0055`）

企业单回答「哪个企业能用」，这一节回答「这个应用以哪个客户端身份被授权」。凭据行
`iam_application_installation_credential` 本来就有 `client_id`、Argon2id 密钥哈希、回调 URL 和
scopes，但运行期从来没有读过它——管理面写、鉴权链路不读，是只写不读的旁路。`0055` 把它补成真正的
客户端策略：

| 列 | 语义 |
| --- | --- |
| `allowed_origins_json` | 可信 Origin 列表；空 = 不限制（所有历史行保持原行为）。非空时 `validate_authorize_request` 要求 `redirect_uri` 的 origin 在列表内；loopback（`127.0.0.1`/`[::1]`/`localhost`）按 RFC 8252 忽略端口 |
| `client_status` | `pending_review` / `enabled` / `rejected` / `disabled`，与 `credential_status`（active/rotated/retired 的密钥生命周期）正交 |
| `review_note` / `reviewed_at` | 审核意见与裁决时间，仅用于展示与回溯 |

**双读顺序（关键）**：`resolve_relying_party_client` 先按原逻辑读
`iam_application_installation.runtime_config_json → oauth.relyingParty`；未命中时才回退到凭据表
（`client_id` 全局唯一 + `credential_status='active'` + `client_status='enabled'` + 安装 `status='enabled'`
+ 已绑定部署应用）。既有安装的行为逐字节不变，而只在凭据表注册的客户端第一次能真正完成授权。

**写路径**：`PUT /backend/v3/api/iam/tenants/{tenantId}/installations/{installationId}/credentials/{credentialId}/policy`
（operationId `installations.credentials.policy.update`，权限 `iam.installations.update`）。请求可只给
`clientStatus`（审核裁决一个字段即可），也可替换 `redirectUris` / `grantedScopes` / `allowedOrigins`；
`reviewNote: null` 清空意见、省略则保留。当安装的 relyingParty 文档**指向同一个 clientId** 时，服务在
同一事务里同步该文档的 `redirectUris`/`allowedScopes`/`allowedOrigins`/`enabled`——否则运行期会继续
用旧白名单；指向别的客户端时不动它（那是另一份注册）。

**默认值**：新凭据默认 `client_status='enabled'`、`allowed_origins=[]`，这是为了不改变既有创建路径的
行为。要做 WorkBuddy 那种「创建后进入审核中」，由调用方在创建后立即写入 `pending_review`，或在后续
迁移里改默认值——这是产品决策，不是数据模型的限制。
