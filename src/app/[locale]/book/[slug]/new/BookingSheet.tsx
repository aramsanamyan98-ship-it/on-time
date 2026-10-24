"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

type BookingSheetContextValue = {
  /** The wizard reports whether the client has typed anything worth confirming before closing. */
  setDirty: (dirty: boolean) => void;
  /** Close without asking (e.g. the "Done" button after a confirmed booking). */
  closeNow: () => void;
};

const BookingSheetContext = createContext<BookingSheetContextValue | null>(null);

/** null when the wizard is rendered as the full page rather than inside the popup. */
export function useBookingSheet() {
  return useContext(BookingSheetContext);
}

/**
 * Popup shell for the booking wizard (rendered by the intercepting route in
 * @modal/(.)new). A native modal <dialog> gives focus trapping, an inert
 * background, Esc handling and focus restoration for free. On phones it is a
 * bottom sheet with a drag handle; from `sm` up a centered dialog.
 *
 * Closing = router.back(): the popup is a real history entry, so the browser
 * Back button closes it too. X, Esc and tapping outside ask first if the
 * client has typed details; Back and "Done" do not.
 */
export function BookingSheet({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useTranslations("Booking");
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dirtyRef = useRef(false);
  const pressStartedOnBackdrop = useRef(false);
  const dragStartY = useRef<number | null>(null);

  const closeNow = useCallback(() => router.back(), [router]);
  const requestClose = useCallback(() => {
    if (dirtyRef.current && !window.confirm(t("discardConfirm"))) return false;
    router.back();
    return true;
  }, [router, t]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
      opener?.focus();
    };
  }, []);

  const context = useMemo<BookingSheetContextValue>(
    () => ({
      setDirty: (dirty) => {
        dirtyRef.current = dirty;
      },
      closeNow,
    }),
    [closeNow],
  );

  function resetDrag() {
    dragStartY.current = null;
    if (sheetRef.current) sheetRef.current.style.transform = "";
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="booking-sheet-title"
      onCancel={(event) => {
        // Esc: go through the same "discard?" check as the X button.
        event.preventDefault();
        requestClose();
      }}
      onPointerDown={(event) => {
        pressStartedOnBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        // Only a press that both started and ended on the dim backdrop counts,
        // so selecting text inside the sheet and releasing outside doesn't close it.
        if (event.target === event.currentTarget && pressStartedOnBackdrop.current) requestClose();
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-dvw max-w-none items-end justify-center bg-transparent p-0 text-brand-charcoal backdrop:bg-brand-charcoal/50 open:flex sm:items-center"
    >
      <div
        ref={sheetRef}
        className="ot-sheet flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-brand-warm-white shadow-2xl transition-transform sm:max-h-[90dvh] sm:max-w-[560px] sm:rounded-3xl"
      >
        {/* Drag handle (phones): swipe down to close. */}
        <div
          className="flex shrink-0 touch-none justify-center pb-1 pt-2.5 sm:hidden"
          onPointerDown={(event) => {
            dragStartY.current = event.clientY;
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (dragStartY.current === null || !sheetRef.current) return;
            const dy = Math.max(0, event.clientY - dragStartY.current);
            sheetRef.current.style.transform = `translateY(${dy}px)`;
          }}
          onPointerUp={(event) => {
            const dy = dragStartY.current === null ? 0 : event.clientY - dragStartY.current;
            resetDrag();
            if (dy > 90) requestClose();
          }}
          onPointerCancel={resetDrag}
          aria-hidden="true"
        >
          <span className="h-1.5 w-11 rounded-full bg-brand-charcoal/20" />
        </div>

        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pt-2 sm:pt-5">
          <h2 id="booking-sheet-title" className="font-serif text-xl font-bold text-brand-green">
            {title}
          </h2>
          <button
            type="button"
            onClick={requestClose}
            aria-label={t("sheetClose")}
            className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-brand-charcoal/70 transition hover:bg-brand-charcoal/5"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3">
          <BookingSheetContext.Provider value={context}>{children}</BookingSheetContext.Provider>
        </div>
      </div>
    </dialog>
  );
}
