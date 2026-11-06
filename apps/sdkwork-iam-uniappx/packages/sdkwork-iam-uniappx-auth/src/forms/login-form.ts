import type { IamLoginInput } from '@sdkwork/iam-uniappx-core';

export interface IamLoginFormValues {
  identifier: string;
  password: string;
  tenantId: string;
  organizationId: string;
}

export interface IamLoginFormErrors {
  identifier?: string;
  password?: string;
}

export interface IamLoginFormState {
  values: IamLoginFormValues;
  errors: IamLoginFormErrors;
  valid: boolean;
}

export interface IamLoginFormController {
  getState(): IamLoginFormState;
  setValue(field: keyof IamLoginFormValues, value: string): IamLoginFormState;
  validate(): IamLoginFormState;
  toLoginInput(): IamLoginInput | null;
  reset(): IamLoginFormState;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const PHONE_PATTERN = /^\+?[0-9][0-9 -]{5,19}$/u;

export const IAM_LOGIN_FORM_ERROR_KEYS = {
  identifierRequired: 'iam.auth.error.identifierRequired',
  identifierInvalid: 'iam.auth.error.identifierInvalid',
  passwordRequired: 'iam.auth.error.passwordRequired',
  passwordTooShort: 'iam.auth.error.passwordTooShort',
} as const;

/** English fallback copy; localized copy comes from the i18n message bundle. */
export const IAM_LOGIN_FORM_ERROR_MESSAGES: Record<string, string> = {
  [IAM_LOGIN_FORM_ERROR_KEYS.identifierRequired]: 'Enter your email, phone, or username.',
  [IAM_LOGIN_FORM_ERROR_KEYS.identifierInvalid]: 'Enter a valid email, phone, or username.',
  [IAM_LOGIN_FORM_ERROR_KEYS.passwordRequired]: 'Enter your password.',
  [IAM_LOGIN_FORM_ERROR_KEYS.passwordTooShort]: 'Password must be at least 6 characters.',
};

export function validateIamLoginForm(values: IamLoginFormValues): IamLoginFormErrors {
  const errors: IamLoginFormErrors = {};
  const identifier = values.identifier.trim();
  if (!identifier) {
    errors.identifier = IAM_LOGIN_FORM_ERROR_KEYS.identifierRequired;
  } else if (!EMAIL_PATTERN.test(identifier) && !PHONE_PATTERN.test(identifier) && identifier.length < 3) {
    errors.identifier = IAM_LOGIN_FORM_ERROR_KEYS.identifierInvalid;
  }
  if (!values.password) {
    errors.password = IAM_LOGIN_FORM_ERROR_KEYS.passwordRequired;
  } else if (values.password.length < 6) {
    errors.password = IAM_LOGIN_FORM_ERROR_KEYS.passwordTooShort;
  }
  return errors;
}

const EMPTY_VALUES: IamLoginFormValues = {
  identifier: '',
  password: '',
  tenantId: '',
  organizationId: '',
};

export function createIamLoginForm(
  initial: Partial<IamLoginFormValues> = {},
): IamLoginFormController {
  let state: IamLoginFormState = {
    values: { ...EMPTY_VALUES, ...initial },
    errors: {},
    valid: false,
  };

  const recompute = (): IamLoginFormState => {
    const errors = validateIamLoginForm(state.values);
    state = {
      ...state,
      errors,
      valid: Object.keys(errors).length === 0,
    };
    return state;
  };

  return {
    getState: () => state,

    setValue(field: keyof IamLoginFormValues, value: string): IamLoginFormState {
      state = {
        ...state,
        values: { ...state.values, [field]: value },
      };
      return recompute();
    },

    validate(): IamLoginFormState {
      return recompute();
    },

    toLoginInput(): IamLoginInput | null {
      const current = recompute();
      if (!current.valid) return null;
      const tenantId = current.values.tenantId.trim();
      const organizationId = current.values.organizationId.trim();
      return {
        identifier: current.values.identifier.trim(),
        password: current.values.password,
        ...(tenantId ? { tenantId } : {}),
        ...(organizationId ? { organizationId } : {}),
      };
    },

    reset(): IamLoginFormState {
      state = {
        values: { ...EMPTY_VALUES },
        errors: {},
        valid: false,
      };
      return state;
    },
  };
}
