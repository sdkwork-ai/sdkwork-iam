/**
 * Form and action primitives for IAM H5 screens.
 *
 * They are deliberately unstyled-by-props: appearance comes from the kit
 * stylesheet, and the only variant prop is the semantic one a screen actually
 * chooses (`primary` / `secondary` / `danger`). Every control renders a native
 * element so keyboard, screen-reader and mobile input behaviour are the
 * platform's, not a reimplementation.
 */

import { useId, type ChangeEvent, type ReactNode } from "react";

/** Button variants the kit renders. */
export type SdkworkIamH5ButtonVariant = "primary" | "secondary" | "danger";

/** Props of {@link SdkworkIamH5Button}. */
export interface SdkworkIamH5ButtonProps {
  children: ReactNode;
  className?: string;
  /** Disables the control; a busy button also sets `aria-busy`. */
  disabled?: boolean;
  /** Renders full-width; the mobile form default. */
  block?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: SdkworkIamH5ButtonVariant;
}

/** The kit's action button. */
export function SdkworkIamH5Button({
  block = false,
  children,
  className,
  disabled = false,
  onClick,
  type = "button",
  variant = "primary",
}: SdkworkIamH5ButtonProps) {
  const classes = [
    "sdkwork-iam-h5-button",
    `sdkwork-iam-h5-button--${variant}`,
    block ? "sdkwork-iam-h5-button--block" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button
      className={classes}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  );
}

/** Semantic tone of a badge. */
export type SdkworkIamH5BadgeTone = "neutral" | "success" | "danger" | "warning";

/** Props of {@link SdkworkIamH5Badge}. */
export interface SdkworkIamH5BadgeProps {
  children: ReactNode;
  tone?: SdkworkIamH5BadgeTone;
}

/** A compact status pill. Colour is never the only signal — the label is text. */
export function SdkworkIamH5Badge({ children, tone = "neutral" }: SdkworkIamH5BadgeProps) {
  return (
    <span className={`sdkwork-iam-h5-badge sdkwork-iam-h5-badge--${tone}`}>{children}</span>
  );
}

/** Props of {@link SdkworkIamH5Notice}. */
export interface SdkworkIamH5NoticeProps {
  children: ReactNode;
  tone?: "info" | "danger" | "success";
}

/**
 * An inline message above content.
 *
 * `role="alert"` for the failure tone so a screen reader announces a refused
 * operation; the informational tone stays a polite `status`.
 */
export function SdkworkIamH5Notice({ children, tone = "info" }: SdkworkIamH5NoticeProps) {
  return (
    <p
      className={`sdkwork-iam-h5-notice sdkwork-iam-h5-notice--${tone}`}
      role={tone === "danger" ? "alert" : "status"}
    >
      {children}
    </p>
  );
}

/** Props of {@link SdkworkIamH5Field}. */
export interface SdkworkIamH5FieldProps {
  /** Optional hint under the control. */
  hint?: string;
  /** Validation message; when present the control is marked invalid. */
  error?: string;
  inputMode?: "email" | "numeric" | "search" | "tel" | "text" | "url";
  label: string;
  multiline?: boolean;
  onChange: (value: string) => void;
  /** Masks the value and asks the platform for a password keyboard. */
  secret?: boolean;
  placeholder?: string;
  readOnly?: boolean;
  value: string;
}

/**
 * A labelled text control.
 *
 * The label is a real `<label for>` and an invalid control carries
 * `aria-invalid` plus `aria-describedby` pointing at the message, so a validation
 * failure is announced instead of only coloured.
 */
export function SdkworkIamH5Field({
  error,
  hint,
  inputMode,
  label,
  multiline = false,
  onChange,
  placeholder,
  readOnly = false,
  secret = false,
  value,
}: SdkworkIamH5FieldProps) {
  const controlId = useId();
  const messageId = `${controlId}-message`;
  const describedBy = error || hint ? messageId : undefined;
  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(event.target.value);
  };
  const shared = {
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined,
    className: multiline
      ? "sdkwork-iam-h5-field__control sdkwork-iam-h5-field__control--multiline"
      : "sdkwork-iam-h5-field__control",
    id: controlId,
    onChange: handleChange,
    placeholder,
    readOnly,
    value,
  };
  return (
    <div className="sdkwork-iam-h5-field">
      <label className="sdkwork-iam-h5-field__label" htmlFor={controlId}>
        {label}
      </label>
      {multiline ? (
        <textarea {...shared} />
      ) : (
        <input
          {...shared}
          autoComplete={secret ? "current-password" : undefined}
          inputMode={inputMode}
          type={secret ? "password" : "text"}
        />
      )}
      {error ? (
        <span className="sdkwork-iam-h5-field__error" id={messageId} role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="sdkwork-iam-h5-field__hint" id={messageId}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

/** Props of {@link SdkworkIamH5SearchField}. */
export interface SdkworkIamH5SearchFieldProps {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}

/** A search input for list toolbars. */
export function SdkworkIamH5SearchField({
  label,
  onChange,
  placeholder,
  value,
}: SdkworkIamH5SearchFieldProps) {
  return (
    <div className="sdkwork-iam-h5-search">
      <input
        aria-label={label}
        className="sdkwork-iam-h5-field__control"
        inputMode="search"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="search"
        value={value}
      />
    </div>
  );
}

/** Props of {@link SdkworkIamH5Select}. */
export interface SdkworkIamH5SelectProps {
  label: string;
  onChange: (value: string) => void;
  options: readonly { label: string; value: string }[];
  value: string;
}

/** A labelled native select. */
export function SdkworkIamH5Select({ label, onChange, options, value }: SdkworkIamH5SelectProps) {
  const controlId = useId();
  return (
    <div className="sdkwork-iam-h5-field">
      <label className="sdkwork-iam-h5-field__label" htmlFor={controlId}>
        {label}
      </label>
      <select
        className="sdkwork-iam-h5-field__select"
        id={controlId}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
