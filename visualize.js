/*Copyright 2019 Kirk McDonald

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.*/
import { toggleIgnoreHandler } from "./events.js"
import { spec } from "./factory.js"
import { Rational, zero, one } from "./rational.js"
import { Ingredient } from "./recipe.js"

const iconSize = 48

const nodePadding = 20

const columnWidth = 150
const maxNodeHeight = 250

function makeGraph2(totals, targets, ignore) {

}

function calcBelts(isFluid, spec, rate, link){
    let belts = []
    let beltCountExact = 1
    if(isFluid){
        beltCountExact = spec.getPipeCount(rate)
    }else{
        beltCountExact = spec.getBeltCount(rate)
    }
    let beltCount = beltCountExact.toFloat()
    for (let j = one; j.less(beltCountExact); j = j.add(one)) {
        let i = j.toFloat()
        belts.push({link, i, beltCount})
    }
    return belts
}

function makeGraph(totals, targets, ignore) {
    let outputs = []
    let rates = new Map()
    for (let target of targets) {
        let rate = rates.get(target.item)
        if (rate === undefined) {
            rate = zero
        }
        rate = rate.add(target.getRate())
        rates.set(target.item, rate)
    }
    for (let [item, rate] of rates) {
        let ing = new Ingredient(item, rate)
        outputs.push(ing)
    }
    let nodes = []
    let recipeNodeMap = new Map()
    let productNodeMap = new Map()

    let maxHeight = 0;
    for(let height of totals.heights.values()){
        maxHeight = Math.max(maxHeight, height)
    }

    for (let [recipe, rate] of totals.rates) {
        let building = spec.getBuilding(recipe)
        let count = spec.getCount(recipe, rate)
        if(!ignore.has(recipe)){
            let buildingNode = {
                "order": maxHeight - totals.heights.get(recipe),
                "name": recipe.product.item.name,
                "id": recipe.product.item.name + "Building",
                "ingredients": recipe.ingredients,
                "recipe": recipe,
                "building": building,
                "count": count,
                "rate": rate,
                "ignore": ignore.has(recipe),
                "icon": building.iconPath()
            }
            nodes.push(buildingNode)
            recipeNodeMap.set(recipe, buildingNode)
        }
        let productNode = {
            "order": maxHeight - totals.heights.get(recipe) + 1,
            "name": recipe.product.item.name,
            "id": recipe.product.item.name + "Product",
            "ingredients": recipe.ingredients,
            "recipe": recipe,
            "building": building,
            "count": count,
            "rate": rate,
            "ignore": ignore.has(recipe),
            "icon": recipe.product.item.iconPath()
        }
        nodes.push(productNode)
        productNodeMap.set(recipe.product.item, productNode)
    }

    let links = []

    for(let [recipe, node] of recipeNodeMap){
        let itemRate = node.rate.mul(recipe.product.amount)
        let link = {
            "source": node,
            "target": productNodeMap.get(recipe.product.item),
            "value": itemRate.toFloat(),
            "rate": itemRate,
            "itemname": node.recipe.product.item.name
        }
        link.belts = calcBelts(recipe.product.item.isFluid(), spec, itemRate, link);
        links.push(link)
        if(recipe.byproduct != null){
            // Check if byproduct node does not exist yet, since it is not produced
            if(!productNodeMap.has(recipe.byproduct.item)){
                let byproductNode = {
                    "order": maxHeight + 1,
                    "name": recipe.byproduct.item.name,
                    "id": recipe.byproduct.item.name + "Product",
                    "ingredients": recipe.ingredients,
                    "recipe": recipe,
                    "building": spec.getBuilding(recipe),
                    "count": one,
                    "rate": node.rate,
                    "ignore": ignore.has(recipe),
                    "icon": recipe.byproduct.item.iconPath()
                }
                nodes.push(byproductNode)
                productNodeMap.set(recipe.byproduct.item, byproductNode)
            }
            let itemRate = node.rate.mul(recipe.byproduct.amount)
            let link = {
                "source": node,
                "target": productNodeMap.get(recipe.byproduct.item),
                "value": itemRate.toFloat(),
                "rate": itemRate,
                "itemname": node.recipe.byproduct.item.name
            }
            link.belts = calcBelts(recipe.byproduct.item.isFluid(), spec, itemRate, link);
            links.push(link)
        }
        
        for (let ing of node.ingredients) {
            let ingRate = node.rate.mul(ing.amount)
            let link = {
                "source": productNodeMap.get(ing.item),
                "target": node,
                "value": ingRate.toFloat(),
                "rate": ingRate,
                "itemname": ing.item.name
            }
            link.belts = calcBelts(ing.item.isFluid(), spec, ingRate, link);
            links.push(link)
        }
    }

    return {"nodes": nodes, "links": links}
}

