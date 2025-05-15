const margin2 = { top: 60, right: 30, bottom: 100, left: 90 },
  width2 = 1000 - margin2.left - margin2.right,
  height2 = 500 - margin2.top - margin2.bottom;

const svgDaily = d3
  .select("#daily-chart")
  .attr("width", width2 + margin2.left + margin2.right)
  .attr("height", height2 + margin2.top + margin2.bottom)
  .append("g")
  .attr("transform", `translate(${margin2.left},${margin2.top})`);

const svgWeekly = d3
  .select("#weekly-chart")
  .attr("width", width2 + margin2.left + margin2.right)
  .attr("height", height2 + margin2.top + margin2.bottom)
  .append("g")
  .attr("transform", `translate(${margin2.left},${margin2.top})`);

const svgMonthly = d3
  .select("#monthly-chart")
  .attr("width", width2 + margin2.left + margin2.right)
  .attr("height", height2 + margin2.top + margin2.bottom)
  .append("g")
  .attr("transform", `translate(${margin2.left},${margin2.top})`);

const tooltip2 = d3.select("#tooltip");

let rawData2;

d3.csv("data.csv", (d) => {
  d.stay_cost = +d.stay_cost;
  d.dia = new Date(d.dia);
  d.month = `${d.arrival_date_year}-${String(
    new Date(Date.parse(d.arrival_date_month + " 1, 2023")).getMonth() + 1
  ).padStart(2, "0")}`;
  d.week = `${d.arrival_date_year}-W${String(
    d.arrival_date_week_number
  ).padStart(2, "0")}`;
  return d;
}).then((data) => {
  rawData2 = data;
  populateFilters2();
  updateTemporalCharts();
  d3.selectAll("#controls-daily select").on("change", updateTemporalCharts);
});

function populateFilters2() {
  const countries = Array.from(
    new Set(rawData2.map((d) => d.mainCountry).filter(Boolean))
  ).sort();
  const groupCountries = Array.from(
    new Set(rawData2.map((d) => d.group_country))
  ).sort();

  const mainSelect = d3.select("#mainCountry2");
  const groupSelect = d3.select("#groupCountry2");

  mainSelect.selectAll("option:not([value='all'])").remove();
  groupSelect.selectAll("option:not([value='all'])").remove();

  countries.forEach((c) =>
    mainSelect.append("option").attr("value", c).text(c)
  );
  groupCountries.forEach((c) =>
    groupSelect.append("option").attr("value", c).text(c)
  );
}

function filterData2(data) {
  const isCanceled = document.getElementById("isCanceled2").value;
  const mainCountry = document.getElementById("mainCountry2").value;
  const groupCountry = document.getElementById("groupCountry2").value;
  const tipo = document.getElementById("tipo2").value;

  return data.filter(
    (d) =>
      (isCanceled === "all" || d.is_canceled === isCanceled) &&
      (mainCountry === "all" || d.mainCountry === mainCountry) &&
      (groupCountry === "all" || d.group_country === groupCountry) &&
      (tipo === "all" || d.hotel === tipo)
  );
}

function updateTemporalCharts() {
  const data = filterData2(rawData2);
  const groupBy = document.getElementById("groupBy2").value;

  drawChart(
    svgDaily,
    data,
    "dia",
    (d) => new Date(d),
    d3.timeFormat("%Y-%m-%d"),
    "Facturación diaria",
    groupBy
  );
  drawChart(
    svgWeekly,
    data,
    "week",
    (d) => d,
    (d) => d,
    "Facturación semanal",
    groupBy
  );
  drawChart(
    svgMonthly,
    data,
    "month",
    (d) => new Date(d + "-01"),
    (d) => d,
    "Facturación mensual",
    groupBy
  );
}

function drawChart(svg, data, keyField, parseFn, formatFn, title, groupBy) {
  svg.selectAll("*").remove();

  const nested = d3.rollup(
    data,
    (v) =>
      d3.rollup(
        v,
        (d) => d3.sum(d, (x) => x.stay_cost),
        (d) => d[groupBy]
      ),
    (d) => d[keyField]
  );

  const keys = Array.from(nested.keys()).sort((a, b) =>
    d3.ascending(parseFn(a), parseFn(b))
  );
  const groups = Array.from(new Set(data.map((d) => d[groupBy])));
  const color = d3.scaleOrdinal().domain(groups).range(d3.schemeTableau10);

  const x0 = d3.scaleBand().domain(keys).range([0, width2]).paddingInner(0.1);
  const x1 = d3
    .scaleBand()
    .domain(groups)
    .range([0, x0.bandwidth()])
    .padding(0.05);

  const y = d3
    .scaleLinear()
    .domain([
      0,
      d3.max(keys, (k) => d3.max(groups, (g) => nested.get(k)?.get(g) || 0)),
    ])
    .nice()
    .range([height2, 0]);

  svg
    .append("g")
    .attr("transform", `translate(0,${height2})`)
    .call(
      d3
        .axisBottom(x0)
        .tickValues(
          keys.filter((_, i) => i % Math.ceil(keys.length / 12) === 0)
        )
        .tickFormat(formatFn)
    )
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");

  svg.append("g").call(d3.axisLeft(y));

  svg
    .append("text")
    .attr("x", width2 / 2)
    .attr("y", -30)
    .attr("text-anchor", "middle")
    .attr("font-size", "18px")
    .text(`${title} por ${groupBy}`);

  svg
    .append("text")
    .attr("x", -height2 / 2)
    .attr("y", -margin2.left + 15)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .text("Total stay_cost (€)");

  const legend = svg
    .append("g")
    .attr("transform", `translate(${width2 - 150}, 0)`);

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

  const barGroups = svg
    .selectAll(".bar-group")
    .data(keys)
    .enter()
    .append("g")
    .attr("class", "bar-group")
    .attr("transform", (d) => `translate(${x0(d)},0)`);

  barGroups
    .selectAll("rect")
    .data((d) =>
      groups.map((g) => ({
        key: d,
        group: g,
        value: nested.get(d)?.get(g) || 0,
      }))
    )
    .enter()
    .append("rect")
    .attr("x", (d) => x1(d.group))
    .attr("y", (d) => y(d.value))
    .attr("width", x1.bandwidth())
    .attr("height", (d) => height2 - y(d.value))
    .attr("fill", (d) => color(d.group))
    .on("mouseover", (event, d) => {
      tooltip2.transition().duration(200).style("opacity", 1);
      tooltip2
        .html(
          `${groupBy}: ${d.group}<br>${formatFn(
            parseFn(d.key)
          )}<br>€${d.value.toFixed(2)}`
        )
        .style("left", `${event.pageX + 10}px`)
        .style("top", `${event.pageY - 28}px`);
    })
    .on("mouseout", () => {
      tooltip2.transition().duration(300).style("opacity", 0);
    });
}
