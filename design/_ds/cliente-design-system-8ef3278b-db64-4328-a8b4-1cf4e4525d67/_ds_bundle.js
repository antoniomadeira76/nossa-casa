/* @ds-bundle: {"format":4,"namespace":"ClienteDesignSystem_8ef327","components":[],"sourceHashes":{"ui_kits/tablet/App.jsx":"9975bf629d8a","ui_kits/tablet/Components.jsx":"2b28f617bdc2","ui_kits/tablet/Icon.jsx":"08d77eae5e06","ui_kits/tablet/Screens.jsx":"3650f3670b6f"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.ClienteDesignSystem_8ef327 = window.ClienteDesignSystem_8ef327 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// ui_kits/tablet/App.jsx
try { (() => {
/* App.jsx — top-level click-through */

function App() {
  const [screen, setScreen] = React.useState("login");
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const goto = s => setScreen(s);
  if (screen === "login") {
    return /*#__PURE__*/React.createElement(LoginScreen, {
      onLogin: () => goto("inicial")
    });
  }
  const content = {
    inicial: /*#__PURE__*/React.createElement(PaginaInicialScreen, {
      onStart: () => goto("captura")
    }),
    captura: /*#__PURE__*/React.createElement(CapturaDocScreen, {
      onComplete: () => goto("ficha"),
      onBack: () => goto("inicial")
    }),
    ficha: /*#__PURE__*/React.createElement(FichaClienteScreen, {
      onAssignCard: () => goto("cartao"),
      onBack: () => goto("inicial")
    }),
    cartao: /*#__PURE__*/React.createElement(AtribuirCartaoScreen, {
      onBack: () => goto("ficha"),
      onDone: () => goto("ficha")
    })
  }[screen];
  return /*#__PURE__*/React.createElement("div", {
    className: "app",
    "data-screen-label": screen
  }, /*#__PURE__*/React.createElement(Navbar, {
    onLogout: () => setCancelOpen(true)
  }), content, /*#__PURE__*/React.createElement(Modal, {
    open: cancelOpen,
    title: "Terminar sess\xE3o?",
    onClose: () => setCancelOpen(false),
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "outline",
      onClick: () => setCancelOpen(false)
    }, "Manter"), /*#__PURE__*/React.createElement(Button, {
      variant: "danger",
      onClick: () => {
        setCancelOpen(false);
        setScreen("login");
      }
    }, "Sair"))
  }, "Ao terminar sess\xE3o, todos os dados n\xE3o guardados ser\xE3o perdidos."));
}
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/tablet/App.jsx", error: String((e && e.message) || e) }); }

// ui_kits/tablet/Components.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Components.jsx — shared building blocks for the +Cliente tablet UI kit */

const {
  useState
} = React;

// ───────── Navbar ────────────────────────────────────────────────
function Navbar({
  branch = "Órgão 513 - Agência do Miramar",
  agent = "João Carlos Pedro",
  initials = "JP",
  onLogout
}) {
  return /*#__PURE__*/React.createElement("header", {
    className: "navbar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "logo"
  }), /*#__PURE__*/React.createElement("div", {
    className: "wordmark"
  }, "+Cliente"), /*#__PURE__*/React.createElement("div", {
    className: "right"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bank-chip"
  }, /*#__PURE__*/React.createElement("div", {
    className: "icon"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "bank",
    size: 24,
    color: "#001529"
  })), branch), /*#__PURE__*/React.createElement("div", {
    className: "bank-chip"
  }, /*#__PURE__*/React.createElement("div", {
    className: "avatar"
  }, initials), agent), /*#__PURE__*/React.createElement("button", {
    className: "logout-btn",
    onClick: onLogout,
    "aria-label": "Sair"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "logout",
    size: 28,
    color: "#274D64"
  }))));
}

// ───────── Buttons ──────────────────────────────────────────────
function Button({
  children,
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  ...rest
}) {
  const cls = `btn btn-${variant}${size === "lg" ? " btn-lg" : size === "sm" ? " btn-sm" : ""}`;
  return /*#__PURE__*/React.createElement("button", _extends({
    className: cls
  }, rest), icon && /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 20
  }), children, iconRight && /*#__PURE__*/React.createElement(Icon, {
    name: iconRight,
    size: 20
  }));
}

