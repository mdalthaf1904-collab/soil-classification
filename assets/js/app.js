const sidebar = document.querySelector("#sidebar");
const sidebarOverlay = document.querySelector("#sidebarOverlay");
const menuButton = document.querySelector("#menuButton");
const themeToggle = document.querySelector("#themeToggle");

function closeSidebar() {
  sidebar?.classList.remove("open");
  sidebarOverlay?.classList.remove("show");
}

function setTheme(isDark) {
  document.body.classList.toggle("dark-mode", isDark);
  themeToggle?.setAttribute("aria-pressed", String(isDark));
  localStorage.setItem("geolab-theme", isDark ? "dark" : "light");
}

const savedTheme = localStorage.getItem("geolab-theme");
setTheme(savedTheme === "dark");

menuButton?.addEventListener("click", () => {
  sidebar?.classList.toggle("open");
  sidebarOverlay?.classList.toggle("show");
});

sidebarOverlay?.addEventListener("click", closeSidebar);

document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", closeSidebar);
});

themeToggle?.addEventListener("click", () => {
  setTheme(!document.body.classList.contains("dark-mode"));
  if (plasticityChartInstance) {
    renderPlasticityChart();
  }
});

function getChartAxisColor() {
  return document.body.classList.contains("dark-mode") ? "#e2e8f0" : "#0f172a";
}

function getChartTickColor() {
  return document.body.classList.contains("dark-mode") ? "#cbd5e1" : "#475569";
}

function getChartGridColor() {
  return document.body.classList.contains("dark-mode") ? "#263449" : "#e5e7eb";
}

const chartCanvas = document.querySelector("#throughputChart");

if (chartCanvas && window.Chart) {
  const isDark = document.body.classList.contains("dark-mode");
  const gridColor = isDark ? "#263449" : "#e5e7eb";
  const tickColor = isDark ? "#cbd5e1" : "#4b5563";

  new Chart(chartCanvas, {
    type: "bar",
    data: {
      labels: ["Samples", "Tests", "Drafts", "Reports"],
      datasets: [
        {
          label: "Workflow Items",
          data: [24, 18, 9, 12],
          backgroundColor: ["#1d64b7", "#2577d4", "#6b7280", "#123c69"],
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            color: tickColor,
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: gridColor,
          },
          ticks: {
            color: tickColor,
            precision: 0,
          },
        },
      },
    },
  });
}

const sampleDetailsForm = document.querySelector("#sampleDetailsForm");
const sampleFormMessage = document.querySelector("#sampleFormMessage");

function setSampleMessage(message, type) {
  if (!sampleFormMessage) {
    return;
  }

  sampleFormMessage.textContent = message;
  sampleFormMessage.classList.remove("error", "success");

  if (type) {
    sampleFormMessage.classList.add(type);
  }
}

function getSampleFormData(form) {
  const formData = new FormData(form);

  return {
    sampleName: formData.get("sampleName")?.toString().trim() || "",
    sampleId: formData.get("sampleId")?.toString().trim() || "",
    location: formData.get("location")?.toString().trim() || "",
    date: formData.get("date")?.toString() || "",
    operator: formData.get("operator")?.toString().trim() || "",
    college: formData.get("college")?.toString().trim() || "",
    projectName: formData.get("projectName")?.toString().trim() || "",
    sampleWeight: Number(formData.get("sampleWeight")),
    savedAt: new Date().toISOString(),
  };
}

sampleDetailsForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const requiredFields = sampleDetailsForm.querySelectorAll("[required]");
  let firstInvalidField = null;

  requiredFields.forEach((field) => {
    field.classList.remove("field-error");

    if (!field.value.trim() && !firstInvalidField) {
      firstInvalidField = field;
    }
  });

  const sampleWeightField = sampleDetailsForm.querySelector("#sampleWeight");
  const sampleWeight = Number(sampleWeightField?.value);

  if (!firstInvalidField && (!Number.isFinite(sampleWeight) || sampleWeight <= 0)) {
    firstInvalidField = sampleWeightField;
    setSampleMessage("Sample weight cannot be zero.", "error");
  } else if (firstInvalidField) {
    setSampleMessage("Please complete all required sample details.", "error");
  }

  if (firstInvalidField) {
    firstInvalidField.classList.add("field-error");
    firstInvalidField.focus();
    return;
  }

  const sampleData = getSampleFormData(sampleDetailsForm);
  localStorage.setItem("geolab-sample-details", JSON.stringify(sampleData));
  setSampleMessage("Sample details saved. Ready for the next step.", "success");
  window.location.href = "sieve-analysis.html";
});

sampleDetailsForm?.addEventListener("reset", () => {
  sampleDetailsForm.querySelectorAll(".field-error").forEach((field) => {
    field.classList.remove("field-error");
  });

  setSampleMessage("", null);
});

const sieveTable = document.querySelector("#sieveTable");
const sieveMessage = document.querySelector("#sieveMessage");
const saveSieveAnalysisButton = document.querySelector("#saveSieveAnalysis");
const resetSieveTableButton = document.querySelector("#resetSieveTable");
const nextSieveStepButton = document.querySelector("#nextSieveStep");
const sieveSampleWeightOutput = document.querySelector("#sieveSampleWeight");
const totalRetainedWeightOutput = document.querySelector("#totalRetainedWeight");
const weightLossOutput = document.querySelector("#weightLoss");
const weightLossPercentageOutput = document.querySelector("#weightLossPercentage");

function readSavedSampleDetails() {
  try {
    return JSON.parse(localStorage.getItem("geolab-sample-details")) || null;
  } catch {
    return null;
  }
}

function formatNumber(value) {
  if (!Number.isFinite(value)) {
    return "0.00";
  }

  return value.toFixed(2);
}

function setSieveMessage(message, type) {
  if (!sieveMessage) {
    return;
  }

  sieveMessage.textContent = message;
  sieveMessage.classList.remove("error", "success", "warning");

  if (type) {
    sieveMessage.classList.add(type);
  }
}

function getSieveSampleWeight() {
  const sampleDetails = readSavedSampleDetails();
  const sampleWeight = Number(sampleDetails?.sampleWeight);

  return Number.isFinite(sampleWeight) && sampleWeight > 0 ? sampleWeight : 0;
}

function getSieveRows() {
  return Array.from(sieveTable?.querySelectorAll("tbody tr") || []);
}

function calculateSieveAnalysis() {
  if (!sieveTable) {
    return null;
  }

  const sampleWeight = getSieveSampleWeight();
  let cumulativeRetained = 0;
  let totalRetained = 0;
  const rows = [];

  getSieveRows().forEach((row) => {
    const retainedInput = row.querySelector("[data-retained]");
    const retainedWeight = Math.max(0, Number(retainedInput?.value) || 0);
    const percentRetained = sampleWeight > 0 ? (retainedWeight / sampleWeight) * 100 : 0;

    cumulativeRetained += percentRetained;
    totalRetained += retainedWeight;

    const percentPassing = 100 - cumulativeRetained;

    row.querySelector("[data-percent-retained]").textContent = formatNumber(percentRetained);
    row.querySelector("[data-cumulative-retained]").textContent = formatNumber(cumulativeRetained);
    row.querySelector("[data-percent-passing]").textContent = formatNumber(percentPassing);

    rows.push({
      sieveSize: row.cells[0].textContent.trim(),
      retainedWeight,
      percentRetained,
      cumulativePercentRetained: cumulativeRetained,
      percentPassing,
    });
  });

  const weightLoss = sampleWeight - totalRetained;
  const weightLossPercentage = sampleWeight > 0 ? (weightLoss / sampleWeight) * 100 : 0;

  sieveSampleWeightOutput.textContent = formatNumber(sampleWeight);
  totalRetainedWeightOutput.textContent = formatNumber(totalRetained);
  weightLossOutput.textContent = formatNumber(weightLoss);
  weightLossPercentageOutput.textContent = formatNumber(weightLossPercentage);

  if (sampleWeight <= 0) {
    setSieveMessage("Enter and save sample details before sieve analysis.", "warning");
  } else if (weightLossPercentage <= 2) {
    setSieveMessage("Weight loss is within the acceptable limit.", "success");
  } else {
    setSieveMessage("Warning: Weight loss is greater than 2%. You may continue after review.", "warning");
  }

  return {
    sampleWeight,
    totalRetainedWeight: totalRetained,
    weightLoss,
    weightLossPercentage,
    rows,
    savedAt: new Date().toISOString(),
  };
}

