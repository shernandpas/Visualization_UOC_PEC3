const margin = { top: 60, right: 30, bottom: 100, left: 100 },
  width = 1000 - margin.left - margin.right,
  height = 500 - margin.top - margin.bottom;

const svg = d3
  .select("#chart")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const tooltip = d3.select("#tooltip");

let rawData;

d3.csv("data.csv", (d) => {
  d.stay_cost = +d.stay_cost;
  d.arrival_date_year = +d.arrival_date_year;
  return d;
}).then((data) => {
  rawData = data;
  populateFilters();
  updateChart();
  d3.selectAll("#controls-main select").on("change", updateChart);
});

function populateFilters() {
  const countries = Array.from(
    new Set(rawData.map((d) => d.mainCountry).filter(Boolean))
  ).sort();
  const groupCountries = Array.from(
    new Set(rawData.map((d) => d.group_country))
  ).sort();

  const mainSelect = d3.select("#mainCountry");
  const groupSelect = d3.select("#groupCountry");

  mainSelect.selectAll("option:not([value='all'])").remove();
  groupSelect.selectAll("option:not([value='all'])").remove();

  countries.forEach((c) =>
    mainSelect.append("option").attr("value", c).text(c)
  );
  groupCountries.forEach((c) =>
    groupSelect.append("option").attr("value", c).text(c)
  );
}

function filterData(data) {
  const isCanceled = document.getElementById("isCanceled").value;
  const mainCountry = document.getElementById("mainCountry").value;
  const groupCountry = document.getElementById("groupCountry").value;
  const tipo = document.getElementById("tipo").value;

  return data.filter(
    (d) =>
      (isCanceled === "all" || d.is_canceled === isCanceled) &&
      (mainCountry === "all" || d.mainCountry === mainCountry) &&
      (groupCountry === "all" || d.group_country === groupCountry) &&
      (tipo === "all" || d.hotel === tipo)
  );
}

function updateChart() {
  const data = filterData(rawData);
  const groupBy = document.getElementById("groupBy").value;

  const nested = d3.rollup(
    data,
    (v) =>
      d3.rollup(
        v,
        (d) => d3.sum(d, (x) => x.stay_cost),
        (d) => d[groupBy]
      ),
    (d) => d.arrival_date_year
  );

  const years = Array.from(nested.keys()).sort(d3.ascending);
  const groups = Array.from(new Set(data.map((d) => d[groupBy])));
  const color = d3.scaleOrdinal().domain(groups).range(d3.schemeTableau10);

  svg.selectAll("*").remove();

  const x0 = d3.scaleBand().domain(years).range([0, width]).paddingInner(0.1);
  const x1 = d3
    .scaleBand()
    .domain(groups)
    .range([0, x0.bandwidth()])
    .padding(0.05);
  const y = d3
    .scaleLinear()
    .domain([
      0,
      d3.max(years, (y) => d3.max(groups, (g) => nested.get(y)?.get(g) || 0)),
    ])
    .nice()
    .range([height, 0]);

  svg
    .append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x0).tickSizeOuter(0));

  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", height + 60)
    .attr("text-anchor", "middle")
    .attr("font-size", "14px")
    .text("Año");

  svg.append("g").call(d3.axisLeft(y));

  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", -30)
    .attr("text-anchor", "middle")
    .attr("font-size", "18px")
    .text(`Facturación anual por ${groupBy}`);

  svg
    .append("text")
    .attr("x", -height / 2)
    .attr("y", -70)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .text("Total stay_cost (€)");

  const yearGroups = svg
    .selectAll(".year")
    .data(years)
    .enter()
    .append("g")
    .attr("transform", (d) => `translate(${x0(d)},0)`);

  yearGroups
    .selectAll("rect")
    .data((d) =>
      groups.map((g) => ({
        year: d,
        group: g,
        value: nested.get(d)?.get(g) || 0,
      }))
    )
    .enter()
    .append("rect")
    .attr("x", (d) => x1(d.group))
    .attr("y", (d) => y(d.value))
    .attr("width", x1.bandwidth())
    .attr("height", (d) => height - y(d.value))
    .attr("fill", (d) => color(d.group))
    .on("mouseover", (event, d) => {
      tooltip.transition().duration(200).style("opacity", 1);
      tooltip
        .html(
          `${groupBy}: ${d.group}<br>Año: ${d.year}<br>€${d.value.toFixed(2)}`
        )
        .style("left", `${event.pageX + 10}px`)
        .style("top", `${event.pageY - 28}px`);
    })
    .on("mouseout", () => {
      tooltip.transition().duration(300).style("opacity", 0);
    });

  // Leyenda dentro del SVG
  const legend = svg
    .append("g")
    .attr("transform", `translate(${width - 150}, 0)`);

  groups.forEach((g, i) => {
    legend
      .append("rect")
      .attr("x", 0)
      .attr("y", i * 20)
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", color(g));

    legend
      .append("text")
      .attr("x", 18)
      .attr("y", i * 20 + 10)
      .attr("font-size", "12px")
      .text(g);
  });
}