// ───────── Field ────────────────────────────────────────────────
function Field({
  label,
  value,
  placeholder,
  type = "text",
  onChange,
  disabled,
  error
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("div", {
    className: "field-label"
  }, label), /*#__PURE__*/React.createElement("input", {
    className: "input",
    type: type,
    value: value ?? "",
    placeholder: placeholder,
    onChange: onChange,
    disabled: disabled,
    style: error ? {
      borderColor: "var(--c-error)"
    } : {}
  }), error && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "Inter",
      fontSize: 12,
      color: "var(--c-error)"
    }
  }, error));
}
function ReadField({
  label,
  value
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("div", {
    className: "field-label"
  }, label), /*#__PURE__*/React.createElement("div", {
    className: "field-value"
  }, value));
}

// ───────── Status pill / Alert ──────────────────────────────────
function Pill({
  tone = "info",
  children
}) {
  return /*#__PURE__*/React.createElement("span", {
    className: `pill pill-${tone}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), children);
}
function Alert({
  tone = "info",
  title,
  children,
  onClose,
  action
}) {
  const ico = {
    info: "i",
    success: "✓",
    warn: "!",
    error: "×"
  }[tone];
  return /*#__PURE__*/React.createElement("div", {
    className: `alert alert-${tone}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "alert-ico"
  }, ico), title && /*#__PURE__*/React.createElement("div", {
    className: "alert-title"
  }, title), /*#__PURE__*/React.createElement("div", {
    className: "alert-body"
  }, children), action, onClose && /*#__PURE__*/React.createElement("button", {
    className: "alert-close",
    onClick: onClose
  }, "\xD7"));
}

// ───────── Document row ─────────────────────────────────────────
function DocRow({
  name,
  pages = 1,
  filled = false,
  onCapture,
  onView,
  onReplace
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: `doc-row${filled ? " filled" : ""}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "row",
    style: {
      gap: 32
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "name"
  }, name), /*#__PURE__*/React.createElement(Icon, {
    name: "infoCircle",
    size: 20,
    color: "#67769B"
  })), /*#__PURE__*/React.createElement("div", {
    className: "meta"
  }, /*#__PURE__*/React.createElement("div", {
    className: "page-num"
  }, pages), filled ? /*#__PURE__*/React.createElement("div", {
    className: "status-check"
  }, "\u2713") : /*#__PURE__*/React.createElement("div", {
    className: "status-circle"
  }), /*#__PURE__*/React.createElement("div", {
    className: "actions"
  }, filled ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    size: "sm",
    icon: "eye",
    onClick: onView
  }, "Ver"), /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    size: "sm",
    icon: "refresh",
    onClick: onReplace
  }, "Substituir")) : /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    size: "sm",
    icon: "camera",
    onClick: onCapture
  }, "Capturar"))));
}

// ───────── Tabs ─────────────────────────────────────────────────
function Tabs({
  tabs,
  active,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "tabs"
  }, tabs.map(t => /*#__PURE__*/React.createElement("div", {
    key: t,
    className: `tab${active === t ? " active" : ""}`,
    onClick: () => onChange?.(t)
  }, t)));
}

// ───────── Modal ────────────────────────────────────────────────
function Modal({
  open,
  title,
  children,
  onClose,
  actions
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "modal-backdrop",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("h2", {
    className: "modal-title"
  }, title), /*#__PURE__*/React.createElement("div", {
    className: "modal-body"
  }, children), /*#__PURE__*/React.createElement("div", {
    className: "modal-actions"
  }, actions)));
}

// ───────── Stepper ──────────────────────────────────────────────
function Stepper({
  steps,
  current
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "stepper"
  }, steps.map((label, i) => {
    const state = i < current ? "done" : i === current ? "current" : "todo";
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: i
    }, /*#__PURE__*/React.createElement("div", {
      className: `step ${state}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "num"
    }, state === "done" ? "✓" : i + 1), /*#__PURE__*/React.createElement("div", {
      className: "label"
    }, label)), i < steps.length - 1 && /*#__PURE__*/React.createElement("div", {
      className: `bar${i < current ? " done" : ""}`
    }));
  }));
}