function saveSieveAnalysis() {
  const analysis = calculateSieveAnalysis();

  if (!analysis) {
    return null;
  }

  localStorage.setItem("geolab-sieve-analysis", JSON.stringify(analysis));
  return analysis;
}

function loadSavedSieveAnalysis() {
  if (!sieveTable) {
    return;
  }

  try {
    const savedAnalysis = JSON.parse(localStorage.getItem("geolab-sieve-analysis"));
    const savedRows = Array.isArray(savedAnalysis?.rows) ? savedAnalysis.rows : [];

    getSieveRows().forEach((row, index) => {
      const retainedInput = row.querySelector("[data-retained]");
      const retainedWeight = savedRows[index]?.retainedWeight;

      if (retainedInput && Number.isFinite(Number(retainedWeight))) {
        retainedInput.value = retainedWeight;
      }
    });
  } catch {
    localStorage.removeItem("geolab-sieve-analysis");
  }

  calculateSieveAnalysis();
}

sieveTable?.addEventListener("input", (event) => {
  if (event.target.matches("[data-retained]")) {
    calculateSieveAnalysis();
  }
});

saveSieveAnalysisButton?.addEventListener("click", () => {
  saveSieveAnalysis();
});

resetSieveTableButton?.addEventListener("click", () => {
  getSieveRows().forEach((row) => {
    const retainedInput = row.querySelector("[data-retained]");

    if (retainedInput) {
      retainedInput.value = "";
    }
  });

  localStorage.removeItem("geolab-sieve-analysis");
  calculateSieveAnalysis();
});

nextSieveStepButton?.addEventListener("click", () => {
  saveSieveAnalysis();
  window.location.href = "soil-detection.html";
});

loadSavedSieveAnalysis();

const gsdChartCanvas = document.querySelector("#gsdChart");
const gsdMessage = document.querySelector("#gsdMessage");
const downloadGsdPngButton = document.querySelector("#downloadGsdPng");
let gsdChartInstance = null;
const nextGsdStepButton = document.querySelector("#nextGsdStep");
const d10Value = document.querySelector("#d10Value");
const d30Value = document.querySelector("#d30Value");
const d60Value = document.querySelector("#d60Value");
const cuValue = document.querySelector("#cuValue");
const ccValue = document.querySelector("#ccValue");
const gradingValue = document.querySelector("#gradingValue");
const soilDetectionMessage = document.querySelector("#soilDetectionMessage");
const nextSoilDetectionStepButton = document.querySelector("#nextSoilDetectionStep");
const passing75Value = document.querySelector("#passing75Value");
const soilGroupValue = document.querySelector("#soilGroupValue");
const nextModuleValue = document.querySelector("#nextModuleValue");
const soilTypeBadge = document.querySelector("#soilTypeBadge");
const soilTypeHeading = document.querySelector("#soilTypeHeading");
const soilTypeSummary = document.querySelector("#soilTypeSummary");
const workflowDecisionStep = document.querySelector("#workflowDecisionStep");

const sieveParticleSizes = [80, 40, 20, 10, 4.75, 2.36, 1.18, 0.6, 0.3, 0.15, 0.075];

function setGsdMessage(message, type) {
  if (!gsdMessage) {
    return;
  }

  gsdMessage.textContent = message;
  gsdMessage.classList.remove("error", "success", "warning");

  if (type) {
    gsdMessage.classList.add(type);
  }
}

function readSavedSieveAnalysis() {
  try {
    return JSON.parse(localStorage.getItem("geolab-sieve-analysis")) || null;
  } catch {
    return null;
  }
}

function setSoilDetectionMessage(message, type) {
  if (!soilDetectionMessage) {
    return;
  }

  soilDetectionMessage.textContent = message;
  soilDetectionMessage.classList.remove("error", "success", "warning");

  if (type) {
    soilDetectionMessage.classList.add(type);
  }
}

function detectSoilType() {
  const sieveAnalysis = readSavedSieveAnalysis();
  const rows = Array.isArray(sieveAnalysis?.rows) ? sieveAnalysis.rows : [];
  const micron75Row = rows.find((row) => /^75(\s|$)/.test(row.sieveSize.trim()));
  const passing75 = Number(micron75Row?.percentPassing);

  if (!Number.isFinite(passing75)) {
    return null;
  }

  const soilType = passing75 <= 50 ? "Coarse Grained Soil" : "Fine Grained Soil";
  const nextModule = passing75 <= 50 ? "Grain Size Analysis" : "Atterberg Limits";
  const nextHref = passing75 <= 50 ? "gsd-analysis.html" : "atterberg-limits.html";
  const note =
    passing75 <= 50
      ? "Continue to Grain Size Analysis."
      : "Sedimentation analysis may be performed if detailed particle-size distribution below 75 micron is required. This software continues with Atterberg Limits for soil classification.";

  return {
    passing75,
    soilType,
    nextModule,
    nextHref,
    note,
    isCoarse: passing75 <= 50,
  };
}

function renderSoilDetection() {
  const detection = detectSoilType();

  if (!passing75Value) {
    return null;
  }

  if (!detection) {
    passing75Value.textContent = "0.00";
    soilGroupValue.textContent = "--";
    nextModuleValue.textContent = "--";
    soilTypeBadge.textContent = "Awaiting Data";
    soilTypeBadge.classList.remove("coarse", "fine");
    soilTypeHeading.textContent = "Run sieve analysis to detect soil type";
    soilTypeSummary.textContent = "The decision is based on percentage passing the 75 micron sieve.";
    workflowDecisionStep.textContent = "Decision Pending";
    setSoilDetectionMessage("Save sieve analysis data before soil detection.", "warning");
    return null;
  }

  passing75Value.textContent = formatNumber(detection.passing75);
  soilGroupValue.textContent = detection.soilType;
  nextModuleValue.textContent = detection.nextModule;
  soilTypeBadge.textContent = detection.isCoarse ? "Coarse Route" : "Fine Route";
  soilTypeBadge.classList.remove("coarse", "fine");
  soilTypeBadge.classList.add(detection.isCoarse ? "coarse" : "fine");
  soilTypeHeading.textContent = detection.soilType;
  soilTypeSummary.textContent = detection.note;
  workflowDecisionStep.textContent = detection.isCoarse ? "Go to GSD Curve" : "Go to Atterberg Limits";
  workflowDecisionStep.classList.add("active");

  localStorage.setItem(
    "geolab-soil-detection",
    JSON.stringify({
      passing75: detection.passing75,
      soilType: detection.soilType,
      nextModule: detection.nextModule,
      nextHref: detection.nextHref,
      note: detection.note,
      savedAt: new Date().toISOString(),
    }),
  );

  if (detection.isCoarse) {
    setSoilDetectionMessage("Coarse Grained Soil detected. Continue to Grain Size Analysis.", "success");
  } else {
    setSoilDetectionMessage(
      "Fine Grained Soil detected. Sedimentation analysis may be performed if detailed particle-size distribution below 75 micron is required. This software continues with Atterberg Limits for soil classification.",
      "warning",
    );
  }

  return detection;
}

