/* cliente-icon.jsx — +Cliente outlined 24px icon set (Ant Design outline family).
   Copied from the design system's ui_kits/tablet/Icon.jsx; prop renamed to `icon`
   and stroke set explicitly so it works without the kit stylesheet. */

const P = {
  plus:        <path d="M12 5v14M5 12h14"/>,
  close:       <path d="M6 6l12 12M6 18L18 6"/>,
  check:       <path d="M5 12l5 5L20 7"/>,
  checkCircle: <><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></>,
  infoCircle:  <><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16v.5"/></>,
  closeCircle: <><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M9 15l6-6"/></>,
  warning:     <><path d="M12 4l10 17H2z"/><path d="M12 10v5M12 18v.5"/></>,
  exclamation: <><circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16v.5"/></>,
  camera:      <><path d="M3 7h4l2-2h6l2 2h4v12H3z"/><circle cx="12" cy="13" r="3.5"/></>,
  bank:        <path d="M3 21h18M3 10h18M5 10V6l7-3 7 3v4M7 21V14M11 21V14M15 21V14M19 21V14"/>,
  idcard:      <><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="12" r="2.5"/><path d="M14 10h5M14 14h3"/></>,
  lock:        <><rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></>,
  creditCard:  <><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h3"/></>,
  fileDone:    <><path d="M5 4h10l4 4v12H5z"/><path d="M15 4v4h4"/><path d="M9 14l2 2 4-4"/></>,
  fileAdd:     <><path d="M5 4h10l4 4v12H5z"/><path d="M15 4v4h4"/><path d="M12 11v6M9 14h6"/></>,
  fileText:    <><path d="M5 4h10l4 4v12H5z"/><path d="M15 4v4h4"/><path d="M8 12h8M8 16h6"/></>,
  clock:       <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  user:        <><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></>,
  logout:      <><path d="M15 4h5v16h-5"/><path d="M10 8l-5 4 5 4M5 12h11"/></>,
  eye:         <><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></>,
  eyeOff:      <><path d="M1 12s4-7 11-7c2 0 3.7.5 5.2 1.3M23 12s-1.6 2.8-4.5 5M3 3l18 18"/><path d="M9.5 9.5a3 3 0 0 0 4.2 4.2"/></>,
  printer:     <><path d="M6 9V4h12v5"/><rect x="3" y="9" width="18" height="9" rx="1.5"/><path d="M6 14h12v6H6z"/></>,
  caretDown:   <path d="M6 9l6 6 6-6"/>,
  caretUp:     <path d="M6 15l6-6 6 6"/>,
  caretRight:  <path d="M9 6l6 6-6 6"/>,
  caretLeft:   <path d="M15 6l-6 6 6 6"/>,
  search:      <><circle cx="11" cy="11" r="7"/><path d="M16 16l5 5"/></>,
  edit:        <><path d="M4 20l4-1 11-11-3-3L5 16l-1 4z"/><path d="M14 5l3 3"/></>,
  trash:       <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></>,
  refresh:     <><path d="M21 12a9 9 0 1 1-2.6-6.3L21 8"/><path d="M21 3v5h-5"/></>,
  sun:         <><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"/></>,
  moon:        <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>,
  device:      <><rect x="7" y="2.5" width="10" height="19" rx="2.2"/><path d="M10.5 5.5h3"/></>,
  arrowRight:  <path d="M5 12h14M13 6l6 6-6 6"/>,
  arrowLeft:   <path d="M19 12H5M11 6l-6 6 6 6"/>,
  smile:       <><circle cx="12" cy="12" r="9"/><path d="M9 10v.5M15 10v.5M8 14c1 2 3 3 4 3s3-1 4-3"/></>,
  calendar:    <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></>,
  home:        <path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>,
  wallet:      <><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 11h18M16 15h2"/></>,
  checkSquare: <><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 12l3 3 5-6"/></>,
  menu:        <path d="M4 7h16M4 12h16M4 17h16"/>,
  drag:        <path d="M5 9h14M5 15h14"/>,
  book:        <path d="M6.5 4h11a1 1 0 0 1 1 1v15.3l-6.5-4.5-6.5 4.5V5a1 1 0 0 1 1-1z"/>,
  sliders:     <><path d="M4 7h6M14 7h6M4 17h10M18 17h2"/><circle cx="12" cy="7" r="2.2"/><circle cx="16" cy="17" r="2.2"/></>,
  houseSliders: <><path d="M3.5 10.2L12 3.4l8.5 6.8V20a.9.9 0 0 1-.9.9H4.4a.9.9 0 0 1-.9-.9z"/><path d="M7.6 13.4h2.1M12.4 13.4h4M7.6 17.4h4.1M14.4 17.4h2"/><circle cx="11.1" cy="13.4" r="1.35"/><circle cx="13.1" cy="17.4" r="1.35"/></>,
  houseGear:   <><circle cx="8.6" cy="8.6" r="3.5"/><path d="M8.6 5.1V3.1M8.6 12.1v2M5.57 6.85L3.92 5.9M11.63 10.35l1.65.95M5.57 10.35L3.92 11.3M11.63 6.85l1.65-.95"/><path d="M11.3 15l5.2-4.4 5.2 4.4"/><path d="M12.9 15v6h7.2v-6"/><circle cx="16.5" cy="16.7" r="1.05"/><path d="M15.3 21v-2.1h2.4V21"/></>,
  heartPulse:  <><path d="M12 20S3.8 14.9 3.8 9.4A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 8.2 2.4C20.2 14.9 12 20 12 20z"/><path d="M6.6 12.4h2.6l1.3-2.3 1.6 4 1.4-2.6h2.5"/></>,
};

function ClienteIcon({ icon = 'infoCircle', size = 24, color, style = {} }) {
  const n = Number(size) || 24;
  return (
    <span style={{ display: 'inline-flex', width: n, height: n, color, flex: 'none', ...style }}>
      <svg viewBox="0 0 24 24" width={n} height={n} fill="none" stroke="currentColor"
           strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">{P[icon] || P.infoCircle}</svg>
    </span>
  );
}

window.ClienteIcon = ClienteIcon;
