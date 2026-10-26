// Íconos de trazo (24x24, currentColor).
const base = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
const I = (paths) => function Icon(props) { return <svg {...base} {...props}>{paths}</svg>; };

export const IconRoute = I(<><circle cx="6" cy="19" r="2.5" /><circle cx="18" cy="5" r="2.5" /><path d="M8.5 19H16a3.5 3.5 0 0 0 0-7H8a3.5 3.5 0 0 1 0-7h7.5" /></>);
export const IconClock = I(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>);
export const IconCard = I(<><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 10h19M6.5 15h4" /></>);
export const IconChat = I(<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12Z" />);
export const IconClose = I(<path d="M6 6l12 12M18 6 6 18" />);
export const IconSend = I(<><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>);
export const IconPhone = I(<path d="M5 3.5h3.2l1.6 4.2-2.1 1.3a11 11 0 0 0 7.3 7.3l1.3-2.1 4.2 1.6V19a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 3.5 5.1 1.5 1.5 0 0 1 5 3.5Z" />);
export const IconPin = I(<><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></>);
export const IconArrow = I(<path d="M5 12h14m-6-6 6 6-6 6" />);
export const IconSearch = I(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>);
export const IconBus = I(<><rect x="4" y="3" width="16" height="15" rx="3" /><path d="M4 11h16M8 18v2.5M16 18v2.5" /><circle cx="8" cy="14.5" r=".8" fill="currentColor" /><circle cx="16" cy="14.5" r=".8" fill="currentColor" /></>);
export const IconAccessible = I(<><circle cx="12" cy="4.5" r="1.8" /><path d="M7 8.5h10M12 8.5v5.5h4.5l2 5" /><path d="M9.5 12.5a5 5 0 1 0 6.3 6.3" /></>);
export const IconSnow = I(<path d="M12 2v20M4.9 6l14.2 12M19.1 6 4.9 18M9 4l3 2 3-2M9 20l3-2 3 2" />);
export const IconMoon = I(<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />);
export const IconShield = I(<><path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></>);
export const IconBag = I(<><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>);
export const IconAlert = I(<><path d="M12 3 2 20h20L12 3Z" /><path d="M12 10v4M12 17h.01" /></>);
export const IconFace = I(<><circle cx="12" cy="12" r="9" /><path d="M8.5 15.5s1.3-1.5 3.5-1.5 3.5 1.5 3.5 1.5M9 9.5h.01M15 9.5h.01" /></>);
export const IconStop = I(<><path d="M7 21V4M7 4h9l-2 3.5L16 11H7" /></>);
export const IconBriefcase = I(<><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18" /></>);
export const IconMenu = I(<path d="M4 7h16M4 12h16M4 17h16" />);
export const IconCheck = I(<path d="m5 12.5 4.5 4.5L19 7.5" />);
export const IconMail = I(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 6.5 8.5 7 8.5-7" /></>);
export const IconSwap = I(<path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" />);
export const IconInfo = I(<><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>);

export const CATEGORIA_ICON = {
  clock: IconClock, stop: IconStop, face: IconFace, alert: IconAlert,
  bus: IconBus, card: IconCard, bag: IconBag, chat: IconChat, shield: IconShield,
};
