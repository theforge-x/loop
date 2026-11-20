import { requireAdmin } from "@/lib/auth";
import { getWedding } from "@/services/content";
import { AdminForm } from "@/components/admin-form";
import { publishContent, saveContent } from "../../actions";

export default async function SettingsPage() {
  const admin = await requireAdmin();
  const wedding = await getWedding(true);
  return <>
    <div className="admin-title"><h1>Settings</h1></div>
    <section className="admin-panel">
      <h2>Wedding timezone</h2>
      {wedding ? <>
        <p>RSVP deadlines close at midnight in this timezone.</p>
        <AdminForm action={saveContent}>
          <input type="hidden" name="section" value="settings" />
          <label>Timezone<input name="timezone" defaultValue={wedding.settings.timezone} list="timezones" required /></label>
          <datalist id="timezones">{Intl.supportedValuesOf("timeZone").map(zone => <option key={zone} value={zone} />)}</datalist>
          <button className="button">Save draft</button>
        </AdminForm>
        <AdminForm action={publishContent}><button className="button button-outline">Publish website</button></AdminForm>
      </> : <p>Run the seed command to initialize the wedding.</p>}
    </section>
    <section className="admin-panel"><h2>Account</h2><p>Signed in as {admin.email}.</p></section>
  </>;
}
