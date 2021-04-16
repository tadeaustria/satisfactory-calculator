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
import { minimum } from "./rational.js"
import { Totals } from "./totals.js"

export class Item {
    constructor(key, name, tier, stack_size) {
        this.key = key
        this.name = name
        this.tier = tier
        this.recipes = []
        this.uses = []
        this.stack_size = stack_size
		//this.byproduct = []
    }
    addRecipe(recipe) {
        this.recipes.push(recipe)
	}
	//addByproduct(byproduct) {
	//	this.byproduct.push(byproduct)
    //}
    addUse(recipe) {
        this.uses.push(recipe)
    }

    isFluid(){
        return this.stack_size == -1
    }

    produce(spec, rate, ignore, solver) {
        let totals = new Totals()
        let recipe = spec.getRecipe(this)
        let gives = recipe.gives(this)
        //let byproduct = recipe.byproduct(this)
        let productrate = rate.div(gives)
        totals.add(recipe, productrate)
        totals.updateHeight(recipe, 0)
        let recipeFactor = spec.getRecipeRate(recipe)
        solver.addProduct(recipe.product.item, recipe, recipeFactor.mul(gives))
        if (ignore.has(recipe)) {
            solver.addRecipeDone(recipe)
            return totals
        }
        if (recipe.byproduct != null){
            totals.addByproduct(recipe, rate.div(recipe.byproduct.amount))
            solver.addProduct(recipe.byproduct.item, recipe, recipeFactor.mul(recipe.byproduct.amount))
        }
        for (let ing of recipe.ingredients) {
            solver.addRequirement(ing.item, recipe, recipeFactor.mul(ing.amount))
        }
        solver.addRecipeDone(recipe)
        for (let ing of recipe.ingredients) {
            let requiredRate = productrate.mul(ing.amount)
            if(totals.byproductrates.has(ing.item)){
                // find maximum value that the byproduct can provide
                let minimal = minimum(totals.byproductrates.get(ing.item), requiredRate)
                totals.addByproductUse(recipe, ing.item, minimal)
                // Look if there is still rate unsatisfied
                requiredRate = requiredRate.sub(minimal)
            }
            if(!requiredRate.isZero()){
                let subtotals = ing.item.produce(spec, requiredRate, ignore, solver)
                totals.combine(subtotals)
            }
        }
        return totals
    }
    iconPath() {
        return "images/" + this.name + ".png"
    }
}

export function getItems(data) {
    let items = new Map()
    for (let d of data.items) {
        items.set(d.key_name, new Item(d.key_name, d.name, d.tier, d.stack_size))
    }
    return items
}
