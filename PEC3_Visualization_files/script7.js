const margin7 = { top: 60, right: 40, bottom: 120, left: 80 },
  width7 = 1000 - margin7.left - margin7.right,
  height7 = 500 - margin7.top - margin7.bottom;

const svg7 = d3
  .select("#violin-adr-country")
  .attr("width", width7 + margin7.left + margin7.right)
  .attr("height", height7 + margin7.top + margin7.bottom)
  .append("g")
  .attr("transform", `translate(${margin7.left},${margin7.top})`);

let rawData7;

d3.csv("data.csv").then((data) => {
  data.forEach((d) => {
    d.adr = +d.adr;
  });

  rawData7 = data;
  populateFilters7(data);
  updateViolinPlot();
  d3.selectAll("#controls-violin select").on("change", updateViolinPlot);
});

function populateFilters7(data) {
  const countries = Array.from(
    new Set(data.map((d) => d.mainCountry).filter(Boolean))
  ).sort();
  const groupCountries = Array.from(
    new Set(data.map((d) => d.group_country).filter(Boolean))
  ).sort();

  const mainSelect = d3.select("#mainCountry7");
  const groupSelect = d3.select("#groupCountry7");

  mainSelect.selectAll("option:not([value='all'])").remove();
  countries.forEach((c) =>
    mainSelect.append("option").attr("value", c).text(c)
  );

  groupSelect.selectAll("option:not([value='all'])").remove();
  groupCountries.forEach((c) =>
    groupSelect.append("option").attr("value", c).text(c)
  );
}

function kernelDensityEstimator(kernel, X) {
  return function (V) {
    return X.map((x) => [x, d3.mean(V, (v) => kernel(x - v))]);
  };
}

function kernelEpanechnikov(k) {
  return function (v) {
    return Math.abs((v /= k)) <= 1 ? (0.75 * (1 - v * v)) / k : 0;
  };
}

function updateViolinPlot() {
  svg7.selectAll("*").remove();

  const isCanceled = document.getElementById("isCanceled7").value;
  const mainCountry = document.getElementById("mainCountry7").value;
  const groupCountry = document.getElementById("groupCountry7").value;
  const hotel = document.getElementById("hotel7").value;
  const tipo = document.getElementById("tipo7").value;

  let filtered = rawData7.filter((d) => !isNaN(d.adr));
  if (isCanceled !== "all")
    filtered = filtered.filter((d) => d.is_canceled === isCanceled);
  if (mainCountry !== "all")
    filtered = filtered.filter((d) => d.mainCountry === mainCountry);
  if (groupCountry !== "all")
    filtered = filtered.filter((d) => d.group_country === groupCountry);
  if (hotel !== "all") filtered = filtered.filter((d) => d.hotel === hotel);
  if (tipo !== "all") filtered = filtered.filter((d) => d.tipo === tipo);

  const groups = Array.from(new Set(filtered.map((d) => d.mainCountry))).sort();

  const x = d3.scaleBand().domain(groups).range([0, width7]).padding(0.05);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(filtered, (d) => d.adr)])
    .nice()
    .range([height7, 0]);

  svg7
    .append("g")
    .attr("transform", `translate(0,${height7})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");

  svg7.append("g").call(d3.axisLeft(y));

  svg7
    .append("text")
    .attr("x", width7 / 2)
    .attr("y", -30)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .text("Distribución del ADR por país (Violin Plot)");

  svg7
    .append("text")
    .attr("x", -height7 / 2)
    .attr("y", -50)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .attr("font-size", "13px")
    .text("ADR (€)");

  const color = d3.scaleOrdinal(d3.schemeTableau10);

  groups.forEach((country) => {
    const dataCountry = filtered
      .filter((d) => d.mainCountry === country)
      .map((d) => d.adr);
    if (dataCountry.length < 5) return;

    const kde = kernelDensityEstimator(kernelEpanechnikov(7), y.ticks(40));
    const density = kde(dataCountry);

    const q1 = d3.quantile(dataCountry.sort(d3.ascending), 0.25);
    const q3 = d3.quantile(dataCountry.sort(d3.ascending), 0.75);
    const median = d3.quantile(dataCountry.sort(d3.ascending), 0.5);
    const mean = d3.mean(dataCountry);

    const maxDensity = d3.max(density, (d) => d[1]);
    const scaleViolin = d3
      .scaleLinear()
      .range([0, x.bandwidth() / 2])
      .domain([0, maxDensity]);

    const g = svg7
      .append("g")
      .attr("transform", `translate(${x(country) + x.bandwidth() / 2},0)`);

    // Violin shape
    g.append("path")
      .datum(density)
      .attr("fill", color(country))
      .attr("stroke", "#000")
      .attr("stroke-width", 0.5)
      .attr(
        "d",
        d3
          .line()
          .curve(d3.curveBasis)
          .x((d) => scaleViolin(d[1]))
          .y((d) => y(d[0]))
      )
      .clone(true)
      .attr(
        "d",
        d3
          .line()
          .curve(d3.curveBasis)
          .x((d) => -scaleViolin(d[1]))
          .y((d) => y(d[0]))
      );

    // Q1 - Q3 box (shaded)
    g.append("rect")
      .attr("x", -scaleViolin(maxDensity) * 0.4)
      .attr("y", y(q3))
      .attr("width", scaleViolin(maxDensity) * 0.8)
      .attr("height", y(q1) - y(q3))
      .attr("fill", "#fff")
      .attr("stroke", "#333")
      .attr("stroke-width", 1)
      .attr("opacity", 0.5);

    // Median line
    g.append("line")
      .attr("x1", -scaleViolin(maxDensity) * 0.4)
      .attr("x2", scaleViolin(maxDensity) * 0.4)
      .attr("y1", y(median))
      .attr("y2", y(median))
      .attr("stroke", "#000")
      .attr("stroke-width", 2);

    // Q1 and Q3 lines
    g.append("line")
      .attr("x1", -scaleViolin(maxDensity) * 0.3)
      .attr("x2", scaleViolin(maxDensity) * 0.3)
      .attr("y1", y(q1))
      .attr("y2", y(q1))
      .attr("stroke", "#666")
      .attr("stroke-dasharray", "2,2");

    g.append("line")
      .attr("x1", -scaleViolin(maxDensity) * 0.3)
      .attr("x2", scaleViolin(maxDensity) * 0.3)
      .attr("y1", y(q3))
      .attr("y2", y(q3))
      .attr("stroke", "#666")
      .attr("stroke-dasharray", "2,2");

    // Mean point
    g.append("circle")
      .attr("cx", 0)
      .attr("cy", y(mean))
      .attr("r", 3)
      .attr("fill", "#000")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1);
  });

  // Leyenda
  const legend = svg7
    .append("g")
    .attr("transform", `translate(${width7 - 150}, 10)`);

  legend
    .append("text")
    .attr("y", -10)
    .text("Color: País")
    .style("font-size", "12px");

  groups.slice(0, 6).forEach((g, i) => {
    const row = legend.append("g").attr("transform", `translate(0, ${i * 20})`);
    row
      .append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", color(g));
    row
      .append("text")
      .attr("x", 18)
      .attr("y", 10)
      .text(g)
      .style("font-size", "11px");
  });
}
