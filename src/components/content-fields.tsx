"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import type { Wedding } from "@/services/content";

type Photo = Wedding["gallery"]["photos"][number];
type Event = Wedding["programme"]["events"][number];
type Colour = Wedding["attire"]["colours"][number];
type ListProps =
  | { kind: "Photo"; initial: Photo[] }
  | { kind: "Event"; initial: Event[] }
  | { kind: "Colour"; initial: Colour[] };

export function PhotoFields({ prefix, photo, required = true }: { prefix: string; photo?: Photo; required?: boolean }) {
  const image = photo?.image ?? "";
  return <div className="image-fields">
    {image && <img src={image} alt="" width={128} height={90} />}
    <input type="hidden" name={prefix + "Image"} value={image} />
    <label>{image ? "Replace image" : "Upload image"}
      <input name={prefix + "File"} type="file" accept="image/jpeg,image/png,image/webp" required={required && !image} />
    </label>
    <label>Image description<input name={prefix + "Alt"} defaultValue={photo?.alt} maxLength={150} required /></label>
  </div>;
}

export function OrderedList({ kind, initial }: ListProps) {
  const [items, setItems] = useState<{ id: number; value?: Photo | Event | Colour }[]>(() => initial.map((value, id) => ({ id, value })));
  const nextId = useRef(initial.length);
  const max = kind === "Colour" ? 12 : 24;

  function move(index: number, offset: number) {
    setItems(current => {
      const order = [...current];
      [order[index], order[index + offset]] = [order[index + offset], order[index]];
      return order;
    });
  }

  return <div className="ordered-list">
    <input type="hidden" name="count" value={items.length} />
    {items.map(({ id, value }, index) => <div className="editor-row" key={id}>
      {kind === "Photo" && <PhotoFields prefix={"gallery" + index} photo={value as Photo | undefined} />}
      {kind === "Event" && <div className="admin-fields">
        <label>Event name<input name={"name" + index} defaultValue={(value as Event | undefined)?.name} required maxLength={100} /></label>
        <label>Time<input name={"time" + index} defaultValue={(value as Event | undefined)?.time} required maxLength={50} /></label>
        <label className="full-width">Description<textarea name={"description" + index} defaultValue={(value as Event | undefined)?.description} maxLength={500} rows={2} /></label>
      </div>}
      {kind === "Colour" && <div className="admin-fields">
        <label>Colour name<input name={"name" + index} defaultValue={(value as Colour | undefined)?.name} required maxLength={40} /></label>
        <label>Colour<input type="color" name={"hex" + index} defaultValue={(value as Colour | undefined)?.hex ?? "#8d957d"} /></label>
      </div>}
      <div className="admin-row">
        <button className="icon-button" type="button" aria-label={`Move ${kind.toLowerCase()} ${index + 1} up`} onClick={() => move(index, -1)} disabled={index === 0}><ArrowUp size={16} /></button>
        <button className="icon-button" type="button" aria-label={`Move ${kind.toLowerCase()} ${index + 1} down`} onClick={() => move(index, 1)} disabled={index === items.length - 1}><ArrowDown size={16} /></button>
        <button className="icon-button" type="button" aria-label={`Remove ${kind.toLowerCase()} ${index + 1}`} onClick={() => setItems(current => current.filter(item => item.id !== id))}><Trash2 size={16} /></button>
      </div>
    </div>)}
    <button className="button button-outline" type="button" disabled={items.length >= max} onClick={() => {
      const id = nextId.current++;
      setItems(current => [...current, { id }]);
    }}><Plus size={17} /> Add {kind.toLowerCase()}</button>
  </div>;
}
