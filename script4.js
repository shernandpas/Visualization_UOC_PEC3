const margin4 = { top: 80, right: 30, bottom: 80, left: 100 },
  width4 = 1000 - margin4.left - margin4.right,
  height4 = 550 - margin4.top - margin4.bottom;

const svg4 = d3
  .select("#calendar-heatmap")
  .attr("width", width4 + margin4.left + margin4.right)
  .attr("height", height4 + margin4.top + margin4.bottom)
  .append("g")
  .attr("transform", `translate(${margin4.left},${margin4.top})`);

let rawData4;

d3.csv("data.csv").then((data) => {
  data.forEach((d) => {
    d.arrival_date_week_number = +d.arrival_date_week_number;
    d.count = 1;
  });

  rawData4 = data;
  populateCalendarFilters(data);
  updateCalendarHeatmap();
  d3.selectAll("#controls-calendar select").on("change", updateCalendarHeatmap);
});

function populateCalendarFilters(data) {
  const countries = Array.from(
    new Set(data.map((d) => d.mainCountry).filter(Boolean))
  ).sort();
  const select = d3.select("#mainCountry4");
  select.selectAll("option:not([value='all'])").remove();
  countries.forEach((c) => select.append("option").attr("value", c).text(c));
}

function updateCalendarHeatmap() {
  const isCanceled = document.getElementById("isCanceled4").value;
  const mainCountry = document.getElementById("mainCountry4").value;
  const tipo = document.getElementById("tipo4").value;

  let filtered = rawData4;
  if (isCanceled !== "all")
    filtered = filtered.filter((d) => d.is_canceled === isCanceled);
  if (mainCountry !== "all")
    filtered = filtered.filter((d) => d.mainCountry === mainCountry);
  if (tipo !== "all") filtered = filtered.filter((d) => d.hotel === tipo);

  const nested = d3.rollup(
    filtered,
    (v) => v.length / new Set(v.map((d) => d.arrival_date_year)).size,
    (d) => d.arrival_date_month,
    (d) => d.arrival_date_week_number
  );

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const x = d3.scaleBand().domain(months).range([0, width4]).padding(0.05);
  const y = d3
    .scaleBand()
    .domain(d3.range(1, 54))
    .range([0, height4])
    .padding(0.05);

  const allValues = Array.from(nested.values()).flatMap((m) =>
    Array.from(m.values())
  );
  const maxValue = d3.max(allValues);
  const color = d3
    .scaleSequential()
    .interpolator(d3.interpolateYlOrRd)
    .domain([0, maxValue]);

  svg4.selectAll("*").remove();

  // Eje X
  svg4
    .append("g")
    .attr("transform", `translate(0,${height4})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");

  // Etiqueta eje X
  svg4
    .append("text")
    .attr("x", width4 / 2)
    .attr("y", height4 + 50)
    .attr("text-anchor", "middle")
    .attr("font-size", "14px")
    .text("Mes");

  // Eje Y
  svg4.append("g").call(d3.axisLeft(y).tickFormat((d) => `CW ${d}`));

  // Etiqueta eje Y
  svg4
    .append("text")
    .attr("x", -height4 / 2)
    .attr("y", -60)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .attr("font-size", "14px")
    .text("Semana del calendario");

  // Título
  svg4
    .append("text")
    .attr("x", width4 / 2)
    .attr("y", -40)
    .attr("text-anchor", "middle")
    .attr("font-size", "18px")
    .text("Media de reservas por semana y mes (2015–2017)");

  // Tooltip
  const tooltip = d3.select("#tooltip");

  months.forEach((month) => {
    for (let week = 1; week <= 53; week++) {
      const value = nested.get(month)?.get(week) || 0;

      svg4
        .append("rect")
        .attr("x", x(month))
        .attr("y", y(week))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("fill", color(value))
        .on("mouseover", (event) => {
          tooltip.transition().duration(200).style("opacity", 1);
          tooltip
            .html(
              `Mes: ${month}<br>Semana: ${week}<br>Media: ${value.toFixed(2)}`
            )
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", () => {
          tooltip.transition().duration(300).style("opacity", 0);
        });
    }
  });

  // Leyenda superior derecha
  const legendWidth = 200;
  const legendHeight = 10;

  const defs = svg4.append("defs");
  const gradient = defs
    .append("linearGradient")
    .attr("id", "heatmap-gradient")
    .attr("x1", "0%")
    .attr("x2", "100%");

  gradient
    .selectAll("stop")
    .data(d3.ticks(0, 1, 10))
    .enter()
    .append("stop")
    .attr("offset", (d) => `${d * 100}%`)
    .attr("stop-color", (d) => color(d * maxValue));

  svg4
    .append("rect")
    .attr("x", width4 - legendWidth)
    .attr("y", -30)
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .style("fill", "url(#heatmap-gradient)");

  const legendScale = d3
    .scaleLinear()
    .domain([0, maxValue])
    .range([width4 - legendWidth, width4]);

  const legendAxis = d3
    .axisBottom(legendScale)
    .ticks(5)
    .tickFormat(d3.format(".0f"));

  svg4
    .append("g")
    .attr("transform", `translate(0, -20)`)
    .call(legendAxis)
    .selectAll("text")
    .style("font-size", "10px");
}
