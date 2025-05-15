const margin5 = { top: 60, right: 30, bottom: 60, left: 80 },
  width5 = 900 - margin5.left - margin5.right,
  height5 = 500 - margin5.top - margin5.bottom;

const svg5 = d3
  .select("#adr-histogram")
  .attr("width", width5 + margin5.left + margin5.right)
  .attr("height", height5 + margin5.top + margin5.bottom)
  .append("g")
  .attr("transform", `translate(${margin5.left},${margin5.top})`);

let rawData5;

d3.csv("data.csv").then((data) => {
  data.forEach((d) => {
    d.adr = +d.adr;
  });

  rawData5 = data;
  populateFilters5(data);
  updateHistogram();
  d3.selectAll("#controls-histogram select").on("change", updateHistogram);
});

function populateFilters5(data) {
  const mainCountries = Array.from(
    new Set(data.map((d) => d.mainCountry).filter(Boolean))
  ).sort();
  const groupCountries = Array.from(
    new Set(data.map((d) => d.group_country).filter(Boolean))
  ).sort();

  const mainSelect = d3.select("#mainCountry5");
  const groupSelect = d3.select("#groupCountry5");

  mainSelect.selectAll("option:not([value='all'])").remove();
  mainCountries.forEach((c) =>
    mainSelect.append("option").attr("value", c).text(c)
  );

  groupSelect.selectAll("option:not([value='all'])").remove();
  groupCountries.forEach((c) =>
    groupSelect.append("option").attr("value", c).text(c)
  );
}

function updateHistogram() {
  svg5.selectAll("*").remove();

  const isCanceled = document.getElementById("isCanceled5").value;
  const mainCountry = document.getElementById("mainCountry5").value;
  const groupCountry = document.getElementById("groupCountry5").value;
  const hotel = document.getElementById("hotel5").value;

  let filtered = rawData5.filter((d) => !isNaN(d.adr));
  if (isCanceled !== "all")
    filtered = filtered.filter((d) => d.is_canceled === isCanceled);
  if (mainCountry !== "all")
    filtered = filtered.filter((d) => d.mainCountry === mainCountry);
  if (groupCountry !== "all")
    filtered = filtered.filter((d) => d.group_country === groupCountry);
  if (hotel !== "all") filtered = filtered.filter((d) => d.hotel === hotel);

  const x = d3
    .scaleLinear()
    .domain(d3.extent(filtered, (d) => d.adr))
    .nice()
    .range([0, width5]);

  const histogram = d3
    .histogram()
    .value((d) => d.adr)
    .domain(x.domain())
    .thresholds(x.ticks(30));

  const bins = histogram(filtered);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(bins, (d) => d.length)])
    .nice()
    .range([height5, 0]);

  const color = d3
    .scaleSequential()
    .interpolator(d3.interpolateYlOrRd)
    .domain([0, d3.max(bins, (d) => d.length)]);

  // Ejes
  svg5
    .append("g")
    .attr("transform", `translate(0,${height5})`)
    .call(d3.axisBottom(x));

  svg5
    .append("text")
    .attr("x", width5 / 2)
    .attr("y", height5 + 40)
    .attr("text-anchor", "middle")
    .attr("font-size", "13px")
    .text("ADR (Precio medio por noche)");

  svg5.append("g").call(d3.axisLeft(y));

  svg5
    .append("text")
    .attr("x", -height5 / 2)
    .attr("y", -50)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .attr("font-size", "13px")
    .text("Número de reservas");

  svg5
    .append("text")
    .attr("x", width5 / 2)
    .attr("y", -30)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .text("Distribución del ADR y volumen de reservas");

  const tooltip = d3.select("#tooltip");

  svg5
    .selectAll("rect")
    .data(bins)
    .enter()
    .append("rect")
    .attr("x", (d) => x(d.x0))
    .attr("y", (d) => y(d.length))
    .attr("width", (d) => x(d.x1) - x(d.x0) - 1)
    .attr("height", (d) => height5 - y(d.length))
    .style("fill", (d) => color(d.length))
    .on("mouseover", (event, d) => {
      tooltip.transition().duration(200).style("opacity", 1);
      tooltip
        .html(
          `ADR: €${d.x0.toFixed(2)} – €${d.x1.toFixed(2)}<br>Reservas: ${
            d.length
          }`
        )
        .style("left", `${event.pageX + 10}px`)
        .style("top", `${event.pageY - 28}px`);
    })
    .on("mouseout", () => {
      tooltip.transition().duration(300).style("opacity", 0);
    });

  // Leyenda
  const legendWidth = 200;
  const legendHeight = 10;

  const defs = svg5.append("defs");
  const gradient = defs
    .append("linearGradient")
    .attr("id", "histogram-gradient")
    .attr("x1", "0%")
    .attr("x2", "100%");

  gradient
    .selectAll("stop")
    .data(d3.ticks(0, 1, 10))
    .enter()
    .append("stop")
    .attr("offset", (d) => `${d * 100}%`)
    .attr("stop-color", (d) => color(d * d3.max(bins, (d) => d.length)));

  svg5
    .append("rect")
    .attr("x", width5 - legendWidth)
    .attr("y", -30)
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .style("fill", "url(#histogram-gradient)");

  const legendScale = d3
    .scaleLinear()
    .domain([0, d3.max(bins, (d) => d.length)])
    .range([width5 - legendWidth, width5]);

  const legendAxis = d3
    .axisBottom(legendScale)
    .ticks(4)
    .tickFormat(d3.format(".0f"));

  svg5
    .append("g")
    .attr("transform", `translate(0, -20)`)
    .call(legendAxis)
    .selectAll("text")
    .style("font-size", "10px");

  svg5
    .append("text")
    .attr("x", width5 - legendWidth)
    .attr("y", -40)
    .attr("text-anchor", "start")
    .attr("font-size", "11px")
    .text("Nº de reservas");
}
