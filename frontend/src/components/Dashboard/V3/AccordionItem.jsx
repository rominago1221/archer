import React from 'react';
import { ChevronRight } from 'lucide-react';

// Act 3 accordion row. Icon + title + sub + badge + chevron in the head.
// Body is rendered inside .accordion-body-inner; the parent .accordion-body
// handles the max-height transition via the `.open` class on the item.
export default function AccordionItem({
  id, iconTone = 'blue', Icon, title, sub,
  badgeTone, badgeText,
  isOpen, onToggle,
  children,
}) {
  return (
    <div className={`accordion-item${isOpen ? ' open' : ''}`} data-testid={`act3-accordion-${id}`}>
      <button
        type="button"
        className="accordion-head"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`act3-accordion-body-${id}`}
        data-testid={`act3-accordion-head-${id}`}
      >
        {Icon && (
          <div className={`accordion-icon ${iconTone}`}><Icon size={18} aria-hidden /></div>
        )}
        <div className="accordion-title-wrap">
          <div className="accordion-title">{title}</div>
          {sub && <div className="accordion-sub">{sub}</div>}
        </div>
        {badgeText && (
          <span className={`accordion-badge ${badgeTone || 'blue'}`}>{badgeText}</span>
        )}
        <div className="accordion-chevron"><ChevronRight size={14} aria-hidden /></div>
      </button>
      <div className="accordion-body" id={`act3-accordion-body-${id}`}>
        <div className="accordion-body-inner">
          {children}
        </div>
      </div>
    </div>
  );
}