function buildGsdPoints() {
  const sieveAnalysis = readSavedSieveAnalysis();
  const rows = Array.isArray(sieveAnalysis?.rows) ? sieveAnalysis.rows : [];

  return sieveParticleSizes
    .map((size, index) => ({
      x: size,
      y: Number(rows[index]?.percentPassing),
    }))
    .filter((point) => Number.isFinite(point.y));
}

function interpolateDiameter(points, targetPassing) {
  for (let index = 0; index < points.length - 1; index += 1) {
    const firstPoint = points[index];
    const secondPoint = points[index + 1];
    const highPassing = Math.max(firstPoint.y, secondPoint.y);
    const lowPassing = Math.min(firstPoint.y, secondPoint.y);

    if (targetPassing <= highPassing && targetPassing >= lowPassing && firstPoint.y !== secondPoint.y) {
      const firstLogSize = Math.log10(firstPoint.x);
      const secondLogSize = Math.log10(secondPoint.x);
      const interpolatedLogSize =
        firstLogSize + ((targetPassing - firstPoint.y) * (secondLogSize - firstLogSize)) / (secondPoint.y - firstPoint.y);

      return 10 ** interpolatedLogSize;
    }
  }

  return null;
}

function formatGsdValue(value) {
  return Number.isFinite(value) ? value.toFixed(3) : "--";
}

function determineGrading(cu, cc) {
  if (!Number.isFinite(cu) || !Number.isFinite(cc)) {
    return "--";
  }

  return cu >= 4 && cc >= 1 && cc <= 3 ? "Well Graded" : "Poorly Graded";
}

function renderGsdCalculations(points) {
  const d10 = interpolateDiameter(points, 10);
  const d30 = interpolateDiameter(points, 30);
  const d60 = interpolateDiameter(points, 60);
  const cu = d10 ? d60 / d10 : null;
  const cc = d10 && d30 && d60 ? (d30 * d30) / (d10 * d60) : null;
  const grading = determineGrading(cu, cc);

  d10Value.textContent = formatGsdValue(d10);
  d30Value.textContent = formatGsdValue(d30);
  d60Value.textContent = formatGsdValue(d60);
  cuValue.textContent = formatGsdValue(cu);
  ccValue.textContent = formatGsdValue(cc);
  gradingValue.textContent = grading;

  const calculations = {
    d10,
    d30,
    d60,
    cu,
    cc,
    grading,
    points,
    savedAt: new Date().toISOString(),
  };

  localStorage.setItem("geolab-gsd-analysis", JSON.stringify(calculations));

  if (grading === "--") {
    setGsdMessage("Complete sieve data is required to calculate D10, D30, and D60.", "warning");
  } else {
    setGsdMessage(`GSD calculations complete. Soil is classified as ${grading}.`, "success");
  }

  return calculations;
}

function fillChartBackground(chart, color = "#ffffff") {
  const { ctx, chartArea } = chart;

  if (!chartArea) {
    return;
  }

  ctx.save();
  ctx.fillStyle = color;
  ctx.fillRect(chartArea.left, chartArea.top, chartArea.right - chartArea.left, chartArea.bottom - chartArea.top);
  ctx.restore();
}