// ───────── Page Title ───────────────────────────────────────────
function PageTitle({
  title,
  subtitle,
  right
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "row-between",
    style: {
      alignItems: "flex-end",
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "page-title",
    style: {
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, title), subtitle && /*#__PURE__*/React.createElement("div", {
    className: "muted"
  }, subtitle)), right);
}

// Expose globally
Object.assign(window, {
  Navbar,
  Button,
  Field,
  ReadField,
  Pill,
  Alert,
  DocRow,
  Tabs,
  Modal,
  Stepper,
  PageTitle
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/tablet/Components.jsx", error: String((e && e.message) || e) }); }

// ui_kits/tablet/Icon.jsx
try { (() => {
/* Icon.jsx — outlined 24-px icon set (Ant-style)
   Stroke follows currentColor. Exports a single <Icon name="…"/> component. */

const ICON_PATHS = {
  plus: /*#__PURE__*/React.createElement("path", {
    d: "M12 5v14M5 12h14"
  }),
  close: /*#__PURE__*/React.createElement("path", {
    d: "M6 6l12 12M6 18L18 6"
  }),
  check: /*#__PURE__*/React.createElement("path", {
    d: "M5 12l5 5L20 7"
  }),
  checkCircle: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 12l3 3 5-6"
  })),
  infoCircle: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 8v5M12 16v.5"
  })),
  closeCircle: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9 9l6 6M9 15l6-6"
  })),
  warning: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M12 4l10 17H2z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 10v5M12 18v.5"
  })),
  exclamation: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 7v6M12 16v.5"
  })),
  camera: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M3 7h4l2-2h6l2 2h4v12H3z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "13",
    r: "3.5"
  })),
  bank: /*#__PURE__*/React.createElement("path", {
    d: "M3 21h18M3 10h18M5 10V6l7-3 7 3v4M7 21V14M11 21V14M15 21V14M19 21V14"
  }),
  idcard: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "5",
    width: "18",
    height: "14",
    rx: "2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "12",
    r: "2.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M14 10h5M14 14h3"
  })),
  lock: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "5",
    y: "11",
    width: "14",
    height: "9",
    rx: "1.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 11V7a4 4 0 0 1 8 0v4"
  })),
  creditCard: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "6",
    width: "18",
    height: "12",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 10h18M7 15h3"
  })),
  fileDone: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M5 4h10l4 4v12H5z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M15 4v4h4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9 14l2 2 4-4"
  })),
  fileAdd: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M5 4h10l4 4v12H5z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M15 4v4h4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 11v6M9 14h6"
  })),
  fileText: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M5 4h10l4 4v12H5z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M15 4v4h4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 12h8M8 16h6"
  })),
  clock: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 7v5l3 2"
  })),
  user: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "8",
    r: "4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M4 21c0-4 4-7 8-7s8 3 8 7"
  })),
  logout: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M15 4h5v16h-5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M10 8l-5 4 5 4M5 12h11"
  })),
  eye: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "3"
  })),
  eyeOff: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M1 12s4-7 11-7c2 0 3.7.5 5.2 1.3M23 12s-1.6 2.8-4.5 5M3 3l18 18"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9.5 9.5a3 3 0 0 0 4.2 4.2"
  })),
  printer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M6 9V4h12v5"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "9",
    width: "18",
    height: "9",
    rx: "1.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M6 14h12v6H6z"
  })),
  caretDown: /*#__PURE__*/React.createElement("path", {
    d: "M6 9l6 6 6-6"
  }),
  caretUp: /*#__PURE__*/React.createElement("path", {
    d: "M6 15l6-6 6 6"
  }),
  caretRight: /*#__PURE__*/React.createElement("path", {
    d: "M9 6l6 6-6 6"
  }),
  caretLeft: /*#__PURE__*/React.createElement("path", {
    d: "M15 6l-6 6 6 6"
  }),
  search: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "7"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M16 16l5 5"
  })),
  edit: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M4 20l4-1 11-11-3-3L5 16l-1 4z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M14 5l3 3"
  })),
  trash: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"
  })),
  refresh: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M21 12a9 9 0 1 1-2.6-6.3L21 8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M21 3v5h-5"
  })),
  arrowRight: /*#__PURE__*/React.createElement("path", {
    d: "M5 12h14M13 6l6 6-6 6"
  }),
  arrowLeft: /*#__PURE__*/React.createElement("path", {
    d: "M19 12H5M11 6l-6 6 6 6"
  }),
  smile: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9 10v.5M15 10v.5M8 14c1 2 3 3 4 3s3-1 4-3"
  }))
};
function Icon({
  name,
  size = 24,
  color,
  className = "",
  style = {}
}) {
  const path = ICON_PATHS[name];
  const s = {
    width: size,
    height: size,
    color,
    ...style
  };
  return /*#__PURE__*/React.createElement("span", {
    className: `icon ${className}`,
    style: s
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: size,
    height: size
  }, path));
}
window.Icon = Icon;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/tablet/Icon.jsx", error: String((e && e.message) || e) }); }

