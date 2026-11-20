import { requireAdmin } from "@/lib/auth";
import { getWedding, type Wedding } from "@/services/content";
import { AdminForm } from "@/components/admin-form";
import { OrderedList, PhotoFields } from "@/components/content-fields";
import { publishContent, saveContent } from "../../actions";

function Section({ name, title, children }: { name: keyof Wedding; title: string; children: React.ReactNode }) {
  return <details className="admin-panel edit-section" open={name === "hero" || undefined}>
    <summary><h2>{title}</h2></summary>
    <AdminForm action={saveContent}>
      <input type="hidden" name="section" value={name} />
      {children}
      <button className="button">Save draft</button>
    </AdminForm>
  </details>;
}

function Text({ name, label, value, type = "text", required = true, max = 100 }: { name: string; label: string; value: string; type?: string; required?: boolean; max?: number }) {
  return <label>{label}<input type={type} name={name} defaultValue={value} required={required} maxLength={max} /></label>;
}

function Body({ name, label, value }: { name: string; label: string; value: string }) {
  return <label>{label}<textarea name={name} defaultValue={value} rows={4} maxLength={4000} /></label>;
}

export default async function ContentPage() {
  await requireAdmin();
  const wedding = await getWedding(true);
  if (!wedding) return <p>Run the seed command to initialize the wedding.</p>;
  const { hero, story, details, programme, gallery, attire, rsvp, wishlist, footer } = wedding;
  return <>
    <div className="admin-title"><div><h1>Website editor</h1><p>Save each section as a draft, then preview or publish the invitation.</p></div>
      <div className="admin-row"><a className="button button-outline" href="/admin/preview">Preview draft</a>
        <AdminForm action={publishContent}><button className="button">Publish website</button></AdminForm>
      </div>
    </div>
    <Section name="hero" title="Welcome">
      <div className="admin-fields">
        <Text name="firstName" label="First name" value={hero.firstName} max={60} />
        <Text name="secondName" label="Second name" value={hero.secondName} max={60} />
        <Text name="headline" label="Introductory line" value={hero.headline} />
        <Text name="date" label="Wedding date" value={hero.date} type="date" />
      </div>
      <PhotoFields prefix="hero" photo={hero.photo} />
    </Section>
    <Section name="story" title="Our story">
      <Text name="heading" label="Heading" value={story.heading} />
      <Body name="text" label="Story" value={story.text} />
      <PhotoFields prefix="story" photo={story.photo} />
    </Section>
    <Section name="details" title="Wedding details">
      <div className="admin-fields">
        <Text name="heading" label="Heading" value={details.heading} />
        <Text name="venue" label="Venue" value={details.venue} />
        <Text name="address" label="Street address" value={details.address} max={250} />
        <Text name="time" label="Start time" value={details.time} />
        <Text name="directions" label="Directions link (optional)" value={details.directions} type="url" required={false} max={500} />
      </div>
    </Section>
    <Section name="programme" title="Programme">
      <Text name="heading" label="Heading" value={programme.heading} />
      <OrderedList key={JSON.stringify(programme.events)} kind="Event" initial={programme.events} />
    </Section>
    <Section name="gallery" title="Gallery">
      <Text name="heading" label="Heading" value={gallery.heading} />
      <OrderedList key={JSON.stringify(gallery.photos)} kind="Photo" initial={gallery.photos} />
    </Section>
    <Section name="attire" title="Dress code and colours">
      <Text name="heading" label="Heading" value={attire.heading} />
      <Body name="text" label="Dress code" value={attire.text} />
      <OrderedList key={JSON.stringify(attire.colours)} kind="Colour" initial={attire.colours} />
    </Section>
    <Section name="rsvp" title="RSVP">
      <Text name="heading" label="Heading" value={rsvp.heading} />
      <Body name="instructions" label="Instructions" value={rsvp.instructions} />
      <Text name="deadline" label="Reply deadline (optional)" value={rsvp.deadline} type="date" required={false} />
      <label className="check"><input type="checkbox" name="allowLate" defaultChecked={rsvp.allowLate} /> Accept replies after the deadline</label>
      <Text name="confirmation" label="Confirmation message" value={rsvp.confirmation} max={300} />
    </Section>
    <Section name="wishlist" title="Wishlist">
      <Text name="heading" label="Heading" value={wishlist.heading} />
      <Body name="introduction" label="Introduction" value={wishlist.introduction} />
      <label className="check"><input type="checkbox" name="visible" defaultChecked={wishlist.visible} /> Show the wishlist</label>
      <label className="check"><input type="checkbox" name="showPrices" defaultChecked={wishlist.showPrices} /> Show estimated prices</label>
    </Section>
    <Section name="footer" title="Footer and contact">
      <Text name="closing" label="Closing message" value={footer.closing} max={250} />
      <div className="admin-fields">
        <Text name="email" label="Public email (optional)" value={footer.email} type="email" required={false} max={254} />
        <Text name="phone" label="Public phone (optional)" value={footer.phone} type="tel" required={false} max={40} />
      </div>
    </Section>
  </>;
}