function drawDashedLine(ctx, x1, y1, x2, y2, color = "#dc2626") {
  ctx.save();
  ctx.beginPath();
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.25;
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function drawFilledCircle(ctx, x, y, radius = 4, fill = "#dc2626", stroke = "#ffffff") {
  ctx.save();
  ctx.beginPath();
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawChartLabel(ctx, text, x, y, color = "#111827", align = "left") {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = "600 11px Inter, sans-serif";
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
  ctx.restore();
}

function bindWheelZoom(canvas, chartGetter, mode = "xy") {
  if (!canvas || canvas.dataset.zoomBound === "true") {
    return;
  }

  canvas.dataset.zoomBound = "true";

  canvas.addEventListener(
    "wheel",
    (event) => {
      const chart = chartGetter();

      if (!chart) {
        return;
      }

      event.preventDefault();

      const factor = event.deltaY < 0 ? 0.9 : 1.1;

      if (mode.includes("x")) {
        const xScale = chart.scales.x;
        const center = (xScale.min + xScale.max) / 2;
        const range = (xScale.max - xScale.min) * factor;
        xScale.options.min = Math.max(xScale.min + 0.0001, center - range / 2);
        xScale.options.max = Math.max(xScale.options.min + 0.0001, center + range / 2);
      }

      if (mode.includes("y")) {
        const yScale = chart.scales.y;
        const center = (yScale.min + yScale.max) / 2;
        const range = (yScale.max - yScale.min) * factor;
        yScale.options.min = Math.max(0, center - range / 2);
        yScale.options.max = Math.min(100, center + range / 2);
      }

      chart.update("none");
    },
    { passive: false },
  );

  canvas.addEventListener("dblclick", () => {
    const chart = chartGetter();

    if (!chart) {
      return;
    }

    const xScale = chart.scales.x;
    const yScale = chart.scales.y;
    xScale.options.min = undefined;
    xScale.options.max = undefined;
    yScale.options.min = undefined;
    yScale.options.max = undefined;
    chart.update();
  });
}

function formatGsdAxisValue(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return "";
  }

  if (value >= 10) {
    return value.toFixed(0);
  }

  if (value >= 1) {
    return value.toFixed(2).replace(/\.00$/, "").replace(/0$/, "");
  }

  return value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function renderGsdChart() {
  if (!gsdChartCanvas || !window.Chart) {
    return;
  }

  const points = buildGsdPoints();
  const chartPoints = points.slice().sort((first, second) => first.x - second.x);

  if (!points.length) {
    setGsdMessage("Save sieve analysis data before generating the GSD curve.", "warning");
    return;
  }

  const calculations = renderGsdCalculations(points);
  const d10 = Number(calculations?.d10);
  const d30 = Number(calculations?.d30);
  const d60 = Number(calculations?.d60);
  const dTargets = [
    { target: 10, value: d10 },
    { target: 30, value: d30 },
    { target: 60, value: d60 },
  ].filter((entry) => Number.isFinite(entry.value) && entry.value > 0);
  const xMin = 0.001;
  const xMax = 80;
  const xTickLabelValues = new Set([0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.075, 0.1, 0.2, 0.5, 1, 2, 4.75, 10, 20, 40, 80]);
  const gridMajor = "#c6cdd8";
  const gridMinor = "#e6ebf0";
  const zoneBorders = "#d1d9e2";
  const zoneText = "#111827";
  const axisColor = "#111827";

  if (gsdChartInstance) {
    gsdChartInstance.destroy();
  }

  gsdChartInstance = new Chart(gsdChartCanvas, {
    type: "line",
    data: {
      datasets: [
        {
          label: "Percentage Passing",
          data: chartPoints,
          borderColor: "#1d64b7",
          backgroundColor: "rgba(29, 100, 183, 0.08)",
          pointBackgroundColor: "#1d64b7",
          pointBorderColor: "#ffffff",
          pointRadius: 5,
          pointHoverRadius: 8,
          borderWidth: 2.75,
          tension: 0.4,
          cubicInterpolationMode: "monotone",
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      devicePixelRatio: Math.max(window.devicePixelRatio || 1, 2),
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(context) {
              return `${formatGsdAxisValue(context.parsed.x)} mm, ${formatNumber(context.parsed.y)}% passing`;
            },
          },
        },
      },
      interaction: {
        mode: "nearest",
        intersect: false,
      },
      layout: {
        padding: {
          top: 28,
          right: 42,
          left: 4,
          bottom: 8,
        },
      },
      scales: {
        x: {
          type: "logarithmic",
          min: xMin,
          max: xMax,
          title: {
            display: true,
            text: "Particle Size (mm) (Log Scale)",
            color: axisColor,
            font: {
              family: "Inter",
              weight: 800,
            },
          },
          grid: {
            display: false,
          },
          border: {
            color: axisColor,
            width: 1.1,
          },
          ticks: {
            color: axisColor,
            major: {
              enabled: true,
            },
            autoSkip: false,
            maxRotation: 0,
            minRotation: 0,
            callback(value) {
              const numericValue = Number(value);
              return xTickLabelValues.has(numericValue) ? formatGsdAxisValue(numericValue) : "";
            },
          },
        },
        y: {
          min: 0,
          max: 100,
          title: {
            display: true,
            text: "Percentage Passing",
            color: axisColor,
            font: {
              family: "Inter",
              weight: 800,
            },
          },
          grid: {
            display: false,
          },
          border: {
            color: axisColor,
            width: 1.1,
          },
          ticks: {
            color: axisColor,
            stepSize: 10,
            callback(value) {
              return `${value}%`;
            },
          },
        },
      },
    },
    plugins: [
      {
        id: "gsdEngineeringOverlay",
        beforeDraw(chart) {
          fillChartBackground(chart, "#ffffff");
        },
        beforeDatasetsDraw(chart) {
          const { ctx, chartArea, scales } = chart;
          if (!chartArea || !scales.x || !scales.y) {
            return;
          }

          const zones = [
            { label: "CLAY", from: 0.001, to: 0.002, color: "rgba(173, 211, 255, 0.18)" },
            { label: "SILT", from: 0.002, to: 0.075, color: "rgba(196, 229, 255, 0.14)" },
            { label: "SAND", from: 0.075, to: 4.75, color: "rgba(229, 236, 242, 0.18)" },
            { label: "GRAVEL", from: 4.75, to: xMax, color: "rgba(241, 245, 249, 0.16)" },
          ];

          ctx.save();
          zones.forEach((zone) => {
            const left = scales.x.getPixelForValue(zone.from);
            const right = scales.x.getPixelForValue(zone.to);
            const zoneLeft = Math.min(left, right);
            const zoneWidth = Math.abs(right - left);
            ctx.fillStyle = zone.color;
            ctx.fillRect(zoneLeft, chartArea.top, zoneWidth, chartArea.height);
          });

          const decadeMajorValues = [];
          const decadeMinorValues = [];

          for (let exponent = Math.floor(Math.log10(xMin)); exponent <= Math.ceil(Math.log10(xMax)); exponent += 1) {
            const base = 10 ** exponent;
            if (base >= xMin && base <= xMax) {
              decadeMajorValues.push(base);
            }

            for (let multiplier = 2; multiplier < 10; multiplier += 1) {
              const value = base * multiplier;
              if (value >= xMin && value <= xMax) {
                decadeMinorValues.push(value);
              }
            }
          }

          const boundaryValues = [0.002, 0.075, 4.75];

          const drawVerticalLine = (value, color, width) => {
            const x = scales.x.getPixelForValue(value);
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.moveTo(x, chartArea.top);
            ctx.lineTo(x, chartArea.bottom);
            ctx.stroke();
          };

          const drawHorizontalLine = (value, color, width) => {
            const y = scales.y.getPixelForValue(value);
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.moveTo(chartArea.left, y);
            ctx.lineTo(chartArea.right, y);
            ctx.stroke();
          };

          ctx.lineDashOffset = 0;
          decadeMinorValues.forEach((value) => drawVerticalLine(value, gridMinor, 0.6));
          decadeMajorValues.forEach((value) => drawVerticalLine(value, gridMajor, 1));
          boundaryValues.forEach((value) => drawVerticalLine(value, zoneBorders, 1));

          for (let yValue = 0; yValue <= 100; yValue += 5) {
            drawHorizontalLine(yValue, yValue % 10 === 0 ? gridMajor : gridMinor, yValue % 10 === 0 ? 1 : 0.6);
          }

          ctx.fillStyle = zoneText;
          ctx.font = "700 10px Inter, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          zones.forEach((zone) => {
            const mid = Math.sqrt(zone.from * zone.to);
            const x = scales.x.getPixelForValue(mid);
            ctx.fillText(zone.label, x, chartArea.top + 6);
          });
          ctx.restore();
        },
        afterDatasetsDraw(chart) {
          const { ctx, chartArea, scales } = chart;
          if (!chartArea || !scales.x || !scales.y) {
            return;
          }

          dTargets.forEach(({ target, value }) => {
            const x = scales.x.getPixelForValue(value);
            const y = scales.y.getPixelForValue(target);
            drawDashedLine(ctx, x, y, x, chartArea.bottom, "#dc2626");
            drawDashedLine(ctx, chartArea.left, y, x, y, "#dc2626");
            drawFilledCircle(ctx, x, y, 4.5, "#dc2626");
            drawChartLabel(ctx, `D${target} = ${formatGsdAxisValue(value)} mm`, x + 8, y - 10, "#111827");
          });
        },
      },
    ],
  });

  bindWheelZoom(gsdChartCanvas, () => gsdChartInstance, "xy");
}

downloadGsdPngButton?.addEventListener("click", () => {
  if (!gsdChartCanvas) {
    return;
  }

  const downloadLink = document.createElement("a");
  downloadLink.href = gsdChartCanvas.toDataURL("image/png", 1);
  downloadLink.download = "geolab-pro-gsd-curve.png";
  downloadLink.click();
});

nextGsdStepButton?.addEventListener("click", () => {
  window.location.href = "atterberg-limits.html";
});

renderGsdChart();

nextSoilDetectionStepButton?.addEventListener("click", () => {
  const detection = renderSoilDetection();

  if (!detection) {
    return;
  }

  window.location.href = detection.nextHref;
});

renderSoilDetection();

document.querySelectorAll("[data-tab-target]").forEach((tabButton) => {
  tabButton.addEventListener("click", () => {
    const targetId = tabButton.getAttribute("data-tab-target");
    const tabStrip = tabButton.closest(".tab-strip");

    if (!targetId || !tabStrip) {
      return;
    }

    tabStrip.querySelectorAll("[data-tab-target]").forEach((button) => {
      const isActive = button === tabButton;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });

    const panelContainer = tabStrip.parentElement;

    panelContainer?.querySelectorAll(".tab-panel").forEach((panel) => {
      const isActive = panel.id === targetId;
      panel.classList.toggle("active", isActive);
      panel.hidden = !isActive;
    });

    if (targetId === "plasticityChartPanel") {
      renderPlasticityChart();
    }
  });
});

