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
import { Formatter } from "./align.js"
import { displayItems } from "./display.js"
import { formatSettings } from "./fragment.js"
import { Rational, zero, half, one } from "./rational.js"
import { BuildTarget } from "./target.js"
import { Totals } from "./totals.js"
import { renderTotals } from "./visualize.js"

const DEFAULT_ITEM_KEY = "nuclear-fuel-rod"

let minerCategories = new Set(["mineral", "oil", "water", "gift-tree", "fluid", "manual", "hog", "spitter", "hatcher", "stinger"])

export let resourcePurities = [
    {key: "0", name: "Impure", factor: half},
    {key: "1", name: "Normal", factor: one},
    {key: "2", name: "Pure", factor: Rational.from_float(2)},
]

export let DEFAULT_PURITY = resourcePurities[1]

export let DEFAULT_BELT = "belt1"
export let DEFAULT_PIPE = "pipe1"

class FactorySpecification {
    constructor() {
        this.datafile = null

        // Game data definitions
        this.items = null
        this.recipes = null
        this.buildings = null
        this.belts = null
        this.pipes = null

        this.itemTiers = []

        this.buildTargets = []

        // Map resource recipe to {miner, purity}
        this.miners = new Map()
        this.minerSettings = new Map()

        // Map recipe to overclock factor
        this.overclock = new Map()

        // Map item to recipe
        this.altRecipes = new Map()

        this.belt = null
        this.pipe = null

        this.ignore = new Set()

        this.format = new Formatter()
    }
    setData(datafile, items, recipes, buildings, belts, pipes) {
        this.datafile = datafile
        this.items = items
        let tierMap = new Map()
        for (let [itemKey, item] of items) {
            let tier = tierMap.get(item.tier)
            if (tier === undefined) {
                tier = []
                tierMap.set(item.tier, tier)
            }
            tier.push(item)
        }
        this.itemTiers = []
        for (let [tier, tierItems] of tierMap) {
            this.itemTiers.push(tierItems)
        }
        this.itemTiers.sort((a, b) => a[0].tier - b[0].tier)
        this.recipes = recipes
        this.buildings = new Map()
        for (let building of buildings) {
            let category = this.buildings.get(building.category)
            if (category === undefined) {
                category = []
                this.buildings.set(building.category, category)
            }
            category.push(building)
            if (minerCategories.has(building.category)) {
                this.miners.set(building.key, building)
            }
        }
        this.belts = belts
        this.belt = belts.get(DEFAULT_BELT)
        this.pipes = pipes
        this.pipe = pipes.get(DEFAULT_PIPE)
        this.initMinerSettings()
    }
    initMinerSettings() {
        this.minerSettings = new Map()
        for (let [recipeKey, recipe] of this.recipes) {
            if (minerCategories.has(recipe.category)) {
                let miners = this.buildings.get(recipe.category)
                // Default to miner mk1.
                let miner = miners[0]
                // Default to normal purity.
                let purity = DEFAULT_PURITY
                this.minerSettings.set(recipe, {miner, purity})
            }
        }
    }
    getRecipe(item) {
        // TODO: Alternate recipes.
        let recipe = this.altRecipes.get(item)
        if (recipe === undefined) {
            return item.recipes[0]
        } else {
            return recipe
        }
    }
    setRecipe(recipe) {
        let item = recipe.product.item
        if (recipe === item.recipes[0]) {
            this.altRecipes.delete(item)
        } else {
            this.altRecipes.set(item, recipe)
        }
    }
    getBuilding(recipe) {
        if (recipe.category === null) {
            return null
        } else if (this.minerSettings.has(recipe)) {
            return this.minerSettings.get(recipe).miner
        } else {
            // NOTE: Only miners offer alternative buildings. May need to
            // revisit this if higher tiers of constructors are added.
            return this.buildings.get(recipe.category)[0]
        }
    }
    getOverclock(recipe) {
        return this.overclock.get(recipe) || one
    }
    setOverclock(recipe, overclock) {
        if (overclock.equal(one)) {
            this.overclock.delete(recipe)
        } else {
            this.overclock.set(recipe, overclock)
        }
    }
    // Returns the recipe-rate at which a single building can produce a recipe.
    // Returns null for recipes that do not have a building.
    getRecipeRate(recipe) {
        let building = this.getBuilding(recipe)
        if (building === null) {
            return null
        }
        return building.getRecipeRate(this, recipe)
    }
    getResourcePurity(recipe) {
        return this.minerSettings.get(recipe).purity
    }
    setMiner(recipe, miner, purity) {
        this.minerSettings.set(recipe, {miner, purity})
    }
    getCount(recipe, rate) {
        let building = this.getBuilding(recipe)
        if (building === null) {
            return zero
        }
        return building.getCount(this, recipe, rate)
    }
    getBeltCount(rate) {
        return rate.div(this.belt.rate)
    }
    getPipeCount(rate) {
        return rate.div(this.pipe.rate)
    }
    getPowerUsage(recipe, rate, itemCount) {
        let building = this.getBuilding(recipe)
        if (building === null || this.ignore.has(recipe)) {
            return {average: zero, peak: zero}
        }
        let average = building.power
        let peak = building.power

        // For particle accelerator the recipe determines the power usage
        if (building.isParticleAccelerator()){
            average = recipe.averagePower
            peak = recipe.maximumPower
        }

        let count = this.getCount(recipe, rate)
        average = average.mul(count)
        peak = peak.mul(count.ceil())
        let overclock = this.overclock.get(recipe)
        if (overclock !== undefined) {
            // The result of this exponent will typically be irrational, so
            // this approximation is a necessity. Because overclock is limited
            // to the range [0.01, 2.50], any imprecision introduced by this
            // approximation is minimal (and is probably less than is present
            // in the game itself).
            let overclockFactor = Rational.from_float(Math.pow(overclock.toFloat(), 1.6))
            average = average.mul(overclockFactor)
            peak = peak.mul(overclockFactor)
        }
        return {average, peak}
    }
    addTarget(itemKey) {
        let item = this.items.get(itemKey)
        if (item === undefined){
            item = this.items.get(DEFAULT_ITEM_KEY)
        }
        let target = new BuildTarget(this.buildTargets.length, itemKey, item, this.itemTiers)
        this.buildTargets.push(target)
        d3.select("#targets").insert(() => target.element, "#plusButton")
        return target
    }
    removeTarget(target) {
        this.buildTargets.splice(target.index, 1)
        for (let i=target.index; i < this.buildTargets.length; i++) {
            this.buildTargets[i].index--
        }
        d3.select(target.element).remove()
    }
    toggleIgnore(recipe) {
        if (this.ignore.has(recipe)) {
            this.ignore.delete(recipe)
        } else {
            this.ignore.add(recipe)
        }
    }
    solve() {
        let totals = new Totals()
        for (let target of this.buildTargets) {
            target.item.produce(this, this.ignore, totals, 0)
            totals.solver.addWanted(target.item, target.getRate())
        }
        for(let rec of totals.solver.recipes){
            rec.addToSolver(this, totals.solver, this.ignore)
        }
        totals.solutionVector = totals.solver.calculate()
        for(let rec of totals.solver.recipeIndices.keys()){
            totals.add(rec, this.getRecipeRate(rec).mul(totals.getBuildingFactor(rec)))
        }
        return totals
    }
    setHash() {
        window.location.hash = "#" + formatSettings()
    }
    updateSolution() {
        let totals = this.solve()
        displayItems(this, totals, this.ignore)
        renderTotals(totals, this.buildTargets, this.ignore)
        this.setHash()
    }
}

export let spec = new FactorySpecification()
window.spec = spec
