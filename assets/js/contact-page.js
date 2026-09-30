/* ==========================================================================
   contact-page.js — yalnız "Bizimlə əlaqə" səhifəsinin (contact.html) skriptləri
   --------------------------------------------------------------------------
   Qoşulur:     contact.html, forms.js-dən sonra
                (.NET MVC-də: Views/Contact/Index.cshtml → @section Scripts)
   Asılılıqlar: site.js (ZAN.notify), forms.js (ZAN.forms)

   Forma serverə <form action>-dakı ünvana göndərilir (ZAN.forms.submit).
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
        offset === 0 ? ZAN.t("bu gün") : offset === 1 ? ZAN.t("sabah") : ZAN.t(DAY_NAMES[day]);
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
      text = ZAN.t("İndi açıqdır · {time}-dək", { time: today.close });
    } else {
      const next = nextOpening(schedule, now);
      text = next ? ZAN.t("Hazırda bağlıdır · açılış: {when}", { when: next }) : ZAN.t("Hazırda bağlıdır");
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
  const copyText = ZAN.copyText;

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
          ZAN.notify("success", ZAN.t("{value} buferə köçürüldü", { value: button.dataset.copy }), {
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
  // HTML: #region contact-area → #contact-form. Sahələr və yoxlama ümumi forma
  // komponentindəndir (forms.js: ZAN.forms.bind / submit / setLoading).
  const form = document.getElementById("contact-form");
  if (!form) return;

  const success = document.getElementById("contact-success");
  const submitBtn = form.querySelector(".zf-submit");
  const message = form.elements.message;
  const counter = form.querySelector("[data-count]");
  const counterWrap = form.querySelector(".zf-count");
  const MESSAGE_MAX = Number(message.getAttribute("maxlength")) || 1000;
  const MESSAGE_MIN = Number(message.getAttribute("minlength")) || 10;
  const rules = ZAN.forms.rules;

  const validator = ZAN.forms.bind(form, {
    name(input) {
      const value = input.value.trim();
      if (!value) return "Adınızı yazın.";
      return value.length < 2 ? "Ad ən azı 2 hərfdən ibarət olmalıdır." : "";
    },
    // maskasız sahə: +994 ilə və ya onsuz yazıla bilər
    phone(input) {
      const value = input.value.trim();
      const digits = value.replace(/\D/g, "");
      if (!value) return "Telefon nömrənizi yazın.";
      return /^[+\d\s()-]+$/.test(value) && digits.length >= 9 && digits.length <= 12
        ? ""
        : "Nömrəni düzgün yazın, məsələn: +994 50 123 45 67.";
    },
    email: rules.email({ optional: true }),
    message(input) {
      const value = input.value.trim();
      if (!value) return "Mesajınızı yazın.";
      return value.length < MESSAGE_MIN ? ZAN.t("Mesaj ən azı {n} simvoldan ibarət olmalıdır.", { n: MESSAGE_MIN }) : "";
    },
    consent: rules.checked("Davam etmək üçün razılığınızı təsdiqləyin."),
  });

  // mesaj sayğacı
  const updateCounter = function () {
    const length = message.value.length;
    counter.textContent = length;
    counterWrap.classList.toggle("is-near", length >= MESSAGE_MAX * 0.9);
  };
  message.addEventListener("input", updateCounter);
  updateCounter();

  const showSuccess = function () {
    form.reset();
    validator.clear();
    updateCounter();
    form.hidden = true;
    success.hidden = false;
    success.focus();
  };

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!validator.validate()) return;

    // spam tələsi doludursa bot-dur — göndərmirik, amma uğur göstəririk
    if (form.elements.website.value) {
      showSuccess();
      return;
    }

    ZAN.forms.setLoading(submitBtn, true);
    ZAN.forms
      .submit(form)
      .then(showSuccess)
      .catch(function (error) {
        // formanın başında .zf-alert yoxdur — sahə xətaları altlarına, ümumi mətn bildirişə
        const data = (error && error.data) || {};
        if (data.errors) Object.keys(data.errors).forEach((name) => validator.show(name, data.errors[name]));
        ZAN.notify(
          "error",
          data.message || "Müraciət göndərilmədi. Bir az sonra yenidən cəhd edin və ya bizə zəng edin.",
        );
      })
      .finally(() => ZAN.forms.setLoading(submitBtn, false));
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
