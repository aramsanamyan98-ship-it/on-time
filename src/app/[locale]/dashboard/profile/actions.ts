"use server";

import { getSession } from "@/lib/session";
import { updateSpecialistProfile, updateProfilePhoto } from "@/lib/profile/update-profile";
import type { ProfileFields } from "@/lib/profile/validation";
import type { FieldErrors, DashboardErrorCode } from "@/lib/dashboard/errors";

export type ProfileState = {
  fieldErrors?: FieldErrors<ProfileFields>;
  formError?: DashboardErrorCode;
  success?: boolean;
};

export async function updateProfileAction(_prevState: ProfileState, formData: FormData): Promise<ProfileState> {
  const session = await getSession();
  if (!session) return { formError: "generic" };

  const bio = String(formData.get("bio") ?? "");
  const phone = String(formData.get("phone") ?? "");
  const address = String(formData.get("address") ?? "");
  const instagram = String(formData.get("instagram") ?? "");

  const result = await updateSpecialistProfile(session.specialistId, { bio, phone, address, instagram });
  if (!result.ok) {
    return { fieldErrors: result.fieldErrors, formError: result.formError };
  }
  return { success: true };
}

export type PhotoState = {
  formError?: DashboardErrorCode;
  url?: string;
};

async function uploadPhoto(formData: FormData, kind: "profile" | "cover"): Promise<PhotoState> {
  const session = await getSession();
  if (!session) return { formError: "generic" };

  const file = formData.get("photo");
  const result = await updateProfilePhoto(session.specialistId, file instanceof File ? file : null, kind);
  if (!result.ok) {
    return { formError: result.formError };
  }

  const url = kind === "profile" ? result.data.profilePhotoUrl : result.data.coverPhotoUrl;
  return { url: url ?? undefined };
}

export async function uploadProfilePhotoAction(_prevState: PhotoState, formData: FormData): Promise<PhotoState> {
  return uploadPhoto(formData, "profile");
}

export async function uploadCoverPhotoAction(_prevState: PhotoState, formData: FormData): Promise<PhotoState> {
  return uploadPhoto(formData, "cover");
}
