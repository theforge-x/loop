import { CalendarDays, Camera, Clock3, Gift, Heart, MapPin } from "lucide-react";
import type { Wedding } from "@/services/content";
import { dateLabel } from "@/services/content";
import type { publicGifts } from "@/services/wishlist";
import { ReserveGift, RsvpForm } from "./guest-forms";

export function Invitation({ wedding, gifts, preview = false }: { wedding: Wedding; gifts: Awaited<ReturnType<typeof publicGifts>>; preview?: boolean }) {
  const { hero, story, details, programme, gallery, attire, rsvp, wishlist, footer } = wedding;
  const names = hero.firstName + " & " + hero.secondName;
  const initials = hero.firstName[0] + " · " + hero.secondName[0];
  return <>
    {preview && <div className="preview-banner">Draft preview <a href="/admin/content">Return to editor</a></div>}
    <header className="guest-nav">
      <div className="shell nav-inner">
        <a className="monogram" href="#welcome" aria-label={names}>{initials}</a>
        <nav aria-label="Wedding navigation">
          <a href="#story">Our Story</a><a href="#details">Details</a><a href="#gallery">Gallery</a>
          {wishlist.visible && <a href="#wishlist">Wishlist</a>}
        </nav>
        <a className="button nav-rsvp" href="#rsvp">RSVP</a>
      </div>
    </header>
    <main>
      <section className="wedding-hero" id="welcome" aria-labelledby="couple">
        <img src={hero.photo.image} alt={hero.photo.alt} fetchPriority="high" />
        <div className="hero-shade" />
        <div className="shell hero-copy">
          <p className="eyebrow">{hero.headline}</p>
          <h1 id="couple">{hero.firstName} <em>&</em> {hero.secondName}</h1>
          <p className="hero-date">{dateLabel(hero.date)}</p>
          <a className="button hero-button" href="#rsvp">Kindly RSVP</a>
        </div>
      </section>

      <section className="section shell story" id="story">
        <figure className="story-photo"><img src={story.photo.image} alt={story.photo.alt} loading="lazy" /></figure>
        <div className="story-copy">
          <p className="eyebrow">Our story</p><h2>{story.heading}</h2><p className="paragraphs">{story.text}</p>
        </div>
      </section>

      <section className="section details" id="details">
        <div className="shell">
          <div className="section-title"><p className="eyebrow">The celebration</p><h2>{details.heading}</h2></div>
          <div className="details-grid">
            <div><CalendarDays /><h3>When</h3><p>{dateLabel(hero.date)}<br />{details.time}</p></div>
            <div><MapPin /><h3>Where</h3><p>{details.venue}<br />{details.address}</p>
              {details.directions && <a className="underlined" href={details.directions} target="_blank" rel="noreferrer">Get directions</a>}
            </div>
          </div>
        </div>
      </section>

      {programme.events.length > 0 && <section className="section shell programme">
        <div className="section-title"><Clock3 size={22} /><h2>{programme.heading}</h2></div>
        <ol>{programme.events.map((event, index) => <li key={index}>
          <time>{event.time}</time><div><h3>{event.name}</h3>{event.description && <p>{event.description}</p>}</div>
        </li>)}</ol>
      </section>}

      <section className="section gallery" id="gallery">
        <div className="shell">
          <div className="section-title"><Camera size={22} /><h2>{gallery.heading}</h2></div>
          <div className="gallery-grid">{gallery.photos.map((photo, index) => <figure key={index}><img src={photo.image} alt={photo.alt} loading="lazy" /></figure>)}</div>
        </div>
      </section>

      <section className="section shell attire">
        <div className="section-title"><h2>{attire.heading}</h2><p className="paragraphs">{attire.text}</p></div>
        <ul>{attire.colours.map((colour, index) => <li key={index}><span style={{ backgroundColor: colour.hex }} />{colour.name}</li>)}</ul>
      </section>

      <section className="rsvp-band section" id="rsvp">
        <div className="shell rsvp-grid">
          <div><p className="eyebrow">RSVP</p><h2>{rsvp.heading}</h2><p className="paragraphs">{rsvp.instructions}</p>
            {rsvp.deadline && <p className="rsvp-date">Please reply by {dateLabel(rsvp.deadline)}.</p>}
          </div>
          {preview ? <div className="guest-form">RSVP submissions are disabled in the draft preview.</div> : <RsvpForm />}
        </div>
      </section>

      {wishlist.visible && <section className="section shell" id="wishlist">
        <div className="section-title"><Gift size={23} /><h2>{wishlist.heading}</h2><p className="paragraphs">{wishlist.introduction}</p></div>
        {gifts.length ? <div className="gift-grid">{gifts.map(gift => <article className="gift-card" key={gift.id}>
          {gift.image && <img src={gift.image} alt="" loading="lazy" />}
          <div className="gift-copy"><p className="gift-status">{ { AVAILABLE: "Available", RESERVED: "Reserved", RECEIVED: "Received" }[gift.status]}</p>
            <h3>{gift.name}</h3><p>{gift.description}</p>{wishlist.showPrices && gift.price && <p className="gift-price">{gift.price}</p>}
            {!preview && <ReserveGift itemId={gift.id} name={gift.name} available={gift.status === "AVAILABLE"} />}
          </div>
        </article>)}</div> : <p className="empty">There are no gifts listed yet.</p>}
      </section>}
    </main>
    <footer className="wedding-footer"><div className="shell">
      <Heart aria-hidden size={21} /><p>{footer.closing}</p><p className="footer-names">{names}</p>
      <div className="footer-links">{footer.email && <a href={"mailto:" + footer.email}>{footer.email}</a>}
        {footer.phone && <a href={"tel:" + footer.phone.replace(/[^+\d]/g, "")}>{footer.phone}</a>}</div>
      <small>Loop</small>
    </div></footer>
  </>;
}