const liquidLimitTable = document.querySelector("#liquidLimitTable");
const addLiquidLimitTrialButton = document.querySelector("#addLiquidLimitTrial");
const resetLiquidLimitTableButton = document.querySelector("#resetLiquidLimitTable");
const saveLiquidLimitTableButton = document.querySelector("#saveLiquidLimitTable");
const liquidLimitMessage = document.querySelector("#liquidLimitMessage");
const liquidLimitChartCanvas = document.querySelector("#liquidLimitChart");
const flowIndexValue = document.querySelector("#flowIndexValue");
const liquidLimitAt25Value = document.querySelector("#liquidLimitAt25Value");
let liquidLimitChartInstance = null;
const plasticLimitTable = document.querySelector("#plasticLimitTable");
const resetPlasticLimitTableButton = document.querySelector("#resetPlasticLimitTable");
const savePlasticLimitTableButton = document.querySelector("#savePlasticLimitTable");
const plasticLimitMessage = document.querySelector("#plasticLimitMessage");
const averagePlasticLimitValue = document.querySelector("#averagePlasticLimitValue");
const summaryLiquidLimit = document.querySelector("#summaryLiquidLimit");
const summaryPlasticLimit = document.querySelector("#summaryPlasticLimit");
const summaryPlasticityIndex = document.querySelector("#summaryPlasticityIndex");
const atterbergSummaryMessage = document.querySelector("#atterbergSummaryMessage");
const plasticityChartCanvas = document.querySelector("#plasticityChart");
const plasticityChartMessage = document.querySelector("#plasticityChartMessage");
const plasticitySummaryLL = document.querySelector("#plasticitySummaryLL");
const plasticitySummaryPL = document.querySelector("#plasticitySummaryPL");
const plasticitySummaryPI = document.querySelector("#plasticitySummaryPI");
const plasticitySummaryCoordinates = document.querySelector("#plasticitySummaryCoordinates");
const plasticitySummaryLocation = document.querySelector("#plasticitySummaryLocation");
const plasticitySummaryType = document.querySelector("#plasticitySummaryType");
const plasticitySummaryLevel = document.querySelector("#plasticitySummaryLevel");
let plasticityChartInstance = null;

if (liquidLimitTable) {
  console.log("Liquid Limit page opened");
}

function setLiquidLimitMessage(message, type) {
  if (!liquidLimitMessage) {
    return;
  }

  liquidLimitMessage.textContent = message;
  liquidLimitMessage.classList.remove("error", "success", "warning");

  if (type) {
    liquidLimitMessage.classList.add(type);
  }
}

function updateLiquidTrialNumbers() {
  liquidLimitTable?.querySelectorAll("tbody tr").forEach((row, index) => {
    row.cells[0].textContent = String(index + 1);
  });
}

function calculateLiquidWaterContent(row) {
  const w1 = Number(row.querySelector('[data-liquid-field="w1"]')?.value);
  const w2 = Number(row.querySelector('[data-liquid-field="w2"]')?.value);
  const w3 = Number(row.querySelector('[data-liquid-field="w3"]')?.value);
  const outputCell = row.querySelector("[data-liquid-water-content]");

  if (!outputCell) {
    return;
  }

  const denominator = w3 - w1;
  const numerator = w2 - w3;
  const waterContent = denominator > 0 && Number.isFinite(numerator) ? (numerator / denominator) * 100 : 0;

  outputCell.textContent = formatNumber(waterContent);
  return waterContent;
}

function readLiquidWaterContent(row) {
  const displayedValue = Number(row.querySelector("[data-liquid-water-content]")?.textContent);

  if (Number.isFinite(displayedValue) && displayedValue >= 0) {
    return displayedValue;
  }

  const w1 = Number(row.querySelector('[data-liquid-field="w1"]')?.value);
  const w2 = Number(row.querySelector('[data-liquid-field="w2"]')?.value);
  const w3 = Number(row.querySelector('[data-liquid-field="w3"]')?.value);
  const denominator = w3 - w1;
  const numerator = w2 - w3;

  return denominator > 0 && Number.isFinite(numerator) ? (numerator / denominator) * 100 : 0;
}

function readLiquidLimitPlotRow(row) {
  const blows = Number(row.querySelector('[data-liquid-field="blows"]')?.value);

  return {
    x: blows,
    y: readLiquidWaterContent(row),
  };
}

function refreshLiquidLimitWaterContents() {
  liquidLimitTable?.querySelectorAll("tbody tr").forEach((row) => calculateLiquidWaterContent(row));
}

function getLiquidLimitChartPoints() {
  return Array.from(liquidLimitTable?.querySelectorAll("tbody tr") || [])
    .map((row) => readLiquidLimitPlotRow(row))
    .filter((point) => Number.isFinite(point.x) && point.x > 0 && Number.isFinite(point.y) && point.y > 0);
}

function getLiquidLimitPlotPoints() {
  return Array.from(liquidLimitTable?.querySelectorAll("tbody tr") || [])
    .map((row) => readLiquidLimitPlotRow(row))
    .filter((point) => Number.isFinite(point.x) && point.x > 0 && Number.isFinite(point.y));
}

function getLiquidLimitRegressionPoints() {
  return getLiquidLimitChartPoints().filter((point) => point.y > 0);
}

function updateLiquidLimitSummary(flowIndex, liquidLimitAt25) {
  if (flowIndexValue) {
    flowIndexValue.textContent = formatNumber(flowIndex);
  }

  if (liquidLimitAt25Value) {
    liquidLimitAt25Value.textContent = formatNumber(liquidLimitAt25);
  }
}

