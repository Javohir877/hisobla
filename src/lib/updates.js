/* Ilova yangilanishini tekshirish: GitHub'dagi eng so'nggi reliz bilan solishtiramiz */
const LATEST_RELEASE = "https://api.github.com/repos/Javohir877/hisobla/releases/latest";

/* "1.0.12" > "1.0.9" — raqamma-raqam solishtirish */
export function isNewer(latest, current) {
  const a = latest.split(".").map(Number), b = current.split(".").map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
  }
  return false;
}

/* Reliz matnidan "Nimalar yangi" qismini ajratamiz (o'rnatish ko'rsatmalarisiz) */
function releaseNotes(body = "") {
  const part = body.split(/^---$/m)[0];
  return part.split("\n")
    .map(line => line.replace(/^[#>*\-\s]+/, "").replace(/\*\*|`/g, "").trim())
    .filter(line => line && !/^Co-Authored-By/i.test(line))
    .slice(0, 6);
}

export async function fetchLatestRelease() {
  const response = await fetch(LATEST_RELEASE, { headers: { Accept: "application/vnd.github+json" }, cache: "no-store" });
  if (!response.ok) throw new Error(`GitHub javobi: ${response.status}`);
  const data = await response.json();
  const apk = (data.assets || []).find(asset => asset.name.endsWith(".apk"));
  return {
    version: String(data.tag_name || "").replace(/^v/, ""),
    notes: releaseNotes(data.body),
    url: apk?.browser_download_url || data.html_url,
    sizeMb: apk ? (apk.size / 1048576).toFixed(1) : null
  };
}
