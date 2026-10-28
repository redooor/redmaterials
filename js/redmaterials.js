/*eslint-disable*/
(function () {
    "use strict";

    // Ripple-effect animation
    // Source: http://codepen.io/zavoloklom/pen/Gubja/
    document.addEventListener("click", function (e) {
        var rippler = e.target.closest(".ripple-effect"), ink, d, rect, cx, cy;
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
        // keyboard activation reports detail 0 and no coordinates: ripple from the centre
        cx = e.detail === 0 ? rect.left + rect.width / 2 : e.clientX;
        cy = e.detail === 0 ? rect.top + rect.height / 2 : e.clientY;
        ink.style.top = (cy - rect.top - rippler.clientTop - ink.offsetHeight / 2) + "px";
        ink.style.left = (cx - rect.left - rippler.clientLeft - ink.offsetWidth / 2) + "px";
        void ink.offsetWidth; // force reflow so the animation restarts
        ink.classList.add("animate");
    });

    // Navigation sidebar slide in/out
    document.addEventListener("click", function (e) {
        var trigger = e.target.closest("[data-toggle=nav-sidebar-toggle]"), selector, targets;
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
        targets.forEach(function (el) { el.classList.toggle("active"); });
        document.body.classList.toggle("rdm-ui-disable-scroll");
    });
}());