function calculateLiquidLimitRegression(points) {
  if (points.length < 2) {
    return null;
  }

  const transformed = points.map((point) => ({
    x: Math.log10(point.x),
    y: point.y,
  }));

  const count = transformed.length;
  const sumX = transformed.reduce((total, point) => total + point.x, 0);
  const sumY = transformed.reduce((total, point) => total + point.y, 0);
  const sumXY = transformed.reduce((total, point) => total + point.x * point.y, 0);
  const sumXX = transformed.reduce((total, point) => total + point.x * point.x, 0);
  const denominator = count * sumXX - sumX * sumX;

  if (denominator === 0) {
    return null;
  }

  const slope = (count * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / count;
  const flowIndex = Math.abs(slope);
  const liquidLimitAt25 = intercept + slope * Math.log10(25);

  return {
    slope,
    intercept,
    flowIndex,
    liquidLimitAt25,
  };
}

function calculateCoefficientOfDetermination(points, regression) {
  if (!regression || points.length < 2) {
    return null;
  }

  const predicted = points.map((point) => regression.intercept + regression.slope * Math.log10(point.x));
  const meanY = points.reduce((total, point) => total + point.y, 0) / points.length;
  const ssTot = points.reduce((total, point) => total + (point.y - meanY) ** 2, 0);
  const ssRes = points.reduce((total, point, index) => total + (point.y - predicted[index]) ** 2, 0);

  if (ssTot === 0) {
    return null;
  }

  return 1 - ssRes / ssTot;
}

function renderLiquidLimitChart() {
  if (!liquidLimitChartCanvas || !window.Chart) {
    return;
  }

  console.log("LL Chart Started");
  refreshLiquidLimitWaterContents();

  const chartPoints = getLiquidLimitPlotPoints().sort((first, second) => first.x - second.x);
  console.log("Dataset generated", chartPoints);
  console.log("Dataset length", chartPoints.length);

  const regressionPoints = getLiquidLimitRegressionPoints();
  const regression = calculateLiquidLimitRegression(regressionPoints);
  const rSquared = calculateCoefficientOfDetermination(regressionPoints, regression);
  const isDark = document.body.classList.contains("dark-mode");
  const gridMajor = isDark ? "#aab7c8" : "#c7d0db";
  const gridMinor = isDark ? "#dfe7f0" : "#edf2f7";
  const axisColor = "#111827";

  if (liquidLimitChartInstance) {
    liquidLimitChartInstance.destroy();
  }

  const datasets = [
    {
      label: "Observed Water Content",
      data: chartPoints,
      parsing: false,
      normalized: true,
      showLine: false,
      pointRadius: 5,
      pointHoverRadius: 8,
      pointBackgroundColor: "#1d64b7",
      pointBorderColor: "#ffffff",
      backgroundColor: "rgba(29, 100, 183, 0.16)",
    },
  ];

  if (regression) {
    const firstX = Math.max(1, Math.min(...regressionPoints.map((point) => point.x)));
    const lastX = Math.max(firstX * 1.05, Math.max(...regressionPoints.map((point) => point.x)));
    const samples = [];

    for (let step = 0; step <= 40; step += 1) {
      const ratio = step / 40;
      const x = firstX * (lastX / firstX) ** ratio;
      const y = regression.intercept + regression.slope * Math.log10(x);
      samples.push({ x, y });
    }

    datasets.push({
      label: "Flow Curve",
      data: samples,
      parsing: false,
      normalized: true,
      showLine: true,
      borderColor: "#1d64b7",
      backgroundColor: "rgba(29, 100, 183, 0.12)",
      borderWidth: 2.75,
      pointRadius: 0,
      tension: 0.35,
      cubicInterpolationMode: "monotone",
    });
  }

  liquidLimitChartInstance = new Chart(liquidLimitChartCanvas, {
    type: "line",
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      devicePixelRatio: Math.max(window.devicePixelRatio || 1, 2),
      animation: false,
      interaction: {
        mode: "nearest",
        intersect: false,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(context) {
              if (context.dataset.label === "Observed Water Content") {
                return `Blows: ${context.parsed.x}, Water Content: ${formatNumber(context.parsed.y)}%`;
              }

              return `Liquid Limit point: ${formatNumber(context.parsed.y)}% at ${formatNumber(context.parsed.x)} blows`;
            },
          },
        },
      },
      layout: {
        padding: {
          top: 24,
          right: 36,
          left: 8,
          bottom: 8,
        },
      },
      scales: {
        x: {
          type: "logarithmic",
          title: {
            display: true,
            text: "No. of Blows (Log Scale)",
            color: axisColor,
            font: {
              family: "Inter",
              weight: 800,
            },
          },
          grid: {
            color(context) {
              return context.tick && context.tick.major ? gridMajor : gridMinor;
            },
            lineWidth(context) {
              return context.tick && context.tick.major ? 1 : 0.6;
            },
          },
          ticks: {
            color: axisColor,
            major: {
              enabled: true,
            },
            callback(value) {
              return `${value}`;
            },
          },
        },
        y: {
          min: 0,
          max: 100,
          title: {
            display: true,
            text: "Water Content (%)",
            color: axisColor,
            font: {
              family: "Inter",
              weight: 800,
            },
          },
          grid: {
            color: gridMinor,
            lineWidth(context) {
              return context.tick.value % 10 === 0 ? 1 : 0.5;
            },
          },
          ticks: {
            color: axisColor,
            stepSize: 10,
            callback(value) {
              return `${value}%`;
            },
          },
        },
      },
    },
    plugins: [
      {
        id: "liquidLimitEngineeringOverlay",
        beforeDraw(chart) {
          fillChartBackground(chart, "#ffffff");
        },
        afterDatasetsDraw(chart) {
          const { ctx, chartArea, scales, data } = chart;
          if (!chartArea || !scales.x || !scales.y) {
            return;
          }

          const pointSet = data.datasets.find((dataset) => dataset.label === "Observed Water Content");
          const pointCount = pointSet?.data?.length || 0;

          if (pointSet && pointCount) {
            ctx.save();
            ctx.fillStyle = "#111827";
            ctx.font = "600 10px Inter, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "bottom";
            pointSet.data.forEach((point) => {
              const x = scales.x.getPixelForValue(point.x);
              const y = scales.y.getPixelForValue(point.y);
              ctx.fillText(`${point.x}`, x, y - 8);
            });
            ctx.restore();
          }

          if (regression && Number.isFinite(regression.liquidLimitAt25)) {
            const x25 = scales.x.getPixelForValue(25);
            const yLL = scales.y.getPixelForValue(regression.liquidLimitAt25);
            drawDashedLine(ctx, x25, chartArea.top, x25, chartArea.bottom, "#dc2626");
            drawDashedLine(ctx, chartArea.left, yLL, x25, yLL, "#dc2626");
            drawFilledCircle(ctx, x25, yLL, 5, "#dc2626");
            drawChartLabel(ctx, `Liquid Limit = ${formatNumber(regression.liquidLimitAt25)}%`, x25 + 8, yLL - 10, "#111827");
          }
        },
      },
    ],
  });

  console.log("Chart created successfully");

  if (regression) {
    updateLiquidLimitSummary(regression.flowIndex, regression.liquidLimitAt25);
    const r2Text = Number.isFinite(rSquared) ? ` R^2 = ${formatNumber(rSquared)}` : "";
    setLiquidLimitMessage(
      `Liquid Limit = ${formatNumber(regression.liquidLimitAt25)}%. Flow Index = ${formatNumber(regression.flowIndex)}.${r2Text}`,
      "success",
    );
  } else {
    updateLiquidLimitSummary(0, 0);
    setLiquidLimitMessage("Enter at least two valid trial rows with blows and weights to generate the flow curve.", "warning");
  }

  if (!chartPoints.length) {
    console.log("Liquid Limit rows were read, but no valid plotted points were found.", {
      rows: readLiquidLimitRows(),
      tableRowCount: liquidLimitTable?.querySelectorAll("tbody tr").length || 0,
    });
  }

  updateAtterbergSummaryCards();
  bindWheelZoom(liquidLimitChartCanvas, () => liquidLimitChartInstance, "x");
}

function readLiquidLimitRows() {
  return Array.from(liquidLimitTable?.querySelectorAll("tbody tr") || []).map((row) => ({
    waterAdded: row.querySelector('[data-liquid-field="waterAdded"]')?.value || "",
    blows: row.querySelector('[data-liquid-field="blows"]')?.value || "",
    containerNo: row.querySelector('[data-liquid-field="containerNo"]')?.value || "",
    w1: row.querySelector('[data-liquid-field="w1"]')?.value || "",
    w2: row.querySelector('[data-liquid-field="w2"]')?.value || "",
    w3: row.querySelector('[data-liquid-field="w3"]')?.value || "",
    waterContent: row.querySelector("[data-liquid-water-content]")?.textContent || "0.00",
  }));
}