function recipeValue(recipe, rate, ignore) {
    let inputValue = zero
    if (!ignore.has(recipe)) {
        for (let ing of recipe.ingredients) {
            inputValue = inputValue.add(rate.mul(ing.amount))
        }
    }
    let outputValue = rate.mul(recipe.product.amount)
    if (inputValue.less(outputValue)) {
        return outputValue
    } else {
        return inputValue
    }
}

function rankHeightEstimate(rank, valueFactor) {
    let total = nodePadding * (rank.length - 1)
    for (let value of rank) {
        total += value.mul(valueFactor).toFloat()
    }
    return total
}

function getRateString(d) {
    return d.rate === null ? "" : `\u00d7 ${spec.format.rate(d.rate)}/${spec.format.rateName}`
}

function getMachineCountString(d) {
    console.assert(!d.count.isZero(), "Items that aren't produced through machines can't have a machine count!")
    return `\u00d7 ${spec.format.count(d.count)}`
}

function getOverclockString(d) {
    console.assert(!d.count.isZero(), "Items that aren't produced through machines (machine count == 0) can't have an overclock value!")
    return `${spec.getOverclock(d.recipe).mul(Rational.from_float(100)).toString()}%`
}

// This is basically an educated guess, but seems to match whatever Chrome and
// Firefox do pretty well.
function beltPath(d) {
    let x0 = d.link.source.x1
    let y0 = d.link.y0
    let y0top = y0 - d.link.width / 2
    let x1 = d.link.target.x0
    let y1 = d.link.y1
    let y1top = y1 - d.link.width / 2
    let mid = (x1 - x0) / 2
    let slope = (y1 - y0) / (x1 - x0)

    let dy = d.link.width / d.beltCount
    let y_offset = d.i*dy
    let y0belt = y0top + y_offset
    let y1belt = y1top + y_offset

    let midAdjust = (d.link.width/2 - y_offset) * slope
    let x_control = x0 + mid + midAdjust
    return `M ${x0},${y0belt} C ${x_control},${y0belt},${x_control},${y1belt},${x1},${y1belt}`
}

let color = d3.scaleOrdinal(d3.schemeCategory10)

