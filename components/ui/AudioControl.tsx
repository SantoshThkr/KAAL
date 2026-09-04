export function AudioControl({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return <button className="audio-control" type="button" onClick={onToggle}><span className={enabled ? "audio-dot active" : "audio-dot"} />{enabled ? "FLUTE / ON" : "ENABLE FLUTE"}</button>;
}
