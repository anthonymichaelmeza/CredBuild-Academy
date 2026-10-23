"use client";
import { Children, cloneElement, isValidElement, useId, useState } from "react";
export const statusLabel = (value: string) => value.replaceAll("_", " ");
const lines = (text: string) =>
  text
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean);
const paragraphList = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((value) => value.trim())
    .filter(Boolean);
export const uid = (prefix: string) =>
  `${prefix}-${crypto.randomUUID().slice(0, 12)}`;

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const generatedId = useId();
  const nodes = Children.toArray(children);
  const child = nodes[0];
  if (!isValidElement<{ id?: string; "aria-describedby"?: string }>(child)) {
    throw new Error("A Studio field requires one form control.");
  }
  const id = child.props.id || `studio-field-${generatedId}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy =
    [child.props["aria-describedby"], hintId].filter(Boolean).join(" ") ||
    undefined;
  return (
    <div className="studio-field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(child, { id, "aria-describedby": describedBy })}
      {nodes.slice(1)}
      {hint && <small id={hintId}>{hint}</small>}
    </div>
  );
}
export function Status({ value }: { value: string }) {
  return (
    <span className="studio-status" data-status={value}>
      {statusLabel(value)}
    </span>
  );
}
export function ListTextArea({
  value,
  onChange,
  paragraphs = false,
  rows = 3,
  required = false,
  id,
  "aria-describedby": describedBy,
}: {
  value: string[];
  onChange: (values: string[]) => void;
  paragraphs?: boolean;
  rows?: number;
  required?: boolean;
  id?: string;
  "aria-describedby"?: string;
}) {
  const [text, setText] = useState(() =>
    value.join(paragraphs ? "\n\n" : "\n"),
  );
  return (
    <textarea
      id={id}
      aria-describedby={describedBy}
      rows={rows}
      required={required}
      value={text}
      onChange={(event) => {
        setText(event.target.value);
        onChange(
          paragraphs
            ? paragraphList(event.target.value)
            : lines(event.target.value),
        );
      }}
    />
  );
}
