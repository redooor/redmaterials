(function() {
  "use strict";
  document.addEventListener("click", function(e) {
    var rippler = e.target.closest(".ripple-effect"), ink, d, rect, cx, cy, centred;
    if (!rippler) {
      return;
    }
    ink = rippler.querySelector(".ink");
    if (!ink) {
      ink = document.createElement("span");
      ink.className = "ink";
      rippler.appendChild(ink);
    }
    ink.classList.remove("animate");
    if (!ink.offsetHeight && !ink.offsetWidth) {
      d = Math.max(rippler.offsetWidth, rippler.offsetHeight);
      ink.style.height = d + "px";
      ink.style.width = d + "px";
    }
    rect = rippler.getBoundingClientRect();
    centred = e.detail === 0 && !e.clientX && !e.clientY;
    cx = centred ? rect.left + rect.width / 2 : e.clientX;
    cy = centred ? rect.top + rect.height / 2 : e.clientY;
    ink.style.top = cy - rect.top - rippler.clientTop - ink.offsetHeight / 2 + "px";
    ink.style.left = cx - rect.left - rippler.clientLeft - ink.offsetWidth / 2 + "px";
    void ink.offsetWidth;
    ink.classList.add("animate");
  });
  document.addEventListener("click", function(e) {
    var trigger = e.target.closest("[data-toggle=nav-sidebar-toggle]"), selector, targets;
    if (!trigger) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    selector = trigger.getAttribute("data-target") || trigger.getAttribute("data-bs-target");
    if (!selector) {
      return;
    }
    try {
      targets = document.querySelectorAll(selector);
    } catch (err) {
      return;
    }
    if (!targets.length) {
      return;
    }
    targets.forEach(function(el) {
      el.classList.toggle("active");
    });
    document.body.classList.toggle("rdm-ui-disable-scroll");
  });
})();
