/*global bootstrap, docsState*/
(function () {
    'use strict';
    document.addEventListener('DOMContentLoaded', function () {
        var st = docsState.get(), side = document.getElementById('docs-sidebar');
        document.querySelectorAll('input[name=color-mode]').forEach(function (r) {
            r.checked = r.value === st.mode;
            r.addEventListener('change', function () { docsState.set({ mode: r.value }); });
        });
        // anchor navigation does not close an offcanvas by itself: close it after a section is chosen
        side.addEventListener('click', function (e) {
            var oc = e.target.closest('#nav_spy a, .nav-sidebar-menu a') && bootstrap.Offcanvas.getInstance(side);
            if (oc) { oc.hide(); }
        });
        // links inside live examples are demos: a click must show the component (a ripple, a tab, a toggle), not jump to the
        // section their placeholder href points at
        document.addEventListener('click', function (e) {
            var a = e.target.closest('.bs-component a[href^="#"]');
            if (a) { e.preventDefault(); }
        });
        // keep the active link visible inside the scrolling sidebar and move the Redmaterials active row (li.active + aria-current) with it
        document.addEventListener('activate.bs.scrollspy', function (e) {
            if (e.relatedTarget) {
                document.querySelectorAll('#nav_spy a').forEach(function (a) {
                    a.parentElement.classList.toggle('active', a === e.relatedTarget);
                    if (a === e.relatedTarget) { a.setAttribute('aria-current', 'location'); } else { a.removeAttribute('aria-current'); }
                });
                e.relatedTarget.scrollIntoView({ block: 'nearest' });
            }
        });
        document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(function (el) { new bootstrap.Tooltip(el); });
        document.querySelectorAll('[data-bs-toggle="popover"]').forEach(function (el) { new bootstrap.Popover(el); });
    });
}());
