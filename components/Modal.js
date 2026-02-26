import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function Modal({ title, onClose, children }) {
    return (_jsx("div", { className: "modal-overlay", onClick: e => { if (e.target === e.currentTarget)
            onClose(); }, children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsx("h2", { className: "modal-title", children: title }), _jsx("button", { className: "modal-close", onClick: onClose, children: "\u00D7" })] }), children] }) }));
}
