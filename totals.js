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
import { zero } from "./rational.js"
import { Solver } from "./solver.js"

export class Totals {
    constructor() {
        this.rates = new Map()
        this.byproductorigins = new Map()
        this.byproductrates = new Map()
        this.byproductratesFull = new Map()
        this.byproductUsages = new Map()
        this.heights = new Map()
        this.topo = new Set()
        this.solver = new Solver()
        this.solutionVector = []
    }
    add(recipe, rate) {
        this.topo.add(recipe)
        this.rates.set(recipe, (this.rates.get(recipe) || zero).add(rate))
    }
    addByproduct(recipe, rate) {
        this.byproductorigins.set(recipe.byproduct.item, recipe)
        this.byproductrates.set(recipe.byproduct.item, (this.byproductrates.get(recipe.byproduct.item) || zero).add(rate))
        this.byproductratesFull.set(recipe.byproduct.item, (this.byproductratesFull.get(recipe.byproduct.item) || zero).add(rate))
    }
    addByproductUse(recipe, item, rate) {
        this.byproductUsages.set(this.byproductorigins.get(item), [recipe, rate])
        if(rate.equal(this.byproductrates.get(item))){
            //recipe requires all byproducts
            this.byproductrates.delete(item)
        }else{
            //update rate
            this.byproductrates.set(item, this.byproductrates.get(item).sub(rate))
        }
    }
    updateHeight(recipe, height) {
        let knownHeight = this.heights.get(recipe)
        if (knownHeight === undefined || knownHeight < height) {
            this.heights.set(recipe, height)
        }
    }
    combine(other) {
        for (let [recipe, rate] of other.rates) {
            this.add(recipe, rate)
        }
        for (let [byproductitem, rate] of other.byproductrates) {
            this.byproductorigins.set(byproductitem, other.byproductorigins.get(byproductitem))
            this.byproductrates.set(byproductitem, (this.byproductrates.get(byproductitem) || zero).add(rate))
        }
        for (let [byproductitem, rate] of other.byproductratesFull) {
            this.byproductratesFull.set(byproductitem, (this.byproductratesFull.get(byproductitem) || zero).add(rate))
        }
        // TODO: think about this
        for (let [item, info] of other.byproductUsages) {
            this.byproductUsages.set(item, info)
        }
        for (let [recipe, height] of other.heights) {
            this.updateHeight(recipe, height + 1)
        }
    }
    getBuildingFactor(recipe){
        return this.solutionVector.get(recipe);
    }
}