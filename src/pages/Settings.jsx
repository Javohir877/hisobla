import { useApp, NATIVE, APP_VERSION, SITE_URL } from "../context.js";
import ThemeGrid from "../components/ThemeGrid.jsx";

function Switch({ title, hint, checked, onChange }) {
  return (
    <label className="settings-row">
      <span className="settings-text"><strong>{title}</strong><small>{hint}</small></span>
      <input type="checkbox" className="switch" checked={checked} onChange={event => onChange(event.target.checked)} />
    </label>
  );
}

function Row({ title, hint, onClick, danger }) {
  return (
    <button type="button" className={`settings-row${danger ? " danger" : ""}`} onClick={onClick}>
      <span className="settings-text"><strong>{title}</strong><small>{hint}</small></span>
      <span className="settings-chevron" aria-hidden="true">›</span>
    </button>
  );
}

export default function Settings() {
  const { settings, updateSettings, history, setHistory, practiceScore, setPracticeScore, confirm, toast, checkUpdate } = useApp();

  const share = () => {
    const data = { title: "Hisobla", text: "Kasrlarni bosqichma-bosqich yechadigan kalkulyator:", url: SITE_URL };
    if (navigator.share) navigator.share(data).catch(() => {});
    else navigator.clipboard?.writeText(SITE_URL).then(() => toast("Havola nusxalandi."), () => {});
  };

  return (
    <>
      <section className="settings-group">
        <h3>Ko'rinish</h3>
        <div className="card settings-card">
          <div className="settings-row column">
            <span className="settings-text"><strong>Rang mavzusi</strong><small>O'zingizga yoqqan rangni tanlang</small></span>
            <ThemeGrid />
          </div>
        </div>
      </section>

      <section className="settings-group">
        <h3>Kalkulyator</h3>
        <div className="card settings-card">
          <Switch title="Ilmiy rejim" hint="sin, cos, log, √, n! tugmalari" checked={settings.scientific} onChange={v => updateSettings({ scientific: v })} />
          <Switch title="Burchak — gradusda" hint="O'chirilsa, radian ishlatiladi" checked={settings.degrees} onChange={v => updateSettings({ degrees: v })} />
          <Switch title="Natija avval kasrda" hint="Masalan 0,5 o'rniga 1/2" checked={settings.fractionFirst} onChange={v => updateSettings({ fractionFirst: v })} />
          {NATIVE && <Switch title="Tugmalarda tebranish" hint="Bosilganda yengil titraydi" checked={settings.haptics} onChange={v => updateSettings({ haptics: v })} />}
        </div>
      </section>

      <section className="settings-group">
        <h3>Ma'lumotlar</h3>
        <div className="card settings-card">
          <Row danger title="Hisoblar tarixini tozalash" hint={`${history.length} ta yozuv saqlangan`}
            onClick={() => history.length
              ? confirm("Hisoblar tarixi o'chirilsinmi?", () => { setHistory([]); toast("Tarix tozalandi."); })
              : toast("Tarix allaqachon bo'sh.")} />
          <Row danger title="Mashq natijalarini tozalash" hint={`To'g'ri javoblar: ${practiceScore.right} / ${practiceScore.total}`}
            onClick={() => confirm("Mashq natijalari o'chirilsinmi?", () => {
              setPracticeScore({ right: 0, total: 0, streak: 0, best: 0 });
              toast("Mashq natijalari tozalandi.");
            })} />
        </div>
      </section>

      <section className="settings-group">
        <h3>Ilova haqida</h3>
        <div className="card settings-card">
          <div className="settings-row about-row">
            <img src="avatar.svg" alt="" width="48" height="48" />
            <span className="settings-text">
              <strong>Hisobla</strong>
              <small>{APP_VERSION ? `Versiya ${APP_VERSION}` : "Veb versiya"} · Internetsiz ishlaydi</small>
            </span>
          </div>
          {APP_VERSION && <Row title="Yangilanishni tekshirish" hint="Yangi versiya chiqqanini ko'rish" onClick={() => checkUpdate(true)} />}
          <Row title="Do'stlarga ulashish" hint="Havolani yuborish" onClick={share} />
          <Row title="Saytni ochish" hint={SITE_URL.replace("https://", "")} onClick={() => window.open(SITE_URL, "_blank", "noopener")} />
        </div>
      </section>
    </>
  );
}
