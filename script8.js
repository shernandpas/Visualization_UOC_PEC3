const margin8 = { top: 60, right: 200, bottom: 60, left: 80 },
  width8 = 900 - margin8.left - margin8.right,
  height8 = 500 - margin8.top - margin8.bottom;

const svg8 = d3
  .select("#country-weekly-share")
  .attr("width", width8 + margin8.left + margin8.right)
  .attr("height", height8 + margin8.top + margin8.bottom)
  .append("g")
  .attr("transform", `translate(${margin8.left},${margin8.top})`);

const tooltip8 = d3
  .select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

let rawData8;
let activeCountry = null;

d3.csv("data.csv").then((data) => {
  data.forEach((d) => {
    d.arrival_date_week_number = +d.arrival_date_week_number;
  });

  rawData8 = data;
  populateFilters8(data);
  updateCountryWeeklyShare();
  d3.selectAll("#controls-country-share select").on(
    "change",
    updateCountryWeeklyShare
  );
});

function populateFilters8(data) {
  const countries = Array.from(
    new Set(data.map((d) => d.mainCountry).filter(Boolean))
  ).sort();
  const select = d3.select("#mainCountry8");
  select.selectAll("option:not([value='all'])").remove();
  countries.forEach((c) => {
    select.append("option").attr("value", c).text(c);
  });
}

function updateCountryWeeklyShare() {
  svg8.selectAll("*").remove();
  activeCountry = null;

  const selectedCountry = document.getElementById("mainCountry8").value;
  const isCanceled = document.getElementById("isCanceled8").value;
  const tipo = document.getElementById("tipo8").value;
  const hotel = document.getElementById("hotel8").value;

  let filtered = rawData8.filter((d) => d.mainCountry);

  if (isCanceled !== "all")
    filtered = filtered.filter((d) => d.is_canceled === isCanceled);
  if (tipo !== "all") filtered = filtered.filter((d) => d.tipo === tipo);
  if (hotel !== "all") filtered = filtered.filter((d) => d.hotel === hotel);

  const countries =
    selectedCountry === "all"
      ? Array.from(new Set(filtered.map((d) => d.mainCountry)))
      : [selectedCountry];

  const color = d3.scaleOrdinal().domain(countries).range(d3.schemeTableau10);

  const dataByCountry = countries.map((country) => {
    const countryData = filtered.filter((d) => d.mainCountry === country);
    const total = countryData.length;
    const weeklyCounts = d3.rollup(
      countryData,
      (v) => v.length,
      (d) => d.arrival_date_week_number
    );

    const weeklyPercentages = Array.from(weeklyCounts.entries()).map(
      ([week, count]) => ({
        week: +week,
        percent: (count / total) * 100,
        country: country,
      })
    );

    return weeklyPercentages;
  });

  const x = d3.scaleLinear().domain([1, 53]).range([0, width8]);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(dataByCountry.flat(), (d) => d.percent)])
    .nice()
    .range([height8, 0]);

  // Ejes
  svg8
    .append("g")
    .attr("transform", `translate(0,${height8})`)
    .call(d3.axisBottom(x).ticks(10).tickFormat(d3.format("02")));

  svg8
    .append("text")
    .attr("x", width8 / 2)
    .attr("y", height8 + 40)
    .attr("text-anchor", "middle")
    .attr("font-size", "13px")
    .text("Semana del calendario");

  svg8.append("g").call(d3.axisLeft(y));

  svg8
    .append("text")
    .attr("x", -height8 / 2)
    .attr("y", -50)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .attr("font-size", "13px")
    .text("% de reservas");

  svg8
    .append("text")
    .attr("x", width8 / 2)
    .attr("y", -30)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .text("Evolución semanal del % de reservas por país");

  // Líneas + puntos invisibles para tooltip
  dataByCountry.forEach((data) => {
    const country = data[0]?.country;
    const line = svg8
      .append("path")
      .datum(data.sort((a, b) => a.week - b.week))
      .attr("fill", "none")
      .attr("stroke", color(country))
      .attr("stroke-width", 2)
      .attr("class", `line-${country.replace(/\s+/g, "_")}`)
      .attr("opacity", 1)
      .attr(
        "d",
        d3
          .line()
          .x((d) => x(d.week))
          .y((d) => y(d.percent))
      );

    // Invisible points for tooltip
    svg8
      .selectAll(`.point-${country}`)
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", (d) => x(d.week))
      .attr("cy", (d) => y(d.percent))
      .attr("r", 5)
      .attr("fill", "transparent")
      .attr("class", `dot-${country}`)
      .on("mouseover", (event, d) => {
        tooltip8.transition().duration(200).style("opacity", 1);
        tooltip8
          .html(
            `País: ${d.country}<br>Semana: ${
              d.week
            }<br>% de reservas: ${d.percent.toFixed(2)}%`
          )
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 28}px`);
      })
      .on("mouseout", () => {
        tooltip8.transition().duration(300).style("opacity", 0);
      });
  });

  // Leyenda interactiva
  const legend = svg8
    .append("g")
    .attr("transform", `translate(${width8 + 20}, 0)`);

  countries.forEach((c, i) => {
    const row = legend.append("g").attr("transform", `translate(0, ${i * 20})`);
    row
      .append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", color(c))
      .style("cursor", "pointer")
      .on("click", () => toggleCountryHighlight(c));
    row
      .append("text")
      .attr("x", 18)
      .attr("y", 10)
      .text(c)
      .style("font-size", "11px")
      .style("cursor", "pointer")
      .on("click", () => toggleCountryHighlight(c));
  });
}

function toggleCountryHighlight(selected) {
  const allLines = d3.selectAll("[class^='line-']");
  const allDots = d3.selectAll("[class^='dot-']");

  if (activeCountry === selected) {
    // Restore all
    allLines.attr("opacity", 1).attr("stroke-width", 2);
    allDots.attr("display", null);
    activeCountry = null;
  } else {
    // Dim others, highlight selected
    allLines.attr("opacity", 0.1).attr("stroke-width", 1);
    allDots.attr("display", "none");

    d3.selectAll(`.line-${selected.replace(/\s+/g, "_")}`)
      .attr("opacity", 1)
      .attr("stroke-width", 3);

    d3.selectAll(`.dot-${selected}`).attr("display", null);

    activeCountry = selected;
  }
}