// ui_kits/tablet/Screens.jsx
try { (() => {
/* Screens.jsx — full-screen scenes for the +Cliente tablet UI kit */

const {
  useState: useS
} = React;

// ───────── 1. Login ─────────────────────────────────────────────
function LoginScreen({
  onLogin
}) {
  const [user, setUser] = React.useState("joao.pedro@bfa.ao");
  const [pwd, setPwd] = React.useState("••••••••");
  const [show, setShow] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    className: "login-stage"
  }, /*#__PURE__*/React.createElement("div", {
    className: "login-glass"
  }, /*#__PURE__*/React.createElement("div", {
    className: "row",
    style: {
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 80,
      height: 80,
      borderRadius: 8,
      background: "url(../../assets/logo-cliente.png) center/cover"
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#fff",
      fontFamily: "Roboto",
      fontWeight: 500,
      fontSize: 38
    }
  }, "+Cliente"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "rgba(255,255,255,.7)",
      fontFamily: "Inter",
      fontSize: 14
    }
  }, "Aplica\xE7\xE3o de balc\xE3o \u2014 BFA"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, "Iniciar sess\xE3o"), /*#__PURE__*/React.createElement("p", null, "Introduza as suas credenciais BFA para come\xE7ar.")), /*#__PURE__*/React.createElement("div", {
    className: "col",
    style: {
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Utilizador",
    value: user,
    onChange: e => setUser(e.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("div", {
    className: "field-label",
    style: {
      color: "rgba(255,255,255,.9)"
    }
  }, "Palavra-passe"), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("input", {
    className: "input",
    type: show ? "text" : "password",
    value: pwd,
    onChange: e => setPwd(e.target.value),
    style: {
      paddingRight: 48
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShow(!show),
    style: {
      position: "absolute",
      right: 12,
      top: "50%",
      transform: "translateY(-50%)",
      background: "transparent",
      border: 0,
      cursor: "pointer",
      color: "#6A7282"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: show ? "eyeOff" : "eye",
    size: 22
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "row",
    style: {
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      color: "#FFE7BA",
      fontSize: 14,
      fontFamily: "Roboto"
    }
  }, "Esqueci a palavra-passe"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    onClick: () => onLogin?.(),
    iconRight: "arrowRight"
  }, "Entrar"))));
}

// ───────── 2. Página Inicial (post-login landing) ───────────────
function PaginaInicialScreen({
  onStart
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "page constrain"
  }, /*#__PURE__*/React.createElement(PageTitle, {
    title: "In\xEDcio",
    subtitle: "Selecione a opera\xE7\xE3o que pretende realizar com o Cliente."
  }), /*#__PURE__*/React.createElement(Alert, {
    tone: "info",
    title: "Atualiza\xE7\xE3o eMudar",
    action: /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      size: "sm"
    }, "Ver Nota")
  }, "Nota informativa sobre eMudar dispon\xEDvel para visualiza\xE7\xE3o."), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "col",
    style: {
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("h3", {
    className: "section-title"
  }, "Abertura de Conta"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 18,
      color: "var(--c-text-secondary)"
    }
  }, "Para iniciar a Abertura de Conta, por favor confirme se o Cliente apresenta os requisitos abaixo:"), /*#__PURE__*/React.createElement("ul", {
    style: {
      margin: 0,
      paddingLeft: 24,
      fontSize: 18,
      color: "var(--c-text-secondary)",
      lineHeight: 1.6
    }
  }, /*#__PURE__*/React.createElement("li", null, "Tem o Documento de Identifica\xE7\xE3o consigo e est\xE1 v\xE1lido;"), /*#__PURE__*/React.createElement("li", null, "No caso de ser menor de idade, est\xE1 acompanhado do pai ou da m\xE3e.")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 18,
      color: "var(--c-text-secondary)"
    }
  }, "Caso cumpra todos os requisitos, por favor clique em ", /*#__PURE__*/React.createElement("b", null, "Iniciar Abertura de Conta"), "."), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "rgba(255,251,230,.8)",
      borderRadius: 8,
      padding: 16,
      fontSize: 16
    }
  }, /*#__PURE__*/React.createElement("b", null, "Nota:"), " Caso o Cliente n\xE3o cumpra todos os requisitos acima mencionados, por favor efectue a Abertura de Conta no eMudar."), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    icon: "camera",
    onClick: onStart
  }, "Capturar Documento de Identifica\xE7\xE3o")))), /*#__PURE__*/React.createElement("div", {
    className: "row",
    style: {
      gap: 16,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement(QuickAction, {
    icon: "creditCard",
    label: "Atribuir Cart\xE3o"
  }), /*#__PURE__*/React.createElement(QuickAction, {
    icon: "fileText",
    label: "Transfer\xEAncias"
  }), /*#__PURE__*/React.createElement(QuickAction, {
    icon: "fileDone",
    label: "Dep\xF3sito a Prazo"
  }), /*#__PURE__*/React.createElement(QuickAction, {
    icon: "user",
    label: "Ficha de Cliente"
  }))));
}
function QuickAction({
  icon,
  label
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      flex: "1 0 240px",
      padding: 24,
      display: "flex",
      flexDirection: "column",
      gap: 12,
      cursor: "pointer",
      transition: "120ms"
    },
    onMouseEnter: e => e.currentTarget.style.boxShadow = "var(--elev-3)",
    onMouseLeave: e => e.currentTarget.style.boxShadow = "var(--elev-1)"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 48,
      height: 48,
      borderRadius: "50%",
      background: "rgba(241,101,5,.12)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--c-orange-strong)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 26
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "Roboto",
      fontWeight: 500,
      fontSize: 18
    }
  }, label));
}

