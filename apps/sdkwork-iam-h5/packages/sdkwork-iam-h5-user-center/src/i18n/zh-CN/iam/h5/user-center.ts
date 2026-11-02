// SDKWORK-IAM-H5-USER-CENTER-I18N: authored fragment (zh-CN).
/**
 * Chinese copy of the user center, annotated with the default locale's type so a
 * missing or extra key fails compilation.
 */
import type { IamH5UserCenterMessages } from "../../../en-US/iam/h5/user-center.js";

export const iamH5UserCenterMessages: IamH5UserCenterMessages = {
  profile: {
    title: "个人资料",
    identitySection: "账号",
    editableSection: "展示信息",
    accountId: "用户 ID",
    username: "用户名",
    email: "邮箱",
    phone: "手机号",
    displayName: "显示名称",
    nickname: "昵称",
    notSet: "未设置",
    editHint: "你的名称会展示给所属组织的其他成员。",
    save: "保存资料",
    saving: "保存中…",
    saved: "资料已保存",
    verificationRequired: "该租户下变更绑定信息需要验证。",
    openPassword: "修改密码",
    openOAuthProviders: "第三方登录",
  },
  password: {
    title: "修改密码",
    oldPassword: "当前密码",
    newPassword: "新密码",
    confirmPassword: "确认新密码",
    hint: "至少 8 位。修改后本设备保持登录。",
    submit: "更新密码",
    submitting: "更新中…",
    changed: "密码已更新",
    errors: {
      "old-password-required": "请输入当前密码。",
      "new-password-too-short": "新密码至少需要 8 位。",
      "confirm-mismatch": "两次输入的新密码不一致。",
    },
  },
  states: {
    errorTitle: "出错了",
    retry: "重试",
    loading: "加载中",
  },
  errors: {
    profile: "无法加载你的资料。",
    save: "无法保存你的资料。",
    password: "无法修改密码。",
  },
};
