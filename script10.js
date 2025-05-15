const margin10 = { top: 60, right: 200, bottom: 120, left: 80 },
  width10 = 1000 - margin10.left - margin10.right,
  height10 = 500 - margin10.top - margin10.bottom;

const svg10 = d3
  .select("#violin-leadtime")
  .attr("width", width10 + margin10.left + margin10.right)
  .attr("height", height10 + margin10.top + margin10.bottom)
  .append("g")
  .attr("transform", `translate(${margin10.left},${margin10.top})`);

let rawData10;

d3.csv("data.csv").then((data) => {
  data.forEach((d) => {
    d.lead_time = +d.lead_time;
  });

  rawData10 = data;
  populateFilters10(data);
  updateViolin10();
  d3.selectAll("#controls-violin-leadtime select").on("change", updateViolin10);
});

function populateFilters10(data) {
  const countries = Array.from(
    new Set(data.map((d) => d.mainCountry).filter(Boolean))
  ).sort();
  const groupCountries = Array.from(
    new Set(data.map((d) => d.group_country).filter(Boolean))
  ).sort();
  const tipos = Array.from(
    new Set(data.map((d) => d.tipo).filter(Boolean))
  ).sort();

  const mainSelect = d3.select("#mainCountry10");
  const groupSelect = d3.select("#groupCountry10");
  const tipoSelect = d3.select("#tipo10");

  mainSelect.selectAll("option:not([value='all'])").remove();
  countries.forEach((c) =>
    mainSelect.append("option").attr("value", c).text(c)
  );

  groupSelect.selectAll("option:not([value='all'])").remove();
  groupCountries.forEach((c) =>
    groupSelect.append("option").attr("value", c).text(c)
  );

  tipoSelect.selectAll("option:not([value='all'])").remove();
  tipos.forEach((c) => tipoSelect.append("option").attr("value", c).text(c));
}

function updateViolin10() {
  svg10.selectAll("*").remove();

  const isCanceled = document.getElementById("isCanceled10").value;
  const mainCountry = document.getElementById("mainCountry10").value;
  const groupCountry = document.getElementById("groupCountry10").value;
  const hotel = document.getElementById("hotel10").value;
  const tipoFiltro = document.getElementById("tipo10").value;

  let filtered = rawData10.filter((d) => !isNaN(d.lead_time));
  if (isCanceled !== "all")
    filtered = filtered.filter((d) => d.is_canceled === isCanceled);
  if (mainCountry !== "all")
    filtered = filtered.filter((d) => d.mainCountry === mainCountry);
  if (groupCountry !== "all")
    filtered = filtered.filter((d) => d.group_country === groupCountry);
  if (hotel !== "all") filtered = filtered.filter((d) => d.hotel === hotel);
  if (tipoFiltro !== "all")
    filtered = filtered.filter((d) => d.tipo === tipoFiltro);

  const nested = d3.group(
    filtered,
    (d) => d.mainCountry,
    (d) => d.tipo
  );

  const allCountries = Array.from(nested.keys()).sort();
  const allTipos = Array.from(new Set(filtered.map((d) => d.tipo)));

  const x = d3
    .scaleBand()
    .domain(allCountries)
    .range([0, width10])
    .padding(0.1);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(filtered, (d) => d.lead_time)])
    .nice()
    .range([height10, 0]);

  const color = d3.scaleOrdinal().domain(allTipos).range(d3.schemeSet2);

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

  svg10
    .append("g")
    .attr("transform", `translate(0,${height10})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");

  svg10.append("g").call(d3.axisLeft(y));

  svg10
    .append("text")
    .attr("x", width10 / 2)
    .attr("y", -30)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .text("Distribución de Lead Time por país y tipo de viaje");

  svg10
    .append("text")
    .attr("x", -height10 / 2)
    .attr("y", -50)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .attr("font-size", "13px")
    .text("Lead Time (días)");

  const bandwidth = x.bandwidth() / allTipos.length;

  allCountries.forEach((country) => {
    const tipoMap = nested.get(country);
    if (!tipoMap) return;

    allTipos.forEach((tipo, i) => {
      const values = (tipoMap.get(tipo) || []).map((d) => d.lead_time);
      if (values.length < 5) return;

      // Estadísticos
      const q1 = d3.quantile(values, 0.25);
      const q3 = d3.quantile(values, 0.75);
      const median = d3.median(values);
      const mean = d3.mean(values);

      const kde = kernelDensityEstimator(kernelEpanechnikov(10), y.ticks(40));
      const density = kde(values);
      const maxDens = d3.max(density, (d) => d[1]);
      const scaleViolin = d3
        .scaleLinear()
        .range([0, bandwidth / 2])
        .domain([0, maxDens]);

      const offset = x(country) + i * bandwidth;

      const g = svg10
        .append("g")
        .attr("transform", `translate(${offset + bandwidth / 2},0)`);

      // Violin
      g.append("path")
        .datum(density)
        .attr("fill", color(tipo))
        .attr("stroke", "#333")
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

      // Boxplot
      g.append("line") // IQR
        .attr("x1", 0)
        .attr("x2", 0)
        .attr("y1", y(q1))
        .attr("y2", y(q3))
        .attr("stroke", "black")
        .attr("stroke-width", 4);

      g.append("line") // Q1
        .attr("x1", -5)
        .attr("x2", 5)
        .attr("y1", y(q1))
        .attr("y2", y(q1))
        .attr("stroke", "black");

      g.append("line") // Q3
        .attr("x1", -5)
        .attr("x2", 5)
        .attr("y1", y(q3))
        .attr("y2", y(q3))
        .attr("stroke", "black");

      g.append("line") // Mediana
        .attr("x1", -7)
        .attr("x2", 7)
        .attr("y1", y(median))
        .attr("y2", y(median))
        .attr("stroke", "black")
        .attr("stroke-width", 2);

      g.append("circle") // Media
        .attr("cx", 0)
        .attr("cy", y(mean))
        .attr("r", 3)
        .attr("fill", "white")
        .attr("stroke", "black");
    });
  });

  // Leyenda
  const legend = svg10
    .append("g")
    .attr("transform", `translate(${width10 - 140}, 10)`);
  allTipos.forEach((t, i) => {
    const row = legend.append("g").attr("transform", `translate(0, ${i * 20})`);
    row
      .append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", color(t));
    row
      .append("text")
      .attr("x", 18)
      .attr("y", 10)
      .text(t)
      .style("font-size", "11px");
  });
}
