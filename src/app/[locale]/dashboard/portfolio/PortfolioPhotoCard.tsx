"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { deletePortfolioPhotoAction, movePortfolioPhotoAction, type PortfolioActionState } from "./actions";

const initialState: PortfolioActionState = {};

export function PortfolioPhotoCard({
  photo,
  isFirst,
  isLast,
}: {
  photo: { id: string; imageUrl: string };
  isFirst: boolean;
  isLast: boolean;
}) {
  const t = useTranslations("Portfolio");
  const tErrors = useTranslations("Dashboard.errors");
  const [deleteState, deleteAction, isDeleting] = useActionState(deletePortfolioPhotoAction, initialState);
  const [moveState, moveAction, isMoving] = useActionState(movePortfolioPhotoAction, initialState);

  return (
    <div className="flex flex-col gap-2">
      <div className="aspect-square overflow-hidden rounded-lg border border-brand-charcoal/10 bg-brand-warm-white">
        <Image src={photo.imageUrl} alt="" width={300} height={300} className="h-full w-full object-cover" />
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1">
          <form action={moveAction}>
            <input type="hidden" name="photoId" value={photo.id} />
            <input type="hidden" name="direction" value="up" />
            <button
              type="submit"
              disabled={isFirst || isMoving}
              aria-label={t("moveUp")}
              className="rounded-md border border-brand-charcoal/20 px-2 py-1 text-xs text-brand-charcoal disabled:opacity-30"
            >
              &uarr;
            </button>
          </form>
          <form action={moveAction}>
            <input type="hidden" name="photoId" value={photo.id} />
            <input type="hidden" name="direction" value="down" />
            <button
              type="submit"
              disabled={isLast || isMoving}
              aria-label={t("moveDown")}
              className="rounded-md border border-brand-charcoal/20 px-2 py-1 text-xs text-brand-charcoal disabled:opacity-30"
            >
              &darr;
            </button>
          </form>
        </div>
        <form
          action={deleteAction}
          onSubmit={(event) => {
            if (!window.confirm(t("confirmDelete"))) event.preventDefault();
          }}
        >
          <input type="hidden" name="photoId" value={photo.id} />
          <button
            type="submit"
            disabled={isDeleting}
            className="rounded-md border border-brand-charcoal/20 px-2 py-1 text-xs font-medium text-red-700 disabled:opacity-40"
          >
            {t("delete")}
          </button>
        </form>
      </div>
      {(deleteState.formError || moveState.formError) && (
        <p role="alert" className="text-xs text-red-700">
          {tErrors(deleteState.formError ?? moveState.formError!)}
        </p>
      )}
    </div>
  );
}
