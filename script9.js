const margin9 = { top: 60, right: 180, bottom: 100, left: 60 },
  width9 = 900 - margin9.left - margin9.right,
  height9 = 500 - margin9.top - margin9.bottom;

const svg9 = d3
  .select("#mosaic-cancellations")
  .attr("width", width9 + margin9.left + margin9.right)
  .attr("height", height9 + margin9.top + margin9.bottom)
  .append("g")
  .attr("transform", `translate(${margin9.left},${margin9.top})`);

const tooltip9 = d3
  .select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

let rawData9;

d3.csv("data.csv").then((data) => {
  rawData9 = data;
  populateFilters9(data);
  updateMosaicChart();
  d3.selectAll("#controls-mosaic select").on("change", updateMosaicChart);
});

function populateFilters9(data) {
  const countries = Array.from(
    new Set(data.map((d) => d.mainCountry).filter(Boolean))
  ).sort();
  const groupCountries = Array.from(
    new Set(data.map((d) => d.group_country).filter(Boolean))
  ).sort();

  const mainSelect = d3.select("#mainCountry9");
  const groupSelect = d3.select("#groupCountry9");

  mainSelect.selectAll("option:not([value='all'])").remove();
  countries.forEach((c) =>
    mainSelect.append("option").attr("value", c).text(c)
  );

  groupSelect.selectAll("option:not([value='all'])").remove();
  groupCountries.forEach((c) =>
    groupSelect.append("option").attr("value", c).text(c)
  );
}

function updateMosaicChart() {
  svg9.selectAll("*").remove();

  const isCanceled = document.getElementById("isCanceled9").value;
  const mainCountry = document.getElementById("mainCountry9").value;
  const groupCountry = document.getElementById("groupCountry9").value;
  const hotel = document.getElementById("hotel9").value;
  const tipo = document.getElementById("tipo9").value;

  let filtered = rawData9;
  if (isCanceled !== "all")
    filtered = filtered.filter((d) => d.is_canceled === isCanceled);
  if (mainCountry !== "all")
    filtered = filtered.filter((d) => d.mainCountry === mainCountry);
  if (groupCountry !== "all")
    filtered = filtered.filter((d) => d.group_country === groupCountry);
  if (hotel !== "all") filtered = filtered.filter((d) => d.hotel === hotel);
  if (tipo !== "all") filtered = filtered.filter((d) => d.tipo === tipo);

  const countryStats = d3
    .rollups(
      filtered,
      (v) => ({
        total: v.length,
        canceladas: v.filter((d) => d.is_canceled === "1").length,
        no_canceladas: v.filter((d) => d.is_canceled === "0").length,
      }),
      (d) => d.mainCountry
    )
    .filter((d) => d[1].total > 0);

  const totalGlobal = d3.sum(countryStats, (d) => d[1].total);

  const y = d3.scaleLinear().domain([0, 1]).range([height9, 0]);
  const color = d3
    .scaleOrdinal(d3.schemeCategory10)
    .domain(countryStats.map((d) => d[0]));

  let xOffset = 0;

  countryStats.forEach(([country, stats]) => {
    const countryWidthRatio = stats.total / totalGlobal;
    const xWidth = width9 * countryWidthRatio;

    const cancelRatio = stats.canceladas / stats.total;
    const noCancelRatio = stats.no_canceladas / stats.total;

    const baseColor = d3.color(color(country));
    const darkerColor = baseColor.darker(0.6);

    // Parte inferior: no canceladas
    svg9
      .append("rect")
      .attr("x", xOffset)
      .attr("y", y(noCancelRatio))
      .attr("width", xWidth)
      .attr("height", height9 - y(noCancelRatio))
      .attr("fill", baseColor)
      .on("mouseover", (event) => {
        tooltip9.transition().duration(200).style("opacity", 1);
        tooltip9
          .html(
            `País: ${country}<br><strong>No canceladas:</strong> ${
              stats.no_canceladas
            } (${(noCancelRatio * 100).toFixed(1)}%)`
          )
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 28}px`);
      })
      .on("mouseout", () =>
        tooltip9.transition().duration(300).style("opacity", 0)
      );

    // Separación blanca sutil
    svg9
      .append("rect")
      .attr("x", xOffset)
      .attr("y", y(noCancelRatio) - 1)
      .attr("width", xWidth)
      .attr("height", 2)
      .attr("fill", "white");

    // Parte superior: canceladas
    svg9
      .append("rect")
      .attr("x", xOffset)
      .attr("y", 0)
      .attr("width", xWidth)
      .attr("height", y(noCancelRatio))
      .attr("fill", darkerColor)
      .on("mouseover", (event) => {
        tooltip9.transition().duration(200).style("opacity", 1);
        tooltip9
          .html(
            `País: ${country}<br><strong>Canceladas:</strong> ${
              stats.canceladas
            } (${(cancelRatio * 100).toFixed(1)}%)`
          )
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 28}px`);
      })
      .on("mouseout", () =>
        tooltip9.transition().duration(300).style("opacity", 0)
      );

    // Etiqueta del país
    svg9
      .append("text")
      .attr("x", xOffset + xWidth / 2)
      .attr("y", height9 + 15)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .text(country);

    xOffset += xWidth;
  });

  // Eje Y
  svg9.append("g").call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(".0%")));

  // Título y etiquetas
  svg9
    .append("text")
    .attr("x", width9 / 2)
    .attr("y", -30)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .text("Cancelaciones por país (Mosaic Plot)");

  svg9
    .append("text")
    .attr("x", -height9 / 2)
    .attr("y", -45)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .text("Proporción");
}
