(function () {
  "use strict";

  const manifestMeta = document.querySelector('meta[name="amc-version-manifest"]');
  if (!manifestMeta) return;

  const manifestUrl = manifestMeta.content;
  const manifestReady = fetch(manifestUrl, { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error(`Manifest request failed: ${response.status}`);
      return response.json();
    })
    .then((manifest) => {
      window.AMC_VERSION_MANIFEST = manifest;
      document.documentElement.dataset.amcVersion = manifest.version || "unknown";
      const subscriptionEnabled = manifest.features?.["feat.sub.subscription_report"] === true;
      document.documentElement.dataset.amcSubscription = subscriptionEnabled ? "on" : "off";
      if (!subscriptionEnabled) disableSubscriptionFeatures();
      return manifest;
    })
    .catch((error) => {
      console.error("AMC version manifest could not be applied.", error);
      document.documentElement.dataset.amcManifestError = "true";
    });

  window.AMC_VERSION_MANIFEST_READY = manifestReady;

  function hide(element) {
    if (!element) return;
    element.hidden = true;
    element.setAttribute("aria-hidden", "true");
    element.style.setProperty("display", "none", "important");
  }

  function hideClosest(selector, closestSelector) {
    const element = document.querySelector(selector);
    hide(element?.closest(closestSelector));
  }

  function escapeText(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function disableSubscriptionFeatures() {
    try {
      if (typeof subSetMode === "function") subSetMode("single");
    } catch (error) {
      console.warn("Unable to force single-report mode.", error);
    }

    hideClosest("#subReportMode", ".form-field");
    hide(document.getElementById("subModeHint"));
    hide(document.getElementById("subScheduleFields"));
    hide(document.getElementById("subscriptionPeriodControl"));
    hide(document.getElementById("subDetailInfo"));
    hide(document.getElementById("adminCancelModal"));
    hide(document.getElementById("subReportModeFilter"));
    hide(document.getElementById("adminStatusFilter"));
    hide(document.querySelector(".admin-list-actions"));

    const originalShowAppPage = window.showAppPage;
    if (typeof originalShowAppPage === "function") {
      window.showAppPage = function (page) {
        originalShowAppPage(page);
        if (page === "reports") renderMainReportList();
        if (page === "create") prepareMainCreatePage();
        if (page === "basket" || page === "amcFrame") cleanReportDetail();
      };
    }

    prepareMainCreatePage();
    cleanReportDetail();
    renderMainReportList();
  }

  function prepareMainCreatePage() {
    try {
      if (typeof subSetMode === "function") subSetMode("single");
    } catch (error) {
      console.warn("Unable to reset report mode.", error);
    }
    hideClosest("#subReportMode", ".form-field");
    hide(document.getElementById("subModeHint"));
    hide(document.getElementById("subScheduleFields"));
    const submit = document.getElementById("submitCreateReport");
    if (submit && !document.querySelector("#createReportPage .admin-edit-note:not([hidden])")) {
      submit.textContent = "创建报告";
    }
  }

  function cleanReportDetail() {
    hide(document.getElementById("subscriptionPeriodControl"));
    hide(document.getElementById("subDetailInfo"));
    const modeBadge = document.getElementById("reportDetailMode");
    if (modeBadge) modeBadge.textContent = "";
  }

  function getSingleReports() {
    try {
      if (typeof subReports !== "undefined" && Array.isArray(subReports)) {
        return subReports.filter((report) => report.mode === "single");
      }
    } catch (error) {
      console.warn("Unable to read report records.", error);
    }
    return [];
  }

  function renderMainReportList() {
    const page = document.getElementById("reportsPage");
    const table = page?.querySelector(".reports-table");
    if (!table || !table.tHead || !table.tBodies.length) return;

    hide(document.getElementById("subReportModeFilter"));
    hide(document.getElementById("adminStatusFilter"));
    hide(page.querySelector(".admin-list-actions"));

    table.tHead.innerHTML = "<tr><th>报告名称</th><th>Instance</th><th>报告时间</th><th>状态</th><th>创建人</th><th>创建时间</th><th>操作</th></tr>";
    const body = table.tBodies[0];
    body.replaceChildren();

    const reports = getSingleReports();
    reports.forEach((report) => {
      const row = document.createElement("tr");
      row.className = "report-row";
      row.dataset.mainReportId = report.id || "";
      const period = report.periods?.[0] || "—";
      const action = report.page
        ? '<button class="row-action main-report-open" type="button">进入</button>'
        : '<button class="row-action" type="button">...</button>';
      row.innerHTML =
        `<td><div class="admin-name" title="${escapeText(report.name)}">${escapeText(report.name)}</div></td>` +
        `<td>${escapeText(report.instance || "4kmilesyaheetechus")}</td>` +
        `<td>${escapeText(period)}</td>` +
        '<td><span class="status-pill">已完成</span></td>' +
        `<td>${escapeText(report.creator || "Demo.User")}</td>` +
        `<td>${escapeText(report.created || "")}</td>` +
        `<td>${action}</td>`;
      row.querySelector(".main-report-open")?.addEventListener("click", () => {
        try {
          subCurrentReport = report;
        } catch (error) {
          console.warn("Unable to set current report.", error);
        }
        window.showAppPage?.(report.page || "basket");
      });
      body.append(row);
    });

    const search = document.getElementById("subReportSearch");
    const applySearch = () => {
      const query = search?.value.trim().toLowerCase() || "";
      body.querySelectorAll("tr[data-main-report-id]").forEach((row) => {
        row.hidden = Boolean(query && !row.textContent.toLowerCase().includes(query));
      });
    };
    if (search) search.oninput = applySearch;

    const reset = page.querySelector(".admin-reset-filter");
    if (reset) {
      reset.onclick = () => {
        if (search) search.value = "";
        applySearch();
      };
    }
  }
})();
