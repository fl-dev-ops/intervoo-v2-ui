"use client";

import { ResumeCard } from "./resume-card";

interface BasicInfoCardProps {
  name: string;
  email: string;
  phoneNumber: string;
  editing: boolean;
  errors?: Partial<Record<"name" | "email" | "phoneNumber", string>>;
  onChange: (field: string, value: string) => void;
  onEdit?: () => void;
}

export function BasicInfoCard({
  name,
  email,
  phoneNumber,
  editing,
  errors,
  onChange,
  onEdit,
}: BasicInfoCardProps) {
  return (
    <ResumeCard title="Basic Information" editing={editing} onEdit={onEdit}>
      <div className="space-y-3">
        <div>
          <label className="sr-only">
            Full Name
          </label>
          {editing ? (
            <input
              type="text"
              value={name}
              placeholder="Full name"
              onChange={(e) => onChange("name", e.target.value)}
              className="h-12 w-full rounded-lg border border-[#D8D5DD] px-3 text-base text-black outline-none transition focus:border-[#6846E8] focus:ring-2 focus:ring-[#6846E8]/15 aria-invalid:border-red-400 aria-invalid:ring-red-100"
              aria-invalid={Boolean(errors?.name)}
            />
          ) : (
            <p className="text-base font-bold text-black">
              {name || "Not specified"}
            </p>
          )}
          {errors?.name && (
            <p className="mt-1 text-xs font-medium text-red-600">{errors.name}</p>
          )}
        </div>
        <div>
          <label className="sr-only">
            Email
          </label>
          {editing ? (
            <input
              type="email"
              value={email}
              placeholder="Email address"
              onChange={(e) => onChange("email", e.target.value)}
              className="h-12 w-full rounded-lg border border-[#D8D5DD] px-3 text-base text-black outline-none transition focus:border-[#6846E8] focus:ring-2 focus:ring-[#6846E8]/15 aria-invalid:border-red-400 aria-invalid:ring-red-100"
              aria-invalid={Boolean(errors?.email)}
            />
          ) : (
            <p className="text-sm text-black">{email || "Not specified"}</p>
          )}
          {errors?.email && (
            <p className="mt-1 text-xs font-medium text-red-600">{errors.email}</p>
          )}
        </div>
        <div>
          <label className="sr-only">
            Phone Number
          </label>
          {editing ? (
            <input
              type="tel"
              value={phoneNumber}
              placeholder="Phone number"
              onChange={(e) => onChange("phoneNumber", e.target.value)}
              className="h-12 w-full rounded-lg border border-[#D8D5DD] px-3 text-base text-black outline-none transition focus:border-[#6846E8] focus:ring-2 focus:ring-[#6846E8]/15 aria-invalid:border-red-400 aria-invalid:ring-red-100"
              aria-invalid={Boolean(errors?.phoneNumber)}
            />
          ) : (
            <p className="text-sm text-black">{phoneNumber || "Not specified"}</p>
          )}
          {errors?.phoneNumber && (
            <p className="mt-1 text-xs font-medium text-red-600">
              {errors.phoneNumber}
            </p>
          )}
        </div>
      </div>
    </ResumeCard>
  );
}
