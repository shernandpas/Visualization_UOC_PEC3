const margin3 = { top: 50, right: 30, bottom: 30, left: 30 },
  width3 = 1000 - margin3.left - margin3.right,
  height3 = 500 - margin3.top - margin3.bottom;

const svg3 = d3
  .select("#parallel-sets")
  .attr("width", width3 + margin3.left + margin3.right)
  .attr("height", height3 + margin3.top + margin3.bottom)
  .append("g")
  .attr("transform", `translate(${margin3.left},${margin3.top})`);

d3.csv("data.csv").then((data) => {
  d3.select("#isCanceled3").on("change", () => renderParallelSets(data));
  renderParallelSets(data);
});

function renderParallelSets(allData) {
  svg3.selectAll("*").remove(); // Clear previous graph

  const isCanceled = document.getElementById("isCanceled3").value;

  const filtered = allData.filter(
    (d) => isCanceled === "all" || d.is_canceled === isCanceled
  );

  const dimensions = ["mainCountry", "hotel", "tipo"];
  const nodesSet = new Set();
  const linksMap = new Map();

  filtered.forEach((row) => {
    for (let i = 0; i < dimensions.length - 1; i++) {
      const a = `${dimensions[i]}:${row[dimensions[i]]}`;
      const b = `${dimensions[i + 1]}:${row[dimensions[i + 1]]}`;
      nodesSet.add(a);
      nodesSet.add(b);
      const key = `${a}|${b}`;
      linksMap.set(key, (linksMap.get(key) || 0) + 1);
    }
  });

  const nodes = Array.from(nodesSet).map((name) => ({ name }));
  const links = Array.from(linksMap.entries()).map(([key, value]) => {
    const [source, target] = key.split("|");
    return { source, target, value };
  });

  const sankey = d3
    .sankey()
    .nodeWidth(15)
    .nodePadding(10)
    .extent([
      [1, 1],
      [width3 - 1, height3 - 6],
    ])
    .nodeId((d) => d.name);

  const graph = sankey({ nodes, links });

  const color = d3.scaleOrdinal(d3.schemeTableau10);

  svg3
    .append("g")
    .selectAll("rect")
    .data(graph.nodes)
    .join("rect")
    .attr("x", (d) => d.x0)
    .attr("y", (d) => d.y0)
    .attr("height", (d) => d.y1 - d.y0)
    .attr("width", (d) => d.x1 - d.x0)
    .attr("fill", (d) => color(d.name))
    .append("title")
    .text((d) => `${d.name}\n${d.value}`);

  svg3
    .append("g")
    .attr("fill", "none")
    .selectAll("path")
    .data(graph.links)
    .join("path")
    .attr("d", d3.sankeyLinkHorizontal())
    .attr("stroke", (d) => color(d.source.name))
    .attr("stroke-width", (d) => Math.max(1, d.width))
    .attr("stroke-opacity", 0.5)
    .append("title")
    .text((d) => `${d.source.name} → ${d.target.name}\n${d.value}`);

  svg3
    .append("g")
    .style("font", "12px sans-serif")
    .selectAll("text")
    .data(graph.nodes)
    .join("text")
    .attr("x", (d) => (d.x0 < width3 / 2 ? d.x1 + 6 : d.x0 - 6))
    .attr("y", (d) => (d.y1 + d.y0) / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", (d) => (d.x0 < width3 / 2 ? "start" : "end"))
    .text((d) => d.name);
}
