/** Backend timestamps are epoch seconds. */
export const formatTime = (epochSeconds: number | null | undefined) =>
  epochSeconds
    ? new Date(epochSeconds * 1000).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