// ───────── 3. Captura de Documento ──────────────────────────────
function CapturaDocScreen({
  onComplete,
  onBack
}) {
  const [docs, setDocs] = React.useState({
    front: false,
    back: false,
    signature: false,
    photo: false
  });
  const captured = Object.values(docs).filter(Boolean).length;
  const total = 4;
  const setFilled = k => setDocs(d => ({
    ...d,
    [k]: true
  }));
  return /*#__PURE__*/React.createElement("div", {
    className: "page constrain"
  }, /*#__PURE__*/React.createElement(Stepper, {
    steps: ["Captura Doc", "Confirmar Dados", "Abrir Conta", "Atribuir Cartão", "OTP"],
    current: 0
  }), /*#__PURE__*/React.createElement(PageTitle, {
    title: "Captura de Documento de Identifica\xE7\xE3o",
    subtitle: `${captured} de ${total} documentos carregados`
  }), /*#__PURE__*/React.createElement(Alert, {
    tone: "info",
    title: "Como funciona"
  }, "Tire fotografia de cada documento clicando no bot\xE3o. Alguns documentos podem j\xE1 constar no sistema e n\xE3o precisam de ser carregados, a n\xE3o ser que j\xE1 n\xE3o sejam v\xE1lidos."), /*#__PURE__*/React.createElement("div", {
    className: "col",
    style: {
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(DocRow, {
    name: "Bilhete de Identidade \u2014 Frente",
    pages: 1,
    filled: docs.front,
    onCapture: () => setFilled("front")
  }), /*#__PURE__*/React.createElement(DocRow, {
    name: "Bilhete de Identidade \u2014 Verso",
    pages: 2,
    filled: docs.back,
    onCapture: () => setFilled("back")
  }), /*#__PURE__*/React.createElement(DocRow, {
    name: "Assinatura do Cliente",
    pages: 1,
    filled: docs.signature,
    onCapture: () => setFilled("signature")
  }), /*#__PURE__*/React.createElement(DocRow, {
    name: "Fotografia do Cliente",
    pages: 1,
    filled: docs.photo,
    onCapture: () => setFilled("photo")
  })), /*#__PURE__*/React.createElement("div", {
    className: "row-between",
    style: {
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    icon: "arrowLeft",
    onClick: onBack
  }, "Voltar"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    iconRight: "arrowRight",
    disabled: captured < total,
    onClick: onComplete
  }, captured < total ? `Capturar restantes (${total - captured})` : "Confirmar Documentos")));
}

// ───────── 4. Ficha de Cliente ──────────────────────────────────
function FichaClienteScreen({
  onAssignCard,
  onBack
}) {
  const [tab, setTab] = React.useState("Dados");
  return /*#__PURE__*/React.createElement("div", {
    className: "page constrain"
  }, /*#__PURE__*/React.createElement(PageTitle, {
    title: "Ficha de Cliente",
    subtitle: "NDC 224 336 169 \u2014 Particular",
    right: /*#__PURE__*/React.createElement(Pill, {
      tone: "success"
    }, "Conta Aberta")
  }), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "customer-hero"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "section-title"
  }, "Dados de Entidade"), /*#__PURE__*/React.createElement("div", {
    className: "customer-fields",
    style: {
      marginTop: 24
    }
  }, /*#__PURE__*/React.createElement(ReadField, {
    label: "Nome",
    value: "Joaquina Francisca Rosado"
  }), /*#__PURE__*/React.createElement(ReadField, {
    label: "Data de Nascimento",
    value: "13 / 05 / 1987"
  }), /*#__PURE__*/React.createElement(ReadField, {
    label: "Bilhete de Identidade",
    value: "004906775 ZE 046"
  }), /*#__PURE__*/React.createElement(ReadField, {
    label: "Validade",
    value: "13 / 05 / 2029"
  }), /*#__PURE__*/React.createElement(ReadField, {
    label: "Email Pessoal",
    value: "joaquina.r@gmail.com"
  }), /*#__PURE__*/React.createElement(ReadField, {
    label: "Telem\xF3vel",
    value: "+244 923 456 789"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 24,
      display: "flex",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    size: "sm",
    icon: "edit"
  }, "Editar dados"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm",
    icon: "fileText"
  }, "Mostrar detalhe"))), /*#__PURE__*/React.createElement("div", {
    className: "customer-side"
  }, /*#__PURE__*/React.createElement("div", {
    className: "customer-stamp"
  }, "Dados confirmados a 13/05/2023"), /*#__PURE__*/React.createElement("div", {
    className: "customer-photo",
    style: {
      backgroundImage: "url(../../assets/avatar-customer.jpg)"
    }
  })))), /*#__PURE__*/React.createElement(Tabs, {
    tabs: ["Dados", "Perfil Financeiro", "Contratos", "Atividades em Curso"],
    active: tab,
    onChange: setTab
  }), tab === "Dados" && /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "row-between",
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("h3", {
    className: "section-title"
  }, "NDC Particular 224 336 169"), /*#__PURE__*/React.createElement("div", {
    className: "customer-stamp"
  }, "Aberto a 13/05/2023")), /*#__PURE__*/React.createElement("div", {
    className: "customer-fields"
  }, /*#__PURE__*/React.createElement(ReadField, {
    label: "Titular",
    value: "Joaquina Francisca Rosado"
  }), /*#__PURE__*/React.createElement(ReadField, {
    label: "\xD3rg\xE3o de Domic\xEDlio",
    value: "202 \u2014 Ag. Cabinda D. Rodrigues"
  }), /*#__PURE__*/React.createElement(ReadField, {
    label: "Tipo de Interven\xE7\xE3o",
    value: "Titular 02"
  }), /*#__PURE__*/React.createElement(ReadField, {
    label: "Moeda",
    value: "Kwanza (AOA)"
  }))), tab === "Contratos" && /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "section-title",
    style: {
      marginBottom: 16
    }
  }, "Contratos ativos"), /*#__PURE__*/React.createElement("div", {
    className: "col"
  }, /*#__PURE__*/React.createElement(ContractRow, {
    title: "Conta \xE0 Ordem Particular",
    id: "224 336 169",
    status: "success",
    date: "13/05/2023"
  }), /*#__PURE__*/React.createElement(ContractRow, {
    title: "Cart\xE3o Multicaixa Azul",
    id: "**** 4521",
    status: "success",
    date: "14/05/2023"
  }), /*#__PURE__*/React.createElement(ContractRow, {
    title: "BFA Net",
    id: "Ades\xE3o #20231",
    status: "warn",
    date: "Pendente OTP"
  }))), tab === "Perfil Financeiro" && /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("p", null, "Perfil financeiro n\xE3o dispon\xEDvel neste prot\xF3tipo.")), tab === "Atividades em Curso" && /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "col"
  }, /*#__PURE__*/React.createElement(ContractRow, {
    title: "Atribui\xE7\xE3o de Cart\xE3o Multicaixa",
    id: "Opera\xE7\xE3o #98421",
    status: "warn",
    date: "A Decorrer"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "action-bar"
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    icon: "arrowLeft",
    onClick: onBack
  }, "Voltar"), /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    icon: "creditCard",
    onClick: onAssignCard
  }, "Atribuir Cart\xE3o"), /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    icon: "fileText"
  }, "Transfer\xEAncia"), /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    icon: "fileDone"
  }, "Dep\xF3sito a Prazo"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    icon: "plus"
  }, "Nova Opera\xE7\xE3o")));
}
function ContractRow({
  title,
  id,
  status,
  date
}) {
  const toneMap = {
    success: "success",
    warn: "warn",
    error: "error"
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "doc-row",
    style: {
      background: "#fff"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "Roboto",
      fontWeight: 500,
      fontSize: 18,
      color: "var(--c-text-primary)"
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "Inter",
      fontSize: 13,
      color: "var(--c-text-muted)",
      marginTop: 4
    }
  }, id)), /*#__PURE__*/React.createElement("div", {
    className: "row",
    style: {
      gap: 24
    }
  }, /*#__PURE__*/React.createElement(Pill, {
    tone: toneMap[status]
  }, date), /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    size: "sm",
    icon: "caretRight"
  }, "Abrir")));
}

