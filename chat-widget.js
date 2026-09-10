/**
 * UMRT floating chat widget — client only.
 * Talks to /api/chat (Pages Function). No API keys in this file.
 */
(function () {
  "use strict";

  var PHONE_LABEL = "(616) 606-5277";
  var TEL = "tel:+16166065277";
  var BOOK = "/book.html";
  var API = "/api/chat";

  var messages = [];
  var lead = {};
  var busy = false;

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "className") node.className = attrs[k];
        else if (k === "text") node.textContent = attrs[k];
        else if (k === "html") node.innerHTML = attrs[k];
        else if (k.indexOf("on") === 0 && typeof attrs[k] === "function") {
          node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        } else if (attrs[k] !== undefined && attrs[k] !== null) {
          node.setAttribute(k, attrs[k]);
        }
      });
    }
    (children || []).forEach(function (c) {
      if (c == null) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  function iconChat() {
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    var path = document.createElementNS(ns, "path");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute(
      "d",
      "M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"
    );
    svg.appendChild(path);
    return svg;
  }

  function softFailBlock(text) {
    var wrap = el("div", { className: "umrt-chat-msg is-softfail", "data-role": "assistant" });
    wrap.appendChild(document.createTextNode(text || "I'm having trouble reaching our advisor right now."));
    wrap.appendChild(
      el("div", { className: "umrt-chat-softfail-actions" }, [
        el("a", { href: TEL, text: "Call or text " + PHONE_LABEL }),
        el("a", { href: BOOK, className: "umrt-chat-link-muted", text: "Or finish on the Book page" }),
      ])
    );
    return wrap;
  }

  function appendMsg(role, text, softFail) {
    var box = document.getElementById("umrt-chat-messages");
    if (!box) return;
    var node;
    if (softFail) {
      node = softFailBlock(text);
    } else {
      node = el("div", { className: "umrt-chat-msg", "data-role": role, text: text });
    }
    box.appendChild(node);
    box.scrollTop = box.scrollHeight;
  }

  function collectLead() {
    var root = document.getElementById("umrt-chat-root");
    if (!root || !root.classList.contains("show-lead")) return null;
    var name = (document.getElementById("umrt-lead-name") || {}).value || "";
    var phone = (document.getElementById("umrt-lead-phone") || {}).value || "";
    var cityZip = (document.getElementById("umrt-lead-city") || {}).value || "";
    var issue = (document.getElementById("umrt-lead-issue") || {}).value || "";
    var prefer = (document.getElementById("umrt-lead-prefer") || {}).value || "";
    if (!name && !phone && !cityZip && !issue && !prefer) return null;
    lead = {
      name: name.trim() || undefined,
      phone: phone.trim() || undefined,
      cityZip: cityZip.trim() || undefined,
      issue: issue.trim() || undefined,
      preferText: prefer || undefined,
    };
    return lead;
  }

  function maybeShowLead(userText) {
    var t = (userText || "").toLowerCase();
    if (/book|schedule|text me|call me|my (name|number|phone)|ready to|sign me/.test(t)) {
      var root = document.getElementById("umrt-chat-root");
      if (root) root.classList.add("show-lead");
    }
  }

  async function send() {
    if (busy) return;
    var input = document.getElementById("umrt-chat-input");
    var sendBtn = document.getElementById("umrt-chat-send");
    var text = (input && input.value || "").trim();
    if (!text) return;

    input.value = "";
    messages.push({ role: "user", content: text });
    appendMsg("user", text);
    maybeShowLead(text);

    busy = true;
    if (sendBtn) sendBtn.disabled = true;

    var payload = { messages: messages.slice(-20) };
    var leadPayload = collectLead();
    if (leadPayload) payload.lead = leadPayload;

    try {
      var res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      var data = await res.json().catch(function () { return {}; });

      if (!res.ok || data.softFail || data.ok === false || !data.reply) {
        var failText =
          (data && data.reply) ||
          "I'm having trouble reaching our advisor right now. Call or text us and we'll help you directly.";
        appendMsg("assistant", failText, true);
      } else {
        messages.push({ role: "assistant", content: data.reply });
        appendMsg("assistant", data.reply);
      }
    } catch (err) {
      appendMsg(
        "assistant",
        "I'm having trouble reaching our advisor right now. Call or text us and we'll help you directly.",
        true
      );
    } finally {
      busy = false;
      if (sendBtn) sendBtn.disabled = false;
      if (input) input.focus();
    }
  }

  function openPanel() {
    var root = document.getElementById("umrt-chat-root");
    if (!root) return;
    root.classList.add("is-open");
    var input = document.getElementById("umrt-chat-input");
    if (input) input.focus();
  }

  function closePanel() {
    var root = document.getElementById("umrt-chat-root");
    if (!root) return;
    root.classList.remove("is-open");
    var launcher = document.getElementById("umrt-chat-launcher");
    if (launcher) launcher.focus();
  }

  function mount() {
    if (document.getElementById("umrt-chat-root")) return;

    var root = el("div", {
      id: "umrt-chat-root",
      className: "umrt-chat-root",
      role: "region",
      "aria-label": "United Mobile RV chat advisor",
    });

    var panel = el("div", {
      className: "umrt-chat-panel",
      id: "umrt-chat-panel",
      role: "dialog",
      "aria-modal": "false",
      "aria-labelledby": "umrt-chat-title",
    });

    var header = el("div", { className: "umrt-chat-header" }, [
      el("div", {}, [
        el("strong", { id: "umrt-chat-title", text: "UMRT Advisor" }),
        el("span", { text: "Mobile RV repair · staging" }),
      ]),
      el("button", {
        type: "button",
        className: "umrt-chat-close",
        "aria-label": "Close chat",
        text: "×",
        onClick: closePanel,
      }),
    ]);

    var msgs = el("div", {
      className: "umrt-chat-messages",
      id: "umrt-chat-messages",
      "aria-live": "polite",
    });

    var leadRow = el("div", { className: "umrt-chat-lead", id: "umrt-chat-lead" }, [
      el("input", { id: "umrt-lead-name", type: "text", placeholder: "Name", autocomplete: "name" }),
      el("input", { id: "umrt-lead-phone", type: "tel", placeholder: "Phone", autocomplete: "tel" }),
      el("input", {
        id: "umrt-lead-city",
        type: "text",
        className: "umrt-chat-lead-wide",
        placeholder: "City / ZIP",
        autocomplete: "postal-code",
      }),
      el("input", {
        id: "umrt-lead-issue",
        type: "text",
        className: "umrt-chat-lead-wide",
        placeholder: "Issue summary",
      }),
      el("select", { id: "umrt-lead-prefer", className: "umrt-chat-lead-wide", "aria-label": "Prefer Text" }, [
        el("option", { value: "", text: "Prefer Text?" }),
        el("option", { value: "yes", text: "Yes — prefer Text" }),
        el("option", { value: "no", text: "No — prefer call/email" }),
      ]),
    ]);

    var form = el("form", { className: "umrt-chat-form", id: "umrt-chat-form" }, [
      el("textarea", {
        id: "umrt-chat-input",
        rows: "1",
        placeholder: "Describe the issue…",
        "aria-label": "Message",
      }),
      el("button", {
        type: "submit",
        className: "umrt-chat-send",
        id: "umrt-chat-send",
        text: "Send",
      }),
    ]);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      send();
    });

    var footer = el("div", { className: "umrt-chat-footer" }, [
      leadRow,
      form,
      el("div", { className: "umrt-chat-hints", html:
        'Prefer text? <a href="' + TEL + '">' + PHONE_LABEL + '</a> · <a href="' + BOOK + '">Book page</a>'
      }),
    ]);

    panel.appendChild(header);
    panel.appendChild(msgs);
    panel.appendChild(footer);

    var launcher = el("button", {
      type: "button",
      id: "umrt-chat-launcher",
      className: "umrt-chat-launcher",
      "aria-haspopup": "dialog",
      "aria-controls": "umrt-chat-panel",
      "aria-label": "Open chat with UMRT advisor",
      onClick: openPanel,
    });
    launcher.appendChild(iconChat());
    launcher.appendChild(document.createTextNode("Chat"));

    root.appendChild(panel);
    root.appendChild(launcher);
    document.body.appendChild(root);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && root.classList.contains("is-open")) {
        closePanel();
      }
    });

    // Greeting (client-only; no API key)
    appendMsg(
      "assistant",
      "Hi — I’m the UMRT site advisor. What’s going on with the rig, and where are you (city/ZIP)?"
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
