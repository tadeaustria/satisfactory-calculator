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
    produce(spec, ignore, totals, height) {
        let recipe = spec.getRecipe(this)
        totals.solver.addRecipe(recipe)
        totals.updateHeight(recipe, height)
        if (ignore.has(recipe)) {
            return
        }
        for (let ing of recipe.ingredients) {
            ing.item.produce(spec, ignore, totals, height + 2)
        }
        return
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
