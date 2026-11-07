/*eslint-disable*/
(function () {
    "use strict";

    // Ripple-effect animation
    // Source: http://codepen.io/zavoloklom/pen/Gubja/
    document.addEventListener("click", function (e) {
        var rippler = e.target.closest(".ripple-effect"), ink, d, rect, cx, cy, centred;
        if (!rippler) { return; }
        ink = rippler.querySelector(".ink");
        if (!ink) {
            ink = document.createElement("span");
            ink.className = "ink";
            rippler.appendChild(ink);
        }
        // prevent quick double clicks: restart the animation
        ink.classList.remove("animate");
        if (!ink.offsetHeight && !ink.offsetWidth) {
            d = Math.max(rippler.offsetWidth, rippler.offsetHeight);
            ink.style.height = d + "px";
            ink.style.width = d + "px";
        }
        rect = rippler.getBoundingClientRect();
        // keyboard activation and element.click() report detail 0 and no coordinates: ripple from the centre.
        // A synthetic click that carries coordinates keeps them.
        centred = e.detail === 0 && !e.clientX && !e.clientY;
        cx = centred ? rect.left + rect.width / 2 : e.clientX;
        cy = centred ? rect.top + rect.height / 2 : e.clientY;
        ink.style.top = (cy - rect.top - rippler.clientTop - ink.offsetHeight / 2) + "px";
        ink.style.left = (cx - rect.left - rippler.clientLeft - ink.offsetWidth / 2) + "px";
        void ink.offsetWidth; // force reflow so the animation restarts
        ink.classList.add("animate");
    });

    // Navigation sidebar slide in/out
    var openDrawers = [], returnFocus = null, FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    function drawerPanel(el) { return el.querySelector(".nav-sidebar") || el; }

    // body scrolling stays locked for as long as any drawer is open
    function syncDrawers() {
        openDrawers = openDrawers.filter(function (el) { return el.classList.contains("active"); });
        document.body.classList.toggle("rdm-ui-disable-scroll", openDrawers.length > 0);
        document.querySelectorAll("[data-toggle=nav-sidebar-toggle]").forEach(function (t) {
            var sel = t.getAttribute("data-target") || t.getAttribute("data-bs-target"), on = false;
            if (!t.matches("button, [role=button]")) { return; }
            try { on = !!sel && !!document.querySelector(sel + ".active"); } catch (err) { return; }
            t.setAttribute("aria-expanded", on ? "true" : "false");
        });
    }

    function closeDrawers() {
        openDrawers.forEach(function (el) { el.classList.remove("active"); });
        syncDrawers();
        if (returnFocus && returnFocus.focus) { returnFocus.focus(); }
        returnFocus = null;
    }

    document.addEventListener("click", function (e) {
        var trigger = e.target.closest("[data-toggle=nav-sidebar-toggle]"), selector, targets, panel;
        if (!trigger) { return; }
        e.preventDefault();
        e.stopPropagation();
        selector = trigger.getAttribute("data-target") || trigger.getAttribute("data-bs-target");
        if (!selector) { return; }
        try {
            targets = document.querySelectorAll(selector);
        } catch (err) {
            return; // invalid selector: nothing to toggle
        }
        if (!targets.length) { return; }
        targets.forEach(function (el) {
            var on = el.classList.toggle("active");
            if (on && openDrawers.indexOf(el) < 0) { openDrawers.push(el); }
        });
        syncDrawers();
        if (openDrawers.length) {
            // a drawer just opened: move focus into it and remember where to return it
            if (!returnFocus && trigger.matches(FOCUSABLE)) { returnFocus = trigger; }
            panel = drawerPanel(targets[0]);
            if (!panel.hasAttribute("tabindex")) { panel.setAttribute("tabindex", "-1"); }
            panel.focus();
        } else if (returnFocus && returnFocus.focus) {
            returnFocus.focus();
            returnFocus = null;
        }
    });

    // Escape closes the open drawer; Tab stays inside it
    document.addEventListener("keydown", function (e) {
        var panel, items, first, last;
        if (!openDrawers.length) { return; }
        if (e.key === "Escape") { closeDrawers(); return; }
        if (e.key !== "Tab") { return; }
        panel = drawerPanel(openDrawers[openDrawers.length - 1]);
        items = Array.prototype.filter.call(panel.querySelectorAll(FOCUSABLE), function (n) { return n.offsetWidth || n.offsetHeight; });
        if (!items.length) { e.preventDefault(); return; }
        first = items[0]; last = items[items.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
}());
