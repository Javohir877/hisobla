import { NATIVE, APP_VERSION } from "../context.js";

/* "Yangilanish keldi" oynasi ichidagi matn va tugmalar */
export default function UpdateNotice({ update, onLater, onInstall }) {
  return (
    <div className="update-sheet">
      <div className="update-badge" aria-hidden="true">⤓</div>
      <h3>Yangilanish keldi! 🎉</h3>
      <p className="update-version">
        Yangi versiya <b>{update.version}</b>
        {APP_VERSION && <> · sizda {APP_VERSION}</>}
        {update.sizeMb && <> · {update.sizeMb} MB</>}
      </p>
      {update.notes.length > 0 && (
        <div className="update-notes">
          <strong>Nimalar yangi:</strong>
          <ul>{update.notes.map((note, i) => <li key={i}>{note}</li>)}</ul>
        </div>
      )}
      <p className="update-hint">
        {NATIVE?.downloadUpdate
          ? "Yangilanish ilovaning o'zida yuklanadi, so'ng o'rnatish oynasi ochiladi. Tarix va sozlamalaringiz saqlanib qoladi."
          : "Yangi APK yuklab olinadi — uni ochib, \"O'rnatish\"ni bosing. Tarix va sozlamalaringiz saqlanib qoladi."}
      </p>
      <div className="confirm-actions">
        <button type="button" className="secondary-button" onClick={onLater}>Keyinroq</button>
        <button type="button" className="primary-button" onClick={onInstall}>Yangilash</button>
      </div>
    </div>
  );
}