function createLiquidLimitRow(rowData = {}) {
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>0</td>
    <td><input type="number" min="0" step="0.01" data-liquid-field="waterAdded" value="${rowData.waterAdded || ""}"></td>
    <td><input type="number" min="0" step="1" data-liquid-field="blows" value="${rowData.blows || ""}"></td>
    <td><input type="text" data-liquid-field="containerNo" value="${rowData.containerNo || ""}"></td>
    <td><input type="number" min="0" step="0.01" data-liquid-field="w1" value="${rowData.w1 || ""}"></td>
    <td><input type="number" min="0" step="0.01" data-liquid-field="w2" value="${rowData.w2 || ""}"></td>
    <td><input type="number" min="0" step="0.01" data-liquid-field="w3" value="${rowData.w3 || ""}"></td>
    <td data-liquid-water-content>${rowData.waterContent || "0.00"}</td>
  `;
  return row;
}

function resetLiquidLimitTableToDefault() {
  const tableBody = liquidLimitTable?.querySelector("tbody");

  if (!tableBody) {
    return;
  }

  tableBody.innerHTML = "";

  for (let index = 0; index < 5; index += 1) {
    tableBody.appendChild(createLiquidLimitRow());
  }

  updateLiquidTrialNumbers();
  setLiquidLimitMessage("", null);
  updateAtterbergSummaryCards();
}

function saveLiquidLimitTable() {
  if (!liquidLimitTable) {
    return;
  }

  const rows = readLiquidLimitRows();
  const points = getLiquidLimitChartPoints();
  const regression = calculateLiquidLimitRegression(points);
  localStorage.setItem(
    "geolab-liquid-limit",
    JSON.stringify({
      rows,
      flowIndex: regression?.flowIndex ?? 0,
      liquidLimitAt25: regression?.liquidLimitAt25 ?? 0,
      savedAt: new Date().toISOString(),
    }),
  );
  setLiquidLimitMessage("Liquid Limit observations saved.", "success");
  updateAtterbergSummaryCards();
}

function loadLiquidLimitTable() {
  const tableBody = liquidLimitTable?.querySelector("tbody");

  if (!tableBody) {
    return;
  }

  console.log("Liquid Limit table load started");

  try {
    const savedState = JSON.parse(localStorage.getItem("geolab-liquid-limit"));
    const rows = Array.isArray(savedState?.rows) ? savedState.rows : [];

    if (!rows.length) {
      updateLiquidTrialNumbers();
      liquidLimitTable.querySelectorAll("tbody tr").forEach((row) => calculateLiquidWaterContent(row));
      renderLiquidLimitChart();
      updateAtterbergSummaryCards();
      return;
    }

    tableBody.innerHTML = "";
    rows.forEach((rowData) => {
      tableBody.appendChild(createLiquidLimitRow(rowData));
    });
    updateLiquidTrialNumbers();
    liquidLimitTable.querySelectorAll("tbody tr").forEach((row) => calculateLiquidWaterContent(row));
    renderLiquidLimitChart();
    updateAtterbergSummaryCards();
  } catch {
    localStorage.removeItem("geolab-liquid-limit");
  }
}

liquidLimitTable?.addEventListener("input", (event) => {
  const row = event.target.closest("tr");

  if (row) {
    calculateLiquidWaterContent(row);
    renderLiquidLimitChart();
  }
});

addLiquidLimitTrialButton?.addEventListener("click", () => {
  const tableBody = liquidLimitTable?.querySelector("tbody");

  if (!tableBody) {
    return;
  }

  tableBody.appendChild(createLiquidLimitRow());
  updateLiquidTrialNumbers();
  renderLiquidLimitChart();
});

resetLiquidLimitTableButton?.addEventListener("click", () => {
  resetLiquidLimitTableToDefault();
  localStorage.removeItem("geolab-liquid-limit");
  renderLiquidLimitChart();
});

saveLiquidLimitTableButton?.addEventListener("click", () => {
  saveLiquidLimitTable();
});

loadLiquidLimitTable();

function setPlasticLimitMessage(message, type) {
  if (!plasticLimitMessage) {
    return;
  }

  plasticLimitMessage.textContent = message;
  plasticLimitMessage.classList.remove("error", "success", "warning");

  if (type) {
    plasticLimitMessage.classList.add(type);
  }
}

function setAtterbergSummaryMessage(message, type) {
  if (!atterbergSummaryMessage) {
    return;
  }

  atterbergSummaryMessage.textContent = message;
  atterbergSummaryMessage.classList.remove("error", "success", "warning");

  if (type) {
    atterbergSummaryMessage.classList.add(type);
  }
}

function readAtterbergSummaryValues() {
  let liquidLimit = 0;
  let plasticLimit = 0;

  try {
    const liquidLimitState = JSON.parse(localStorage.getItem("geolab-liquid-limit"));
    const plasticLimitState = JSON.parse(localStorage.getItem("geolab-plastic-limit"));

    liquidLimit = Number(liquidLimitState?.liquidLimitAt25);
    plasticLimit = Number(plasticLimitState?.averagePlasticLimit);
  } catch {
    liquidLimit = 0;
    plasticLimit = 0;
  }

  return {
    liquidLimit: Number.isFinite(liquidLimit) ? liquidLimit : 0,
    plasticLimit: Number.isFinite(plasticLimit) ? plasticLimit : 0,
  };
}

function updateAtterbergSummaryCards() {
  const { liquidLimit, plasticLimit } = readAtterbergSummaryValues();
  const plasticityIndex = liquidLimit - plasticLimit;

  if (summaryLiquidLimit) {
    summaryLiquidLimit.textContent = formatNumber(liquidLimit);
  }

  if (summaryPlasticLimit) {
    summaryPlasticLimit.textContent = formatNumber(plasticLimit);
  }

  if (summaryPlasticityIndex) {
    summaryPlasticityIndex.textContent = formatNumber(plasticityIndex);
  }

  if (liquidLimit > 0 && plasticLimit > 0) {
    if (liquidLimit > plasticLimit) {
      setAtterbergSummaryMessage("LL is greater than PL. Plasticity Index calculated successfully.", "success");
    } else {
      setAtterbergSummaryMessage("LL must be greater than PL to calculate Plasticity Index.", "warning");
    }
  } else {
    setAtterbergSummaryMessage("Complete Liquid Limit and Plastic Limit modes to calculate Plasticity Index.", "warning");
  }

  updatePlasticityChartSummary();
  if (plasticityChartInstance || !document.querySelector("#plasticityChartPanel")?.hidden) {
    renderPlasticityChart();
  }
}

function setPlasticityChartMessage(message, type) {
  if (!plasticityChartMessage) {
    return;
  }

  plasticityChartMessage.textContent = message;
  plasticityChartMessage.classList.remove("error", "success", "warning");

  if (type) {
    plasticityChartMessage.classList.add(type);
  }
}

function readPlasticityChartValues() {
  const { liquidLimit, plasticLimit } = readAtterbergSummaryValues();
  const plasticityIndex = liquidLimit - plasticLimit;

  return {
    liquidLimit,
    plasticLimit,
    plasticityIndex,
  };
}

function getAlineValue(liquidLimit) {
  return 0.73 * (liquidLimit - 20);
}

function getUlineValue(liquidLimit) {
  return 0.9 * (liquidLimit - 8);
}

function getPlasticityLevel(liquidLimit) {
  if (liquidLimit < 35) {
    return "Low Plasticity";
  }

  if (liquidLimit <= 50) {
    return "Intermediate Plasticity";
  }

  return "High Plasticity";
}

function getPlasticityClassification(liquidLimit, plasticityIndex) {
  if (liquidLimit <= 0) {
    return {
      location: "Not Available",
      soilType: "Not Available",
      plasticityLevel: "Not Available",
    };
  }

  const aLine = getAlineValue(liquidLimit);
  const location = plasticityIndex > aLine ? "Above A-Line" : plasticityIndex < aLine ? "Below A-Line" : "On A-Line";

  return {
    location,
    soilType: plasticityIndex > aLine ? "Clay" : "Silt",
    plasticityLevel: getPlasticityLevel(liquidLimit),
  };
}

function updatePlasticityChartSummary() {
  const { liquidLimit, plasticLimit, plasticityIndex } = readPlasticityChartValues();
  const classification = getPlasticityClassification(liquidLimit, plasticityIndex);

  if (plasticitySummaryLL) {
    plasticitySummaryLL.textContent = formatNumber(liquidLimit);
  }

  if (plasticitySummaryPL) {
    plasticitySummaryPL.textContent = formatNumber(plasticLimit);
  }

  if (plasticitySummaryPI) {
    plasticitySummaryPI.textContent = formatNumber(plasticityIndex);
  }

  if (plasticitySummaryCoordinates) {
    plasticitySummaryCoordinates.textContent = `(${formatNumber(liquidLimit)}%, ${formatNumber(plasticityIndex)}%)`;
  }

  if (plasticitySummaryLocation) {
    plasticitySummaryLocation.textContent = classification.location;
  }

  if (plasticitySummaryType) {
    plasticitySummaryType.textContent = classification.soilType;
  }

  if (plasticitySummaryLevel) {
    plasticitySummaryLevel.textContent = classification.plasticityLevel;
  }

  if (liquidLimit > 0 && plasticLimit > 0) {
    setPlasticityChartMessage(
      `Point plotted at (${formatNumber(liquidLimit)}%, ${formatNumber(plasticityIndex)}%). ${classification.soilType} with ${classification.plasticityLevel.toLowerCase()}.`,
      "success",
    );
  } else {
    setPlasticityChartMessage("Complete Liquid Limit and Plastic Limit to plot the plasticity point.", "warning");
  }
}

function renderPlasticityChart() {
  if (!plasticityChartCanvas || typeof Chart === "undefined") {
    return;
  }

  const { liquidLimit, plasticityIndex } = readPlasticityChartValues();
  const aLinePoints = [];
  const uLinePoints = [];

  for (let ll = 0; ll <= 100; ll += 5) {
    aLinePoints.push({ x: ll, y: getAlineValue(ll) });
    uLinePoints.push({ x: ll, y: getUlineValue(ll) });
  }

  if (plasticityChartInstance) {
    plasticityChartInstance.destroy();
  }

  plasticityChartInstance = new Chart(plasticityChartCanvas, {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "A-Line",
          data: aLinePoints,
          borderColor: "#1d4ed8",
          backgroundColor: "#1d4ed8",
          showLine: true,
          pointRadius: 0,
          borderWidth: 2,
          tension: 0,
        },
        {
          label: "U-Line",
          data: uLinePoints,
          borderColor: "#64748b",
          backgroundColor: "#64748b",
          showLine: true,
          pointRadius: 0,
          borderWidth: 2,
          borderDash: [6, 6],
          tension: 0,
        },
        {
          label: "Test Point",
          data: liquidLimit > 0 ? [{ x: liquidLimit, y: plasticityIndex }] : [],
          borderColor: "#0f766e",
          backgroundColor: "#0f766e",
          pointRadius: 6,
          pointHoverRadius: 8,
          showLine: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: getChartTickColor(),
          },
        },
        tooltip: {
          callbacks: {
            label(context) {
              return `${context.dataset.label}: (${formatNumber(context.parsed.x)}%, ${formatNumber(context.parsed.y)}%)`;
            },
          },
        },
      },
      scales: {
        x: {
          type: "linear",
          min: 0,
          max: 100,
          title: {
            display: true,
            text: "Liquid Limit (%)",
            color: getChartAxisColor(),
          },
          ticks: {
            color: getChartTickColor(),
          },
          grid: {
            color: getChartGridColor(),
          },
        },
        y: {
          min: 0,
          max: 80,
          title: {
            display: true,
            text: "Plasticity Index (%)",
            color: getChartAxisColor(),
          },
          ticks: {
            color: getChartTickColor(),
          },
          grid: {
            color: getChartGridColor(),
          },
        },
      },
    },
  });

  updatePlasticityChartSummary();
}

function updatePlasticTrialNumbers() {
  plasticLimitTable?.querySelectorAll("tbody tr").forEach((row, index) => {
    row.cells[0].textContent = String(index + 1);
  });
}

function calculatePlasticWaterContent(row) {
  const w1 = Number(row.querySelector('[data-plastic-field="w1"]')?.value);
  const w2 = Number(row.querySelector('[data-plastic-field="w2"]')?.value);
  const w3 = Number(row.querySelector('[data-plastic-field="w3"]')?.value);
  const outputCell = row.querySelector("[data-plastic-water-content]");

  if (!outputCell) {
    return 0;
  }

  const denominator = w3 - w1;
  const numerator = w2 - w3;
  const waterContent = denominator > 0 && Number.isFinite(numerator) ? (numerator / denominator) * 100 : 0;

  outputCell.textContent = formatNumber(waterContent);
  return waterContent;
}

function updateAveragePlasticLimit() {
  const values = Array.from(plasticLimitTable?.querySelectorAll("[data-plastic-water-content]") || [])
    .map((cell) => Number(cell.textContent))
    .filter((value) => Number.isFinite(value) && value > 0);

  const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

  if (averagePlasticLimitValue) {
    averagePlasticLimitValue.textContent = formatNumber(average);
  }

  updateAtterbergSummaryCards();
}

function readPlasticLimitRows() {
  return Array.from(plasticLimitTable?.querySelectorAll("tbody tr") || []).map((row) => ({
    containerNo: row.querySelector('[data-plastic-field="containerNo"]')?.value || "",
    w1: row.querySelector('[data-plastic-field="w1"]')?.value || "",
    w2: row.querySelector('[data-plastic-field="w2"]')?.value || "",
    w3: row.querySelector('[data-plastic-field="w3"]')?.value || "",
    waterContent: row.querySelector("[data-plastic-water-content]")?.textContent || "0.00",
  }));
}

function createPlasticLimitRow(rowData = {}) {
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>0</td>
    <td><input type="text" data-plastic-field="containerNo" value="${rowData.containerNo || ""}"></td>
    <td><input type="number" min="0" step="0.01" data-plastic-field="w1" value="${rowData.w1 || ""}"></td>
    <td><input type="number" min="0" step="0.01" data-plastic-field="w2" value="${rowData.w2 || ""}"></td>
    <td><input type="number" min="0" step="0.01" data-plastic-field="w3" value="${rowData.w3 || ""}"></td>
    <td data-plastic-water-content>${rowData.waterContent || "0.00"}</td>
  `;
  return row;
}

