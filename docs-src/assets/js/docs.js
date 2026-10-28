/*global bootstrap, docsState*/
(function () {
    'use strict';
    document.addEventListener('DOMContentLoaded', function () {
        var st = docsState.get(), side = document.getElementById('docs-sidebar');
        document.querySelectorAll('input[name=theme]').forEach(function (r) {
            r.checked = r.value === st.theme;
            r.addEventListener('change', function () { docsState.set({ theme: r.value }); });
        });
        document.querySelectorAll('input[name=color-mode]').forEach(function (r) {
            r.checked = r.value === st.mode;
            r.addEventListener('change', function () { docsState.set({ mode: r.value }); });
        });
        document.querySelectorAll('iframe.docs-demo').forEach(function (f) { f.addEventListener('load', docsState.broadcast); });
        // anchor navigation does not close an offcanvas by itself: close it after a section is chosen
        side.addEventListener('click', function (e) {
            var oc = e.target.closest('a.nav-link') && bootstrap.Offcanvas.getInstance(side);
            if (oc) { oc.hide(); }
        });
        // keep the active link visible inside the scrolling sidebar
        document.addEventListener('activate.bs.scrollspy', function (e) {
            if (e.relatedTarget) { e.relatedTarget.scrollIntoView({ block: 'nearest' }); }
        });
        document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(function (el) { new bootstrap.Tooltip(el); });
        document.querySelectorAll('[data-bs-toggle="popover"]').forEach(function (el) { new bootstrap.Popover(el); });
    });
}());
