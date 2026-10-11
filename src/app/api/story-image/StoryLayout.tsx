// Layout for the "Fill my schedule" Instagram Story (src/app/api/story-image).
// Kept separate from the route (auth, DB, translations, fonts) so it is plain
// props-in / JSX-out. Satori only supports a flexbox subset of CSS, so every
// element is an explicit flex container with inline styles.

export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;

// One font name per script: Satori picks a font by family + weight before it
// falls back per glyph, so same-named Latin and Cyrillic files would leave
// Cyrillic stuck on whichever weight came first. Distinct names make the
// per-glyph fallback honour each weight.
export const STORY_FONT_FAMILY = "Inter, Inter Cyrillic, Noto Sans Armenian";

// docs/09_Brand_Guidelines.md / globals.css
const CHARCOAL = "#121212";
const BRASS = "#c8a96a";
const WARM_WHITE = "#f7f5f2";

export type StoryLayoutProps = {
  heading: string;
  time: string;
  dateLine: string;
  serviceName: string;
  price: string;
  specialistName: string;
  /** Fallback shown in the avatar circle when there is no photo. */
  specialistInitial: string;
  /** data: URL of a JPEG/PNG, or null. */
  photoDataUrl: string | null;
  bookNow: string;
};

export function StoryLayout({
  heading,
  time,
  dateLine,
  serviceName,
  price,
  specialistName,
  specialistInitial,
  photoDataUrl,
  bookNow,
}: StoryLayoutProps) {
  return (
  <div
    style={{
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      // Instagram overlays its own UI on the top ~250px and bottom ~340px
      // of a Story; keep everything that matters between them.
      padding: "260px 90px 360px",
      color: WARM_WHITE,
      backgroundColor: CHARCOAL,
      backgroundImage: "radial-gradient(circle at 50% 22%, rgba(200,169,106,0.20) 0%, rgba(200,169,106,0) 55%)",
      fontFamily: STORY_FONT_FAMILY,
    }}
  >
    <div style={{ display: "flex", width: 120, height: 6, borderRadius: 3, backgroundColor: BRASS }} />

    <div
      style={{
        display: "flex",
        marginTop: 56,
        textAlign: "center",
        justifyContent: "center",
        fontSize: 64,
        fontWeight: 700,
        letterSpacing: 6,
        color: BRASS,
      }}
    >
      {heading}
    </div>

    <div style={{ display: "flex", marginTop: 24, fontSize: 330, fontWeight: 700, lineHeight: 1, letterSpacing: -6 }}>
      {time}
    </div>

    <div style={{ display: "flex", marginTop: 24, fontSize: 48, opacity: 0.75, textAlign: "center" }}>
      {dateLine}
    </div>

    <div
      style={{ display: "flex", width: "100%", height: 2, marginTop: 72, backgroundColor: "rgba(200,169,106,0.5)" }}
    />

    <div
      style={{
        display: "flex",
        marginTop: 72,
        textAlign: "center",
        justifyContent: "center",
        fontSize: 68,
        fontWeight: 700,
        lineHeight: 1.15,
      }}
    >
      {serviceName}
    </div>
    <div style={{ display: "flex", marginTop: 20, fontSize: 56, fontWeight: 700, color: BRASS }}>
      {price}
    </div>

    <div style={{ display: "flex", alignItems: "center", marginTop: 72 }}>
      {photoDataUrl ? (
        <div
          style={{
            display: "flex",
            width: 128,
            height: 128,
            borderRadius: 64,
            overflow: "hidden",
            border: `4px solid ${BRASS}`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders plain <img>, not next/image */}
          <img src={photoDataUrl} width={120} height={120} style={{ width: 120, height: 120, objectFit: "cover" }} alt="" />
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            width: 128,
            height: 128,
            borderRadius: 64,
            alignItems: "center",
            justifyContent: "center",
            border: `4px solid ${BRASS}`,
            fontSize: 60,
            fontWeight: 700,
            color: BRASS,
          }}
        >
          {specialistInitial}
        </div>
      )}
      <div style={{ display: "flex", marginLeft: 32, fontSize: 52, fontWeight: 700, maxWidth: 700 }}>{specialistName}</div>
    </div>

    <div style={{ display: "flex", flexGrow: 1, minHeight: 56 }} />

    <div
      style={{
        display: "flex",
        padding: "30px 96px",
        borderRadius: 999,
        backgroundColor: BRASS,
        color: CHARCOAL,
        fontSize: 58,
        fontWeight: 700,
      }}
    >
      {bookNow}
    </div>
  </div>
  );
}
