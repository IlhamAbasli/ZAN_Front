/* ==========================================================================
   contact-page.js — yalnız "Bizimlə əlaqə" səhifəsinin (contact.html) skriptləri
   --------------------------------------------------------------------------
   Qoşulur:     contact.html, site.js və shop.js-dən sonra
                (.NET MVC-də: Views/Contact/Index.cshtml → @section Scripts)
   Asılılıqlar: site.js (ZAN.notify)

   Forma serverə <form action>-dakı ünvana göndərilir (fetch, FormData).
   action="#" olduqca göndəriş imitasiya olunur — backend hazır olanda yalnız
   HTML-də action-u dəyişmək kifayətdir.
   ========================================================================== */

(function (ZAN) {
  "use strict";

  //#region work-hours
  // HTML: #region contact-channels → [data-work-hours]. İş saatları Bakı vaxtı
  // ilə hesablanır — ziyarətçinin saat qurşağı fərqli olsa da status düzgündür.
  const hoursList = document.querySelector("[data-work-hours]");
  const statusEls = Array.from(document.querySelectorAll("[data-open-status]"));

  const DAY_NAMES = [
    "bazar",
    "bazar ertəsi",
    "çərşənbə axşamı",
    "çərşənbə",
    "cümə axşamı",
    "cümə",
    "şənbə",
  ];

  const toMinutes = function (time) {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };

  // 0..6 → { open, close, row } və ya null (istirahət günü)
  const readSchedule = function () {
    const schedule = new Array(7).fill(null);

    hoursList.querySelectorAll("li[data-days]").forEach(function (row) {
      const { open, close } = row.dataset;
      row.dataset.days.split(",").forEach(function (day) {
        const index = Number(day);
        if (index >= 0 && index <= 6) {
          schedule[index] =
            open && close
              ? { open: open, close: close, row: row }
              : { row: row };
        }
      });
    });
    return schedule;
  };

  const bakuNow = function () {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Baku",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date());
    const get = (type) => parts.find((p) => p.type === type).value;

    return {
      day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
        get("weekday"),
      ),
      minutes: Number(get("hour")) * 60 + Number(get("minute")),
    };
  };

  // növbəti açılış: bu gün (hələ açılmayıbsa) və ya qarşıdakı 7 gündən biri
  const nextOpening = function (schedule, now) {
    for (let offset = 0; offset < 7; offset++) {
      const day = (now.day + offset) % 7;
      const slot = schedule[day];
      if (!slot || !slot.open) continue;
      if (offset === 0 && now.minutes >= toMinutes(slot.open)) continue;

      const when =
        offset === 0 ? "bu gün" : offset === 1 ? "sabah" : DAY_NAMES[day];
      return `${when}, ${slot.open}`;
    }
    return null;
  };

  const updateStatus = function (schedule) {
    const now = bakuNow();
    const today = schedule[now.day];

    schedule.forEach(function (slot) {
      if (slot) slot.row.classList.remove("is-today");
    });
    if (today) today.row.classList.add("is-today");

    const isOpen =
      today &&
      today.open &&
      now.minutes >= toMinutes(today.open) &&
      now.minutes < toMinutes(today.close);

    let text;
    if (isOpen) {
      text = `İndi açıqdır · ${today.close}-dək`;
    } else {
      const next = nextOpening(schedule, now);
      text = next ? `Hazırda bağlıdır · açılış: ${next}` : "Hazırda bağlıdır";
    }

    statusEls.forEach(function (el) {
      el.classList.toggle("is-open", Boolean(isOpen));
      el.classList.toggle("is-closed", !isOpen);
      el.querySelector("span").textContent = text;
      el.hidden = false;
    });
  };

  if (hoursList) {
    try {
      const schedule = readSchedule();
      updateStatus(schedule);
      setInterval(() => updateStatus(schedule), 60 * 1000);
    } catch (e) {
      /* köhnə brauzerdə Intl saat qurşağı yoxdursa status sadəcə görünmür */
    }
  }
  //#endregion

  //#region copy
  // HTML: .cc-copy[data-copy] — telefon və e-poçtu buferə köçürür
  const copyText = function (text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    // file:// və http-də clipboard API bağlıdır — köhnə üsul
    return new Promise(function (resolve, reject) {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.append(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      ok ? resolve() : reject(new Error("copy failed"));
    });
  };

  document.querySelectorAll(".cc-copy[data-copy]").forEach(function (button) {
    const label = button.querySelector("span");
    const initialText = label.textContent;
    let resetTimer = null;

    button.addEventListener("click", function () {
      copyText(button.dataset.copy)
        .then(function () {
          button.classList.add("is-copied");
          label.textContent = "Kopyalandı";
          clearTimeout(resetTimer);
          resetTimer = setTimeout(function () {
            button.classList.remove("is-copied");
            label.textContent = initialText;
          }, 2000);
          ZAN.notify("success", `${button.dataset.copy} buferə köçürüldü`, {
            title: "Kopyalandı",
            duration: 2500,
          });
        })
        .catch(function () {
          ZAN.notify("error", "Kopyalamaq alınmadı — mətni əl ilə seçin.");
        });
    });
  });
  //#endregion

  //#region form
  // HTML: #region contact-area → #contact-form
  const form = document.getElementById("contact-form");
  if (!form) return;

  const success = document.getElementById("contact-success");
  const submitBtn = form.querySelector(".cf-submit");
  const message = form.elements.message;
  const counter = form.querySelector("[data-count]");
  const counterWrap = form.querySelector(".cf-count");
  const MESSAGE_MAX = Number(message.getAttribute("maxlength")) || 1000;
  const MESSAGE_MIN = Number(message.getAttribute("minlength")) || 10;

  // hər sahə üçün yoxlama: boş sətir = xəta yoxdur
  const RULES = {
    name(input) {
      const value = input.value.trim();
      if (!value) return "Adınızı yazın.";
      if (value.length < 2) return "Ad ən azı 2 hərfdən ibarət olmalıdır.";
      return "";
    },
    phone(input) {
      const value = input.value.trim();
      const digits = value.replace(/\D/g, "");
      if (!value) return "Telefon nömrənizi yazın.";
      if (!/^[+\d\s()-]+$/.test(value) || digits.length < 9 || digits.length > 12) {
        return "Nömrəni düzgün yazın, məsələn: +994 50 123 45 67.";
      }
      return "";
    },
    email(input) {
      const value = input.value.trim();
      if (!value) return "";
      if (input.validity.typeMismatch || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return "E-poçt ünvanı düzgün deyil.";
      }
      return "";
    },
    message(input) {
      const value = input.value.trim();
      if (!value) return "Mesajınızı yazın.";
      if (value.length < MESSAGE_MIN) {
        return `Mesaj ən azı ${MESSAGE_MIN} simvoldan ibarət olmalıdır.`;
      }
      return "";
    },
    consent(input) {
      return input.checked ? "" : "Davam etmək üçün razılığınızı təsdiqləyin.";
    },
  };

  const validateField = function (input) {
    const rule = RULES[input.name];
    if (!rule) return true;

    const error = rule(input);
    // xəta mətninin yeri: #cf-{name}-error (aria-describedby ilə bağlıdır)
    const target = document.getElementById(`cf-${input.name}-error`);
    if (target) target.textContent = error;
    input.setAttribute("aria-invalid", error ? "true" : "false");
    return !error;
  };

  const fields = Object.keys(RULES).map((name) => form.elements[name]);

  // sahədən çıxanda yoxlanır; xəta göstərilibsə yazdıqca təzələnir
  fields.forEach(function (input) {
    const live = function () {
      if (input.getAttribute("aria-invalid") === "true") validateField(input);
    };
    input.addEventListener("blur", function () {
      if (input.type === "checkbox" || input.value.trim()) validateField(input);
    });
    input.addEventListener("input", live);
    input.addEventListener("change", live);
  });

  // mesaj sayğacı
  const updateCounter = function () {
    const length = message.value.length;
    counter.textContent = length;
    counterWrap.classList.toggle("is-near", length >= MESSAGE_MAX * 0.9);
  };
  message.addEventListener("input", updateCounter);
  updateCounter();

  const setLoading = function (loading) {
    submitBtn.classList.toggle("is-loading", loading);
    submitBtn.disabled = loading;
    submitBtn.setAttribute("aria-busy", String(loading));
  };

  const send = function () {
    const endpoint = form.getAttribute("action");

    // TODO (backend): action="#" olduqca göndəriş imitasiya olunur
    if (!endpoint || endpoint === "#") {
      return new Promise((resolve) => setTimeout(resolve, 900));
    }

    return fetch(endpoint, {
      method: (form.getAttribute("method") || "post").toUpperCase(),
      body: new FormData(form),
      headers: { "X-Requested-With": "XMLHttpRequest" },
    }).then(function (response) {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    });
  };

  const showSuccess = function () {
    form.reset();
    fields.forEach((input) => input.removeAttribute("aria-invalid"));
    updateCounter();
    form.hidden = true;
    success.hidden = false;
    success.focus();
  };

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const invalid = fields.filter((input) => !validateField(input));
    if (invalid.length) {
      invalid[0].focus();
      return;
    }

    // spam tələsi doludursa bot-dur — göndərmirik, amma uğur göstəririk
    if (form.elements.website.value) {
      showSuccess();
      return;
    }

    setLoading(true);
    send()
      .then(showSuccess)
      .catch(function () {
        ZAN.notify(
          "error",
          "Müraciət göndərilmədi. Bir az sonra yenidən cəhd edin və ya bizə zəng edin.",
        );
      })
      .finally(() => setLoading(false));
  });

  success.querySelector(".cf-again").addEventListener("click", function () {
    success.hidden = true;
    form.hidden = false;
    form.elements.name.focus();
  });
  //#endregion

  //#region topic
  // [data-topic] linkləri (məs. "Əməkdaşlıq müraciəti") və ?topic=dealer
  // formada uyğun mövzunu seçir
  const selectTopic = function (value) {
    const radio = Array.from(form.elements.topic).find((r) => r.value === value);
    if (radio) radio.checked = true;
  };

  document.querySelectorAll("[data-topic]").forEach(function (link) {
    link.addEventListener("click", function () {
      selectTopic(link.dataset.topic);
      // formu gizlətmiş uğur mesajı açıqdırsa yenidən formanı göstər
      if (form.hidden) {
        success.hidden = true;
        form.hidden = false;
      }
    });
  });

  const topicParam = new URLSearchParams(window.location.search).get("topic");
  if (topicParam) selectTopic(topicParam);
  //#endregion
})(window.ZAN);