export function renderTotals(totals, targets, ignore) {
    let data = makeGraph(totals, targets, ignore)

    let maxRank = 0
    let ranks = new Map()
    let largestValue = zero
    for (let [recipe, rank] of totals.heights) {
        let rankList = ranks.get(rank)
        if (rankList === undefined) {
            rankList = []
            ranks.set(rank, rankList)
        }
        if (rank > maxRank) {
            maxRank = rank
        }
        let rate = totals.rates.get(recipe)
        let value = recipeValue(recipe, rate, ignore)
        if (largestValue.less(value)) {
            largestValue = value
        }
        rankList.push(value)
    }
    if (largestValue.isZero()) {
        return
    }
    let beltDensity = maxNodeHeight / spec.getBeltCount(largestValue).toFloat()
    // The width of the display is the number of ranks, times the width of each
    // rank, plus a small constant for the output node.
    let maxTextWidth = 0
    let testSVG = d3.select("body").append("svg")
    for (let node of data.nodes) {
        let text = testSVG.append("text")
        if (node.count.isZero()) {
            text = text.text(getRateString(node))
        } else {
            text.append("tspan").attr("x", 0).text(getMachineCountString(node))
            text.append("tspan").attr("x", 0).text(getOverclockString(node))
        }
        let textWidth = text.node().getBBox().width
        text.remove()
        if (textWidth > maxTextWidth) {
            maxTextWidth = textWidth
        }
    }
    testSVG.remove()
    let nodeWidth = iconSize + maxTextWidth + 4
    let width = maxRank * (nodeWidth + columnWidth) + nodeWidth
    // The height of the display is normalized by the height of the tallest box
    // in the graph. We define it to be (approximately) maxNodeHeight pixels
    // high.
    let valueFactor = Rational.from_float(maxNodeHeight).div(largestValue)
    let largestEstimate = 0
    for (let [rank, rankList] of ranks) {
        let estimate = rankHeightEstimate(rankList, valueFactor)
        if (estimate > largestEstimate) {
            largestEstimate = estimate
        }
    }
    let height = largestEstimate

    let svg = d3.select("svg#graph")
        .attr("viewBox", `0,0,${width},${height}`)
        .style("width", width)
        .style("height", height)

    svg.selectAll("g").remove()

    // let sankey = d3.sankey()
    let sankey = d3.sankeyCircular()
        .nodeWidth(nodeWidth)
        .nodePadding(nodePadding)
        .nodeAlign(d3.sankeyRight)
        .extent([[10, 10], [width - 10, height - 10]])
        .nodeId(function (d) {
            return d.id;
        })
        // .size([width - 20, height - 20])
        .iterations(5)
        .circularLinkGap(1)
        .sortNodes("order")
    let {nodes, links} = sankey(data)

    // Node rects
    let rects = svg.append("g")
        .classed("nodes", true)
        .selectAll("rect")
        .data(nodes)
        .join("g")
            .classed("node", true)

    rects.append("rect")
        .attr("x", d => d.x0)
        .attr("y", d => d.y0)
        .attr("height", d => d.y1 - d.y0)
        .attr("width", d => d.x1 - d.x0)
        .attr("fill", d => d3.color(color(d.name)).darker())
    rects.append("image")
            .classed("ignore", d => ignore.has(d.recipe))
            .attr("x", d => d.x0 + 2)
            .attr("y", d => d.y0 + (d.y1 - d.y0) / 2 - (iconSize / 2))
            .attr("height", iconSize)
            .attr("width", iconSize)
            .attr("xlink:href", d => d.icon)

    // For nodes without an associated machine, display the rate on a single line:
    rects.filter(d => d.count.isZero())
        .append("text")
            .attr("x", d => d.x0 + iconSize + 2)
            .attr("y", d => (d.y0 + d.y1) / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", "start")
            .text(getRateString)

    // For nodes with an associated machine, display the machine count on one
    // line, and the overclock rate on the next line:
    let twoLineText = rects.filter(d => !d.count.isZero())
        .append("text")
            .attr("x", d => d.x0 + iconSize + 2)
            .attr("y", d => (d.y0 + d.y1) / 2)
            .attr("dy", "-0.15em") // (0.35em minus half a line's height (0.5em), maintaining vertical alignment)
            .attr("text-anchor", "start")
    twoLineText.append("tspan")
        .text(getMachineCountString)
    twoLineText.append("tspan") // ("x" and "dy" are used to render the text on the next line)
        .attr("x", d => d.x0 + iconSize + 2)
        .attr("dy", "1em")
        .text(getOverclockString)

    // // Link paths
    // let link = svg.append("g")
    //     .classed("links", true)
    //     .selectAll("g")
    //     .data(links)
    //     .join("g")
    //     .style("mix-blend-mode", "multiply")
    let linkG = svg.append("g")
      .attr("class", "links")
      .attr("fill", "none")
      .attr("stroke-opacity", 0.2)
      .selectAll("path");

    let link = linkG.data(links)
      .enter()
      .append("g")

    link.append("path")
        .attr("fill", "none")
        .attr("stroke-opacity", 0.3)
        .attr("class", "sankey-link")
        .attr("d", function(link){
          return link.path;
        })
        // .attr("d", d3.sankeyLinkHorizontal())
        .attr("stroke", d => color(d.itemname))
        .attr("stroke-width", d => Math.max(1, d.width))
    // Don't draw belts if we have less than three pixels per belt.
    if (beltDensity >= 3) {
        link.append("g")
            .selectAll("path")
            .data(d => d.belts)
            .join("path")
                .attr("fill", "none")
                .attr("stroke-opacity", 0.3)
                .attr("d", beltPath)
                .attr("stroke", d => color(d.link.itemname))
                .attr("stroke-width", 1)
    }
    link.append("title")
        .text(d => `${d.source.name} \u2192 ${d.target.name}\n${spec.format.rate(d.rate)}`)
    link.append("text")
        .attr("x", d => d.source.x1 + 6)
        .attr("y", d => d.y0)
        .attr("dy", "0.35em")
        .attr("text-anchor", "start")
        .text(d => spec.format.rate(d.rate) + "/" + spec.format.rateName)

    // Overlay transparent rect on top of each node, for click events.
    let rectElements = svg.selectAll("g.node").nodes()
    let overlayData = []
    // Flash the graph tab to be visible, so that the graph is laid out and
    // the BBox is not empty.
    let graphTab = d3.select("#graph_tab")
    let origDisplay = d3.style(graphTab.node(), "display")
    graphTab.style("display", "block")
    for (let i = 0; i < nodes.length; i++) {
        let rect = rectElements[i].getBBox()
        let node = nodes[i]
        let recipe = node.recipe
        if (recipe !== undefined) {
            overlayData.push({rect, node, recipe})
        }
    }
    graphTab.style("display", origDisplay)
    svg.append("g")
        .classed("overlay", true)
        .selectAll("rect")
        .data(overlayData)
        .join("rect")
            .attr("stroke", "none")
            .attr("fill", "transparent")
            .attr("x", d => d.rect.x)
            .attr("y", d => d.rect.y)
            .attr("width", d => d.rect.width)
            .attr("height", d => d.rect.height)
            .on("click", toggleIgnoreHandler)
            .append("title")
                .text(d => d.node.name + (d.node.count.isZero() ? "" : `\n${d.node.building.name} ${getMachineCountString(d.node)}\n${getOverclockString(d.node)}`))
}