function resetPlasticLimitTableToDefault() {
  const tableBody = plasticLimitTable?.querySelector("tbody");

  if (!tableBody) {
    return;
  }

  tableBody.innerHTML = "";

  for (let index = 0; index < 4; index += 1) {
    tableBody.appendChild(createPlasticLimitRow());
  }

  updatePlasticTrialNumbers();
  updateAveragePlasticLimit();
  setPlasticLimitMessage("", null);
  updateAtterbergSummaryCards();
}

function savePlasticLimitTable() {
  if (!plasticLimitTable) {
    return;
  }

  const rows = readPlasticLimitRows();
  localStorage.setItem(
    "geolab-plastic-limit",
    JSON.stringify({
      rows,
      averagePlasticLimit: Number(averagePlasticLimitValue?.textContent) || 0,
      savedAt: new Date().toISOString(),
    }),
  );
  setPlasticLimitMessage("Plastic Limit observations saved.", "success");
  updateAtterbergSummaryCards();
}

function loadPlasticLimitTable() {
  const tableBody = plasticLimitTable?.querySelector("tbody");

  if (!tableBody) {
    return;
  }

  try {
    const savedState = JSON.parse(localStorage.getItem("geolab-plastic-limit"));
    const rows = Array.isArray(savedState?.rows) ? savedState.rows : [];

    if (!rows.length) {
      updatePlasticTrialNumbers();
      plasticLimitTable.querySelectorAll("tbody tr").forEach((row) => calculatePlasticWaterContent(row));
      updateAveragePlasticLimit();
      updateAtterbergSummaryCards();
      return;
    }

    tableBody.innerHTML = "";
    rows.forEach((rowData) => {
      tableBody.appendChild(createPlasticLimitRow(rowData));
    });
    updatePlasticTrialNumbers();
    plasticLimitTable.querySelectorAll("tbody tr").forEach((row) => calculatePlasticWaterContent(row));
    updateAveragePlasticLimit();
    updateAtterbergSummaryCards();
  } catch {
    localStorage.removeItem("geolab-plastic-limit");
  }
}

plasticLimitTable?.addEventListener("input", (event) => {
  const row = event.target.closest("tr");

  if (row) {
    calculatePlasticWaterContent(row);
    updateAveragePlasticLimit();
  }
});

resetPlasticLimitTableButton?.addEventListener("click", () => {
  resetPlasticLimitTableToDefault();
  localStorage.removeItem("geolab-plastic-limit");
  updateAtterbergSummaryCards();
});

savePlasticLimitTableButton?.addEventListener("click", () => {
  savePlasticLimitTable();
});

loadPlasticLimitTable();
updateAtterbergSummaryCards();