// ───────── 5. Atribuir Cartão (with OTP modal) ──────────────────
function AtribuirCartaoScreen({
  onBack,
  onDone
}) {
  const [otpOpen, setOtpOpen] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [otp, setOtp] = React.useState(["", "", "", "", "", ""]);
  const submit = () => {
    setOtpOpen(false);
    setSuccess(true);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "page constrain"
  }, /*#__PURE__*/React.createElement(Stepper, {
    steps: ["Captura Doc", "Confirmar Dados", "Abrir Conta", "Atribuir Cartão", "OTP"],
    current: 3
  }), /*#__PURE__*/React.createElement(PageTitle, {
    title: "Atribuir Cart\xE3o",
    subtitle: "Joaquina Francisca Rosado \xB7 NDC 224 336 169"
  }), success && /*#__PURE__*/React.createElement(Alert, {
    tone: "success",
    title: "Cart\xE3o atribu\xEDdo com sucesso",
    onClose: () => setSuccess(false)
  }, "O cart\xE3o Multicaixa Azul foi associado \xE0 conta da Cliente. O PIN foi enviado por SMS."), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "section-title",
    style: {
      marginBottom: 24
    }
  }, "Configura\xE7\xE3o do cart\xE3o"), /*#__PURE__*/React.createElement("div", {
    className: "customer-fields"
  }, /*#__PURE__*/React.createElement(ReadField, {
    label: "Tipo de cart\xE3o",
    value: "Multicaixa Azul"
  }), /*#__PURE__*/React.createElement(ReadField, {
    label: "Conta de d\xE9bito",
    value: "0006.0202.0022.4336.169.50 (AOA)"
  }), /*#__PURE__*/React.createElement(ReadField, {
    label: "Limite di\xE1rio",
    value: "500 000,00 Kz"
  }), /*#__PURE__*/React.createElement(ReadField, {
    label: "Plafond mensal",
    value: "2 000 000,00 Kz"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "section-title",
    style: {
      marginBottom: 16
    }
  }, "Cart\xE3o"), /*#__PURE__*/React.createElement("div", {
    className: "row",
    style: {
      gap: 24,
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 360,
      height: 220,
      borderRadius: 16,
      background: "linear-gradient(135deg, #001529 0%, #011B58 100%)",
      padding: 24,
      color: "#fff",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      boxShadow: "var(--elev-2)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "row-between"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "Roboto",
      fontWeight: 500,
      fontSize: 18
    }
  }, "BFA Multicaixa"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "Roboto",
      fontWeight: 700,
      fontSize: 18,
      color: "#FFE7BA"
    }
  }, "+Cliente")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "monospace",
      fontSize: 22,
      letterSpacing: "2px"
    }
  }, "\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 4521"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "Inter",
      fontSize: 11,
      opacity: .7,
      marginTop: 8
    }
  }, "V\xC1LIDO AT\xC9"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "Inter",
      fontSize: 14
    }
  }, "05 / 29")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "Inter",
      fontSize: 14,
      textTransform: "uppercase"
    }
  }, "JOAQUINA F. ROSADO")), /*#__PURE__*/React.createElement("div", {
    className: "col",
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Alert, {
    tone: "info",
    title: "Confirma\xE7\xE3o por OTP"
  }, "A opera\xE7\xE3o requer confirma\xE7\xE3o por c\xF3digo SMS. O Cliente receber\xE1 um c\xF3digo de 6 d\xEDgitos no telem\xF3vel ", /*#__PURE__*/React.createElement("b", null, "+244 923 456 789"), ".")))), /*#__PURE__*/React.createElement("div", {
    className: "row-between"
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    icon: "arrowLeft",
    onClick: onBack
  }, "Voltar"), /*#__PURE__*/React.createElement("div", {
    className: "row",
    style: {
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "outline"
  }, "Cancelar Opera\xE7\xE3o"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    icon: "lock",
    onClick: () => setOtpOpen(true)
  }, "Confirmar com OTP"))), /*#__PURE__*/React.createElement(Modal, {
    open: otpOpen,
    title: "Introduza o c\xF3digo OTP",
    onClose: () => setOtpOpen(false),
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "outline",
      onClick: () => setOtpOpen(false)
    }, "Cancelar"), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      onClick: submit
    }, "Confirmar"))
  }, /*#__PURE__*/React.createElement("p", null, "Foi enviado um c\xF3digo de 6 d\xEDgitos para o telem\xF3vel da Cliente."), /*#__PURE__*/React.createElement("div", {
    className: "row",
    style: {
      gap: 12,
      marginTop: 16,
      marginBottom: 16,
      justifyContent: "center"
    }
  }, otp.map((d, i) => /*#__PURE__*/React.createElement("input", {
    key: i,
    className: "input",
    style: {
      width: 56,
      height: 64,
      textAlign: "center",
      fontSize: 28,
      fontFamily: "Roboto",
      fontWeight: 700
    },
    value: d,
    maxLength: 1,
    onChange: e => {
      const next = [...otp];
      next[i] = e.target.value;
      setOtp(next);
    }
  }))), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      color: "var(--c-orange-strong)",
      fontSize: 14,
      fontFamily: "Roboto"
    }
  }, "Reenviar c\xF3digo")));
}
Object.assign(window, {
  LoginScreen,
  PaginaInicialScreen,
  CapturaDocScreen,
  FichaClienteScreen,
  AtribuirCartaoScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/tablet/Screens.jsx", error: String((e && e.message) || e) }); }

})();
