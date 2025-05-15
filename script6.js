const margin6 = { top: 80, right: 40, bottom: 70, left: 80 },
  width6 = 1000 - margin6.left - margin6.right,
  height6 = 500 - margin6.top - margin6.bottom;

const svg6 = d3
  .select("#bubble-chart-week")
  .attr("width", width6 + margin6.left + margin6.right)
  .attr("height", height6 + margin6.top + margin6.bottom)
  .append("g")
  .attr("transform", `translate(${margin6.left},${margin6.top})`);

let rawData6;

d3.csv("data.csv").then((data) => {
  data.forEach((d) => {
    d.arrival_date_week_number = +d.arrival_date_week_number;
    d.adr = +d.adr;
    d.arrival_date_year = +d.arrival_date_year;
  });

  rawData6 = data;
  populateFilters6(data);
  updateBubbleChart();
  d3.selectAll("#controls-bubble select").on("change", updateBubbleChart);
});

function populateFilters6(data) {
  const countries = Array.from(
    new Set(data.map((d) => d.mainCountry).filter(Boolean))
  ).sort();
  const groupCountries = Array.from(
    new Set(data.map((d) => d.group_country).filter(Boolean))
  ).sort();

  const mainSelect = d3.select("#mainCountry6");
  const groupSelect = d3.select("#groupCountry6");

  mainSelect.selectAll("option:not([value='all'])").remove();
  countries.forEach((c) =>
    mainSelect.append("option").attr("value", c).text(c)
  );

  groupSelect.selectAll("option:not([value='all'])").remove();
  groupCountries.forEach((c) =>
    groupSelect.append("option").attr("value", c).text(c)
  );
}

// Utilidad: convertir año y semana a fecha (lunes de la semana)
function getDateFromYearWeek(year, week) {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const monday = simple;
  if (dow <= 4) {
    monday.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    monday.setDate(simple.getDate() + 8 - simple.getDay());
  }
  return monday;
}

function updateBubbleChart() {
  svg6.selectAll("*").remove();

  const isCanceled = document.getElementById("isCanceled6").value;
  const mainCountry = document.getElementById("mainCountry6").value;
  const groupCountry = document.getElementById("groupCountry6").value;
  const hotel = document.getElementById("hotel6").value;

  let filtered = rawData6;
  if (isCanceled !== "all")
    filtered = filtered.filter((d) => d.is_canceled === isCanceled);
  if (mainCountry !== "all")
    filtered = filtered.filter((d) => d.mainCountry === mainCountry);
  if (groupCountry !== "all")
    filtered = filtered.filter((d) => d.group_country === groupCountry);
  if (hotel !== "all") filtered = filtered.filter((d) => d.hotel === hotel);

  const nested = d3.rollups(
    filtered,
    (v) => ({
      avgADR: d3.mean(v, (d) => d.adr),
      count: v.length,
      year: v[0].arrival_date_year,
      week: v[0].arrival_date_week_number,
      label: `${v[0].arrival_date_year}-W${String(
        v[0].arrival_date_week_number
      ).padStart(2, "0")}`,
      date: getDateFromYearWeek(
        v[0].arrival_date_year,
        v[0].arrival_date_week_number
      ),
    }),
    (d) =>
      `${d.arrival_date_year}-W${String(d.arrival_date_week_number).padStart(
        2,
        "0"
      )}`
  );

  const all = nested.map((d) => d[1]);
  const allCounts = all.map((d) => d.count);
  const allADRs = all.map((d) => d.avgADR);
  const allDates = all.map((d) => d.date);

  const x = d3.scaleTime().domain(d3.extent(allDates)).range([0, width6]);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(allADRs)])
    .nice()
    .range([height6, 0]);

  const r = d3
    .scaleSqrt()
    .domain([0, d3.max(allCounts)])
    .range([4, 20]);

  const color = d3
    .scaleSequential()
    .interpolator(d3.interpolateOrRd)
    .domain([0, d3.max(allCounts)]);

  const tooltip = d3.select("#tooltip");

  // Eje X
  svg6
    .append("g")
    .attr("transform", `translate(0,${height6})`)
    .call(
      d3
        .axisBottom(x)
        .ticks(d3.timeMonth.every(1))
        .tickFormat(d3.timeFormat("%Y-W%W"))
    )
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");

  svg6
    .append("text")
    .attr("x", width6 / 2)
    .attr("y", height6 + 60)
    .attr("text-anchor", "middle")
    .attr("font-size", "13px")
    .text("Semana del calendario (orden real)");

  // Eje Y
  svg6.append("g").call(d3.axisLeft(y));

  svg6
    .append("text")
    .attr("x", -height6 / 2)
    .attr("y", -60)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .attr("font-size", "13px")
    .text("ADR medio (€)");

  svg6
    .append("text")
    .attr("x", width6 / 2)
    .attr("y", -40)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .text("Evolución semanal: ADR medio y número de reservas (2015–2017)");

  svg6
    .selectAll("circle")
    .data(all)
    .join("circle")
    .attr("cx", (d) => x(d.date))
    .attr("cy", (d) => y(d.avgADR))
    .attr("r", (d) => r(d.count))
    .attr("fill", (d) => color(d.count))
    .attr("opacity", 0.8)
    .on("mouseover", (event, d) => {
      tooltip.transition().duration(200).style("opacity", 1);
      tooltip
        .html(
          `Semana: ${d.label}<br>ADR medio: €${d.avgADR.toFixed(
            2
          )}<br>Reservas: ${d.count}`
        )
        .style("left", `${event.pageX + 10}px`)
        .style("top", `${event.pageY - 28}px`);
    })
    .on("mouseout", () => {
      tooltip.transition().duration(300).style("opacity", 0);
    });

  // Leyenda de color (reservas)
  const legendWidth = 200;
  const legendHeight = 10;

  const defs = svg6.append("defs");
  const gradient = defs
    .append("linearGradient")
    .attr("id", "reservas-gradient")
    .attr("x1", "0%")
    .attr("x2", "100%");

  gradient
    .selectAll("stop")
    .data(d3.ticks(0, 1, 10))
    .enter()
    .append("stop")
    .attr("offset", (d) => `${d * 100}%`)
    .attr("stop-color", (d) => color(d * d3.max(allCounts)));

  svg6
    .append("rect")
    .attr("x", width6 - legendWidth)
    .attr("y", -30)
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .style("fill", "url(#reservas-gradient)");

  const legendScale = d3
    .scaleLinear()
    .domain([0, d3.max(allCounts)])
    .range([width6 - legendWidth, width6]);

  const legendAxis = d3
    .axisBottom(legendScale)
    .ticks(4)
    .tickFormat(d3.format(".0f"));

  svg6
    .append("g")
    .attr("transform", `translate(0, -20)`)
    .call(legendAxis)
    .selectAll("text")
    .style("font-size", "10px");

  svg6
    .append("text")
    .attr("x", width6 - legendWidth)
    .attr("y", -40)
    .attr("text-anchor", "start")
    .attr("font-size", "11px")
    .text("Nº de reservas");
}
