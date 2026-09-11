# IAM Runbooks

Status: active  
Owner: SDKWork maintainers

Operational runbooks for IAM production and staging deployments.

| Runbook | Purpose |
| --- | --- |
| [deployments/runbooks/local-iam-rust.md](../../deployments/runbooks/local-iam-rust.md) | Local gateway, PostgreSQL bootstrap, verification |
| [guides/operator/README.md](../guides/operator/README.md) | Production prerequisites, gateway surfaces, Snowflake node IDs |

## Verification

```powershell
cd E:\sdkwork-space\sdkwork-iam
pnpm run verify
```

## Incident response

1. Check `/readyz` and `/livez` on the IAM gateway assembly.
2. Confirm PostgreSQL connectivity (`SDKWORK_DATABASE_URL`).
3. Review `iam_security_event` and `iam_audit_event` via backend-api (`SdkWorkAuditEventListResponse` / `SdkWorkSecurityEventListResponse`) or the PC admin audit module (`@sdkwork/iam-pc-admin-audit`, debounced `q` search).
4. Ensure production hardening is active (`assert_production_hardening()`).

<!-- scaffold-module-runbooks:index -->
## Docker 运维四件套（bin/ 标准，OPERATIONS_SPEC.md §7）

| Runbook | 内容 |
| --- | --- |
| [deploy.md](deploy.md) / [deploy.en.md](deploy.en.md) | 安装 / 升级 / 回滚 / 下线（bin/docker-deploy.sh + bin/docker-image.sh） |
| [troubleshooting.md](troubleshooting.md) / [troubleshooting.en.md](troubleshooting.en.md) | 症状 → doctor 检查 → 处置 |
| [backup-restore.md](backup-restore.md) / [backup-restore.en.md](backup-restore.en.md) | 备份 / 校验 / 恢复 / 演练（bin/backup.sh） |
| [log-reference.md](log-reference.md) / [log-reference.en.md](log-reference.en.md) | 健康日志特征与失败签名（bin/docker-deploy.sh logs） |
